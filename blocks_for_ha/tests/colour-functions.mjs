import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const page = await browser.newPage({ locale: 'de-DE', viewport: { width: 1500, height: 1050 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:4180/'); await page.getByRole('searchbox', { name: 'Blocks suchen' }).waitFor();
  await page.locator('.blocklyToolboxCategory').filter({ hasText: /^Farbe$/ }).click();
  assert.equal(await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
    const { Blockly } = await import(url); return Blockly.getMainWorkspace().getToolbox().getFlyout().getWorkspace().getTopBlocks(false).length;
  }), 4);
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
    const { Blockly, modelWorkspace } = await import(url), { examples } = await import('/src/model.js'), ws = Blockly.getMainWorkspace();
    modelWorkspace(ws, { ...examples.light, actions: [{ variables: { result: 0 } }] });
    const def = Blockly.serialization.blocks.append({ type: 'procedures_defreturn', fields: { NAME: 'doppelt' }, extraState: { hasStatements: false, params: [{ name: 'x' }] }, inputs: { RETURN: { block: { type: 'variables_get', fields: { VAR: { name: 'x' } } } } } }, ws);
    ws.getToolbox().clearSelection(); ws.zoomToFit(); await Blockly.renderManagement.finishQueuedRenders();
    def.getIcon(Blockly.icons.MutatorIcon.TYPE).setBubbleVisible(true);
    await new Promise(resolve => setTimeout(resolve, 100));
    const mutator = def.getIcon(Blockly.icons.MutatorIcon.TYPE).getWorkspace();
    if (mutator.getBlocksByType('procedures_mutatorcontainer')[0].getInput('STATEMENT_INPUT')) throw new Error('Action checkbox should be absent');
    def.getIcon(Blockly.icons.MutatorIcon.TYPE).setBubbleVisible(false);
  });
  await page.locator('.blocklyToolboxCategory').filter({ hasText: /^Funktionen$/ }).click();
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
    const { Blockly, workspaceModel } = await import(url), ws = Blockly.getMainWorkspace(), flyout = ws.getToolbox().getFlyout().getWorkspace();
    const sample = flyout.getBlocksByType('procedures_callreturn')[0]; if (!sample || !sample.getInput('ARG0')) throw new Error('Dynamic call missing');
    const call = Blockly.serialization.blocks.append({ type: 'procedures_callreturn', extraState: sample.saveExtraState(), inputs: { ARG0: { shadow: { type: 'ugso_number', fields: { NUM: 42 } } } } }, ws);
    ws.getBlocksByType('ugso_variable_set')[0].getInput('VALUE').connection.connect(call.outputConnection);
    const before = workspaceModel(ws, { alias: 'Test', id: 'test', mode: 'single' });
    const saved = Blockly.serialization.workspaces.save(ws); Blockly.serialization.workspaces.load(saved, ws);
    if (JSON.stringify(workspaceModel(ws, { alias: 'Test', id: 'test', mode: 'single' })) !== JSON.stringify(before)) throw new Error('Function reload mismatch');
  });
  assert.equal(await page.locator('.blocklyToolboxCategory').last().locator('input').count(), 1);
  assert.deepEqual(errors, []); console.log('Colour flyout, original function mutator, dynamic parameter calls, search placement and rendered reload verified.');
} finally { await browser.close(); }
