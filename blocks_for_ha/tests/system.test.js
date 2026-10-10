import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Blockly, modelWorkspace, workspaceModel } from '../src/blocks.js';
import { examples, fromYaml, toYaml } from '../src/model.js';

test('Shelly nested choose and dynamic action names survive Blockly and YAML unchanged', () => {
  const original = fromYaml(readFileSync(new URL('./fixtures/shelly-temperature-toggle.yaml', import.meta.url), 'utf8'));
  for (const action of [original.actions[0].choose[0].sequence[0].action, "{{ 'input_boolean.turn_' ~ states('input_boolean.test') }}", "{% if is_state('input_boolean.test', 'on') %}\ninput_boolean.turn_on\n{% else %}\ninput_boolean.turn_off\n{% endif %}\n"]) {
    const model = structuredClone(original); model.actions[0].choose[0].sequence[0].action = action;
    const ws = new Blockly.Workspace(), copy = new Blockly.Workspace();
    try {
      modelWorkspace(ws, model); assert.deepEqual(workspaceModel(ws, model), model);
      Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), copy);
      assert.deepEqual(fromYaml(toYaml(workspaceModel(copy, model))), model);
    } finally { ws.dispose(); copy.dispose(); }
  }
  for (const action of ['turn_on', 'input_boolean.turn_{{', '{{ }}', '{% %}', 'switch..turn_on', 42]) {
    assert.throws(() => toYaml({ ...examples.light, actions: [{ action }] }));
  }
});

const metadata = { alias: 'System', mode: 'single' };
const actions = [
  { action: 'system_log.write', data: { message: 'Laden: ä, ö, ü\nZweite Zeile', level: 'warning' } },
  { action: 'script.turn_on', target: { entity_id: 'script.abendlicht' } },
  { action: 'script.turn_off', target: { entity_id: 'script.abendlicht' } },
  { action: 'script.abendlicht' },
  { action: 'homeassistant.update_entity', target: { entity_id: 'sensor.temperatur' } }
];
test('System actions retain native YAML semantics through Blocks and project reload', () => {
  const ws = new Blockly.Workspace(); const restored = new Blockly.Workspace();
  try {
    const model = { ...examples.light, actions };
    modelWorkspace(ws, fromYaml(toYaml(model)));
    assert.deepEqual(ws.getAllBlocks(false).filter(b => b.previousConnection?.getCheck()?.includes('Action')).map(b => b.type).sort(), ['ugso_log_action', 'ugso_script_action', 'ugso_script_action', 'ugso_script_action', 'ugso_update_action'].sort());
    assert.deepEqual(workspaceModel(ws, model), model);
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), restored);
    assert.deepEqual(fromYaml(toYaml(workspaceModel(restored, model))), model);
  } finally { ws.dispose(); restored.dispose(); }
});
test('Unsupported parameters remain editable in the generic action without data loss', () => {
  const ws = new Blockly.Workspace();
  try {
    const model = { ...examples.light, actions: [
      { action: 'system_log.write', data: { message: 'Test', level: 'info', logger: 'custom.test' } },
      { action: 'script.turn_on', target: { entity_id: 'script.abendlicht' }, data: { variables: { brightness: 100 } } },
      { action: 'script.abendlicht', data: { brightness: 100 } },
      { action: 'homeassistant.update_entity', target: { entity_id: 'sensor.test' }, data: {} }
    ] };
    modelWorkspace(ws, model);
    assert.equal(ws.getBlocksByType('ugso_service_action').length, 4);
    assert.deepEqual(workspaceModel(ws, model), model);
  } finally { ws.dispose(); }
});
test('Text connectors, missing messages and script domain validation', () => {
  const ws = new Blockly.Workspace();
  try {
    modelWorkspace(ws, { ...examples.light, actions: [actions[0], actions[1]] });
    const log = ws.getBlocksByType('ugso_log_action')[0];
    const input = log.getInput('MESSAGE').connection;
    const num = ws.newBlock('ugso_number');
    assert.equal(ws.connectionChecker.canConnect(input, num.outputConnection, false), false); num.dispose();
    const txt = ws.newBlock('ugso_text'); txt.setFieldValue('Neue Meldung', 'TEXT');
    input.connect(txt.outputConnection);
    assert.equal(workspaceModel(ws, metadata).actions[0].data.message, 'Neue Meldung');
    txt.dispose(); assert.equal(log.getInputTargetBlock('MESSAGE').isShadow(), true);
    log.getInputTargetBlock('MESSAGE').setFieldValue('', 'TEXT');
    assert.throws(() => workspaceModel(ws, metadata), /Meldung fehlt/);
    log.getInputTargetBlock('MESSAGE').setFieldValue('Test', 'TEXT');
    ws.getBlocksByType('ugso_script_action')[0].setFieldValue('light.test', 'ENTITY');
    assert.throws(() => workspaceModel(ws, metadata), /script.name/);
  } finally { ws.dispose(); }
});
