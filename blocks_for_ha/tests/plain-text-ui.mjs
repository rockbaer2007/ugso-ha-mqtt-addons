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
      let checked = 0;
      const audit = (item, inputName = '') => {
        if (item.type === 'ugso_text') {
          const value = item.fields?.TEXT || '';
          if (value !== '' && !(['DELIMITER', 'START', 'END'].includes(inputName) || value === '{}')) throw Error('Unexpected example text: ' + JSON.stringify(item));
          checked++;
        }
        for (const [name, input] of Object.entries(item.inputs || {})) if (input.shadow || input.block) audit(input.shadow || input.block, name);
        for (const child of item.contents || []) audit(child);
      };
      audit(toolbox);
      if (checked < 20) throw Error('Expected a complete palette text audit');
      for (const type of ['ugso_assist_response', 'ugso_jinja_text']) {
        const block = ws.newBlock(type);
        if (block.getFieldValue('TEXT') !== '' || block.getField('TEXT').constructor !== Blockly.FieldTextInput) throw Error('Plain input required: ' + type);
        const saved = 'Existing\ntext ä🙂'; block.setFieldValue(saved, 'TEXT');
        const state = Blockly.serialization.blocks.save(block); block.dispose();
        if (Blockly.serialization.blocks.append(state, ws).getFieldValue('TEXT') !== saved) throw Error('Text reload failed: ' + type);
      }
      ws.clear();
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
  console.log('DE/EN/FR: all palette text shadows audited; single-line plain/Assist/Jinja text, editing and multiline reload verified.');
} finally { await browser.close(); }
