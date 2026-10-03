import test from "node:test";
import assert from "node:assert/strict";
import { renderTechnicStatusList } from "../web/technic-status-list.js";
import { technicRoomBindings } from "../web/technic-room.js";
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.properties = {}; this.style = { setProperty: (key, value) => { this.properties[key] = value; } }; }
  append(...nodes) { this.children.push(...nodes); }
}
const doc = { createElement: tag => new Element(tag) };
const widget = { rowCount: 2, rowLabel1: "Temperatur", rowEntityId1: "sensor.temp", unit1: "°C", decimals1: 1, rowLabel2: "Fenster", rowEntityId2: "binary_sensor.window", valueType2: "bool", trueText2: "Offen", falseText2: "Zu", trueColor2: "#ff0000", extraEntityIds2: "binary_sensor.door", logic2: "or" };
const states = { "sensor.temp": { state: "21.56" }, "binary_sensor.window": { state: "off" }, "binary_sensor.door": { state: "on" } };
test("status list uses live numbers and all Boolean OR bindings", () => {
  const rows = renderTechnicStatusList(widget, doc, { states }).children[0];
  assert.equal(rows.children[0].children[1].textContent, "21,6 °C");
  assert.equal(rows.children[1].children[1].textContent, "Offen"); assert.equal(rows.children[1].children[1].style.color, "#ff0000");
  assert.deepEqual(technicRoomBindings(widget), Object.keys(states));
});
test("empty list stays empty and count is bounded; missing states remain unknown", () => {
  assert.equal(renderTechnicStatusList({ rowCount: 0 }, doc).children[0].children.length, 0);
  const rows = renderTechnicStatusList({ ...widget, rowCount: 99 }, doc).children[0].children;
  assert.equal(rows.length, 10); assert.equal(rows[0].children[1].textContent, "—"); assert.equal(rows[1].children[1].textContent, "—");
});
test("layout preserves zero offset/padding, bounds invalid extremes and inherits typography", () => {
  const root = renderTechnicStatusList({ ...widget, valueOffset: 0, containerPaddingLeft: 0 }, doc);
  assert.equal(root.children[0].properties["--status-value-offset"], "0px"); assert.equal(root.children[0].style.paddingLeft, "0px");
  assert.equal(root.style.fontSize, undefined);
  const bounded = renderTechnicStatusList({ ...widget, valueOffset: 99999, containerPaddingLeft: -1 }, doc).children[0];
  assert.equal(bounded.properties["--status-value-offset"], "2000px"); assert.equal(bounded.style.paddingLeft, "0px");
});
test("labels remain text through live changes, English formatting and unknown inputs", () => {
  const w = { ...widget, rowLabel1: "<b>Temperatur</b>" };
  const first = renderTechnicStatusList(w, doc, { states, locale: "en" }).children[0].children[0];
  assert.equal(first.children[0].textContent, w.rowLabel1); assert.equal(first.children[0].title, w.rowLabel1); assert.equal(first.children[1].textContent, "21.6 °C");
  const next = renderTechnicStatusList(w, doc, { states: { ...states, "binary_sensor.door": { state: "unavailable" } } }).children[0].children[1];
  assert.equal(next.children[0].textContent, "Fenster"); assert.equal(next.children[1].textContent, "—");
});
