import test from "node:test";
import assert from "node:assert/strict";
import { styledSliderDomain, styledSliderValue, styledSliderWritable, styledSliderMarks, styledSliderStyle, renderStyledSlider, updateStyledSlider } from "../web/styled-slider.js";
test("numeric domains reject reversed ranges and normalize invalid steps", () => {
  assert.deepEqual(styledSliderDomain({ minValue: -20, maxValue: 80, step: .5 }), { min: -20, max: 80, step: .5, valid: true });
  assert.equal(styledSliderDomain({ minValue: 10, maxValue: 10 }).valid, false);
  assert.equal(styledSliderDomain({ minValue: 20, maxValue: 10 }).valid, false);
  assert.equal(styledSliderDomain({ step: 0 }).step, 1);
});
test("readings prefer live values and writes require a numeric helper", () => {
  assert.equal(styledSliderValue({ entityId: "sensor.a", value: 50 }, { state: "0" }), 0);
  for (const state of ["", null, "unknown", "unavailable"]) assert.equal(styledSliderValue({ entityId: "input_number.a" }, { state }), null);
  assert.equal(styledSliderWritable({}, undefined), true);
  assert.equal(styledSliderWritable({ entityId: "input_number.a" }, { state: "42" }), true);
  for (const widget of [{ readOnly: true }, { entityId: "sensor.a" }, { entityId: "input_number.a", entityAttribute: "min" }]) assert.equal(styledSliderWritable(widget, { state: "42" }), false);
});
test("interval marks handle negative and decimal scales independently of input step", () => {
  const marks = styledSliderMarks({ minValue: -1, maxValue: 1, step: .01, showSteps: true, showMinMax: true, stepDisplay: .5 });
  assert.deepEqual(marks.map(mark => mark.value), [-1, -.5, 0, .5, 1]);
  assert.deepEqual(marks.map(mark => mark.percent), [0, 25, 50, 75, 100]);
  assert.equal(styledSliderMarks({ showSteps: true, stepDisplay: .00000001 }).length <= 201, true);
});
test("custom marks ignore empty, invalid, duplicate and out-of-range values", () => {
  assert.deepEqual(styledSliderMarks({ minValue: -20, maxValue: 80, showSteps: true, stepMode: "custom", customSteps: "-30,-20,,0,20,20,x,80,90" }).map(mark => mark.value), [-20, 0, 20, 80]);
  assert.deepEqual(styledSliderMarks({ showMinMax: false, showSteps: false }), []);
});
test("track and thumb inheritance are independent, cycle safe and type scoped", () => {
  const a = { id: "a", type: "styled-slider", sliderTrackFromWidget: "b", sliderThumbFromWidget: "c" }, b = { id: "b", type: "styled-slider", trackWidth: 25, thumbSize: 44 }, c = { id: "c", type: "styled-slider", trackWidth: 12, thumbSize: 0 };
  const style = styledSliderStyle(a, [a, b, c]); assert.equal(style.trackWidth, 25); assert.equal(style.thumbSize, 0);
  b.sliderTrackFromWidget = "a"; assert.equal(styledSliderStyle(a, [a, b, c]).trackWidth, 25);
  c.type = "slider"; assert.equal(styledSliderStyle(a, [a, b, c]).thumbSize, undefined);
});
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.dataset = {}; this.listeners = {}; this.attributes = {}; this.style = { values: {}, setProperty(key, value) { this.values[key] = value; } }; }
  append(...nodes) { this.children.push(...nodes); }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(key, listener) { this.listeners[key] = listener; }
  querySelector(tag) { return this.children.find(node => node.tag === tag) || this.children.map(node => node.querySelector(tag)).find(Boolean); }
  matches() { return false; }
  setPointerCapture() {}
}
const document = { createElement: tag => new Element(tag) };
test("renderer stages input and commits once on change; read-only and editor never write", () => {
  for (const [runtime, readOnly] of [[true, false], [false, false], [true, true]]) {
    const inputs = [], commits = [], widget = { sliderTitle: "<b>Literal</b>", value: 40, readOnly };
    const root = renderStyledSlider(widget, document, { runtime, widgets: [], label: "Slider", input: value => inputs.push(value), commit: value => commits.push(value), dragEnd() {} });
    assert.equal(root.children[0].textContent, "<b>Literal</b>"); const input = root.querySelector("input"); input.value = "41";
    input.listeners.input(); assert.deepEqual(commits, []); input.listeners.change();
    assert.deepEqual(inputs, runtime && !readOnly ? [41] : []); assert.deepEqual(commits, runtime && !readOnly ? [41] : []);
  }
});
test("vertical inverted fill and unavailable display retain the right semantics", () => {
  const widget = { orientation: "vertical", value: 25, trackBarType: "inverted", valueLabelDisplay: "on", sliderUnit: " %", thumbSize: 0 };
  const root = renderStyledSlider(widget, document, { runtime: true, widgets: [], label: "Slider", input() {}, commit() {}, dragEnd() {} });
  assert.match(root.className, /hidden-thumb/); assert.match(root.querySelector("input").style.values["--slider-fill"], /to top.*rail\) 25%.*active\) 100%/);
  assert.equal(root.querySelector("output").textContent, "25 %"); updateStyledSlider(root, widget, null); assert.equal(root.querySelector("output").textContent, "—");
});
