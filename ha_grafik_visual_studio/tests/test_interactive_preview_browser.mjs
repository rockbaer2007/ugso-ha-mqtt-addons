import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { INTERACTIVE_PREVIEW_TYPES } from "../web/interactive-preview.js";

const url = process.env.STUDIO_TEST_URL;
test("all interactive palette previews fill their frames in both themes without actions", { skip: !url }, async () => {
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
  const browser = await chromium.launch({headless:true, channel:process.env.STUDIO_THEME_BROWSER || undefined});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled",{cacheDisabled:true});
    const fixture = await (await page.request.get(new URL("api/project",url).href)).json();
    fixture.settings = {...fixture.settings, autoSave:false};
    let actions = 0;
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/project*", route => route.fulfill({json:fixture}));
    await page.route("**/api/action*", route => {actions++; return route.fulfill({json:{ok:true}});});
    await page.goto(url);
    const group = page.locator('.widget-group[data-widget-set-id="ha-grafik-basic2"]');
    await group.waitFor();
    await group.evaluate(el => {el.open=true;});
    for (const theme of ["light","dark"]) {
      await page.emulateMedia({colorScheme:theme});
      for (const type of INTERACTIVE_PREVIEW_TYPES) {
        const preview = group.locator(`[data-widget-type="${type}"] .widget-choice-preview`);
        const geometry = await preview.evaluate(el => {
          const svg = el.querySelector("svg"), box = svg.getBoundingClientRect();
          return {kind:el.dataset.kind, width:el.clientWidth,height:el.clientHeight,svgWidth:box.width,svgHeight:box.height,
            interactive:svg.querySelectorAll("input,button,a,foreignObject,script").length, aria:svg.getAttribute("aria-hidden")};
        });
        assert.equal(geometry.kind,"interactive",type);
        assert.ok(Math.abs(geometry.width-geometry.svgWidth)<1,`${theme} ${type}: width`);
        assert.ok(Math.abs(geometry.height-geometry.svgHeight)<1,`${theme} ${type}: height`);
        assert.equal(geometry.interactive,0); assert.equal(geometry.aria,"true");
      }
      if (process.env.STUDIO_PREVIEW_SCREENSHOT) await group.screenshot({path:process.env.STUDIO_PREVIEW_SCREENSHOT.replace(".png",`-${theme}.png`)});
    }
    await group.locator('[data-widget-type="styled-switch"]').click();
    await page.locator('#stage [data-widget-type="styled-switch"], #stage .styled-switch').first().waitFor();
    await page.locator('#widget-finder-toggle').click();
    const selector = page.locator('#widget-selector-list [data-kind="interactive"]');
    assert.equal(await selector.count(),1);
    for (const theme of ["dark","light"]) {
      await page.emulateMedia({colorScheme:theme});
      assert.equal(await selector.evaluate(el => Math.round(el.querySelector('svg').getBoundingClientRect().width)),await selector.evaluate(el => el.clientWidth));
    }
    assert.equal(actions,0);
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
});
