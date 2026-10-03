import test from "node:test";
import assert from "node:assert/strict";
import { radialAngles, radialPointerValue, radialValue, radialArc, radialStyle, renderRadialSlider } from "../web/radial-slider.js";
test("default dial is clockwise 270 degrees with correct endpoints and midpoint", () => {
  assert.deepEqual(radialAngles({}), { start: 225, sweep: 270 });
  assert.equal(radialPointerValue({}, 225), 0); assert.equal(radialPointerValue({}, 135), 100); assert.equal(radialPointerValue({}, 0), 50);
});
test("gap selects the closest endpoint, full circles use two SVG arcs", () => {
  assert.equal(radialPointerValue({}, 160), 100); assert.equal(radialPointerValue({}, 200), 0);
  assert.equal(radialAngles({ startAngle: 0, endAngle: 360 }).sweep, 360);
  assert.equal((radialArc(100, 80, 0, 360).match(/ A /g) || []).length, 2);
  assert.equal(radialArc(100, 80, 0, 0), "");
});
test("steps are relative to minimum, bounded and decimal-safe; invalid domains fail closed", () => {
  const widget = { minValue: .1, maxValue: 1, step: .2 };
  assert.equal(radialValue(widget, .68), .7); assert.equal(radialValue(widget, -10), .1); assert.equal(radialValue(widget, 100), 1);
  assert.equal(radialValue({ minValue: 5, maxValue: 2 }, 3), null); assert.equal(radialValue({}, null), null);
});
test("track/thumb inheritance is independent and stops cycles or wrong types", () => {
  const a = { id: "a", type: "radial-slider", radialTrackFromWidget: "b", trackWidth: 10, thumbSize: 16 }, b = { id: "b", type: "radial-slider", trackWidth: 30, thumbSize: 40, radialTrackFromWidget: "a" };
  const style = radialStyle(a, [a, b]); assert.equal(style.trackWidth, 30); assert.equal(style.thumbSize, 16);
  b.type = "styled-slider"; assert.equal(radialStyle(a, [a, b]).trackWidth, 10);
});
class Element {
  constructor() { this.children = []; this.style = {}; this.dataset = {}; this.attributes = {}; this.listeners = {}; }
  append(...children) { this.children.push(...children); }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  removeAttribute(key) { delete this.attributes[key]; }
  addEventListener(key, fn) { this.listeners[key] = fn; }
  querySelector(selector) { const find = nodes => { for (const node of nodes) { if ((node.className || node.attributes.class) === selector.slice(1)) return node; const child = find(node.children); if (child) return child; } }; return find(this.children); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 200, height: 200 }; }
  focus() {} setPointerCapture() {} hasPointerCapture() { return true; } releasePointerCapture() {}
}
const doc = { createElement: () => new Element(), createElementNS: () => new Element() };
const context = overrides => ({ runtime: true, widgets: [], label: "Dial", input() {}, commit() {}, dragEnd() {}, ...overrides });
test("keyboard controls obey steps, home/end and readonly display", () => {
  let committed;
  const root = renderRadialSlider({ value: 50, step: 5, label: "<b>Volume</b>" }, doc, context({ commit: value => { committed = value; } }));
  const press = key => root.listeners.keydown({ key, preventDefault() {} });
  press("ArrowRight"); assert.equal(committed, 55); press("Home"); assert.equal(committed, 0); press("End"); assert.equal(committed, 100);
  assert.equal(root.querySelector(".radial-label").textContent, "<b>Volume</b>");
  const readonly = renderRadialSlider({ value: 42, readOnly: true }, doc, context({ commit: () => assert.fail("readonly write") }));
  readonly.listeners.keydown({ key: "ArrowUp", preventDefault() {} }); assert.equal(readonly.attributes["aria-disabled"], "true"); assert.equal(readonly.dataset.value, "42");
});
test("drag commits once; cancelled drag restores its original value without writing", () => {
  let writes = [], staged = [];
  const root = renderRadialSlider({ value: 50 }, doc, context({ input: value => staged.push(value), commit: value => writes.push(value) }));
  const event = { button: 0, pointerId: 1, clientX: 180, clientY: 180, preventDefault() {} };
  root.listeners.pointerdown(event); assert.equal(root.dataset.dragging, "true"); root.listeners.pointercancel();
  assert.equal(root.dataset.value, "50"); assert.equal(staged.at(-1), 50); assert.deepEqual(writes, []);
  root.listeners.pointerdown(event); root.listeners.pointerup(event); root.listeners.lostpointercapture(); assert.deepEqual(writes, [100]);
});
test("center clicks do not write and editor/unavailable sensors cannot interact", () => {
  const root = renderRadialSlider({ value: 50 }, doc, context({ commit: () => assert.fail("center write") }));
  const event = { button: 0, pointerId: 1, clientX: 100, clientY: 100, preventDefault() {} };
  root.listeners.pointerdown(event); root.listeners.pointerup(event);
  for (const [widget, options] of [[{}, { runtime: false }], [{ entityId: "sensor.test" }, { entry: { state: "42" } }], [{ entityId: "input_number.test" }, { entry: { state: "unavailable" } }]]) {
    const disabled = renderRadialSlider(widget, doc, context({ ...options, commit: () => assert.fail("disabled write") }));
    disabled.listeners.pointerdown(event); assert.equal(disabled.dataset.dragging, undefined); assert.equal(disabled.attributes["aria-disabled"], "true");
  }
});
