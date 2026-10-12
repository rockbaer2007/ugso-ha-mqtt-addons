import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const url = process.env.STUDIO_TEST_URL;
test("widget clipboard shortcuts support multiple selection, undo and text/dialog/runtime guards", { skip: !url }, async () => {
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
  const browser = await chromium.launch({ headless: true, channel: process.env.STUDIO_THEME_BROWSER || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } }), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const fixture = await (await page.request.get(new URL("api/project", url).href)).json();
    fixture.pages[0].widgets = [1, 2].map(n => ({ id: `widget-${n}`, type: "string", name: `Source ${n}`, state: `Value ${n}`, x: 200 * n, y: 80, width: 180, height: 80 }));
    fixture.currentPageId = fixture.pages[0].id; fixture.settings = { ...fixture.settings, autoSave: false };
    let saved;
    await page.route("**/api/project*", route => {
      if (route.request().method() === "PUT") saved = route.request().postDataJSON();
      return route.fulfill({ json: saved || fixture });
    });
    await page.goto(url); await page.locator("#widget-1").waitFor();
    const count = () => page.locator("#stage > .widget").count();
    await page.keyboard.press("Control+v"); assert.equal(await count(), 2);
    await page.locator("#widget-1").click({ position: { x: 10, y: 10 } });
    await page.keyboard.press("Control+c"); await page.keyboard.press("Control+v"); assert.equal(await count(), 3);
    await page.keyboard.press("Control+x"); assert.equal(await count(), 2);
    await page.keyboard.press("Control+v"); assert.equal(await count(), 3);
    await page.keyboard.press("Control+z"); assert.equal(await count(), 2);
    await page.keyboard.press("Control+z"); assert.equal(await count(), 3);
    await page.locator("#widget-finder-toggle").click(); await page.locator("#widget-selector-all").check(); await page.locator("#widget-selector-select").click();
    await page.keyboard.press("Control+c"); await page.keyboard.press("Control+v"); assert.equal(await count(), 6);
    await page.keyboard.press("Control+x"); assert.equal(await count(), 3);
    await page.keyboard.press("Control+v"); assert.equal(await count(), 6);
    await page.locator("#save").click(); await page.waitForFunction(() => document.querySelector("#status").textContent.includes("gespeichert"));
    assert.equal(new Set(saved.pages[0].widgets.map(w => w.id)).size, 6);
    assert.deepEqual(saved.pages[0].widgets.map(w => w.state).sort(), ["Value 1", "Value 1", "Value 2", "Value 2", "Value 1", "Value 1"].sort());
    for (const tag of ["input", "textarea", "div"]) {
      await page.evaluate(tag => { const node = document.createElement(tag); node.id = "clipboard-edit-test"; if (tag === "div") { node.contentEditable = "true"; node.textContent = "abc"; } else node.value = "abc"; document.body.append(node); node.focus(); }, tag);
      for (const key of ["c", "x", "v"]) await page.keyboard.press(`Control+${key}`);
      assert.equal(await count(), 6); await page.locator("#clipboard-edit-test").evaluate(node => node.remove());
    }
    await page.evaluate(() => { const dialog = document.createElement("dialog"); dialog.id = "clipboard-dialog-test"; document.body.append(dialog); dialog.showModal(); });
    for (const key of ["c", "x", "v"]) await page.keyboard.press(`Control+${key}`);
    assert.equal(await count(), 6); await page.locator("#clipboard-dialog-test").evaluate(node => { node.close(); node.remove(); });
    await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "v", ctrlKey: true, repeat: true, bubbles: true })));
    assert.equal(await count(), 6);
    await page.keyboard.press("Control+v"); assert.equal(await count(), 9, "text and dialog shortcuts preserve widget clipboard");
    await page.keyboard.press("Control+z"); assert.equal(await count(), 6);
    await page.goto(new URL("?mode=runtime", url).href); await page.locator("#widget-1").waitFor();
    for (const key of ["c", "x", "v"]) await page.keyboard.press(`Control+${key}`);
    assert.equal(await count(), 6); assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
