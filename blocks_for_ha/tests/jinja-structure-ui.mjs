import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {toYaml} from '../src/model.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1800,height:1100},locale:'de'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4180/');await page.waitForSelector('.blocklySvg');
 const source="Wasser: {{states('sensor.water')|float(0)|round(1)}} °C";
 const model={id:'test',alias:'Jinja',description:'',mode:'single',triggers:[{trigger:'time',at:'12:00'}],conditions:[],actions:[{variables:{result:source}}]};
 await page.locator('#yaml-mode').selectOption('import');await page.locator('#yaml-replace').check();await page.locator('#yaml-input').fill(toYaml(model));page.once('dialog',d=>d.accept());await page.locator('#save').click();await page.locator('#yaml-mode').selectOption('output');
 await page.evaluate(async source=>{
  const url=performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/blocks.js').name;
  const blocks=await import(url);window.jinjaTest=blocks;const ws=blocks.Blockly.getMainWorkspace();
  window.jinjaModel={};
 },source);
 await page.waitForFunction(()=>document.querySelector('#yaml').textContent.includes('sensor.water'));
 const point=await page.evaluate(()=>{
  const ws=jinjaTest.Blockly.getMainWorkspace(),round=ws.getBlocksByType('ugso_jinja_filter').find(b=>b.getFieldValue('FILTER')==='round');ws.scrollCenter();
  const r=round.getInputTargetBlock('ARG0').getField('TEXT').getSvgRoot().getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};
 });
 await page.mouse.dblclick(point.x,point.y);const input=page.locator('.blocklyHtmlInput');await input.fill('2');await input.press('Enter');
 await page.waitForFunction(()=>document.querySelector('#yaml').textContent.includes('round(2)'));
 await page.evaluate(()=>jinjaTest.Blockly.getMainWorkspace().undo(false));
 await page.waitForFunction(source=>jinjaTest.workspaceModel(jinjaTest.Blockly.getMainWorkspace(),jinjaModel).actions[0].variables.result===source,source);
 await page.locator('#jinja-import').click();const condition="{% if is_state('sensor.water','on') %}AN{% else %}AUS{% endif %}";
 await page.locator('#jinja-source').fill(condition);await page.locator('#jinja-boolean').check();assert.equal(await page.locator('#jinja-decompose').isChecked(),true);
 await page.locator('#jinja-add').click();await page.waitForFunction(()=>!document.querySelector('#jinja-dialog').open);await page.waitForFunction(()=>jinjaTest.Blockly.getMainWorkspace().getBlocksByType('ugso_jinja_composed_condition').length===1);
 await page.evaluate(()=>jinjaTest.Blockly.getMainWorkspace().undo(false));
 await page.waitForFunction(()=>jinjaTest.Blockly.getMainWorkspace().getBlocksByType('ugso_jinja_composed_condition').length===0);
 await page.evaluate(()=>jinjaTest.Blockly.getMainWorkspace().undo(true));
 await page.waitForFunction(()=>jinjaTest.Blockly.getMainWorkspace().getBlocksByType('ugso_jinja_composed_condition').length===1);
 const original=await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/jinja-blocks.js').name;const {composedJinja}=await import(url);return composedJinja(jinjaTest.Blockly.getMainWorkspace().getBlocksByType('ugso_jinja_composed_condition')[0]);});
 assert.equal(original,condition,'Create undo/redo must preserve exact original');
 await page.evaluate(()=>{const ws=jinjaTest.Blockly.getMainWorkspace(),b=ws.getBlocksByType('ugso_jinja_composed_condition')[0];ws.getBlocksByType('ugso_automation')[0].getInput('CONDITIONS').connection.connect(b.outputConnection);});
 await page.waitForFunction(()=>document.querySelector('#yaml').textContent.includes('is_state'));const yaml=await page.locator('#yaml').textContent();
 await page.reload();await page.waitForSelector('.blocklySvg');await page.waitForFunction(()=>document.querySelector('#yaml').textContent.includes('is_state'));assert.equal(await page.locator('#yaml').textContent(),yaml);
 await page.locator('#jinja-import').click();await page.locator('#jinja-source').fill('{{ x[0] }}');await page.locator('#jinja-boolean').check();assert.match(await page.locator('#jinja-preview').textContent(),/Originalblock/);await page.locator('#jinja-add').click();
 const fallback=await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/blocks.js').name;return(await import(url)).Blockly.getMainWorkspace().getBlocksByType('ugso_jinja_condition').some(b=>b.getFieldValue('TEXT')==='{{ x[0] }}');});assert.equal(fallback,true);
 assert.deepEqual(errors,[]);console.log('Jinja UI: YAML decomposition/rendering, real field edit, undo/redo, exact originals, project reload and unsupported fallback verified.');
}finally{await browser.close();}
