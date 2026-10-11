import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  for (const locale of ['de', 'en', 'fr']) {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(locale => localStorage.setItem('ugso-blocks-for-ha-language', locale), locale);
    await page.goto('http://127.0.0.1:4180/'); await page.waitForSelector('.blocklySvg');
    const checked = await page.evaluate(async () => {
      const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
      const { Blockly, definitions } = await import(url), ws = Blockly.getMainWorkspace(); ws.clear();
      const settle = async () => { await new Promise(r => setTimeout(r, 150)); await Blockly.renderManagement.finishQueuedRenders(); };
      const checked = [];
      for (const type of [...definitions.map(d => d.type), 'procedures_defreturn', 'procedures_defnoreturn']) {
        const block = ws.newBlock(type); block.initSvg(); block.render();
        const icon = block.getIcon(Blockly.icons.MutatorIcon.TYPE);
        if (!icon) { block.dispose(); continue; }
        await icon.setBubbleVisible(true); await settle();
        const popup = icon.getWorkspace(), root = popup.getTopBlocks(false)[0];
        const connection = root.getInput('STACK')?.connection || root.nextConnection;
        if (!connection) throw Error(type + ': unknown builder layout');
        let itemType = popup.getFlyout().getWorkspace().getTopBlocks(false).find(b => !popup.getBlocksByType(b.type).length)?.type;
        if (!itemType && !block.haOptionRows_ && !type.endsWith('_control') && !block.getField('PROPERTY')) itemType = popup.getFlyout().getWorkspace().getTopBlocks(false)[0]?.type;
        const old = connection.targetBlock();
        if (!itemType && old) {
          itemType = old.type; old.dispose(true); await settle();
        }
        if (!itemType) throw Error(type + ': no editable option');
        const before = JSON.stringify(block.saveExtraState?.()), size = block.getHeightWidth();
        const item = popup.newBlock(itemType); item.initSvg(); item.render();
        if (itemType === 'procedures_mutatorarg') item.setFieldValue('parameter1', 'NAME');
        const previous = connection.targetConnection;
        if (previous) connection.disconnect();
        connection.connect(item.previousConnection);
        if (previous) item.nextConnection.connect(previous);
        await settle();
        const after = JSON.stringify(block.saveExtraState?.()), expanded = block.getHeightWidth();
        if (before === after) throw Error(type + ': adding did not update main state');
        if (expanded.height === size.height && expanded.width === size.width) throw Error(type + ': adding did not resize main block with popup open');
        item.dispose(true); await settle();
        const restored = block.getHeightWidth();
        if (JSON.stringify(block.saveExtraState?.()) !== before) throw Error(type + ': removing did not restore state');
        if (restored.height !== size.height || restored.width !== size.width) throw Error(type + ': removing did not restore main dimensions');
        await icon.setBubbleVisible(false); await settle();
        checked.push(type); ws.clear();
      }
      return checked;
    });
    assert.ok(checked.includes('ugso_and')); assert.ok(checked.includes('ugso_or')); assert.ok(checked.includes('ugso_object_new'));
    assert.deepEqual(errors, []); console.log(locale + ': ' + checked.length + ' gears updated live: ' + checked.join(', '));
    await page.close();
  }
} finally { await browser.close(); }
