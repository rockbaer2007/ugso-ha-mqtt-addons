import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 for(const url of ['http://127.0.0.1:4181/','http://127.0.0.1:4183/']) {
  const page=await browser.newPage(), errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url);await page.waitForFunction(()=>document.querySelector('#profiles').options.length>0);
  const api=async(path,data)=>page.evaluate(async({path,data})=>{const state=await(await fetch('./api/state')).json();const response=await fetch('./api/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':state.csrf},body:JSON.stringify(data)});return {status:response.status,data:await response.json()};},{path,data});
  const original={profiles:[{id:'admin_test',name:'Admin demo',phone:'+49123456789',api_key:'dummy_secret'}],default_profile:'admin_test'};
  assert.equal((await api('settings',original)).status,200);await page.locator('#refresh').click();
  await page.locator('#backup-password').fill('a strong test password');
  const event=page.waitForEvent('download');await page.locator('#backup-export').click();const file=await event;
  const backup=JSON.parse(await readFile(await file.path(),'utf8'));
  assert.ok(!JSON.stringify(backup).includes('dummy_secret'));assert.ok(!JSON.stringify(backup).includes('+49123456789'));
  await page.waitForFunction(()=>document.querySelector('#backup-password').value==='');
  assert.equal((await api('restore',{password:'wrong test password',backup,confirm:true})).status,400);
  let state=await(await page.request.get(url+'api/state')).json();assert.equal(state.profiles[0].id,'admin_test');
  assert.equal((await api('settings',{profiles:[],default_profile:''})).status,200);await page.locator('#refresh').click();
  await page.locator('#backup-password').fill('a strong test password');page.once('dialog',dialog=>dialog.accept());
  await page.locator('#backup-file').setInputFiles({name:'profiles.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
  await page.waitForFunction(()=>document.querySelector('#profiles').options.length===2);
  await page.waitForFunction(()=>document.querySelector('#backup-password').value==='');
  assert.equal((await api('send',{profile:'admin_test',message:'Mock provider only',request_id:'admin_test_'+Date.now()})).status,202);
  await page.waitForTimeout(150);await page.locator('#refresh').click();await page.waitForFunction(()=>document.querySelector('#recent').textContent.includes('CallMeBot'));
  state=await(await page.request.get(url+'api/state')).json();assert.equal(state.history[0].status,'accepted');assert.equal(state.history[0].source,'ui');
  assert.ok(!JSON.stringify(state.history).includes('Mock provider only'));assert.ok(!JSON.stringify(state).includes('dummy_secret'));
  for(const locale of ['de','en','fr']) {
   await page.locator('#language').selectOption(locale);
   assert.equal(await page.locator('html').getAttribute('lang'),locale);
   const untranslated=await page.evaluate(()=>[...document.querySelectorAll('[data-t]')].filter(e=>!e.textContent.trim()||e.textContent===e.dataset.t).map(e=>e.dataset.t));
   assert.deepEqual(untranslated,[]);
  }
  assert.equal((await api('mqtt',{tls:true,ca:'invalid'})).status,400);
  assert.equal((await(await page.request.get(url+'api/state')).json()).mqtt.tls,false);
  await page.locator('#history-status').selectOption('errors');assert.equal(await page.locator('#recent li').count(),1);
  await page.locator('#history-status').selectOption('');page.once('dialog',dialog=>dialog.dismiss());await page.locator('#history-clear').click();
  assert.ok((await(await page.request.get(url+'api/state')).json()).history.length>0);
  page.once('dialog',dialog=>dialog.accept());await page.locator('#history-clear').click();await page.waitForFunction(()=>document.querySelector('#recent li')?.textContent.includes('Aucune'));
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('Both apps: DE/EN/FR history, encrypted download/restore, secret redaction, confirmation, invalid TLS and mobile UI passed; provider mocked.');
} finally {await browser.close();}
