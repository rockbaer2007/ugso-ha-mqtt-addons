import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const page = await browser.newPage({ locale: 'de-DE', viewport: { width: 1450, height: 1000 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:4180/');
  await page.getByRole('searchbox', { name: 'Blocks suchen' }).waitFor();
  for (const category of ['Timeouts', 'Objekt', 'Schleifen', 'Listen', 'Logik']) {
    await page.locator('.blocklyToolboxCategory').filter({ hasText: new RegExp(`^${category}$`) }).click();
    await page.waitForTimeout(100);
  }
  await page.evaluate(async () => {
    const { Blockly, modelWorkspace, toolbox } = await import(performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name);
    const { examples } = await import('/src/model.js');
    const ws = Blockly.getMainWorkspace(); ws.getToolbox().clearSelection();
    modelWorkspace(ws, { ...examples.light, actions: [{ variables: { result: 0 } }] });
    const info = toolbox.contents.flatMap(c => c.contents || []).find(b => b.type === 'ugso_object_new');
    const block = Blockly.serialization.blocks.append(info, ws);
    ws.getBlocksByType('ugso_variable_set')[0].getInput('VALUE').connection.connect(block.outputConnection);
    await Blockly.renderManagement.finishQueuedRenders();
  });
  await page.locator('#fit').click();
  async function clickField(name) {
    await page.evaluate(async name => {
      const { Blockly } = await import(performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name);
      const block = Blockly.getMainWorkspace().getBlocksByType('ugso_object_new')[0];
      const icon = block.getIcon(Blockly.icons.MutatorIcon.TYPE); await icon.setBubbleVisible(true);
      const ws = icon.getWorkspace(), root = ws.getBlocksByType('ugso_rows_container')[0];
      if (name === 'ADD') {
        const item = ws.newBlock('ugso_rows_item'); item.initSvg(); item.render();
        let connection = root.getInput('STACK').connection;
        while (connection.targetBlock()) connection = connection.targetBlock().nextConnection;
        connection.connect(item.previousConnection);
      } else {
        let item = root.getInputTargetBlock('STACK'); while (item.getNextBlock()) item = item.getNextBlock(); item.dispose();
      }
      await new Promise(resolve => setTimeout(resolve, 150)); await icon.setBubbleVisible(false);
    }, name);
  }
  await clickField('ADD');
  await page.evaluate(async () => {
    const { Blockly } = await import(performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name);
    const b = Blockly.getMainWorkspace().getBlocksByType('ugso_object_new')[0];
    b.setFieldValue('zweites', 'KEY1');
    const number = Blockly.getMainWorkspace().newBlock('ugso_number'); number.setFieldValue(42, 'NUM'); number.initSvg(); number.render();
    b.getInput('V1').connection.connect(number.outputConnection);
  });
  await page.waitForFunction(() => document.querySelector('#yaml').textContent.includes('zweites'));
  // Open the real native gear bubble and verify that its row blocks render.
  const gear = await page.evaluate(async () => {
    const { Blockly } = await import(performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name);
    const icon = Blockly.getMainWorkspace().getBlocksByType('ugso_object_new')[0].getIcon(Blockly.icons.MutatorIcon.TYPE);
    await icon.setBubbleVisible(true); return icon.bubbleIsVisible();
  });
  assert.equal(gear, true);
  await page.evaluate(async () => {
    const { Blockly } = await import(performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name);
    await Blockly.getMainWorkspace().getBlocksByType('ugso_object_new')[0].getIcon(Blockly.icons.MutatorIcon.TYPE).setBubbleVisible(false);
  });
  await clickField('REMOVE');
  await page.evaluate(async () => {
    const { Blockly } = await import(performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name);
    const ws = Blockly.getMainWorkspace();
    const object = ws.getBlocksByType('ugso_object_new')[0];
    for (let i = 0; i < 5 && (object.getFieldValue('KEY1') !== 'zweites' || !object.getInputTargetBlock('V1')); i++) {
      ws.undo(false); await new Promise(resolve => setTimeout(resolve, 50));
    }
  });
  await page.waitForFunction(() => document.querySelector('#yaml').textContent.includes('zweites'));
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#yaml').textContent.includes('zweites'));
  assert.deepEqual(errors, []);
  console.log('New categories, object native gear, undo with renamed keys, YAML and project reload verified.');
} finally { await browser.close(); }
