import test from "node:test";
import assert from "node:assert/strict";
import { borderAppearance } from "../web/border-widget.js";
import { getWidgetDefinition } from "../web/widget-registry.js";
import "../web/widget-sets/core.js";

test("Border title uses absolute reference offsets and theme fallback", () => {
  assert.deepEqual(borderAppearance({}).title, { top: "-10px", left: "20px", backgroundColor: "#000000", color: "inherit" });
  assert.equal(borderAppearance({}, true).title.backgroundColor, "#FFFFFF");
  assert.equal(borderAppearance({ titleTopOffset: 0, titleLeftOffset: -20 }).title.left, "-20px");
  assert.equal(borderAppearance({ titleTopOffset: 0 }).title.top, "0px");
});
test("Border header and explicit colors remain independent", () => {
  const result = borderAppearance({ headerHeight: 24, headerColor: "#7CBD8D", titleBackground: "#816FD8", titleColor: "#222222" });
  assert.deepEqual(result.header, { height: "24px", backgroundColor: "#7CBD8D" });
  assert.equal(result.title.backgroundColor, "#816FD8");
  assert.equal(result.title.color, "#222222");
  assert.equal(borderAppearance({ headerHeight: 24 }).title.backgroundColor, "transparent");
  assert.equal(borderAppearance({ headerHeight: 120 }).header.height, "100px");
});
test("Border exposes the six reference fields and required general CSS", () => {
  const definition = getWidgetDefinition("border");
  assert.deepEqual(definition.propertyGroups.find(group => group.label === "Allgemein").fields.map(field => field.key), ["title", "titleBackground", "titleTopOffset", "titleLeftOffset", "headerHeight", "headerColor"]);
  assert.equal(definition.defaults.width, 100); assert.equal(definition.defaults.height, 70);
  assert.equal(definition.defaults.borderColor, "#888888");
  assert.ok(definition.propertyGroups.find(group => group.label === "CSS Allgemein").required);
  assert.ok(definition.propertyGroups.filter(group => group.css && group.label !== "CSS Allgemein").every(group => group.defaultEnabled === false));
});
