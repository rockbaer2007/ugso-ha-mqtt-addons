import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { Blockly, modelWorkspace, workspaceModel, toolbox } from '../src/blocks.js';
import { functionToolbox } from '../src/functions.js';
import { examples, toYaml, fromYaml } from '../src/model.js';
globalThis.document = Blockly.utils.xml.createElement('div').ownerDocument;
globalThis.HTMLElement = document.defaultView.HTMLElement;
function base() { const ws = new Blockly.Workspace(); modelWorkspace(ws, { ...examples.light, actions: [{ variables: { result: 0 } }] }); return ws; }
function operand(ws, parent, input, type, fields = {}) {
  parent.getInputTargetBlock(input)?.dispose();
  const block = ws.newBlock(type); Object.entries(fields).forEach(([k, v]) => block.setFieldValue(v, k));
  parent.getInput(input).connection.connect(block.outputConnection); return block;
}
function output(ws, block) { ws.getBlocksByType('ugso_variable_set')[0].getInput('VALUE').connection.connect(block.outputConnection); return workspaceModel(ws, examples.light); }
function definition(ws, name, params = []) {
  const block = ws.newBlock('procedures_defreturn'); block.setFieldValue(name, 'NAME'); block.loadExtraState({ params: params.map(name => ({ name })), hasStatements: false }); return block;
}
test('Colour blocks preserve computed light actions through JSON and YAML', () => {
  for (const entry of toolbox.contents.find(c => c.name === 'Farbe').contents) {
    const ws = base(), copy = new Blockly.Workspace();
    try {
      const colour = Blockly.serialization.blocks.append(entry, ws);
      ws.getBlocksByType('ugso_variable_set')[0].dispose();
      const action = ws.newBlock('ugso_colour_action'); action.setFieldValue('light.test', 'ENTITY');
      action.getInput('COLOUR').connection.connect(colour.outputConnection); operand(ws, action, 'BRIGHTNESS', 'ugso_number', { NUM: 50 });
      ws.getBlocksByType('ugso_automation')[0].getInput('ACTIONS').connection.connect(action.previousConnection);
      const expected = workspaceModel(ws, examples.light);
      Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), copy);
      assert.deepEqual(workspaceModel(copy, examples.light), expected);
      modelWorkspace(copy, fromYaml(toYaml(expected))); assert.deepEqual(workspaceModel(copy, examples.light), expected);
    } finally { ws.dispose(); copy.dispose(); }
  }
});
test('Original Blockly parameter functions expand with lexical bindings and survive JSON reload', () => {
  const ws = base(), copy = new Blockly.Workspace();
  try {
    const def = definition(ws, 'twice', ['x']);
    const sum = operand(ws, def, 'RETURN', 'ugso_math_arithmetic');
    operand(ws, sum, 'A', 'variables_get', { VAR: ws.getVariableMap().getVariable('x').getId() }); operand(ws, sum, 'B', 'ugso_number', { NUM: 2 }); sum.setFieldValue('*', 'OP');
    const call = Blockly.serialization.blocks.append(functionToolbox(ws)[1], ws); operand(ws, call, 'ARG0', 'ugso_number', { NUM: 21 });
    const expected = output(ws, call); assert.match(expected.actions[0].variables.result, /21/); assert.doesNotMatch(expected.actions[0].variables.result, /\bx\b/);
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), copy); assert.deepEqual(workspaceModel(copy, examples.light), expected);
    modelWorkspace(copy, fromYaml(toYaml(expected))); assert.deepEqual(workspaceModel(copy, examples.light), expected);
    ws.getVariableMap().renameVariable(ws.getVariableMap().getVariable('x'), 'a'); assert.equal(def.getProcedureDef()[1][0], 'a'); assert.deepEqual(workspaceModel(ws, examples.light), expected);
  } finally { ws.dispose(); copy.dispose(); }
});
test('Functions reject recursion, missing return/arguments, statement imports and excess parameters', () => {
  const ws = base();
  try {
    const def = definition(ws, 'self'); assert.throws(() => workspaceModel(ws, examples.light), /fehlt/);
    const call = operand(ws, def, 'RETURN', 'procedures_callreturn'); call.loadExtraState({ name: 'self' }); assert.throws(() => workspaceModel(ws, examples.light), /Rekursion/);
    call.dispose(); operand(ws, def, 'RETURN', 'ugso_number', { NUM: 1 });
    assert.throws(() => def.loadExtraState({ hasStatements: true }), /Aktionen/);
    def.loadExtraState({ params: Array.from({ length: 9 }, (_, i) => ({ name: `x${i}` })) }); assert.throws(() => workspaceModel(ws, examples.light), /höchstens 8/);
  } finally { ws.dispose(); }
});
test('Nested functions preserve caller bindings, conditions and require every argument', () => {
  const ws = base();
  try {
    const inner = definition(ws, 'inner', ['x']); operand(ws, inner, 'RETURN', 'variables_get', { VAR: ws.getVariableMap().getVariable('x').getId() });
    const outer = definition(ws, 'outer', ['x']);
    const nested = operand(ws, outer, 'RETURN', 'procedures_callreturn'); nested.loadExtraState({ name: 'inner', params: ['x'] });
    operand(ws, nested, 'ARG0', 'variables_get', { VAR: ws.getVariableMap().getVariable('x').getId() });
    const call = ws.newBlock('procedures_callreturn'); call.loadExtraState({ name: 'outer', params: ['x'] });
    ws.getBlocksByType('ugso_variable_set')[0].getInput('VALUE').connection.connect(call.outputConnection);
    assert.throws(() => workspaceModel(ws, examples.light), /fehlt/);
    operand(ws, call, 'ARG0', 'ugso_boolean', { BOOL: 'true' });
    const root = ws.getBlocksByType('ugso_automation')[0];
    root.getInput('CONDITIONS').connection.connect(call.outputConnection); ws.getBlocksByType('ugso_variable_set')[0].dispose();
    assert.match(workspaceModel(ws, examples.light).conditions[0].value_template, /true/);
  } finally { ws.dispose(); }
});
test('Colour templates execute in immutable Jinja with HA zip/add/multiply helpers', { skip: !process.env.BLOCKS_JINJA_TEST }, () => {
  const cases = [];
  function add(type, expected, configure = () => {}) {
    const ws = base(); try { const entry = toolbox.contents.find(c => c.name === 'Farbe').contents.find(b => b.type === type); const block = Blockly.serialization.blocks.append(entry, ws); configure(ws, block); cases.push({ template: output(ws, block).actions[0].variables.result, expected }); } finally { ws.dispose(); }
  }
  add('ugso_colour', '[255, 136, 0]'); add('ugso_colour_rgb', '[255, 128, 0]'); add('ugso_colour_blend', '[128, 0, 128]');
  add('ugso_colour_rgb', '[0, 255, 0]', (ws, b) => { b.getInputTargetBlock('R').setFieldValue(-10, 'NUM'); b.getInputTargetBlock('G').setFieldValue(200, 'NUM'); });
  add('ugso_colour_blend', '[255, 0, 0]', (ws, b) => b.getInputTargetBlock('RATIO').setFieldValue(-2, 'NUM'));
  add('ugso_colour_rgb', null, (ws, b) => operand(ws, b, 'R', 'ugso_text', { TEXT: 'invalid' }));
  add('ugso_colour_random', 'random'); add('ugso_colour_blend', 'random', (ws, b) => operand(ws, b, 'FIRST', 'ugso_colour_random'));
  const result = spawnSync('python', ['-c', `
import json,sys,ast
from jinja2.sandbox import ImmutableSandboxedEnvironment
e=ImmutableSandboxedEnvironment(); e.globals['zip']=zip
e.filters.update(add=lambda x,y:float(x)+y,multiply=lambda x,y:float(x)*y)
for c in json.load(sys.stdin):
 try: actual=e.from_string(c['template']).render()
 except (TypeError,ValueError): assert c['expected'] is None,c
 else:
  if c['expected']=='random':
   rgb=ast.literal_eval(actual); assert len(rgb)==3 and all(type(x)==int and 0<=x<=255 for x in rgb),actual
  else: assert actual==c['expected'],(c,actual)
`], { input: JSON.stringify(cases), encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } });
  assert.equal(result.status, 0, result.stderr);
});
