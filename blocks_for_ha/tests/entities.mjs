import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const page = await browser.newPage({ locale: 'de-DE', viewport: { width: 1500, height: 1050 } }), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let offline = false;
  const rows = [
    { entity_id: 'binary_sensor.kitchen_motion', domain: 'binary_sensor', name: 'Küche Bewegung', state: 'off', unit: '' },
    { entity_id: 'light.kitchen', domain: 'light', name: 'Küche Licht', state: 'on', unit: '' },
    { entity_id: 'script.evening', domain: 'script', name: '<img src=x onerror=alert(1)>', state: 'off', unit: '' },
    { entity_id: 'counter.test', domain: 'counter', name: 'Zähler', state: '2', unit: '' },
  ];
  await page.route('**/api/ha/entities', route => route.fulfill({ status: offline ? 503 : 200, contentType: 'application/json', body: JSON.stringify(offline ? { error: 'HA offline. Manuelle IDs bleiben möglich.' } : { entities: rows }) }));
  await page.route('**/api/ha/actions',route=>route.fulfill({json:{actions:[]}}));
  await page.route('**/api/ha/targets',route=>route.fulfill({json:{targets:{},unavailable:[]}}));
  await page.goto('http://127.0.0.1:4180/');
  await page.locator('.local-badge').filter({ hasText: '4 Entitäten' }).waitFor();
  const before = await page.locator('#yaml').textContent();
  await page.locator('#workspace text').filter({ hasText: /^binary_sensor\.flur_bewegung\s▾$/ }).click();
  await page.locator('#entity-dialog').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#entity-results img').count(), 0);
  await page.locator('#entity-search').fill('küche motion');
  assert.equal(await page.locator('.entity-result').count(), 1);
  await page.locator('.entity-result').click();
  assert.equal(await page.locator('#yaml').textContent(), before);
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  assert.equal(await page.locator('#yaml').textContent(), before);
  await page.locator('#workspace text').filter({ hasText: /^binary_sensor\.flur_bewegung\s▾$/ }).click();
  await page.locator('#entity-search').fill('küche motion'); await page.locator('.entity-result').click();
  await mkdir('artifacts', { recursive: true });
  if (process.env.BLOCKS_ENTITY_IMAGE) await page.locator('#entity-dialog').screenshot({ path: process.env.BLOCKS_ENTITY_IMAGE });
  await page.getByRole('button', { name: 'Übernehmen', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#yaml').textContent.includes('binary_sensor.kitchen_motion'));
  await page.reload();
  await page.locator('#workspace text').filter({ hasText: /^binary_sensor\.kitchen_motion\s▾$/ }).waitFor();
  assert.ok(!(await page.locator('#yaml').textContent()).includes('Küche Bewegung'));
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
    const { Blockly } = await import(url), ws = Blockly.getMainWorkspace();
    const block = ws.newBlock('ugso_helper_action'); block.setFieldValue('counter', 'DOMAIN'); block.initSvg(); block.render(); block.moveBy(300, 400); ws.zoomToFit();
  });
  await page.locator('#workspace text').filter({ hasText: /^input_boolean\.test\s▾$/ }).click();
  assert.equal(await page.locator('.entity-result').count(), 1);
  assert.equal(await page.locator('.entity-result').getAttribute('data-entity'), 'counter.test');
  await page.locator('#entity-id').fill('light.kitchen');
  await page.getByRole('button', { name: 'Übernehmen', exact: true }).click();
  assert.match(await page.locator('#entity-error').textContent(), /counter/);
  await page.keyboard.press('Escape');
  offline = true; await page.locator('#entities-refresh').click();
  await page.locator('.local-badge').filter({ hasText: 'manuelle' }).waitFor();
  await page.locator('#workspace text').filter({ hasText: /^binary_sensor\.kitchen_motion\s▾$/ }).click();
  assert.equal(await page.locator('.entity-result').count(), 0);
  await page.locator('#entity-id').fill('broken-id'); await page.getByRole('button', { name: 'Übernehmen', exact: true }).click();
  assert.match(await page.locator('#entity-error').textContent(), /Passende ID/);
  await page.locator('#entity-id').fill('binary_sensor.manual'); await page.getByRole('button', { name: 'Übernehmen', exact: true }).click();
  await page.locator('#workspace text').filter({ hasText: /^binary_sensor\.manual\s▾$/ }).waitFor();
  await page.locator('#workspace text').filter({ hasText: /^binary_sensor\.manual\s▾$/ }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('#entity-dialog').getBoundingClientRect().right <= innerWidth), true);
  await page.screenshot({ path: 'artifacts/entities-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('Entity selection, search, cancel, domain filtering, manual fallback, reload, safe labels and mobile dialog verified.');
} finally { await browser.close(); }
