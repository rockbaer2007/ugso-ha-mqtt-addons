import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFile} from "node:fs/promises";
const url=process.env.STUDIO_INDUSTRIAL_TEST_URL;
test("all input and output entity pickers assign the correct toggle and rocker channel",{skip:!url},async()=>{
 const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||"playwright");const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER||undefined});
 try{
  const page=await browser.newPage({viewport:{width:1400,height:950}}),errors=[];page.on("pageerror",e=>errors.push(e.message));
  const installed=await page.request.post(new URL("api/widget-packages",url).href,{headers:{"X-Package-Name":"ugso.industrial.wg"},data:await readFile(new URL("../packages/industrial/ugso.industrial.wg",import.meta.url))});assert.ok(installed.ok() || /bereits installiert/.test(await installed.text()));
  const packages=await(await page.request.get(new URL("api/widget-packages",url).href)).json(),definitions=packages.packages.find(p=>p.id==="ugso.industrial").widgets;
  let fixture=await(await page.request.get(new URL("api/project",url).href)).json();fixture.settings={...fixture.settings,autoSave:false};
  fixture.pages[0].widgets=["switch","rocker-switch"].map((kind,i)=>{const def=definitions.find(w=>w.type===`ugso.industrial/${kind}`);return {...def.defaults,id:kind,type:def.type,x:80,y:100+i*200,height:128,switchCount:4};});
  const entities=Array.from({length:8},(_,i)=>({entity_id:`switch.test_${i+1}`,name:`Test ${i+1}`}));
  await page.route("**/api/entities*",r=>r.fulfill({json:{entities,states:entities.map(e=>({entity_id:e.entity_id,state:"off"}))}}));
  await page.route("**/api/states*",r=>r.fulfill({json:{states:entities.map(e=>({entity_id:e.entity_id,state:"off"}))}}));
  await page.route("**/api/project*",r=>{if(r.request().method()==="PUT")fixture=r.request().postDataJSON();return r.fulfill({json:fixture});});
  await page.goto(url);await page.locator("#switch .industrial-switch").waitFor();
  for(const id of ["switch","rocker-switch"]){
   await page.locator(`#${id} .industrial-switch-caption`).first().click();await page.locator("#properties details").evaluateAll(items=>items.forEach(el=>el.open=true));
   for(let n=1;n<=4;n++)for(const [direction,index] of [["input",n],["output",n+4]]){
    const input=page.locator(`[data-property-key='${direction}EntityId${n}']`);await input.locator("..").getByRole("button",{name:"Home-Assistant-Entität auswählen",exact:true}).click();
    await page.locator("#entities-search").fill(`switch.test_${index}`);await page.locator("#entities-tree").getByText(`Test ${index}`,{exact:true}).click();await page.locator("#entities-insert").click();
    assert.equal(await input.inputValue(),`switch.test_${index}`);
   }
  }
  await page.locator("#save").click();await page.waitForFunction(()=>document.querySelector("#status").textContent.includes("gespeichert"));
  for(const widget of fixture.pages[0].widgets)for(let n=1;n<=4;n++){assert.equal(widget[`inputEntityId${n}`],`switch.test_${n}`);assert.equal(widget[`outputEntityId${n}`],`switch.test_${n+4}`);}
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
