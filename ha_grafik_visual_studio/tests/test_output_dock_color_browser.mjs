import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const url=process.env.STUDIO_INDUSTRIAL_TEST_URL;
test("all output marker types and occupancy badges use the configured color",{skip:!url},async()=>{
  const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE || "playwright");
  const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER || undefined});
  try {
    const context=await browser.newContext({viewport:{width:1600,height:1000}}),page=await context.newPage();
    let fixture=await(await context.request.get(new URL("api/project",url).href)).json();
    fixture.settings={...fixture.settings,autoSave:false,dockColor:"#112233",outputDockColor:"#ee1188"};
    const common={width:128,height:128,dockPointsEnabled:true,dockAlwaysVisible:true,dock_left_center:true,dock_right_center:true};
    fixture.pages[0].widgets=[
      {...common,id:"gauge",type:"ugso.industrial/gauge-poti",x:24,y:24,state:0,minValue:-20,maxValue:30,dataOutputEnabled:true},
      {...common,id:"converter",type:"value-converter",x:180,y:24},
      {...common,id:"linebox",type:"linebox",x:340,y:24,lineboxRole_right_center:"output",lineboxRole_left_center:"input",lineboxPass_right_center:true},
      {...common,id:"math",type:"linebox-math",x:500,y:24,dock_A:true,dock_E:true,mathRole_A:"input",mathRole_E:"output"},
      {id:"wire",type:"svg-connection",startWidgetId:"gauge",endWidgetId:"converter",startAnchor:"right-center",endAnchor:"left-center"},
      {id:"math-wire",type:"svg-connection",startWidgetId:"math",endWidgetId:"linebox",startAnchor:"E",endAnchor:"left-center"},
    ];
    await page.route("**/api/project*",async route=>{
      if(route.request().method()==="PUT") fixture=route.request().postDataJSON();
      await route.fulfill({json:fixture});
    });
    await page.goto(url);await page.locator("#gauge .widget-dock-point").first().waitFor();
    const outputs=["#gauge [data-anchor-id='right-center']","#converter [data-anchor-id='right-center']","#linebox [data-anchor-id='right-center']","#math [data-anchor-id='E']"];
    const colors=await Promise.all(outputs.map(selector=>page.locator(selector).evaluate(el=>getComputedStyle(el).backgroundColor)));
    assert.deepEqual(colors,Array(4).fill("rgb(238, 17, 136)"));
    assert.equal(await page.locator(outputs[0]).evaluate(el=>getComputedStyle(el,"::after").backgroundColor),"rgb(238, 17, 136)");
    assert.equal(await page.locator("#gauge [data-anchor-id='left-center']").evaluate(el=>getComputedStyle(el).backgroundColor),"rgb(17, 34, 51)");
    await page.locator("#settings-menu").click();await page.locator("#settings-output-dock-color").fill("#00aabb");await page.locator("#settings-save").click();
    await page.waitForFunction(()=>getComputedStyle(document.querySelector("#gauge .output-dock-point")).backgroundColor==="rgb(0, 170, 187)");
    for(const selector of outputs) assert.equal(await page.locator(selector).evaluate(el=>getComputedStyle(el).backgroundColor),"rgb(0, 170, 187)");
    await page.reload();await page.locator(outputs[0]).waitFor();
    assert.equal(await page.locator(outputs[0]).evaluate(el=>getComputedStyle(el).backgroundColor),"rgb(0, 170, 187)");
  } finally {await browser.close();}
});
