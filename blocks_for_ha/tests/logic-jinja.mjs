// Optional integration check: requires Python with Jinja2, separate from npm test.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { Blockly, modelWorkspace, workspaceModel } from '../src/blocks.js';
import { examples } from '../src/model.js';
const fixtures = [];
function make(ws, type, fields = {}, inputs = {}) {
  const b = ws.newBlock(type);
  for (const [key, val] of Object.entries(fields)) b.setFieldValue(String(val), key);
  for (const [name, child] of Object.entries(inputs)) b.getInput(name).connection.connect(child.outputConnection);
  return b;
}
function fixture(build, expected) {
  const ws = new Blockly.Workspace();
  try {
    modelWorkspace(ws, examples.light);
    const root = ws.getBlocksByType('ugso_automation')[0]; root.getInputTargetBlock('ACTIONS').dispose();
    const value = build(ws); const set = make(ws, 'ugso_variable_set', {}, { VALUE: value }); root.getInput('ACTIONS').connection.connect(set.previousConnection);
    fixtures.push({ template: workspaceModel(ws, examples.light).actions[0].variables.wert, expected });
  } finally { ws.dispose(); }
}
for (const [op, expected] of [['==', false], ['!=', true], ['<', false], ['<=', false], ['>', true], ['>=', true]]) {
  fixture(ws => make(ws, 'ugso_compare', { OP: op }, { LEFT: make(ws, 'ugso_number', { NUM: 20 }), RIGHT: make(ws, 'ugso_number', { NUM: 10 }) }), expected);
}
fixture(ws => make(ws, 'ugso_ternary', {}, { TEST: make(ws, 'ugso_boolean', { BOOL: 'false' }), TRUE: make(ws, 'ugso_number', { NUM: 5 }), FALSE: make(ws, 'ugso_null') }), null);
fixture(ws => make(ws, 'ugso_ternary', {}, { TEST: make(ws, 'ugso_boolean', { BOOL: 'true' }), TRUE: make(ws, 'ugso_text', { TEXT: 'Wert "A"\nneu' }), FALSE: make(ws, 'ugso_text', { TEXT: 'B' }) }), 'Wert "A"\nneu');
fixture(ws => {
  const group = make(ws, 'ugso_logic_condition', { LOGIC: 'not' }, { COND0: make(ws, 'ugso_boolean', { BOOL: 'true' }), COND1: make(ws, 'ugso_boolean', { BOOL: 'false' }) });
  return group;
}, false);
fixture(ws => {
  const condition = make(ws, 'ugso_numeric_condition', { ENTITY: 'sensor.unknown', OP: 'below' }, { LIMIT: make(ws, 'ugso_number', { NUM: 10 }) });
  return make(ws, 'ugso_ternary', {}, { TEST: condition, TRUE: make(ws, 'ugso_text', { TEXT: 'Ja' }), FALSE: make(ws, 'ugso_text', { TEXT: 'Nein' }) });
}, 'Nein');
const result = spawnSync('python', ['-c', `import json, sys
from jinja2.nativetypes import NativeEnvironment
env = NativeEnvironment()
env.globals.update(states=lambda entity: 'unknown', is_number=lambda value: False)
fixtures = json.load(sys.stdin)
print(json.dumps([env.from_string(item['template']).render() for item in fixtures]))
`], { input: JSON.stringify(fixtures), encoding: 'utf8' });
assert.equal(result.status, 0, result.stderr);
assert.deepEqual(JSON.parse(result.stdout), fixtures.map(item => item.expected));
console.log(`Evaluated ${fixtures.length} generated expressions in Jinja2: comparisons, native types, ternary, NOT and unknown-sensor guard.`);
