import assert from 'node:assert/strict';
import test from 'node:test';
import {createSensorStateWriter, sensorStateValue} from '../runtime/sensor-state.mjs';
import {testRun} from '../runtime/test-run.mjs';
import {generateBlocks} from '../web/vendor/pro-blocks.js';
import {sensorStateYaml, addSensorStateToolbox} from '../web/sensor-state-block.js';

test('writer preserves HA attributes and uses the fixed authenticated Supervisor endpoint', async () => {
  const calls = [];
  const attributes = {device_class: 'power', unit_of_measurement: 'W', state_class: 'measurement', friendly_name: 'Test'};
  const write = createSensorStateWriter({token: 'unit-test-only', writable: ['sensor.test']}, async (url, options) => {
    calls.push({url, options});
    return {ok: true, json: async () => ({entity_id: 'sensor.test', state: '0', attributes})};
  });
  await write('sensor.test', 42.5);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'http://supervisor/core/api/states/sensor.test');
  assert.equal(calls[1].options.headers.Authorization, 'Bearer unit-test-only');
  assert.equal(calls[1].options.redirect, 'error');
  assert.deepEqual(JSON.parse(calls[1].options.body), {state: '42.5', attributes});
});

test('permission, domain, missing sensor and invalid values fail before writing', async () => {
  let requests = 0;
  const request = async () => { requests++; return {ok: false, status: 404}; };
  const write = createSensorStateWriter({writable: ['sensor.test'], token: 'mock'}, request);
  for (const [entity, value] of [['sensor.other', 1], ['switch.test', 1], ['sensor.test', {}], ['sensor.test', NaN],
    ['sensor.test', Infinity], ['sensor.test', 'x'.repeat(256)], ['sensor.test/other', 1]]) {
    await assert.rejects(write(entity, value));
  }
  assert.equal(requests, 0);
  await assert.rejects(write('sensor.test', 1), /404/);
  assert.equal(requests, 1);
  assert.equal(sensorStateValue('sensor.test', 'unknown'), 'unknown');
});

test('writeAll works; failed writes release concurrency slots and never silently succeed', async () => {
  let fail = true;
  const write = createSensorStateWriter({writeAll: true, token: 'mock'}, async (_url, options) => {
    if (options.method) return {ok: !fail, status: 403};
    return {ok: true, json: async () => ({entity_id: 'sensor.test', attributes: {}})};
  });
  await assert.rejects(write('sensor.test', 5), /403/);
  fail = false;
  await write('sensor.test', 6);
});

test('overlapping requests for the same sensor are rejected without duplicate POSTs', async () => {
  let release;
  const ready = new Promise(resolve => { release = resolve; });
  const write = createSensorStateWriter({writeAll: true}, async (_url, options) => {
    if (!options.method) await ready;
    return {ok: true, json: async () => ({entity_id: 'sensor.test', attributes: {}})};
  });
  const first = write('sensor.test', 1);
  await assert.rejects(write('sensor.test', 2), /läuft bereits/);
  release();
  await first;
});

test('the shipped Blocks JS bundle generates executable code; preview never sends requests', async () => {
  const source = generateBlocks({blocks: {blocks: [{type: 'ha_js_sensor_state', fields: {ENTITY: 'sensor.demo_temperature'},
    inputs: {VALUE: {block: {type: 'math_arithmetic', fields: {OP: 'ADD'}, inputs: {
      A: {block: {type: 'math_number', fields: {NUM: 40}}}, B: {block: {type: 'math_number', fields: {NUM: 2}}}}}}}}]}}, 'Sensor test');
  const result = await testRun(source + '\nha.log(ha.readState("sensor.demo_temperature"));');
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.ok(result.trace.some(row => row.type === 'sensor-state' && row.state === '42' && row.simulated));
  assert.ok(result.trace.some(row => row.type === 'log' && row.message === '42'));
});

test('Blocks A exports a valid native HA event, including a computed template value', () => {
  const action = {type: 'ugso_sensor_state', fields: {ENTITY: 'sensor.test'}, inputs: {
    VALUE: {block: {type: 'ugso_number', fields: {NUM: 42}}}}};
  const generated = generateBlocks({blocks: {blocks: [{type: 'ugso_automation', inputs: {
    TRIGGERS: {block: {type: 'ugso_start_trigger'}}, ACTIONS: {block: action}}}]}}, 'Sensor YAML');
  const model = JSON.parse(generated.slice(generated.indexOf('const automation = ') + 19, generated.indexOf(';\nha.previewAutomation')));
  assert.deepEqual(model.actions, [{event: 'logic_studio_set_sensor_state', event_data: {entity_id: 'sensor.test', state: 42}}]);
  const block = {getFieldValue: () => 'sensor.test', getInputTargetBlock: () => ({})};
  assert.equal(sensorStateYaml(block, () => '{{ states("sensor.source") | float(0) * 2 }}').event_data.state,
    '{{ states("sensor.source") | float(0) * 2 }}');
  assert.throws(() => sensorStateYaml({...block, getInputTargetBlock: () => null}, () => 0), /fehlt/);
});

test('both toolboxes offer the new block with an editable numeric shadow', () => {
  for (const target of ['js', 'yaml']) {
    const toolbox = {contents: [{kind: 'category', contents: []}]};
    addSensorStateToolbox(toolbox, target);
    const block = toolbox.contents[0].contents[0];
    assert.equal(block.type, target === 'js' ? 'ha_js_sensor_state' : 'ugso_sensor_state');
    assert.equal(block.inputs.VALUE.shadow.fields.NUM, 0);
  }
});
