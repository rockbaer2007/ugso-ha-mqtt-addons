import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const page = await browser.newPage({ locale: 'de-DE', viewport: { width: 1450, height: 1000 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:4180/');
  await page.getByRole('searchbox', { name: 'Blocks suchen' }).waitFor();
  await page.locator('.blocklyToolboxCategory').filter({ hasText: /^Konvertierung$/ }).click();
  await page.waitForFunction(async () => {
    const { Blockly } = await import(performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name);
    return Blockly.getMainWorkspace().getToolbox().getFlyout().getWorkspace().getBlocksByType('ugso_convert_number').length === 1;
  });
  await page.evaluate(async () => {
    const { Blockly, modelWorkspace, toolbox } = await import(performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name);
    const { examples } = await import('/src/model.js');
    const ws = Blockly.getMainWorkspace(); ws.getToolbox().clearSelection();
    modelWorkspace(ws, { ...examples.light, actions: [{ variables: { result: 0 } }] });
    const info = toolbox.contents.flatMap(c => c.contents || []).find(b => b.type === 'ugso_convert_date_format');
    const block = Blockly.serialization.blocks.append(info, ws);
    ws.getBlocksByType('ugso_variable_set')[0].getInput('VALUE').connection.connect(block.outputConnection);
    await Blockly.renderManagement.finishQueuedRenders();
  });
  await page.locator('#fit').click();
  const rect = await page.evaluate(async () => {
    const { Blockly } = await import(performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name);
    const r = Blockly.getMainWorkspace().getBlocksByType('ugso_convert_date_format')[0].getField('FORMAT').getSvgRoot().getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(rect.x, rect.y);
  await page.locator('.blocklyMenuItem').filter({ hasText: 'Eigenes Format' }).click();
  await page.waitForFunction(() => document.querySelector('#yaml').textContent.includes('strftime'));
  assert.deepEqual(await page.evaluate(async () => {
    const { Blockly } = await import(performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name);
    const b = Blockly.getMainWorkspace().getBlocksByType('ugso_convert_date_format')[0];
    return { field: !!b.getField('PATTERN'), type: b.outputConnection.getCheck() };
  }), { field: true, type: ['String', 'Value'] });
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#yaml').textContent.includes('strftime'));
  assert.equal(await page.evaluate(async () => {
    const { Blockly } = await import(performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name);
    return Blockly.getMainWorkspace().getBlocksByType('ugso_convert_date_format')[0].getFieldValue('FORMAT');
  }), 'custom');
  assert.deepEqual(errors, []);
  console.log('Conversion menu, real custom-format dropdown interaction, dynamic field/type, YAML and project reload verified.');
} finally { await browser.close(); }
