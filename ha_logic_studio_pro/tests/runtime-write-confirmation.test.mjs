import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {JSDOM} from 'jsdom';
const dom = new JSDOM('<body></body>');
for (const key of ['window', 'document', 'HTMLElement', 'Element', 'DOMParser', 'XMLSerializer']) globalThis[key] = key === 'window' ? dom.window : dom.window[key];
after(() => dom.window.close());
const {generateBlocks} = await import('../web/vendor/pro-blocks.js');
const {testRun} = await import('../runtime/test-run.mjs');
const example = JSON.parse(await readFile(new URL('./fixtures/wecker-example.json', import.meta.url), 'utf8'));
const exported = generateBlocks(example.workspace, 'Original user example');

function runLive(source, failure = false, expectedLogs = 6) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', new URL('./fixtures/sensor-runtime-preload.mjs', import.meta.url).href,
      new URL('../runtime/live-run.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')],
    {env: {...process.env, UGSO_TEST_WRITE_FAILURE: failure ? '1' : '0'}, stdio: ['pipe', 'pipe', 'pipe']});
    child.stdin.end(JSON.stringify({source, language: 'javascript', homeAssistant: {token: 'offline-test', readAll: true, writeAll: true}}));
    const messages = []; let buffer = '', errors = '';
    const timeout = setTimeout(() => { child.kill(); reject(Error('Runtime test timed out: ' + errors + JSON.stringify(messages))); }, 7000);
    child.stderr.on('data', chunk => { errors += chunk; });
    child.stdout.on('data', chunk => {
      buffer += chunk;
      let end;
      while ((end = buffer.indexOf('\n')) >= 0) {
        const row = buffer.slice(0, end); buffer = buffer.slice(end + 1);
        if (!row) continue;
        try { messages.push(JSON.parse(row)); } catch { errors += row; }
      }
      if (messages.filter(row => row.type === 'log').length >= expectedLogs || messages.some(row => row.type === 'error')) child.kill();
    });
    child.on('error', error => { clearTimeout(timeout); reject(error); });
    child.on('close', () => { clearTimeout(timeout); resolve({messages, errors}); });
  });
}
test('the actual exported on/off/1.5 example reads confirmed values in the real QuickJS runtime', async () => {
  assert.match(exported, /await ha\.setSensorState/);
  const result = await runLive(exported);
  assert.equal(result.errors, '');
  assert.deepEqual(result.messages.filter(row => row.type === 'error'), []);
  assert.deepEqual(result.messages.filter(row => row.type === 'log').map(row => row.text.trim()),
    ['on     switch', '1.5     fake', 'off     switch', '0     fake', 'on     switch', '1.5     fake']);
});
test('write failures stop following debug steps and are reported as runtime errors', async () => {
  const result = await runLive(exported, true);
  assert.ok(result.messages.some(row => row.type === 'error' && /403/.test(row.text)), JSON.stringify(result));
  assert.deepEqual(result.messages.filter(row => row.type === 'log'), []);
});
test('both sensor block variants wait for a confirmed write', () => {
  for (const type of ['ha_js_sensor_state', 'ha_js_sensor_state_decimal']) {
    const block = {type, fields: {ENTITY: 'sensor.fake_wecker', ...(type === 'ha_js_sensor_state_decimal' ? {STATE: 1.5} : {})},
      ...(type === 'ha_js_sensor_state' ? {inputs: {VALUE: {block: {type: 'math_number', fields: {NUM: 1.5}}}}} : {})};
    assert.match(generateBlocks({blocks: {blocks: [block]}}, 'Sensor'), /await ha\.setSensorState\("sensor.fake_wecker", 1.5\)/);
  }
});

test('HA output requests complete before following output and debug steps', async () => {
  const result = await runLive('await ha.setState("switch.wecker_relay", true); ha.log(ha.readState("switch.wecker_relay"));\n' +
    'await ha.setState("switch.wecker_relay", false); ha.log(ha.readState("switch.wecker_relay"));', false, 2);
  assert.deepEqual(result.messages.filter(row => row.type === 'error'), []);
  assert.deepEqual(result.messages.filter(row => row.type === 'log').map(row => row.text), ['on', 'off']);
});

test('sensor writes inside Blockly procedures make both procedure and caller await completion', async () => {
  const sensor = {type: 'ha_js_sensor_state_decimal', fields: {ENTITY: 'sensor.demo_temperature', STATE: 1.5}};
  const definition = {type: 'procedures_defnoreturn', fields: {NAME: 'update'}, inputs: {STACK: {block: sensor}}};
  const call = {type: 'procedures_callnoreturn', extraState: {name: 'update', params: []}};
  const code = generateBlocks({blocks: {blocks: [definition, call]}}, 'Procedure');
  assert.match(code, /async function update/); assert.match(code, /await update\(\)/);
  const result = await testRun(code + '\nha.log(ha.readState("sensor.demo_temperature"));');
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.ok(result.trace.some(row => row.type === 'sensor-state' && row.state === '1.5'));
});
