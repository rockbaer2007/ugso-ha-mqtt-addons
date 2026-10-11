import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  for (const locale of ['de', 'en', 'fr']) {
    const page = await browser.newPage({ viewport: { width: 1700, height: 1100 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(locale => localStorage.setItem('ugso-blocks-for-ha-language', locale), locale);
    await page.goto('http://127.0.0.1:4180/'); await page.waitForSelector('.blocklySvg');
    await page.evaluate(async locale => {
      const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
      const { Blockly } = await import(url);
      const { translateLabel } = await import('/src/locales.js');
      const ws = Blockly.getMainWorkspace(); ws.clear(); ws.setScale(1);
      const assert = (value, message) => { if (!value) throw Error(message); };
      for (const [type, itemType, title] of [
        ['ugso_object_new', 'ugso_object_attribute', translateLabel('Attribute')],
        ['ugso_list_new', 'ugso_list_item', Blockly.Msg.LISTS_CREATE_WITH_CONTAINER_TITLE_ADD],
        ['ugso_text_join', 'ugso_text_item', Blockly.Msg.TEXT_CREATE_JOIN_TITLE_JOIN],
        ['ugso_case', 'ugso_case_item', translateLabel('der Fall ist')]
      ]) {
        const block = ws.newBlock(type); block.initSvg(); block.render(); ws.centerOnBlock(block.id);
        const icon = block.getIcon(Blockly.icons.MutatorIcon.TYPE); await icon.setBubbleVisible(true);
        await Blockly.renderManagement.finishQueuedRenders();
        const popup = icon.getWorkspace(), root = popup.getBlocksByType('ugso_rows_container')[0];
        assert(root.getFieldValue('LABEL') === title, locale + ':' + type + ': title');
        assert(popup.getFlyout().getWorkspace().getBlocksByType(itemType).length === 1, type + ': native item palette');
        if (type === 'ugso_object_new') {
          root.getInputTargetBlock('STACK').setFieldValue('edited_attribute', 'KEY');
          block.saveConnections(root); block.compose(root);
          assert(block.getFieldValue('KEY0') === 'edited_attribute', 'attribute name from popup');
        }
        if (type === 'ugso_case') {
          block.saveConnections(root); popup.getBlocksByType('ugso_case_default')[0].dispose();
          await Blockly.renderManagement.finishQueuedRenders(); block.compose(root);
          await Blockly.renderManagement.finishQueuedRenders();
          assert(!block.getInput('DEFAULT'), 'default removed by gear');
          const otherwise = popup.newBlock('ugso_case_default'); otherwise.initSvg(); otherwise.render();
          root.getInputTargetBlock('STACK').nextConnection.connect(otherwise.previousConnection);
          await Blockly.renderManagement.finishQueuedRenders(); block.compose(root);
          assert(block.getInput('DEFAULT') && block.saveExtraState().hasDefault, 'default restored by gear');
        }
        await Blockly.renderManagement.finishQueuedRenders();
        await new Promise(resolve => setTimeout(resolve, 150));
        await icon.setBubbleVisible(false); await Blockly.renderManagement.finishQueuedRenders(); block.dispose();
      }
      const comment = ws.newBlock('ugso_comment'); comment.initSvg(); comment.render();
      assert(comment.getSvgRoot().classList.contains('blocklyCommentNote'), 'yellow comment styling');
      const { contrastRatio } = await import('/src/themes.js');
      assert(contrastRatio(getComputedStyle(comment.getSvgRoot().querySelector('.blocklyText')).fill, getComputedStyle(comment.getSvgRoot().querySelector('.blocklyPath')).fill) >= 4.5, 'comment contrast');
      const mqtt = ws.newBlock('ugso_mqtt_action'); mqtt.initSvg(); mqtt.render();
      assert(mqtt.getInput('TOPIC') && mqtt.getInput('MESSAGE') && mqtt.getField('RETAIN') && mqtt.getField('QOS'), 'MQTT controls');
      assert(!mqtt.getField('INSTANCE'), 'no MQTT instance selector');
      await Blockly.renderManagement.finishQueuedRenders();
    }, locale);
    assert.deepEqual(errors, []); await page.close();
  }
  console.log('DE/EN/FR: native-style gear palettes, attribute editing, optional case default, yellow comment contrast and MQTT controls verified.');
} finally { await browser.close(); }
