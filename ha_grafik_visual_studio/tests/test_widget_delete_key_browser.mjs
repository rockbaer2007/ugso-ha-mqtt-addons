import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const url = process.env.STUDIO_TEST_URL;
test("Delete confirms selected widgets and respects editing, dialogs, runtime and undo", { skip: !url }, async () => {
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
  const browser = await chromium.launch({ headless: true, channel: process.env.STUDIO_THEME_BROWSER || undefined });
  try {
    for (const locale of ["de", "en"]) {
      const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } }), errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.addInitScript(locale => localStorage.setItem("ha_grafik_visual_studio_language", locale), locale);
      const fixture = await (await page.request.get(new URL("api/project", url).href)).json();
      fixture.pages[0].widgets = [1, 2].map(number => ({ id: `widget-${number}`, type: "string", name: `Delete ${number}`, state: "Test", x: number * 200, y: 80, width: 180, height: 80 }));
      fixture.currentPageId = fixture.pages[0].id;
      fixture.settings = { ...fixture.settings, autoSave: false };
      await page.route("**/api/project*", route => route.fulfill({ json: fixture }));
      await page.goto(url); await page.locator("#widget-1").waitFor();
      const count = () => page.locator("#stage > .widget").count();
      const dialog = page.locator(".widget-delete-dialog");
      const cancel = () => dialog.getByRole("button", { name: /Abbrechen|Cancel/ }).click();
      const accept = () => dialog.getByRole("button", { name: /Löschen|Delete/ }).click();
      await page.keyboard.press("Delete"); assert.equal(await dialog.count(), 0);
      await page.locator("#widget-1").click({ position: { x: 10, y: 10 } });
      await page.keyboard.press("Delete"); await dialog.waitFor();
      assert.match(await dialog.innerText(), locale === "de" ? /Widgets löschen/ : /Delete widgets/);
      await page.keyboard.press("Delete"); assert.equal(await dialog.count(), 1, "open dialog prevents another deletion prompt");
      await cancel(); assert.equal(await count(), 2);
      // Native fields retain Delete's text-editing behaviour while a widget is selected.
      for (const tag of ["input", "textarea", "select", "div"]) {
        await page.evaluate(tag => {
          const node = document.createElement(tag); node.id = "delete-edit-test";
          if (tag === "div") { node.contentEditable = "true"; node.textContent = "abc"; }
          else node.value = "abc";
          document.body.append(node); node.focus();
          if (tag === "input" || tag === "textarea") node.setSelectionRange(0, 1);
        }, tag);
        await page.keyboard.press("Delete"); assert.equal(await dialog.count(), 0);
        if (["input", "textarea"].includes(tag)) assert.equal(await page.locator("#delete-edit-test").inputValue(), "bc");
        await page.locator("#delete-edit-test").evaluate(node => node.remove());
      }
      await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", repeat: true, bubbles: true })));
      assert.equal(await dialog.count(), 0, "held key is ignored");
      await page.keyboard.press("Control+Delete"); assert.equal(await dialog.count(), 0);
      await page.keyboard.press("Delete"); await dialog.waitFor(); await accept();
      await page.locator("#widget-1").waitFor({ state: "detached" }); assert.equal(await count(), 1);
      await page.locator("#widget-undo").click(); assert.equal(await count(), 2);
      await page.locator("#widget-finder-toggle").click();
      await page.locator("#widget-selector-all").check(); await page.locator("#widget-selector-select").click();
      await page.keyboard.press("Delete"); await dialog.waitFor();
      assert.match(await dialog.innerText(), /widget-1, widget-2/);
      await accept(); await page.locator("#stage > .widget").first().waitFor({ state: "detached" }); assert.equal(await count(), 0);
      await page.locator("#widget-undo").click(); assert.equal(await count(), 2);
      await page.goto(new URL("?mode=runtime", url).href); await page.locator("#widget-1").waitFor();
      await page.locator("#widget-1").click({ position: { x: 10, y: 10 } }); await page.keyboard.press("Delete");
      assert.equal(await dialog.count(), 0); assert.equal(await count(), 2);
      assert.deepEqual(errors, []); await page.close();
    }
  } finally { await browser.close(); }
});
