import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless:true, channel:'msedge' });
try {
  for (const locale of ['de','en','fr']) {
    const page = await browser.newPage({ viewport:{width:1700,height:1100} });
    const errors = []; page.on('pageerror', error => errors.push(error.stack));
    await page.addInitScript(locale => localStorage.setItem('ugso-blocks-for-ha-language',locale),locale);
    await page.goto('http://127.0.0.1:4180/'); await page.waitForSelector('.blocklySvg');
    await page.evaluate(async () => {
      const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/blocks.js').name;
      const {Blockly, definitions} = await import(url); const ws = Blockly.getMainWorkspace(); ws.clear(); ws.setScale(1);
      const check = (value,message) => {if (!value) throw Error(message);};
      // Inspect every actual block in the browser, including fields requiring DOM.
      for (const definition of definitions) {
        const block = ws.newBlock(definition.type); block.initSvg(); block.render();
        await Blockly.renderManagement.finishQueuedRenders(); block.dispose();
      }
      const block = ws.newBlock('ugso_ha_action'); block.initSvg(); block.render(); ws.centerOnBlock(block.id);
      block.setFieldValue(JSON.stringify({action:'light.turn_on',target:{entity_id:'light.test'},alias:'Existing',enabled:false}), 'JSON');
      await Blockly.renderManagement.finishQueuedRenders();
      check(block.haOptionRows_.find(option => option.key === 'HA_JSON_TARGET_DEVICE_ID').input.isVisible() === false,'absent device option is hidden');
      const icon = block.getIcon(Blockly.icons.MutatorIcon.TYPE); check(icon,'HA action gear');
      await icon.setBubbleVisible(true); await Blockly.renderManagement.finishQueuedRenders();
      const popup = icon.getWorkspace(), root = popup.getBlocksByType('ugso_ha_options_container')[0];
      const response = block.haOptionRows_.find(option => option.key === 'HA_JSON_RESPONSE_VARIABLE');
      check(popup.getFlyout().getWorkspace().getBlocksByType(response.type).length === 1,'response variable palette item');
      const remove = block.haOptionRows_.find(option => option.key === 'HA_JSON_ENABLED');
      popup.getBlocksByType(remove.type)[0].dispose(true);
      await new Promise(resolve => setTimeout(resolve,150)); await Blockly.renderManagement.finishQueuedRenders();
      check(!block.getFieldValue('HA_JSON_ENABLED'),'explicit false removed by gear');
      check(!remove.input.isVisible(),'removed row hidden while gear remains open');
      const beforeHeight = block.getHeightWidth().height;
      const item = popup.newBlock(response.type); item.initSvg(); item.render();
      let last = root.getInputTargetBlock('STACK'); while (last?.getNextBlock()) last = last.getNextBlock();
      (last?.nextConnection || root.getInput('STACK').connection).connect(item.previousConnection);
      await new Promise(resolve => setTimeout(resolve,150)); await Blockly.renderManagement.finishQueuedRenders();
      check(block.saveExtraState().haOptions.includes(response.key),'blank option selected');
      check(response.input.isVisible(),'new blank row visible before gear closes');
      check(block.getHeightWidth().height > beforeHeight,'main block grows immediately');
      await Blockly.renderManagement.finishQueuedRenders(); await new Promise(resolve => setTimeout(resolve,150));
      await icon.setBubbleVisible(false); await Blockly.renderManagement.finishQueuedRenders();
      window.optionBlockly = Blockly; window.optionBlock = block;
      for (const type of ['ugso_and','ugso_or']) {
        const logic = ws.newBlock(type); logic.initSvg(); logic.render();
        check(!logic.getField('LOGIC').isVisible(),'no operator selector');
        const gear = logic.getIcon(Blockly.icons.MutatorIcon.TYPE); await gear.setBubbleVisible(true);
        await Blockly.renderManagement.finishQueuedRenders();
        check(gear.getWorkspace().getFlyout().getWorkspace().getBlocksByType('ugso_condition_item').length === 1,'logic gear palette');
        await new Promise(resolve => setTimeout(resolve,150));
        await gear.setBubbleVisible(false); await Blockly.renderManagement.finishQueuedRenders(); logic.dispose();
      }
    });
    assert.deepEqual(errors,[]);
    await page.close();
  }
  console.log('DE/EN/FR: all blocks render; HA gear additions/removals, populated/blank fields and separate AND/OR verified.');
} finally { await browser.close(); }
