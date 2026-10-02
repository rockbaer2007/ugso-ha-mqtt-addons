import test from "node:test";
import assert from "node:assert/strict";
import { groupMembers, groupBounds, translateGroup, remapGroups } from "../web/widget-groups.js";

test("groups select together and editing selects one member", () => {
  const widgets = [{ id: "a", editorGroupId: "g", x: 5, y: 10, width: 20, height: 30 }, { id: "b", editorGroupId: "g", x: 40, y: 20, width: 50, height: 10 }, { id: "c" }];
  assert.equal(groupMembers(widgets, widgets[0]).length, 2);
  assert.deepEqual(groupMembers(widgets, widgets[0], "g"), [widgets[0]]);
  assert.deepEqual(groupBounds(widgets.slice(0, 2)), { x: 5, y: 10, width: 85, height: 30 });
  const moved = translateGroup(widgets.slice(0, 2), -20, 12);
  assert.deepEqual(moved, [{ id: "a", x: 0, y: 22 }, { id: "b", x: 35, y: 32 }]);
  assert.equal(moved[1].x - moved[0].x, 35);
});

test("copies remap complete or partial multi-member groups independently and drop singleton groups", () => {
  const widgets = [{ id: "a", editorGroupId: "g" }, { id: "b", editorGroupId: "g" }, { id: "c", editorGroupId: "h" }];
  const map = new Map(); remapGroups(widgets, map, () => "new-group");
  assert.equal(map.get("g"), "new-group");
  assert.equal(map.has("h"), false);
  assert.notEqual(map.get("g"), "g");
});
