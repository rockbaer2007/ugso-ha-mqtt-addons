import test from 'node:test';
import assert from 'node:assert/strict';
import { Blockly, modelWorkspace, workspaceModel } from '../src/blocks.js';
import { examples, fromYaml, toYaml } from '../src/model.js';
function make(ws, type, fields = {}, inputs = {}) {
  const block = ws.newBlock(type);
  for (const [key, val] of Object.entries(fields)) block.setFieldValue(String(val), key);
  for (const [name, child] of Object.entries(inputs)) block.getInput(name).connection.connect(child.outputConnection);
  return block;
}
function modelFor(ws, child) {
  const root = ws.getBlocksByType('ugso_automation')[0];
  const old = root.getInputTargetBlock('ACTIONS'); if (old) old.dispose();
  const set = make(ws, 'ugso_variable_set', {}, { VALUE: child });
  root.getInput('ACTIONS').connection.connect(set.previousConnection);
  return workspaceModel(ws, examples.light);
}
test('Boolean and null assignments retain native YAML types through import and serialization', () => {
  const ws = new Blockly.Workspace();
  try {
    for (const val of [true, false, null]) {
      const model = { ...examples.light, actions: [{ variables: { wert: val } }] };
      modelWorkspace(ws, fromYaml(toYaml(model)));
      assert.deepEqual(workspaceModel(ws, model), model);
    }
  } finally { ws.dispose(); }
});
test('Comparison, compact logic and ternary generate parenthesized Jinja and preserve YAML meaning', () => {
  const ws = new Blockly.Workspace(), copy = new Blockly.Workspace();
  try {
    modelWorkspace(ws, examples.light);
    const comparison = make(ws, 'ugso_compare', { OP: '>=' }, { LEFT: make(ws, 'ugso_number', { NUM: 20 }), RIGHT: make(ws, 'ugso_number', { NUM: 10 }) });
    const not = make(ws, 'ugso_not', {}, { BOOL: make(ws, 'ugso_boolean', { BOOL: 'false' }) });
    const both = make(ws, 'ugso_binary_logic', { OP: 'and' }, { LEFT: comparison, RIGHT: not });
    const ternary = make(ws, 'ugso_ternary', {}, { TEST: both, TRUE: make(ws, 'ugso_text', { TEXT: 'Laden "jetzt"' }), FALSE: make(ws, 'ugso_null') });
    const model = modelFor(ws, ternary);
    assert.equal(model.actions[0].variables.wert, '{{ ("Laden \\"jetzt\\"" if ((20 >= 10) and (not false)) else none) }}');
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), copy);
    assert.deepEqual(workspaceModel(copy, examples.light), model);
    modelWorkspace(copy, fromYaml(toYaml(model)));
    assert.deepEqual(workspaceModel(copy, model), model);
  } finally { ws.dispose(); copy.dispose(); }
});
test('NOT and binary logic accept only Boolean inputs and export native HA conditions', () => {
  const ws = new Blockly.Workspace();
  try {
    modelWorkspace(ws, examples.light);
    const not = make(ws, 'ugso_not', {}, { BOOL: make(ws, 'ugso_boolean', { BOOL: 'false' }) });
    assert.equal(not.getInput('BOOL').connection.getConnectionChecker().canConnect(not.getInput('BOOL').connection, ws.newBlock('ugso_number').outputConnection, false), false);
    const loose = ws.getTopBlocks(false).find(b => b.type === 'ugso_number'); loose.dispose();
    ws.getBlocksByType('ugso_automation')[0].getInput('CONDITIONS').connection.connect(not.outputConnection);
    assert.deepEqual(workspaceModel(ws, examples.light).conditions, [{ condition: 'not', conditions: [{ condition: 'template', value_template: '{{ false }}' }] }]);
  } finally { ws.dispose(); }
});
test('Expression operands cannot silently accept missing inputs or multiline statement templates', () => {
  const ws = new Blockly.Workspace();
  try {
    modelWorkspace(ws, examples.light);
    const comparison = make(ws, 'ugso_compare', {}, { LEFT: make(ws, 'ugso_template', { TEXT: '{% set x = 1 %}{{ x }}' }), RIGHT: make(ws, 'ugso_number') });
    assert.throws(() => modelFor(ws, comparison), /einzelnen/);
    comparison.getInputTargetBlock('LEFT').dispose();
    assert.throws(() => workspaceModel(ws, examples.light), /fehlt/);
  } finally { ws.dispose(); }
});
