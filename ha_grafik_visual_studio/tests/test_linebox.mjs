import test from "node:test";
import assert from "node:assert/strict";
import { lineboxHelperOutput, lineboxInputSum, lineboxOutputForConnection, lineboxPortRole, lineboxRuntimeJoinPosition } from "../web/linebox.js";
import { getWidgetDefinition } from "../web/widget-registry.js";
import "../web/widget-sets/core.js";
import "../web/widget-sets/basic2.js";
import "../web/widget-sets/special.js";

const box = {
  id: "box", type: "linebox", dockPointsEnabled: true,
  dock_left_center: true, lineboxRole_left_center: "input",
  dock_top_center: true, lineboxRole_top_center: "input",
  dock_right_center: true, lineboxRole_right_center: "output", lineboxPass_right_center: true,
};
const solar = { id: "solar", type: "svg-connection", animationSource: "number", animationNumberEntityId: "sensor.solar", endWidgetId: "box", endAnchor: "left-center" };
const battery = { id: "battery", type: "svg-connection", animationSource: "number", animationNumberEntityId: "sensor.battery", endWidgetId: "box", endAnchor: "top-center" };
const outgoing = { id: "outgoing", type: "svg-connection", startWidgetId: "box", startAnchor: "right-center" };
const widgets = [box, solar, battery, outgoing];
const states = { "sensor.solar": { state: "1000" }, "sensor.battery": { state: "-300" } };

test("SVG LineBox and SVG-Line keep their stored widget types", () => {
  assert.equal(getWidgetDefinition("svg-connection").label, "SVG-Line");
  assert.equal(getWidgetDefinition("linebox").label, "SVG LineBox");
  assert.equal(getWidgetDefinition("linebox").defaults.dockPointsEnabled, false);
  assert.equal(getWidgetDefinition("button").label, "Icon Toggle Button");
  assert.equal(getWidgetDefinition("gauge").label, "Gauge");
  assert.equal(getWidgetDefinition("universal-button").label, "State Element");
});

test("active input ports sum signed numeric line values", () => {
  assert.equal(lineboxInputSum(box, widgets, states), 700);
  assert.deepEqual(lineboxOutputForConnection(outgoing, widgets, states), { boxId: "box", value: 700 });
  assert.deepEqual(lineboxOutputForConnection({ ...outgoing, startWidgetId: "", endWidgetId: "box", endAnchor: "right-center" }, widgets, states), { boxId: "box", value: -700 });
});

test("inactive and neutral ports are ignored", () => {
  const neutral = { ...box, lineboxRole_top_center: "none" };
  assert.equal(lineboxInputSum(neutral, widgets, states), 1000);
  assert.equal(lineboxPortRole({ ...box, dock_left_center: false }, "left-center"), "none");
  assert.equal(lineboxInputSum({ ...box, dock_left_center: false }, widgets, states), -300);
});

test("output handoff is opt-in per port and missing values do not invent a sum", () => {
  assert.equal(lineboxOutputForConnection(outgoing, [{ ...box, lineboxPass_right_center: false }, solar, battery, outgoing], states), null);
  assert.equal(lineboxOutputForConnection(outgoing, [{ ...box, lineboxPass_right_center: undefined }, solar, battery, outgoing], states), null);
  assert.deepEqual(lineboxOutputForConnection(outgoing, widgets, {}), { boxId: "box", value: null });
  assert.equal(lineboxInputSum(box, widgets, { "sensor.solar": { state: "0" } }), 0);
});

test("optional helper output uses the signed sum without changing internal handoff", () => {
  const helperBox = { ...box, outputHelperEnabled: true, outputHelperEntityId: "input_number.linebox_total" };
  const layout = [helperBox, solar, battery, outgoing];
  assert.deepEqual(lineboxHelperOutput(helperBox, layout, states), { entityId: "input_number.linebox_total", value: 700 });
  assert.deepEqual(lineboxOutputForConnection(outgoing, layout, states), { boxId: "box", value: 700 });
  assert.equal(lineboxHelperOutput(helperBox, layout, {}), null);
  assert.equal(lineboxHelperOutput({ ...helperBox, outputHelperEnabled: false }, layout, states), null);
});

test("helper output refuses unsupported targets and direct feedback", () => {
  const helperBox = { ...box, outputHelperEnabled: true, outputHelperEntityId: "sensor.total" };
  assert.equal(lineboxHelperOutput(helperBox, [helperBox, solar], states), null);
  helperBox.outputHelperEntityId = "sensor.solar";
  assert.equal(lineboxHelperOutput(helperBox, [helperBox, solar], states), null);
  helperBox.outputHelperEntityId = "input_number.solar";
  const loop = { ...solar, animationNumberEntityId: "input_number.solar" };
  assert.equal(lineboxHelperOutput(helperBox, [helperBox, loop], { "input_number.solar": { state: "1000" } }), null);
});

test("runtime routes active input and output ports to one invisible join", () => {
  const positioned = { ...box, x: 200, y: 80, width: 140, height: 76 };
  assert.deepEqual(lineboxRuntimeJoinPosition(positioned, "left-center"), { x: 270, y: 118 });
  assert.deepEqual(lineboxRuntimeJoinPosition(positioned, "right-center"), { x: 270, y: 118 });
  assert.deepEqual(lineboxRuntimeJoinPosition({ ...positioned, lineboxPass_right_center: false }, "right-center"), { x: 270, y: 118 });
  assert.deepEqual(lineboxRuntimeJoinPosition(positioned, "top-center"), { x: 270, y: 118 });
  assert.equal(lineboxRuntimeJoinPosition({ ...positioned, lineboxRole_right_center: "none" }, "right-center"), null);
  assert.equal(lineboxRuntimeJoinPosition({ ...positioned, dock_left_center: false }, "left-center"), null);
});
