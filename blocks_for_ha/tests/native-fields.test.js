import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { nativeTimeExpression } from '../src/native-fields.js';
import { Blockly, modelWorkspace, workspaceModel } from '../src/blocks.js';
import { fromYaml, toYaml, validateAutomation } from '../src/model.js';
const fixture = fromYaml(readFileSync(new URL('./fixtures/pc-tv.yaml', import.meta.url), 'utf8'));

test('Holiday calendar automation retains offsets, response variable and folded Jinja through saved Blockly and YAML', () => {
  const model = fromYaml(readFileSync(new URL('./fixtures/calendar-holiday.yaml', import.meta.url), 'utf8'));
  for (const options of [model.triggers[0].options, undefined, {}, { offset: { days: 1, hours: 2, minutes: 3, seconds: 4 }, offset_type: 'after' }, { offset: '48:30:00' }]) {
    const item = structuredClone(model);
    if (options === undefined) delete item.triggers[0].options;
    else item.triggers[0].options = options;
    const ws = new Blockly.Workspace(), restored = new Blockly.Workspace();
    try {
      modelWorkspace(ws, item);
      assert.deepEqual(workspaceModel(ws, item), item);
      Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), restored);
      assert.deepEqual(fromYaml(toYaml(workspaceModel(restored, item))), item);
    } finally { ws.dispose(); restored.dispose(); }
  }
});
test('Calendar options and response variables reject malformed imports', () => {
  const model = fromYaml(readFileSync(new URL('./fixtures/calendar-holiday.yaml', import.meta.url), 'utf8'));
  for (const options of [{ offset_type: 'wrong' }, { offset: { seconds: -1 } }, { offset: {} }, { offset: { weeks: 1 } }, { offset: '12:80:00' }, { offset: [] }]) {
    const item = structuredClone(model); item.triggers[0].options = options; assert.throws(() => validateAutomation(item));
  }
  for (const name of ['', 'two words', '1termine', 42]) {
    const item = structuredClone(model); item.actions[1].response_variable = name; assert.throws(() => validateAutomation(item));
  }
  // A service normally mapped to a specialized block must also retain its response field.
  const item = structuredClone(model); item.actions = [{ action: 'script.test', response_variable: 'result' }];
  const ws = new Blockly.Workspace();
  try { modelWorkspace(ws, item); assert.deepEqual(workspaceModel(ws, item), item); } finally { ws.dispose(); }
});

test('AWTRIX temperature.changed and all threshold modes retain native targets and MQTT payloads', () => {
  const model = fromYaml(readFileSync(new URL('./fixtures/awtrix-temperature.yaml', import.meta.url), 'utf8'));
  const number = { number: 24, unit_of_measurement: '°C' }, reference = { entity: 'input_number.pool_minimum' };
  for (const threshold of [{ type: 'any' }, { type: 'above', value: number }, { type: 'below', value: reference }, { type: 'between', value_min: reference, value_max: number }, { type: 'outside', value_min: { number: 68, unit_of_measurement: '°F' }, value_max: { entity: 'sensor.pool_maximum' } }]) {
    const item = structuredClone(model); item.triggers[0].options.threshold = threshold;
    const ws = new Blockly.Workspace(), restored = new Blockly.Workspace();
    try {
      modelWorkspace(ws, item);
      assert.deepEqual(workspaceModel(ws, item), item);
      Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), restored);
      assert.deepEqual(fromYaml(toYaml(workspaceModel(restored, item))), item);
      assert.equal(workspaceModel(restored, item).actions[0].data.payload, model.actions[0].data.payload);
    } finally { ws.dispose(); restored.dispose(); }
  }
});
test('Temperature thresholds reject unknown modes, mixed values, missing units and invalid target entities', () => {
  const model = fromYaml(readFileSync(new URL('./fixtures/awtrix-temperature.yaml', import.meta.url), 'utf8'));
  for (const threshold of [{ type: 'unsupported' }, { type: '__proto__' }, { type: 'any', value: { number: 1 } }, { type: 'above', value: { number: 20 } }, { type: 'above', value: { number: 20, entity: 'sensor.pool', unit_of_measurement: '°C' } }, { type: 'below', value: { entity: 'switch.pool' } }, { type: 'between', value_min: { entity: 'input_number.pool' } }]) {
    const item = structuredClone(model); item.triggers[0].options.threshold = threshold; assert.throws(() => validateAutomation(item));
  }
  model.triggers[0].target.entity_id = ['sensor.good', 'bad']; assert.throws(() => validateAutomation(model));
});

