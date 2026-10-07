import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFile,mkdir} from "node:fs/promises";
import {join} from "node:path";
const url=process.env.STUDIO_INDUSTRIAL_TEST_URL;
test("four industrial switches render, route ports and control independent entities",{skip:!url},async()=>{
 const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||"playwright");
 const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER||undefined});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1000}});
  const installed=await page.request.post(new URL("api/widget-packages",url).href,{headers:{"X-Package-Name":"ugso.industrial.wg"},data:await readFile(new URL("../packages/industrial/ugso.industrial.wg",import.meta.url))});
  assert.ok(installed.ok() || /bereits installiert/.test(await installed.text()));
  const packages=await(await page.request.get(new URL("api/widget-packages",url).href)).json();
  const definition=packages.packages.find(p=>p.id==="ugso.industrial").widgets.find(w=>w.type.endsWith("/switch"));
  let fixture=await(await page.request.get(new URL("api/project",url).href)).json();
  fixture.settings={...fixture.settings,autoSave:false,dockColor:"#112233",outputDockColor:"#ee1188",housingSnapColor:"#aa33cc"};
  const bank={...definition.defaults,id:"bank",type:definition.type,x:100,y:100,switchCount:4,height:128,width:512,dockAlwaysVisible:true};
  for(let n=1;n<=4;n++){bank[`outputDock${n}`]=true;bank[`label${n}`]=["Licht","Pumpe","Lüfter","Reserve"][n-1];bank[`ledOnColor${n}`]="#4caf50";}
  bank.outputEntityId1="switch.one";bank.inputEntityId2="switch.two";bank.outputEntityId2="switch.target";bank.switchLegend2="one-zero";bank.switchLegend3="ein-aus";bank.inputDock3=true;bank.inputEntityId3="switch.two";
  fixture.pages[0].widgets=[bank,{id:"source",type:"red-number",x:100,y:300,width:64,height:64,state:1,dataOutputEnabled:true}, {id:"input-wire",type:"svg-connection",startWidgetId:"source",startAnchor:"right-center",endWidgetId:"bank",endAnchor:"input-3"}, {id:"reading",type:"string",x:680,y:100,width:64,height:64,dataInputEnabled:true,dockPointsEnabled:true,dock_left_center:true}, {id:"out-wire",type:"svg-connection",startWidgetId:"bank",startAnchor:"output-4",endWidgetId:"reading",endAnchor:"left-center"}];
  const states={"switch.one":{entity_id:"switch.one",state:"off"},"switch.two":{entity_id:"switch.two",state:"off"},"switch.target":{entity_id:"switch.target",state:"off"}};
  const writes=[],errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.route("**/api/project*",async r=>{if(r.request().method()==="PUT")fixture=r.request().postDataJSON();await r.fulfill({json:fixture});});
  await page.route("**/api/states*",r=>r.fulfill({json:{states:Object.values(states)}}));
  await page.route("**/api/switch",async r=>{const body=r.request().postDataJSON();writes.push(body);states[body.entity_id].state=body.enabled?"on":"off";await r.fulfill({json:{accepted:true}});});
  await page.goto(url);try{await page.locator("#bank .industrial-switch").waitFor({timeout:5000});}catch(error){throw new Error(`${error.message}; ${await page.locator("#status").textContent()}; ${errors.join("; ")}`);}
  assert.equal(await page.locator("#bank .industrial-toggle").count(),4);assert.equal(await page.locator("#bank .industrial-toggle:disabled").count(),4);
  for(let count=1;count<=4;count++){
   Object.assign(bank,{switchCount:count,width:128*count,housingSnapEnabled:true,housingSnapAlwaysVisible:true,housing_top_left:true,housing_top_right:true,housing_bottom_left:true,housing_bottom_right:true,housing_left_center:true,housing_right_center:true});
   for(let n=1;n<=4;n++)bank[`inputDock${n}`]=true;
   await page.reload();await page.locator("#bank .industrial-switch").waitFor();
   assert.equal(await page.locator("#bank .housing-snap-point").count(),6);
   assert.equal(await page.locator("#bank .widget-dock-point").count(),2*count);
   for(let n=1;n<=count;n++){
    assert.equal(await page.locator(`#bank [data-anchor-id='input-${n}'] .industrial-switch-port-label`).textContent(),`E${n}`);
    assert.equal(await page.locator(`#bank [data-anchor-id='output-${n}'] .industrial-switch-port-label`).textContent(),`A${n}`);
   }
   assert.equal(await page.locator("#bank [data-housing-corner='left-center']").evaluate(el=>getComputedStyle(el).borderColor),"rgb(170, 51, 204)");
   if(count===1 || count===4){
    const folder=process.env.STUDIO_TEST_ARTIFACTS||join(process.env.TEMP,"studio-industrial-artifacts");await mkdir(folder,{recursive:true});
    const box=await page.locator("#bank").boundingBox();
    await page.locator("#input-wire,#out-wire").evaluateAll(items=>items.forEach(el=>el.style.visibility="hidden"));
    await page.screenshot({path:join(folder,`industrial-switch-ports-${count}.png`),clip:{x:box.x-20,y:box.y-30,width:box.width+40,height:box.height+60}});
   }
  }
  for(let n=1;n<=4;n++)bank[`inputDock${n}`]=n===3;
  await page.reload();await page.locator("#bank .industrial-switch").waitFor();
  assert.equal(await page.locator("#bank [data-anchor-id='input-3']").evaluate(el=>getComputedStyle(el).backgroundColor),"rgb(17, 34, 51)");
  for(let n=1;n<=4;n++)assert.equal(await page.locator(`#bank [data-anchor-id='output-${n}']`).evaluate(el=>getComputedStyle(el).backgroundColor),"rgb(238, 17, 136)");
  await page.locator("#bank .industrial-switch").click();await page.locator("#properties details").evaluateAll(items=>items.forEach(el=>el.open=true));
  const height=page.locator("#properties [data-property-key='height']").first(),width=page.locator("#properties [data-property-key='width']").first();
  await height.fill("160");await height.press("Tab");assert.equal(await width.inputValue(),"646");
  await width.fill("65");await width.press("Tab");assert.equal(await width.inputValue(),"262");assert.equal(await height.inputValue(),"64");
  const space=page.locator("#properties [data-property-key='housingSpace']").first();
  await space.fill("3");await space.press("Tab");assert.equal(await width.inputValue(),"274");
  await space.fill("1");await space.press("Tab");assert.equal(await width.inputValue(),"262");
  assert.equal(await page.locator("#properties [data-property-key='switchLegend3'] option[value='ein-aus']").textContent(),"EIN/AUS");
  await page.goto(new URL("runtime",url).href);await page.locator("#bank .industrial-switch").waitFor();
  assert.equal(await page.locator("#bank .housing-snap-point, #bank .widget-dock-point, #bank .industrial-switch-port-label").count(),0);
  const channel=n=>page.locator(`#bank [data-channel='${n}'] button`);
  await page.waitForFunction(()=>!document.querySelector("#bank [data-channel='1'] button")?.disabled);
  assert.equal(await channel(1).getAttribute("data-on-label"),"ON");assert.equal(await channel(2).getAttribute("data-off-label"),"0");assert.equal(await channel(3).getAttribute("data-on-label"),"EIN");
  assert.equal(await channel(3).getAttribute("aria-checked"),"true");
  assert.equal(await channel(1).locator("svg").getAttribute("viewBox"),"272 75 205 280");
  assert.equal(await channel(3).locator("svg").getAttribute("viewBox"),"35 75 205 280");
  assert.equal(await channel(1).locator("image").getAttribute("href"),"assets/industrial/switch-1.png");
  await channel(1).click();await page.waitForFunction(()=>document.querySelector("#bank [data-channel='1'] button")?.getAttribute("aria-checked")==="true");
  assert.deepEqual(writes[0],{entity_id:"switch.one",enabled:true});
  assert.equal(await channel(1).locator("svg").getAttribute("viewBox"),"35 75 205 280");
  await channel(2).click();assert.deepEqual(writes.at(-1),{entity_id:"switch.target",enabled:true});
  await channel(4).click();assert.equal(await channel(4).getAttribute("aria-checked"),"true");assert.equal(writes.length,2);
  assert.equal(await page.locator("#bank [data-channel='4'] .industrial-led").evaluate(el=>el.classList.contains("is-on")),true);
  assert.ok((await page.locator("#reading").textContent()).includes("true"));
  const folder=process.env.STUDIO_TEST_ARTIFACTS||join(process.env.TEMP,"studio-industrial-artifacts");await mkdir(folder,{recursive:true});
  await page.locator("#input-wire,#out-wire").evaluateAll(items=>items.forEach(el=>el.style.visibility="hidden"));
  await page.locator("#bank").screenshot({path:join(folder,"industrial-switches.png")});
  bank.height=64;bank.width=256;await page.reload();await page.locator("#bank").waitFor();const box=await page.locator("#bank").boundingBox();assert.equal(box.width,262);assert.equal(box.height,64);
  await page.locator("#input-wire,#out-wire").evaluateAll(items=>items.forEach(el=>el.style.visibility="hidden"));
  await page.locator("#bank").screenshot({path:join(folder,"industrial-switches-64.png")});
  for(let n=1;n<=4;n++)fixture.pages[0].widgets.push({...definition.defaults,id:`single-${n}`,type:definition.type,x:bank.x+(n-1)*66,y:bank.y+100,height:64,width:64});
  await page.reload();await page.locator("#single-4").waitFor();
  const block=await page.locator("#bank").boundingBox();
  for(let n=1;n<=4;n++){
   const single=await page.locator(`#single-${n}`).boundingBox(),singleLed=await page.locator(`#single-${n} .industrial-led`).boundingBox(),blockLed=await page.locator(`#bank [data-channel='${n}'] .industrial-led`).boundingBox();
   assert.ok(Math.abs(singleLed.x+singleLed.width/2-blockLed.x-blockLed.width/2)<.5);
   if(n===4)assert.equal(single.x+single.width,block.x+block.width);
  }
  await page.locator("#input-wire,#out-wire").evaluateAll(items=>items.forEach(el=>el.style.visibility="hidden"));
  await page.screenshot({path:join(folder,"industrial-toggle-spacing.png"),clip:{x:block.x-5,y:block.y-5,width:block.width+10,height:174}});
  fixture.pages[0].widgets=fixture.pages[0].widgets.filter(w=>!w.id.startsWith("single-"));
  const rockerDefinition=packages.packages.find(p=>p.id==="ugso.industrial").widgets.find(w=>w.type==="ugso.industrial/rocker-switch");
  assert.ok(rockerDefinition);
  Object.assign(bank,{type:rockerDefinition.type,height:128,width:512,switchCount:4,rockerColor1:"white",rockerColor2:"red",rockerColor3:"black",rockerColor4:"green"});
  for(let count=1;count<=4;count++){
   bank.switchCount=count;bank.width=128*count;
   await page.goto(url);await page.locator("#bank .industrial-rocker-art").first().waitFor();
   assert.equal(await page.locator("#bank .industrial-rocker-art").count(),count);
   assert.equal(await page.locator("#bank .housing-snap-point").count(),6);
   assert.equal(await page.locator("#bank .industrial-toggle:disabled").count(),count);
   assert.equal(await page.locator("#bank [data-anchor-id^='output-']").count(),count);
  }
  await page.locator("#bank .industrial-switch").click();await page.locator("#properties details").evaluateAll(items=>items.forEach(el=>el.open=true));
  const colorSelect=page.locator("#properties [data-property-key='rockerColor2']").first();
  assert.deepEqual(await colorSelect.locator("option").evaluateAll(items=>items.map(el=>el.value)),["white","red","black","green"]);
  await colorSelect.selectOption("black");
  assert.match(await channel(2).locator("img").getAttribute("src"),/rocker-black-/);
  states["switch.one"].state="off";
  await page.goto(new URL("runtime",url).href);await page.locator("#bank .industrial-rocker-art").first().waitFor();
  await page.waitForFunction(()=>!document.querySelector("#bank [data-channel='1'] button")?.disabled);
  for(let n=1;n<=4;n++){
   const image=channel(n).locator("img");
   assert.match(await image.getAttribute("src"),new RegExp(`rocker-${["gray","red","black","green"][n-1]}-`));
   assert.equal(await image.evaluate(el=>el.complete && el.naturalWidth>0),true);
  }
  assert.match(await channel(1).locator("img").getAttribute("src"),/gray-off\.png$/);
  await channel(1).click();await page.waitForFunction(()=>document.querySelector("#bank [data-channel='1'] img")?.src.endsWith("gray-on.png"));
  assert.deepEqual(writes.at(-1),{entity_id:"switch.one",enabled:true});
  assert.equal(await page.locator("#bank .widget-dock-point").count(),0);
  await page.locator("#input-wire,#out-wire").evaluateAll(items=>items.forEach(el=>el.style.visibility="hidden"));
  await page.locator("#bank").screenshot({path:join(folder,"industrial-rockers.png")});
  bank.height=64;bank.width=256;await page.reload();await page.locator("#bank .industrial-rocker-art").first().waitFor();
  for(let n=1;n<=4;n++){
   const art=await channel(n).locator("img").boundingBox(),button=await channel(n).boundingBox();
   assert.ok(art.height>10 && art.x>=button.x && art.y>=button.y && art.y+art.height<=button.y+button.height+1);
  }
  await page.locator("#input-wire,#out-wire").evaluateAll(items=>items.forEach(el=>el.style.visibility="hidden"));
  await page.locator("#bank").screenshot({path:join(folder,"industrial-rockers-64.png")});
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
