import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { Blockly, modelWorkspace, workspaceModel, toolbox } from '../src/blocks.js';
import { flowDefinitions } from '../src/flow.js';
import { examples, fromYaml, toYaml } from '../src/model.js';

function fixture(type) {
  const ws = new Blockly.Workspace();
  const def = flowDefinitions.find(d => d.type === type);
  modelWorkspace(ws, { ...examples.light, actions: def.output ? [{ variables: { result: 0 } }] : [] });
  const info = toolbox.contents.flatMap(c => c.contents || []).find(b => b.type === type);
  const block = Blockly.serialization.blocks.append(info, ws);
  if (def.output) ws.getBlocksByType('ugso_variable_set')[0].getInput('VALUE').connection.connect(block.outputConnection);
  else ws.getBlocksByType('ugso_automation')[0].getInput('ACTIONS').connection.connect(block.previousConnection);
  for (const input of block.inputList.filter(i => i.type === Blockly.inputs.inputTypes.STATEMENT)) {
    const stop = ws.newBlock('ugso_stop'); input.connection.connect(stop.previousConnection);
  }
  return { ws, block, model: () => workspaceModel(ws, examples.light) };
}

test('All 18 new flow/value blocks preserve YAML meaning and project shapes', () => {
  for (const { type } of flowDefinitions) {
    const { ws, block, model } = fixture(type), copy = new Blockly.Workspace();
    try {
      if (['ugso_object_set', 'ugso_object_remove'].includes(type)) {
        // HA runtime variable initialization is a user responsibility; expressions remain intact.
        assert.match(Object.values(model().actions[0].variables)[0], /is mapping/);
      }
      if (type === 'ugso_repeat_while') block.setFieldValue('until', 'MODE');
      const expected = model(); toYaml(expected);
      Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), copy);
      assert.deepEqual(workspaceModel(copy, examples.light), expected, type);
      modelWorkspace(copy, fromYaml(toYaml(expected)));
      assert.deepEqual(workspaceModel(copy, examples.light), expected, type);
    } finally { ws.dispose(); copy.dispose(); }
  }
});

test('Timeout and repeat validation rejects missing operands, negative durations, empty sequences and conflicting modes', () => {
  for (const [type, input, amount] of [['ugso_pause', 'DURATION', -1], ['ugso_pause', 'DURATION', Infinity], ['ugso_repeat', 'COUNT', 1.5], ['ugso_repeat', 'COUNT', 0]]) {
    const f = fixture(type);
    try { f.block.getInputTargetBlock(input).setFieldValue(amount, 'NUM'); assert.throws(() => toYaml(f.model())); } finally { f.ws.dispose(); }
  }
  const f = fixture('ugso_wait');
  try { f.block.getInputTargetBlock('CONDITION').setDisabledReason(true, 'MANUALLY_DISABLED'); assert.throws(() => f.model(), /fehlt/); } finally { f.ws.dispose(); }
  for (const action of [{ repeat: { count: 1, while: [], sequence: [{ stop: 'Stop', error: false }] } }, { repeat: { count: 2, sequence: [] } }, { delay: { milliseconds: 1, seconds: 1 } }, { wait_template: '{{ true }}', timeout: { seconds: -1 }, continue_on_timeout: false }]) assert.throws(() => toYaml({ ...examples.light, actions: [action] }));
});

test('Runtime duration/count templates import unchanged and fractional milliseconds are retained', () => {
  const model = { ...examples.light, actions: [
    { delay: { milliseconds: .5 } },
    { delay: { minutes: '{{ float(states("input_number.delay")) }}' } },
    { wait_template: '{{ is_state("input_boolean.ready", "on") }}', timeout: { seconds: '{{ timeout }}' }, continue_on_timeout: true },
    { repeat: { count: '{{ rounds }}', sequence: [{ stop: 'Done', error: false }] } }
  ] };
  const ws = new Blockly.Workspace();
  try { modelWorkspace(ws, fromYaml(toYaml(model))); assert.deepEqual(workspaceModel(ws, examples.light), model); } finally { ws.dispose(); }
});

