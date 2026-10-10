import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1050 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:4180/'); const select = page.getByRole('combobox', { name: 'Blockly-Theme' }); await select.waitFor();
  const before = await page.locator('#yaml').textContent();
  const snapshot = () => page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
    const { Blockly } = await import(url); return Blockly.serialization.workspaces.save(Blockly.getMainWorkspace());
  });
  const saved = await snapshot(); await mkdir('artifacts', { recursive: true });
  for (const id of ['dark', 'modern', 'tritanopia', 'standard']) {
    await select.selectOption(id);
    await page.waitForFunction(id => document.querySelector('#workspace').dataset.theme === id, id);
    assert.equal(await page.locator('#yaml').textContent(), before); assert.deepEqual(await snapshot(), saved);
    await page.locator('.blocklyToolboxCategory').filter({ hasText: /^Mathematik$/ }).click();
    const colours = await page.evaluate(async () => {
      const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
      const { Blockly } = await import(url), ws = Blockly.getMainWorkspace(), flyout = ws.getToolbox().getFlyout().getWorkspace();
      const b = flyout.getBlocksByType('ugso_math_arithmetic')[0];
      const clamp = flyout.getBlocksByType('ugso_math_clamp')[0];
      return { workspace: getComputedStyle(document.querySelector('.blocklySvg')).backgroundColor, flyout: getComputedStyle(document.querySelector('.blocklyFlyoutBackground')).fill, block: b.getColour(), ink: b.getSvgRoot().style.getPropertyValue('--ugso-label-ink'), labels: [...clamp.getSvgRoot().querySelectorAll('text.blocklyText')].filter(t => ['Begrenze', 'zwischen', 'und'].includes(t.textContent)).map(t => getComputedStyle(t).fill) };
    });
    if (id === 'dark') { assert.equal(colours.workspace, 'rgb(30, 30, 30)'); assert.equal(colours.flyout, 'rgb(21, 29, 37)'); }
    if (id === 'tritanopia') { assert.equal(colours.block, '#e6da39'); assert.equal(colours.ink, '#10232b'); assert.equal(colours.labels.length, 3); assert.ok(colours.labels.every(c => c === 'rgb(16, 35, 43)')); }
    await page.screenshot({ path: `artifacts/theme-${id}.png`, fullPage: true });
    if (process.env.BLOCKS_THEME_DIR) { await mkdir(process.env.BLOCKS_THEME_DIR, { recursive: true }); await page.locator('.canvas-panel').screenshot({ path: `${process.env.BLOCKS_THEME_DIR}/${id}.png` }); }
  }
  await select.selectOption('dark'); await page.reload(); await select.waitFor(); assert.equal(await select.inputValue(), 'dark'); assert.equal(await page.locator('#yaml').textContent(), before);
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
    const { Blockly } = await import(url), ws = Blockly.getMainWorkspace(); ws.setScale(.35); ws.scroll(0, 0);
  });
  await page.getByRole('button', { name: 'Alle Blocks einpassen' }).click();
  assert.ok(await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
    const { Blockly } = await import(url); return Blockly.getMainWorkspace().scale > .35;
  }));
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
    const { Blockly } = await import(url); Blockly.getMainWorkspace().setScale(.35);
  });
  await page.getByRole('button', { name: 'Alle Blocks einpassen' }).focus();
  await page.keyboard.press('Enter');
  assert.ok(await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
    const { Blockly } = await import(url); return Blockly.getMainWorkspace().scale > .35;
  }));
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'artifacts/theme-mobile.png', fullPage: true });
  assert.deepEqual(errors, []); console.log('Four live themes, original palette/label contrast, unchanged YAML/project, saved choice, zoom-to-fit and mobile width verified.');
} finally { await browser.close(); }
