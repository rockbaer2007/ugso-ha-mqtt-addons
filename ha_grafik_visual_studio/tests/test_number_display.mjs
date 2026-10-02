import test from "node:test";
import assert from "node:assert/strict";
import { numberDisplay } from "../web/number-display.js";

const widget = {
  type: "sensor", title: "Number", entityId: "input_number.line1", state: "99",
  unit: "W", prefix: "<b>Input</b>", suffixPlural: " kW", digits: 1, factor: 1, decimalComma: true,
};

test("bound Number keeps configured HTML around the live formatted value", () => {
  for (const [config, state, value] of [
    [widget, { state: "12.5" }, "12,5"],
    [{ ...widget, factor: 2, digits: 2 }, { state: "12.5" }, "25,00"],
    [widget, { state: "0" }, "0,0"], [widget, { state: "unavailable" }, "--"], [widget, undefined, "--"],
  ]) assert.deepEqual(numberDisplay(config, state), { value, bound: true, prefix: "<b>Input</b>", suffix: " kW" });
});

test("Number chooses singular after scaling and switches back to plural", () => {
  const config = { ...widget, suffixSingular: "<i>Watt</i>", suffixPlural: "<i>Watts</i>", factor: 0.5 };
  assert.equal(numberDisplay(config, { state: "2" }).suffix, "<i>Watt</i>");
  assert.equal(numberDisplay(config, { state: "4" }).suffix, "<i>Watts</i>");
  assert.equal(numberDisplay({ ...widget, suffixPlural: "" }, { state: "4" }).suffix, "W");
});

test("unbound Number keeps its configured preview decorations", () => {
  assert.deepEqual(numberDisplay({ ...widget, entityId: "" }), { value: "99,0", bound: false, prefix: "<b>Input</b>", suffix: " kW" });
});
