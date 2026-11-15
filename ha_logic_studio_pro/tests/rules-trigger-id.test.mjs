import assert from 'node:assert/strict';
import test from 'node:test';
import {runInNewContext} from 'node:vm';
import {parseDocument} from '../web/vendor/pro-yaml.js';
import {makeRulesJavaScript, makeYaml, readRuleFields} from '../web/pro-yaml-model.js';

const name = 'Trigger-ID test';
const rule = {
  triggers: [
    {type: 'event', event: 'test_first', id: 'first'},
    {type: 'event', event: 'test_second', id: 'second'},
  ],
  conditionMode: 'and',
  conditions: [{type: 'trigger', triggerId: 'first'}],
  actions: [{action: 'input_boolean.turn_on', entity: 'input_boolean.first'}],
  elseActions: [{action: 'input_boolean.turn_on', entity: 'input_boolean.second'}],
};

test('Rules round-trip preserves trigger IDs and exports a native HA branch', () => {
  const imported = readRuleFields(JSON.parse(JSON.stringify(rule)));
  assert.deepEqual(imported, rule);
  const yaml = parseDocument(makeYaml({name, kind: 'automation', ...imported})).toJS();
  assert.deepEqual(yaml.triggers.map(trigger => trigger.id), ['first', 'second']);
  assert.deepEqual(yaml.actions[0].if, [{condition: 'trigger', id: 'first'}]);
  assert.deepEqual(yaml.conditions, []);
  assert.throws(() => makeYaml({name, kind: 'automation', ...rule, triggers: rule.triggers.slice(1)}),
    /vorhandene Trigger-ID/);
});

test('Rules round-trips multiline Jinja into a native HA template with then and else', () => {
  const template = "{% set ready = is_state('input_boolean.ready', 'on') %}\n{{ ready }}\n";
  const draft = {...rule, conditions: [{type: 'template', template}]};
  const imported = readRuleFields(JSON.parse(JSON.stringify(draft)));
  assert.deepEqual(imported, draft);
  const [branch] = parseDocument(makeYaml({name, kind: 'automation', ...imported})).toJS().actions;
  assert.deepEqual(branch.if, [{condition: 'template', value_template: template}]);
  assert.equal(branch.then[0].target.entity_id, 'input_boolean.first');
  assert.equal(branch.else[0].target.entity_id, 'input_boolean.second');
  assert.throws(() => makeRulesJavaScript(name, imported), /Template-Bedingungen benötigen HA-YAML/);
  assert.throws(() => makeYaml({name, kind: 'automation', ...draft, conditions: [{type: 'template', template: ' '}]}),
    /Template-Bedingung eingeben/);
});

test('Rules to JavaScript dispatches using the ID of the callback that fired', () => {
  const events = new Map();
  const targets = [];
  runInNewContext(makeRulesJavaScript(name, rule), {ha: {
    onEvent: (event, callback) => events.set(event, callback),
    callAction: (_action, entity) => targets.push(entity),
  }});
  events.get('test_first')();
  events.get('test_second')();
  assert.deepEqual(targets, ['input_boolean.first', 'input_boolean.second']);
});

test('Nested Rules groups preserve trigger conditions and native HA steps', () => {
  const draft = {...rule, conditions: [{type: 'group', conditionMode: 'or', conditions: [
    {type: 'group', conditionMode: 'and', conditions: [
      {type: 'trigger', triggerId: 'first'},
      {type: 'group', conditionMode: 'not', conditions: [{entity: 'input_boolean.blocked', state: 'on'}]},
    ]},
    {type: 'trigger', triggerId: 'second'},
  ]}], actions: [
    {type: 'wait_state', entity: 'input_boolean.ready', state: 'on', seconds: '15'},
    {type: 'event', event: 'test_result', data: '{"ok":true}'},
    {type: 'script', entity: 'script.test', data: '{"value":42}'},
    {type: 'notification', data: '{"message":"Test"}'},
  ]};
  const imported = readRuleFields(JSON.parse(JSON.stringify(draft)));
  assert.deepEqual(imported, draft);
  const yaml = parseDocument(makeYaml({name, kind: 'automation', ...imported})).toJS();
  const branch = yaml.actions[0];
  assert.equal(branch.if[0].condition, 'or');
  assert.equal(branch.if[0].conditions[0].conditions[1].condition, 'not');
  assert.deepEqual(branch.then, [
    {wait_template: '{{ is_state("input_boolean.ready", "on") }}', timeout: {seconds: 15}, continue_on_timeout: false},
    {event: 'test_result', event_data: {ok: true}},
    {action: 'script.test', data: {value: 42}},
    {action: 'persistent_notification.create', data: {message: 'Test'}},
  ]);
  assert.throws(() => makeYaml({name, kind: 'automation', ...draft, conditions: [
    {type: 'group', conditionMode: 'and', conditions: []},
  ]}), /Bedingungsgruppe/);
});

test('Area and label trigger snapshots export deduplicated HA entity lists', () => {
  const triggers = ['area', 'label'].map(type => ({
    type, scopeId: 'garden', scopeEntities: '["sensor.first","sensor.second","sensor.first"]',
    id: 'first', state: 'on',
  }));
  const imported = readRuleFields({...rule, triggers});
  const yaml = parseDocument(makeYaml({name, kind: 'automation', ...imported})).toJS();
  assert.deepEqual(yaml.triggers, triggers.map(() => ({
    trigger: 'state', entity_id: ['sensor.first', 'sensor.second'], to: 'on', id: 'first',
  })));
});
