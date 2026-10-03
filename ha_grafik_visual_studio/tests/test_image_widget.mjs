import test from "node:test";
import assert from "node:assert/strict";
import { imageOptions } from "../web/image-widget.js";
import { getWidgetDefinition } from "../web/widget-registry.js";
import "../web/widget-sets/core.js";
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
