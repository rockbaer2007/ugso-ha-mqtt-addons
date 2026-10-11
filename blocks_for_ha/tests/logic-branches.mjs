import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  for (const [language, category] of [['de', 'Logik'], ['en', 'Logic'], ['fr', 'Logique']]) {
    const page = await browser.newPage({ locale: `${language}-${language.toUpperCase()}`, viewport: { width: 1600, height: 1100 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4180/');
    await page.locator('.blocklyToolboxCategory').first().waitFor();
    await page.locator('#block-language').selectOption(language);
    await page.locator('.blocklyToolboxCategory').filter({ hasText: new RegExp(`^${category}$`) }).click();
    const result = await page.evaluate(async () => {
      const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
      const { Blockly } = await import(url), ws = Blockly.getMainWorkspace();
      const source = ws.getToolbox().getFlyout().getWorkspace().getBlocksByType('ugso_if_action');
      if (source.length !== 1) throw Error('Expandable If missing from Logic');
      ws.getToolbox().clearSelection();
      const block = ws.newBlock('ugso_if_action'); block.initSvg(); block.render(); block.moveBy(300, 120);
      block.loadExtraState({ branches: 1, hasElse: true });
      await Blockly.renderManagement.finishQueuedRenders();
      const icon = block.getIcon(Blockly.icons.MutatorIcon.TYPE);
      await icon.setBubbleVisible(true);
      const mutator = icon.getWorkspace();
      const root = mutator.getBlocksByType('controls_if_if')[0];
      const elseIf = mutator.getBlocksByType('controls_if_elseif')[0];
      const otherwise = mutator.getBlocksByType('controls_if_else')[0];
      if (!root || !elseIf || !otherwise) throw Error('Branch builder incomplete');
      // Add an else-if using the actual mutator workspace, preserving the else branch.
      otherwise.previousConnection.disconnect();
      const added = mutator.newBlock('controls_if_elseif'); added.initSvg(); added.render();
      elseIf.nextConnection.connect(added.previousConnection);
      added.nextConnection.connect(otherwise.previousConnection);
      block.compose(root);
      await icon.setBubbleVisible(false);
      const saved = Blockly.serialization.blocks.save(block);
      block.dispose();
      const restored = Blockly.serialization.blocks.append(saved, ws);
      return { branches: restored.branchCount_, hasElse: restored.hasElse_, style: restored.getStyleName(), fields: restored.inputList.flatMap(i => i.fieldRow.map(f => f.name)).filter(Boolean) };
    });
    assert.equal(result.branches, 2); assert.equal(result.hasElse, true); assert.equal(result.style, 'ugso_logic');
    assert.ok(result.fields.includes('ELSE_TOGGLE'));
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('DE/EN/FR: Logic flyout, real gear branch builder, added else-if, else and rendered serialization verified.');
} finally { await browser.close(); }
