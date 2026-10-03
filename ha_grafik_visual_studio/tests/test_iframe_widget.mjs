import test from "node:test";
import assert from "node:assert/strict";
import { mediaRefreshUrl, iframeOptions } from "../web/iframe-widget.js";
import { getWidgetDefinition } from "../web/widget-registry.js";
import "../web/widget-sets/core.js";

test("Media refresh preserves existing query parameters and fragments", () => {
  const url = new URL(mediaRefreshUrl("https://example.org/page?lang=de#section", "https://studio.example/", true, false, 123));
  assert.equal(url.searchParams.get("lang"), "de");
  assert.equal(url.searchParams.get("_gvs"), "123");
  assert.equal(url.hash, "#section");
  assert.equal(mediaRefreshUrl("/page", "https://studio.example/", false, false), "/page");
  assert.equal(mediaRefreshUrl("/page?x=1#s", "https://studio.example/", true, true), "/page?x=1#s");
  assert.equal(mediaRefreshUrl("data:image/png;base64,AA", "https://studio.example/", true, false), "data:image/png;base64,AA");
});

test("Frame options apply sandbox and independent overflow preferences", () => {
  assert.equal(iframeOptions({}).sandbox, "allow-scripts allow-forms");
  const options = iframeOptions({ noSandbox: true, noFrame: false, scrollX: false, scrollY: true });
  assert.equal(options.sandbox, null);
  assert.equal(options.border, "1px solid currentColor");
  assert.equal(options.scrolling, "yes");
  assert.equal(options.overflowX, "hidden");
  assert.equal(options.overflowY, "scroll");
});

test("iFrame exposes reference field order, size and required CSS", () => {
  const definition = getWidgetDefinition("iframe");
  assert.equal(definition.defaults.width, 600);
  assert.equal(definition.defaults.height, 320);
  assert.equal(definition.defaults.refreshInterval, 0);
  const fields = definition.propertyGroups.find(group => group.label === "Allgemein").fields;
  assert.deepEqual(fields.map(field => field.key), ["source", "refreshInterval", "noSandbox", "refreshOnWake", "refreshOnView", "noCacheBuster", "scrollX", "scrollY", "noFrame"]);
  assert.deepEqual(definition.propertyGroups.filter(group => group.css && group.defaultEnabled).map(group => group.label), ["CSS Allgemein"]);
});
