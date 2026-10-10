import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Blockly, modelWorkspace, workspaceModel } from '../src/blocks.js';
import { fromYaml, toYaml, validateAutomation } from '../src/model.js';
const fixture = fromYaml(readFileSync(new URL('./fixtures/lcd-update.yaml', import.meta.url), 'utf8'));

test('LCD time pattern preserves all templates, native value types and omitted units after reload', () => {
  for (const pattern of [{ seconds: '/30' }, { minutes: '/5' }, { hours: 0 }, { hours: '23', minutes: 59, seconds: '0', id: 'lcd' }, { hours: '*', minutes: '*', seconds: '*' }]) {
    const model = { ...fixture, triggers: [{ trigger: 'time_pattern', ...pattern }] };
    const ws = new Blockly.Workspace(), restored = new Blockly.Workspace();
    try {
      modelWorkspace(ws, model);
      assert.deepEqual(workspaceModel(ws, model), model);
      Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), restored);
      assert.deepEqual(fromYaml(toYaml(workspaceModel(restored, model))), model);
    } finally { ws.dispose(); restored.dispose(); }
  }
});

test('Time pattern rejects empty, out-of-range and malformed patterns including edited blocks', () => {
  for (const pattern of [{}, { hours: 24 }, { minutes: 60 }, { seconds: -1 }, { seconds: '/0' }, { seconds: '/60' }, { seconds: '01' }, { seconds: '/05' }, { seconds: 1.5 }, { seconds: true }, { seconds: null }, { seconds: '{{ 30 }}' }, { weeks: 1 }]) {
    assert.throws(() => validateAutomation({ ...fixture, triggers: [{ trigger: 'time_pattern', ...pattern }] }));
  }
  const ws = new Blockly.Workspace();
  try {
    modelWorkspace(ws, fixture);
    ws.getAllBlocks(false).find(block => block.type === 'ugso_time_pattern_trigger').setFieldValue('{"seconds":"/0"}', 'PATTERN');
    assert.throws(() => toYaml(workspaceModel(ws, fixture)));
  } finally { ws.dispose(); }
});
