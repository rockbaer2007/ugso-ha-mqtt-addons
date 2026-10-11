import test from 'node:test';
import assert from 'node:assert/strict';
import { Blockly } from '../src/blocks.js';

for (const type of ['ugso_and', 'ugso_or', 'ugso_object_new']) {
  test(type + ': reordering and removing sockets preserves children, keys and saved values', () => {
    const ws = new Blockly.Workspace(), popup = new Blockly.Workspace(), copy = new Blockly.Workspace();
    try {
      const block = ws.newBlock(type), object = type === 'ugso_object_new';
      if (object) block.loadExtraState({ rows: 2, keys: ['temperature', 'humidity'] });
      const input = index => (object ? 'V' : 'COND') + index;
      const children = [0, 1].map(index => {
        const child = ws.newBlock(object ? 'ugso_number' : 'ugso_boolean');
        child.setFieldValue(object ? 21.75 + index : index ? 'false' : 'true', object ? 'NUM' : 'BOOL');
        block.getInput(input(index)).connection.connect(child.outputConnection); return child;
      });
      // The native builder calls initSvg; supply only that rendered-method stub
      // for headless checks, while retaining real Blockly connections and state.
      const create = popup.newBlock.bind(popup);
      popup.newBlock = (...args) => { const item = create(...args); item.initSvg = () => {}; return item; };
      const root = block.decompose(popup); block.saveConnections(root);
      const first = root.getInputTargetBlock('STACK'), second = first.getNextBlock();
      first.nextConnection.disconnect(); first.previousConnection.disconnect();
      root.getInput('STACK').connection.connect(second.previousConnection); second.nextConnection.connect(first.previousConnection);
      block.compose(root);
      assert.equal(block.getInputTargetBlock(input(0)), children[1]); assert.equal(block.getInputTargetBlock(input(1)), children[0]);
      if (object) { assert.equal(block.getFieldValue('KEY0'), 'humidity'); assert.equal(block.getFieldValue('KEY1'), 'temperature'); }
      Blockly.serialization.workspaces.load(JSON.parse(JSON.stringify(Blockly.serialization.workspaces.save(ws))), copy);
      const loaded = copy.getBlockById(block.id);
      assert.equal(loaded.getInputTargetBlock(input(0)).id, children[1].id);
      assert.equal(loaded.getInputTargetBlock(input(1)).getFieldValue(object ? 'NUM' : 'BOOL'), object ? 21.75 : 'true');
      if (object) assert.equal(loaded.getFieldValue('KEY0'), 'humidity');
      block.saveConnections(root); second.dispose(true); block.compose(root);
      assert.equal(block.getInputTargetBlock(input(0)), children[0]);
      assert.equal(children[1].getParent(), null); assert.equal(children[1].isDisposed(), false);
      assert.equal(children[1].getFieldValue(object ? 'NUM' : 'BOOL'), object ? 22.75 : 'false');
      Blockly.serialization.workspaces.load(JSON.parse(JSON.stringify(Blockly.serialization.workspaces.save(ws))), copy);
      assert.equal(copy.getBlockById(block.id).getInputTargetBlock(input(0)).id, children[0].id);
      assert.equal(copy.getBlockById(children[1].id).getParent(), null);
      assert.equal(copy.getBlockById(children[1].id).getFieldValue(object ? 'NUM' : 'BOOL'), object ? 22.75 : 'false');
      if (object) assert.equal(copy.getBlockById(block.id).getFieldValue('KEY0'), 'temperature');
    } finally { ws.dispose(); popup.dispose(); copy.dispose(); }
  });
}
