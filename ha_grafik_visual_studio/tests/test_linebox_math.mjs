import test from "node:test";
import assert from "node:assert/strict";
import { MATH_ANCHORS, mathBoxResult, mathBoxResults, mathCalculations, parseMathPorts, validateMathAssignments, evaluateMathExpression, mathLeadPoint } from "../web/linebox-math.js";
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

const calculation = (expression, outputs = "", extra = {}) => ({ enabled: true, mode: "expression", expression, outputs, inputEnabled: false, inputTarget: "", ...extra });

test("four calculations preserve legacy assignments and parse comma/semicolon output lists", () => {
  const legacy = box();
  const migrated = mathCalculations(legacy);
  assert.equal(migrated.length, 4);
  assert.equal(migrated[0].outputs, "G");
  assert.equal(migrated[0].expression, "A - B");
  assert.equal(migrated.filter(item => item.enabled).length, 1);
  assert.ok(migrated.every(item => item.inputEnabled === false));
  assert.deepEqual(parseMathPorts("e,F;H E"), ["E", "F", "H"]);
  assert.throws(() => parseMathPorts("EF"));
  assert.throws(() => parseMathPorts("Q"));
});

test("separate results route by outgoing port and isolate arithmetic errors", () => {
  const math = { ...box(), dock_H: true, mathRole_H: "output", dock_I: true, mathRole_I: "output", mathCalculations: [calculation("A+B", "G"), calculation("A-B", "H"), calculation("A/0", "I"), calculation("42")] };
  const widgets = [math, line("one", "A", "sensor.a"), line("two", "B", "sensor.c")];
  assert.deepEqual(mathBoxResults(math, widgets, states).results.map(result => result.value), [130, 70, null, 42]);
  for (const [port, value] of [["G", 130], ["H", 70], ["I", null]]) {
    const output = { id: `out-${port}`, type: "svg-connection", startWidgetId: "math", startAnchor: port };
    assert.equal(numericConnectionValue(output, [...widgets, output], states), value);
  }
  math.mathCalculations[0].outputs = "G;H";
  math.mathCalculations[1].outputs = "";
  assert.equal(numericConnectionValue({ id: "multi", type: "svg-connection", startWidgetId: "math", startAnchor: "H" }, widgets, states), 130);
});

test("internal reuse is opt-in, replaces external input and follows dependencies regardless of order", () => {
  const math = { ...box(), dock_C: true, mathRole_C: "input", mathCalculations: [calculation("C * 2", "G"), calculation("A + B", "", { inputTarget: "C" })] };
  const widgets = [math, line("one", "A", "sensor.a"), line("two", "B", "sensor.c")];
  assert.equal(mathBoxResults(math, widgets, states).results[0].value, null);
  math.mathCalculations[1].inputEnabled = true;
  assert.equal(mathBoxResults(math, widgets, states).results[0].value, 260);
  widgets.push(line("external", "C", "sensor.b"));
  assert.equal(mathBoxResults(math, widgets, states).results[0].value, 260);
  math.mathCalculations[1].inputEnabled = false;
  assert.equal(mathBoxResults(math, widgets, states).results[0].value, 100);
});

test("assignment validation rejects input/output conflicts, duplicate writers and internal cycles", () => {
  const math = { ...box(), dock_C: true, mathRole_C: "input", mathCalculations: [calculation("A+B", "A")] };
  assert.match(validateMathAssignments(math).errors.join(" "), /A ist kein aktiver Ausgang/);
  math.mathCalculations = [calculation("A", "G"), calculation("B", "G")];
  assert.match(validateMathAssignments(math).errors.join(" "), /mehreren Rechnungen/);
  math.mathCalculations = [calculation("A", "", { inputEnabled: true, inputTarget: "C" }), calculation("B", "", { inputEnabled: true, inputTarget: "C" })];
  assert.match(validateMathAssignments(math).errors.join(" "), /mehrere interne Ergebnisse/);
  math.mathCalculations = [calculation("C", "G", { inputEnabled: true, inputTarget: "C" })];
  assert.match(validateMathAssignments(math).errors.join(" "), /Rückkopplung/);
  assert.equal(mathBoxResults(math, [math], states).results[0].value, null);
  math.mathCalculations = [calculation("C", "", { inputEnabled: true, inputTarget: "A" }), calculation("A", "", { inputEnabled: true, inputTarget: "C" })];
  assert.match(validateMathAssignments(math).errors.join(" "), /Rückkopplung/);
});
