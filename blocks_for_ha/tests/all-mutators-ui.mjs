import assert from 'node:assert/strict';
// PRESERVE_MUTATOR_VALUES=1 adds attached-value and project-reload checks.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  for (const locale of ['de', 'en', 'fr']) {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(locale => localStorage.setItem('ugso-blocks-for-ha-language', locale), locale);
    await page.goto('http://127.0.0.1:4180/'); await page.waitForSelector('.blocklySvg');
    const checked = await page.evaluate(async preserve => {
      const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
      const { Blockly, definitions } = await import(url), ws = Blockly.getMainWorkspace(); ws.clear();
      const settle = async () => { await new Promise(r => setTimeout(r, 150)); await Blockly.renderManagement.finishQueuedRenders(); };
      const checked = [];
      for (const type of [...definitions.map(d => d.type), 'procedures_defreturn', 'procedures_defnoreturn']) {
        const block = ws.newBlock(type); block.initSvg(); block.render();
        const icon = block.getIcon(Blockly.icons.MutatorIcon.TYPE);
        if (!icon) { block.dispose(); continue; }
        const children = () => Object.fromEntries(block.inputList.filter(i => i.connection?.targetBlock()).map(i => [i.name, Blockly.serialization.blocks.save(i.connection.targetBlock())]));
        if (preserve) {
          let index = 0;
          for (const input of block.inputList) {
            if (!input.connection || input.connection.targetBlock()) continue;
            for (const candidate of ['ugso_text', 'ugso_number', 'ugso_boolean', 'ugso_stop', 'ugso_start_trigger']) {
              const value = ws.newBlock(candidate);
              const connection = value.outputConnection || value.previousConnection;
              if (!ws.connectionChecker.canConnect(input.connection, connection, false)) { value.dispose(); continue; }
              if (value.getField('TEXT')) value.setFieldValue('preserved text ' + index, 'TEXT');
              if (value.getField('NUM')) value.setFieldValue(37 + index, 'NUM');
              if (value.getField('BOOL')) value.setFieldValue('false', 'BOOL');
              if (value.getField('REASON')) value.setFieldValue('preserved action ' + index, 'REASON');
              value.initSvg(); value.render(); input.connection.connect(connection); index++; break;
            }
          }
          if (type === 'ugso_object_new') block.setFieldValue('custom_key', 'KEY0');
        }
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
        const attached = children();
        const item = popup.newBlock(itemType); item.initSvg(); item.render();
        if (itemType === 'procedures_mutatorarg') item.setFieldValue('parameter1', 'NAME');
        const previous = connection.targetConnection;
        if (previous) connection.disconnect();
        connection.connect(item.previousConnection);
        if (previous) item.nextConnection.connect(previous);
        await settle();
        const after = JSON.stringify(block.saveExtraState?.()), expanded = block.getHeightWidth();
        if (before === after) throw Error(type + ': adding did not update main state');
        if (!preserve && expanded.height === size.height && expanded.width === size.width) throw Error(type + ': adding did not resize main block with popup open');
        if (preserve) for (const [name, child] of Object.entries(attached)) {
          if (!Object.values(children()).some(value => JSON.stringify(value) === JSON.stringify(child))) throw Error(type + ': adding lost connected values from ' + name);
        }
        item.dispose(true); await settle();
        const restored = block.getHeightWidth();
        if (JSON.stringify(block.saveExtraState?.()) !== before) throw Error(type + ': removing did not restore state');
        if (restored.height !== size.height || restored.width !== size.width) throw Error(type + ': removing did not restore main dimensions');
        if (preserve && JSON.stringify(children()) !== JSON.stringify(attached)) throw Error(type + ': removing lost connected values');
        await icon.setBubbleVisible(false); await settle();
        if (preserve) {
          const saved = Blockly.serialization.workspaces.save(ws), id = block.id;
          Blockly.serialization.workspaces.load(JSON.parse(JSON.stringify(saved)), ws); await settle();
          const reloaded = ws.getBlockById(id);
          if (JSON.stringify(reloaded.saveExtraState?.()) !== before) throw Error(type + ': reload changed options');
          for (const [name, child] of Object.entries(attached)) {
            const target = reloaded.getInputTargetBlock(name);
            if (!target || JSON.stringify(Blockly.serialization.blocks.save(target)) !== JSON.stringify(child)) throw Error(type + ': reload lost values at ' + name);
          }
          if (type === 'ugso_object_new' && reloaded.getFieldValue('KEY0') !== 'custom_key') throw Error('Object reload lost key');
        }
        checked.push(type); ws.clear();
      }
      return checked;
    }, process.env.PRESERVE_MUTATOR_VALUES === '1');
    assert.ok(checked.includes('ugso_and')); assert.ok(checked.includes('ugso_or')); assert.ok(checked.includes('ugso_object_new'));
    assert.deepEqual(errors, []); console.log(locale + ': ' + checked.length + ' gears updated live: ' + checked.join(', '));
    await page.close();
  }
} finally { await browser.close(); }
