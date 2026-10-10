import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validActionEntity } from '../src/action-targets.js';
import { Blockly, modelWorkspace, workspaceModel } from '../src/blocks.js';
import { fromYaml, toYaml, validateAutomation } from '../src/model.js';
const fixture = fromYaml(readFileSync(new URL('./fixtures/bedroom-tv.yaml', import.meta.url), 'utf8'));

test('Bedroom TV retains dynamic targets and multiline summer-mode variable through project and YAML', () => {
  for (const target of ['{{ ziel_tv }}', '{% if true %}\nlight.one\n{% else %}\nlight.two\n{% endif %}\n', ['light.one', '{{ ziel_tv }}']]) {
    const model = structuredClone(fixture);
    for (const branch of model.actions[1].choose) branch.sequence[0].target.entity_id = target;
    const ws = new Blockly.Workspace(), restored = new Blockly.Workspace();
    try {
      modelWorkspace(ws, model); assert.deepEqual(workspaceModel(ws, model), model);
      Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), restored);
      assert.deepEqual(fromYaml(toYaml(workspaceModel(restored, model))), model);
    } finally { ws.dispose(); restored.dispose(); }
  }
});

test('Dynamic target actions use generic blocks and retain optional fields', () => {
  for (const action of ['homeassistant.update_entity', 'switch.turn_on', 'light.turn_on']) {
    for (const extra of [{}, { data: {}, metadata: {}, response_variable: 'result' }]) {
      const model = { ...fixture, actions: [{ action, target: { entity_id: '{{ ziel_tv }}' }, ...extra }] };
      const ws = new Blockly.Workspace();
      try {
        modelWorkspace(ws, model); assert.deepEqual(workspaceModel(ws, model), model);
        assert.ok(ws.getAllBlocks(false).some(block => block.type === 'ugso_service_action'));
      } finally { ws.dispose(); }
    }
  }
});

test('Action target templates stay limited to action targets; malformed literal IDs reject', () => {
  for (const value of ['', 'bad', '{{', '{% %}', 42, null, {}, true]) {
    assert.equal(validActionEntity(value), false);
    assert.throws(() => validateAutomation({ ...fixture, actions: [{ action: 'switch.turn_on', target: { entity_id: value } }] }));
  }
  assert.throws(() => validateAutomation({ ...fixture, triggers: [{ trigger: 'state', entity_id: '{{ ziel_tv }}' }] }));
  assert.throws(() => validateAutomation({ ...fixture, conditions: [{ condition: 'state', entity_id: '{{ ziel_tv }}', state: 'on' }] }));
});
