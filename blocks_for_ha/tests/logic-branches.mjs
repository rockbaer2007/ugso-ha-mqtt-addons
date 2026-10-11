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
    for (const [operator, label] of [['and', { de: 'und', en: 'and', fr: 'et' }[language]], ['or', { de: 'oder', en: 'or', fr: 'ou' }[language]]]) {
      const layout = await page.evaluate(async operator => {
        const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
        const { Blockly } = await import(url), ws = Blockly.getMainWorkspace(); ws.clear();
        const block = ws.newBlock('ugso_logic_condition'); block.initSvg(); block.render();
        block.loadExtraState({ items: 3 }); block.setFieldValue(operator, 'LOGIC');
        await Blockly.renderManagement.finishQueuedRenders();
        const icon = block.getIcon(Blockly.icons.MutatorIcon.TYPE); await icon.setBubbleVisible(true);
        const builder = icon.getWorkspace();
        const items = [...builder.getBlocksByType('ugso_condition_item'), ...builder.getFlyout().getWorkspace().getBlocksByType('ugso_condition_item')];
        const labels = items.map(item => item.getFieldValue('OPERATOR'));
        await icon.setBubbleVisible(false);
        const result = { inline: block.getInputsInline(), option: block.getField('LOGIC').getText(), repeated: block.getFieldValue('OPERATOR2'), labels, inputs: [0, 1, 2].map(i => block.getInput(`COND${i}`).connection.getCheck()) };
        block.loadExtraState({ items: 1 }); block.loadExtraState({ items: 3 });
        if (block.getFieldValue('LOGIC') !== operator) throw Error('Operator lost when resizing group');
        return result;
      }, operator);
      assert.equal(layout.inline, true); assert.equal(layout.option, label); assert.equal(layout.repeated, label);
      assert.equal(layout.labels.length, 4); assert.ok(layout.labels.every(text => text === label));
      assert.ok(layout.inputs.every(check => check.includes('Boolean')));
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('DE/EN/FR: expandable If and inline AND/OR inputs, operator-only labels in the real mutator including flyout, resizing and serialization verified.');
} finally { await browser.close(); }
