import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";

const url = process.env.STUDIO_TEST_URL;
for (const width of [1600, 1280]) test(`clipboard toolbar icons and popup actions at ${width}px share selection, clipboard and undo`, {skip: !url}, async () => {
  const {chromium} = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
  const browser = await chromium.launch({headless: true, channel: process.env.STUDIO_THEME_BROWSER || undefined});
  try {
    const page = await browser.newPage({viewport: {width, height: 1100}});
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const fixture = await (await page.request.get(new URL("api/project", url).href)).json();
    fixture.pages[0].widgets = [{id: "widget-1", type: "string", name: "Clipboard source", state: "Test", x: 80, y: 80, width: 180, height: 80}];
    fixture.currentPageId = fixture.pages[0].id;
    fixture.settings = {...fixture.settings, autoSave: false};
    let saved;
    await page.route("**/api/project*", route => {
      if (route.request().method() === "PUT") saved = route.request().postDataJSON();
      return route.fulfill({json: saved || fixture});
    });
    const count = () => page.locator("#stage > .widget").count();
    const popup = async (label, widget = "#widget-1") => {
      await page.locator(widget).click({button: "right", position: {x: 10, y: 10}});
      await page.getByRole("menuitem", {name: label, exact: true}).click();
    };
    await page.goto(url);
    await page.locator("#widget-1").click({position: {x: 10, y: 10}});
    assert.equal(await page.locator("#widget-copy").isEnabled(), true);
    await page.locator("#widget-copy").click();
    assert.match(await page.locator("#status").textContent(), /kopiert/);
    assert.equal(await page.locator("#widget-paste").isEnabled(), true);
    await page.locator("#widget-paste img").click();
    assert.equal(await count(), 2);
    await page.locator("#widget-cut").click();
    assert.equal(await count(), 1);
    await page.locator("#widget-paste img").click();
    assert.equal(await count(), 2);
    await page.locator("#widget-undo").click();
    assert.equal(await count(), 1);
    await page.locator("#widget-undo").click();
    assert.equal(await count(), 2);
    await popup("Kopieren");
    await page.locator("#widget-paste img").click();
    assert.equal(await count(), 3);
    await popup("Ausschneiden");
    assert.equal(await count(), 2);
    await popup("Einfügen", "#stage");
    assert.equal(await count(), 3);
    await page.locator("#save").click();
    await page.waitForFunction(() => document.querySelector("#status").textContent.includes("gespeichert"));
    assert.equal(saved.pages[0].widgets.length, 3);
    assert.equal(new Set(saved.pages[0].widgets.map(widget => widget.id)).size, 3);
    await page.locator("#widget-finder-toggle").click();
    await page.locator("#widget-selector-all").check();
    await page.locator("#widget-selector-select").click();
    await page.locator("#widget-copy").click();
    await page.locator("#widget-paste img").click();
    assert.equal(await count(), 6);
    await page.locator("#widget-cut").click();
    assert.equal(await count(), 3);
    assert.equal(await page.locator("#widget-copy").isEnabled(), false);
    assert.equal(await page.locator("#widget-paste").isEnabled(), true);
    await page.locator("#widget-paste img").click();
    assert.equal(await count(), 6);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
