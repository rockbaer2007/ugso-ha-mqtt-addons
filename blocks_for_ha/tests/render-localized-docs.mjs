// Reproducible screenshots of real Blockly blocks in all supported languages.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const destination = resolve(process.env.BLOCK_DOC_IMAGES || '../ugso-opensource-docs/docs/public/assets/blocks-for-ha/blocks');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  for (const locale of ['de', 'en', 'fr']) {
    const page = await browser.newPage({ viewport: { width: 2400, height: 1400 }, locale });
    await page.addInitScript(locale => localStorage.setItem('ugso-blocks-for-ha-language', locale), locale);
    await page.goto('http://127.0.0.1:4180/'); await page.waitForSelector('.blocklySvg');
    const types = await page.evaluate(async () => {
      const url = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/src/blocks.js').name;
      const { Blockly, knownTypes } = await import(url);
      window.docBlockly = Blockly; window.docWorkspace = Blockly.getMainWorkspace();
      return [...knownTypes];
    });
    const themeDestination = resolve(destination, '../themes', locale);
    await mkdir(themeDestination, { recursive: true });
    for (const theme of ['dark', 'tritanopia']) {
      await page.locator('#theme').selectOption(theme);
      await page.locator('#fit').click();
      await page.locator('#workspace').screenshot({ path: resolve(themeDestination, theme + '.png') });
    }
    await page.locator('#theme').selectOption('standard');
    await page.evaluate(() => { window.docWorkspace.getToolbox().setVisible(false); window.docWorkspace.setScale(1); });
    await mkdir(resolve(destination, locale), { recursive: true });
    for (const type of types) {
      const clip = await page.evaluate(type => {
        const ws = window.docWorkspace; ws.clear();
        const block = ws.newBlock(type); block.initSvg(); block.render();
        ws.scrollCenter();
        const rect = block.getSvgRoot().getBoundingClientRect();
        return { x: Math.max(0, rect.x - 3), y: Math.max(0, rect.y - 3), width: Math.ceil(rect.width + 6), height: Math.ceil(rect.height + 6) };
      }, type);
      await page.screenshot({ path: resolve(destination, locale, type + '.png'), clip });
    }
    await page.close(); console.log(`${locale}: ${types.length} actual block images rendered.`);
  }
} finally { await browser.close(); }
