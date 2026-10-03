import test from "node:test";
import assert from "node:assert/strict";
import { connectionAnimationEntityId, resolveConnectionAnimation, lineboxAnimationSettings } from "../web/connection-animation.js";
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

test("automatic divisors maintain the chosen speed across power ranges and signs", () => {
  const widget = { animationSource: "number", animationAutoDivisor: true, animationTargetSpeed: 0.5, animationDivisor: 100 };
  for (const value of [0.01, 10, 99, 100, 200, 500, 1000, 5000, 15000, 1000000]) {
    for (const sign of [1, -1]) {
      const result = resolveConnectionAnimation(widget, { state: String(value * sign) });
      assert.equal(result.animationDuration, 2);
      assert.equal(result.animationDirection, sign === 1 ? "forward" : "reverse");
    }
  }
  assert.equal(widget.animationDivisor, 100);
  assert.equal(resolveConnectionAnimation({ ...widget, animationAutoDivisor: false }, { state: "1000" }).animationDuration, 0.1);
  for (const state of ["0", "unknown", "unavailable"]) assert.deepEqual(resolveConnectionAnimation(widget, { state }), { animationEnabled: false });
});

test("LineBox automation is independent and target speeds are validated", () => {
  const widget = { animationAutoDivisor: true, animationTargetSpeed: 2, lineboxAutoDivisor: false, lineboxDivisor: 100, lineboxTargetSpeed: 0.5 };
  assert.equal(resolveConnectionAnimation(lineboxAnimationSettings(widget), { state: "1000" }).animationDuration, 0.1);
  assert.equal(resolveConnectionAnimation(lineboxAnimationSettings({ ...widget, lineboxAutoDivisor: true }), { state: "15000" }).animationDuration, 2);
  for (const [target, duration] of [[undefined, 1], [0, 1], ["invalid", 1], [100, 0.2], [0.001, 20]]) {
    assert.equal(resolveConnectionAnimation({ animationSource: "number", animationAutoDivisor: true, animationTargetSpeed: target }, { state: "15000" }).animationDuration, duration);
  }
  const fields = getWidgetDefinition("svg-connection").propertyGroups.find(group => group.label === "Animation").fields;
  for (const key of ["animationAutoDivisor", "lineboxAutoDivisor"]) assert.equal(fields.find(field => field.key === key).default, false);
});
