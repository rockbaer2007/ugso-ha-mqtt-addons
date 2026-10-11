import test from 'node:test';
import assert from 'node:assert/strict';
import { Blockly, modelWorkspace, workspaceModel, definitions, toolbox } from '../src/blocks.js';
import { examples, toYaml, fromYaml } from '../src/model.js';
import { localizedDefinition } from '../src/locales.js';

test('Comment blocks preserve YAML content, never add actions and survive project/import', () => {
  const ws = new Blockly.Workspace(), copy = new Blockly.Workspace();
  try {
    modelWorkspace(ws, examples.light);
    const comment = ws.newBlock('ugso_comment'); comment.setFieldValue('First line\nvalue: # documented, not executed', 'TEXT');
    const root = ws.getBlocksByType('ugso_automation')[0], first = root.getInputTargetBlock('ACTIONS');
    first.previousConnection.disconnect(); root.getInput('ACTIONS').connection.connect(comment.previousConnection); comment.nextConnection.connect(first.previousConnection);
    const detached = ws.newBlock('ugso_comment'); detached.setFieldValue('Standalone note', 'TEXT');
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), copy);
    for (const format of ['single', 'list']) {
      const generated = workspaceModel(copy, examples.light), yaml = toYaml(generated, format, { omitId: true });
      assert.match(yaml, /^# First line\n# value: # documented, not executed\n# Standalone note\n/);
      assert.deepEqual(generated.actions, examples.light.actions);
      const imported = fromYaml(yaml); modelWorkspace(ws, imported);
      assert.equal(ws.getBlocksByType('ugso_comment').length, 1);
      const next = toYaml(workspaceModel(ws, imported), format);
      assert.match(next, /# value: # documented, not executed/);
      assert.deepEqual(fromYaml(next).actions, examples.light.actions);
    }
    const inline = fromYaml(toYaml(examples.light).replace('actions:', '# action note\nactions:'));
    modelWorkspace(ws, inline); assert.match(toYaml(workspaceModel(ws, inline)), /# action note/);
  } finally { ws.dispose(); copy.dispose(); }
});

test('MQTT block exports literal and template payloads and reimports without an instance', () => {
  const ws = new Blockly.Workspace();
  try {
    for (const payload of ['Hello\n"quoted" # text', '{{ states("sensor.temperature") }}']) {
      const original = structuredClone(examples.light);
      original.actions = [{ action: 'mqtt.publish', data: { topic: 'example/status', payload, retain: true, qos: 2 } }];
      modelWorkspace(ws, original);
      assert.equal(ws.getBlocksByType('ugso_mqtt_action').length, 1);
      assert.deepEqual(fromYaml(toYaml(workspaceModel(ws, original))), original);
    }
    const mqtt = ws.getBlocksByType('ugso_mqtt_action')[0];
    mqtt.getInputTargetBlock('TOPIC').setFieldValue('', 'TEXT');
    assert.throws(() => workspaceModel(ws, examples.light), /MQTT: Thema/);
    const types = toolbox.contents.flatMap(c => (c.contents || []).map(b => b.type));
    assert.equal(types.filter(t => t === 'ugso_comment').length, 1);
    assert.equal(types.filter(t => t === 'ugso_mqtt_action').length, 1);
    for (const type of ['ugso_comment', 'ugso_mqtt_action']) for (const locale of ['de', 'en', 'fr']) {
      const def = localizedDefinition(definitions.find(d => d.type === type), locale);
      assert.ok(def.message0); assert.ok(def.tooltip); assert.ok(!def.args0.some(a => a.name === 'INSTANCE'));
      if (locale !== 'de') assert.doesNotMatch(def.message0, /Kommentar|Nachricht|Thema/);
    }
  } finally { ws.dispose(); }
});
