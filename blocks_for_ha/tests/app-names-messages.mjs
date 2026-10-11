import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  for (const [folder, name] of [['callmebot','CallMeBot Whatsapp'], ['callmebot_signal','CallMeBot Signal']]) {
    const root = new URL('../../' + folder + '/app/', import.meta.url);
    const core = await readFile(new URL('core.py', root), 'utf8');
    const codes = [...new Set([...core.matchAll(/Failure\("([a-z_]+)"\)/g)].map(match => match[1]))];
    const server = createServer(async (request, response) => {
      const files = { '/':'index.html', '/app.js':'app.js', '/style.css':'style.css', '/request-id.mjs':'request-id.mjs', '/icon.svg':'icon.svg' };
      const file = files[request.url];
      if (!file) { response.writeHead(404); response.end(); return; }
      response.setHeader('Content-Type', file.endsWith('.js') || file.endsWith('.mjs') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.svg') ? 'image/svg+xml' : 'text/html');
      response.end(await readFile(new URL('static/' + file, root)));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      for (const [locale, index] of [['de',0], ['en',1], ['fr',2]]) {
        const page = await browser.newPage({ locale });
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        let failure;
        await page.route('**/api/**', route => {
          assert.equal(route.request().method(), 'GET', 'verification must never send a real message');
          return route.fulfill({ status: failure ? 400 : 200, json: failure ? {error:failure} : {profiles:[],default_profile:'',connected:false,recent:[],csrf:'test'} });
        });
        await page.goto('http://127.0.0.1:' + server.address().port + '/');
        await page.waitForFunction(() => document.querySelector('#profiles').options.length > 0);
        assert.equal(await page.title(), name);
        assert.ok((await page.locator('.brand').textContent()).startsWith(name));
        const translations = await page.evaluate(async () => (await import('./app.js')).translations);
        if (process.env.APP_DOC_IMAGES) {
          const { mkdir } = await import('node:fs/promises');
          const images = process.env.APP_DOC_IMAGES + '/' + (folder === 'callmebot_signal' ? 'callmebot-signal' : 'callmebot');
          await mkdir(images, {recursive:true});
          await page.screenshot({path:images + '/' + locale + '.png',fullPage:true});
        }
        for (const [id, values] of Object.entries(translations)) {
          assert.equal(values.length, 3, id);
          assert.ok(values.every(value => typeof value === 'string' && value.trim()), id);
        }
        for (const code of codes) {
          assert.ok(translations[code], 'missing backend error translation: ' + code);
          failure = code;
          await page.locator('#refresh').click();
          await page.waitForFunction(({code, expected}) => document.querySelector('#notice').dataset.code === code && document.querySelector('#notice').textContent === expected, {code, expected:translations[code][index]});
        }
        await page.locator('#language').selectOption(locale === 'de' ? 'en' : 'de');
        assert.equal(await page.locator('#notice').textContent(), translations[failure][locale === 'de' ? 1 : 0]);
        assert.deepEqual(errors, []);
        await page.close();
        console.log(name + ' ' + locale + ': name, all translation rows and ' + codes.length + ' backend errors passed');
      }
    } finally { await new Promise(resolve => server.close(resolve)); }
  }
} finally { await browser.close(); }
