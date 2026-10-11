import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const key = 'ugso-blocks-for-ha-project-v1';
const labels = {
  de: ['Neue Automation', 'Willst du eine neue Automation beginnen? Alle aktuellen Blocks und Eingaben werden gelöscht. Sichere vorher dein Projekt.'],
  en: ['New automation', 'Start a new automation? All current blocks and inputs will be cleared. Save your project first.'],
  fr: ['Nouvelle automatisation', 'Commencer une nouvelle automatisation ? Tous les blocs et champs actuels seront effacés. Enregistrer le projet auparavant.'],
};
try {
  for (const locale of ['de', 'en', 'fr']) {
    const page = await browser.newPage({ locale });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/ha/*', route => route.fulfill({ json: { entities: [], actions: [], targets: {}, profiles: [], unavailable: [] } }));
    await page.goto('http://127.0.0.1:4180/');
    await page.waitForSelector('.blocklySvg');
    const inspect = () => page.evaluate(async () => {
      const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
      const workspace = (await import(url)).Blockly.getMainWorkspace();
      return { blocks: workspace.getAllBlocks(false).length, undo: workspace.getUndoStack().length };
    });
    assert.equal(await page.locator('#new-automation').textContent(), labels[locale][0]);
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#load-example').click();
    await page.locator('#name').fill('Keep my work');
    await page.locator('#mode').selectOption('queued');
    await page.locator('#yaml-mode').selectOption('import');
    await page.locator('#yaml-input').fill('pending YAML');
    await page.locator('#yaml-replace').check();
    const before = await inspect();
    assert.ok(before.blocks > 0);
    let message;
    page.once('dialog', async dialog => { message = dialog.message(); await dialog.dismiss(); });
    await page.locator('#new-automation').click();
    assert.equal(message, labels[locale][1]);
    assert.deepEqual(await inspect(), before);
    assert.equal(await page.locator('#name').inputValue(), 'Keep my work');
    assert.equal(await page.locator('#yaml-input').inputValue(), 'pending YAML');
    page.once('dialog', async dialog => { message = dialog.message(); await dialog.accept(); });
    await page.locator('#new-automation').click();
    assert.equal(message, labels[locale][1]);
    assert.deepEqual(await inspect(), { blocks: 0, undo: 0 });
    assert.equal(await page.locator('#name').inputValue(), '');
    assert.equal(await page.locator('#description').inputValue(), '');
    assert.equal(await page.locator('#mode').inputValue(), 'single');
    assert.equal(await page.locator('#yaml-input').inputValue(), '');
    assert.equal(await page.locator('#yaml-mode').inputValue(), 'output');
    assert.equal(await page.locator('#yaml-replace').isChecked(), false);
    assert.equal(await page.locator('#yaml').textContent(), '');
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    assert.deepEqual(saved.metadata, { mode: 'single' });
    await page.locator('#undo').click();
    assert.equal((await inspect()).blocks, 0);
    await page.reload(); await page.waitForSelector('.blocklySvg');
    assert.equal((await inspect()).blocks, 0);
    assert.deepEqual(errors, []);
    console.log(locale + ': localized confirmation, cancel, reset, undo and reload passed');
    await page.close();
  }
} finally { await browser.close(); }
