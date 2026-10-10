import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const prefix = '/api/hassio_ingress/test-session/';
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (!path.startsWith(prefix) || path.includes('..')) { res.writeHead(404).end(); return; }
  const file = path.slice(prefix.length) || 'index.html';
  if (file === 'api/ha/entities') {
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ entities: [] })); return;
  }
  try {
    const body = await readFile(new URL(`../dist/${file}`, import.meta.url));
    const ext = file.split('.').pop();
    res.setHeader('Content-Type', ({ html: 'text/html', js: 'text/javascript', css: 'text/css', svg: 'image/svg+xml', png: 'image/png' })[ext] || 'text/plain');
    res.end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const page = await browser.newPage(); const errors = []; const failures = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
  const root = process.env.BLOCKS_TEST_URL || `http://127.0.0.1:${server.address().port}${prefix}`;
  await page.goto(root);
  await page.locator('#valid-badge').waitFor();
  assert.equal(await page.locator('#valid-badge').textContent(), 'Gültig');
  if (!process.env.BLOCKS_TEST_URL) await page.locator('.local-badge').filter({ hasText: '0 Entitäten' }).waitFor();
  assert.equal(await page.locator('.brand').getAttribute('href'), './');
  await page.locator('#about').click();
  const href = await page.locator('#about-dialog a').last().getAttribute('href');
  assert.equal((await page.request.get(new URL(href, root).href)).status(), 200);
  assert.equal((await page.request.get(root + 'media/sprites.svg')).status(), 200);
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  console.log('Built editor, assets and licenses work beneath HA-style ingress prefix.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
