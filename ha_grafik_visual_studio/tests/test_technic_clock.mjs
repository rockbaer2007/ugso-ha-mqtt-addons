import test from "node:test";
import assert from "node:assert/strict";
import { technicClockText, renderTechnicClock, updateTechnicClocks } from "../web/technic-clock.js";
const date = new Date(2026, 9, 3, 0, 5, 9);
test("local time handles midnight, noon and seconds in both hour formats", () => {
  assert.equal(technicClockText({}, date).time, "00:05");
  assert.equal(technicClockText({ timeFormat: "12h", showSeconds: true }, date).time, "12:05:09 AM");
  assert.equal(technicClockText({ timeFormat: "12h" }, new Date(2026, 9, 3, 12, 5)).time, "12:05 PM");
  assert.equal(technicClockText({ timeFormat: "12h" }, new Date(2026, 9, 3, 23, 59)).time, "11:59 PM");
});
test("date ordering, separator, year and leading day zero are independent", () => {
  assert.equal(technicClockText({ weekday: "off" }, date).date, "03.10.2026");
  assert.equal(technicClockText({ weekday: "off", order: "MDY", separator: "/", leadingZeroDay: false, yearFormat: "short" }, date).date, "10/3/26");
  assert.equal(technicClockText({ weekday: "off", order: "YMD", separator: "space" }, date).date, "2026 10 03");
  assert.equal(technicClockText({}, new Date(2027, 0, 1, 0, 0)).date.endsWith("01.01.2027"), true);
});
test("all six date languages use localized month and weekday names with safe fallback", () => {
  for (const language of ["de", "en", "fr", "es", "it", "nl"]) {
    const text = technicClockText({ language, weekday: "long", monthFormat: "long", separator: "space" }, date).date;
    assert.ok(text.includes(new Intl.DateTimeFormat(language, { month: "long" }).format(date)));
    assert.ok(text.startsWith(new Intl.DateTimeFormat(language, { weekday: "long" }).format(date)));
  }
  assert.equal(technicClockText({ language: "invalid" }, date).date, technicClockText({ language: "de" }, date).date);
  assert.deepEqual(technicClockText({}, new Date(NaN)), { time: "—", date: "—" });
});
test("ticker updates only text, retains node identity and supports independent visibility", () => {
  const doc = { createElement: () => ({ style: {}, children: [], append(node) { this.children.push(node); } }), querySelectorAll: () => [root] };
  const config = { showSeconds: true, showDate: false, layout: "column", align: "right", colorBg: "#123456", borderRadius: 12 };
  const root = renderTechnicClock(config, doc, date), time = root.children[0];
  assert.equal(root.children[1].hidden, true); assert.equal(root.style.alignItems, "flex-end");
  updateTechnicClocks(doc, new Date(2026, 9, 3, 0, 5, 10));
  assert.equal(time.textContent, "00:05:10"); assert.equal(root.children[0], time);
  config.showTime = false; assert.equal(renderTechnicClock(config, doc, date).children[0].hidden, true);
});
