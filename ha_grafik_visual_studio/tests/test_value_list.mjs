import test from "node:test";
import assert from "node:assert/strict";
import { htmlListEntries, htmlListEntry } from "../web/value-list.js";

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
