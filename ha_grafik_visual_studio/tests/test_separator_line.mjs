import test from "node:test";
import assert from "node:assert/strict";
import { snapSeparator, renderSeparator, clearSeparatorConnections } from "../web/separator-line.js";
import { dockPointActive, initializeDockPoints, hasSimpleOutput } from "../web/dock-points.js";

test("snapping requires explicit activation, including imported lines without the setting", () => {
  const line = { id: "h", type: "horizontal-line", x: 100, y: 200, width: 200, height: 16 };
  const peer = { id: "v", type: "vertical-line", x: 298, y: 100, width: 16, height: 300 };
  assert.equal(snapSeparator(line, [peer]).x, 100);
  assert.equal(snapSeparator({ ...line, separatorSnap: true }, [peer]).x, 106);
});
test("legacy separator dock settings cannot expose ports or carry data", () => {
  for (const type of ["horizontal-line", "vertical-line"]) {
    const line = { type, dockPointsEnabled: true, dock_right_center: true, dataOutputEnabled: true, dataInputEnabled: true, dataOutputAnchor: "right-center", separatorSnap: true };
    assert.equal(hasSimpleOutput(line), false); assert.equal(dockPointActive(line, "right-center"), false);
    initializeDockPoints(line, ["right-center"]); assert.deepEqual(line, { type, separatorSnap: true });
  }
  const number = { type: "sensor", dockPointsEnabled: true, dock_right_center: true, dataOutputEnabled: true };
  clearSeparatorConnections(number); assert.equal(dockPointActive(number, "right-center"), true);
});
test("vertical endpoints snap at arbitrary horizontal positions", () => {
  const peer = { id: "h", type: "horizontal-line", x: 50, y: 298, width: 400, height: 16 };
  for (const x of [91, 173, 317]) {
    const line = { id: "v", type: "vertical-line", x, y: 100, width: 16, height: 200, separatorSnap: true };
    assert.equal(snapSeparator(line, [peer]).y, 106);
  }
});
const horizontal = { id: "h", type: "horizontal-line", separatorSnap: true, x: 100, y: 200, width: 200, height: 16 };
const vertical = { id: "v", type: "vertical-line", separatorSnap: true, x: 298, y: 100, width: 16, height: 300 };
test("endpoint snaps anywhere along a perpendicular span", () => {
  assert.equal(snapSeparator(horizontal, [vertical]).x, 106);
  assert.equal(snapSeparator({ ...horizontal, y: 300 }, [vertical]).x, 106);
  assert.equal(snapSeparator({ ...horizontal, y: 410 }, [vertical]).x, 100);
});
test("T junction works when moving the spanning line", () => {
  const endpoint = { ...vertical, x: 200, y: 100, height: 100 };
  assert.equal(snapSeparator(horizontal, [endpoint]).y, 192);
});
test("resize snaps only its moving endpoint and preserves opposite endpoint", () => {
  const result = snapSeparator(horizontal, [vertical], "e");
  assert.equal(result.x, 100); assert.equal(result.width, 206);
  assert.equal(snapSeparator(horizontal, [vertical], "w").width, 200);
  const h = { ...horizontal, y: 298 };
  const v = { ...vertical, x: 200, y: 100, height: 200 };
  assert.equal(snapSeparator(v, [h], "s").height, 206);
});
test("disabled, parallel, distant, hidden and transformed lines do not snap", () => {
  for (const peer of [{ ...horizontal, id: "other" }, { ...vertical, x: 320 }, { ...vertical, visible: false }, { ...vertical, cssTransform: "rotate(20deg)" }]) assert.equal(snapSeparator(horizontal, [peer]).x, 100);
  assert.equal(snapSeparator({ ...horizontal, separatorSnap: false }, [vertical]).x, 100);
  assert.equal(snapSeparator({ ...horizontal, cssLeft: "10%" }, [vertical]).x, 100);
});
test("fractional centers survive and closest target wins", () => {
  assert.equal(snapSeparator(horizontal, [{ ...vertical, width: 17 }]).x, 106.5);
  assert.equal(snapSeparator(horizontal, [vertical, { ...vertical, id: "near", x: 294 }]).x, 102);
});
test("round, square and pointed rendering stays within the widget", () => {
  const doc = { createElementNS(namespaceURI, tag) { return { namespaceURI, tag, attrs: {}, style: {}, children: [], setAttribute(k, v) { this.attrs[k] = v; }, append(child) { this.children.push(child); } }; } };
  for (const w of [horizontal, vertical]) for (const ends of ["square", "round", "pointed"]) {
    const svg = renderSeparator({ ...w, separatorEnds: ends, separatorThickness: 8, separatorBorderWidth: 2 }, doc);
    const shape = svg.children[0];
    assert.equal(shape.attrs["stroke-width"], "2");
    if (ends === "pointed") for (const point of shape.attrs.points.split(" ")) { const [x, y] = point.split(",").map(Number); assert.ok(x >= 0 && y >= 0 && x <= w.width && y <= w.height); }
    else assert.equal(Number(shape.attrs.rx), ends === "round" ? 3 : 0);
  }
});
