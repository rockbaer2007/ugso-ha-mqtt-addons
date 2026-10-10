import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const page = await browser.newPage({ locale: 'de-DE', viewport: { width: 1500, height: 1050 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:4180/');
  await page.getByRole('searchbox', { name: 'Blocks suchen' }).waitFor();
  for (const category of ['Schleifen', 'Mathematik', 'Text', 'Listen']) {
    await page.locator('.blocklyToolboxCategory').filter({ hasText: new RegExp(`^${category}$`) }).click();
    assert.ok(await page.evaluate(async category => {
      const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
      const { Blockly, toolbox } = await import(url);
      const ws = Blockly.getMainWorkspace().getToolbox().getFlyout().getWorkspace();
      return toolbox.contents.find(c => c.name === category).contents.every(d => ws.getBlocksByType(d.type).length > 0);
    }, category));
  }
  const point = await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
    const { Blockly, modelWorkspace, toolbox } = await import(url);
    const { examples } = await import('/src/model.js');
    const ws = Blockly.getMainWorkspace(); modelWorkspace(ws, { ...examples.light, actions: [{ variables: { result: 0 } }] });
    const block = Blockly.serialization.blocks.append(toolbox.contents.find(c => c.name === 'Text').contents.find(d => d.type === 'ugso_text_join'), ws);
    ws.getBlocksByType('ugso_variable_set')[0].getInput('VALUE').connection.connect(block.outputConnection);
    ws.getToolbox().clearSelection(); ws.zoomToFit(); await Blockly.renderManagement.finishQueuedRenders();
    const r = block.getField('ADD').getSvgRoot().getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(point.x, point.y);
  assert.equal(await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
    const { Blockly } = await import(url); return Blockly.getMainWorkspace().getBlocksByType('ugso_text_join')[0].rowCount_;
  }), 2);
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
    const { Blockly, workspaceModel } = await import(url), ws = Blockly.getMainWorkspace();
    const b = ws.newBlock('ugso_text'); b.setFieldValue(' Welt', 'TEXT'); b.initSvg(); b.render();
    ws.getBlocksByType('ugso_text_join')[0].getInput('V1').connection.connect(b.outputConnection);
    const before = workspaceModel(ws, { id: 'test', alias: 'Test', description: '', mode: 'single' });
    const saved = Blockly.serialization.workspaces.save(ws); Blockly.serialization.workspaces.load(saved, ws);
    if (JSON.stringify(workspaceModel(ws, { id: 'test', alias: 'Test', description: '', mode: 'single' })) !== JSON.stringify(before)) throw new Error('Reload mismatch');
  });
  await page.locator('.blocklyToolboxCategory').filter({ hasText: /^Mathematik$/ }).click();
  await mkdir('artifacts', { recursive: true }); await page.screenshot({ path: 'artifacts/collections.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('Math/text/list/loop flyouts, text join + button, typed values and rendered JSON reload verified.');
} finally { await browser.close(); }
