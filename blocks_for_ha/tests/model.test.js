import test from 'node:test';
import assert from 'node:assert/strict';
import { Blockly, workspaceModel, modelWorkspace } from '../src/blocks.js';
import { examples, toYaml, fromYaml, filename } from '../src/model.js';
import { upgradeWorkspace } from '../src/project.js';

test('Conditions use Boolean value connectors and reject action/number blocks', () => {
  const workspace = new Blockly.Workspace();
  try {
    modelWorkspace(workspace, examples.battery);
    const condition = workspace.getBlocksByType('ugso_state_condition')[0];
    const root = workspace.getBlocksByType('ugso_automation')[0];
    assert.ok(condition.outputConnection); assert.equal(condition.previousConnection, null); assert.equal(condition.nextConnection, null);
    const input = root.getInput('CONDITIONS').connection;
    const num = workspace.newBlock('ugso_number'); const action = workspace.newBlock('ugso_delay_action');
    assert.equal(workspace.connectionChecker.canConnect(input, condition.outputConnection, false), true);
    assert.equal(workspace.connectionChecker.canConnect(input, num.outputConnection, false), false);
    assert.equal(workspace.connectionChecker.canConnect(input, action.previousConnection, false), false);
  } finally { workspace.dispose(); }
});

test('Replacing and removing number blocks restores the original shadow value', () => {
  const workspace = new Blockly.Workspace();
  try {
    modelWorkspace(workspace, examples.battery);
    const trigger = workspace.getBlocksByType('ugso_numeric_trigger')[0];
    assert.equal(trigger.getInputTargetBlock('LIMIT').isShadow(), true);
    const replacement = workspace.newBlock('ugso_number'); replacement.setFieldValue(42, 'NUM');
    trigger.getInput('LIMIT').connection.connect(replacement.outputConnection);
    assert.equal(workspaceModel(workspace, { alias: 'Test', mode: 'single' }).triggers[0].below, 42);
    replacement.dispose();
    assert.equal(workspaceModel(workspace, { alias: 'Test', mode: 'single' }).triggers[0].below, 20);
  } finally { workspace.dispose(); }
});

test('Legacy condition chains, limits and delay fields migrate without value loss', () => {
  const source = { blocks: { languageVersion: 0, blocks: [{ type: 'ugso_automation', inputs: {
    TRIGGERS: { block: { type: 'ugso_numeric_trigger', fields: { ENTITY: 'sensor.akku', OP: 'below', LIMIT: 20 } } },
    CONDITIONS: { block: { type: 'ugso_state_condition', fields: { ENTITY: 'input_boolean.test', STATE: 'on' }, next: { block: { type: 'ugso_logic_condition', fields: { LOGIC: 'not' }, inputs: { CONDITIONS: { block: { type: 'ugso_numeric_condition', fields: { ENTITY: 'sensor.preis', OP: 'above', LIMIT: 5 } } } } } } } },
    ACTIONS: { block: { type: 'ugso_if_action', inputs: { CONDITIONS: { block: { type: 'ugso_state_condition', fields: { ENTITY: 'input_boolean.test', STATE: 'on' } } }, THEN: { block: { type: 'ugso_delay_action', fields: { SECONDS: 7 } } }, ELSE: { block: { type: 'ugso_delay_action', fields: { SECONDS: 9 } } } } } }
  } }] } };
  const copy = structuredClone(source); const workspace = new Blockly.Workspace();
  try {
    Blockly.serialization.workspaces.load(upgradeWorkspace(source), workspace);
    const model = workspaceModel(workspace, { alias: 'Migration', mode: 'single' });
    assert.equal(model.conditions.length, 2); assert.equal(model.conditions[1].conditions[0].above, 5);
    assert.equal(model.triggers[0].below, 20); assert.equal(model.actions[0].then[0].delay, 7); assert.equal(model.actions[0].else[0].delay, 9);
    assert.doesNotThrow(() => toYaml(model)); assert.deepEqual(source, copy);
  } finally { workspace.dispose(); }
});

test('Disabled actions and triggers are omitted, required empty inputs reject export', () => {
  const workspace = new Blockly.Workspace();
  try {
    modelWorkspace(workspace, examples.evening);
    workspace.getBlocksByType('ugso_delay_action')[0].setDisabledReason(true, 'MANUALLY_DISABLED');
    const model = workspaceModel(workspace, { alias: 'Test', mode: 'single' });
    assert.equal(model.actions.length, 2); assert.doesNotThrow(() => toYaml(model));
    workspace.getBlocksByType('ugso_sun_trigger')[0].setDisabledReason(true, 'MANUALLY_DISABLED');
    assert.throws(() => toYaml(workspaceModel(workspace, { alias: 'Test', mode: 'single' })), /Auslöser/);
  } finally { workspace.dispose(); }
});

test('Expandable branches preserve choose semantics and project serialization', () => {
  for (const count of [1, 3]) {
    const model = structuredClone(examples.light);
    model.actions = [{ choose: Array.from({ length: count }, (_, i) => ({ conditions: [{ condition: 'numeric_state', entity_id: 'sensor.preis', below: i + 1 }], sequence: [{ delay: i + 1 }] })), default: [{ delay: 9 }] }];
    const workspace = new Blockly.Workspace(); const restored = new Blockly.Workspace();
    try {
      modelWorkspace(workspace, model);
      Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(workspace), restored);
      const { triggers, conditions, actions, ...metadata } = model;
      assert.deepEqual(fromYaml(toYaml(workspaceModel(restored, metadata))), model);
      const block = restored.getBlocksByType('ugso_if_action')[0];
      assert.equal(block.branchCount_, count - 1); assert.ok(block.getInput('ELSE'));
    } finally { workspace.dispose(); restored.dispose(); }
  }
});

test('Mutator reorders branches, retains connections and detaches removed actions', () => {
  const workspace = new Blockly.Workspace(); const dialog = new Blockly.Workspace();
  const originalNewBlock = dialog.newBlock.bind(dialog);
  dialog.newBlock = (...args) => { const block = originalNewBlock(...args); block.initSvg = () => {}; return block; };
  try {
    const model = structuredClone(examples.light);
    model.actions = [{ choose: [1, 2, 3].map(n => ({ conditions: [{ condition: 'state', entity_id: 'sensor.test', state: String(n) }], sequence: [{ delay: n }] })), default: [{ delay: 9 }] }];
    modelWorkspace(workspace, model);
    const block = workspace.getBlocksByType('ugso_if_action')[0];
    const root = block.decompose(dialog); block.saveConnections(root);
    const first = root.getNextBlock(); const second = first.getNextBlock(); const otherwise = second.getNextBlock();
    first.previousConnection.disconnect(); second.previousConnection.disconnect(); otherwise.previousConnection.disconnect();
    root.nextConnection.connect(second.previousConnection); second.nextConnection.connect(first.previousConnection); first.nextConnection.connect(otherwise.previousConnection);
    block.compose(root);
    const { triggers, conditions, actions, ...metadata } = model;
    assert.deepEqual(workspaceModel(workspace, metadata).actions[0].choose.map(branch => branch.sequence[0].delay), [1, 3, 2]);
    block.saveConnections(root);
    otherwise.previousConnection.disconnect(); otherwise.dispose(); block.compose(root);
    assert.equal(block.getInput('ELSE'), null);
    assert.throws(() => workspaceModel(workspace, metadata), /verbunden/);
  } finally { workspace.dispose(); dialog.dispose(); }
});

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
