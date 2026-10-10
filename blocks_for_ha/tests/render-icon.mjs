import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const page = await browser.newPage({ locale: 'de-DE', viewport: { width: 256, height: 256 } });
  await page.setContent('<style>body{margin:0}svg{display:block;width:256px;height:256px}</style>' + await readFile(new URL('../public/blocks-icon.svg', import.meta.url), 'utf8'));
  await page.screenshot({ path: new URL('../icon.png', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'), omitBackground: true });
} finally { await browser.close(); }
