import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const url = process.env.STUDIO_TEST_URL;
test("download a Studio page and import that file with its internal reference", { skip: !url }, async () => {
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
  const browser = await chromium.launch({ channel: process.env.STUDIO_THEME_BROWSER || undefined });
  try {
    const page = await browser.newPage();
    await page.goto(url);
    await page.locator("#page-import").click();
    const dialog = page.locator(".page-transfer-dialog");
    const source = {id: "source", name: "Roundtrip", page: {}, widgets: [
      {id: "text", type: "text", x: 20, y: 20, width: 100, height: 40},
      {id: "connection", type: "svg-connection", x: 30, y: 80, width: 100, height: 20, startWidgetId: "text"},
    ]};
    await dialog.locator("textarea").fill(JSON.stringify({pages: [source]}));
    await dialog.getByRole("button", {name: "Importieren", exact: true}).click();
    await page.locator("#page-export").click();
    const pending = page.waitForEvent("download");
    await dialog.getByRole("button", {name: "Datei herunterladen"}).click();
    const download = await pending;
    const content = JSON.parse(await readFile(await download.path(), "utf8"));
    assert.equal(content.page.name, "Roundtrip");
    assert.equal(content.page.widgets[1].startWidgetId, content.page.widgets[0].id);
    await dialog.getByRole("button", {name: "Schließen"}).click();
    await page.locator("#page-import").click();
    await dialog.locator("input[type=file]").setInputFiles({
      name: download.suggestedFilename(), mimeType: "application/json", buffer: Buffer.from(JSON.stringify(content)),
    });
    await dialog.getByRole("button", {name: "Importieren", exact: true}).click();
    await page.locator("#page-export").click();
    const copy = JSON.parse(await dialog.locator("textarea").inputValue()).page;
    assert.equal(copy.name, "Roundtrip (2)");
    assert.equal(copy.widgets[1].startWidgetId, copy.widgets[0].id);
    assert.notEqual(copy.widgets[0].id, content.page.widgets[0].id);
  } finally {
    await browser.close();
  }
});
