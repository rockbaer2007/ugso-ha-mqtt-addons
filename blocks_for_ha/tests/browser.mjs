import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
import { fromYaml, toYaml, examples } from '../src/model.js';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const context = await browser.newContext({ viewport: { width: 1500, height: 1050 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  await page.goto('http://127.0.0.1:4180/');
  await page.locator('#save').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#valid-badge').textContent(), 'Gültig');
  assert.match(await page.locator('#yaml').textContent(), /binary_sensor.flur_bewegung/);
  await page.locator('#name').fill('Meine Küchenbeleuchtung');
  await page.locator('#copy').click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  assert.equal(fromYaml(copied).alias, 'Meine Küchenbeleuchtung');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#save').click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), 'meine-kuchenbeleuchtung.yaml');
  const saved = await readFile(await download.path(), 'utf8');
  assert.equal(fromYaml(saved).alias, 'Meine Küchenbeleuchtung');
  await page.locator('#example').selectOption('battery');
  await page.locator('#load-example').click();
  assert.match(await page.locator('#yaml').textContent(), /below: 20/);
  await page.locator('#yaml-file').setInputFiles({ name: 'licht.yaml', mimeType: 'text/yaml', buffer: Buffer.from(saved) });
  await page.waitForFunction(() => document.getElementById('name').value === 'Meine Küchenbeleuchtung');
  assert.match(await page.locator('#yaml').textContent(), /light.turn_on/);
  const before = await page.locator('#yaml').textContent();
  await page.locator('#yaml-file').setInputFiles({ name: 'unbekannt.yaml', mimeType: 'text/yaml', buffer: Buffer.from(saved + '\nvariables:\n  verborgen: true\n') });
  await page.waitForFunction(() => document.getElementById('toast').textContent.includes('nicht unterstützt'));
  assert.equal(await page.locator('#yaml').textContent(), before);
  await page.reload();
  assert.equal(await page.locator('#name').inputValue(), 'Meine Küchenbeleuchtung');
  await page.locator('#format').selectOption('list');
  assert.match(await page.locator('#yaml').textContent(), /^- /);
  assert.equal(fromYaml(await page.locator('#yaml').textContent()).alias, 'Meine Küchenbeleuchtung');
  await page.locator('#about').click();
  assert.match(await page.locator('#about-dialog').textContent(), /Blockly/);
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  assert.equal((await page.request.get('http://127.0.0.1:4180/licenses/BLOCKLY-LICENSE.txt')).status(), 200);
  await mkdir('artifacts', { recursive: true });
  const branching = structuredClone(examples.light);
  branching.actions = [{ choose: [1, 2].map(n => ({ conditions: [{ condition: 'state', entity_id: 'sensor.test', state: String(n) }], sequence: [{ delay: n }] })), default: [{ delay: 9 }] }];
  await page.locator('#yaml-file').setInputFiles({ name: 'zweige.yaml', mimeType: 'text/yaml', buffer: Buffer.from(toYaml(branching)) });
  await page.waitForFunction(() => document.getElementById('yaml').textContent.includes('choose:'));
  await page.locator('.blocklyMutatorIcon').click();
  await page.locator('.blocklyMutatorBackground').waitFor({ state: 'visible' });
  await page.screenshot({ path: 'artifacts/branches.png', fullPage: true });
  await page.locator('.blocklyMutatorIcon').click();
  await page.reload();
  await page.waitForFunction(() => document.getElementById('yaml').textContent.includes('choose:'));
  assert.deepEqual(fromYaml(await page.locator('#yaml').textContent()), branching);
  // Check Blockly's real context menu and trash recovery, rather than a custom substitute.
  await page.locator('.blocklyDraggable').last().click({ button: 'right' });
  await page.locator('.blocklyContextMenu').waitFor({ state: 'visible' });
  assert.match(await page.locator('.blocklyContextMenu').textContent(), /Hilfe/);
  await page.keyboard.press('Escape');
  const deletedId = await page.evaluate(async () => {
    const moduleUrl = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/src/blocks.js').name;
    const { Blockly } = await import(moduleUrl);
    const workspace = Blockly.getMainWorkspace();
    workspace.trashcan.emptyContents();
    const block = workspace.newBlock('ugso_number'); block.initSvg(); block.render(); block.moveBy(40, 40); block.select(); block.getSvgRoot().focus();
    const id = block.id; block.dispose(true); return id;
  });
  await page.waitForFunction(async id => {
    const moduleUrl = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/src/blocks.js').name;
    const { Blockly } = await import(moduleUrl);
    return !Blockly.getMainWorkspace().getBlockById(id);
  }, deletedId);
  await page.locator('.blocklyTrash').click();
  const recovered = page.locator('.blocklyTrashcanFlyout .blocklyDraggable').first();
  await recovered.waitFor({ state: 'visible' });
  const box = await recovered.boundingBox(); const canvas = await page.locator('#workspace').boundingBox();
  await page.mouse.move(box.x + 10, box.y + 10); await page.mouse.down();
  await page.mouse.move(canvas.x + 350, canvas.y + 80, { steps: 20 }); await page.mouse.up();
  assert.deepEqual(await page.evaluate(async () => {
    const moduleUrl = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/src/blocks.js').name;
    const { Blockly } = await import(moduleUrl);
    return Blockly.getMainWorkspace().getTopBlocks(false).map(block => block.type).sort();
  }), ['ugso_automation', 'ugso_number']);
  await page.evaluate(async () => {
    const moduleUrl = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/src/blocks.js').name;
    const { Blockly } = await import(moduleUrl);
    Blockly.getMainWorkspace().getTopBlocks(false).find(block => block.type === 'ugso_number').dispose(true);
  });
  await page.locator('#workspace').click({ position: { x: 600, y: 40 } });
  await page.waitForFunction(() => document.getElementById('valid-badge').textContent === 'Gültig');
  const systemModel = { ...examples.light, actions: [
    { action: 'system_log.write', data: { message: 'Automation gestartet', level: 'info' } },
    { action: 'script.abendlicht' },
    { action: 'homeassistant.update_entity', target: { entity_id: 'sensor.temperatur' } }
  ] };
  await page.locator('#yaml-file').setInputFiles({ name: 'system.yaml', mimeType: 'text/yaml', buffer: Buffer.from(toYaml(systemModel)) });
  await page.waitForFunction(() => document.querySelector('#yaml').textContent.includes('system_log.write'));
  await page.locator('.blocklyToolboxCategory').filter({ hasText: 'System' }).click();
  assert.equal(await page.locator('.blocklyFlyout:not(.blocklyTrashcanFlyout) .blocklyDraggable').count() >= 3, true);
  assert.deepEqual(fromYaml(await page.locator('#yaml').textContent()), systemModel);
  await page.screenshot({ path: 'artifacts/system.png', fullPage: true });
  await page.locator('#workspace').click({ position: { x: 650, y: 40 } });
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#yaml')?.textContent.includes('system_log.write'));
  assert.deepEqual(fromYaml(await page.locator('#yaml').textContent()), systemModel);
  await page.screenshot({ path: 'artifacts/desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'artifacts/mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('Browser: Blocks, clipboard, YAML download/open, rejected import, reload, list format, licenses and mobile width verified.');
} finally { await browser.close(); }
