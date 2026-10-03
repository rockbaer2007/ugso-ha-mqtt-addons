import test from "node:test";
import assert from "node:assert/strict";
import { HEATING_PARAMS, heatingParamsBindings, heatingParamState, renderHeatingParams } from "../web/heating-params.js";
test("all eight parameters and optional room participate in live bindings", () => {
  const widget = { chosenRoomEntityId: "input_select.room", ...Object.fromEntries(HEATING_PARAMS.map(([key]) => [key + "EntityId", "input_boolean." + key])) };
  assert.equal(heatingParamsBindings(widget).length, 9);
  assert.equal(heatingParamsBindings({}).length, 0);
});
test("bound states never use preview; runtime unbound is unknown", () => {
  assert.equal(heatingParamState({ presentPreview: true }, "present", {}, false).state, true);
  assert.equal(heatingParamState({ presentPreview: true }, "present", {}, true).state, null);
  const widget = { presentEntityId: "input_boolean.present", presentPreview: true };
  for (const state of [undefined, "unknown", "unavailable", "", "yes"]) assert.equal(heatingParamState(widget, "present", { "input_boolean.present": { state } }, true).state, null);
  assert.equal(heatingParamState(widget, "present", { "input_boolean.present": { state: "off" } }, true).state, false);
});
test("only available switch/helpers are writable in runtime; readonly and pending block", () => {
  for (const entity of ["input_boolean.present", "switch.present", "binary_sensor.present", "sensor.present", "light.present"]) {
    const widget = { presentEntityId: entity }, states = { [entity]: { state: "on" } };
    const writable = /^(input_boolean|switch)\./.test(entity);
    assert.equal(heatingParamState(widget, "present", states, true).writable, writable);
    assert.equal(heatingParamState(widget, "present", states, false).writable, false);
    assert.equal(heatingParamState({ ...widget, readOnly: true }, "present", states, true).writable, false);
    assert.equal(heatingParamState(widget, "present", states, true, new Set([entity])).writable, false);
  }
});
class Node {
  constructor(tag) { this.tag = tag; this.children = []; this.listeners = {}; }
  append(...nodes) { this.children.push(...nodes); }
  setAttribute(key, value) { this[key] = value; }
  addEventListener(key, fn) { this.listeners[key] = fn; }
}
test("render targets only clicked parameter, uses plain room text and accessible switches", () => {
  const writes = [], widget = { chosenRoomEntityId: "input_select.room", presentEntityId: "input_boolean.present", guestsEntityId: "binary_sensor.guests" };
  const root = renderHeatingParams(widget, { createElement: tag => new Node(tag) }, { runtime: true, states: { "input_select.room": { state: "<img onerror=alert(1)>" }, "input_boolean.present": { state: "off" }, "binary_sensor.guests": { state: "on" } }, write: (...args) => writes.push(args) });
  assert.equal(root.children.length, 9); assert.match(root.children[0].textContent, /<img/);
  const control = root.children[3].children[0]; assert.equal(control.role, "switch"); assert.equal(control["aria-label"], "Anwesend");
  control.checked = true; control.listeners.change(); assert.deepEqual(writes, [["input_boolean.present", true]]);
  root.children[5].children[0].listeners.change(); assert.equal(writes.length, 1);
});
