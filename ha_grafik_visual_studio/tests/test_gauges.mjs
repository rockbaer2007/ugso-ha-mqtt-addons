import test from "node:test";
import assert from "node:assert/strict";
import { finite, gaugeValue, gaugeLevels, gaugeColor, gaugeEntityIds, compassHeading, compassDirection, renderGauge } from "../web/gauges.js";
import { getWidgetSets, getWidgetDefinition } from "../web/widget-registry.js";
import "../web/widget-sets/core.js";
import "../web/widget-sets/gauges.js";
import { gaugeEntryGroups } from "../web/widget-sets/gauges.js";
test("numeric states reject empty, unknown, booleans and non-finite values without mistaking zero", () => {
  for (const input of [null, undefined, "", " ", "unknown", "unavailable", true, [], Infinity]) assert.equal(finite(input), null);
  assert.equal(finite("0"), 0);
  assert.deepEqual(gaugeValue({ minValue: -20, maxValue: 80, state: 30 }), { min: -20, max: 80, value: 30, fraction: .5, valid: true });
});
test("live bindings never fall back to misleading demo values; ranges clamp fills, not displayed readings", () => {
  const w = { entityId: "sensor.a", state: 50, minValue: 0, maxValue: 100 };
  assert.equal(gaugeValue(w).value, null);
  assert.equal(gaugeValue(w, { "sensor.a": { state: "0" } }).fraction, 0);
  assert.equal(gaugeValue(w, { "sensor.a": { state: "200" } }).fraction, 1);
  assert.equal(gaugeValue(w, {}, -5).value, -5);
  assert.equal(gaugeValue({ state: 5, minValue: 10, maxValue: 10 }).valid, false);
});
test("thresholds sort, disabled stages are ignored, boundaries are inclusive", () => {
  const w = { levelCount: 3, levelThreshold1: 70, levelColor1: "yellow", levelThreshold2: 30, levelColor2: "red", levelThreshold3: 100, levelColor3: "green" };
  assert.deepEqual(gaugeLevels(w).map(x => x.threshold), [30, 70, 100]);
  assert.equal(gaugeColor(w, 30), "red"); assert.equal(gaugeColor(w, 31), "yellow"); assert.equal(gaugeColor(w, 150), "green");
  w.enabledPropertyGroups = { "gauge-level-2": false }; assert.equal(gaugeColor(w, 10), "yellow");
});
test("compass wraps, applies offset and inversion, and assigns cardinal boundaries", () => {
  assert.equal(compassHeading({}, -90), 270); assert.equal(compassHeading({ northOffset: 15, invertDirection: true }, 45), 330);
  assert.equal(compassDirection(359), "N"); assert.equal(compassDirection(90), "E"); assert.equal(compassDirection(null), "—");
});
test("all ten instruments register with CSS, bounded entries, and exportable configuration", () => {
  const set = getWidgetSets().find(s => s.id === "ha-grafik-gauges"); assert.equal(set.widgets.length, 10);
  for (const w of set.widgets) { assert.ok(w.propertyGroups.some(g => g.label === "CSS Allgemein")); assert.deepEqual(JSON.parse(JSON.stringify(w.defaults)), w.defaults); }
  assert.equal(gaugeEntryGroups({ type: "gauge-rings", ringCount: 10000 }).length, 8);
  assert.equal(gaugeEntryGroups({ type: "gauge-arc", levelCount: 10000 }).length, 10);
});
test("polling includes independent ring, target, charging and speed bindings", () => {
  assert.deepEqual(gaugeEntityIds({ type: "gauge-rings", entityId: "sensor.a", targetEntityId: "sensor.target", chargingEntityId: "binary_sensor.charging", speedEntityId: "sensor.speed", ringCount: 2, ringEntityId1: "sensor.r1", ringEntityId2: "sensor.r2", ringEntityId3: "sensor.ignored" }), ["sensor.a", "sensor.target", "binary_sensor.charging", "sensor.speed", "sensor.r1", "sensor.r2"]);
});
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; this.style = {}; this.dataset = {}; this.classList = { toggle() {} }; }
  append(...nodes) { this.children.push(...nodes); }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k]; }
}
const doc = { createElement: tag => new Element(tag), createElementNS: (_, tag) => new Element(tag) };
const nodes = root => [root, ...root.children.flatMap(nodes)];
test("all instruments render SVG safely across empty, negative, full and unavailable values", () => {
  for (const definition of getWidgetSets().find(s => s.id === "ha-grafik-gauges").widgets) for (const value of [null, -100, 0, 50, 500, "unavailable"]) {
    const root = renderGauge({ ...definition.defaults, type: definition.type, label: "<script>not markup</script>" }, doc, { value });
    assert.equal(nodes(root).filter(n => n.tag === "svg").length, 1);
    assert.equal(nodes(root).some(n => /NaN|Infinity/.test(JSON.stringify(n.attributes))), false);
    assert.equal(nodes(root).some(n => n.tag === "script"), false);
  }
});
test("battery charging, ring states and reduced empty/full wave behavior are represented", () => {
  const battery = getWidgetDefinition("gauge-battery");
  assert.equal(renderGauge({ ...battery.defaults, type: battery.type, chargingEntityId: "binary_sensor.a" }, doc, { states: { "binary_sensor.a": { state: "on" } } }).dataset.charging, "true");
  const water = getWidgetDefinition("gauge-water");
  for (const state of [0, 100]) assert.equal(nodes(renderGauge({ ...water.defaults, type: water.type, state }, doc, { runtime: true })).some(n => n.attributes.class === "gauge-wave"), false);
  assert.equal(nodes(renderGauge({ ...water.defaults, type: water.type, state: 50 }, doc, { runtime: true })).some(n => n.attributes.class === "gauge-wave"), true);
  const rings = renderGauge({ ...getWidgetDefinition("gauge-rings").defaults, type: "gauge-rings", ringEntityId1: "sensor.r", ringCount: 1 }, doc, { states: { "sensor.r": { state: "73" } } });
  assert.ok(nodes(rings).some(n => n.textContent === "1: 73"));
});
