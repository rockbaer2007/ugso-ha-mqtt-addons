import test from "node:test";
import assert from "node:assert/strict";
import { htmlStateValue } from "../web/html-state.js";
import { migrationHint } from "../web/migration-hints.js";

test("HTML State writes a fixed typed value regardless of the current entity state", () => {
  for (const state of ["on", "off", 0, 1]) assert.equal(htmlStateValue({ writeValue: "off", state }), "off");
  assert.equal(htmlStateValue({ writeValue: "true" }), true);
  assert.equal(htmlStateValue({ writeValue: "false" }), false);
  assert.equal(htmlStateValue({ writeValue: "42" }), 42);
  assert.equal(htmlStateValue({ writeValue: "0" }), 0);
  assert.equal(htmlStateValue({ writeValue: "042" }), "042");
  assert.equal(htmlStateValue({ writeValue: "" }), "");
  assert.equal(htmlStateValue({ state: "off" }), "off");
  assert.match(migrationHint({ type: "html-state" }, "entityId"), /Sensor ist kein Schreibziel/);
  assert.match(migrationHint({ type: "html-state" }, "clickUrl"), /Browser/);
});
