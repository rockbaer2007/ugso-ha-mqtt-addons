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
      const {Blockly,toolbox}=await import(url),ws=Blockly.getMainWorkspace();ws.clear();
      for(const type of ['ugso_app_control','ugso_automation_control']){
        if(!toolbox.contents.find(c=>c.name==='System').contents.some(e=>e.type===type))throw Error('System control absent');
        const control=ws.newBlock(type);control.initSvg();control.render();
        if(control.getField('MODE').getParentInput()===control.getField(type==='ugso_app_control'?'APP':'ENTITY').getParentInput())throw Error('Control needs separate action row');
      }
      for(const type of ['ugso_template_time_window','ugso_template_change']){
        const purpose=ws.newBlock(type);purpose.initSvg();purpose.render();
        if(!purpose.outputConnection.getCheck().includes('Boolean')||purpose.getIcon(Blockly.icons.MutatorIcon.TYPE))throw Error('Purpose must use Boolean output without gear');
      }
      const b=ws.newBlock('ugso_automation_control');b.initSvg();b.render();if(b.getInput('STOP').isVisible())throw Error('Stop should be hidden');
      b.loadExtraState({options:['STOP','TARGET']});b.render();if(!b.getInput('TARGET').isVisible())throw Error('Target missing');
      const icon=b.getIcon(Blockly.icons.MutatorIcon.TYPE);await icon.setBubbleVisible(true);await Blockly.renderManagement.finishQueuedRenders();
      const popup=icon.getWorkspace(),root=popup.getTopBlocks(false)[0];
      const stop=popup.getBlocksByType('ugso_automation_control_options_stop')[0];stop.dispose(true);
      await new Promise(r=>setTimeout(r,150));await Blockly.renderManagement.finishQueuedRenders();
      if(b.getInput('STOP').isVisible())throw Error('Removed option must disappear while gear is open');
      const before=b.getHeightWidth().height,item=popup.newBlock('ugso_automation_control_options_conditions');item.initSvg();item.render();
      let last=root.getInputTargetBlock('STACK');while(last?.getNextBlock())last=last.getNextBlock();(last?.nextConnection||root.getInput('STACK').connection).connect(item.previousConnection);
      await new Promise(r=>setTimeout(r,150));await Blockly.renderManagement.finishQueuedRenders();
      if(!b.getInput('CONDITIONS').isVisible()||b.getHeightWidth().height<=before)throw Error('Added option must appear and resize while gear is open');
      await icon.setBubbleVisible(false);
      const template=ws.newBlock('ugso_template_builder');template.initSvg();template.render();
      const value=ws.newBlock('ugso_entity_value');value.initSvg();value.render();template.getInput('PART0').connection.connect(value.outputConnection);
      if(template.getIcon(Blockly.icons.MutatorIcon.TYPE))throw Error('Template must have no gear');
      const condition=ws.newBlock('ugso_template_conditional');condition.initSvg();condition.render();
      if(condition.getInput('TEST').connection.getCheck()[0]!=='Boolean')throw Error('Condition must be Boolean');
      const format=ws.newBlock('ugso_number_format');format.initSvg();format.render();if(format.getIcon(Blockly.icons.MutatorIcon.TYPE)||!format.getInput('FALLBACK').isVisible())throw Error('Format must show its inputs without gear');
      ws.clearUndo();Blockly.Events.setGroup(true);
      const tail=ws.newBlock('ugso_text');tail.initSvg();tail.render();template.getInput('PART1').connection.connect(tail.outputConnection);Blockly.Events.setGroup(false);
      await new Promise(r=>setTimeout(r,250));if(!template.getInput('PART2'))throw Error('Next value socket missing');
      ws.undo(false);await new Promise(r=>setTimeout(r,250));if(template.getInputTargetBlock('PART1'))throw Error('Undo must detach last part');
      ws.undo(true);await new Promise(r=>setTimeout(r,250));if(!template.getInputTargetBlock('PART1'))throw Error('Redo must restore last part');
      const legacy=Blockly.serialization.blocks.append({type:'ugso_template_builder',inputs:{PARTS:{block:{type:'ugso_template_output',inputs:{VALUE:{block:{type:'ugso_text',fields:{TEXT:'Legacy'}}}}}}}},ws);
      await new Promise(r=>setTimeout(r,250));if(legacy.getInputTargetBlock('PARTS')||legacy.getInputTargetBlock('PART0')?.type!=='ugso_text')throw Error('Legacy chain must migrate automatically');
      const menu=[];template.customContextMenu(menu);menu[0].callback();await Blockly.renderManagement.finishQueuedRenders();return ws.getAllBlocks(false).map(b=>b.toString()).join('\n');
    });
    await page.waitForFunction(()=>document.querySelector('dialog[open]')?.textContent.includes('21.6 °C'));
    assert.match(labels,locale==='de'?/Entität/:locale==='en'?/entity/:/entité/);if(locale!=='de')assert.doesNotMatch(labels,/Laufende Aktionen|Ausgeben/);
    await page.locator('dialog[open] button').last().click();assert.deepEqual(errors,[]);await page.close();
  }
  console.log('DE/EN/FR: typed Template sockets, automatic expansion, undo/redo, legacy migration and HA preview verified.');
} finally {await browser.close();}
