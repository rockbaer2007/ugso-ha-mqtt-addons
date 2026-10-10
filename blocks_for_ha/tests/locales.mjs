import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ locale: 'fr-FR' }), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4180/');
  await page.waitForSelector('.blocklySvg');
  assert.equal(await page.locator('#block-language').inputValue(), 'system');
  await page.locator('.blocklyToolboxCategory').filter({ hasText: /^Variables$/ }).waitFor();
  assert.ok((await page.locator('.blocklyText').allTextContents()).join(' ').includes('Automatisation'));
  const before = await page.locator('#yaml').textContent();
  await page.locator('#name').fill('My name / mon nom / mein Name');
  await page.waitForTimeout(250);
  const yaml = await page.locator('#yaml').textContent();
  const original = await page.evaluate(() => JSON.parse(localStorage.getItem('ugso-blocks-for-ha-project-v1')));
  await page.locator('#yaml-mode').selectOption('import');
  await page.locator('#yaml-input').fill('alias: Draft / Brouillon / Entwurf');
  await page.locator('#yaml-replace').check();
  for (const [locale, label] of [['en', 'Automation'], ['de', 'Automation'], ['fr', 'Automatisation']]) {
    await page.locator('#block-language').selectOption(locale);
    await page.waitForSelector('.blocklySvg');
    await page.waitForTimeout(300);
    assert.equal(await page.locator('#block-language').inputValue(), locale);
    assert.equal(await page.locator('#yaml').textContent(), yaml);
    assert.equal(await page.locator('#yaml-input').inputValue(), 'alias: Draft / Brouillon / Entwurf');
    assert.equal(await page.locator('#yaml-mode').inputValue(), 'import');
    assert.equal(await page.locator('#yaml-replace').isChecked(), true);
    assert.ok((await page.locator('.blocklyText').allTextContents()).join(' ').includes(label));
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ugso-blocks-for-ha-project-v1')));
    assert.deepEqual(saved, original);
  }
  await page.locator('.blocklyToolboxCategory').filter({ hasText: /^Variables$/ }).click();
  assert.ok((await page.locator('.blocklyToolboxFlyout').textContent()).includes('Créer une variable'));
  const dynamic = await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/src/blocks.js').name;
    const { Blockly } = await import(url), ws = Blockly.getMainWorkspace();
    const block = ws.newBlock('ugso_logic_condition'); block.initSvg(); block.render();
    block.itemCount_ = 3; block.updateConditions_();
    const label = block.getInput('COND2').fieldRow[0].getText(); block.dispose();
    const helper = ws.newBlock('ugso_helper_action'); helper.initSvg(); helper.render(); helper.setFieldValue('counter', 'DOMAIN');
    const options = helper.getField('SERVICE').getOptions(false); helper.dispose();
    return { label, options };
  });
  assert.equal(dynamic.label, 'Condition 3');
  assert.ok(dynamic.options.some(([label, value]) => label === 'augmenter' && value === 'increment'));
  await page.evaluate(() => { localStorage.setItem('ugso-blocks-for-ha-language', 'invalid'); });
  await page.reload(); await page.waitForSelector('.blocklySvg');
  assert.equal(await page.locator('#block-language').inputValue(), 'system');
  // A valid project must not disappear when saving the language preference fails.
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('blocked'); }; });
  await page.locator('#block-language').selectOption('de');
  assert.equal(await page.locator('#block-language').inputValue(), 'system');
  assert.equal(await page.locator('#yaml').textContent(), yaml);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: 'artifacts/language-fr-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  assert.ok(before.includes('alias:'));
  console.log('System FR, DE/EN/FR reload, unchanged IDs/metadata/YAML, variable flyout, dependent dropdowns, mutators, blocked/invalid storage and mobile width verified.');
} finally { await browser.close(); }
