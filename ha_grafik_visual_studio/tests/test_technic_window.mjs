import test from "node:test";
import assert from "node:assert/strict";
import { technicBindings, technicWindowState, technicPositionTarget, renderTechnicWindow, closeTechnicControls, syncTechnicControls } from "../web/technic-window.js";
const widget = { id: "w", contactEntityId: "binary_sensor.window", coverEntityId: "cover.blind", modeEntityId: "input_boolean.manual" };
const states = { "binary_sensor.window": { state: "on" }, "cover.blind": { state: "open", attributes: { current_position: 75, supported_features: 4 } }, "input_boolean.manual": { state: "off" } };
test("live values and all inversions use Boolean and HA cover semantics", () => {
  assert.deepEqual(technicBindings(widget), Object.keys(states));
  assert.deepEqual(technicWindowState(widget, states, true), { contact: true, position: 75, manual: false, coverWritable: true, modeWritable: true });
  const inverted = technicWindowState({ ...widget, invertContact: true, invertCover: true, invertMode: true }, states, true);
  assert.equal(inverted.contact, false); assert.equal(inverted.position, 25); assert.equal(inverted.manual, true);
  assert.equal(technicPositionTarget({ invertCover: true }, 25), 75);
  assert.equal(technicPositionTarget({}, 0), 0);
  for (const invalid of [-1, 101, NaN, "25", true]) assert.throws(() => technicPositionTarget({}, invalid));
});
test("bound unknown values never use previews, runtime unbound values stay unknown", () => {
  const preview = { contactPreview: true, positionPreview: 50, modePreview: true };
  assert.equal(technicWindowState(preview).position, 50);
  for (const current of [technicWindowState(preview, {}, true), technicWindowState({ ...widget, ...preview }, {}, false)]) {
    assert.equal(current.contact, null); assert.equal(current.position, null); assert.equal(current.manual, null); assert.equal(current.coverWritable, false);
  }
  for (const value of [null, "", 101, -1, "unknown"]) assert.equal(technicWindowState(widget, { ...states, "cover.blind": { state: "open", attributes: { current_position: value } } }, true).position, null);
});
test("editor, read-only, unavailable covers and unsupported position control never write", () => {
  assert.equal(technicWindowState(widget, states, false).coverWritable, false);
  assert.equal(technicWindowState({ ...widget, readOnly: true }, states, true).modeWritable, false);
  for (const entry of [{ state: "unavailable", attributes: { supported_features: 4 } }, { state: "open", attributes: { supported_features: 3 } }, { state: "open", attributes: { supported_features: "4" } }]) assert.equal(technicWindowState(widget, { ...states, "cover.blind": entry }, true).coverWritable, false);
  assert.equal(technicWindowState({ ...widget, modeEntityId: "sensor.mode" }, { ...states, "sensor.mode": { state: "on" } }, true).modeWritable, false);
});
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.style = {}; this.dataset = {}; this.listeners = {}; this.attributes = {}; }
  append(...children) { this.children.push(...children); }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  showModal() { this.open = true; }
  close() { this.open = false; this.listeners.close?.(); }
  remove() { this.removed = true; }
}
const document = () => ({ createElement: tag => new Element(tag), createElementNS: (_, tag) => new Element(tag), body: new Element("body") });
const flush = () => new Promise(resolve => setImmediate(resolve));
test("popup quick position and inverted mode dispatch once; duplicate pending and stale states are blocked", async () => {
  const doc = document(), writes = []; let live = states, resolveWrite;
  const root = renderTechnicWindow({ ...widget, heading: "Garage", showName: true, invertCover: true, invertMode: true }, doc, { runtime: true, getStates: () => live, writePosition: (id, value) => { writes.push([id, value]); return new Promise(resolve => { resolveWrite = resolve; }); }, writeMode: async (id, value) => { writes.push([id, value]); } });
  const open = root.children[0]; open.listeners.click({ stopPropagation() {} });
  const dialog = doc.body.children.at(-1), quick = dialog.children[2].children[1];
  quick.listeners.click(); quick.listeners.click(); assert.deepEqual(writes, [["cover.blind", 75]]);
  assert.equal(quick.disabled, true); resolveWrite(); await flush(); assert.equal(dialog.removed, true);
  open.listeners.click({ stopPropagation() {} });
  const next = doc.body.children.at(-1), mode = next.children[3]; mode.listeners.click(); await flush(); assert.deepEqual(writes.at(-1), ["input_boolean.manual", true]);
  open.listeners.click({ stopPropagation() {} }); live = {}; doc.body.children.at(-1).children[2].children[0].listeners.click(); assert.equal(writes.length, 2);
  closeTechnicControls();
});
test("failed action retains dialog with retry status; navigation closes it", async () => {
  const doc = document(); syncTechnicControls("page1", ["w"]);
  const root = renderTechnicWindow(widget, doc, { runtime: true, getStates: () => states, writePosition: async () => { throw Error("provider secret"); } });
  root.children[0].listeners.click({ stopPropagation() {} }); const dialog = doc.body.children.at(-1);
  dialog.children[2].children[0].listeners.click(); await flush();
  assert.match(dialog.children[4].textContent, /fehlgeschlagen/); assert.equal(dialog.children[2].children[0].disabled, false);
  syncTechnicControls("page2", ["w"]); assert.equal(dialog.removed, true);
});
