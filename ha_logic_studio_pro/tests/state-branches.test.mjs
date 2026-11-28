import test from 'node:test';
import assert from 'node:assert/strict';
import * as BlocklyModule from 'blockly/core';
import {javascriptGenerator as js} from 'blockly/javascript';
import {registerStateBranches, stateBranchType} from '../web/state-branches.js';
import {generateBlocks} from '../web/vendor/pro-blocks.js';
import vm from 'node:vm';
const B = Reflect.get(BlocklyModule, 'default') ?? BlocklyModule;
let language = 'de';
registerStateBranches(B, js, () => language, text => ({type: 'field_input', name: 'ENTITY', text}), [], new Set(), new Set());
const b = (type, fields = {}, inputs = {}) => ({type, fields, inputs: Object.fromEntries(Object.entries(inputs).map(([key, block]) => [key, {block}]))});
const log = text => b('ha_js_log', {}, {VALUE: b('text', {TEXT: text})});
const snapshot = (fields = {}, extraState = {count: 2, hasElse: true}) => ({blocks: {blocks: [{
  ...b(stateBranchType, {ENTITY: 'switch.demo', MODE: 'state', ATTRIBUTE: 'current_position', TYPE0: 'text', CASE0: 'on', TYPE1: 'text', CASE1: 'off', ...fields},
    {DO0: log('on'), DO1: log('off'), ELSE: log('other')}), extraState,
}]}});

test('multi-branch trigger dispatches on/off and fallback once per matching event', async () => {
  const code = generateBlocks(snapshot(), 'States');
  let callback; const logs = [];
  vm.runInNewContext(code, {ha: {onState: (id, cb) => { assert.equal(id, 'switch.demo'); callback = cb; }, log: value => logs.push(value)}});
  for (const state of ['on', 'off', 'unavailable']) await callback({current: {state}});
  assert.deepEqual(logs, ['on', 'off', 'other']);
});
test('attribute branches accept numeric positions and custom text states', async () => {
  let callback; const logs = [];
  const code = generateBlocks(snapshot({MODE: 'attribute', TYPE0: 'number', CASE0: '50', CASE1: 'halb'}), 'Position');
  vm.runInNewContext(code, {ha: {onAttribute: (id, attribute, cb) => { assert.equal(attribute, 'current_position'); callback = cb; }, log: value => logs.push(value)}});
  for (const value of [50, '50', 'halb', false, null, '']) await callback({current: {attributes: {current_position: value}}});
  assert.deepEqual(logs, ['on', 'on', 'off', 'other', 'other', 'other']);
});
test('duplicate values and invalid numeric branches are rejected before running', () => {
  assert.throws(() => generateBlocks(snapshot({CASE1: 'on'}), 'Duplicate'), /Doppelter|Duplicate|double/);
  assert.throws(() => generateBlocks(snapshot({TYPE0: 'number', CASE0: 'NaN'}), 'Number'), /Zahlenwert|number|Nombre/);
  assert.throws(() => generateBlocks(snapshot({TYPE0: 'number', CASE0: '50', CASE1: '50'}), 'Ambiguous'), /Doppelter|Duplicate|double/);
});
test('gear editor preserves values and connected actions when branches are reordered', () => {
  const workspace = new B.Workspace(), mutator = new B.Workspace();
  const originalNew = mutator.newBlock.bind(mutator);
  mutator.newBlock = (...args) => { const block = originalNew(...args); block.initSvg = () => {}; return block; };
  try {
    const block = workspace.newBlock(stateBranchType); block.setFieldValue('switch.demo', 'ENTITY');
    block.loadExtraState({count: 2, hasElse: true});
    // Real statement connection stays with its branch while the gear order changes.
    B.Blocks.ugso_test_action = {init() { this.setPreviousStatement(true); this.setNextStatement(true); }};
    const statement = workspace.newBlock('ugso_test_action');
    block.getInput('DO0').connection.connect(statement.previousConnection);
    const root = block.decompose(mutator); block.saveConnections(root);
    const first = root.getInputTargetBlock('STACK'), second = first.getNextBlock(), fallback = second.getNextBlock();
    fallback.previousConnection.disconnect(); second.previousConnection.disconnect(); first.previousConnection.disconnect();
    root.getInput('STACK').connection.connect(second.previousConnection);
    second.nextConnection.connect(first.previousConnection); first.nextConnection.connect(fallback.previousConnection);
    block.compose(root);
    assert.equal(block.getFieldValue('CASE0'), 'off'); assert.equal(block.getFieldValue('CASE1'), 'on');
    assert.equal(block.getInputTargetBlock('DO1'), statement); assert.ok(block.getInput('ELSE'));
  } finally { workspace.dispose(); mutator.dispose(); }
});
test('branch projects round-trip all fields and the gear state in DE EN FR', () => {
  for (language of ['de', 'en', 'fr']) {
    const workspace = new B.Workspace(), copy = new B.Workspace();
    try {
      const block = workspace.newBlock(stateBranchType);
      block.loadExtraState({count: 3, hasElse: true});
      block.setFieldValue('attribute', 'MODE'); block.setFieldValue('current_position', 'ATTRIBUTE');
      block.setFieldValue('halb', 'CASE2');
      B.serialization.workspaces.load(B.serialization.workspaces.save(workspace), copy);
      const restored = copy.getTopBlocks()[0];
      assert.deepEqual(restored.saveExtraState(), {count: 3, hasElse: true});
      assert.equal(restored.getFieldValue('CASE2'), 'halb');
      assert.equal(restored.getField('ATTRIBUTE').isVisible(), true);
    } finally { workspace.dispose(); copy.dispose(); }
  }
});
test('on/off comparison values are strings, existing true/false remain booleans', () => {
  for (const [choice, value] of [['ON', 'on'], ['OFF', 'off'], ['TRUE', true], ['FALSE', false]]) {
    const code = generateBlocks({blocks: {blocks: [b('ha_js_log', {}, {VALUE: b('logic_boolean', {BOOL: choice})})]}}, 'Boolean');
    const logs = []; vm.runInNewContext(code, {ha: {log: value => logs.push(value)}});
    assert.equal(logs[0], String(value));
  }
});

