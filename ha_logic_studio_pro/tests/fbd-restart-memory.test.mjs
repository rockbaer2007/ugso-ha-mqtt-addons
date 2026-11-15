import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {retainedMemory} from '../runtime/fbd-memory.mjs';
import {statefulStep} from '../web/stateful.js';

const plan = {
  blocks: [
    {id: 'bc', type: 'CTU', params: {PV: 5}},
    {id: 'br', type: 'RS', params: {}},
    {id: 'be', type: 'R_TRIG', params: {}},
    {id: 'bt', type: 'TON', params: {}},
  ],
  links: [{from: ['be', 'Q'], to: ['bc', 'CU']}],
};

test('The same plan retains the counter and latch only; logic edits start fresh', t => {
  const dir = mkdtempSync(join(tmpdir(), 'logic-studio-memory-'));
  t.after(() => rmSync(dir, {recursive: true, force: true}));
  const file = join(dir, 'memory.json');
  retainedMemory(file, plan).save({
    bc: {cv: 2, u: false},
    br: {q: true},
    be: {p: false},
    bt: {t: 1000, q: true},
  });
  assert.deepEqual(readdirSync(dir), ['memory.json']);
  const raw = readFileSync(file, 'utf8');
  const layout = {...plan, blocks: plan.blocks.map(block => ({...block, x: 20, name: 'Renamed'}))};
  assert.deepEqual(retainedMemory(file, layout).load(), {
    bc: {version: 1, kind: 'CTU', cv: 2},
    br: {version: 1, kind: 'RS', q: true},
  });
  const changed = structuredClone(plan);
  changed.blocks[0].params.PV = 6;
  assert.deepEqual(retainedMemory(file, changed).load(), {});
  assert.deepEqual(retainedMemory(file, {...plan, links: []}).load(), {});
  assert.equal(readFileSync(file, 'utf8'), raw);
  writeFileSync(file, 'null');
  assert.deepEqual(retainedMemory(file, plan).load(), {});
});

test('A restart seeds input levels without emitting edges or advancing a retained count', () => {
  const retained = {version: 1, kind: 'CTU', cv: 2};
  const counter = statefulStep('CTU', {CU: true, PV: 5}, retained, 1000, true);
  assert.equal(counter.outputs.CV, 2);
  assert.equal(statefulStep('CTU', {CU: true, PV: 5}, counter.state, 1010).outputs.CV, 2);
  const low = statefulStep('CTU', {CU: false, PV: 5}, counter.state, 1020);
  assert.equal(statefulStep('CTU', {CU: true, PV: 5}, low.state, 1030).outputs.CV, 3);
  for (const [kind, level] of [['R_TRIG', true], ['F_TRIG', false]]) {
    const edge = statefulStep(kind, {CLK: level}, {version: 1, kind, p: !level}, 1000, true);
    assert.equal(edge.outputs.Q, false);
    const reset = statefulStep(kind, {CLK: !level}, edge.state, 1010);
    assert.equal(statefulStep(kind, {CLK: level}, reset.state, 1020).outputs.Q, true);
  }
  assert.deepEqual(statefulStep('TON', {IN: true, PT: 100}, {}, 1000, true).outputs, {Q: false, ET: 0});
});

test('Runtime startup keeps valid retained values and resets them after rewiring', t => {
  const dir = mkdtempSync(join(tmpdir(), 'logic-studio-run-'));
  t.after(() => rmSync(dir, {recursive: true, force: true}));
  const file = join(dir, 'memory.json');
  const input = 'input_boolean.fbd_probe_in';
  const output = 'input_boolean.fbd_probe_out';
  const source = {
    format: 'ugso.logic/1',
    blocks: [...plan.blocks.slice(0, 3),
      {id: 'bi', type: 'STATE_IN', params: {oid: input, type: 'BOOL'}},
      {id: 'bo', type: 'STATE_OUT', params: {oid: output, mode: 'BOOL'}}],
    links: [...plan.links, {from: ['bi', 'Q'], to: ['be', 'CLK']}, {from: ['be', 'Q'], to: ['bo', 'IN']}],
  };
  retainedMemory(file, source).save({bc: {cv: 2}, br: {q: true}});
  const shim = `
    globalThis.WebSocket = class extends EventTarget {
      constructor() { super(); queueMicrotask(() => this.reply({type: 'auth_required'})); }
      reply(data) { this.dispatchEvent(new MessageEvent('message', {data: JSON.stringify(data)})); }
      send(data) {
        const cmd = JSON.parse(data);
        const result = cmd.type === 'get_config' ? {time_zone: 'UTC'} :
          cmd.type === 'get_states' ? [{entity_id: ${JSON.stringify(input)}, state: 'on'}] : null;
        if (cmd.type === 'call_service') console.log(JSON.stringify({type: 'test-action', service: cmd.service}));
        queueMicrotask(() => this.reply(cmd.type === 'auth' ? {type: 'auth_ok'} :
          {type: 'result', id: cmd.id, success: true, result}));
      }
    };
  `;
  function start(runtimePlan) {
    const result = spawnSync(process.execPath, ['--import', 'data:text/javascript,' + encodeURIComponent(shim),
      fileURLToPath(new URL('../runtime/fbd-run.mjs', import.meta.url))], {
      encoding: 'utf8', timeout: 5000,
      input: JSON.stringify({source: JSON.stringify({plan: runtimePlan, mode: 'auto', interval: 200}),
        homeAssistant: {token: 'stub', readable: [input], writable: [output], events: []}, memoryFile: file}),
    });
    assert.equal(result.status, 0, result.stderr || String(result.error || result.stdout));
    const messages = result.stdout.trim().split('\n').map(JSON.parse);
    return {messages, values: retainedMemory(file, runtimePlan).load()};
  }
  const unchanged = start(source);
  assert.equal(unchanged.values.bc.cv, 2);
  assert.equal(unchanged.values.br.q, true);
  assert.deepEqual(unchanged.messages.filter(message => message.type === 'test-action').map(message => message.service), ['turn_off']);
  const rewired = {...source, links: source.links.filter(link => link.to[0] !== 'bc')};
  const changed = start(rewired);
  assert.equal(changed.values.bc.cv, 0);
  assert.equal(changed.values.br.q, false);
});
