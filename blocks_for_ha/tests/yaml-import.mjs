import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1050 }, colorScheme: 'dark' });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:4180/');
  const mode = page.getByRole('combobox', { name: 'YAML-Modus' }); await mode.waitFor();
  const original = await page.locator('#yaml').textContent();
  const source = original.replace('Licht bei Bewegung', 'Eingefügte Automation')
    .replace('conditions: []', "conditions:\n  - condition: state\n    entity_id: input_boolean.test\n    state: 'on'")
    .replace('actions:\n', 'actions:\n  - variables:\n      imported_counter: 1\n');
  await mode.selectOption('import');
  await page.getByLabel('Aktuelle Automation vollständig ersetzen', { exact: true }).check();
  const input = page.getByRole('textbox', { name: 'YAML-Code zum Importieren' });
  const button = page.getByRole('button', { name: 'Importieren', exact: true });
  assert.equal(await button.isEnabled(), false); assert.equal(await page.locator('#yaml').isVisible(), false);
  await input.fill('alias: ['); await button.click();
  assert.ok(await page.locator('#yaml-import-error').isVisible());
  assert.equal(await page.locator('#yaml').textContent(), original);
  await input.fill('alias: Unsupported\ntriggers: []\nconditions: []\nactions: []\nunknown: true');
  await button.click(); assert.ok(await page.locator('#yaml-import-error').isVisible());
  assert.equal(await page.locator('#yaml').textContent(), original);
  await input.fill(source); await mode.selectOption('output'); await mode.selectOption('import');
  assert.equal(await input.inputValue(), source);
  page.once('dialog', d => d.dismiss()); await button.click();
  assert.equal(await page.locator('#yaml').textContent(), original);
  page.once('dialog', d => d.accept()); await button.click();
  assert.equal(await mode.inputValue(), 'output'); assert.equal(await page.locator('#name').inputValue(), 'Eingefügte Automation');
  const imported = await page.locator('#yaml').textContent();
  await mode.selectOption('import');
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
    const { Blockly } = await import(url); Blockly.getMainWorkspace().clear();
  });
  await page.waitForFunction(() => document.querySelector('#valid-badge').textContent === 'Prüfen');
  assert.equal(await button.isEnabled(), true);
  await input.fill('- ' + source.replaceAll('\n', '\n  '));
  page.once('dialog', d => d.accept()); await button.click();
  assert.equal(await page.locator('#yaml').textContent(), imported);
  await mode.selectOption('import');
  await page.getByLabel('Aktuelle Automation vollständig ersetzen', { exact: true }).uncheck();
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
    const { Blockly } = await import(url); window.originalIds = Blockly.getMainWorkspace().getAllBlocks(false).map(b => b.id);
  });
  await input.fill(source); await button.click();
  assert.equal(await mode.inputValue(), 'output');
  assert.equal(await page.locator('#name').inputValue(), 'Eingefügte Automation');
  assert.ok(await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
    const { Blockly } = await import(url), ws = Blockly.getMainWorkspace();
    return originalIds.every(id => ws.getBlockById(id)) && ws.getBlocksByType('ugso_state_trigger').length === 2 && ws.getBlocksByType('ugso_state_condition').length === 2;
  }));
  await mode.selectOption('import'); await input.fill(source);
  await page.screenshot({ path: 'artifacts/yaml-import-dark.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log('Pasted YAML: syntax/unsupported rejection, cancellation, object/list import, preserved input, recovery from empty workspace, output switch and mobile width verified.');
} finally { await browser.close(); }
