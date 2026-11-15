import assert from 'node:assert/strict';
import test from 'node:test';
import {testRun} from '../runtime/test-run.mjs';

const library = {id: '7', name: 'Math', language: 'typescript',
  source: 'function double(n: number) { return n * 2; }\nexport function twice(n: number) { return double(n); }'};

test('JavaScript and TypeScript can call a selected global export', async () => {
  for (const language of ['javascript', 'typescript']) {
    const {trace} = await testRun('ha.log(String(shared.script_7.twice(21)));', language, undefined, 0, [library]);
    assert.deepEqual(trace, [{type: 'log', message: '42'}]);
  }
});

test('TypeScript checks exported signatures and retains the caller line', async () => {
  await assert.rejects(testRun('// caller\nshared.script_7.twice("21");', 'typescript', undefined, 0, [library]),
    error => error.line === 2 && /not assignable/.test(error.message));
});

test('JavaScript and TypeScript reject mutable top-level state in a global script', async () => {
  const counter = {...library, source: 'let count = 0; export function increment() { return ++count; }'};
  for (const language of ['javascript', 'typescript']) {
    await assert.rejects(testRun('shared.script_7.increment();', language, undefined, 0, [counter]),
      /Only named functions and type declarations are supported in global scripts/);
  }
});
