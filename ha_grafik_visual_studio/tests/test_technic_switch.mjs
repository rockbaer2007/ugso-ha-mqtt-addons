import test from "node:test";
import assert from "node:assert/strict";
import { TECHNIC_SWITCH_ICONS, technicSwitchState, renderTechnicSwitch } from "../web/technic-switch.js";
const widget = { id: "w", heading: "Device", showName: true, entityId: "switch.device", valueType: "bool", iconKey: "Knopf-AN" };
test("HA Boolean domains and numeric 0/1 have distinct writable contracts", () => {
  for (const domain of ["switch", "light", "input_boolean"]) for (const state of ["on", "off"]) {
    const id = `${domain}.device`, model = technicSwitchState({ ...widget, entityId: id }, { [id]: { state } }, true);
    assert.equal(model.on, state === "on"); assert.equal(model.writable, true);
  }
  for (const state of [0, 1, "0", "1"]) assert.equal(technicSwitchState({ ...widget, entityId: "input_number.device", valueType: "number" }, { "input_number.device": { state } }, true).writable, true);
  for (const state of [2, "unknown", "unavailable", "", true, "on"]) assert.equal(technicSwitchState({ ...widget, entityId: "input_number.device", valueType: "number" }, { "input_number.device": { state } }, true).writable, false);
  assert.equal(technicSwitchState({ ...widget, entityId: "sensor.device" }, { "sensor.device": { state: "on" } }, true).writable, false);
});
test("unknown, editor, read-only and unbound runtime never write or use previews", () => {
  assert.equal(technicSwitchState({ ...widget, previewOn: true }, {}, true).on, null);
  assert.equal(technicSwitchState({ entityId: "", previewOn: true }, {}, true).on, null);
  assert.equal(technicSwitchState({ entityId: "", valueType: "number", previewOn: true }).on, true);
  const states = { "switch.device": { state: "on" } };
  assert.equal(technicSwitchState(widget, states).writable, false);
  assert.equal(technicSwitchState({ ...widget, readOnly: true }, states, true).writable, false);
});
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.style = {}; this.attributes = {}; this.listeners = {}; }
  append(...nodes) { this.children.push(...nodes); }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(event, fn) { this.listeners[event] = fn; }
}
const document = () => ({ createElement: tag => new Element(tag), createElementNS: (_, tag) => new Element(tag) });
test("all 16 original symbols render, caption placement and colors persist", () => {
  assert.equal(Object.keys(TECHNIC_SWITCH_ICONS).length, 16);
  for (const iconKey of Object.keys(TECHNIC_SWITCH_ICONS)) for (const namePosition of ["top", "bottom"]) {
    const root = renderTechnicSwitch({ ...widget, iconKey, namePosition, colorAN: "#123456" }, document(), { runtime: true, getStates: () => ({ "switch.device": { state: "on" } }) });
    const button = root.children.find(node => node.tag === "button");
    assert.ok(button.children[0].children.length); assert.equal(button.style.color, "#123456");
    assert.equal(root.children[namePosition === "top" ? 0 : 1].textContent, "Device");
  }
});
test("pending click is sent once, stale unavailable state blocks; caption never disappears", async () => {
  let live = { "switch.device": { state: "off" } }, resolve;
  let settled = false;
  const writes = [], root = renderTechnicSwitch(widget, document(), { runtime: true, getStates: () => live, onSettled: () => { settled = true; assert.equal(technicSwitchState(widget, live, true).writable, true); }, write: (...args) => { writes.push(args); return new Promise(done => { resolve = done; }); } });
  const button = root.children[0], event = { stopPropagation() {} };
  const request = button.listeners.click(event); await button.listeners.click(event);
  assert.equal(writes.length, 1); assert.deepEqual(writes[0], ["switch.device", true, false]);
  const other = renderTechnicSwitch(widget, document(), { runtime: true, getStates: () => live }); assert.equal(other.children[0].disabled, true);
  assert.equal(root.children[1].textContent, "Device");
  live = { "switch.device": { state: "on" } }; resolve(); await request;
  assert.equal(settled, true);
  assert.equal(button.attributes["aria-checked"], "true"); assert.equal(root.children[1].textContent, "Device");
  live = {}; await button.listeners.click(event); assert.equal(writes.length, 1);
});
test("numeric toggles send actual numbers; failures keep label and offer retry", async () => {
  const w = { ...widget, entityId: "input_number.device", valueType: "number" }, writes = [];
  const root = renderTechnicSwitch(w, document(), { runtime: true, getStates: () => ({ "input_number.device": { state: "1" } }), write: async (...args) => { writes.push(args); throw Error("secret"); } });
  await root.children[0].listeners.click({ stopPropagation() {} });
  assert.deepEqual(writes[0], ["input_number.device", 0, true]);
  assert.equal(root.children[1].textContent, "Device"); assert.match(root.children[2].textContent, /fehlgeschlagen/); assert.doesNotMatch(root.children[2].textContent, /secret/); assert.equal(root.children[0].disabled, false);
  const rerender = renderTechnicSwitch(w, document(), { runtime: true, getStates: () => ({ "input_number.device": { state: "1" } }) });
  assert.equal(rerender.children[0].disabled, false); assert.match(rerender.children[2].textContent, /fehlgeschlagen/);
});
