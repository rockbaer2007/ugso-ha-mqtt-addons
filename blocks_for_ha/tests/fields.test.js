import test from 'node:test';
import assert from 'node:assert/strict';
import { Blockly, modelWorkspace, workspaceModel, knownTypes, toolbox } from '../src/blocks.js';
import { examples, fromYaml, toYaml } from '../src/model.js';
import { dateTemplate, parseDateTemplate } from '../src/values.js';
// The original colour palette creates HTML swatches even for headless Blocks.
globalThis.document = Blockly.utils.xml.createElement('div').ownerDocument;
globalThis.HTMLElement = document.defaultView.HTMLElement;

test('All blocks omit expansion shortcuts and compact legacy logic is absent from the toolbox', () => {
  const ws = new Blockly.Workspace();
  try {
    for (const type of knownTypes) {
      const block = ws.newBlock(type);
      for (const name of ['ADD', 'REMOVE', 'ELSE_TOGGLE']) assert.equal(block.getField(name), null, `${type}:${name}`);
      assert.ok(block.inputList.every(input => input.fieldRow.every(field => !(field instanceof Blockly.FieldImage))), type);
    }
    assert.ok(!toolbox.contents.flatMap(category => category.contents || []).some(block => block.type === 'ugso_binary_logic'));
    assert.ok(ws.getBlocksByType('ugso_binary_logic').length, 'Legacy blocks still load');
  } finally { ws.dispose(); }
});

test('Date, RGB light, dependent helper actions and multiline messages roundtrip', () => {
  const ws = new Blockly.Workspace(), copy = new Blockly.Workspace();
  try {
    const model = { ...examples.light, conditions: [{ condition: 'template', value_template: dateTemplate('2028-02-29', '>=') }], actions: [
      { action: 'light.turn_on', target: { entity_id: 'light.test' }, data: { rgb_color: [255, 136, 0], brightness_pct: 75 } },
      { action: 'counter.increment', target: { entity_id: 'counter.test' } },
      { action: 'timer.pause', target: { entity_id: 'timer.test' } },
      { action: 'system_log.write', data: { level: 'info', message: 'Zeile 1\nZeile 2\nZeile 3\nZeile 4' } }
    ] };
    modelWorkspace(ws, fromYaml(toYaml(model)));
    assert.equal(ws.getBlocksByType('ugso_colour_action').length, 1);
    assert.equal(ws.getBlocksByType('ugso_helper_action').length, 2);
    assert.equal(ws.getBlocksByType('ugso_date_condition').length, 1);
    assert.ok(ws.getBlocksByType('ugso_text')[0].getField('TEXT') instanceof Blockly.FieldTextInput);
    assert.equal(ws.getBlocksByType('ugso_text')[0].getFieldValue('TEXT'), model.actions[3].data.message);
    assert.deepEqual(workspaceModel(ws, model), model);
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), copy);
    assert.deepEqual(workspaceModel(copy, model), model);
  } finally { ws.dispose(); copy.dispose(); }
});
test('Date validation stays strict while general template conditions are supported', () => {
  assert.throws(() => dateTemplate('2027-02-29', '=='), /Datum/);
  assert.throws(() => dateTemplate('2026-10-09', '!='), /Datum/);
  assert.deepEqual(parseDateTemplate(dateTemplate('2026-10-09', '<=')), { date: '2026-10-09', op: '<=' });
  assert.equal(fromYaml(toYaml(examples.light).replace('conditions: []', 'conditions:\n  - condition: template\n    value_template: "{{ true }}"')).conditions[0].value_template, '{{ true }}');
});
test('Helper dropdown updates, enforces matching entity and retains extra parameters', () => {
  const ws = new Blockly.Workspace();
  try {
    modelWorkspace(ws, { ...examples.light, actions: [{ action: 'input_boolean.turn_on', target: { entity_id: 'input_boolean.test' } }] });
    const helper = ws.getBlocksByType('ugso_helper_action')[0];
    helper.setFieldValue('counter', 'DOMAIN');
    assert.deepEqual(helper.getField('SERVICE').getOptions(false).map(o => o[1]), ['increment', 'decrement', 'reset']);
    assert.throws(() => workspaceModel(ws, examples.light), /Helfer/);
    helper.setFieldValue('counter.test', 'ENTITY');
    assert.equal(workspaceModel(ws, examples.light).actions[0].action, 'counter.increment');
    const model = { ...examples.light, actions: [{ action: 'timer.start', target: { entity_id: 'timer.test' }, data: { duration: '00:05:00' } }] };
    modelWorkspace(ws, model);
    assert.equal(ws.getBlocksByType('ugso_service_action').length, 1);
    assert.deepEqual(workspaceModel(ws, model), model);
  } finally { ws.dispose(); }
});
test('Percent sliders retain Number compatibility; colour blocks cannot enter number slots', () => {
  const ws = new Blockly.Workspace();
  try {
    modelWorkspace(ws, examples.battery);
    const slider = ws.newBlock('ugso_percent'), colour = ws.newBlock('ugso_colour');
    slider.setFieldValue(180, 'NUM'); assert.equal(slider.getFieldValue('NUM'), 100);
    slider.setFieldValue(-20, 'NUM'); assert.equal(slider.getFieldValue('NUM'), 0);
    const input = ws.getBlocksByType('ugso_numeric_trigger')[0].getInput('LIMIT').connection;
    assert.equal(ws.connectionChecker.canConnect(input, colour.outputConnection, false), false); colour.dispose();
    slider.setFieldValue(45, 'NUM'); input.connect(slider.outputConnection);
    assert.equal(workspaceModel(ws, examples.battery).triggers[0].below, 45);
  } finally { ws.dispose(); }
});
