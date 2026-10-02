import test from "node:test";
import assert from "node:assert/strict";
import { numberDisplay } from "../web/number-display.js";

const widget = {
  type: "sensor", title: "Number", entityId: "input_number.line1", state: "99",
  unit: "W", prefix: "<b>Input</b>", suffixPlural: " kW", digits: 1, factor: 1, decimalComma: true,
};

test("bound Number contains only the formatted current value", () => {
  assert.deepEqual(numberDisplay(widget, { state: "12.5" }), { value: "12,5", bound: true, prefix: "", suffix: "" });
  assert.deepEqual(numberDisplay({ ...widget, factor: 2, digits: 2 }, { state: "12.5" }), { value: "25,00", bound: true, prefix: "", suffix: "" });
  assert.deepEqual(numberDisplay(widget, { state: "0" }), { value: "0,0", bound: true, prefix: "", suffix: "" });
  assert.deepEqual(numberDisplay(widget, { state: "unavailable" }), { value: "--", bound: true, prefix: "", suffix: "" });
  assert.deepEqual(numberDisplay(widget, undefined), { value: "--", bound: true, prefix: "", suffix: "" });
});

test("unbound Number keeps its configured preview decorations", () => {
  assert.deepEqual(numberDisplay({ ...widget, entityId: "" }), { value: "99,0", bound: false, prefix: "<b>Input</b>", suffix: " kW" });
});
