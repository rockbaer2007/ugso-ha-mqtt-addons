import test from "node:test";
import assert from "node:assert/strict";
import { filterEntries, defaultFilters, filterValues, filterSelected, chooseFilter, filterHex } from "../web/filter-widget.js";

test("filter entries accept VIS2 JSON and legacy Studio rows without changing them", () => {
  const widget = { items: JSON.stringify([{ label: "test", value: 1, color: "rgba(120,112,160,1)", activeColor: "rgba(65,77,25,1)", default: true }]) };
  assert.equal(filterEntries(widget)[0].title, "test");
  assert.equal(filterEntries(widget)[0].textColor, "rgba(120,112,160,1)");
  assert.deepEqual(defaultFilters(widget), ["1"]);
  assert.equal(filterEntries({ items: "invalid" }).length, 0);
  assert.deepEqual(filterEntries({ filterOptions: "A;B" }).map(entry => entry.value), ["A", "B"]);
});

test("page filter selection supports reset, multi-value entries and multiple defaults", () => {
  assert.deepEqual(filterValues(["A;B", "A,C"]), ["A", "B", "C"]);
  assert.deepEqual(chooseFilter(["A"], "B;C", false), ["B", "C"]);
  assert.deepEqual(chooseFilter(["A", "B", "C"], "B;C", true), ["A"]);
  assert.deepEqual(chooseFilter(["A"], "B;C", true), ["A", "B", "C"]);
  assert.deepEqual(chooseFilter(["A"], "", true), []);
  assert.equal(filterSelected({ value: "A;B" }, ["A", "B"]), true);
  const widget = { filterEntries: [{ value: "A;B", isDefault: true }, { value: "C", isDefault: true }], multiple: false };
  assert.deepEqual(defaultFilters(widget), ["A", "B"]);
  assert.deepEqual(defaultFilters({ ...widget, multiple: true }), ["A", "B", "C"]);
});

test("HEX conversion retains RGB colors and transparency", () => {
  assert.equal(filterHex("rgba(120,112,160,1)"), "#7870A0");
  assert.equal(filterHex("rgba(65,77,25,1)"), "#414D19");
  assert.equal(filterHex("rgba(0,128,255,0.5)"), "#0080FF80");
  assert.equal(filterHex("#abc"), "#AABBCC");
  assert.equal(filterHex("#abcd"), "#AABBCCDD");
  assert.equal(filterHex(""), "");
  assert.equal(filterHex("blue"), "blue");
});
