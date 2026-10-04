import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

// Opt-in browser test: point STUDIO_THEME_TEST_URL at an isolated Studio server.
// PLAYWRIGHT_MODULE may identify a bundled Playwright installation.
const preview = process.env.STUDIO_THEME_TEST_URL;
function contrast(foreground, background) {
  const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => {
    value /= 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

test("browser themes switch live with readable shell controls and preserve project colors", { skip: !preview }, async () => {
  const require = createRequire(import.meta.url);
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
  const browser = await chromium.launch({ headless: true, channel: process.env.STUDIO_THEME_BROWSER || undefined });
  try {
    const context = await browser.newContext({ colorScheme: "dark", viewport: { width: 1600, height: 1000 } });
    const page = await context.newPage();
    const before = await (await context.request.get(new URL("api/project", preview).href)).json();
    const fixture = structuredClone(before);
    fixture.pages[0].page.background = "#f8dc9a";
    fixture.pages[0].widgets = [{ id: "theme-test-text", type: "text", x: 30, y: 30, width: 240, height: 60,
      title: "Theme test", textContent: "Fixed project colors", textColor: "#ffcc00", backgroundColor: "#305060" }];
    let writes = 0;
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/project*", async route => {
      if (route.request().method() !== "GET") writes++;
      await route.fulfill({ json: fixture });
    });
    await page.goto(preview);
    await page.locator("#theme-test-text .widget-content").waitFor();
    await page.evaluate(() => { window.themeTestMarker = "same-document"; });
    await page.locator("#settings-menu").click();
    for (const scheme of ["dark", "light", "dark"]) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.waitForFunction(value => getComputedStyle(document.documentElement).colorScheme === value, scheme);
      const appearance = await page.evaluate(() => {
        const style = selector => getComputedStyle(document.querySelector(selector));
        const body = style("body"), dialog = style("#settings-dialog"), button = style("#settings-dialog .primary"),
          field = style("#settings-dialog input:not([type='checkbox'])"), widget = style("#theme-test-text .widget-content");
        return { shellText: body.color, shellBg: body.backgroundColor,
          dialogText: dialog.color, dialogBg: dialog.backgroundColor,
          buttonText: button.color, buttonBg: button.backgroundColor,
          fieldText: field.color, fieldBg: field.backgroundColor,
          stageBg: style(".stage").backgroundColor, widgetBg: widget.backgroundColor, widgetText: widget.color,
          marker: window.themeTestMarker };
      });
      for (const part of ["shell", "dialog", "button", "field"]) {
        assert.ok(contrast(appearance[part + "Text"], appearance[part + "Bg"]) >= 4.5, `${scheme}: ${part} contrast`);
      }
      assert.equal(appearance.marker, "same-document");
      assert.equal(appearance.stageBg, "rgb(248, 220, 154)");
      assert.equal(appearance.widgetBg, "rgb(48, 80, 96)");
      assert.equal(appearance.widgetText, "rgb(255, 204, 0)");
      if (process.env.STUDIO_THEME_SCREENSHOTS) {
        await mkdir(process.env.STUDIO_THEME_SCREENSHOTS, { recursive: true });
        await page.screenshot({ path: join(process.env.STUDIO_THEME_SCREENSHOTS, `studio-${scheme}.png`) });
      }
    }
    await page.emulateMedia({ colorScheme: "light" });
    await page.setViewportSize({ width: 390, height: 844 });
    const dialogBounds = await page.locator("#settings-dialog").boundingBox();
    assert.ok(dialogBounds.x >= 0 && dialogBounds.x + dialogBounds.width <= 390);
    assert.equal(writes, 0, "changing browser theme must not save project settings");
    assert.deepEqual(await (await context.request.get(new URL("api/project", preview).href)).json(), before);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
