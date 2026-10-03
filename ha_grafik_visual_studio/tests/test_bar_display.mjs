import test from "node:test";
import assert from "node:assert/strict";
import { barDisplay } from "../web/bar-display.js";

test("bar reverse changes origin without complementing the fill percentage", () => {
  const widget = { min: 0, max: 1000 };
  assert.deepEqual(barDisplay(widget, 300), { percent: 30, dimension: "width", inset: "0 auto 0 0" });
  assert.deepEqual(barDisplay({ ...widget, invert: true }, 300), { percent: 30, dimension: "width", inset: "0 0 0 auto" });
  assert.equal(barDisplay({ ...widget, orientation: "vertical" }, 300).inset, "0 0 auto");
  assert.equal(barDisplay({ ...widget, orientation: "vertical", invert: true }, 300).inset, "auto 0 0");
  assert.equal(barDisplay(widget, 2000).percent, 100);
  assert.equal(barDisplay(widget, -1).percent, 0);
  assert.equal(barDisplay({ min: 1, max: 1 }, 1).percent, 0);
  assert.equal(barDisplay(widget, "unavailable").percent, 0);
});
