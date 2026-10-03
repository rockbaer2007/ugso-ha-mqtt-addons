import test from "node:test";
import assert from "node:assert/strict";
import { switchStyle, switchAppearance, renderStyledSwitch } from "../web/styled-switch.js";

test("track and thumb inherit independently without copying values or labels", () => {
  const widget = { id: "a", type: "styled-switch", trackFromWidget: "b", thumbFromWidget: "c", valueTrue: "own" };
  const b = { id: "b", type: "styled-switch", trackSize: 20, thumbSize: 40 }, c = { id: "c", type: "styled-switch", thumbSize: 30, trackSize: 50 };
  const style = switchStyle(widget, [widget, b, c]);
  assert.equal(style.trackSize, 20); assert.equal(style.thumbSize, 30); assert.equal(style.valueTrue, undefined);
});
test("cycles and references to other widget types terminate safely", () => {
  const a = { id: "a", type: "styled-switch", trackFromWidget: "b", trackSize: 12 }, b = { id: "b", type: "styled-switch", trackFromWidget: "a", trackSize: 20 };
  assert.equal(switchStyle(a, [a, b]).trackSize, 20);
  b.type = "styled-slider"; assert.equal(switchStyle(a, [a, b]).trackSize, 12);
});
test("state colors and shadows follow the Boolean state; thumb stays within track ends", () => {
  const style = { trackColor: "#111111", trackColorTrue: "#222222", thumbColor: "#333333", thumbColorTrue: "#444444", trackShadowColor: "#555555", trackShadowColorTrue: "#666666" };
  const off = switchAppearance(style, false), on = switchAppearance(style, true);
  assert.equal(off.trackColor, "#111111"); assert.equal(on.trackColor, "#222222"); assert.equal(on.thumbColor, "#444444");
  assert.ok(off.trackShadow.endsWith("#555555")); assert.ok(on.trackShadow.endsWith("#666666"));
  assert.equal(off.offset, 0); assert.equal(on.offset + on.thumbSize, on.width);
});
test("dimensions, rounding and shadows respect supported bounds", () => {
  const style = switchAppearance({ trackSize: 999, thumbSize: -1, trackBorderRadius: 999, thumbBorderRadius: 0, thumbShadowBlur: -3, trackShadowX: -999 }, true);
  assert.equal(style.trackSize, 50); assert.equal(style.thumbSize, 1); assert.equal(style.trackRadius, 25); assert.equal(style.thumbRadius, .005);
  assert.ok(style.trackShadow.startsWith("-50px")); assert.ok(style.thumbShadow.includes(" 0px "));
});
class Element {
  constructor() { this.children = []; this.style = {}; this.attributes = {}; this.listeners = {}; }
  append(...children) { this.children.push(...children); }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(key, fn) { this.listeners[key] = fn; }
}
const doc = { createElement: () => new Element() };
test("unbound runtime writes custom pairs and uses a native keyboard-accessible switch", () => {
  let written;
  const widget = { id: "a", valueTrue: "ready", valueFalse: "idle", textTrue: "<b>Ready</b>", textPosition: "top" };
  const root = renderStyledSwitch(widget, doc, { runtime: true, ready: true, value: "ready", widgets: [], write: value => { written = value; } });
  const input = root.children[0].children[2];
  assert.equal(input.attributes.role, "switch"); assert.equal(input.checked, true); assert.equal(root.children[1].textContent, "<b>Ready</b>");
  assert.equal(root.className, "styled-switch position-top");
  input.checked = false; input.listeners.change({ stopPropagation() {} }); assert.equal(written, "idle"); assert.equal(input.disabled, true);
});
test("editor, sensor, unavailable and pending writes stay disabled", () => {
  for (const context of [{ runtime: false, ready: true }, { runtime: true, ready: false }, { runtime: true, ready: true, entityId: "sensor.test", entry: { state: "on" } }, { runtime: true, ready: true, entityId: "switch.test", entry: { state: "unavailable" } }]) {
    let writes = 0;
    const root = renderStyledSwitch({ entityId: context.entityId || "" }, doc, { ...context, widgets: [], write: () => { writes++; } });
    const input = root.children[0].children[2]; assert.equal(input.disabled, true);
    input.listeners.change({ stopPropagation() {} }); assert.equal(writes, 0);
  }
});
test("available HA helpers use the configured pair without altering source state", () => {
  const entry = { state: "42" }; let written;
  const widget = { entityId: "input_number.test", valueTrue: "42", valueFalse: "0" };
  const root = renderStyledSwitch(widget, doc, { runtime: true, ready: true, value: entry.state, entry, widgets: [], write: value => { written = value; } });
  const input = root.children[0].children[2]; assert.equal(input.checked, true); assert.equal(input.disabled, false);
  input.checked = false; input.listeners.change({ stopPropagation() {} }); assert.equal(written, "0"); assert.equal(entry.state, "42");
});
