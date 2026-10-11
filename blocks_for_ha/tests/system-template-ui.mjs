import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try {
  for(const locale of ['de','en','fr']) {
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(locale=>localStorage.setItem('ugso-blocks-for-ha-language',locale),locale);
    await page.route('**/api/ha/template',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({result:'21.6 °C'})}));
    await page.goto('http://127.0.0.1:4180/');await page.waitForSelector('.blocklySvg');
    const labels=await page.evaluate(async()=>{
      const url=performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/blocks.js').name;
      const {Blockly}=await import(url),ws=Blockly.getMainWorkspace();ws.clear();
      const b=ws.newBlock('ugso_automation_control');b.initSvg();b.render();if(b.getInput('STOP').isVisible())throw Error('Stop should be hidden');
      b.loadExtraState({options:['STOP','TARGET']});b.render();if(!b.getInput('TARGET').isVisible())throw Error('Target missing');
      const icon=b.getIcon(Blockly.icons.MutatorIcon.TYPE);await icon.setBubbleVisible(true);await Blockly.renderManagement.finishQueuedRenders();await new Promise(r=>setTimeout(r,150));await icon.setBubbleVisible(false);
      const template=ws.newBlock('ugso_template_builder');template.initSvg();template.render();
      const output=ws.newBlock('ugso_template_output');output.initSvg();output.render();const value=ws.newBlock('ugso_entity_value');value.initSvg();value.render();
      template.getInput('PARTS').connection.connect(output.previousConnection);output.getInput('VALUE').connection.connect(value.outputConnection);
      const menu=[];template.customContextMenu(menu);menu[0].callback();await Blockly.renderManagement.finishQueuedRenders();return ws.getAllBlocks(false).map(b=>b.toString()).join('\n');
    });
    await page.waitForFunction(()=>document.querySelector('dialog[open]')?.textContent.includes('21.6 °C'));
    assert.match(labels,locale==='de'?/Entität/:locale==='en'?/entity/:/entité/);if(locale!=='de')assert.doesNotMatch(labels,/Laufende Aktionen|Ausgeben/);
    await page.locator('dialog[open] button').last().click();assert.deepEqual(errors,[]);await page.close();
  }
  console.log('DE/EN/FR: System/Template gear, labels and HA preview dialog verified.');
} finally {await browser.close();}
