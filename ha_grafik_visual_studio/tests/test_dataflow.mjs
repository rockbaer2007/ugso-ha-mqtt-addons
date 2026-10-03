import test from "node:test";
import assert from "node:assert/strict";
import { convertPacket, parseNumberUnit, widgetInputPacket, lineValuePacket, widgetValuePacket } from "../web/dataflow.js";
import { numericConnectionValue, numericWidgetInput } from "../web/linebox.js";
import { mathBoxResult } from "../web/linebox-math.js";
const input = (value, unit = "") => ({ value, unit, error: "", type: typeof value });
const dock = (id, type, state) => ({ id, type, state, dockPointsEnabled: true, dock_left_center: true, dock_right_center: true });
// Dock keys use hyphens converted to underscores by dockPointKey.
import { dockPointKey } from "../web/dock-points.js";
const enable = (widget, ...ids) => Object.assign(widget, { dockPointsEnabled: true }, Object.fromEntries(ids.map(id => [dockPointKey(id), true])));
const link = (id, start, end, endAnchor = "left-center") => ({ id, type: "svg-connection", dataFlowVariant: "value-connection", startWidgetId: start, startAnchor: "right-center", endWidgetId: end, endAnchor });

test("independent output forwards live units on either line type and stops when disabled", () => {
  const source = { id: "source", type: "sensor", entityId: "sensor.temp", dataOutputEnabled: true, dataOutputAnchor: "top-center", dockPointsEnabled: false };
  const line = { id: "line", type: "svg-connection", startWidgetId: source.id, startAnchor: "top-center" };
  const states = { "sensor.temp": { state: "23.5", attributes: { unit_of_measurement: "°C" } } };
  assert.equal(lineValuePacket(line, [source, line], states).unit, "°C");
  assert.equal(numericConnectionValue(line, [source, line], states), 23.5);
  source.dataOutputAnchor = "bottom-center";
  assert.ok(lineValuePacket(line, [source, line], states).error);
  line.startAnchor = "bottom-center";
  assert.equal(numericConnectionValue(line, [source, line], states), 23.5);
  source.dataOutputEnabled = false;
  assert.equal(numericConnectionValue(line, [source, line], states), null);
});
test("units are recognized in text or source metadata without duplication", () => {
  assert.deepEqual(parseNumberUnit(" 23,5 °C ", "°F"), { value: 23.5, unit: "°C" });
  assert.equal(convertPacket({ conversion: "text-number" }, input("23,5 °C")).value, 23.5);
  assert.equal(convertPacket({ conversion: "number-text", decimals: 1, decimalComma: true, includeUnit: true }, input("23,5 °C", "°C")).value, "23,5 °C");
  assert.equal(convertPacket({ conversion: "number-text", decimals: 1, includeUnit: true }, input(23.5, "°C")).value, "23.5 °C");
  for (const value of ["", "unknown", "unavailable", "foo", null, true, "1 + 2"]) assert.ok(convertPacket({ conversion: "text-number" }, input(value)).error);
});
test("switch normalization preserves Boolean, number and text types", () => {
  for (const value of ["ON", " true ", 1, true]) assert.equal(convertPacket({ conversion: "normalize" }, input(value)).value, true);
  for (const value of ["off", "FALSE", 0, false]) assert.equal(convertPacket({ conversion: "normalize", booleanFormat: "number" }, input(value)).value, 0);
  assert.equal(convertPacket({ conversion: "normalize", booleanFormat: "on-off", invert: true }, input("on")).value, "off");
  assert.equal(convertPacket({ conversion: "boolean-text", onText: "Offen", offText: "Zu" }, input(true)).value, "Offen");
  assert.ok(convertPacket({ conversion: "normalize" }, input("maybe")).error);
});
test("threshold, scaling and explicit fallback do not invent default values", () => {
  assert.equal(convertPacket({ conversion: "number-boolean", threshold: 20 }, input(20)).value, true);
  assert.equal(convertPacket({ conversion: "number-boolean", threshold: 20 }, input(19)).value, false);
  assert.equal(convertPacket({ conversion: "scale", factor: 1.8, offset: 32, unit: "°F" }, input("20 °C")).value, 68);
  assert.ok(convertPacket({ conversion: "scale", factor: Infinity }, input(1)).error);
  assert.equal(convertPacket({ conversion: "text-number", fallbackEnabled: true, fallback: "Ersatz" }, input("unknown")).value, "Ersatz");
});
test("typed connections carry values from generic entity widgets and keep units", () => {
  const source = enable(dock("s", "string", "preview"), "right-center"); source.entityId = "sensor.temp";
  const converter = enable(dock("c", "value-converter"), "left-center", "right-center"); converter.conversion = "text-number";
  const line = link("l", "s", "c"), widgets = [source, converter, line];
  const states = { "sensor.temp": { state: "23.5", attributes: { unit_of_measurement: "°C" } } };
  assert.equal(widgetInputPacket(converter, widgets, states).unit, "°C");
  assert.equal(widgetValuePacket(converter, widgets, states).value, 23.5);
  assert.equal(widgetValuePacket(converter, widgets, states).unit, "°C");
  widgets.push(link("l2", "s", "c")); assert.match(widgetValuePacket(converter, widgets, states).error, /eine Quelle/);
});
test("conversion chains terminate cycles and forward hidden numeric results into Math and Number", () => {
  const source = enable(dock("s", "string", "on"), "right-center");
  const converter = enable(dock("c", "value-converter"), "left-center", "right-center"); converter.conversion = "boolean-number";
  const math = enable({ id: "m", type: "linebox-math", hideInRuntime: true, mathExpression: "A * 2", mathRole_A: "input", mathRole_G: "output" }, "A", "G");
  const number = enable(dock("n", "sensor"), "left-center"); number.numericSource = "dock";
  const one = link("one", "s", "c"), two = link("two", "c", "m", "A"), three = { ...link("three", "m", "n"), startAnchor: "G" };
  const widgets = [source, converter, math, number, one, two, three];
  assert.equal(numericConnectionValue(two, widgets, {}), 1);
  assert.equal(mathBoxResult(math, widgets, {}).value, 2);
  assert.equal(numericWidgetInput(number, widgets, {}), 2);
  one.startWidgetId = "c"; assert.match(lineValuePacket(one, widgets, {}).error, /Rückkopplung/);
});
test("collector branches retain their source values and terminate line cycles", () => {
  const source = enable(dock("s", "string", "off"), "right-center");
  const parent = { ...link("p", "s", "n"), connectionPoints: [{ id: "junction", collectorEnabled: true }] };
  const child = { ...link("c", "", "n"), startCollector: "p:junction" };
  assert.equal(lineValuePacket(child, [source, parent, child], {}).value, "off");
  parent.startCollector = "c:junction"; child.connectionPoints = [{ id: "junction", collectorEnabled: true }];
  assert.match(lineValuePacket(child, [source, parent, child], {}).error, /Rückkopplung/);
});
