// Reproducible screenshots of real Blockly blocks in all supported languages.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const destination = resolve(process.env.BLOCK_DOC_IMAGES || '../../ugso-opensource-docs/docs/public/assets/blocks-for-ha/blocks');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  for (const locale of ['de', 'en', 'fr']) {
    const page = await browser.newPage({ viewport: { width: 2400, height: 1400 }, locale });
    await page.addInitScript(locale => localStorage.setItem('ugso-blocks-for-ha-language', locale), locale);
    await page.goto('http://127.0.0.1:4180/'); await page.waitForSelector('.blocklySvg');
    const types = await page.evaluate(async () => {
      const url = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/src/blocks.js').name;
      const { Blockly, knownTypes } = await import(url);
      const themeUrl = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/src/themes.js').name;
      window.docContrast = (await import(themeUrl)).contrastRatio;
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
    const selectedTypes=process.env.BLOCK_DOC_PREFIX?types.filter(type=>type.startsWith(process.env.BLOCK_DOC_PREFIX)):types;
    for (const type of selectedTypes) {
      const result = await page.evaluate(type => {
        const ws = window.docWorkspace; ws.clear();
        const block = ws.newBlock(type); block.initSvg(); block.render();
        ws.scrollCenter();
        const rect = block.getSvgRoot().getBoundingClientRect();
        const contrasts = [...block.getSvgRoot().querySelectorAll('text.blocklyText')].map(label => {
          const owner = block.getDescendants(false).find(candidate => candidate.getSvgRoot() === label.closest('g[data-id]')) || block;
          let background = owner.getSvgRoot().querySelector('.blocklyPath')?.getAttribute('fill') || owner.getColour();
          const rect = label.closest('.blocklyField')?.querySelector('rect.blocklyFieldRect');
          if (rect) {
            const style = getComputedStyle(rect), channels = style.fill.match(/[\d.]+/g)?.map(Number);
            if (channels) {
              const alpha = (channels[3] ?? 1) * Number(style.fillOpacity) * Number(style.opacity);
              const base = [1, 3, 5].map(i => parseInt(background.slice(i, i + 2), 16));
              background = '#' + base.map((value, i) => Math.round(channels[i] * alpha + value * (1 - alpha)).toString(16).padStart(2, '0')).join('');
            }
          }
          return window.docContrast(getComputedStyle(label).fill, background);
        });
        return { clip: { x: Math.max(0, rect.x - 3), y: Math.max(0, rect.y - 3), width: Math.ceil(rect.width + 6), height: Math.ceil(rect.height + 6) }, contrasts };
      }, type);
      assert.ok(result.contrasts.every(contrast => contrast >= 4.5), `${locale}:${type} label contrast`);
      await page.screenshot({ path: resolve(destination, locale, type + '.png'), clip: result.clip });
    }
    const jinjaDestination=resolve(destination,'../jinja');await mkdir(jinjaDestination,{recursive:true});
    const clip=await page.evaluate(async locale=>{
      const url=performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/jinja-blocks.js').name;
      const {createJinjaBlock}=await import(url),ws=window.docWorkspace;ws.clear();
      const title={de:'Wasser',en:'Water',fr:'Eau'}[locale];
      const block=createJinjaBlock(ws,`${title}: {{ states('sensor.pool') | float(0) | round(1) }} °C`);await window.docBlockly.renderManagement.finishQueuedRenders();ws.scrollCenter();
      const r=block.getSvgRoot().getBoundingClientRect();return{x:Math.max(0,r.x-4),y:Math.max(0,r.y-4),width:Math.ceil(r.width+8),height:Math.ceil(r.height+8)};
    },locale);
    await page.screenshot({path:resolve(jinjaDestination,locale+'.png'),clip});
    await page.close(); console.log(`${locale}: ${selectedTypes.length} actual block images and composed Jinja example rendered.`);
  }
} finally { await browser.close(); }
