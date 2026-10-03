import test from "node:test";
import assert from "node:assert/strict";
import { htmlListEntries, htmlListEntry, styledListCount } from "../web/value-list.js";

test("styled lists include index count, support zero and preserve legacy fallback entries", () => {
  const widget = { type: "value-list-html-style", count: 2, listValue0: "10", listValue1: "20", listValue2: "30", testIndex: "2" };
  assert.deepEqual(htmlListEntries(widget), ["10", "20", "30"]);
  assert.equal(htmlListEntry(widget, 0, true).value, "30");
  assert.equal(htmlListEntry(widget, 0, false).value, "10");
  assert.equal(htmlListEntry(widget, true, false).value, "20");
  assert.equal(htmlListEntry(widget, false, false).value, "10");
  widget.count = 0;
  assert.equal(styledListCount(widget), 0);
  assert.deepEqual(htmlListEntries(widget), ["10"]);
  assert.equal(htmlListEntry(widget, 1).value, "");
  assert.deepEqual(htmlListEntries({ type: widget.type, count: 1, valueList: "old0;old1", listValue1: "new1" }), ["old0", "new1"]);
});

test("HTML lists preserve commas and decode escaped semicolons inside entries", () => {
  assert.deepEqual(htmlListEntries({ valueList: "Test, test2, test3" }), ["Test, test2, test3"]);
  assert.deepEqual(htmlListEntries({ valueList: '<b style="color:red§§font-weight:bold">Test</b>;test2\ntest3' }), ['<b style="color:red;font-weight:bold">Test</b>', "test2", "test3"]);
});
test("editor preview never replaces the runtime live index and invalid indices stay empty", () => {
  const widget = { valueList: "Test;test2;test3", testIndex: "0" };
  assert.equal(htmlListEntry(widget, "2", true).value, "Test");
  assert.equal(htmlListEntry(widget, "2", false).value, "test3");
  widget.testIndex = "";
  assert.equal(htmlListEntry(widget, "1", true).value, "test2");
  for (const state of [undefined, null, "", "unavailable", -1, 3]) assert.equal(htmlListEntry(widget, state).value, "");
});
