import test from "node:test";
import assert from "node:assert/strict";
import { connectionAnimationEntityId, resolveConnectionAnimation, lineboxAnimationSettings } from "../web/connection-animation.js";
import { getWidgetDefinition } from "../web/widget-registry.js";
import "../web/widget-sets/special.js";
import { readFileSync } from "node:fs";
import { resolveConnectionValueAnimation } from "../web/connection-animation.js";
import { lineValuePacket } from "../web/dataflow.js";

test("connected Poti output drives the rendered SVG line without an HA entity", () => {
  const app = readFileSync(new URL("../web/app.js", import.meta.url), "utf8");
  const body = app.slice(app.indexOf("function effectiveConnectionStyle("), app.indexOf("function appendConnectionMarker("));
  const effective = new Function("state", "connectionAnimationEntityId", "resolveConnectionAnimation", "lineboxAnimationSettings", "resolveConnectionValueAnimation", "lineValuePacket", "getWidgetDefinition", "isValuePointConnection", "connectionCollectorPosition", "lineboxOutputForConnection", `${body}; return effectiveConnectionStyle;`)(
    { entityStates: {} }, connectionAnimationEntityId, resolveConnectionAnimation, lineboxAnimationSettings, resolveConnectionValueAnimation, lineValuePacket,
    () => ({ render: { kind: "industrial-gauge" } }), () => false, () => null, () => null,
  );
  const poti = { id: "poti", type: "ugso.industrial/gauge-poti", state: 10, dataOutputEnabled: true, dockPointsEnabled: true, dock_right_center: true, dataOutputAnchor: "right-center" };
  const line = { id: "line", type: "svg-connection", startWidgetId: "poti", startAnchor: "right-center", animationEnabled: true, animationSource: "number", animationNumberEntityId: "", lineboxDivisor: 10, baseColor: "#123456" };
  const widgets = [poti, line];
  for (const [value, duration, direction] of [[10, 1, "forward"], [20, 0.5, "forward"], [-20, 0.5, "reverse"]]) {
    poti.state = value;
    const result = effective(line, widgets);
    assert.equal(result.animationEnabled, true);
    assert.equal(result.animationDuration, duration);
    assert.equal(result.animationDirection, direction);
    assert.equal(result.baseColor, line.baseColor);
  }
  for (const value of [0, "unavailable", undefined]) {
    poti.state = value;
    assert.equal(effective(line, widgets).animationEnabled, false);
  }
  poti.state = 20;
  assert.equal(effective({ ...line, animationEnabled: false }, widgets).animationEnabled, false);
  assert.equal(effective({ ...line, dataFlowVariant: "value-connection" }, widgets).animationEnabled, false);
  assert.equal(effective({ ...line, lineboxAutoDivisor: true, lineboxTargetSpeed: 0.5 }, widgets).animationDuration, 2);
});

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
