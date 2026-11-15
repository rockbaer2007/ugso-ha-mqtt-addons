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
