import test from "node:test";
import assert from "node:assert/strict";
import { temperatureBindings, temperatureModel, temperaturePointer, renderTemperature, temperatureHistorySvg, closeTemperatureHistory } from "../web/technic-temperature.js";
const widget = { id: "temperature", heading: "Temperatur", showName: true, targetEntityId: "climate.room", tempMin: 15, tempMax: 28, tempStep: .5 };
const entry = { state: "heat", attributes: { temperature: 21, current_temperature: 20.5, current_humidity: 45, hvac_action: "heating", min_temp: 5, max_temp: 30, target_temp_step: .5, supported_features: 1 } };
const states = { "climate.room": entry };
test("climate fallbacks read temperature, humidity, activity; cooling is explicit", () => {
  const model = temperatureModel(widget, states, true);
  assert.equal(model.writable, true); assert.equal(model.actual, 20.5); assert.equal(model.humidity, 45); assert.equal(model.motor, 100); assert.equal(model.cooling, false);
  assert.equal(temperatureModel(widget, { "climate.room": { ...entry, state: "cool" } }, true).cooling, true);
  assert.deepEqual(temperatureBindings({ ...widget, actualEntityId: "climate.room" }), ["climate.room"]);
});
test("unknown, read-only, editor, unsupported and incompatible steps never write", () => {
  for (const value of ["unknown", "unavailable"]) assert.equal(temperatureModel(widget, { "climate.room": { ...entry, state: value } }, true).writable, false);
  assert.equal(temperatureModel(widget, states).writable, false);
  assert.equal(temperatureModel({ ...widget, readOnly: true }, states, true).writable, false);
  assert.equal(temperatureModel(widget, { "climate.room": { ...entry, attributes: { ...entry.attributes, supported_features: 2 } } }, true).writable, false);
  assert.equal(temperatureModel({ ...widget, tempStep: .3 }, states, true).writable, false);
  assert.equal(temperatureModel(widget, {}, true).target, null);
});
test("helper and separate sensors read independently; bounds keep the last valid step", () => {
  const w = { ...widget, targetEntityId: "input_number.target", actualEntityId: "sensor.actual", tempMax: 27.8 };
  const m = temperatureModel(w, { "input_number.target": { state: "22", attributes: { min: 10, max: 30, step: .5 } }, "sensor.actual": { state: "19.5" } }, true);
  assert.equal(m.writable, true); assert.equal(m.actual, 19.5); assert.equal(m.max, 27.5); assert.equal(m.humidity, null);
  assert.equal(temperaturePointer(30, 84.64, m), 15); assert.equal(temperaturePointer(70, 84.64, m), 27.5);
});
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.style = {}; this.dataset = {}; this.attributes = {}; this.listeners = {}; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  addEventListener(k, fn) { this.listeners[k] = fn; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
  setPointerCapture() {} showModal() {} remove() {} close() { this.listeners.close?.(); }
}
const doc = () => ({ createElement: tag => new Element(tag), createElementNS: (_, tag) => new Element(tag), body: new Element("body") });
const flush = () => new Promise(resolve => setImmediate(resolve));
test("drag drafts then commits once; pending and cancellation preserve the caption", async () => {
  const writes = []; let resolve;
  const root = renderTemperature(widget, doc(), { runtime: true, getStates: () => states, write: payload => { writes.push(payload); return new Promise(done => { resolve = done; }); } });
  const svg = root.children[0].children[0], event = { pointerId: 1, button: 0, clientX: 50, clientY: 10, preventDefault() {}, stopPropagation() {} };
  svg.listeners.pointerdown(event); svg.listeners.pointermove({ ...event, clientX: 90, clientY: 50 });
  assert.equal(writes.length, 0); svg.listeners.pointerup(event); assert.equal(writes.length, 1);
  assert.equal(writes[0].entity_id, "climate.room"); assert.equal(root.children[3].textContent, "Temperatur"); assert.equal(root.children[1].disabled, true);
  resolve(); await flush(); svg.listeners.pointerdown(event); svg.listeners.pointercancel(event); assert.equal(writes.length, 1);
});
test("keyboard commit retains focus intent and failure text hides provider details", async () => {
  const document = doc(); let focus;
  const root = renderTemperature(widget, document, { runtime: true, getStates: () => states, write: async () => { throw Error("secret"); }, onSettled: value => { focus = value; } });
  document.activeElement = root.children[1]; root.children[1].value = "22"; root.children[1].listeners.change(); await flush();
  assert.equal(focus, true); assert.equal(root.children[3].textContent, "Temperatur"); assert.match(root.children[4].textContent, /fehlgeschlagen/); assert.doesNotMatch(root.children[4].textContent, /secret/);
});
test("history uses step curves for target/actuator and breaks unknown gaps", () => {
  const svg = temperatureHistorySvg({ start: 0, end: 100, series: { target_entity: [{ t: 0, value: 20 }, { t: 30, value: null }, { t: 60, value: 22 }, { t: 100, value: 23 }] } }, widget, doc());
  const path = svg.children.find(node => node.tag === "path"); assert.equal((path.attributes.d.match(/M/g) || []).length, 2); assert.equal((path.attributes.d.match(/L/g) || []).length, 2);
});
test("history requests are fixed and late responses cannot overwrite a newer range", async () => {
  const document = doc(), requests = [], resolvers = [];
  const root = renderTemperature(widget, document, { runtime: true, getStates: () => states, history: payload => { requests.push(payload); return new Promise(resolve => resolvers.push(resolve)); } });
  root.children[2].listeners.click({ stopPropagation() {} }); const dialog = document.body.children[0];
  dialog.children[1].children[1].listeners.click(); assert.equal(requests[0].range, "24h"); assert.equal(requests[1].range, "7d"); assert.equal(requests[0].actual_entity, "climate.room");
  resolvers[1]({ start: 0, end: 1, series: {} }); await flush(); const current = dialog.children[2].children[0];
  resolvers[0]({ start: 0, end: 1, series: {} }); await flush(); assert.equal(dialog.children[2].children[0], current); closeTemperatureHistory();
});
