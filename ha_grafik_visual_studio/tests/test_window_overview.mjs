import test from "node:test";
import assert from "node:assert/strict";
import { windowRows, openRoomCount, renderWindowOverview } from "../web/window-overview.js";
const preview = [{ room: "Living", changed: "12:30", isOpen: true }, { room: "Kitchen", isOpen: false }];
test("window JSON uses state/attribute and never bound preview fallback", () => {
  const w = { windowPreview: JSON.stringify(preview) };
  assert.equal(windowRows(w)[0].isOpen, true);
  w.entityId = "sensor.windows"; assert.equal(windowRows(w), null);
  assert.equal(windowRows(w, { "sensor.windows": { state: JSON.stringify(preview) } }).length, 2);
  w.tableAttribute = "rooms";
  assert.equal(windowRows(w, { "sensor.windows": { attributes: { rooms: preview } } })[1].isOpen, false);
  assert.equal(windowRows({ custom: preview }, {}, "custom").length, 2);
});
test("invalid input and oversized lists stay unknown", () => {
  for (const value of ["bad", {}, [null], [{ room: "" }], Array(501).fill(preview[0]), "x".repeat(200001)]) assert.equal(windowRows({ windowPreview: value }), null);
  assert.equal(openRoomCount({}, {}, []), null);
});
test("legacy icon states, explicit status and unknown status are distinguished", () => {
  const rows = windowRows({ windowPreview: [{ room: "A", icon: "/old/fts_window_1w_open.svg" }, { room: "B", icon: "/old/fts_window_1w.svg" }, { room: "C" }, { room: "D", isOpen: false, icon: "fts_window_1w_open.svg" }] });
  assert.deepEqual(rows.map(r => r.isOpen), [true, false, null, false]);
  assert.equal(openRoomCount({}, {}, rows), null);
  assert.equal(openRoomCount({}, {}, windowRows({ windowPreview: preview })), 1);
});
test("bound count preserves zero and rejects missing/invalid without deriving rows", () => {
  const w = { openCountEntityId: "sensor.count" };
  for (const value of ["0", 0, "2", 2]) assert.equal(openRoomCount(w, { "sensor.count": { state: value } }, preview), Number(value));
  for (const value of [null, true, "", "unavailable", -1, 1.5, "2x"]) assert.equal(openRoomCount(w, { "sensor.count": { state: value } }, preview), null);
  assert.equal(openRoomCount(w, {}, preview), null);
  w.openCountAttribute = "count"; assert.equal(openRoomCount(w, { "sensor.count": { attributes: { count: 3 } } }, preview), 3);
});
test("open and closed name/change colors follow their labels; strings remain text", () => {
  const doc = { createElement: tag => ({ tagName: tag, style: {}, children: [], append(...nodes) { this.children.push(...nodes); } }) };
  const w = { windowPreview: [{ ...preview[0], room: "<script>room</script>" }, preview[1]], roomOpenColor: "red", roomClosedColor: "green", changedOpenColor: "pink", changedClosedColor: "blue" };
  const root = renderWindowOverview(w, doc); const rows = root.children[2].children;
  assert.equal(rows[0].children[0].textContent, "<script>room</script>");
  assert.equal(rows[0].children[0].style.color, "red"); assert.equal(rows[1].children[0].style.color, "green");
  assert.equal(rows[0].children[2].style.color, "pink"); assert.equal(rows[1].children[2].style.color, "blue");
});
