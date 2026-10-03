import test from "node:test";
import assert from "node:assert/strict";
import { chartPoints, chartSeries, chartBindings, chartTimeLabel, renderPackageChart, weekSeries, WEEK_DAYS } from "../web/package-chart.js";
test("JSON key/value and pair arrays retain zero and reject malformed data", () => {
  assert.deepEqual(chartPoints('[{"year":"2008","value":0},{"year":"2009","value":7}]', { xKey: "year", time: false }), [{ x: "2008", y: 0 }, { x: "2009", y: 7 }]);
  assert.deepEqual(chartPoints("not json"), []); assert.deepEqual(chartPoints({}), []);
  assert.equal(chartPoints([[0, false], [1, ""]])[0].y, null);
});
test("dates sort before differences; missing readings break a cumulative sequence", () => {
  assert.deepEqual(chartPoints([[3, 12], [1, 5], [2, 9]], { difference: true }).map(p => p.y), [null, 4, 3]);
  assert.deepEqual(chartPoints([[1, 3], [2, null], [3, 8], [4, 10]], { difference: true }).map(p => p.y), [null, null, null, 2]);
  assert.equal(chartPoints([["bad date", 5], ["2026-10-03T08:00:00Z", 1]]).length, 1);
});
test("bounded series use primary entity, independent attributes, and no bound demo fallback", () => {
  const w = { entityId: "sensor.main", dataCount: 2, seriesAttribute1: "rows", seriesEntityId2: "sensor.other", seriesData1: "[[0,99]]", seriesXKey1: "year", xAxisType: "category" };
  assert.deepEqual(chartBindings(w), [{ entityId: "sensor.main", attribute: "rows" }, { entityId: "sensor.other", attribute: "" }]);
  assert.equal(chartSeries(w)[0].points.length, 0);
  assert.equal(chartSeries(w, { "sensor.main": { attributes: { rows: [{ year: 2020, value: 42 }] } } })[0].points[0].y, 42);
  assert.equal(chartBindings({ dataCount: 1000 }).length, 10);
});
test("large series retain endpoints while bounding the rendering workload", () => {
  const points = chartPoints(Array.from({ length: 2000 }, (_, i) => [i, i]));
  assert.equal(points.length, 500); assert.equal(points[0].x, 0); assert.equal(points.at(-1).x, 1999);
});
test("date format is token substitution with no executable formatter", () => {
  assert.match(chartTimeLabel(0, "YYYY MM DD HH:mm", "en"), /^\d{4} \d{2} \d{2} \d{2}:\d{2}$/);
  assert.equal(chartTimeLabel(NaN), "—"); assert.equal(chartTimeLabel(0, "<script>alert(1)</script>"), "<script>alert(1)</script>");
});
class Element { constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; this.style = {}; } append(...n) { this.children.push(...n); } setAttribute(k, v) { this.attributes[k] = String(v); } }
const doc = { createElement: t => new Element(t), createElementNS: (_, t) => new Element(t) };
const nodes = e => [e, ...e.children.flatMap(nodes)];
test("negative bars, independent axes, constant values and gaps yield finite SVG geometry", () => {
  const root = renderPackageChart({ headline: "<script>", dataCount: 2, xAxisType: "category", seriesData1: '[["a",-10],["b",0],["c",10]]', seriesType1: "bar", seriesData2: '[["a",500],["b",null],["c",500]]', seriesAxis2: "right" }, doc);
  assert.ok(nodes(root).some(n => n.tag === "rect"));
  assert.equal(nodes(root).some(n => /NaN|Infinity/.test(JSON.stringify(n.attributes))), false);
  assert.equal(nodes(root).some(n => n.tag === "script"), false);
  assert.equal(nodes(root).filter(n => n.tag === "polyline").length, 0);
});
test("extreme finite values and custom heading keys stay safe", () => {
  const root = renderPackageChart({ title: "Custom", seriesData1: '[[0,-1.7e308],[1,1.7e308]]' }, doc, {}, "en", "title");
  assert.equal(root.children[0].textContent, "Custom");
  assert.equal(nodes(root).some(n => /NaN|Infinity/.test(JSON.stringify(n.attributes))), false);
  assert.equal(chartPoints([[1, -1.7e308], [2, 1.7e308]], { difference: true })[1].y, null);
  assert.equal(chartPoints([[1e100, 2]]).length, 0);
});
test("weekly live states preserve zero, skip invalid readings and never substitute preview data", () => {
  const widget = { chartMode: "two-weeks", showWeekData: true, currentMondayEntityId: "sensor.zero", currentTuesdayEntityId: "sensor.missing", currentMondayPreview: 99, currentTuesdayPreview: 99, previousSundayEntityId: "sensor.negative", positionYAxis: "left" };
  const data = weekSeries(widget, { "sensor.zero": { state: "0" }, "sensor.negative": { state: "-3.25" } }, "en");
  assert.equal(chartBindings(widget).length, 14);
  assert.equal(data[1].points[0].y, 0); assert.equal(data[1].points[1].y, null);
  assert.equal(data[0].points[6].y, -3.25); assert.equal(data[0].axis, "left");
  assert.deepEqual(data[0].points.map(p => p.x), ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  widget.showWeekData = false;
  assert.equal(chartBindings(widget).length, 0);
  assert.equal(weekSeries(widget)[1].points[0].y, 99);
});
test("weekly preview renders fourteen separated bars, seven weekdays and fixed decimals", () => {
  const widget = { chartMode: "two-weeks", headline: "Wochen", headlineColor: "red", legendTextColor: "white", decimalPlaces: 2, unit: "kWh", positionYAxis: "right" };
  WEEK_DAYS.forEach((day, i) => { widget[`current${day}Preview`] = i + .125; widget[`previous${day}Preview`] = i + 2; });
  const root = renderPackageChart(widget, doc);
  const all = nodes(root), bars = all.filter(n => n.tag === "rect");
  assert.equal(bars.length, 14);
  assert.equal(new Set(bars.map(n => n.attributes.x)).size, 14);
  assert.equal(root.children[0].style.color, "red");
  assert.ok(all.some(n => n.tag === "title" && n.textContent.includes("0.13 kWh")));
  assert.equal(all.filter(n => n.tag === "text" && n.attributes.y === "281").length, 7);
  assert.equal(all.some(n => /NaN|Infinity/.test(JSON.stringify(n.attributes))), false);
});
