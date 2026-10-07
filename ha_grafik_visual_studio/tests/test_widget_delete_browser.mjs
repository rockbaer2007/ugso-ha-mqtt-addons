import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFile} from "node:fs/promises";

const url = process.env.STUDIO_TEST_URL;
test("delete icon follows canvas and multiple selection, cancellation, deletion and undo", {skip: !url}, async () => {
  const {chromium} = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
  const browser = await chromium.launch({headless: true, channel: process.env.STUDIO_THEME_BROWSER || undefined});
  try {
    const page = await browser.newPage({viewport: {width: 1600, height: 1100}});
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const fixture = await (await page.request.get(new URL("api/project", url).href)).json();
    fixture.pages[0].widgets = [1, 2].map(number => ({id: `widget-${number}`, type: "string", name: `Delete ${number}`, state: "Test", x: number * 200, y: 80, width: 180, height: 80}));
    fixture.currentPageId = fixture.pages[0].id;
    fixture.settings = {...fixture.settings, autoSave: false};
    await page.route("**/api/project*", route => route.fulfill({json: fixture}));
    await page.goto(url);
    await page.locator("#widget-1").waitFor();
    assert.equal(await page.locator("#widget-delete").isEnabled(), false);
    await page.locator("#widget-1").click({position: {x: 10, y: 10}});
    assert.equal(await page.locator("#widget-delete").isEnabled(), true);
    await page.locator("#widget-delete img").click();
    await page.locator(".widget-delete-dialog").getByRole("button", {name: /Abbrechen/}).click();
    assert.equal(await page.locator("#stage > .widget").count(), 2);
    assert.equal(await page.locator("#widget-delete").isEnabled(), true);
    await page.locator("#widget-delete img").click();
    await page.locator(".widget-delete-dialog").getByRole("button", {name: /Löschen/}).click();
    await page.locator("#widget-1").waitFor({state: "detached"});
    assert.equal(await page.locator("#stage > .widget").count(), 1);
    assert.equal(await page.locator("#widget-delete").isEnabled(), false);
    await page.locator("#widget-undo").click();
    assert.equal(await page.locator("#stage > .widget").count(), 2);
    await page.locator("#widget-finder-toggle").click();
    await page.locator("#widget-selector-all").check();
    await page.locator("#widget-selector-select").click();
    assert.equal(await page.locator("#widget-delete").isEnabled(), true);
    await page.locator("#widget-delete img").click();
    await page.locator(".widget-delete-dialog").getByRole("button", {name: /Löschen/}).click();
    await page.locator("#stage > .widget").first().waitFor({state: "detached"});
    assert.equal(await page.locator("#stage > .widget").count(), 0);
    assert.equal(await page.locator("#widget-delete").isEnabled(), false);
    await page.locator("#widget-undo").click();
    assert.equal(await page.locator("#stage > .widget").count(), 2);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test("delete icon activates for each Industrial and Energy widget", {skip: !url}, async () => {
  const {chromium} = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
  const browser = await chromium.launch({headless: true, channel: process.env.STUDIO_THEME_BROWSER || undefined});
  try {
    const page = await browser.newPage({viewport: {width: 1600, height: 1100}});
    for (const name of ["industrial", "energy"]) {
      const response = await page.request.post(new URL("api/widget-packages", url).href, {
        headers: {"X-Package-Name": `ugso.${name}.wg`},
        data: await readFile(new URL(`../packages/${name}/ugso.${name}.wg`, import.meta.url)),
      });
      assert.ok(response.ok() || /bereits installiert/i.test(await response.text()));
    }
    const packages = await (await page.request.get(new URL("api/widget-packages", url).href)).json();
    const definitions = packages.packages.filter(item => ["ugso.industrial", "ugso.energy"].includes(item.id)).flatMap(item => item.widgets);
    assert.equal(definitions.length, 24);
    const fixture = await (await page.request.get(new URL("api/project", url).href)).json();
    const base = fixture.pages[0];
    fixture.pages = definitions.map((definition, index) => ({...base, id: `page-${index}`, name: definition.type, widgets: [{...definition.defaults, id: `test-${index}`, type: definition.type, x: 20, y: 20}]}));
    fixture.currentPageId = fixture.pages[0].id;
    fixture.settings = {...fixture.settings, autoSave: false};
    await page.route("**/api/project*", route => route.fulfill({json: fixture}));
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(url);
    for (let index = 0; index < definitions.length; index++) {
      await page.locator(`#editor-page-tabs [data-page-id="page-${index}"]`).click();
      assert.equal(await page.locator("#widget-delete").isEnabled(), false);
      await page.locator(`#test-${index}`).click({position: {x: 5, y: 5}});
      assert.equal(await page.locator("#widget-delete").isEnabled(), true, definitions[index].type);
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
