import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  for (const locale of ['de', 'en', 'fr']) {
    const page = await browser.newPage({ locale, viewport: { width: 1600, height: 1000 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(locale => {
      localStorage.setItem('ugso-blocks-for-ha-language', locale);
      if (!localStorage.getItem('ugso-blocks-for-ha-appearance')) localStorage.setItem('ugso-blocks-for-ha-appearance', 'light');
    }, locale);
    await page.route('**/api/ha/*', route => route.fulfill({ json: { entities: [], actions: [], targets: {}, profiles: [], unavailable: [] } }));
    await page.goto('http://127.0.0.1:4180/');
    await page.waitForSelector('.blocklySvg');
    await page.evaluate(async () => {
      const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
      window.gridBlockly = (await import(url)).Blockly;
    });
    const read = () => page.evaluate(() => {
      const ws = gridBlockly.getMainWorkspace();
      const background = document.querySelector('#workspace .blocklySvg');
      const line = document.querySelector('#workspace pattern[id^="blocklyGridPattern"] line');
      return { background: getComputedStyle(background).backgroundColor, dot: getComputedStyle(line).stroke,
        pattern: getComputedStyle(document.querySelector('#workspace .blocklyMainBackground')).fill,
        spacing: ws.getGrid().getSpacing(), snap: ws.getGrid().shouldSnap(),
        project: gridBlockly.serialization.workspaces.save(ws), flyoutScale: ws.getFlyout().getFlyoutScale() };
    });
    const original = (await read()).project;
    for (const theme of ['standard', 'dark', 'modern', 'tritanopia']) {
      await page.locator('#theme').selectOption(theme);
      for (const [mode, background, dot] of [['dark', 'rgb(12, 21, 29)', 'rgb(96, 113, 125)'], ['light', 'rgb(250, 252, 251)', 'rgb(152, 170, 165)']]) {
        await page.locator('#appearance').selectOption(mode);
        const state = await read();
        assert.equal(state.background, background); assert.equal(state.dot, dot);
        assert.equal(state.spacing, 25); assert.equal(state.snap, true);
        assert.match(state.pattern, /blocklyGridPattern/, 'native grid pattern stays visible');
        assert.deepEqual(state.project, original, 'appearance does not alter blocks');
        if (theme === 'standard' && process.env.GRID_IMAGES) {
          await mkdir(`${process.env.GRID_IMAGES}/${locale}`, { recursive: true });
          await page.locator('#workspace').screenshot({ path: `${process.env.GRID_IMAGES}/${locale}/${mode}.png` });
        }
      }
    }
    await page.locator('#appearance').selectOption('system');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForFunction(() => document.documentElement.dataset.appearance === 'dark');
    assert.equal((await read()).background, 'rgb(12, 21, 29)');
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForFunction(() => document.documentElement.dataset.appearance === 'light');
    assert.equal((await read()).background, 'rgb(250, 252, 251)');
    await page.locator('#fit').click();
    assert.equal((await read()).flyoutScale, 1, 'palette remains fixed size');
    await page.evaluate(() => { const ws = gridBlockly.getMainWorkspace(); ws.setScale(1.5); ws.scroll(90, 60); });
    assert.equal((await read()).spacing, 25);
    await page.reload(); await page.waitForSelector('.blocklySvg');
    assert.equal(await page.locator('#appearance').inputValue(), 'system');
    assert.deepEqual(errors, []);
    console.log(`${locale}: palettes, light/dark/system grid, project preservation, zoom and reload passed`);
    await page.close();
  }
} finally { await browser.close(); }
