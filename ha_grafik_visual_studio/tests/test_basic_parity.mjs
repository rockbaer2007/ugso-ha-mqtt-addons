import test from "node:test";
import assert from "node:assert/strict";
import { numberDisplay } from "../web/number-display.js";
import { basicOn, ackValue, groupVisible, basicDate, qualityClass, speechResult } from "../web/basic-behavior.js";
import { basicGroups, basicText } from "../web/basic-locales.js";
import { getWidgetSets } from "../web/widget-registry.js";
import "../web/widget-sets/core.js";

test("old number formatting survives and reference mode is explicit", () => {
  assert.equal(numberDisplay({ state: "1,5", digits: 1, decimalComma: true }).value, "1,5");
  assert.equal(numberDisplay({ state: 12345.678, automaticDigits: true, thousandsSeparator: true, decimalComma: true }).value, "12.345,678");
  assert.equal(numberDisplay({ state: 1.4, digits: 0, suffixSingular: "one", suffixPlural: "many" }).suffix, "many");
  assert.equal(numberDisplay({ numberMode: "reference", state: 1.4, digits: 0, suffixSingular: "one", suffixPlural: "many" }).suffix, "one");
  assert.equal(numberDisplay({ numberMode: "reference", state: "12 MB", automaticDigits: true }).value, "12");
});
test("boolean sentinels follow the reference rather than a threshold", () => {
  const fallback = value => value === "on";
  assert.equal(basicOn({}, "on", fallback), true);
  assert.equal(basicOn({ booleanMode: "reference", min: "10", max: "20" }, 19, fallback), false);
  assert.equal(basicOn({ booleanMode: "reference", min: "10", max: "20" }, 20, fallback), true);
  assert.equal(basicOn({ booleanMode: "reference", min: "10" }, 11, fallback), true);
  assert.equal(basicOn({ booleanMode: "reference" }, "OFF", fallback), false);
});
test("acknowledgment source cannot silently become the main entity", () => {
  const states = { "sensor.ack": { state: "off", attributes: { confirmed: true } } };
  assert.equal(ackValue({}, states, "on"), "on");
  assert.equal(ackValue({ ackMode: "entity", ackEntityId: "sensor.ack" }, states, "on"), "off");
  assert.equal(ackValue({ ackMode: "entity", ackEntityId: "sensor.ack", ackAttribute: "confirmed" }, states, "off"), true);
  assert.equal(ackValue({ ackMode: "entity", ackEntityId: "sensor.missing" }, states, "on"), undefined);
});
test("groups fail closed and quality class input stays inert", () => {
  assert.equal(groupVisible("system-admin", []), false);
  assert.equal(groupVisible("system-admin;system-users", ["system-users"]), true);
  assert.equal(groupVisible("", []), true);
  assert.deepEqual(qualityClass({ qualityEntityId: "sensor.q", qualityClassTrue: "good wrong<script> also-good" }, { "sensor.q": { state: "on" } }), ["good", "also-good"]);
});
test("localized dates support explicit formats, literal text and relative time", () => {
  const date = new Date(2026, 9, 12, 13, 4, 5, 123);
  assert.equal(basicDate(date, "DD.MM.YYYY HH:mm:ss [UTC]"), "12.10.2026 13:04:05 UTC");
  assert.equal(basicDate(date, "YY-M-D hh:mm A SSS", false, "en"), "26-10-12 01:04 PM 123");
  assert.match(basicDate(date, "auto", true, "fr", date.getTime() + 60000), /minute/);
  assert.equal(basicDate("not-a-date"), "--");
});
test("speech matches keywords without executing text", () => {
  assert.equal(speechResult("Turn Heating ON", "heating;light", "keywords"), "heating");
  assert.equal(speechResult("nothing", "heating", "keywords"), "");
  assert.equal(speechResult(" arbitrary text ", "", "text"), "arbitrary text");
});
test("DE EN FR properties keep stable technical IDs, defaults and user values", () => {
  const widgets = getWidgetSets()[0].widgets;
  assert.equal(widgets.length, 48);
  assert.ok(widgets.some(w => w.type === "speech-to-text"));
  assert.ok(widgets.some(w => w.type === "runtime-exit"));
  for (const widget of widgets) {
    const old = structuredClone(widget);
    for (const locale of ["de", "en", "fr"]) {
      const groups = basicGroups(widget.propertyGroups, { basicLocale: locale }, (group, index) => group.id || `${index}-${group.label}`, "de");
      groups.forEach((group, index) => {
        assert.equal(group.id, widget.propertyGroups[index].id || `${index}-${widget.propertyGroups[index].label}`);
        assert.deepEqual(group.fields.map(f => f.key), widget.propertyGroups[index].fields.map(f => f.key));
      });
    }
    assert.deepEqual(widget, old);
  }
  assert.equal(basicText("Bestätigungsentität", "fr"), "Entité de confirmation");
  assert.equal(basicText("Vollbild", "en"), "Fullscreen");
  const choice = basicGroups([{label:"Daten",fields:[{key:"testIndex",label:"Testwert",options:[{value:"0",label:"Ein"}]}]}],{basicLocale:"fr"},()=>"stable","de");
  assert.equal(choice[0].fields[0].options[0].label,"Ein");
});
