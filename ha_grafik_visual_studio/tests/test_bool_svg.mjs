import test from "node:test";
import assert from "node:assert/strict";
import { boolSvgOn, boolSvgNext, boolSvgOpacity } from "../web/bool-svg.js";
import { getWidgetDefinition } from "../web/widget-registry.js";
import "../web/widget-sets/core.js";

test("SVG follows VIS2 false and nonzero numeric states", () => {
  for (const value of [null, undefined, false, 0, "0.0", "OFF", "false"]) assert.equal(boolSvgOn(value), false);
  for (const value of [true, 1, 2, -1, 0.2, "ON", "2"]) assert.equal(boolSvgOn(value), true);
});

test("SVG toggles boolean states and uses the standard numeric threshold", () => {
  for (const value of [false, "off", "false", 0, 0.2, ""]) assert.equal(boolSvgNext(value), 1);
  for (const value of [true, "on", "true", 0.5, 1, 2]) assert.equal(boolSvgNext(value), 0);
});

test("Invisible SVG remains editable without changing runtime opacity", () => {
  assert.equal(boolSvgOpacity(0, false), 0.2);
  assert.equal(boolSvgOpacity(0, true), 0);
  assert.equal(boolSvgOpacity(null, true), 1);
  assert.equal(boolSvgOpacity("invalid", true), 1);
});

test("SVG defaults match the reference fields and mandatory geometry", () => {
  const definition = getWidgetDefinition("bool-svg");
  assert.equal(definition.defaults.width, 85);
  assert.equal(definition.defaults.height, 85);
  assert.match(definition.defaults.svgFalse, /fill:lime/);
  assert.match(definition.defaults.svgTrue, /fill:yellow/);
  assert.equal(definition.propertyGroups.find(group => group.label === "Allgemein").fields.some(field => field.key === "state"), false);
  assert.deepEqual(definition.propertyGroups.filter(group => group.css && group.defaultEnabled).map(group => group.label), ["CSS Allgemein"]);
});
