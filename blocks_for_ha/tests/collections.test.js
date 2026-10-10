import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { Blockly, modelWorkspace, workspaceModel, toolbox } from '../src/blocks.js';
import { collectionDefinitions } from '../src/collections.js';
import { examples, fromYaml, toYaml } from '../src/model.js';

function fixture(type) {
  const ws = new Blockly.Workspace(), def = collectionDefinitions.find(d => d.type === type);
  modelWorkspace(ws, { ...examples.light, actions: def.output ? [{ variables: { result: 0 } }] : [] });
  const block = Blockly.serialization.blocks.append(toolbox.contents.flatMap(c => c.contents || []).find(b => b.type === type), ws);
  if (def.output) ws.getBlocksByType('ugso_variable_set')[0].getInput('VALUE').connection.connect(block.outputConnection);
  else ws.getBlocksByType('ugso_automation')[0].getInput('ACTIONS').connection.connect(block.previousConnection);
  if (block.getInput('DO')) block.getInput('DO').connection.connect(ws.newBlock('ugso_stop').previousConnection);
  return { ws, block, model: () => workspaceModel(ws, examples.light) };
}
function replace(f, input, value) {
  f.block.getInputTargetBlock(input)?.dispose();
  const b = f.ws.newBlock('ugso_template'); b.setFieldValue(`{{ ${JSON.stringify(value)} }}`, 'TEXT'); f.block.getInput(input).connection.connect(b.outputConnection);
}

test('All 37 collection blocks retain YAML meaning and JSON shapes', () => {
  for (const { type } of collectionDefinitions) {
    const f = fixture(type), copy = new Blockly.Workspace();
    try {
      const expected = f.model();
      Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(f.ws), copy);
      assert.deepEqual(workspaceModel(copy, examples.light), expected, type);
      modelWorkspace(copy, fromYaml(toYaml(expected)));
      assert.deepEqual(workspaceModel(copy, examples.light), expected, type);
    } finally { f.ws.dispose(); copy.dispose(); }
  }
});

test('Zählschleifen emit inclusive native HA ranges and reject unsafe counts or zero steps', () => {
  const f = fixture('ugso_for_range');
  try {
    for (const [a, b, step, expected] of [[1, 10, 2, 'range(1, 11, 2)'], [10, 1, -3, 'range(10, 0, -3)'], [0, 0, 1, 'range(0, 1, 1)']]) {
      for (const [n, x] of [['FROM', a], ['TO', b], ['STEP', step]]) f.block.getInputTargetBlock(n).setFieldValue(x, 'NUM');
      assert.ok(f.model().actions[0].repeat.for_each.includes(expected));
      assert.equal(Object.values(f.model().actions[0].repeat.sequence[0].variables)[0], '{{ repeat.item }}');
    }
    for (const [n, x] of [['STEP', 0], ['STEP', .5], ['TO', 20000], ['TO', Infinity]]) {
      f.block.getInputTargetBlock('STEP').setFieldValue(1, 'NUM'); f.block.getInputTargetBlock('TO').setFieldValue(10, 'NUM');
      f.block.getInputTargetBlock(n).setFieldValue(x, 'NUM'); assert.throws(() => f.model(), /Zählschleife/);
    }
  } finally { f.ws.dispose(); }
});

test('Boolean results dock into conditions; runtime math does not dock into fixed numeric triggers', () => {
  const f = fixture('ugso_text_contains');
  try {
    f.block.outputConnection.disconnect(); f.ws.getBlocksByType('ugso_variable_set')[0].dispose();
    f.ws.getBlocksByType('ugso_automation')[0].getInput('CONDITIONS').connection.connect(f.block.outputConnection);
    assert.equal(f.model().conditions[0].condition, 'template');
    const math = f.ws.newBlock('ugso_math_arithmetic'), trigger = f.ws.newBlock('ugso_numeric_trigger');
    trigger.getInput('LIMIT').connection.connect(math.outputConnection);
    assert.equal(trigger.getInputTargetBlock('LIMIT'), null);
  } finally { f.ws.dispose(); }
});

test('Missing/disabled collection operands reject export and text join supports zero inputs', () => {
  const f = fixture('ugso_math_arithmetic');
  try { f.block.getInputTargetBlock('A').setDisabledReason(true, 'MANUALLY_DISABLED'); assert.throws(() => f.model(), /fehlt/); } finally { f.ws.dispose(); }
  const j = fixture('ugso_text_join');
  try { j.block.getInputTargetBlock('V0').dispose(); j.block.loadExtraState({ rows: 0 }); assert.match(j.model().actions[0].variables.result, /\[\]/); } finally { j.ws.dispose(); }
});

