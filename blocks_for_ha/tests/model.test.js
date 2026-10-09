import test from 'node:test';
import assert from 'node:assert/strict';
import { Blockly, workspaceModel, modelWorkspace } from '../src/blocks.js';
import { examples, toYaml, fromYaml, filename } from '../src/model.js';

for (const [name, example] of Object.entries(examples)) {
  test(`${name}: native YAML survives Blocks and YAML roundtrip`, () => {
    const workspace = new Blockly.Workspace();
    try {
      modelWorkspace(workspace, example);
      const { triggers, conditions, actions, ...metadata } = example;
      const generated = workspaceModel(workspace, metadata);
      assert.deepEqual(generated, example);
      assert.deepEqual(fromYaml(toYaml(generated)), example);
      assert.deepEqual(fromYaml(toYaml(generated, 'list')), example);
    } finally { workspace.dispose(); }
  });
}
test('Nested logic, branches and action JSON preserve meaning', () => {
  const model = structuredClone(examples.battery);
  model.mode = 'queued'; model.max = 3;
  model.conditions = [{ condition: 'or', conditions: [{ condition: 'state', entity_id: 'input_boolean.laden_erlaubt', state: 'on' }, { condition: 'numeric_state', entity_id: 'sensor.preis', below: -0.5 }] }];
  model.actions = [{ if: model.conditions, then: [{ action: 'notify.mobile_app_telefon', data: { message: 'Text: "Ja"\n{{ states("sensor.preis") }}', title: 'Hallo', data: { tag: 'akku' } } }], else: [{ delay: 10 }] }];
  const workspace = new Blockly.Workspace();
  try { modelWorkspace(workspace, model); const { triggers, conditions, actions, ...metadata } = model; assert.deepEqual(fromYaml(toYaml(workspaceModel(workspace, metadata))), model); } finally { workspace.dispose(); }
});
test('Unsupported YAML content is rejected instead of dropped', () => {
  assert.throws(() => fromYaml(toYaml(examples.light) + '\nvariables:\n  hidden: true\n'), /nicht unterstützt/);
  assert.throws(() => fromYaml(toYaml(examples.light).replace('to: on', 'to: on\n    for: 30')), /nicht unterstützt/);
  assert.throws(() => fromYaml('- alias: A\n- alias: B'), /genau einer/);
  assert.throws(() => fromYaml('alias: A\nalias: B'), /ungültig/);
});
test('Invalid numbers, missing entities and empty branches prevent export', () => {
  const model = structuredClone(examples.battery);
  model.triggers[0].below = NaN; assert.throws(() => toYaml(model), /Zahl/);
  model.triggers[0].below = 20; model.triggers[0].entity_id = ''; assert.throws(() => toYaml(model), /Entität/);
  model.triggers[0].entity_id = 'sensor.akku'; model.actions = [{ if: [], then: [] }]; assert.throws(() => toYaml(model), /Eintrag/);
});
test('Disconnected Blocks are not silently excluded', () => {
  const workspace = new Blockly.Workspace();
  try { modelWorkspace(workspace, examples.light); workspace.newBlock('ugso_delay_action'); assert.throws(() => workspaceModel(workspace, examples.light), /verbunden/); } finally { workspace.dispose(); }
});
test('Download names are derived from the actual automation name', () => {
  assert.equal(filename('Licht Küche / Süd'), 'licht-kuche-sud.yaml');
  assert.equal(filename(''), 'automation.yaml');
});
test('Imports reject invalid action objects and unrepresentable delay values', () => {
  for (const action of [{ action: 'notify.telefon', data: false }, { action: 'light.turn_on', target: null }, { delay: 1.5 }]) {
    const model = structuredClone(examples.light); model.actions = [action]; assert.throws(() => toYaml(model));
  }
  const model = structuredClone(examples.light); model.triggers[0].entity_id = 'sensor.3d_printer'; assert.doesNotThrow(() => toYaml(model));
});
