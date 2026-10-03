import test from "node:test";
import assert from "node:assert/strict";
import { imageOptions, imageCount, imageIndex } from "../web/image-widget.js";
import { getWidgetDefinition } from "../web/widget-registry.js";
import "../web/widget-sets/core.js";
test("Image 8 bounds the highest inclusive index at 200", () => {
  assert.equal(imageCount({}), 0);
  assert.equal(imageCount({ count: 1000 }), 200);
  assert.equal(imageCount({ count: -2 }), 0);
  assert.equal(imageCount({ count: 3.8 }), 3);
  assert.equal(imageCount({ count: "invalid" }), 0);
  const widget = { count: 200, imageSource0: "first.svg", imageSource200: "last.svg" };
  assert.equal(imageIndex(widget, "200"), 200);
  for (const value of [201, -1, 0.5, "", "unknown", "unavailable"]) assert.equal(imageIndex(widget, value), -1);
  assert.equal(imageIndex(widget, 100), 100); // Empty sources do not renumber indices.
  assert.equal(imageIndex({ ...widget, enabledPropertyGroups: { "indexed-image-8-200": false } }, 200), -1);
});
test("Image 8 accepts HA boolean states and defaults missing states to zero", () => {
  const widget = { count: 1 };
  for (const value of [null, undefined, false, "false", "off", 0]) assert.equal(imageIndex(widget, value), 0);
  for (const value of [true, "true", "on", 1]) assert.equal(imageIndex(widget, value), 1);
  assert.equal(imageIndex({ count: 0 }, true), -1);
});
test("Image 8 exposes standard settings without a test-state field", () => {
  const widget = getWidgetDefinition("image-8");
  const fields = widget.propertyGroups.find(group => group.label === "Allgemein").fields;
  assert.deepEqual(fields.map(field => field.key), ["entityId", "count", "stretch", "refreshInterval", "refreshOnWake", "refreshOnView", "noCacheBuster", "allowUserInteractions"]);
  assert.equal(fields.find(field => field.key === "count").max, 200);
  assert.equal(fields.find(field => field.key === "count").min, 0);
  assert.equal(widget.defaults.count, 0);
  assert.equal(widget.defaults.width, 200); assert.equal(widget.defaults.height, 130);
  assert.ok(widget.propertyGroups.find(group => group.label === "CSS Allgemein").required);
  assert.ok(widget.propertyGroups.filter(group => group.css && group.label !== "CSS Allgemein").every(group => group.defaultEnabled === false));
});
test("Image uses width-based natural sizing or explicit stretching", () => {
  assert.equal(imageOptions({}, true).width, "100%");
  assert.equal(imageOptions({}, true).height, "auto");
  assert.equal(imageOptions({ stretch: true }, true).height, "100%");
  assert.equal(imageOptions({}, true).maxHeight, "none");
});
test("native interactions are opt-in and remain disabled in the editor", () => {
  assert.equal(imageOptions({}, true).pointerEvents, "none");
  assert.equal(imageOptions({ allowUserInteractions: true }, true).draggable, true);
  assert.equal(imageOptions({ allowUserInteractions: true }, false).draggable, false);
});
test("Image exposes the reference settings, with CSS General required", () => {
  const widget = getWidgetDefinition("image");
  const general = widget.propertyGroups.find(group => group.label === "Allgemein");
  assert.deepEqual(general.fields.map(field => field.key), ["imageSrc", "stretch", "refreshInterval", "refreshOnWake", "refreshOnView", "noCacheBuster", "allowUserInteractions"]);
  assert.equal(widget.defaults.width, 200); assert.equal(widget.defaults.height, 130);
  assert.ok(widget.propertyGroups.find(group => group.label === "CSS Allgemein").required);
  assert.ok(widget.propertyGroups.filter(group => group.css && group.label !== "CSS Allgemein").every(group => group.defaultEnabled === false));
});
