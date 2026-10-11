import test from 'node:test';
import assert from 'node:assert/strict';
import { Blockly, definitions, toolbox, workspaceModel, modelWorkspace } from '../src/blocks.js';
import { advancedJSON } from '../src/advanced.js';
import { examples } from '../src/model.js';

function choose(block, keys) {
  const popup = new Blockly.Workspace();
  try {
    const root = block.decompose(popup); let connection = root.getInput('STACK').connection;
    root.getInputTargetBlock('STACK')?.dispose(false);
    for (const key of keys) {
      const option = block.haOptionRows_.find(option => option.key === key); assert.ok(option, key);
      const item = popup.newBlock(option.type); connection.connect(item.previousConnection); connection = item.nextConnection;
    }
    block.compose(root);
  } finally { popup.dispose(); }
}
test('Every HA block can initialize and serialize with required controls and optional rows', () => {
  const ws = new Blockly.Workspace(), copy = new Blockly.Workspace();
  try {
    for (const definition of definitions.filter(definition => /^ugso_ha_|^ugso_.*_trigger$|^ugso_(service_action|target_action|variables_action)$/.test(definition.type))) {
      const block = ws.newBlock(definition.type);
      if (block.haOptionRows_) {
        assert.equal(new Set(block.haOptionRows_.map(option => option.key)).size, block.haOptionRows_.length, definition.type);
        for (const option of block.haOptionRows_) assert.ok(block.getInput(option.input.name));
      }
    }
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), copy);
    assert.equal(copy.getAllBlocks(false).length, ws.getAllBlocks(false).length);
  } finally { ws.dispose(); copy.dispose(); }
});
test('Gear options preserve exact imported values, removal clears only selected properties and reload retains blank choices', () => {
  const ws = new Blockly.Workspace(), copy = new Blockly.Workspace();
  try {
    const block = ws.newBlock('ugso_ha_action');
    const original = { action:'light.turn_on',target:{entity_id:'light.test',area_id:'room'},enabled:false,data:{brightness:0},alias:'Name',metadata:{x:false} };
    block.setFieldValue(JSON.stringify(original), 'JSON');
    assert.deepEqual(advancedJSON(block), original);
    const keep = block.saveExtraState().haOptions.filter(key => !['HA_JSON_TARGET_AREA_ID','HA_JSON_ENABLED','HA_JSON_METADATA'].includes(key));
    choose(block, keep);
    assert.deepEqual(advancedJSON(block), { action:'light.turn_on',target:{entity_id:'light.test'},data:{brightness:0},alias:'Name' });
    choose(block, [...keep, 'HA_JSON_RESPONSE_VARIABLE']);
    const order = [...block.saveExtraState().haOptions].reverse(); choose(block, order);
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), copy);
    const loaded = copy.getBlocksByType('ugso_ha_action')[0];
    assert.ok(loaded.saveExtraState().haOptions.includes('HA_JSON_RESPONSE_VARIABLE'));
    assert.deepEqual(loaded.saveExtraState().haOptions, order);
    assert.deepEqual(loaded.inputList.filter(input => loaded.haOptionRows_.some(option => option.input === input && order.includes(option.key))).map(input => loaded.haOptionRows_.find(option => option.input === input).key), order);
    assert.deepEqual(advancedJSON(loaded), advancedJSON(block));
  } finally { ws.dispose(); copy.dispose(); }
});
test('Native optional flags and populated trigger IDs clear through gear without reappearing', () => {
  const ws = new Blockly.Workspace();
  try {
    const model = structuredClone(examples.light); model.triggers = [{trigger:'sun',event:'sunset',offset:-900,id:'sun'}];
    modelWorkspace(ws, model); const block = ws.getBlocksByType('ugso_sun_trigger')[0];
    choose(block, []); assert.equal(block.getFieldValue('USE_OFFSET'), 'FALSE'); assert.equal(block.getFieldValue('TRIGGER_ID'), '');
    assert.deepEqual(workspaceModel(ws, model).triggers, [{trigger:'sun',event:'sunset'}]);
    assert.deepEqual(block.saveExtraState().haOptions, []);
  } finally { ws.dispose(); }
});
test('AND and OR are separate expandable palette blocks, NOT has one input; legacy groups still load', () => {
  const ws = new Blockly.Workspace();
  try {
    const menu = toolbox.contents.find(c => c.name === 'Logik').contents.map(item => item.type);
    assert.ok(menu.includes('ugso_and') && menu.includes('ugso_or') && menu.includes('ugso_not')); assert.ok(!menu.includes('ugso_logic_condition'));
    for (const operator of ['and','or']) {
      const block = ws.newBlock('ugso_' + operator); block.loadExtraState({items:4,list:false});
      assert.equal(block.getFieldValue('LOGIC'), operator); assert.equal(block.itemCount_,4); assert.equal(block.getField('LOGIC').isVisible(),false);
    }
    assert.equal(ws.newBlock('ugso_not').inputList.filter(input => input.connection).length,1);
  } finally { ws.dispose(); }
});
