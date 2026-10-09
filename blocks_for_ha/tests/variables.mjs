import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { examples, toYaml } from '../src/model.js';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const page = await browser.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept('leistung'));
  await page.goto('http://127.0.0.1:4180/');
  await page.getByRole('treeitem', { name: 'Variablen', exact: true }).click();
  await page.locator('.blocklyFlyoutButton').filter({ hasText: 'Variable erstellen' }).click();
  await page.waitForFunction(async () => {
    const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
    const { Blockly } = await import(url);
    return !!Blockly.getMainWorkspace().getVariableMap().getVariable('leistung');
  });
  const model = { ...examples.light, actions: [{ variables: { leistung: 1250 } }, { action: 'system_log.write', data: { level: 'info', message: '{{ leistung }}' } }] };
  await page.locator('#yaml-file').setInputFiles({ name: 'variablen.yaml', mimeType: 'text/yaml', buffer: Buffer.from(toYaml(model)) });
  await page.waitForFunction(() => document.querySelector('#yaml').textContent.includes('variables:'));
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#yaml').textContent.includes('{{ leistung }}'));
  assert.equal(await page.locator('#valid-badge').textContent(), 'Gültig');
  assert.deepEqual(errors, []);
  console.log('Native create-variable dialog, YAML import and browser project reload verified.');
} finally { await browser.close(); }
