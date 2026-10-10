import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  for(const locale of ['de','en','fr']) {
    const page=await browser.newPage({locale,viewport:{width:1500,height:1050}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    let offline=false;
    await page.addInitScript(locale=>localStorage.setItem('ugso-blocks-for-ha-language',locale),locale);
    await page.route('**/api/ha/*',route=>{
      const path=new URL(route.request().url()).pathname;
      if(path.endsWith('callmebot-profiles'))return route.fulfill({status:offline?503:200,json:offline?{error:'offline'}:{profiles:[{id:'home',name:'Home demo'},{id:'office',name:'Office demo'}],default_profile:'home'}});
      return route.fulfill({json:{entities:[],actions:[],targets:{},unavailable:[]}});
    });
    await page.goto('http://127.0.0.1:4180/');await page.waitForSelector('.blocklySvg');
    await page.evaluate(async()=>{
      const url=performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/blocks.js').name;
      const module=await import(url);window.profileModule=module;
      const ws=module.Blockly.getMainWorkspace();window.profileWS=ws;
      module.modelWorkspace(ws,{alias:'Test',mode:'single',triggers:[{trigger:'homeassistant',event:'start'}],conditions:[],actions:[]});
      const block=ws.newBlock('ugso_callmebot_action');block.initSvg();window.profileBlock=block;
      const message=ws.newBlock('ugso_text');message.initSvg();message.setFieldValue('Test','TEXT');block.getInput('MESSAGE').connection.connect(message.outputConnection);
      ws.getBlocksByType('ugso_automation')[0].getInput('ACTIONS').connection.connect(block.previousConnection);
      await module.Blockly.renderManagement.finishQueuedRenders();ws.centerOnBlock(block.id);
      block.getField('PROFILE').showEditor_();
    });
    await page.locator('#entity-results [data-entity="home"]').waitFor();
    if(process.env.PROFILE_IMAGES){await mkdir(process.env.PROFILE_IMAGES,{recursive:true});await page.screenshot({path:`${process.env.PROFILE_IMAGES}/${locale}.png`});}
    await page.locator('#entity-results [data-entity="office"]').click();await page.locator('#entity-form button[type=submit]').click();
    assert.equal(await page.evaluate(()=>profileBlock.getFieldValue('PROFILE')),'office');
    assert.match(await page.evaluate(()=>profileBlock.getField('PROFILE').getText()),/Office demo/);
    assert.match(await page.evaluate(()=>profileModule.workspaceModel(profileWS,{alias:'Test',mode:'single'}).actions[0].data.payload),/profile="office"/);
    await page.evaluate(()=>profileBlock.getField('PROFILE').showEditor_());
    await page.locator('#entity-results [data-entity=""]').click();await page.locator('#entity-form button[type=submit]').click();
    assert.equal(await page.evaluate(()=>profileBlock.getFieldValue('PROFILE')),'');
    offline=true;await page.evaluate(()=>{profileBlock.setFieldValue('deleted_profile','PROFILE');profileBlock.getField('PROFILE').showEditor_();});
    await page.waitForFunction(()=>document.querySelector('#entity-results').children.length===1);
    await page.locator('#entity-cancel').click();assert.equal(await page.evaluate(()=>profileBlock.getFieldValue('PROFILE')),'deleted_profile');
    assert.deepEqual(errors,[]);console.log(locale+': profile/default selection, names, native export and offline preservation passed');await page.close();
  }
} finally {await browser.close();}
