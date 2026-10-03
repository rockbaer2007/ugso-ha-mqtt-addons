import test from "node:test";
import assert from "node:assert/strict";
import { noteValue, noteWritable } from "../web/note-widget.js";
import { getWidgetDefinition } from "../web/widget-registry.js";
import "../web/widget-sets/core.js";
test("Note test text overrides the entity only in the editor", () => {
  const widget = { state: "preview", entityId: "sensor.note" };
  assert.equal(noteValue(widget, { state: "live" }), "preview");
  assert.equal(noteValue(widget, { state: "live" }, true), "live");
  assert.equal(noteValue({}, undefined, true), "");
  assert.equal(noteValue({ state: "" }, { state: "live" }), "live");
  assert.equal(noteValue({}, { state: 0 }, true), "");
});
test("Note reads attributes and permits writes only to available text helpers", () => {
  const widget = { entityId: "input_text.note", entityAttribute: "friendly_name" };
  const entry = { state: "live", attributes: { friendly_name: "Name" } };
  assert.equal(noteValue(widget, entry, true), "Name");
  assert.equal(noteWritable(widget, entry), false);
  assert.equal(noteWritable({ entityId: "input_text.note" }, entry), true);
  for (const entityId of ["sensor.note", "input_number.note", ""]) assert.equal(noteWritable({ entityId }, entry), false);
  assert.equal(noteWritable({ entityId: "input_text.note" }, undefined), false);
  assert.equal(noteWritable({ entityId: "input_text.note" }, { state: "unavailable" }), false);
});
test("Note has a single test-text field, reference defaults and required CSS", () => {
  const definition = getWidgetDefinition("note");
  const fields = definition.propertyGroups.find(group => group.label === "Allgemein").fields;
  assert.deepEqual(fields.map(field => field.key), ["entityId", "entityAttribute", "prefix", "suffix", "state", "hideCorner"]);
  assert.equal(definition.defaults.width, 100); assert.equal(definition.defaults.height, 70);
  assert.equal(definition.defaults.radius, 5); assert.equal(definition.defaults.hideCorner, false);
  assert.ok(definition.propertyGroups.find(group => group.label === "CSS Allgemein").required);
  assert.ok(definition.propertyGroups.filter(group => group.css && group.label !== "CSS Allgemein").every(group => group.defaultEnabled === false));
});
