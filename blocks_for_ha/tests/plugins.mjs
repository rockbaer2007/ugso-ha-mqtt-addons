import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { examples, toYaml } from '../src/model.js';
import { dateTemplate } from '../src/values.js';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const page = await browser.newPage({ locale: 'de-DE', viewport: { width: 1500, height: 1050 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', dialog => dialog.accept());
  await page.goto('http://127.0.0.1:4180/');
  const search = page.getByRole('searchbox', { name: 'Blocks suchen' }); await search.waitFor();
  assert.equal(await page.locator('.blocklyToolboxCategory').last().locator('input').count(), 1);
  await search.fill('Warte');
  await page.waitForFunction(async () => {
    const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
    const { Blockly } = await import(url);
    return Blockly.getMainWorkspace().getToolbox().getFlyout().getWorkspace().getBlocksByType('ugso_delay_action').length === 1;
  });
  assert.equal(await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
    const { Blockly } = await import(url);
    return Blockly.getMainWorkspace().getToolbox().getFlyout().getWorkspace().getBlocksByType('ugso_delay_action')[0].getInputTargetBlock('SECONDS').getFieldValue('NUM');
  }), 30);
  await search.fill('xyzzzz'); await page.waitForTimeout(100);
  assert.ok(await page.locator('.blocklyFlyout').getByText('Keine passenden Blocks', { exact: true }).count());
  const model = { ...examples.light, conditions: [{ condition: 'template', value_template: dateTemplate('2026-10-09', '>=') }], actions: [
    { action: 'light.turn_on', target: { entity_id: 'light.test' }, data: { rgb_color: [255, 136, 0], brightness_pct: 70 } },
    { action: 'timer.pause', target: { entity_id: 'timer.test' } },
    { action: 'system_log.write', data: { level: 'info', message: 'Zeile 1\nZeile 2' } }
  ] };
  await page.locator('#yaml-file').setInputFiles({ name: 'felder.yaml', mimeType: 'text/yaml', buffer: Buffer.from(toYaml(model)) });
  await page.waitForFunction(() => document.querySelector('#yaml').textContent.includes('rgb_color'));
  await page.locator('#fit').click();
  async function clickField(type, field) {
    const point = await page.evaluate(async ({ type, field }) => {
      const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
      const { Blockly } = await import(url);
      const r = Blockly.getMainWorkspace().getBlocksByType(type)[0].getField(field).getSvgRoot().getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, { type, field });
    await page.mouse.click(point.x, point.y);
  }
  await clickField('ugso_text', 'TEXT');
  const text = page.locator('textarea.blocklyHtmlInput'); await text.waitFor();
  await text.fill('Neu'); await text.press('Enter'); await text.press('N'); await text.press('Shift+Enter');
  await page.waitForFunction(() => document.querySelector('#yaml').textContent.includes('Neu'));
  await clickField('ugso_percent', 'NUM'); await page.locator('input[type="range"]').waitFor();
  await page.keyboard.press('Escape');
  await clickField('ugso_colour', 'COLOUR'); await page.locator('.blocklyDropDownDiv').waitFor({ state: 'visible' });
  await page.keyboard.press('Escape');
  await clickField('ugso_date_condition', 'DATE'); await page.locator('input[type="date"]').waitFor();
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'artifacts/plugins.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('Search placement/results/shadows, multiline editing, slider, colour palette and date picker verified.');

  if (process.env.BLOCKS_CATALOG_DIR) {
    await mkdir(process.env.BLOCKS_CATALOG_DIR, { recursive: true });
    const types = await page.evaluate(async () => {
      const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
      const { Blockly, knownTypes } = await import(url);
      Blockly.getMainWorkspace().getToolbox().clearSelection();
      const div = document.createElement('div'); div.id = 'catalog-render'; div.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#eaf0f5'; document.body.append(div);
      window.catalogWorkspace = Blockly.inject(div, { renderer: 'geras', media: './media/', sounds: false, zoom: { startScale: .8 }, theme: Blockly.getMainWorkspace().getTheme() });
      return [...knownTypes];
    });
    for (const type of types) {
      await page.evaluate(async type => {
        const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
        const { Blockly, toolbox } = await import(url);
        const ws = window.catalogWorkspace; Blockly.Events.disable(); ws.clear();
        const info = toolbox.contents.flatMap(c => c.contents || []).find(b => b.type === type) || (type === 'procedures_defreturn' ? { type, fields: { NAME: 'doppelt' }, extraState: { hasStatements: false, params: [{ name: 'x' }] }, inputs: { RETURN: { block: { type: 'variables_get', fields: { VAR: { name: 'x' } } } } } } : type === 'procedures_callreturn' ? { type, extraState: { name: 'doppelt', params: ['x'] }, inputs: { ARG0: { shadow: { type: 'ugso_number', fields: { NUM: 21 } } } } } : { type });
        const block = Blockly.serialization.blocks.append(info, ws); block.moveBy(30, 30);
        await Blockly.renderManagement.finishQueuedRenders(); block.getSvgRoot().setAttribute('data-catalog-block', 'true');
        Blockly.Events.enable();
      }, type);
      await page.locator('[data-catalog-block="true"]').screenshot({ path: `${process.env.BLOCKS_CATALOG_DIR}/${type}.png` });
    }
    console.log(`Rendered ${types.length} original block images for documentation.`);
  }
} finally { await browser.close(); }
