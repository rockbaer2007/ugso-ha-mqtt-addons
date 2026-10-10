import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const page = await browser.newPage();
  const svg = await readFile(new URL('../app/static/icon.svg', import.meta.url), 'utf8');
  for (const [file, size] of [['icon.png', 256], ['logo.png', 512]]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
    await page.screenshot({ path: fileURLToPath(new URL(`../${file}`, import.meta.url)), omitBackground: true });
  }
} finally { await browser.close(); }
