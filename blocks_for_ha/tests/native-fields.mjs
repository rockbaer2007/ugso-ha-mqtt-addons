import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fromYaml } from '../src/model.js';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const source = await readFile(new URL(process.argv[2] || './fixtures/pc-tv.yaml', import.meta.url), 'utf8');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ locale: 'de-DE', viewport: { width: 1500, height: 1050 } }), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4180/');
  await page.locator('#yaml-mode').selectOption('import');
  await page.getByLabel('Aktuelle Automation vollständig ersetzen', { exact: true }).check();
  await page.getByRole('textbox', { name: 'YAML-Code zum Importieren' }).fill('id: existing-id\n' + source);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Importieren', exact: true }).click();
  await page.waitForFunction(alias => document.querySelector('#yaml').textContent.includes('alias: ' + alias), fromYaml(source).alias);
  assert.deepEqual(fromYaml(await page.locator('#yaml').textContent()), fromYaml(source));
  await page.reload(); await page.waitForSelector('.blocklySvg');
  assert.deepEqual(fromYaml(await page.locator('#yaml').textContent()), fromYaml(source));
  await page.locator('#format').selectOption('list');
  assert.equal(fromYaml(await page.locator('#yaml').textContent()).id, 'existing-id');
  await page.locator('#format').selectOption('single');
  assert.equal(Object.hasOwn(fromYaml(await page.locator('#yaml').textContent()), 'id'), false);
  assert.deepEqual(errors, []);
  console.log(fromYaml(source).alias + ': complete YAML import, reload and editor/file-list ID output verified.');
} finally { await browser.close(); }