test('Native time expressions preserve inclusive/exclusive and overnight/equal boundaries in HA local time', { skip: process.env.BLOCKS_JINJA_TEST !== '1' }, () => {
  const cases = [
    ['22:00', '06:00', 21, false], ['22:00', '06:00', 22, true], ['22:00', '06:00', 0, true], ['22:00', '06:00', 6, false],
    ['', '19:00', 18, true], ['', '19:00', 19, false], ['10:00', '', 10, true], ['10:00', '', 9, false], ['10:00', '10:00', 3, true]
  ].map(([after, before, hour, expected]) => ({ expression: nativeTimeExpression({ getFieldValue: key => ({ AFTER: after, BEFORE: before })[key] }), hour, expected }));
  const result = spawnSync('python', ['-c', `
import json,sys
from datetime import datetime
from zoneinfo import ZoneInfo
from jinja2.nativetypes import NativeEnvironment
env=NativeEnvironment(); zone=ZoneInfo('Europe/Berlin')
for item in json.load(sys.stdin):
 env.globals.update(now=lambda:datetime(2026,3,29,item['hour'],tzinfo=zone),today_at=lambda text:datetime.fromisoformat('2026-03-29T'+text).replace(tzinfo=zone))
 assert env.from_string('{{ '+item['expression']+' }}').render() == item['expected'], item
`], { input: JSON.stringify(cases), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('Full pool pump automation retains time lists, unrestricted entity changes, events, time conditions and multiline timer templates', () => {
  const model = fromYaml(readFileSync(new URL('./fixtures/pool-pump.yaml', import.meta.url), 'utf8'));
  const ws = new Blockly.Workspace(), restored = new Blockly.Workspace();
  try {
    modelWorkspace(ws, model);
    assert.deepEqual(workspaceModel(ws, model), model);
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), restored);
    assert.deepEqual(fromYaml(toYaml(workspaceModel(restored, model))), model);
    assert.equal(Object.hasOwn(workspaceModel(restored, model).triggers[1], 'to'), false);
    restored.getBlocksByType('ugso_time_trigger')[0].setFieldValue('["25:00:00"]', 'TIME');
    assert.throws(() => validateAutomation(workspaceModel(restored, model)), /Uhrzeit/);
  } finally { ws.dispose(); restored.dispose(); }
});
test('Invalid time lists, entity lists, event filters and empty time conditions reject before import', () => {
  for (const trigger of [{ trigger: 'time', at: [] }, { trigger: 'time', at: ['10:00', 'bad'] }, { trigger: 'state', entity_id: [] }, { trigger: 'event', event_type: 'timer.finished', event_data: [] }]) assert.throws(() => validateAutomation({ ...fixture, triggers: [trigger] }));
  assert.throws(() => validateAutomation({ ...fixture, conditions: [{ condition: 'time' }] }));
});

test('PC/TV button automation retains all states, trigger IDs, branches, target lists and empty objects', () => {
  const ws = new Blockly.Workspace(), restored = new Blockly.Workspace();
  try {
    modelWorkspace(ws, fixture);
    assert.deepEqual(workspaceModel(ws, fixture), fixture);
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), restored);
    assert.deepEqual(fromYaml(toYaml(workspaceModel(restored, fixture))), fixture);
    restored.getBlocksByType('ugso_state_trigger')[0].setFieldValue('renamed', 'TRIGGER_ID');
    assert.equal(workspaceModel(restored, fixture).triggers[0].id, 'renamed');
    const condition = restored.getBlocksByType('ugso_trigger_condition')[0];
    condition.setFieldValue('TRUE', 'ID_LIST'); condition.setFieldValue('["button_1","button_2"]', 'ID');
    assert.deepEqual(validateAutomation(workspaceModel(restored, fixture)).actions[0].choose[0].conditions[0].id, ['button_1', 'button_2']);
    condition.setFieldValue('[]', 'ID'); assert.throws(() => workspaceModel(restored, fixture), /1–100/);
  } finally { ws.dispose(); restored.dispose(); }
});
test('Editor output omits only the automation ID, preserving trigger IDs and file-list identity', () => {
  const model = { id: 'saved-automation', ...fixture };
  const output = fromYaml(toYaml(model, 'single', { omitId: true }));
  assert.equal(Object.hasOwn(output, 'id'), false);
  assert.deepEqual(output, fixture);
  assert.equal(fromYaml(toYaml(model, 'list')).id, model.id);
  assert.equal(model.id, 'saved-automation');
});
test('Native lists reject invalid entities, empty/nonstring states and metadata arrays', () => {
  for (const change of [m => { m.triggers[0].to = []; }, m => { m.triggers[0].to = [1]; }, m => { m.actions[0].choose[3].sequence[1].target.entity_id = ['light.test', 'bad']; }, m => { m.actions[0].choose[3].sequence[1].metadata = []; }]) {
    const model = structuredClone(fixture); change(model); assert.throws(() => validateAutomation(model));
  }
});
