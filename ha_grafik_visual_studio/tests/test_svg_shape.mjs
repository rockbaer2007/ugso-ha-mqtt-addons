import test from "node:test";
import assert from "node:assert/strict";
import { svgShapeGeometry } from "../web/svg-shape.js";
import { getWidgetDefinition } from "../web/widget-registry.js";
import "../web/widget-sets/core.js";

test("Circle accounts for its stroke and scales around the center", () => {
  const shape = svgShapeGeometry({ shape: "circle", strokeWidth: 5, rotation: 90, scaleX: 0.5, scaleY: 0 });
  assert.equal(shape.attributes.r, 47.5);
  assert.equal(shape.attributes.transform, "rotate(90) scale(0.5 0)");
  assert.equal(svgShapeGeometry({ strokeWidth: 100 }).attributes.r, 0);
});

test("Polygon choices have the correct number of vertices and remain valid at large strokes", () => {
  for (const [shape, count] of Object.entries({ triangle: 3, square: 4, pentagon: 5, hexagon: 6, octagon: 8, star: 5, custom: 12 })) {
    const points = svgShapeGeometry({ shape, pointCount: 12 }).attributes.points.split(" ").map(point => point.split(",").map(Number));
    assert.equal(points.length, count);
    assert.ok(points.every(([x, y]) => Math.abs(Math.hypot(x, y) - 45) < 0.00001));
    assert.ok(svgShapeGeometry({ shape, strokeWidth: 100 }).attributes.points.split(" ").every(point => point.split(",").every(value => Number(value) === 0)));
  }
});

test("Line rotation keeps non-scaling stroke and arrow points upwards", () => {
  const line = svgShapeGeometry({ shape: "line", rotation: 45, scaleX: 0.1 });
  assert.equal(line.attributes.transform, "rotate(45)");
  assert.equal(line.attributes["vector-effect"], "non-scaling-stroke");
  assert.equal(svgShapeGeometry({ shape: "arrow" }).attributes.points.split(" ")[0], "0,-40");
});

test("Shape defaults expose reference ranges and mandatory CSS", () => {
  const definition = getWidgetDefinition("svg-shape");
  assert.equal(definition.defaults.width, 100);
  assert.equal(definition.defaults.height, 100);
  const fields = definition.propertyGroups.find(group => group.label === "Allgemein").fields;
  assert.equal(fields.find(field => field.key === "shape").options.length, 10);
  assert.equal(fields.find(field => field.key === "strokeWidth").max, 100);
  for (const key of ["scaleX", "scaleY"]) assert.equal(fields.find(field => field.key === key).step, 0.05);
  assert.deepEqual(fields.find(field => field.key === "pointCount").showWhen, { key: "shape", value: "custom" });
  assert.deepEqual(definition.propertyGroups.filter(group => group.css && group.defaultEnabled).map(group => group.label), ["CSS Allgemein"]);
});
