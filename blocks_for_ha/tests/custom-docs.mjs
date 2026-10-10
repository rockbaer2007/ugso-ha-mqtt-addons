import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { createRequire } from 'node:module';
import { customExample } from '../src/custom-example.js';
import { readPackageZip } from '../src/custom-packages.js';
import { knownTypes } from '../src/blocks.js';
const root = resolve(process.env.DOCS_DIST || 'C:/Users/rockb/source/repos/ugso-opensource-docs/docs/.vitepress/dist');
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = resolve(root, '.' + path);
    if (!file.startsWith(root + sep)) throw new Error('path');
    if (path.endsWith('/')) file += '/index.html';
    else if (!path.split('/').at(-1).includes('.')) file += '.html';
    const body = await readFile(file);
    const ext = file.split('.').at(-1);
    res.setHeader('Content-Type', { html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', zip: 'application/zip', svg: 'image/svg+xml' }[ext] || 'application/octet-stream');
    res.end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ permissions: ['clipboard-read', 'clipboard-write'] }), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  for (const [prefix, label] of [['', 'JSON-Code kopieren'], ['/en', 'Copy JSON code'], ['/fr', 'Copier le code JSON']]) {
    await page.goto(base + prefix + '/projects/blocks-for-ha/catalog/sensor-light');
    await page.getByRole('button', { name: label }).click();
    assert.deepEqual(JSON.parse(await page.evaluate(() => navigator.clipboard.readText())), customExample);
  }
  const path = '/assets/blocks-for-ha/packages/ugso_sensor_tools-1.0.0';
  assert.deepEqual(await (await fetch(base + path + '.json')).json(), customExample);
  assert.deepEqual(await readPackageZip(new Uint8Array(await (await fetch(base + path + '.zip')).arrayBuffer())), customExample);
  for (const suffix of ['', 'time', 'conversion', 'collections', 'flow', 'entities', 'themes', 'custom-blocks', 'blockly-audit', 'catalog/']) {
    const response = await page.goto(base + '/fr/projects/blocks-for-ha/' + suffix);
    assert.equal(response.status(), 200, suffix);
  }
  for (const [prefix, locale] of [['', 'de'], ['/en', 'en'], ['/fr', 'fr']]) {
    await page.goto(base + prefix + '/projects/blocks-for-ha/blocks');
    const images = await page.locator(`img[src^="/assets/blocks-for-ha/blocks/${locale}/"]`).evaluateAll(images => images.map(image => ({ src: image.src, width: image.naturalWidth })));
    assert.equal(images.length, knownTypes.size, locale);
    assert.ok(images.every(image => image.width > 0), locale + ' missing image');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: 'artifacts/custom-docs-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('Built DE/EN/FR documentation copy buttons, JSON/ZIP equality and mobile width verified.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
