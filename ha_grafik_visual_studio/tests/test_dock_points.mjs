import test from "node:test";
import assert from "node:assert/strict";
import { dockPointKey, initializeDockPoints, setAllDockPoints, dockPointSelection } from "../web/dock-points.js";

const anchors = ["left-top", "left-center", "right-bottom"];

test("new or disabled widgets start with every docking point off", () => {
  const widget = { dockPointsEnabled: false };
  initializeDockPoints(widget, anchors);
  assert.deepEqual(anchors.map(id => widget[dockPointKey(id)]), [false, false, false]);
  assert.equal(dockPointSelection(widget, anchors), "none");
});

test("previously active widgets retain implicit docking points", () => {
  const widget = { dockPointsEnabled: true, dock_left_center: false };
  initializeDockPoints(widget, anchors);
  assert.deepEqual(anchors.map(id => widget[dockPointKey(id)]), [true, false, true]);
  assert.equal(dockPointSelection(widget, anchors), "some");
});

test("all-points toggle updates every point and clears a mixed selection", () => {
  const widget = { dockPointsEnabled: true };
  initializeDockPoints(widget, anchors);
  widget.dock_left_top = false;
  assert.equal(dockPointSelection(widget, anchors), "some");
  setAllDockPoints(widget, anchors, false);
  assert.equal(dockPointSelection(widget, anchors), "none");
  setAllDockPoints(widget, anchors, true);
  assert.equal(dockPointSelection(widget, anchors), "all");
});
