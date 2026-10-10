import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import { customExample } from '../src/custom-example.js';
import { readPackageZip } from '../src/custom-packages.js';
const root = process.env.CATALOG_ROOT || 'C:/Users/rockb/source/repos/ugso-visualstudio-catalog';
const temp = await mkdtemp(tmpdir() + '/blocks-catalog-');
const probe = createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
const php = spawn(process.env.PHP_BIN || 'C:/xampp/php/php.exe', ['-S', `127.0.0.1:${port}`, '-t', 'public', 'public/router.php'], { cwd: root, env: { ...process.env, CATALOG_DATA: temp, CATALOG_LOCAL_PREVIEW: '1' }, stdio: 'ignore' });
const base = `http://127.0.0.1:${port}`;
let browser;
try {
  let response;
  for (let i = 0; i < 40; i++) { try { response = await fetch(base + '/blocks'); if (response.ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
  assert.equal(response.status, 200);
  assert.equal((await fetch(base + '/blocks/no_such_package')).status, 404);
  assert.equal((await fetch(base + '/blocks', { method: 'POST' })).status, 405);
  assert.equal((await fetch(base + '/blocks/ugso_sensor_tools/no_such_file')).status, 404);
  const json = await (await fetch(base + '/blocks/ugso_sensor_tools/json')).json(); assert.deepEqual(json, customExample);
  const zip = new Uint8Array(await (await fetch(base + '/blocks/ugso_sensor_tools/download')).arrayBuffer()); assert.deepEqual(await readPackageZip(zip), customExample);
  assert.deepEqual(await readdir(temp), []);
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ permissions: ['clipboard-read', 'clipboard-write'] }); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  for (const [locale, label] of [['de', 'Code kopieren'], ['en', 'Copy code'], ['fr', 'Copier le code']]) {
    await page.goto(base + '/blocks/ugso_sensor_tools?lang=' + locale);
    assert.equal(await page.locator('html').getAttribute('lang'), locale);
    await page.getByRole('button', { name: label, exact: true }).click();
    assert.deepEqual(JSON.parse(await page.evaluate(() => navigator.clipboard.readText())), customExample);
  }
  await page.setViewportSize({ width: 390, height: 844 }); await page.reload();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: 'artifacts/custom-catalog-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('Public catalog DE/EN/FR copy, JSON/ZIP equality, status codes, mobile and no private data writes verified.');
} finally { if (browser) await browser.close(); php.kill(); await new Promise(resolve => php.once('exit', resolve)); await rm(temp, { recursive: true, force: true }); }
