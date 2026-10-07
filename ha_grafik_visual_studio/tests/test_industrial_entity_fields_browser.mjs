import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFile} from "node:fs/promises";
const url=process.env.STUDIO_INDUSTRIAL_TEST_URL;
test("every Industrial entity field opens the picker and receives the selected ID",{skip:!url},async()=>{
 const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||"playwright");const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER||undefined});
 try{
  const page=await browser.newPage({viewport:{width:1400,height:950}}),errors=[];page.on("pageerror",e=>errors.push(e.message));
  const installed=await page.request.post(new URL("api/widget-packages",url).href,{headers:{"X-Package-Name":"ugso.industrial.wg"},data:await readFile(new URL("../packages/industrial/ugso.industrial.wg",import.meta.url))});assert.ok(installed.ok() || /bereits installiert/.test(await installed.text()));
  const packages=await(await page.request.get(new URL("api/widget-packages",url).href)).json(),definitions=packages.packages.find(p=>p.id==="ugso.industrial").widgets;
  const fixture=await(await page.request.get(new URL("api/project",url).href)).json();fixture.settings={...fixture.settings,autoSave:false};
  await page.route("**/api/project*",r=>r.fulfill({json:fixture}));
  await page.route("**/api/entities*",r=>r.fulfill({json:{entities:[{entity_id:"switch.test",name:"Testentität"}],states:[{entity_id:"switch.test",state:"off"}]}}));
  await page.route("**/api/states*",r=>r.fulfill({json:{states:[{entity_id:"switch.test",state:"off"}]}}));
  let checked=0;
  for(const def of definitions){
   const fields=def.propertyGroups.flatMap(g=>g.fields).filter(f=>/entity/i.test(f.key));
   fixture.pages[0].widgets=[{...def.defaults,type:def.type,id:"probe",x:80,y:100,switchCount:4}];
   await page.goto(url);await page.locator("#probe").waitFor();await page.locator("#probe").click({position:{x:15,y:15}});await page.locator("#properties details").evaluateAll(items=>items.forEach(el=>el.open=true));
   for(const field of fields){
    const input=page.locator(`#properties [data-property-key='${field.key}']`);assert.equal(await input.count(),1,`${def.type}: ${field.key}`);
    await input.locator("..").getByRole("button",{name:"Home-Assistant-Entität auswählen",exact:true}).click();
    await page.locator("#entities-search").fill("switch.test");await page.locator("#entities-tree").getByText("Testentität",{exact:true}).click();await page.locator("#entities-insert").click();
    assert.equal(await input.inputValue(),"switch.test",`${def.type}: ${field.key}`);checked++;
   }
  }
  assert.equal(checked,56);assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
