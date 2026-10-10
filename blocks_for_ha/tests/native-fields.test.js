import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Blockly, modelWorkspace, workspaceModel } from '../src/blocks.js';
import { fromYaml, toYaml, validateAutomation } from '../src/model.js';
const fixture = fromYaml(readFileSync(new URL('./fixtures/pc-tv.yaml', import.meta.url), 'utf8'));

test('PC/TV button automation retains all states, trigger IDs, branches, target lists and empty objects', () => {
  const ws = new Blockly.Workspace(), restored = new Blockly.Workspace();
  try {
    modelWorkspace(ws, fixture);
    assert.deepEqual(workspaceModel(ws, fixture), fixture);
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), restored);
    assert.deepEqual(fromYaml(toYaml(workspaceModel(restored, fixture))), fixture);
    restored.getBlocksByType('ugso_state_trigger')[0].setFieldValue('renamed', 'TRIGGER_ID');
    assert.equal(workspaceModel(restored, fixture).triggers[0].id, 'renamed');
    const condition = restored.getBlocksByType('ugso_trigger_condition')[0];
    condition.setFieldValue('TRUE', 'ID_LIST'); condition.setFieldValue('["button_1","button_2"]', 'ID');
    assert.deepEqual(validateAutomation(workspaceModel(restored, fixture)).actions[0].choose[0].conditions[0].id, ['button_1', 'button_2']);
    condition.setFieldValue('[]', 'ID'); assert.throws(() => workspaceModel(restored, fixture), /1–100/);
  } finally { ws.dispose(); restored.dispose(); }
});
test('Editor output omits only the automation ID, preserving trigger IDs and file-list identity', () => {
  const model = { id: 'saved-automation', ...fixture };
  const output = fromYaml(toYaml(model, 'single', { omitId: true }));
  assert.equal(Object.hasOwn(output, 'id'), false);
  assert.deepEqual(output, fixture);
  assert.equal(fromYaml(toYaml(model, 'list')).id, model.id);
  assert.equal(model.id, 'saved-automation');
});
test('Native lists reject invalid entities, empty/nonstring states and metadata arrays', () => {
  for (const change of [m => { m.triggers[0].to = []; }, m => { m.triggers[0].to = [1]; }, m => { m.actions[0].choose[3].sequence[1].target.entity_id = ['light.test', 'bad']; }, m => { m.actions[0].choose[3].sequence[1].metadata = []; }]) {
    const model = structuredClone(fixture); change(model); assert.throws(() => validateAutomation(model));
  }
});
