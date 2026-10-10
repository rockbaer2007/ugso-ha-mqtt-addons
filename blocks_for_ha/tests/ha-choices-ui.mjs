import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/ha/*',route=>{
    const kind=new URL(route.request().url()).pathname.split('/').pop();
    const data={entities:{entities:[{entity_id:'light.one',name:'Light one',domain:'light',state:'on',unit:''},{entity_id:'light.two',name:'Light two',domain:'light',state:'off',unit:''},{entity_id:'switch.one',name:'Switch',domain:'switch',state:'on',unit:''}]},actions:{actions:[{id:'light.turn_on',name:'Turn on',domain:'light',domains:['light']},{id:'light.turn_off',name:'Turn off',domain:'light',domains:['light']}]},targets:{targets:Object.fromEntries(['device_id','area_id','floor_id','label_id'].map(kind=>[kind,[{id:kind+'_demo',name:kind+' demo'}]])),unavailable:[]}}[kind];
    return route.fulfill({json:data});
  });
  await page.goto('http://127.0.0.1:4180/'); await page.waitForSelector('.blocklySvg');
  await page.waitForFunction(()=>document.querySelector('.local-badge').textContent.includes('3 Entitäten'));
  const audit=await page.evaluate(async()=>{
    const url=performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/blocks.js').name;
    const {Blockly,knownTypes}=await import(url);
    window.choiceBlockly=Blockly;window.choiceWorkspace=Blockly.getMainWorkspace();
    const ws=new Blockly.Workspace();let fields=0;
    try {
      for(const type of knownTypes) {
        const block=ws.newBlock(type);
        for(const input of block.inputList) for(const field of input.fieldRow) {
          if(field.getText().endsWith(' ▾')) fields++;
        }
      }
      return {types:knownTypes.size,fields};
    } finally {ws.dispose();}
  });
  assert.equal(audit.types,163); assert.ok(audit.fields>30);
  await page.evaluate(()=>{window.choiceBlock=choiceWorkspace.newBlock('ugso_target_action');choiceBlock.initSvg();choiceBlock.render();choiceBlock.getField('SERVICE').showEditor_();});
  await page.locator('.entity-result[data-entity="light.turn_off"]').click();
  await page.locator('#entity-form button[type="submit"]').click();
  assert.equal(await page.evaluate(()=>choiceBlock.getFieldValue('SERVICE')),'light.turn_off');
  await page.evaluate(()=>choiceBlock.getField('TARGET').showEditor_());
  assert.equal(await page.locator('.entity-result').count(),2);
  await page.locator('#entity-id').fill('');await page.locator('#entity-multiple').check();
  await page.locator('.entity-result[data-entity="light.one"]').click();await page.locator('.entity-result[data-entity="light.two"]').click();
  await page.locator('#entity-form button[type="submit"]').click();
  assert.deepEqual(JSON.parse(await page.evaluate(()=>choiceBlock.getFieldValue('TARGET'))),['light.one','light.two']);
  for(const kind of ['device_id','area_id','floor_id','label_id']) {
    await page.evaluate(kind=>{choiceBlock.setFieldValue(kind,'KIND');choiceBlock.setFieldValue('','TARGET');choiceBlock.getField('TARGET').showEditor_();},kind);
    assert.equal(await page.locator('.entity-result').count(),1);
    await page.locator('#entity-multiple').uncheck();await page.locator('.entity-result').click();await page.locator('#entity-form button[type="submit"]').click();
    assert.equal(await page.evaluate(()=>choiceBlock.getFieldValue('TARGET')),kind+'_demo');
  }
  const template='{% if true %}\nlight.one\n{% else %}\nlight.two\n{% endif %}\n';
  await page.evaluate(()=>{choiceBlock.setFieldValue('entity_id','KIND');choiceBlock.getField('TARGET').showEditor_();});
  await page.locator('#entity-id').fill(template);await page.locator('#entity-form button[type="submit"]').click();
  assert.equal(await page.evaluate(()=>choiceBlock.getFieldValue('TARGET')),template);
  await page.evaluate(()=>choiceBlock.getField('SERVICE').showEditor_());await page.locator('#entity-id').fill('bad');await page.locator('#entity-form button[type="submit"]').click();
  assert.ok(await page.locator('#entity-error').textContent());await page.locator('#entity-cancel').click();
  assert.equal(await page.evaluate(()=>choiceBlock.getFieldValue('SERVICE')),'light.turn_off');
  await page.evaluate(()=>{const data=choiceBlockly.serialization.workspaces.save(choiceWorkspace);choiceBlockly.serialization.workspaces.load(data,choiceWorkspace);});
  assert.equal(await page.evaluate(()=>choiceWorkspace.getAllBlocks(false).find(b=>b.type==='ugso_target_action').getFieldValue('TARGET')),template);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({audit,actions:true,filteredEntities:true,multipleTargets:true,registries:true,jinja:true,projectReload:true}));
} finally {await browser.close();}
