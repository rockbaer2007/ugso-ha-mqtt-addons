import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const url=process.env.STUDIO_TEST_URL;
for(const colorScheme of ['light','dark']) test(`page tabs in ${colorScheme} preserve edits, reset selection, handle hidden pages, scroll and keyboard, and stay out of runtime`,{skip:!url},async()=>{
 const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright'),browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER||undefined});
 try{
  const page=await browser.newPage({viewport:{width:1374,height:950},colorScheme}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const fixture=await(await page.request.get(new URL('api/project',url).href)).json(),base=fixture.pages[0];fixture.settings={...fixture.settings,autoSave:false};
  fixture.pages=Array.from({length:12},(_,i)=>({...structuredClone(base),id:'page-'+(i+1),name:i===0?'Test energy':i===1?'Technik':i===2?'Ausgeblendete Seite':`Weitere Projektseite ${i+1}`,visible:i!==2,widgets:[{id:'widget-'+(i+1),type:'text',textContent:'Text '+(i+1),x:40,y:40,width:200,height:80}]}));fixture.currentPageId='page-1';
  let saved;await page.route('**/api/project*',r=>{if(r.request().method()==='PUT')saved=r.request().postDataJSON();return r.fulfill({json:saved||fixture});});
  await page.goto(url);const tabs=page.locator('#editor-page-tabs');await page.locator('#widget-1').waitFor().catch(error=>{throw new Error(`${error.message}; page errors: ${errors.join('; ')}`);});assert.equal(await tabs.getByRole('tab').count(),12);
  assert.equal(await tabs.getByRole('tab',{selected:true}).textContent(),'Test energy');assert.ok(await tabs.evaluate(el=>el.scrollWidth>el.clientWidth));
  await page.locator('#widget-1').click({position:{x:10,y:10}});await page.locator('#properties details').evaluateAll(items=>items.forEach(el=>el.open=true));
  await page.locator('#properties [data-property-key="textContent"]').fill('Ungespeicherte Änderung');
  await tabs.getByRole('tab',{name:'Technik',exact:true}).click();assert.equal(await page.locator('#widget-1').count(),0);assert.equal(await page.locator('#widget-2').count(),1);assert.equal(await page.locator('#widget-copy').isEnabled(),false);
  await tabs.getByRole('tab',{name:'Test energy',exact:true}).click();assert.match(await page.locator('#widget-1').textContent(),/Ungespeicherte Änderung/);
  await tabs.getByRole('tab',{name:'Ausgeblendete Seite',exact:true}).click();assert.equal(await page.locator('#widget-3').count(),1);assert.ok((await tabs.getByRole('tab',{selected:true}).getAttribute('class')).includes('hidden-page'));
  await tabs.getByRole('tab',{selected:true}).press('ArrowRight');assert.equal(await page.locator('#widget-4').count(),1);assert.equal(await tabs.getByRole('tab',{selected:true}).evaluate(el=>el===document.activeElement),true);
  await tabs.getByRole('tab',{selected:true}).press('End');assert.equal(await page.locator('#widget-12').count(),1);assert.ok(await tabs.evaluate(el=>el.scrollLeft>0));
  await tabs.getByRole('tab',{selected:true}).press('Home');assert.equal(await page.locator('#widget-1').count(),1);
  await page.locator('#pages-menu-toggle').click();await page.locator('#page-list .page-select').filter({hasText:'Technik'}).click();assert.equal(await tabs.getByRole('tab',{selected:true}).textContent(),'Technik');await page.locator('#pages-close').click();
  await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('gespeichert'));assert.equal(saved.currentPageId,'page-2');assert.equal(saved.pages[0].widgets[0].textContent,'Ungespeicherte Änderung');assert.equal(saved.pages[2].visible,false);
  const folder=process.env.STUDIO_TEST_ARTIFACTS||join(process.env.TEMP,'studio-page-tabs-artifacts');await mkdir(folder,{recursive:true});await page.locator('.stage-meta').screenshot({path:join(folder,'page-tabs.png')});
  await page.goto(new URL('runtime',url).href);await page.locator('#widget-2').waitFor();assert.equal(await tabs.isVisible(),false);assert.equal(await page.locator('#stage').getAttribute('role'),null);assert.equal(await page.locator('#page-list .page-select').count(),11);
  await page.goto(url);await page.locator('#widget-2').waitFor();await page.setViewportSize({width:800,height:800});assert.ok(await tabs.evaluate(el=>el.clientWidth>0&&el.scrollWidth>el.clientWidth));await tabs.getByRole('tab',{name:'Weitere Projektseite 12',exact:true}).click();assert.equal(await page.locator('#widget-12').count(),1);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
