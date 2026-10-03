import test from "node:test";
import assert from "node:assert/strict";
import { dropdownOptions, dropdownLabel, dropdownWritable, dropdownOptionAllowed, dropdownBackground, dropdownStyle, renderDropdown } from "../web/dropdown.js";
test("HA options and custom pairs preserve values, remove duplicates and keep plain text", () => {
  const entry = { attributes: { options: ["Eco", "Boost", "Eco", 1] } };
  assert.deepEqual(dropdownOptions({}, entry).map(item => item.value), ["Eco", "Boost"]);
  assert.deepEqual(dropdownOptions({ useCustomOptions: true, countCustomOptions: 3, optionValue1: 0, optionText1: "<b>Aus</b>", optionValue2: 0, optionValue3: 1 }, entry), [{ value: "0", text: "<b>Aus</b>" }, { value: "1", text: "" }]);
});
test("labels combine value/text without duplication and never produce an empty accessible choice", () => {
  const pair = { value: "1", text: "Ein" };
  assert.equal(dropdownLabel({}, pair), "1 - Ein"); assert.equal(dropdownLabel({ showValue: false }, pair), "Ein");
  assert.equal(dropdownLabel({ showText: false }, pair), "1"); assert.equal(dropdownLabel({ showValue: false, showText: false }, pair), "1");
  assert.equal(dropdownLabel({}, { value: "Eco", text: "Eco" }), "Eco"); assert.equal(dropdownLabel({}, null), "—");
});
test("writes are domain/option constrained, including unavailable and invalid numeric values", () => {
  const entry = { state: "Eco", attributes: { options: ["Eco"] } }, options = [{ value: "Eco" }, { value: "Boost" }];
  assert.equal(dropdownWritable({ entityId: "select.mode" }, entry, options), true);
  assert.equal(dropdownOptionAllowed({ entityId: "select.mode" }, entry, options[1]), false);
  assert.equal(dropdownWritable({ entityId: "sensor.mode" }, entry, options), false);
  assert.equal(dropdownWritable({ entityId: "select.mode", readOnly: true }, entry, options), false);
  assert.equal(dropdownWritable({ entityId: "select.mode" }, { ...entry, state: "unavailable" }, options), false);
  assert.equal(dropdownWritable({ entityId: "input_number.mode" }, entry, options), false);
  assert.equal(dropdownOptionAllowed({ entityId: "input_number.mode" }, entry, { value: "-2.5" }), true);
  assert.equal(dropdownOptionAllowed({ entityId: "input_text.mode" }, entry, { value: "x".repeat(256) }), false);
});
test("first background match wins, alternate entities and numeric/string comparisons are supported", () => {
  const widget = { countBgConditions: 2, bgOperator1: ">=", bgValue1: "10", bgColor1: "red", bgOperator2: "===", bgValue2: "12", bgColor2: "green" };
  assert.equal(dropdownBackground(widget, {}, "12"), "red");
  assert.equal(dropdownBackground({ ...widget, bgEntityId: "sensor.bg" }, { "sensor.bg": { state: "5" } }, "12"), null);
  assert.equal(dropdownBackground(widget, {}, "unknown"), null);
  assert.equal(dropdownBackground({ countBgConditions: 1, bgValue1: "Eco", bgColor1: "green" }, {}, "Eco"), "green");
});
test("style inheritance does not inherit domain/options and safely terminates cycles", () => {
  const a = { id: "a", type: "dropdown", dropdownFromWidget: "b", dropdownFontSize: 16 }, b = { id: "b", type: "dropdown", dropdownFromWidget: "a", dropdownFontSize: 24, entityId: "select.b" };
  assert.equal(dropdownStyle(a, [a, b]).dropdownFontSize, 24); assert.equal(dropdownStyle(a, [a, b]).entityId, undefined);
  b.type = "radial-slider"; assert.equal(dropdownStyle(a, [a, b]).dropdownFontSize, 16);
});
class Element {
  constructor() { this.children = []; this.style = { setProperty() {} }; this.attributes = {}; this.listeners = {}; this.classList = { toggle() {}, add() {}, remove() {} }; }
  append(...nodes) { this.children.push(...nodes); }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  addEventListener(key, fn) { this.listeners[key] = fn; }
  focus() { this.focused = true; }
  contains(node) { return node === this || this.children.some(child => child.contains(node)); }
}
const doc = { createElement: () => new Element() };
const widget = { id: "a", useCustomOptions: true, countCustomOptions: 2, optionValue1: "0", optionText1: "Aus", optionValue2: "1", optionText2: "<b>Ein</b>", state: "0", dropdownTitle: "Modus" };
test("custom menu click writes one literal value, closes menu and keeps HTML as text", () => {
  const values = []; const root = renderDropdown(widget, doc, { runtime: true, states: {}, widgets: [], write: value => values.push(value) });
  const [, button, menu] = root.children;
  button.listeners.click(); assert.equal(menu.hidden, false); assert.equal(button.attributes["aria-expanded"], "true");
  assert.equal(menu.children[1].textContent, "1 - <b>Ein</b>");
  menu.children[1].listeners.click(); assert.deepEqual(values, ["1"]); assert.equal(menu.hidden, true);
});
test("keyboard opens/navigates menu; Escape cancels; readonly/editor never write", () => {
  let writes = 0; const root = renderDropdown(widget, doc, { runtime: true, states: {}, widgets: [], write: () => writes++ });
  const [, button, menu] = root.children;
  root.listeners.keydown({ key: "ArrowDown", preventDefault() {} }); assert.equal(menu.hidden, false);
  root.listeners.keydown({ key: "End", preventDefault() {} }); assert.equal(menu.children[1].focused, true);
  root.listeners.keydown({ key: "Escape", preventDefault() {} }); assert.equal(menu.hidden, true); assert.equal(writes, 0);
  for (const [runtime, readOnly] of [[false, false], [true, true]]) {
    const other = renderDropdown({ ...widget, readOnly }, doc, { runtime, states: {}, widgets: [], write: () => writes++ });
    assert.equal(other.children[1].disabled, true); other.children[2].children[1].listeners.click();
  }
  assert.equal(writes, 0);
});
