import test from "node:test";
import assert from "node:assert/strict";
import { dockPointKey, initializeDockPoints, setAllDockPoints, dockPointSelection, dockPointActive, setOutputAnchor, setInputAnchor, OUTPUT_SIDES } from "../web/dock-points.js";

test("Number and String inputs are independent and directional on all four sides", () => {
  for (const type of ["sensor", "string"]) {
    const widget = { id: "target", type, dockPointsEnabled: false, dataInputEnabled: true };
    assert.equal(dockPointActive(widget, "left-center", "end"), true);
    for (const [anchor] of OUTPUT_SIDES) {
      setInputAnchor(widget, [], anchor);
      for (const [other] of OUTPUT_SIDES) {
        assert.equal(dockPointActive(widget, other, "end"), other === anchor);
        assert.equal(dockPointActive(widget, other, "start"), false);
      }
    }
    widget.dataOutputEnabled = true;
    widget.dataOutputAnchor = widget.dataInputAnchor;
    assert.equal(dockPointActive(widget, widget.dataInputAnchor, "start"), true);
    widget.dataInputEnabled = false;
    assert.equal(dockPointActive(widget, widget.dataInputAnchor, "end"), false);
  }
});

test("moving an input follows its incoming lines without moving unrelated ports", () => {
  const widget = { id: "target", type: "sensor", dataInputEnabled: true };
  const lines = [
    { type: "svg-connection", endWidgetId: "target" },
    { type: "svg-connection", endWidgetId: "target", endAnchor: "top-center" },
    { type: "svg-connection", endWidgetId: "other", endAnchor: "left-center" },
    { type: "svg-connection", startWidgetId: "target", startAnchor: "left-center" }
  ];
  setInputAnchor(widget, lines, "bottom-center");
  assert.deepEqual(lines.map(line => line.endAnchor), ["bottom-center", "top-center", "left-center", undefined]);
  assert.equal(lines[3].startAnchor, "left-center");
  setInputAnchor(widget, lines, "invalid");
  assert.equal(widget.dataInputAnchor, "bottom-center");
  widget.dataInputEnabled = false;
  setInputAnchor(widget, lines, "right-center");
  assert.equal(lines[0].endAnchor, "bottom-center");
  assert.equal(dockPointActive({ type: "button", dataInputEnabled: true }, "left-center", "end"), false);
});

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
