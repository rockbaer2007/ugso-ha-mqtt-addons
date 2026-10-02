import test from "node:test";
import assert from "node:assert/strict";
import { sliderScale } from "../web/slider-scale.js";

test("legacy sliders retain optional endpoints and no intermediate marks", () => {
  assert.deepEqual(sliderScale({}).marks, []);
  assert.deepEqual(sliderScale({ showMinMax: true }).marks.map(mark => mark.label), ["0", "100"]);
});

test("nine intermediate marks create the reference scale independently of input step", () => {
  const scale = sliderScale({ min: 0, max: 100, step: 3, scaleSteps: 9, showStepValues: true, showMinMax: true, scalePosition: "above" });
  assert.equal(scale.position, "above");
  assert.deepEqual(scale.marks.map(mark => Number(mark.label)), [0,10,20,30,40,50,60,70,80,90,100]);
});

test("marks can hide numbers and counts stay inside the range", () => {
  assert.equal(sliderScale({ min: 0, max: 100, scaleSteps: 100 }).count, 99);
  assert.equal(sliderScale({ scaleSteps: -1 }).count, 0);
  assert.equal(sliderScale({ min: 10, max: 10, scaleSteps: 9 }).count, 0);
  assert.ok(sliderScale({ scaleSteps: 9 }).marks.every(mark => mark.label === ""));
  assert.deepEqual(sliderScale({ min: -10, max: 10, scaleSteps: 3, showStepValues: true }).marks.map(mark => mark.label), ["-5","0","5"]);
});
