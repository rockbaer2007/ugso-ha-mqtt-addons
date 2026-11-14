import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

for (const runner of ['test-run', 'live-run']) {
  function run(language, source) {
    const path = fileURLToPath(new URL('../runtime/' + runner + '.mjs', import.meta.url));
    const result = spawnSync(process.execPath, [path, '--stdin'], {
      input: JSON.stringify({language, source}), encoding: 'utf8', timeout: 5000,
    });
    assert.ifError(result.error);
    return result.stdout.trim().split('\n').map(line => JSON.parse(line)).at(-1);
  }

  test(runner + ' reports original JS and TS lines after a timer callback throws', () => {
    const js = '// JavaScript\nha.timeout("probe", 50, async () => {\n  throw new Error("callback");\n});';
    const ts = 'interface Removed { value: number }\n\n' + js;
    for (const [language, source, line] of [['javascript', js, 3], ['typescript', ts, 5]]) {
      const result = run(language, source);
      assert.equal(result.error ?? result.text, 'callback');
      assert.equal(result.line, line);
    }
  });

  test(runner + ' reports the source line of a syntax error', () => {
    for (const language of ['javascript', 'typescript']) {
      assert.equal(run(language, '// header\nconst = 1;').line, 2);
    }
  });

  test(runner + ' checks types and the HA API before running TypeScript', () => {
    const source = 'interface Removed { value: number }\nconst value: number = "wrong";\nawait ha.pause("wrong");';
    const result = run('typescript', source);
    if (runner === 'test-run') assert.deepEqual(result.diagnostics.map(item => item.line), [2, 3]);
    else assert.equal(result.line, 3);
    assert.match(result.error ?? result.text, /not assignable/);
  });
}
