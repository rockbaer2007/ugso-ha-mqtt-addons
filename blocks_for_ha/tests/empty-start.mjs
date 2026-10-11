import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const key = 'ugso-blocks-for-ha-project-v1';
try {
  for (const locale of ['de', 'en', 'fr']) {
    const page = await browser.newPage({ locale });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', dialog => dialog.accept());
    await page.route('**/api/ha/*', route => route.fulfill({ json: { entities: [], actions: [], targets: {}, profiles: [], unavailable: [] } }));
    await page.goto('http://127.0.0.1:4180/');
    const count = () => page.evaluate(async () => {
      const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
      return (await import(url)).Blockly.getMainWorkspace().getAllBlocks(false).length;
    });
    await page.waitForSelector('.blocklySvg');
    assert.equal(await count(), 0); assert.equal(await page.locator('#name').inputValue(), '');
    assert.equal(await page.locator('#mode').inputValue(), 'single');
    assert.equal(await page.locator('#yaml').textContent(), '');
    await page.locator('#block-language').selectOption(locale);
    await page.waitForLoadState('load'); await page.waitForSelector('.blocklySvg');
    assert.equal(await count(), 0, 'empty language change remains empty');
    await page.reload(); await page.waitForSelector('.blocklySvg');
    assert.equal(await count(), 0, 'saved empty project reloads');
    await page.locator('#load-example').click();
    assert.ok(await count() > 0, 'explicit example loads');
    const name = await page.locator('#name').inputValue();
    await page.reload(); await page.waitForSelector('.blocklySvg');
    assert.ok(await count() > 0, 'saved work resumes');
    assert.equal(await page.locator('#name').inputValue(), name);
    await page.evaluate(key => localStorage.setItem(key, '{broken'), key);
    await page.reload(); await page.waitForSelector('.blocklySvg');
    assert.equal(await count(), 0, 'corrupt project never opens an example');
    await page.locator('#yaml-mode').selectOption('import');
    await page.locator('#yaml-input').fill('alias: Imported\ntriggers:\n  - trigger: homeassistant\n    event: start\nactions:\n  - action: light.turn_on\n    target:\n      entity_id: light.demo\n');
    await page.locator('#yaml-replace').uncheck();
    await page.locator('#save').click();
    assert.equal(await page.locator('#yaml-mode').inputValue(), 'output');
    assert.equal(await page.locator('#name').inputValue(), 'Imported');
    assert.ok(await count() > 0, 'import into empty editor works without replace');
    assert.deepEqual(errors, []);
    console.log(`${locale}: empty start, language/reload, explicit example, saved project and YAML import passed`);
    await page.close();
  }
} finally { await browser.close(); }
