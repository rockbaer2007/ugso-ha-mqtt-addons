import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  for (const locale of ['de', 'en', 'fr']) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(locale => localStorage.setItem('ugso-blocks-for-ha-language', locale), locale);
    await page.goto('http://127.0.0.1:4180/'); await page.waitForSelector('.blocklySvg');
    await page.evaluate(async () => {
      const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
      const { Blockly } = await import(url); const ws = Blockly.getMainWorkspace(); ws.clear(); ws.setScale(1);
      window.scheduleBlock = ws.newBlock('ugso_schedule_trigger'); scheduleBlock.initSvg(); scheduleBlock.render();
      scheduleBlock.getField('CRON').showEditor_();
    });
    const title = { de: 'Zeitplan definieren', en: 'Define schedule', fr: 'Définir l’horaire' }[locale];
    assert.equal(await page.locator('#schedule-dialog h2').textContent(), title);
    if (process.env.SCHEDULE_DOC_IMAGES) {
      await mkdir(process.env.SCHEDULE_DOC_IMAGES, { recursive: true });
      await page.locator('#schedule-dialog').screenshot({ path: resolve(process.env.SCHEDULE_DOC_IMAGES, `schedule-${locale}.png`) });
    }
    const light = await page.locator('#schedule-dialog').evaluate(dialog => getComputedStyle(dialog).backgroundColor);
    await page.evaluate(() => { const control = document.querySelector('#appearance'); control.value = 'dark'; control.dispatchEvent(new Event('change')); });
    assert.notEqual(await page.locator('#schedule-dialog').evaluate(dialog => getComputedStyle(dialog).backgroundColor), light);
    assert.equal(await page.locator('#schedule-seconds').evaluate(input => Math.round(input.getBoundingClientRect().width)), 16);
    if (process.env.SCHEDULE_DOC_IMAGES) await page.locator('#schedule-dialog').screenshot({ path: resolve(process.env.SCHEDULE_DOC_IMAGES, `schedule-dark-${locale}.png`) });
    assert.equal(await page.locator('.schedule-tabs [role=tab]').count(), 5);
    await page.locator('#schedule-source').fill('0 7 1 * *');
    assert.equal(await page.locator('#schedule-ok').isDisabled(), true);
    await page.locator('#schedule-source').fill('*/5 * * * *');
    await page.locator('#schedule-seconds').check();
    assert.equal(await page.locator('.schedule-tabs [role=tab]').count(), 6);
    await page.locator('.schedule-tabs [role=tab]').nth(0).click();
    await page.locator('#schedule-component').fill('30');
    assert.equal(await page.locator('#schedule-source').inputValue(), '30 */5 * * * *');
    await page.locator('.schedule-modes input').nth(0).check();
    await page.locator('#schedule-kind').selectOption('time');
    await page.locator('#schedule-time').fill('07:30:00');
    await page.locator('#schedule-days').fill('1-5');
    assert.match(await page.locator('#schedule-preview').textContent(), /mon.*tue.*wed.*thu.*fri/);
    await page.locator('#schedule-ok').click();
    assert.equal(await page.evaluate(() => scheduleBlock.getFieldValue('CRON')), '0 30 7 * * 1-5');
    await page.evaluate(() => scheduleBlock.getField('CRON').showEditor_());
    await page.locator('.schedule-modes input').nth(1).check();
    await page.locator('#schedule-every').fill('5');
    assert.match(await page.locator('#schedule-preview').textContent(), /"minutes":"\/5"/);
    await page.locator('.schedule-modes input').nth(2).check();
    await page.locator('#schedule-source').fill('0 12 * * *');
    await page.locator('#schedule-cancel').click();
    assert.equal(await page.evaluate(() => scheduleBlock.getFieldValue('CRON')), '0 30 7 * * 1-5');
    await page.evaluate(() => scheduleBlock.getField('CRON').showEditor_());
    await page.keyboard.press('Escape');
    await page.locator('#schedule-dialog').waitFor({ state: 'detached' });
    assert.equal(await page.locator('#schedule-dialog').count(), 0);
    assert.deepEqual(errors, []); await page.close();
  }
  console.log('DE/EN/FR schedule popup: CRON tabs, seconds, validation, weekdays, save, cancel and Escape verified.');
} finally { await browser.close(); }
