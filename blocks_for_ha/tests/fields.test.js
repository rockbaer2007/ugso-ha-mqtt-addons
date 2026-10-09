import test from 'node:test';
import assert from 'node:assert/strict';
import { Blockly, modelWorkspace, workspaceModel } from '../src/blocks.js';
import { examples, fromYaml, toYaml } from '../src/model.js';
import { dateTemplate, parseDateTemplate } from '../src/values.js';
// The original colour palette creates HTML swatches even for headless Blocks.
globalThis.document = Blockly.utils.xml.createElement('div').ownerDocument;
globalThis.HTMLElement = document.defaultView.HTMLElement;

test('Plus/minus preserves connected children and undo restores removed inputs', async () => {
  const ws = new Blockly.Workspace();
  try {
    modelWorkspace(ws, { ...examples.light, conditions: [{ condition: 'and', conditions: [{ condition: 'state', entity_id: 'input_boolean.a', state: 'on' }, { condition: 'state', entity_id: 'input_boolean.b', state: 'on' }] }] });
    const logic = ws.getBlocksByType('ugso_logic_condition')[0];
    const removed = logic.getInputTargetBlock('COND1');
    ws.clearUndo(); logic.getField('REMOVE').showEditor_();
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(logic.itemCount_, 1); assert.equal(removed.getParent(), null);
    ws.undo(false); assert.equal(logic.itemCount_, 2); assert.equal(logic.getInputTargetBlock('COND1'), removed);
    ws.undo(true); assert.equal(logic.itemCount_, 1);
    logic.getField('ADD').showEditor_(); assert.equal(logic.itemCount_, 2);
    const conditional = ws.newBlock('ugso_if_action');
    conditional.getField('ELSE_TOGGLE').showEditor_(); assert.ok(conditional.getInput('ELSE'));
    conditional.getField('ADD').showEditor_(); assert.ok(conditional.getInput('C1'));
    conditional.getField('REMOVE').showEditor_(); assert.equal(conditional.getInput('C1'), null);
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
    assert.equal(ws.getBlocksByType('ugso_text')[0].getField('TEXT').getMaxLines(), 3);
    assert.deepEqual(workspaceModel(ws, model), model);
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), copy);
    assert.deepEqual(workspaceModel(copy, model), model);
  } finally { ws.dispose(); copy.dispose(); }
});
test('Invalid dates and unrelated templates cannot be silently converted', () => {
  assert.throws(() => dateTemplate('2027-02-29', '=='), /Datum/);
  assert.throws(() => dateTemplate('2026-10-09', '!='), /Datum/);
  assert.deepEqual(parseDateTemplate(dateTemplate('2026-10-09', '<=')), { date: '2026-10-09', op: '<=' });
  assert.throws(() => fromYaml(toYaml(examples.light).replace('conditions: []', 'conditions:\n  - condition: template\n    value_template: "{{ true }}"')), /Datumsvorlage/);
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
