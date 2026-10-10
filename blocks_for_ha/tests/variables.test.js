import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Blockly, modelWorkspace, workspaceModel } from '../src/blocks.js';
import { examples, fromYaml, toYaml } from '../src/model.js';

test('Timer grouped variables retain one action, templates and restart mode through project and YAML', () => {
  const original = fromYaml(readFileSync(new URL('./fixtures/timer-full-hour.yaml', import.meta.url), 'utf8'));
  for (const variables of [original.actions[0].variables, { h: 0, m: 1, ready: false, empty: null, text: 'test', later: '{{ h + m }}' }]) {
    const model = structuredClone(original); model.actions[0].variables = variables;
    const ws = new Blockly.Workspace(), copy = new Blockly.Workspace();
    try {
      modelWorkspace(ws, model);
      assert.equal(ws.getBlocksByType('ugso_variables_action').length, 1);
      assert.deepEqual(workspaceModel(ws, model), model);
      for (const name of Object.keys(variables)) assert.ok(ws.getVariableMap().getVariable(name));
      Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), copy);
      assert.deepEqual(fromYaml(toYaml(workspaceModel(copy, model))), model);
    } finally { ws.dispose(); copy.dispose(); }
  }
});

test('HA variables, numbers and arbitrary Jinja survive YAML and project reload', () => {
  const ws = new Blockly.Workspace(), copy = new Blockly.Workspace();
  const model = { ...examples.light, conditions: [{ condition: 'template', value_template: "{{ states('sensor.test') | float(0) > 20 }}" }], actions: [
    { variables: { leistung: 1250 } },
    { variables: { meldung: 'Leistung: {{ leistung }} W' } },
    { action: 'system_log.write', data: { level: 'info', message: '{{ meldung }}' } }
  ] };
  try {
    modelWorkspace(ws, fromYaml(toYaml(model)));
    assert.equal(ws.getBlocksByType('ugso_jinja_condition').length, 1);
    assert.equal(ws.getBlocksByType('ugso_jinja_value').length, 1);
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
    for (const variables of [{ 'nicht gültig': 1 }, { x: undefined }, {}, Object.fromEntries(Array.from({ length: 101 }, (_, i) => ['v' + i, i]))]) {
      assert.throws(() => toYaml({ ...examples.light, actions: [{ variables }] }), /Variable|Objekt/);
    }
  } finally { ws.dispose(); }
});
