import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  for (const locale of ['de', 'en', 'fr']) {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(locale => localStorage.setItem('ugso-blocks-for-ha-language', locale), locale);
    await page.goto('http://127.0.0.1:4180/'); await page.waitForSelector('.blocklySvg');
    await page.evaluate(async () => {
      const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
      const { Blockly, toolbox } = await import(url), ws = Blockly.getMainWorkspace(); ws.clear();
      const entry = toolbox.contents.find(c => c.name === 'Text');
      for (const item of entry.contents) for (const [name, input] of Object.entries(item.inputs || {})) {
        if (input.shadow?.type === 'ugso_text' && name !== 'DELIMITER' && input.shadow.fields.TEXT !== '') throw Error('Text palette must start empty: ' + item.type);
      }
      const join = Blockly.serialization.blocks.append(entry.contents.find(b => b.type === 'ugso_text_join'), ws);
      if (join.getInputTargetBlock('V0')) throw Error('Text join must have a free socket');
      const text = ws.newBlock('ugso_text'); text.initSvg(); text.render();
      if (text.getFieldValue('TEXT') !== '' || text.getField('TEXT').constructor !== Blockly.FieldTextInput) throw Error('Plain empty text input required');
      window.plainText = text; window.plainBlockly = Blockly;
      ws.centerOnBlock(text.id); text.getField('TEXT').showEditor_();
    });
    const input = page.locator('.blocklyWidgetDiv input.blocklyHtmlInput');
    await input.waitFor(); assert.equal(await page.locator('.blocklyWidgetDiv textarea').count(), 0);
    assert.doesNotMatch(await page.locator('.blocklyWidgetDiv').innerText(), /New line|Finish editing/);
    await input.fill('Eigener Text ä🙂'); await input.press('Enter');
    assert.equal(await page.evaluate(() => window.plainText.getFieldValue('TEXT')), 'Eigener Text ä🙂');
    await page.evaluate(() => {
      const ws = window.plainText.workspace, id = window.plainText.id;
      window.plainText.setFieldValue('Saved\nmultiline\r\ntext', 'TEXT');
      window.plainBlockly.serialization.workspaces.load(JSON.parse(JSON.stringify(window.plainBlockly.serialization.workspaces.save(ws))), ws);
      if (ws.getBlockById(id).getFieldValue('TEXT') !== 'Saved\nmultiline\r\ntext') throw Error('Project reload lost existing text');
    });
    assert.deepEqual(errors, []); await page.close();
  }
  console.log('DE/EN/FR: empty single-line text editor, no hint row or Hello shadow, editing and existing text reload verified.');
} finally { await browser.close(); }
