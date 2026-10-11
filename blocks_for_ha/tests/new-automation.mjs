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
    await page.locator('#new-automation').click();
    assert.equal(await page.locator('#backup-and-new').textContent(), { de: 'Sichern und neu beginnen', en: 'Save and start new', fr: 'Enregistrer et recommencer' }[locale]);
    assert.equal(await page.locator('#discard-and-new').textContent(), { de: 'Ohne Sicherung neu beginnen', en: 'Start new without saving', fr: 'Recommencer sans enregistrer' }[locale]);
    assert.equal(await page.locator('#cancel-new').textContent(), { de: 'Abbrechen', en: 'Cancel', fr: 'Annuler' }[locale]);
    await page.locator('#cancel-new').click();
    assert.deepEqual(await inspect(), before);
    assert.equal(await page.locator('#name').inputValue(), 'Keep my work');
    assert.equal(await page.locator('#yaml-input').inputValue(), 'pending YAML');
    await page.locator('#new-automation').click();
    await page.keyboard.press('Escape');
    assert.deepEqual(await inspect(), before);
    await page.locator('#new-automation').click();
    const pendingDownload = page.waitForEvent('download');
    await page.locator('#backup-and-new').click();
    const download = await pendingDownload;
    const { readFile } = await import('node:fs/promises');
    const backup = JSON.parse(await readFile(await download.path(), 'utf8'));
    assert.equal(backup.metadata.alias, 'Keep my work');
    assert.equal(backup.metadata.mode, 'queued');
    assert.equal(backup.languageReload.yaml, 'pending YAML');
    assert.ok(backup.workspace.blocks.blocks.length > 0);
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
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#project-file').setInputFiles({ name: download.suggestedFilename(), mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
    assert.equal(await page.locator('#name').inputValue(), 'Keep my work');
    assert.equal(await page.locator('#yaml-input').inputValue(), 'pending YAML');
    assert.ok((await inspect()).blocks > 0);
    await page.locator('#new-automation').click();
    await page.locator('#discard-and-new').click();
    assert.equal((await inspect()).blocks, 0);
    await page.reload(); await page.waitForSelector('.blocklySvg');
    assert.equal((await inspect()).blocks, 0);
    assert.deepEqual(errors, []);
    console.log(locale + ': localized confirmation, cancel, reset, undo and reload passed');
    await page.close();
  }
} finally { await browser.close(); }
