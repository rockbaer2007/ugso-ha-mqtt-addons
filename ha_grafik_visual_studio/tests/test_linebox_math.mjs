import test from "node:test";
import assert from "node:assert/strict";
import { MATH_ANCHORS, mathBoxResult, evaluateMathExpression, mathLeadPoint } from "../web/linebox-math.js";
import { numericConnectionValue, numericWidgetInput } from "../web/linebox.js";
import { getWidgetDefinition } from "../web/widget-registry.js";
import "../web/widget-sets/special.js";

const box = (id = "math") => ({ id, type: "linebox-math", dockPointsEnabled: true, dock_A: true, dock_B: true, dock_G: true, mathRole_A: "input", mathRole_B: "input", mathRole_G: "output", mathExpression: "A - B" });
const line = (id, port, entity, side = "end") => ({ id, type: "svg-connection", [`${side}WidgetId`]: "math", [`${side}Anchor`]: port, animationSource: "number", animationNumberEntityId: entity });
const states = { "sensor.a": { state: "100" }, "sensor.b": { state: "50" }, "sensor.c": { state: "30" } };

test("sixteen labelled anchors run clockwise and corners enter horizontal edges", () => {
  assert.equal(getWidgetDefinition("linebox-math").label, "SVG LineBox Math");
  assert.equal(MATH_ANCHORS.length, 16);
  assert.equal(MATH_ANCHORS.map(([id]) => id).join(""), "ABCDEFGHIJKLMNOP");
  assert.deepEqual(MATH_ANCHORS.filter(([, , x, y]) => [0, 1].includes(x) && [0, 1].includes(y)).map(([id]) => id), ["A", "E", "I", "M"]);
  for (const [id, , x, y] of MATH_ANCHORS) {
    const point = { x: x * 160, y: y * 160 };
    const lead = mathLeadPoint(box(), id, point);
    assert.equal(Math.abs(lead.x - point.x) + Math.abs(lead.y - point.y), 24);
    if (["A", "B", "C", "D", "E", "I", "J", "K", "L", "M"].includes(id)) assert.equal(lead.x, point.x);
    else assert.equal(lead.y, point.y);
  }
});

test("arithmetic has precedence, parentheses, unary signs and rejects executable syntax", () => {
  assert.equal(evaluateMathExpression("(A + B) / 2 - C * 3", { A: 100, B: 50, C: 10 }), 45);
  assert.equal(evaluateMathExpression("-a + .5 * +B", { A: 10, B: 6 }), -7);
  for (const expression of ["A/0", "A +", "A(B)", "alert(1)", "A.constructor", "A**2", "", "A + Q", "(A"]) assert.throws(() => evaluateMathExpression(expression, { A: 1 }));
  assert.throws(() => evaluateMathExpression("A / (A-A) + alert(1)", { A: 1 }, true));
  assert.throws(() => evaluateMathExpression("A + B", { A: 1 }));
});

test("multiple connections sum per dock, average counts occupied docks, signs and zero survive", () => {
  const math = box(); const widgets = [math, line("one", "A", "sensor.a"), line("two", "A", "sensor.b"), line("three", "B", "sensor.c")];
  assert.deepEqual(mathBoxResult(math, widgets, states), { value: 120, values: { A: 150, B: 30 }, error: "" });
  assert.equal(mathBoxResult({ ...math, mathMode: "average", dock_C: true, mathRole_C: "input" }, widgets, states).value, 90);
  assert.equal(mathBoxResult(math, [math, line("one", "A", "sensor.a", "start"), line("two", "B", "sensor.b")], states).value, -150);
  assert.equal(mathBoxResult({ ...math, mathExpression: "A - A" }, widgets, states).value, 0);
});

test("missing values and division by zero stop outputs rather than silently using zero", () => {
  const math = box(); const widgets = [math, line("one", "A", "sensor.a"), line("bad", "A", "sensor.missing"), line("three", "B", "sensor.c")];
  assert.equal(mathBoxResult(math, widgets, states).value, null);
  assert.match(mathBoxResult(math, widgets, states).error, /Eingang A/);
  assert.match(mathBoxResult({ ...math, mathExpression: "A / (B - B)" }, widgets.filter(item => item.id !== "bad"), states).error, /Division durch null/);
  assert.equal(mathBoxResult({ ...math, mathMode: "average" }, [math], states).value, null);
});

test("math forwards into Number and chained boxes, and cycles terminate", () => {
  const math = box();
  const output = { id: "out", type: "svg-connection", startWidgetId: "math", startAnchor: "G", endWidgetId: "number", endAnchor: "left-center" };
  const number = { id: "number", type: "sensor", numericSource: "dock", dockPointsEnabled: true, dock_left_center: true };
  const widgets = [math, line("one", "A", "sensor.a"), line("two", "B", "sensor.c"), output, number];
  assert.equal(numericConnectionValue(output, widgets, states), 70);
  assert.equal(numericWidgetInput(number, widgets, states), 70);
  const second = { ...box("second"), mathExpression: "A * 2" };
  const chain = { ...output, endWidgetId: "second", endAnchor: "A" };
  assert.equal(mathBoxResult(second, [...widgets.filter(item => item.id !== "out"), chain, second], states).value, 140);
  const cycle = { id: "cycle", type: "svg-connection", startWidgetId: "second", startAnchor: "G", endWidgetId: "math", endAnchor: "A" };
  assert.equal(mathBoxResult(math, [...widgets, chain, second, cycle], states).value, null);
});