test('Dropdown variants and dynamic divisor input preserve project and YAML values', () => {
  for (const def of collectionDefinitions) for (const field of def.args0.filter(a => a.type === 'field_dropdown')) for (const [, choice] of field.options) {
    const f = fixture(def.type), copy = new Blockly.Workspace();
    try {
      f.block.setFieldValue(choice, field.name);
      if (def.type === 'ugso_math_property') assert.equal(Boolean(f.block.getInput('B')), choice === 'divisible');
      const expected = f.model();
      Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(f.ws), copy);
      assert.deepEqual(workspaceModel(copy, examples.light), expected, `${def.type}:${choice}`);
      assert.deepEqual(fromYaml(toYaml(expected)), expected);
    } finally { f.ws.dispose(); copy.dispose(); }
  }
});

test('Collection expressions execute with immutable Jinja and strict HA math helpers', { skip: !process.env.BLOCKS_JINJA_TEST }, () => {
  const cases = [];
  const add = (type, expected, configure = () => {}, context = {}) => {
    const f = fixture(type);
    try { configure(f); const action = f.model().actions[0]; cases.push({ template: Object.values(action.variables)[0], expected, context }); } finally { f.ws.dispose(); }
  };
  add('ugso_math_arithmetic', '11');
  for (const [op, expected] of [['-', '7'], ['*', '18'], ['/', '4.5'], ['**', '81']]) add('ugso_math_arithmetic', expected, f => f.block.setFieldValue(op, 'OP'));
  for (const [op, expected] of [['sqrt', '3.0'], ['abs', '9'], ['neg', '-9'], ['pow10', '1000000000']]) add('ugso_math_single', expected, f => f.block.setFieldValue(op, 'OP'));
  add('ugso_math_trig', '1.0', f => f.block.getInputTargetBlock('A').setFieldValue(90, 'NUM'));
  add('ugso_math_trig', '90.0', f => { f.block.setFieldValue('asin', 'OP'); f.block.getInputTargetBlock('A').setFieldValue(1, 'NUM'); });
  add('ugso_math_atan2', '45.0');
  add('ugso_math_constant', '1.4142135623730951', f => f.block.setFieldValue('sqrt2', 'OP'));
  add('ugso_math_property', 'False');
  add('ugso_math_property', 'True', f => f.block.setFieldValue('odd', 'OP'));
  add('ugso_math_property', 'False', f => { f.block.setFieldValue('odd', 'OP'); f.block.getInputTargetBlock('A').setFieldValue(1.5, 'NUM'); });
  add('ugso_math_property', 'False', f => f.block.setFieldValue('divisible', 'OP'));
  for (const [op, expected] of [['sum', '6'], ['min', '1'], ['max', '3'], ['average', '2'], ['median', '2']]) add('ugso_math_list', expected, f => f.block.setFieldValue(op, 'OP'));
  add('ugso_math_list', '0', f => replace(f, 'LIST', []));
  add('ugso_math_list', 'None', f => { replace(f, 'LIST', []); f.block.setFieldValue('median', 'OP'); });
  add('ugso_math_round', '2.0', f => { f.block.setFieldValue(0, 'DIGITS'); f.block.getInputTargetBlock('A').setFieldValue(2.5, 'NUM'); });
  add('ugso_math_round', '-1.2', f => { f.block.setFieldValue('ceil', 'OP'); f.block.setFieldValue(1, 'DIGITS'); f.block.getInputTargetBlock('A').setFieldValue(-1.25, 'NUM'); });
  add('ugso_math_modulo', '1', f => f.block.getInputTargetBlock('A').setFieldValue(-9, 'NUM'));
  add('ugso_math_clamp', '9');
  add('ugso_math_random_int', '2', f => { f.block.getInputTargetBlock('MIN').setFieldValue(2, 'NUM'); f.block.getInputTargetBlock('MAX').setFieldValue(2, 'NUM'); });
  add('ugso_text_newline', '\r\n', f => f.block.setFieldValue('crlf', 'MODE'));
  add('ugso_text_join', 'Hallo'); add('ugso_text_append', 'vorherabc abc', () => {}, { element: 'vorher' });
  add('ugso_text_length', '2', f => f.block.getInputTargetBlock('TEXT').setFieldValue('ä🙂', 'TEXT'));
  add('ugso_text_empty', 'True', f => f.block.getInputTargetBlock('TEXT').setFieldValue('', 'TEXT'));
  add('ugso_text_contains', 'True'); add('ugso_text_index', '5', f => f.block.setFieldValue('last', 'MODE'));
  add('ugso_text_index', '0', f => f.block.getInputTargetBlock('FIND').setFieldValue('missing', 'TEXT'));
  add('ugso_text_char', 'a'); add('ugso_text_char', 'c', f => f.block.setFieldValue('end', 'MODE'));
  add('ugso_text_char', '', f => f.block.getInputTargetBlock('INDEX').setFieldValue(0, 'NUM'));
  add('ugso_text_slice', 'abc'); add('ugso_text_case', 'ABC ABC'); add('ugso_text_trim', 'abc abc');
  add('ugso_text_count', '2'); add('ugso_text_count', '0', f => f.block.getInputTargetBlock('FIND').setFieldValue('', 'TEXT'));
  add('ugso_text_replace', 'xyz xyz'); add('ugso_text_reverse', 'cba cba');
  add('ugso_list_repeat', '[1, 1, 1]'); add('ugso_list_repeat', '[]', f => f.block.getInputTargetBlock('COUNT').setFieldValue(0, 'NUM'));
  add('ugso_list_index', '2'); add('ugso_list_index', '3', f => { replace(f, 'LIST', [1, 2, 1]); f.block.setFieldValue('last', 'MODE'); });
  add('ugso_list_get', '3'); add('ugso_list_get', 'None', f => replace(f, 'LIST', []));
  add('ugso_list_get', '2', f => f.block.setFieldValue('last', 'MODE'));
  add('ugso_list_set', '[1, 2, 3]', () => {}, { element: [9, 2, 3] });
  add('ugso_list_set', '[1, 9, 2, 3]', f => f.block.setFieldValue('insert', 'MODE'), { element: [9, 2, 3] });
  add('ugso_list_set', '[9, 2, 3]', f => f.block.getInputTargetBlock('INDEX').setFieldValue(0, 'NUM'), { element: [9, 2, 3] });
  add('ugso_list_remove', '[2, 3]', () => {}, { element: [9, 2, 3] });
  add('ugso_list_slice', '[3, 1, 2]'); add('ugso_list_slice', '[]', f => f.block.getInputTargetBlock('START').setFieldValue(4, 'NUM'));
  add('ugso_list_split', "['a', 'b', 'c']"); add('ugso_list_split', '1,2', f => { replace(f, 'VALUE', [1, 2]); f.block.setFieldValue('join', 'MODE'); });
  add('ugso_list_sort', '[1, 2, 3]'); add('ugso_list_reverse', '[2, 1, 3]');
  add('ugso_math_arithmetic', null, f => replace(f, 'A', 'invalid'));
  add('ugso_math_arithmetic', null, f => { f.block.getInputTargetBlock('B').setFieldValue(0, 'NUM'); f.block.setFieldValue('/', 'OP'); });
  add('ugso_list_repeat', null, f => f.block.getInputTargetBlock('COUNT').setFieldValue(-1, 'NUM'));
  add('ugso_list_sort', null, f => replace(f, 'LIST', [1, 'x']));
  add('ugso_list_get', null, f => f.block.getInputTargetBlock('INDEX').setFieldValue(.5, 'NUM'));
  const result = spawnSync('python', ['-c', `
import json,sys,math,statistics,copy
from jinja2 import StrictUndefined
from jinja2.sandbox import ImmutableSandboxedEnvironment
e=ImmutableSandboxedEnvironment(undefined=StrictUndefined)
e.globals.update(pi=math.pi,e=math.e,average=statistics.mean,median=statistics.median,**{n:getattr(math,n) for n in ['sqrt','log','sin','cos','tan','asin','acos','atan','atan2']})
for c in json.load(sys.stdin):
 before=copy.deepcopy(c['context'])
 try: actual=e.from_string(c['template']).render(**c['context'])
 except (ValueError,TypeError,ZeroDivisionError): assert c['expected'] is None,c
 else: assert actual==c['expected'],(c,actual)
 assert c['context']==before,c
`], { input: JSON.stringify(cases), encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } });
  assert.equal(result.status, 0, result.stderr);
});
