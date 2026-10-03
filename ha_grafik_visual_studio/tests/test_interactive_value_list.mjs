import test from "node:test";
import assert from "node:assert/strict";
import { valueListItems, valueListBullet, renderValueList } from "../web/interactive-value-list.js";

test("manual text defaults trim and discard empty items", () => {
  assert.deepEqual(valueListItems({ manualText: " Living Room, ,Kitchen,, Bedroom " }), ["Living Room", "Kitchen", "Bedroom"]);
});
test("HA state takes precedence, preserves zero and never uses stale manual text", () => {
  const widget = { entityId: "sensor.list", manualText: "old" };
  assert.deepEqual(valueListItems(widget, "one,two"), ["one", "two"]);
  assert.deepEqual(valueListItems(widget, 0), ["0"]);
  assert.deepEqual(valueListItems(widget), []);
});
test("literal multi-character delimiters and newline/tab escapes work", () => {
  assert.deepEqual(valueListItems({ manualText: "a.*b.*c", separator: ".*" }), ["a", "b", "c"]);
  for (const separator of ["\\n", "\n", "\\r\\n"]) assert.deepEqual(valueListItems({ manualText: "a\r\nb\nc", separator }), ["a", "b", "c"]);
  assert.deepEqual(valueListItems({ manualText: "a\tb", separator: "\\t" }), ["a", "b"]);
  assert.deepEqual(valueListItems({ manualText: "a,b", separator: "" }), ["a,b"]);
});
test("trimming and empty filtering are independent", () => {
  assert.deepEqual(valueListItems({ manualText: " a, ,", trimItems: false }), [" a", " "]);
  assert.deepEqual(valueListItems({ manualText: " a, ,", ignoreEmpty: false }), ["a", "", ""]);
  assert.deepEqual(valueListItems({ manualText: " a, ,", trimItems: false, ignoreEmpty: false }), [" a", " ", ""]);
});
test("all bullet types include numbered and literal custom characters", () => {
  const types = { disc: "•", circle: "○", square: "▪", dash: "–", arrow: "›", number: "12.", none: "", custom: "☀" };
  for (const [type, marker] of Object.entries(types)) assert.equal(valueListBullet({ bulletType: type, bulletCustom: "☀" }, 11), marker);
  assert.equal(valueListBullet({ bulletType: "custom", bulletCustom: "" }, 0), "*");
  assert.equal(valueListBullet({ bulletType: "unknown" }, 0), "•");
});
class Element {
  constructor() { this.children = []; this.style = {}; this.attributes = {}; }
  append(...children) { this.children.push(...children); }
  setAttribute(key, value) { this.attributes[key] = value; }
}
const doc = { createElement: () => new Element() };
test("rendered content is plain text with wrapped entries and colored hidden markers", () => {
  const list = renderValueList({ manualText: "<img onerror=x>,Hello", bulletColor: "#FF0000", lineSpacing: 4, bulletSpacing: 8 }, doc);
  assert.equal(list.attributes.role, "list"); assert.equal(list.style.overflow, "auto");
  const row = list.children[0];
  assert.equal(row.children[0].attributes["aria-hidden"], "true"); assert.equal(row.children[0].style.color, "#FF0000");
  assert.equal(row.children[1].textContent, "<img onerror=x>"); assert.equal(row.children[1].style.overflowWrap, "anywhere");
  assert.equal(row.style.gap, "8px"); assert.equal(list.style.gap, "4px");
  assert.equal(list.style.padding, "4px"); assert.equal(list.style.boxSizing, "border-box");
});
test("no bullets leave no marker gap; empty entries keep a visible row and spacing is bounded", () => {
  const list = renderValueList({ manualText: "a,,b", ignoreEmpty: false, bulletType: "none", lineSpacing: -3, bulletSpacing: 500 }, doc);
  assert.equal(list.children.length, 3); assert.equal(list.children[1].children.length, 1);
  assert.equal(list.children[1].children[0].textContent, ""); assert.equal(list.children[1].style.minHeight, "1em");
  assert.equal(list.style.gap, "0px"); assert.equal(list.children[0].style.gap, "50px");
});
