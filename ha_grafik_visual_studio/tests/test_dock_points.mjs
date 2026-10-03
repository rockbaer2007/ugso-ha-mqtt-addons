import test from "node:test";
import assert from "node:assert/strict";
import { dockPointKey, initializeDockPoints, setAllDockPoints, dockPointSelection, dockPointActive, setOutputAnchor } from "../web/dock-points.js";

const anchors = ["left-top", "left-center", "right-bottom"];

test("moving the output preserves outgoing connections and leaves inputs untouched", () => {
  const source = { id: "source", type: "sensor", dataOutputEnabled: true };
  const lines = [{ type: "svg-connection", startWidgetId: "source" }, { type: "svg-connection", endWidgetId: "source", endAnchor: "right-center" }];
  setOutputAnchor(source, lines, "top-center");
  assert.equal(lines[0].startAnchor, "top-center");
  assert.equal(lines[1].endAnchor, "right-center");
  setOutputAnchor(source, lines, "bottom-center");
  assert.equal(lines[0].startAnchor, "bottom-center");
});

test("single output is independent, directional and switches sides without leaving active outputs", () => {
  const widget = { type: "sensor", dockPointsEnabled: false, dataOutputEnabled: true, dataOutputAnchor: "top-center" };
  assert.equal(dockPointActive(widget, "top-center", "start"), true);
  assert.equal(dockPointActive(widget, "top-center", "end"), false);
  assert.equal(dockPointActive(widget, "right-center"), false);
  widget.dataOutputAnchor = "bottom-center";
  assert.equal(dockPointActive(widget, "top-center"), false);
  assert.equal(dockPointActive(widget, "bottom-center"), true);
  widget.dataOutputEnabled = false;
  assert.equal(dockPointActive(widget, "bottom-center"), false);
  widget.type = "linebox-math"; widget.dataOutputEnabled = true;
  assert.equal(dockPointActive(widget, "bottom-center"), false);
});

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
