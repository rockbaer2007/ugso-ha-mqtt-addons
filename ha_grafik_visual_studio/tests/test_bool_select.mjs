import test from "node:test";
import assert from "node:assert/strict";
import { boolSelectOn } from "../web/bool-select.js";

test("Bool Select reads numeric and Boolean states and retains HA and legacy preview compatibility", () => {
  for (const value of [false, "false", 0, "0", "off", "", null, undefined]) assert.equal(boolSelectOn(value), false);
  for (const value of [true, "true", 1, "1", 400, "400", -2, "-2", "on", "text"]) assert.equal(boolSelectOn(value), true);
});
