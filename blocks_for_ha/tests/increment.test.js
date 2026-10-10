import test from 'node:test';
import assert from 'node:assert/strict';
import { Blockly, modelWorkspace, workspaceModel } from '../src/blocks.js';
import { examples, fromYaml, toYaml } from '../src/model.js';

test('Increment defaults to 1 and preserves negative, zero and fractional steps across YAML and JSON', () => {
  const ws = new Blockly.Workspace(), copy = new Blockly.Workspace();
  try {
    modelWorkspace(ws, { ...examples.light, actions: [{ variables: { test: 10 } }] });
    const change = ws.newBlock('ugso_variable_change');
    const variable = ws.getVariableMap().getVariable('test'); change.setFieldValue(variable.getId(), 'VAR');
    ws.getBlocksByType('ugso_variable_set')[0].nextConnection.connect(change.previousConnection);
    assert.equal(change.getInputTargetBlock('STEP').getFieldValue('NUM'), 1);
    for (const step of [1, -2, 0, 0.5]) {
      change.getInputTargetBlock('STEP').setFieldValue(step, 'NUM');
      const model = workspaceModel(ws, examples.light);
      assert.equal(model.actions[1].variables.test, `{{ (test if test is number and test is not boolean else none) + (${step}) }}`);
      modelWorkspace(copy, fromYaml(toYaml(model)));
      assert.equal(copy.getBlocksByType('ugso_variable_change').length, 1);
      assert.deepEqual(workspaceModel(copy, examples.light), model);
      Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), copy);
      assert.deepEqual(workspaceModel(copy, examples.light), model);
    }
    ws.getVariableMap().renameVariable(variable, 'zaehler');
    assert.match(workspaceModel(ws, examples.light).actions[1].variables.zaehler, /zaehler if zaehler/);
    change.getInputTargetBlock('STEP').setDisabledReason(true, 'MANUALLY_DISABLED');
    assert.throws(() => workspaceModel(ws, examples.light), /Zahlenblock fehlt/);
  } finally { ws.dispose(); copy.dispose(); }
});

test('Other assignments remain templates and Boolean cannot dock in the increment input', () => {
  const ws = new Blockly.Workspace();
  try {
    const model = { ...examples.light, actions: [{ variables: { test: '{{ (other if other is number and other is not boolean else none) + (1) }}' } }] };
    modelWorkspace(ws, model);
    assert.equal(ws.getBlocksByType('ugso_variable_change').length, 0);
    assert.deepEqual(workspaceModel(ws, examples.light), model);
    const change = ws.newBlock('ugso_variable_change'), boolean = ws.newBlock('ugso_boolean');
    assert.equal(change.getInput('STEP').connection.getConnectionChecker().canConnect(change.getInput('STEP').connection, boolean.outputConnection, false), false);
  } finally { ws.dispose(); }
});
