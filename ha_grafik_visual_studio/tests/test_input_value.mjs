import test from "node:test";
import assert from "node:assert/strict";
import { inputValueDelay, inputValueSubmission } from "../web/input-value.js";

test("Input value respects configured delay and legacy defaults", () => {
  assert.equal(inputValueDelay({}), 1000);
  assert.equal(inputValueDelay({ autoSetDelay: 0 }), 1000);
  assert.equal(inputValueDelay({ autoSetDelay: "2400" }), 2400);
});

test("Input value validates numbers and limits without turning empty limits into zero", () => {
  const widget = { numeric: true, min: 400, max: 900 };
  for (const value of ["", "NaN", "Infinity", "399", "901"]) assert.equal(inputValueSubmission(widget, value).valid, false, value);
  assert.deepEqual(inputValueSubmission(widget, "400"), { valid: true, value: 400 });
  assert.deepEqual(inputValueSubmission(widget, "900"), { valid: true, value: 900 });
  assert.equal(inputValueSubmission({ numeric: true, min: "", max: "" }, "-54.5").value, -54.5);
  assert.equal(inputValueSubmission({ entityId: "input_text.value", numeric: true }, "54.0").value, "54.0");
  assert.equal(inputValueSubmission({ numeric: false }, "54", true).value, 54);
  assert.deepEqual(inputValueSubmission({}, ""), { valid: true, value: "" });
});
