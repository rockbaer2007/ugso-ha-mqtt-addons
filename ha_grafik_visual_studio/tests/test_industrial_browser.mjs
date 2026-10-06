import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const url = process.env.STUDIO_INDUSTRIAL_TEST_URL;
test("external package installs, renders and controls numeric outputs in Studio runtime", {skip:!url}, async()=>{
  const require=createRequire(import.meta.url);
  const {chromium}=require(process.env.PLAYWRIGHT_MODULE || "playwright");
  const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER || undefined});
  try {
    const context=await browser.newContext({viewport:{width:1400,height:900},hasTouch:true});
    const installed=await context.request.post(new URL("api/widget-packages",url).href,{headers:{"X-Package-Name":"ugso.industrial.wg"},data:await readFile(new URL("../packages/industrial/ugso.industrial.wg",import.meta.url))});
    assert.ok(installed.ok() || [400,409].includes(installed.status()) && /bereits installiert/i.test(await installed.text()),await installed.text());
    const packages=await (await context.request.get(new URL("api/widget-packages",url).href)).json();
    const definition=packages.packages.find(p=>p.id==="ugso.industrial").widgets[0];
    const fixture=await (await context.request.get(new URL("api/project",url).href)).json();
    const defaults=definition.defaults;
    fixture.pages[0].widgets=[
      {...defaults,id:"poti",type:definition.type,x:24,y:24,width:128,height:128,outputEntityId:"input_number.test",dataOutputEnabled:true},
      {...defaults,id:"gauge",type:definition.type,x:170,y:24,width:128,height:128,entityId:"sensor.temp",scaleMode:"ring"},
      {...defaults,id:"missing",type:definition.type,x:320,y:24,width:64,height:64,entityId:"sensor.missing"},
      {...defaults,id:"continuous",type:definition.type,x:420,y:24,width:128,height:128,outputEntityId:"number.test",outputMode:"continuous"},
      {id:"reading",type:"red-number",x:24,y:170,width:120,height:64,dataInputEnabled:true,dockPointsEnabled:true,dock_left_center:true},
      {id:"wire",type:"svg-connection",dataFlowVariant:"value-connection",startWidgetId:"poti",endWidgetId:"reading",startAnchor:"right-center",endAnchor:"left-center"},
    ];
    const page=await context.newPage(); let writes=[]; const errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    await page.route("**/api/project*",r=>r.fulfill({json:fixture}));
    await page.route("**/api/states*",r=>r.fulfill({json:{states:[{entity_id:"input_number.test",state:"0"},{entity_id:"number.test",state:"0"},{entity_id:"sensor.temp",state:"20"}]}}));
    await page.route("**/api/industrial-value",async r=>{writes.push(r.request().postDataJSON());await r.fulfill({json:{accepted:true}});});
    await page.goto(url);
    await page.locator("#poti .industrial-gauge").waitFor();
    assert.equal(await page.locator("#poti .industrial-gauge").getAttribute("role"),"img");
    assert.equal(writes.length,0);
    await page.goto(new URL("runtime",url).href);
    const poti=page.locator("#poti .industrial-gauge"); await poti.waitFor();
    await page.waitForFunction(()=>document.querySelector("#gauge .industrial-gauge")?.dataset.value==="20");
    assert.equal(await page.locator("#missing .industrial-gauge").getAttribute("role"),"img");
    assert.equal(await page.locator("#missing .industrial-gauge").getAttribute("data-value"),"");
    assert.equal(await poti.evaluate(el=>getComputedStyle(el).borderTopWidth),"2px");
    const box=await poti.boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+20); await page.mouse.down();
    await page.mouse.move(box.x+box.width-20,box.y+box.height/2,{steps:8});
    assert.equal(writes.length,0);
    await page.mouse.up();
    await page.waitForFunction(()=>document.querySelector("#poti .industrial-gauge")?.dataset.value==="22");
    await page.waitForTimeout(200); assert.equal(writes.length,1); assert.equal(writes[0].value,22);
    await poti.focus(); await page.keyboard.press("Home"); await page.waitForTimeout(200);
    assert.equal(writes.at(-1).value,-20);
    assert.ok((await page.locator("#reading").textContent()).includes("-20"));
    const continuous=page.locator("#continuous .industrial-gauge"); const continuousBox=await continuous.boundingBox();
    await page.mouse.move(continuousBox.x+continuousBox.width/2,continuousBox.y+20); await page.mouse.down();
    await page.waitForTimeout(150); assert.equal(writes.at(-1).entity_id,"number.test");
    await page.mouse.move(continuousBox.x+continuousBox.width-20,continuousBox.y+continuousBox.height/2); await page.waitForTimeout(150);
    assert.equal(writes.at(-1).value,22); await page.mouse.up();
    await page.touchscreen.tap(box.x+box.width/2,box.y+20); await page.waitForTimeout(200);
    assert.equal(writes.at(-1).entity_id,"input_number.test"); assert.equal(writes.at(-1).value,5);
    const small=await page.locator("#missing").boundingBox(); assert.equal(small.width,64); assert.equal(small.height,64);
    const target=process.env.STUDIO_TEST_ARTIFACTS || join(process.env.TEMP || ".","studio-industrial-artifacts"); await mkdir(target,{recursive:true});
    await page.screenshot({path:join(target,"gauge-poti-runtime.png"),clip:{x:24,y:24,width:274,height:128}});
    fixture.pages[0].widgets.find(w=>w.id==="gauge").outputEntityId="number.test";
    writes=[]; await page.reload();
    await page.waitForFunction(()=>document.querySelector("#gauge .industrial-gauge")?.dataset.value==="20");
    await page.waitForTimeout(250); assert.equal(writes.length,1); assert.equal(writes[0].value,20); assert.equal(writes[0].entity_id,"number.test");
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
});
