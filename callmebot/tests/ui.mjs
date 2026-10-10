import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  for(const locale of ['de','en','fr']) {
    const page=await browser.newPage({locale,viewport:{width:1300,height:1000}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    // Never allow a real send request during browser verification.
    let sends=0;
    await page.route('**/api/send',route=>{sends++;return route.fulfill({status:202,contentType:'application/json',body:'{"status":"queued"}'});});
    await page.goto('http://127.0.0.1:4181/');
    await page.waitForFunction(()=>document.querySelector('#profiles').options.length>0);
    await page.locator('#language').selectOption(locale);
    assert.equal(await page.locator('html').getAttribute('lang'),locale);
    await page.locator('#new').click();
    await page.locator('#id').fill('test_'+locale);await page.locator('#name').fill('Demo '+locale.toUpperCase());
    await page.locator('#phone').fill('+49123456789');await page.locator('#key').fill('dummy_secret');
    await page.locator('#default').check();
    await page.locator('button[type=submit]').click();
    await page.waitForFunction(locale=>document.querySelector('#profiles').value==='test_'+locale,locale);
    assert.equal(await page.locator('#key').inputValue(),'');
    const state=await page.evaluate(()=>fetch('./api/state').then(r=>r.json()));
    assert.ok(!JSON.stringify(state).includes('dummy_secret'));
    await page.locator('#message').fill('Mock only "quotes"\n🏠');await page.locator('#send').click();assert.equal(sends,1);
    await page.locator('#appearance').selectOption('dark');
    if(process.env.CALLMEBOT_IMAGES){await mkdir(process.env.CALLMEBOT_IMAGES,{recursive:true});await page.screenshot({path:`${process.env.CALLMEBOT_IMAGES}/${locale}.png`,fullPage:true});}
    await page.locator('#new').click();await page.locator('#id').fill('unsaved');
    await page.locator('#refresh').click();await page.waitForTimeout(100);
    assert.equal(await page.locator('#id').inputValue(),'unsaved','refresh preserves unsaved fields');
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile has no horizontal overflow');
    assert.deepEqual(errors,[]);
    await page.close();console.log(locale+': profile save, secret redaction, mock send, language and mobile passed');
  }
} finally {await browser.close();}
