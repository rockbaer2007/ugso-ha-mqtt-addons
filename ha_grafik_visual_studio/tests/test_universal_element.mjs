import test from "node:test";
import assert from "node:assert/strict";
import { UNIVERSAL_STYLE_GROUPS, universalStyle, universalVisual, universalNext, universalResolvedColors, universalClip, remapUniversalReferences } from "../web/universal-element.js";
const compare = (actual, operator, expected) => operator === ">" ? Number(actual) > Number(expected) : String(actual) === String(expected);
test("selection uses alternate entity, disabled rules and a real default", () => {
  const widget = { stateCount: 2, defaultState: { text: "Idle" }, visualStates: [{ value: "on", enabled: false }, { compareSource: "entity", entityId: "sensor.power", condition: ">", value: 400, text: "Power" }] };
  assert.equal(universalVisual(widget, "on", { "sensor.power": { state: 500 } }, compare).visual.text, "Power");
  assert.equal(universalVisual(widget, "on", {}, compare).visual.text, "Idle");
  widget.stateCount = 1;
  assert.equal(universalVisual(widget, "on", { "sensor.power": { state: 500 } }, compare).index, -1);
  assert.equal(widget.visualStates.length, 2);
});
test("custom false/true and next enabled state have separate write semantics", () => {
  assert.equal(universalNext({ interaction: "switch", falseValue: 10, trueValue: 20 }, 20, 0, []), 10);
  assert.equal(universalNext({ interaction: "switch", falseValue: "closed", trueValue: "open" }, "closed", 0, []), "open");
  assert.equal(universalNext({ interaction: "switch", falseValue: "false", trueValue: "true" }, "on", 0, []), "false");
  const states = [{ value: "A" }, { value: "B", enabled: false }, { value: "C" }];
  assert.equal(universalNext({ interaction: "button" }, "A", 0, states), "C");
});
test("inheritance stays live and terminates cycles and missing sources", () => {
  const group = UNIVERSAL_STYLE_GROUPS.find(item => item.id === "ue-opacity");
  const a = { id: "a", type: "universal-button", "ue-opacityFrom": "b", contentOpacity: 0.9 }, b = { id: "b", type: "universal-button", contentOpacity: 0 };
  assert.equal(universalStyle(a, [a, b], group).contentOpacity, 0);
  b.contentOpacity = 0.4; assert.equal(universalStyle(a, [a, b], group).contentOpacity, 0.4);
  b["ue-opacityFrom"] = "a"; assert.equal(universalStyle(a, [a, b], group).contentOpacity, 0.9);
  a["ue-opacityFrom"] = "missing"; assert.equal(universalStyle(a, [a, b], group).contentOpacity, 0.9);
});
test("colors fall back independently and empty feedback preserves state colors", () => {
  const widget = { id: "a", backgroundColor: "#123456" };
  assert.equal(universalResolvedColors({ textColor: "#abcdef" }, widget, []).backgroundColor, "#123456");
  assert.equal(universalResolvedColors({}, widget, [], new Set(), false).backgroundColor, "");
});
test("custom polygon validation, rounded paths and per-corner bevels", () => {
  assert.equal(universalClip({ elementShape: "custom", shapePoints: "invalid" }, 100, 100), "");
  assert.equal(universalClip({ elementShape: "custom", shapePoints: "0% 0%, 101% 0%, 0% 100%" }, 100, 100), "");
  assert.match(universalClip({ elementShape: "star", shapeRadius: 8, shapeRotation: 20 }, 144, 112), /^path\('/);
  assert.match(universalClip({ cornerType: "bevel", cornerTopLeft: 0, cornerTopRight: 20 }, 100, 80), /^polygon\(0px 0, calc\(100% - 20px\)/);
});
test("copying remaps styles and colors and preserves external references", () => {
  const widget = { type: "universal-button", "ue-textFrom": "a", "ue-shapeFrom": "external", defaultState: { colorsFrom: "a" }, visualStates: [{ colorsFrom: "a" }] };
  remapUniversalReferences(widget, new Map([["a", "copy-a"]]));
  assert.equal(widget["ue-textFrom"], "copy-a"); assert.equal(widget.defaultState.colorsFrom, "copy-a"); assert.equal(widget.visualStates[0].colorsFrom, "copy-a"); assert.equal(widget["ue-shapeFrom"], "external");
});
