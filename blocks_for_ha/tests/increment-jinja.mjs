// Optional integration check requiring Python with Jinja2.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { Blockly, modelWorkspace, workspaceModel } from '../src/blocks.js';
import { examples } from '../src/model.js';
const ws = new Blockly.Workspace(), fixtures = [];
try {
  modelWorkspace(ws, examples.light);
  const change = ws.newBlock('ugso_variable_change');
  ws.getBlocksByType('ugso_switch_action')[0].nextConnection.connect(change.previousConnection);
  for (const step of [1, -2, 0, 0.5]) {
    change.getInputTargetBlock('STEP').setFieldValue(step, 'NUM');
    fixtures.push({ template: workspaceModel(ws, examples.light).actions[1].variables.wert, context: { wert: 10 }, expected: 10 + step });
  }
  const template = fixtures[0].template;
  for (const context of [{}, { wert: '10' }, { wert: true }, { wert: null }]) fixtures.push({ template, context, fail: true });
} finally { ws.dispose(); }
const result = spawnSync('python', ['-c', `import json, sys
from jinja2 import StrictUndefined
from jinja2.nativetypes import NativeEnvironment
env = NativeEnvironment(undefined=StrictUndefined)
results = []
for item in json.load(sys.stdin):
    try: results.append(env.from_string(item['template']).render(**item['context']))
    except (TypeError, ValueError) as error: results.append({'error': type(error).__name__})
print(json.dumps(results))
`], { input: JSON.stringify(fixtures), encoding: 'utf8' });
assert.equal(result.status, 0, result.stderr);
JSON.parse(result.stdout).forEach((value, i) => fixtures[i].fail ? assert.equal(value.error, 'TypeError') : assert.equal(value, fixtures[i].expected));
console.log('Jinja increment/decrement/zero/fraction verified; missing, text, Boolean and null values fail instead of coercing.');
