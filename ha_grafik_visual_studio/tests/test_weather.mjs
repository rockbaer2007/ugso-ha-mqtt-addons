import test from "node:test";
import assert from "node:assert/strict";
import { weatherBindings, weatherRows, weatherPanels } from "../web/weather-data.js";
const rows = [{ datetime: "2026-10-03T12:00:00Z", temperature: 0, templow: -5, precipitation: 0, cloud_coverage: 25, precipitation_probability: 40 }];
test("HA forecasts and JSON attributes preserve zero, missing values and provider units", () => {
  const w = { entityId: "weather.home", forecastType: "daily", weatherSource: "home-assistant", temperatureVisible: true, temperatureAxis: "left", rainVisible: true, rainAxis: "right" };
  const states = { "weather.home": { weatherForecasts: { daily: rows }, attributes: { temperature_unit: "°F", precipitation_unit: "in" } } };
  assert.equal(weatherRows(w, states)[0].rain, 0);
  const panel = weatherPanels(w, states)[0]; assert.equal(panel.series.length, 3); assert.equal(panel.series[0].unit, "°F"); assert.equal(panel.series[2].unit, "in");
  assert.equal(weatherRows(w).length, 0);
  w.weatherSource = "json"; w.forecastAttribute = "forecast";
  assert.equal(weatherRows(w, { "weather.home": { attributes: { forecast: JSON.stringify(rows) } } })[0].tempMin, -5);
});
test("unbound preview only, sorted and bounded; malformed or oversized input rejected", () => {
  const w = { forecastPreview: JSON.stringify(rows) }; assert.equal(weatherRows(w).length, 1);
  w.entityId = "sensor.missing"; assert.equal(weatherRows(w).length, 0);
  delete w.entityId; w.forecastPreview = "invalid"; assert.equal(weatherRows(w).length, 0);
  w.forecastPreview = Array.from({ length: 30 }, (_, i) => ({ datetime: i, temperature: i }));
  assert.equal(weatherRows(w).length, 5); w.forecastType = "hourly"; assert.equal(weatherRows(w).length, 24);
});
test("individual binding selects dates and accepts millisecond state strings", () => {
  const w = { weatherSource: "individual", forecastType: "daily", day1EntityId: "sensor.date", tempMax1EntityId: "sensor.temp" };
  assert.equal(weatherBindings(w).length, 30);
  assert.equal(weatherRows(w, { "sensor.date": { state: "1791028800000" }, "sensor.temp": { state: "0" } })[0].tempMax, 0);
  w.forecastType = "hourly"; assert.equal(weatherBindings(w).length, 144); assert.equal(weatherRows(w).length, 0);
});
test("unit conflicts split panels and sun fraction requires actual cloud coverage", () => {
  const w = { forecastPreview: rows, temperatureVisible: true, temperatureAxis: "left", rainVisible: true, rainAxis: "right", cloudsVisible: true, cloudsAxis: "right", chanceVisible: true, chanceAxis: "right", sunOrCloud: "sun" };
  const panels = weatherPanels(w); assert.equal(panels.length, 2);
  assert.equal(panels[1].series[0].points[0][1], 75);
  w.cloudsSeparate = true; assert.equal(weatherPanels(w).length, 3);
  w.temperatureVisible = false; w.rainVisible = false;
  assert.equal(weatherPanels(w).length, 2); // A separate first panel stays separate.
  w.temperatureVisible = true; w.rainVisible = true;
  w.forecastPreview = [{ datetime: 0, temperature: 1 }]; assert.equal(weatherPanels(w)[1].series[0].points[0][1], null);
  w.temperatureVisible = false; w.rainVisible = false; w.cloudsVisible = false; w.chanceVisible = false; assert.deepEqual(weatherPanels(w), []);
});
