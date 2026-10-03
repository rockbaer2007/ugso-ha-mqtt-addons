import test from "node:test";
import assert from "node:assert/strict";
import { stringEntityValue, stringDisplayValue } from "../web/string-display.js";
import { widgetValuePacket } from "../web/dataflow.js";

test("String preview overrides the source only in the editor", () => {
  const widget = { entityId: "sensor.tor", state: "<b>Test</b>" };
  const entry = { state: "off", attributes: { friendly_name: "Tor gestoppt" } };
  assert.equal(stringDisplayValue(widget, entry), "<b>Test</b>");
  assert.equal(stringDisplayValue(widget, entry, true), "off");
  assert.equal(stringDisplayValue({ ...widget, state: "" }, entry), "off");
  assert.equal(stringDisplayValue({ state: "Test" }, undefined, true), "");
  assert.equal(stringDisplayValue(widget, undefined, true), "--");
});

test("HA attribute selection resolves exact own keys and keeps false/zero values", () => {
  const entry = { state: "off", attributes: { friendly_name: "Tor gestoppt", count: 0, active: false } };
  assert.equal(stringEntityValue({ entityAttribute: "friendly_name" }, entry), "Tor gestoppt");
  assert.equal(stringEntityValue({ entityAttribute: "count" }, entry), 0);
  assert.equal(stringEntityValue({ entityAttribute: "active" }, entry), false);
  assert.equal(stringEntityValue({ entityAttribute: "toString" }, entry), undefined);
  assert.equal(stringEntityValue({ entityAttribute: "missing" }, entry), undefined);
  const source = { id: "source", type: "string", entityId: "sensor.tor", entityAttribute: "friendly_name", dataOutputEnabled: true, dataOutputAnchor: "right-center" };
  const result = widgetValuePacket(source, [source], { "sensor.tor": entry });
  assert.equal(result.value, "Tor gestoppt");
  assert.equal(result.unit, "");
});
