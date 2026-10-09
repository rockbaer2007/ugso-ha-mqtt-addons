import test from 'node:test';
import assert from 'node:assert/strict';
import { Blockly, modelWorkspace, workspaceModel } from '../src/blocks.js';
import { examples, fromYaml, toYaml } from '../src/model.js';

test('HA variables, numbers and arbitrary Jinja survive YAML and project reload', () => {
  const ws = new Blockly.Workspace(), copy = new Blockly.Workspace();
  const model = { ...examples.light, conditions: [{ condition: 'template', value_template: "{{ states('sensor.test') | float(0) > 20 }}" }], actions: [
    { variables: { leistung: 1250 } },
    { variables: { meldung: 'Leistung: {{ leistung }} W' } },
    { action: 'system_log.write', data: { level: 'info', message: '{{ meldung }}' } }
  ] };
  try {
    modelWorkspace(ws, fromYaml(toYaml(model)));
    assert.equal(ws.getBlocksByType('ugso_template_condition').length, 1);
    assert.equal(ws.getBlocksByType('ugso_template').length, 1);
    assert.equal(ws.getBlocksByType('ugso_variable_get').length, 1);
    assert.deepEqual(workspaceModel(ws, model), model);
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), copy);
    assert.deepEqual(fromYaml(toYaml(workspaceModel(copy, model))), model);
    const variable = copy.getVariableMap().getVariable('meldung');
    copy.getVariableMap().renameVariable(variable, 'nachricht');
    const actions = workspaceModel(copy, model).actions;
    assert.equal(actions[1].variables.nachricht, 'Leistung: {{ leistung }} W');
    assert.equal(actions[2].data.message, '{{ nachricht }}');
  } finally { ws.dispose(); copy.dispose(); }
});

test('Templates keep their exact text; unsupported variable shapes fail before import', () => {
  const ws = new Blockly.Workspace();
  try {
    const model = { ...examples.light, actions: [{ variables: { wert: '{{states("sensor.test")}}' } }] };
    modelWorkspace(ws, model);
    assert.deepEqual(workspaceModel(ws, model), model);
    for (const variables of [{ 'nicht gültig': 1 }, { x: [] }, { x: 1, y: 2 }]) {
      assert.throws(() => toYaml({ ...examples.light, actions: [{ variables }] }), /Variable/);
    }
  } finally { ws.dispose(); }
});
