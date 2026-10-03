import test from "node:test";
import assert from "node:assert/strict";
import { allocatePaletteColors, PALETTE_COLORS } from "../web/palette-colors.js";
test("external colors are distinct and stable across reorder, removal and reinstall", () => {
  const builtins = ["ha-grafik-core", ...Object.keys(PALETTE_COLORS)];
  const first = allocatePaletteColors([...builtins, "external.one", "external.two"]);
  assert.equal(first["ha-grafik-core"], undefined);
  assert.equal(new Set([...Object.values(PALETTE_COLORS), ...Object.values(first)]).size, 6);
  const next = allocatePaletteColors(["external.two", "external.three"], first);
  assert.equal(next["external.one"], first["external.one"]);
  assert.equal(next["external.two"], first["external.two"]);
  assert.notEqual(next["external.three"], first["external.one"]);
  assert.deepEqual(allocatePaletteColors(["external.one"], next), next);
});
test("invalid or duplicated saved colors are repaired", () => {
  const colors = allocatePaletteColors(["one", "two", "three"], { one: "hsl(38 40% 26%)", two: "url(bad)", three: "hsl(360 40% 26%)" });
  assert.equal(new Set(Object.values(colors)).size, 3);
  assert.ok(Object.values(colors).every(color => /^hsl\(\d+ 40% 26%\)$/.test(color)));
});
