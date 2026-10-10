import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1050 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:4180/');
  const open = page.getByRole('button', { name: 'Blocks im Arbeitsbereich suchen' });
  await open.waitFor();
  const before = await page.locator('#yaml').textContent();
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
    const { Blockly } = await import(url);
    window.testBlockly = Blockly; window.testWorkspace = Blockly.getMainWorkspace();
    window.testSnapshot = Blockly.serialization.workspaces.save(window.testWorkspace);
  });
  const search = page.getByRole('searchbox', { name: 'Platzierte Blocks suchen' });
  await open.click(); await search.fill('light');
  assert.ok(await page.locator('#workspace .blockly-ws-search-highlight').count() > 0);
  await page.keyboard.press('Enter'); await page.keyboard.press('Shift+Enter');
  await page.keyboard.press('Escape'); assert.equal(await search.isVisible(), false);
  assert.equal(await page.locator('#yaml').textContent(), before);
  assert.ok(await page.evaluate(() => JSON.stringify(testBlockly.serialization.workspaces.save(testWorkspace)) === JSON.stringify(testSnapshot)));
  await page.keyboard.press('Control+f'); assert.equal(await search.isVisible(), true);
  await search.fill('nicht-vorhandener-block-xyz');
  assert.equal(await page.locator('#workspace .blockly-ws-search-highlight').count(), 0);
  await page.keyboard.press('Escape');
  // Focus a real HA block and use the core optional navigation shortcuts.
  await page.evaluate(() => testBlockly.getFocusManager().focusNode(testWorkspace.getTopBlocks(true)[0]));
  await page.keyboard.press('Control+End');
  assert.ok(await page.evaluate(() => testBlockly.getFocusManager().getFocusedNode() !== null));
  await page.getByRole('button', { name: 'Tastaturhilfe', exact: true }).click();
  await page.locator('#keyboard-help').getByRole('button', { name: 'Schließen' }).click();
  await page.locator('#name').fill('Strg bleibt Textbearbeitung');
  await page.keyboard.press('Control+f'); assert.equal(await search.isVisible(), false);
  await page.keyboard.press('Escape');
  // A package block participates in original search without a separate adapter.
  await page.evaluate(async () => {
    const { withPackages } = await import('/src/custom-packages.js');
    const { customExample } = await import('/src/custom-example.js');
    withPackages(testBlockly, [customExample], () => {
      const block = testWorkspace.newBlock('ugso_custom_ugso_sensor_tools__sensor_number');
      block.initSvg(); block.render();
    });
  });
  await open.click(); await search.fill('Sensorwert als Zahl');
  assert.ok(await page.locator('#workspace .blockly-ws-search-highlight').count() > 0);
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const block = testWorkspace.newBlock('ugso_number'); block.initSvg(); block.render();
    window.testNumber = block;
    testBlockly.getFocusManager().focusNode(block.getField('NUM'));
  });
  await page.keyboard.press('Enter');
  const numericInput = page.locator('.blocklyHtmlInput');
  await numericInput.waitFor(); await numericInput.fill('17'); await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => testNumber.getFieldValue('NUM')), 17);
  await page.evaluate(() => testNumber.dispose());
  for (const theme of ['dark', 'modern', 'tritanopia', 'standard']) {
    await page.getByRole('combobox', { name: 'Blockly-Theme' }).selectOption(theme);
    await open.click(); await search.fill('Sensorwert');
    assert.ok(await page.locator('#workspace .blockly-ws-search-highlight').count() > 0);
    await page.keyboard.press('Escape');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await open.click();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const bounds = await page.locator('#workspace .blockly-ws-search').boundingBox();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
  await page.screenshot({ path: 'artifacts/workspace-search-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('Workspace search: HA/custom blocks, no matches, Enter/Escape/Ctrl+F, unchanged project/YAML, keyboard help, native navigation, input focus, four themes and mobile width verified.');
} finally { await browser.close(); }
