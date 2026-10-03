import test from "node:test";
import assert from "node:assert/strict";
import { calendarDate, calendarIso, calendarValue, calendarWeek, calendarGrid, calendarDayDisabled, calendarWritable, calendarStyle, renderCalendar } from "../web/calendar-widget.js";
test("ISO dates reject impossible dates and round-trip leap days", () => {
  for (const value of ["2025-02-29", "2026-13-01", "2026-01-32", "bad", "", null, false]) assert.equal(calendarDate(value, "iso"), null);
  assert.equal(calendarIso(calendarDate("2024-02-29", "iso")), "2024-02-29");
  assert.equal(calendarValue(calendarDate("2024-02-29", "iso"), "iso"), "2024-02-29");
});
test("milliseconds retain local date and write local midnight", () => {
  const date = new Date(2026, 9, 3, 14, 15);
  assert.equal(calendarIso(calendarDate(String(date.getTime()))), "2026-10-03");
  assert.equal(calendarValue(date, "timestamp"), new Date(2026, 9, 3).getTime());
  assert.equal(calendarDate("unavailable"), null);
  assert.equal(calendarDate(0).getTime(), 0);
});
test("month grid respects week start, leap days and adjacent months", () => {
  const monday = calendarGrid(2026, 9), sunday = calendarGrid(2026, 9, "sunday");
  assert.equal(calendarIso(monday[0]), "2026-09-28"); assert.equal(calendarIso(sunday[0]), "2026-09-27");
  assert.equal(monday.length, 35); assert.equal(calendarGrid(2026, 7).length, 42);
  assert.ok(calendarGrid(2024, 1).some(date => calendarIso(date) === "2024-02-29"));
});
test("ISO weeks cross year boundaries and simple numbering honors week start", () => {
  const date = value => calendarDate(value, "iso");
  assert.equal(calendarWeek(date("2021-01-01")), 53);
  assert.equal(calendarWeek(date("2021-01-04")), 1);
  assert.equal(calendarWeek(date("2026-12-31")), 53);
  assert.equal(calendarWeek(date("2023-01-02"), "simple", "monday"), 2);
  assert.equal(calendarWeek(date("2023-01-02"), "simple", "sunday"), 1);
});
test("past and future restrictions keep today selectable", () => {
  const now = calendarDate("2026-10-03", "iso");
  assert.equal(calendarDayDisabled({disablePast:true}, calendarDate("2026-10-02", "iso"), now), true);
  assert.equal(calendarDayDisabled({disableFuture:true}, calendarDate("2026-10-04", "iso"), now), true);
  assert.equal(calendarDayDisabled({disablePast:true,disableFuture:true}, now, now), false);
});
test("writes require matching available helpers and respect read-only and attributes", () => {
  const entry = {state:"2026-10-03"};
  assert.equal(calendarWritable({entityId:"input_text.date",oidFormat:"iso"},entry),true);
  assert.equal(calendarWritable({entityId:"input_number.date",oidFormat:"timestamp"},entry),true);
  for (const w of [{entityId:"sensor.date",oidFormat:"iso"},{entityId:"input_text.date",oidFormat:"timestamp"},{entityId:"input_number.date",oidFormat:"iso"},{entityId:"input_text.date",oidFormat:"iso",readOnly:true},{entityId:"input_text.date",oidFormat:"iso",entityAttribute:"date"}]) assert.equal(calendarWritable(w,entry),false);
  assert.equal(calendarWritable({entityId:"input_text.date",oidFormat:"iso"},{state:"unavailable"}),false);
  assert.equal(calendarWritable({entityId:"input_text.date",oidFormat:"iso"},undefined),false);
});
test("style inheritance is group-local and handles cycles and invalid targets", () => {
  const a={id:"a",type:"calendar",headerFromWidget:"b",headerTextColor:"#111111",dayTextColor:"#123456"}, b={id:"b",type:"calendar",headerTextColor:"#FFFFFF"};
  assert.equal(calendarStyle(a,[a,b],"header").headerTextColor,"#FFFFFF");
  assert.equal(calendarStyle(a,[a,b],"day").dayTextColor,"#123456");
  b.headerFromWidget="a";
  assert.equal(calendarStyle(a,[a,b],"header").headerTextColor,"#111111");
  assert.equal(calendarStyle(a,[{...b,type:"text"}],"header").headerTextColor,"#111111");
});
const document = { createElement(tag) { return { tag, children: [], attrs: {}, events: {}, style: { setProperty() {} }, classList: { add() {} }, append(...nodes) { this.children.push(...nodes); }, setAttribute(key, value) { this.attrs[key] = value; }, addEventListener(key, handler) { this.events[key] = handler; } }; } };
const context = (extra = {}) => ({ runtime: true, value: "2024-02-29", entry: {state:"2024-02-29"}, widgets: [], view: {}, text: value => value, refresh() {}, ...extra });
test("runtime date clicks submit ISO or millisecond values and clear pending on failure", async () => {
  for (const format of ["iso", "timestamp"]) {
    const widget = {type:"calendar",entityId:format === "iso" ? "input_text.date" : "input_number.date",oidFormat:format};
    let submitted, refreshes = 0;
    const ctx = context({ value: calendarValue(calendarDate("2024-02-29", "iso"), format), write: async value => { submitted = value; return false; }, refresh() { refreshes++; } });
    const root = renderCalendar(widget, document, ctx), day = root.children[1].children.find(node => node.attrs["aria-label"] === "2024-02-20");
    assert.equal(day.disabled, false);
    await day.events.click({stopPropagation(){}});
    assert.equal(submitted, calendarValue(calendarDate("2024-02-20", "iso"), format));
    assert.equal(ctx.view.pending, false); assert.equal(refreshes, 2); assert.ok(ctx.view.error);
  }
});
test("editor and read-only runtime disable dates and navigation; unbound runtime stays local", async () => {
  for (const [runtime, readOnly] of [[false,false],[true,true]]) {
    const root = renderCalendar({oidFormat:"iso",readOnly}, document, context({runtime}));
    assert.equal(root.children[0].children[0].disabled, true);
    assert.ok(root.children[1].children.filter(node => node.tag === "button").every(node => node.disabled));
  }
  let writes = 0; const ctx = context({write: async () => { writes++; }});
  const root = renderCalendar({oidFormat:"iso"},document,ctx), day = root.children[1].children.find(node => node.attrs["aria-label"] === "2024-02-20");
  await day.events.click({stopPropagation(){}});
  assert.equal(ctx.view.localValue,"2024-02-20"); assert.equal(writes,0);
});
