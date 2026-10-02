import test from "node:test";
import assert from "node:assert/strict";
import { connectionAnimationEntityId, resolveConnectionAnimation } from "../web/connection-animation.js";
import { getWidgetDefinition } from "../web/widget-registry.js";
import "../web/widget-sets/special.js";

test("direction sources are one radio group with conditional settings", () => {
  const animation = getWidgetDefinition("svg-connection").propertyGroups.find((group) => group.label === "Animation");
  const source = animation.fields.find((field) => field.key === "animationSource");
  assert.equal(source.type, "radio");
  assert.deepEqual(source.options.map((option) => option.value), ["manual", "number", "boolean"]);
  assert.equal(animation.fields.find((field) => field.key === "animationDivisor").showWhen.value, "number");
  assert.equal(animation.fields.find((field) => field.key === "animationBooleanInvert").showWhen.value, "boolean");
});

test("manual lines retain their existing settings", () => {
  assert.deepEqual(resolveConnectionAnimation({ animationDirection: "reverse", animationDuration: 2 }, undefined), {});
});

test("only the selected source requests an entity state", () => {
  const widget = { animationNumberEntityId: "sensor.power", animationBooleanEntityId: "binary_sensor.flow" };
  assert.equal(connectionAnimationEntityId({ ...widget, animationSource: "manual" }), "");
  assert.equal(connectionAnimationEntityId({ ...widget, animationSource: "number" }), "sensor.power");
  assert.equal(connectionAnimationEntityId({ ...widget, animationSource: "boolean" }), "binary_sensor.flow");
});

test("numeric state controls direction and cycles per second", () => {
  const widget = { animationSource: "number", animationDivisor: 100 };
  assert.deepEqual(resolveConnectionAnimation(widget, { state: "1000" }), { animationDirection: "forward", animationDuration: 0.1 });
  assert.deepEqual(resolveConnectionAnimation(widget, { state: "-1000" }), { animationDirection: "reverse", animationDuration: 0.1 });
});

test("zero and unavailable numeric states stop animation", () => {
  const widget = { animationSource: "number", animationDivisor: 1 };
  for (const state of ["0", "unknown", "unavailable", "", undefined]) {
    assert.deepEqual(resolveConnectionAnimation(widget, state === undefined ? undefined : { state }), { animationEnabled: false });
  }
});

test("numeric speed is bounded and invalid divisors fall back to one", () => {
  assert.equal(resolveConnectionAnimation({ animationSource: "number", animationDivisor: 0 }, { state: "10" }).animationDuration, 0.1);
  assert.equal(resolveConnectionAnimation({ animationSource: "number", animationDivisor: 1 }, { state: "1000" }).animationDuration, 0.05);
  assert.equal(resolveConnectionAnimation({ animationSource: "number", animationDivisor: 1000 }, { state: "1" }).animationDuration, 20);
});

test("boolean state selects direction and can be inverted", () => {
  const widget = { animationSource: "boolean" };
  assert.deepEqual(resolveConnectionAnimation(widget, { state: "on" }), { animationDirection: "forward" });
  assert.deepEqual(resolveConnectionAnimation(widget, { state: "off" }), { animationDirection: "reverse" });
  assert.deepEqual(resolveConnectionAnimation({ ...widget, animationBooleanInvert: true }, { state: "on" }), { animationDirection: "reverse" });
  assert.deepEqual(resolveConnectionAnimation(widget, { state: "unavailable" }), { animationEnabled: false });
});
