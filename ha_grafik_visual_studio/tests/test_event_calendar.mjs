import test from "node:test";
import assert from "node:assert/strict";
import { normalizeEvents, eventSources, eventStyle, EVENT_VIEWS } from "../web/event-calendar.js";
test("HA all-day events retain exclusive end dates", () => {
  const [event] = normalizeEvents([{ summary: "Holiday", start: "2026-10-03", end: "2026-10-05" }], {}, {});
  assert.equal(event.allDay, true); assert.equal(event.start, "2026-10-03"); assert.equal(event.end, "2026-10-05");
});
test("timed and adapter formats normalize without importing URLs or HTML", () => {
  const [event] = normalizeEvents(JSON.stringify([{ event: "<img src=x onerror=alert(1)>", _date: 0, _end: 3600000, url: "javascript:bad" }]), {}, {});
  assert.equal(event.start, "1970-01-01T00:00:00.000Z"); assert.equal(event.allDay, false); assert.equal(event.url, undefined); assert.equal(event.title, "<img src=x onerror=alert(1)>");
});
test("first matching title rule wins while retaining the source stripe", () => {
  const [event] = normalizeEvents([{ title: "BIN pickup", start: "2026-10-03", color: "#FFFF00" }], { color: "#0000FF" }, { countEventColorRules: 2, eventRule0Title: "bin", eventRule0Color: "#FF0000", eventRule1Title: "pickup", eventRule1Color: "#00FF00" });
  assert.equal(event.backgroundColor, "#FF0000"); assert.equal(event.extendedProps.sourceColor, "#0000FF");
});
test("invalid lists and impossible or reversed dates report errors", () => {
  for (const input of ["bad", {}, [{ title: "x", start: "2026-02-30" }], [{ title: "x", start: "2026-02-30T10:00:00Z" }], [{ title: "x", start: "2026-10-05", end: "2026-10-03" }], [{ title: "x", start: null }]]) assert.throws(() => normalizeEvents(input, {}, {}));
});
test("adapter events with identical start/end retain default duration", () => {
  const [event] = normalizeEvents([{ event: "Holiday", _date: "2026-10-03", _end: "2026-10-03", _allDay: true }], {}, {});
  assert.equal(event.end, undefined); assert.equal(event.allDay, true);
});
test("additional sources replace the single entity and respect the count", () => {
  assert.deepEqual(eventSources({ entityId: "calendar.single" }), [{ entityId: "calendar.single", color: "", label: "" }]);
  const sources = eventSources({ entityId: "calendar.ignored", countCalendarSources: 1, calendar0EntityId: "sensor.events", calendar0Label: "Family" });
  assert.equal(sources.length, 1); assert.equal(sources[0].entityId, "sensor.events"); assert.equal(eventSources({ countCalendarSources: 999 }).length, 20);
});
test("CSS inheritance is scoped and cycle safe", () => {
  const a = { id: "a", type: "event-calendar", fcHeaderFromWidget: "b", fcHeaderFontSize: 12, fcDayFontSize: 14 }, b = { id: "b", type: "event-calendar", fcHeaderFontSize: 22 };
  assert.equal(eventStyle(a, [a, b], "fcHeader").fcHeaderFontSize, 22); assert.equal(eventStyle(a, [a, b], "fcDay").fcDayFontSize, 14);
  b.fcHeaderFromWidget = "a"; assert.equal(eventStyle(a, [a, b], "fcHeader").fcHeaderFontSize, 22);
  b.type = "calendar"; assert.equal(eventStyle(a, [a, b], "fcHeader").fcHeaderFontSize, 12);
});
test("all eight configured views map to bundled standard plugins", () => assert.equal(Object.keys(EVENT_VIEWS).length, 8));
