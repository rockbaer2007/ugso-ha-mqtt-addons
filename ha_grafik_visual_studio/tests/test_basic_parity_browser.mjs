import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import { getWidgetSets } from "../web/widget-registry.js";
import "../web/widget-sets/core.js";
const url = process.env.STUDIO_TEST_URL;
test("all Basic entries render in DE EN FR; controls, sources and save/reload remain compatible", { skip: !url }, async () => {
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
  const browser = await chromium.launch({ headless: true, channel: process.env.STUDIO_THEME_BROWSER || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } }), errors = [];
    const cdp = await page.context().newCDPSession(page); await cdp.send("Network.enable"); await cdp.send("Network.setCacheDisabled", {cacheDisabled:true});
    page.on("pageerror", error => { errors.push(error.message); console.error(error.message); });
    const fixture = await (await page.request.get(new URL("api/project", url).href)).json();
    fixture.settings = { ...fixture.settings, autoSave: false };
    Object.assign(fixture.pages[0].page, { width: 1150, height: 1150 });
    fixture.currentPageId = fixture.pages[0].id;
    fixture.pages[0].widgets = getWidgetSets()[0].widgets.map((w, index) => ({ ...structuredClone(w.defaults), id: "basic-" + w.type, type: w.type, x: 30 + index % 5 * 220, y: 30 + Math.floor(index / 5) * 110, width: 200, height: 85, visible: true, state: "1", basicLocale: "de", generalEnabled: false }));
    const widgets = fixture.pages[0].widgets, find = type => widgets.find(w => w.type === type);
    Object.assign(find("sensor"), { state: 12345.678, automaticDigits: true, thousandsSeparator: true, decimalComma: true, qualityEntityId: "sensor.quality", qualityClassTrue: "quality-good" });
    Object.assign(find("note"), { state: "<b>Note</b><script>window.badNote=true</script>", noteHtml: true });
    Object.assign(find("bool-display"), { booleanMode: "reference", min: "10", max: "20", state: 19, htmlFalse: "Off sentinel", htmlTrue: "On sentinel" });
    Object.assign(find("ackflag-html"), { ackMode: "entity", ackEntityId: "sensor.ack", htmlFalse: "Pending", htmlTrue: "Confirmed" });
    Object.assign(find("link"), { htmlContent: "A link", linkUrl: "https://example.com", linkTarget: "_blank" });
    Object.assign(find("table"), { tableStyle: "classic", tableData: '[{"Name":"Room","Value":22}]', maxColumns: 2 });
    let saved;
    await page.route("**/api/project*", route => { if (route.request().method() === "PUT") saved = route.request().postDataJSON(); return route.fulfill({ json: saved || fixture }); });
    const states = [{entity_id:"sensor.ack",state:"off"},{entity_id:"sensor.quality",state:"on"}];
    await page.route("**/api/entities*", route => route.fulfill({json:{entities:[],states}}));
    await page.route("**/api/states*", route => route.fulfill({json:{states}}));
    await page.route("**/api/viewer", route => route.fulfill({json:{groups:["system-users"]}}));
    for (const locale of ["de", "en", "fr"]) for (const theme of ["light", "dark"]) {
      await page.emulateMedia({ colorScheme: theme });
      find("bar").basicControlStyle = theme === "light" ? "native" : "modern";
      for (const widget of widgets) widget.basicLocale = locale;
      await page.goto(url);
      try { await page.waitForSelector("#basic-sensor", {timeout:8000}); }
      catch (error) { console.error("Studio status:", await page.locator("#status").textContent()); console.error("Body:", (await page.locator("body").textContent()).slice(-1000)); throw error; }
      assert.equal(await page.locator("#stage > [data-widget-id]").count(), 48);
      assert.match(await page.locator("#basic-sensor .value").textContent(), /12\.345,678/);
      assert.equal(await page.locator("#basic-note b").textContent(), "Note");
      assert.equal(await page.evaluate(() => Boolean(window.badNote)), false);
      assert.equal(await page.locator("#basic-bool-display .bool-html").textContent(), "Off sentinel");
      assert.equal(await page.locator("#basic-link a").getAttribute("target"), "_blank");
      assert.equal(await page.locator("#basic-fullscreen button").isDisabled(), true);
      assert.equal(await page.locator("#basic-fullscreen svg").count(), 1);
      assert.equal(await page.locator("#basic-table .tclass-th1").count(), 2);
      assert.equal(await page.locator("#basic-table .vis-table-header").count(), 1);
      assert.equal(await page.locator("#basic-bar progress").count(), theme === "light" ? 1 : 0);
      await page.locator("#basic-ackflag-html").dispatchEvent("click");
      assert.ok((await page.locator("#properties").textContent()).includes({ de:"Bestätigungsquelle",en:"Acknowledgment source",fr:"Source de confirmation" }[locale]));
      await page.locator("#save").click(); await page.waitForFunction(() => document.querySelector("#status")?.textContent.includes("gespeichert"));
      const ack = saved.pages[0].widgets.find(w => w.type === "ackflag-html"); assert.equal(ack.ackEntityId,"sensor.ack"); assert.equal(ack.basicLocale,locale);
      await page.reload(); assert.equal(await page.locator("#basic-bool-display .bool-html").textContent(), "Off sentinel");
      if (locale === "fr" && theme === "dark" && process.env.STUDIO_BASIC_SCREENSHOT) await page.screenshot({path:process.env.STUDIO_BASIC_SCREENSHOT});
      saved = undefined;
    }
    await page.goto(url + "?mode=runtime"); await page.waitForSelector("#basic-ackflag-html");
    await page.waitForFunction(() => document.querySelector("#basic-ackflag-html .bool-html")?.textContent === "Pending");
    assert.equal(await page.locator("#basic-sensor.quality-good").count(), 1);
    assert.equal(await page.locator("#basic-fullscreen button").isDisabled(), false);
    find("view-in-widget").targetPage = "subpage-1";
    Object.assign(find("navigation"), { targetPage: "subpage-2", subView: "basic-view-in-widget", navHtml: "Subview switch" });
    fixture.pages.push(...[1,2].map(index => ({ id:`subpage-${index}`, name:`Subpage ${index}`, page:{width:400,height:200}, widgets:[{id:`child-${index}`,type:"text",x:0,y:0,width:200,height:60,textContent:`Child ${index}`}]})));
    Object.assign(find("bool-html-control"), { entityId:"switch.main", state:"off", extraControlEnabled:true, extraTrueEntityId:"input_text.extra", extraValueTrue:"Additional value" });
    Object.assign(find("speech-to-text"), { entityId:"input_text.speech", speechKeywordOnly:true, keywords:"heating", speechMode:"continuous" });
    Object.assign(find("text"), { visibilityEnabled:true, visibilityGroups:"system-admin", visibilityFallback:"ausblenden" });
    states.push({entity_id:"switch.main",state:"off"},{entity_id:"input_text.extra",state:""},{entity_id:"input_text.speech",state:""});
    const writes = [];
    await page.route("**/api/material-value", route => { writes.push(route.request().postDataJSON()); return route.fulfill({json:{ok:true}}); });
    await page.route("**/api/helper-value", route => { writes.push(route.request().postDataJSON()); return route.fulfill({json:{ok:true}}); });
    await page.route("**/api/switch", route => { writes.push(route.request().postDataJSON()); return route.fulfill({json:{ok:true}}); });
    await page.addInitScript(() => {
      window.SpeechRecognition = class {
        start() { window.testRecognition=this; this.onstart?.(); }
        stop() { this.onend?.(); }
        abort() { this.onend?.(); }
      };
    });
    await page.goto(url + "?mode=runtime");
    await page.waitForSelector("#basic-bool-html-control [role=button][aria-disabled=false]", {timeout:5000});
    await page.locator("#basic-bool-html-control [role=button]").click();
    await page.waitForTimeout(150);
    assert.ok(writes.some(value=>value.entity_id==="input_text.extra"&&value.value==="Additional value"));
    const firstFrame = page.locator("#basic-view-in-widget iframe"); await firstFrame.waitFor();
    assert.match(await firstFrame.getAttribute("src"), /subpage-1/);
    await page.locator("#basic-navigation .widget-navigation").dispatchEvent("click");
    await page.waitForFunction(()=>document.querySelector("#basic-view-in-widget iframe")?.getAttribute("src").includes("subpage-2"));
    assert.equal(await page.locator("#basic-text").count(),0);
    await page.locator("#basic-speech-to-text button").click();
    await page.evaluate(()=>{const result=[{transcript:"Turn heating on"}];result.isFinal=true;window.testRecognition.onresult({resultIndex:0,results:[result]});});
    await page.waitForTimeout(150);
    assert.ok(writes.some(value=>value.entity_id==="input_text.speech"&&value.value==="heating"));
    assert.equal(await page.locator("#basic-speech-to-text button").getAttribute("aria-pressed"),"true");
    await page.locator("#basic-speech-to-text button").click();
    assert.equal(await page.locator("#basic-speech-to-text button").getAttribute("aria-pressed"),"false");
    Object.assign(find("bool-html-control"), {entityId:"sensor.main",extraActionMode:"replace"});
    states.push({entity_id:"sensor.main",state:"off"}); writes.length=0;
    await page.goto(url + "?mode=runtime"); await page.waitForSelector("#basic-bool-html-control [aria-disabled=false]");
    await page.locator("#basic-bool-html-control [role=button]").click(); await page.waitForTimeout(150);
    assert.ok(writes.some(value=>value.entity_id==="input_text.extra"));
    assert.ok(!writes.some(value=>value.entity_id==="sensor.main"||value.entity_id==="switch.main"));
    let urlRequests=0;
    Object.assign(find("bool-html-control"), {extraUrlTrue:"/basic-proof-url",extraUrlMode:"request"});
    await page.route("**/basic-proof-url", route=>{urlRequests++;return route.fulfill({body:""});});
    await page.route("**/api/material-value", route=>route.fulfill({status:400,json:{error:"Entität ist nicht verfügbar."}}));
    await page.goto(url + "?mode=runtime"); await page.waitForSelector("#basic-bool-html-control [aria-disabled=false]");
    await page.locator("#basic-bool-html-control [role=button]").click(); await page.waitForTimeout(150);
    assert.equal(urlRequests,0);
    assert.equal(await page.locator("#runtime-control-error").isVisible(),true);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
