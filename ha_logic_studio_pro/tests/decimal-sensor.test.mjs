import assert from 'node:assert/strict';
import test from 'node:test';
import * as BlocklyModule from 'blockly/core';
import {generateBlocks} from '../web/vendor/pro-blocks.js';
import {testRun} from '../runtime/test-run.mjs';
import {registerSensorStateBlocks, decimalSensorValue, addSensorStateToolbox} from '../web/sensor-state-block.js';
import {createSensorStateWriter} from '../runtime/sensor-state.mjs';

for (const value of [0.5, 33.25, -0.125]) {
  test('shipped JS decimal block generates and simulates ' + value + ' without rounding', async () => {
    const workspace = {blocks: {languageVersion: 0, blocks: [{type: 'ha_js_sensor_state_decimal',
      fields: {ENTITY: 'sensor.demo_temperature', STATE: value}}]}};
    const saved = JSON.parse(JSON.stringify(workspace));
    const source = generateBlocks(saved, 'Decimal');
    assert.match(source, /ha\.setSensorState/);
    for (const language of ['javascript', 'typescript']) {
      const result = await testRun(source, language);
      assert.equal(result.ok, true, JSON.stringify(result));
      assert.ok(result.trace.some(row => row.type === 'sensor-state' && row.state === String(value) && row.simulated));
    }
    assert.deepEqual(saved, workspace);
  });

  test('shipped Blocks A decimal block exports numeric ' + value + ' without rounding', () => {
    const source = generateBlocks({blocks: {blocks: [{type: 'ugso_automation', inputs: {
      TRIGGERS: {block: {type: 'ugso_start_trigger'}},
      ACTIONS: {block: {type: 'ugso_sensor_state_decimal', fields: {ENTITY: 'sensor.test', STATE: value}}},
    }}]}}, 'Decimal YAML');
    const model = JSON.parse(source.slice(source.indexOf('const automation = ') + 19, source.indexOf(';\nha.previewAutomation')));
    assert.deepEqual(model.actions, [{event: 'logic_studio_set_sensor_state', event_data: {entity_id: 'sensor.test', state: value}}]);
  });
}

test('decimal fields retain fractions through Blockly save/load in DE EN FR', () => {
  const Blockly = Reflect.get(BlocklyModule, 'default') ?? BlocklyModule;
  for (const [locale, label] of [['de', 'Dezimalzahl'], ['en', 'Decimal number'], ['fr', 'Nombre décimal']]) {
    const generators = {forBlock: {}}, jsTypes = [], catalog = new Set(), known = new Set();
    registerSensorStateBlocks(Blockly, generators, () => locale,
      text => ({type: 'field_input', name: 'ENTITY', text}), jsTypes, catalog, known);
    for (const type of ['ha_js_sensor_state_decimal', 'ugso_sensor_state_decimal']) {
      const workspace = new Blockly.Workspace();
      const restored = new Blockly.Workspace();
      try {
        const block = workspace.newBlock(type);
        assert.equal(block.getFieldValue('STATE'), 0.5);
        assert.ok(block.toString().includes(label));
        assert.deepEqual(block.getField('ENTITY').choiceSpec_.domains, ['sensor']);
        block.setFieldValue(33.25, 'STATE');
        const saved = Blockly.serialization.workspaces.save(workspace);
        Blockly.serialization.workspaces.load(saved, restored);
        assert.equal(restored.getAllBlocks(false)[0].getFieldValue('STATE'), 33.25);
      } finally { workspace.dispose(); restored.dispose(); }
    }
    assert.ok(jsTypes.includes('ha_js_sensor_state_decimal'));
    assert.ok(catalog.has('ugso_sensor_state_decimal') && known.has('ugso_sensor_state_decimal'));
  }
});

test('decimal state validation rejects invalid values instead of emitting invalid code', () => {
  for (const value of [NaN, Infinity, -Infinity, '33.25', null]) {
    assert.throws(() => decimalSensorValue({getFieldValue: () => value}), /Dezimalzahl/);
  }
});

test('both toolboxes retain the general block and add the decimal block beside it', () => {
  for (const target of ['js', 'yaml']) {
    const system = {kind: 'category', contents: [{kind: 'block', type: target === 'js' ? 'ha_js_script_name' : 'ugso_automation'}]};
    addSensorStateToolbox({contents: [system]}, target);
    assert.equal(system.contents.length, 3);
    assert.equal(system.contents[1].type, target === 'js' ? 'ha_js_sensor_state' : 'ugso_sensor_state');
    assert.equal(system.contents[2].type, target === 'js' ? 'ha_js_sensor_state_decimal' : 'ugso_sensor_state_decimal');
    assert.equal(system.contents[2].fields.STATE, 0.5);
  }
});

test('HA writer sends exact decimal strings and retains attributes', async () => {
  const bodies = [];
  const write = createSensorStateWriter({token: 'mock', writable: ['sensor.decimal']}, async (_url, options) => {
    if (options.method === 'POST') bodies.push(JSON.parse(options.body));
    return {ok: true, json: async () => ({entity_id: 'sensor.decimal', attributes: {unit_of_measurement: 'W', device_class: 'power'}})};
  });
  for (const value of [0.5, 33.25]) await write('sensor.decimal', value);
  assert.deepEqual(bodies.map(body => body.state), ['0.5', '33.25']);
  assert.ok(bodies.every(body => body.attributes.unit_of_measurement === 'W' && body.attributes.device_class === 'power'));
});
