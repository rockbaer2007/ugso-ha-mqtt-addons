import test from "node:test";
import assert from "node:assert/strict";
import { redNumberDisplay } from "../web/red-number.js";
import { getWidgetDefinition } from "../web/widget-registry.js";
import { migrationHint } from "../web/migration-hints.js";
import "../web/widget-sets/core.js";

test("Red Number suppresses zero, false and missing runtime values", () => {
  for (const value of [0, "0.0", false, "false", null, undefined, "unknown", "unavailable", Infinity]) assert.equal(redNumberDisplay(value, true).visible, false);
  assert.equal(redNumberDisplay(7, true, false).visible, false);
  for (const value of [1, "54.2", -3]) assert.equal(redNumberDisplay(value, true).visible, true);
});

test("Numeric conversion selects singular exactly at one and retains an editor placeholder", () => {
  assert.deepEqual(redNumberDisplay("1.0", true), { text: "1", singular: true, visible: true });
  assert.equal(redNumberDisplay("2", true).singular, false);
  assert.deepEqual(redNumberDisplay(null, false), { text: "--", singular: false, visible: true });
  assert.equal(redNumberDisplay(0, false).text, "0");
});

test("Red Number exposes standard HTML fields and only mandatory CSS by default", () => {
  const definition = getWidgetDefinition("red-number");
  assert.equal(definition.defaults.width, 52);
  assert.equal(definition.defaults.height, 30);
  const fields = definition.propertyGroups.find(group => group.label === "Allgemein").fields;
  for (const key of ["prefix", "suffixSingular", "suffixPlural"]) assert.equal(fields.find(field => field.key === key).type, "html");
  assert.equal(fields.some(field => field.key === "state"), false);
  for (const key of ["badgeBorder", "radius"]) assert.deepEqual(fields.find(field => field.key === key).showWhen, { key: "badgeType", value: "circle" });
  assert.deepEqual(definition.propertyGroups.filter(group => group.css && group.defaultEnabled).map(group => group.label), ["CSS Allgemein"]);
  assert.match(migrationHint({ type: "red-number" }, "entityId"), /kein HA-Helfer/);
});
