import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const url = process.env.STUDIO_TEST_URL;

test('Runtime hiding checkbox persists and hidden Number still supplies values', { skip: !url }, async () => {
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const browser = await chromium.launch({ headless: true, channel: process.env.STUDIO_THEME_BROWSER || undefined });
  try {
    const page = await browser.newPage();
    const fixture = await (await page.request.get(new URL('api/project', url).href)).json();
    fixture.currentPageId = fixture.pages[0].id;
    fixture.settings = { ...fixture.settings, autoSave: false };
    fixture.pages[0].widgets = [
      { id: 'source', type: 'sensor', x: 40, y: 40, width: 180, height: 100, state: '42', factor: 1, digits: 1, dataOutputEnabled: true },
      { id: 'target', type: 'sensor', x: 400, y: 40, width: 180, height: 100, state: '999', factor: 1, digits: 1, dataInputEnabled: true },
      { id: 'line', type: 'svg-connection', dataFlowVariant: 'value-connection', startWidgetId: 'source', startAnchor: 'right-center', endWidgetId: 'target', endAnchor: 'left-center' }
    ];
    let saved;
    await page.route('**/api/project*', route => {
      if (route.request().method() === 'PUT') saved = route.request().postDataJSON();
      return route.fulfill({ json: saved || fixture });
    });
    await page.route('**/api/entities*', route => route.fulfill({ json: { entities: [], states: [] } }));
    await page.route('**/api/states*', route => route.fulfill({ json: { states: [] } }));
    await page.goto(url);
    await page.locator('#source').click({ position: { x: 5, y: 5 } });
    await page.getByRole('button', { name: 'WIDGET', exact: true }).click();
    const checkbox = page.locator('#properties [data-property-key="hideInRuntime"]');
    assert.equal(await checkbox.count(), 1);
    await checkbox.check();
    assert.equal(await page.locator('#source').count(), 1);
    await page.locator('#save').click();
    await page.waitForFunction(() => document.querySelector('#status')?.textContent.includes('gespeichert'));
    assert.equal(saved.pages[0].widgets.find(widget => widget.id === 'source').hideInRuntime, true);
    await page.reload();
    assert.equal(await page.locator('#source').count(), 1);
    await page.goto(new URL('?mode=runtime', url).href);
    assert.equal(await page.locator('#source').count(), 0);
    assert.match(await page.locator('#target .value').textContent(), /42/);
  } finally { await browser.close(); }
});