test('Object/list/case mutations preserve fields and attached values while removing/reordering rows', () => {
  const f = fixture('ugso_object_new');
  try {
    f.block.loadExtraState({ rows: 2 }); f.block.setFieldValue('second', 'KEY1');
    const value = f.ws.newBlock('ugso_number'); value.setFieldValue(42, 'NUM'); f.block.getInput('V1').connection.connect(value.outputConnection);
    const mutator = new Blockly.Workspace();
    try {
      // Headless mutator dialog fixtures stand in for rendered initSvg only.
      for (const type of ['ugso_rows_container', 'ugso_rows_item']) {
        const init = Blockly.Blocks[type].init; Blockly.Blocks[type].init = function () { init.call(this); this.initSvg = () => {}; };
      }
      const root = f.block.decompose(mutator); f.block.saveConnections(root);
      const first = root.getInputTargetBlock('STACK'), second = first.getNextBlock(); first.nextConnection.disconnect(); first.previousConnection.disconnect(); root.getInput('STACK').connection.connect(second.previousConnection);
      f.block.compose(root);
      assert.equal(f.block.rowCount_, 1); assert.equal(f.block.getFieldValue('KEY0'), 'second'); assert.equal(f.block.getInputTargetBlock('V0'), value);
      // Remove orphaned old value detached by mutator, as the user would delete it.
      for (const orphan of f.ws.getTopBlocks(false)) if (orphan.type !== 'ugso_automation') orphan.dispose();
      assert.match(f.model().actions[0].variables.result, /"second": 42/);
      assert.throws(() => f.block.loadExtraState({ rows: 101 }), /Ungültige/);
    } finally { mutator.dispose(); }
  } finally { f.ws.dispose(); }
});

test('Object, list, range and fallback expressions execute in the immutable HA-style Jinja sandbox', { skip: !process.env.BLOCKS_JINJA_TEST }, () => {
  const cases = [];
  const add = (type, expected, configure = () => {}, context = {}) => {
    const f = fixture(type);
    try { configure(f.block, f.ws); const action = f.model().actions[0]; cases.push({ template: Object.values(action.variables)[0], expected, context }); } finally { f.ws.dispose(); }
  };
  add('ugso_object_new', "{'attribute1': 'value'}");
  add('ugso_object_get', 'value'); add('ugso_object_get', 'None', b => b.setFieldValue('missing', 'KEY'));
  add('ugso_object_has', 'True'); add('ugso_object_has', 'False', b => b.setFieldValue('missing', 'KEY'));
  add('ugso_object_keys', "['attribute1']");
  add('ugso_object_set', "{'attribute1': 'value', 'keys': 3}", () => {}, { daten: { attribute1: 'old', keys: 3 } });
  add('ugso_object_remove', "{'keys': 3}", () => {}, { daten: { attribute1: 'old', keys: 3 } });
  add('ugso_object_remove', "{'keys': 3}", () => {}, { daten: { keys: 3 } });
  add('ugso_object_set', null, () => {}, { daten: 'not a mapping' });
  add('ugso_list_new', "['Eintrag']"); add('ugso_list_length', '0'); add('ugso_list_empty', 'True');
  add('ugso_logic_range', 'True'); add('ugso_logic_range', 'False', b => b.getInputTargetBlock('VALUE').setFieldValue(101, 'NUM'));
  add('ugso_logic_default', 'Ersatz');
  for (const [mode, value, expected] of [['null', '0', '0'], ['empty', '0', 'Ersatz'], ['null', 'false', 'False'], ['empty', '[]', 'Ersatz'], ['null', 'missing', 'Ersatz']]) add('ugso_logic_default', expected, (b, ws) => {
    b.setFieldValue(mode, 'MODE'); const t = ws.newBlock('ugso_template'); t.setFieldValue(`{{ ${value} }}`, 'TEXT'); b.getInput('VALUE').connection.connect(t.outputConnection);
  });
  const result = spawnSync('python', ['-c', `
import json,sys
from jinja2 import StrictUndefined
from jinja2.sandbox import ImmutableSandboxedEnvironment
e=ImmutableSandboxedEnvironment(undefined=StrictUndefined)
for c in json.load(sys.stdin):
 try: actual=e.from_string(c['template']).render(**c['context'])
 except (ValueError,TypeError):
  assert c['expected'] is None,c
 else: assert actual==c['expected'],(c,actual)
`], { input: JSON.stringify(cases), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
