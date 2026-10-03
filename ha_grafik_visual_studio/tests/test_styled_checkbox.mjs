import test from "node:test";
import assert from "node:assert/strict";
import { checkboxValue, checkboxChecked, checkboxWritable, checkboxStyle, renderCheckbox } from "../web/styled-checkbox.js";
test("empty value pairs retain Boolean defaults without losing zero", () => {
  assert.equal(checkboxValue({}, true), true); assert.equal(checkboxValue({}, false), false);
  assert.equal(checkboxValue({ valueTrue: 0 }, true), 0); assert.equal(checkboxValue({ valueFalse: "" }, false), false);
});
test("HA Boolean and numeric states match the configured checked value", () => {
  for (const value of [true, "true", "on", 1, "1.0"]) assert.equal(checkboxChecked({}, value), true);
  for (const value of [false, "false", "off", 0, "0.0", "unknown", undefined]) assert.equal(checkboxChecked({}, value), false);
  assert.equal(checkboxChecked({ valueTrue: "42" }, "42.0"), true);
  assert.equal(checkboxChecked({ valueTrue: "ready", valueFalse: "idle" }, "ready"), true);
  assert.equal(checkboxChecked({ valueTrue: "off", valueFalse: "on" }, "off"), true);
});
test("write targets require available compatible HA domains and value pairs", () => {
  assert.equal(checkboxWritable({}, undefined), true);
  assert.equal(checkboxWritable({ entityId: "switch.test" }, { state: "on" }), true);
  for (const state of ["unknown", "unavailable"]) assert.equal(checkboxWritable({ entityId: "input_text.test" }, { state }), false);
  assert.equal(checkboxWritable({ entityId: "sensor.test" }, { state: "on" }), false);
  assert.equal(checkboxWritable({ entityId: "input_number.test", valueTrue: "42", valueFalse: "0" }, { state: "0" }), true);
  assert.equal(checkboxWritable({ entityId: "input_number.test", valueTrue: "text" }, { state: "0" }), false);
  assert.equal(checkboxWritable({ entityId: "switch.test", valueTrue: "42" }, { state: "off" }), false);
  assert.equal(checkboxWritable({ entityId: "input_text.test", valueTrue: "x".repeat(256) }, { state: "idle" }), false);
});
test("inheritance only copies checkbox styling and stops cycles", () => {
  const a = { id: "a", type: "styled-checkbox", styleFromWidget: "b", boxSize: 24 }, b = { id: "b", type: "styled-checkbox", boxSize: 32, boxColor: "#FF0000" };
  assert.equal(checkboxStyle(a, [a, b]).boxSize, 32); b.styleFromWidget = "a"; assert.equal(checkboxStyle(a, [a, b]).boxSize, 32);
  b.type = "checkbox"; assert.equal(checkboxStyle(a, [a, b]).boxSize, 24);
});
class Element {
  constructor() { this.children = []; this.listeners = {}; this.attributes = {}; this.style = { setProperty() {} }; }
  append(...nodes) { this.children.push(...nodes); }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(key, listener) { this.listeners[key] = listener; }
}
const document = { createElement: () => new Element() };
test("checkbox captions survive repeated toggles with one empty state text", () => {
  for (const captions of [{ textFalse: "Garage", textTrue: "" }, { textFalse: "", textTrue: "Garage" }, { title: "Garage" }]) {
    const widget = { ...captions }; let value = false;
    for (let click = 0; click < 4; click++) {
      const label = renderCheckbox(widget, document, { runtime: true, ready: true, value, widgets: [], write: next => { value = next; } });
      const [input, text] = label.children;
      assert.equal(text.textContent, "Garage"); assert.equal(text.hidden, false);
      input.checked = !input.checked; input.listeners.change({ stopPropagation() {} });
    }
  }
  for (const [value, expected] of [[false, "Aus"], [true, "Ein"]]) {
    const label = renderCheckbox({ textFalse: "Aus", textTrue: "Ein" }, document, { runtime: true, ready: true, value, widgets: [], write() {} });
    assert.equal(label.children[1].textContent, expected);
  }
  const empty = renderCheckbox({ name: "Editor name" }, document, { runtime: true, ready: true, value: true, widgets: [], write() {} });
  assert.equal(empty.children[1].hidden, true);
});
test("runtime writes a custom pair, editor and sensor never write, labels stay text", () => {
  for (const [runtime, entityId, disabled] of [[true, "", false], [false, "", true], [true, "sensor.test", true]]) {
    const writes = [], widget = { name: "Test", entityId, valueTrue: "ready", valueFalse: "idle", textFalse: "<img src=x>", textPosition: "top" };
    const label = renderCheckbox(widget, document, { runtime, ready: true, value: "idle", entry: { state: "idle" }, widgets: [], write: value => writes.push(value) });
    const [input, text] = label.children; assert.equal(input.disabled, disabled); assert.equal(text.textContent, "<img src=x>"); assert.equal(label.className, "styled-checkbox position-top");
    input.checked = true; input.listeners.change({ stopPropagation() {} }); assert.deepEqual(writes, disabled ? [] : ["ready"]);
  }
});
