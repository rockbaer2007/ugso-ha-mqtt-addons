import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchingEntities, entityDomain } from '../src/entities.js';
import { Blockly, modelWorkspace, workspaceModel } from '../src/blocks.js';
import { examples } from '../src/model.js';

test('entity search combines name and ID, filters the current helper domain', () => {
  const rows = [{ entity_id: 'light.kitchen', domain: 'light', name: 'Küche' }, { entity_id: 'script.kitchen', domain: 'script', name: 'Küche Abend' }];
  assert.deepEqual(matchingEntities(rows, 'küche LIGHT'), [rows[0]]);
  assert.deepEqual(matchingEntities(rows, 'küche', 'script'), [rows[1]]);
  assert.equal(entityDomain({ type: 'ugso_helper_action', getFieldValue: () => 'counter' }), 'counter');
});

test('entity picker fields preserve project IDs and native HA output', () => {
  const ws = new Blockly.Workspace();
  try {
    modelWorkspace(ws, examples.light);
    assert.deepEqual(workspaceModel(ws, examples.light), examples.light);
    const restored = new Blockly.Workspace();
    try {
      Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), restored);
      assert.deepEqual(workspaceModel(restored, examples.light), examples.light);
      assert.equal(restored.newBlock('ugso_service_action').getFieldValue('ENTITY'), '');
    } finally { restored.dispose(); }
  } finally { ws.dispose(); }
});
