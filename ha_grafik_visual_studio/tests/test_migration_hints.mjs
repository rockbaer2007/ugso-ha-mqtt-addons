import test from "node:test";
import assert from "node:assert/strict";
import { migrationHint } from "../web/migration-hints.js";

test("migration hints distinguish HA write targets from read-only and navigation fields", () => {
  assert.match(migrationHint({ type: "slider" }, "entityId"), /input_number/);
  assert.match(migrationHint({ type: "table" }, "selectedEntityId"), /input_text/);
  assert.match(migrationHint({ type: "bool-svg" }, "entityId"), /switch.*input_number.*input_text/);
  assert.match(migrationHint({ type: "bool-svg", readOnly: true }, "entityId"), /Nur Anzeige/);
  assert.match(migrationHint({ type: "universal-button", interaction: "navigation" }, "entityId"), /nur gelesen/);
  assert.match(migrationHint({ type: "universal-button", interaction: "read-only" }, "entityId"), /kein zusätzlicher HA-Helfer/);
  assert.match(migrationHint({ type: "universal-button", interaction: "switch" }, "entityId"), /input_number.*input_text/);
  assert.equal(migrationHint({ type: "sensor" }, "entityId"), "");
  assert.match(migrationHint({ type: "table" }, "eventEntityId"), /kein zusätzlicher Helfer/);
  assert.match(migrationHint({ type: "linebox" }, "outputHelperEntityId"), /input_number/);
});