test('HA output blocks await acknowledgement and explicitly delayed outputs keep their own continuation', async () => {
  const update = b('ha_js_set_state', {ENTITY: 'switch.demo'}, {VALUE: b('logic_boolean', {BOOL: 'TRUE'})});
  let code = generateBlocks({blocks: {blocks: [update]}}, 'Output');
  assert.match(code, /^await ha\.setState/);
  update.fields.WITH_DELAY = 'TRUE'; update.fields.DELAY_MS = 100;
  code = generateBlocks({blocks: {blocks: [update]}}, 'Delayed');
  assert.match(code, /^ha\.timeout/); assert.match(code, /async \(\) => \{ await ha\.setState/);
});

test('existing new/old trigger-value blocks work in new state and attribute branches', async () => {
  for (const mode of ['state', 'attribute']) for (const part of ['current', 'previous']) {
    const data = snapshot({MODE: mode});
    data.blocks.blocks[0].inputs.DO0 = {block: b('ha_js_log', {}, {VALUE: b('ha_js_trigger_value', {PART: part})})};
    const code = generateBlocks(data, 'Event value');
    let handler; const logs = [];
    vm.runInNewContext(code, {ha: {onState: (id, callback) => { handler = callback; },
      onAttribute: (id, key, callback) => { handler = callback; }, log: value => logs.push(value)}});
    await handler({current: {state: mode === 'state' ? 'on' : 'different_state', attributes: {current_position: 'on'}},
      previous: {state: mode === 'state' ? 'off' : 'other_old_state', attributes: {current_position: 'off'}}});
    assert.deepEqual(logs, [part === 'current' ? 'on' : 'off']);
  }
});
