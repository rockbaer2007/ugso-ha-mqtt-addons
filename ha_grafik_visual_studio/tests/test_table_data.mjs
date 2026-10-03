import test from "node:test";
import assert from "node:assert/strict";
import { tableRows, tableColumns, updateTableEvent } from "../web/table-data.js";

test("table metadata stays hidden, explicit columns can expose it and HTML remains data", () => {
  const rows = tableRows('[{"Title":"first","Value":1,"_Description":"Value1"},{"Title":"second","Value":2}]');
  assert.deepEqual(tableColumns({}, rows[0]).map(column => column.attribute), ["Title", "Value"]);
  assert.deepEqual(tableColumns({ maxColumns: 1, columnAttribute1: "_Description", columnTitle1: "Detail", columnWidth1: "40%" }, rows[0]), [{ attribute: "_Description", title: "Detail", width: "40%", button: false }]);
  assert.equal(tableColumns({}, { _btnAck: "OK" })[0].button, true);
  assert.throws(() => tableRows("invalid"));
});

test("events ignore initial state and duplicate renders, replace ids, and prepend only new events", () => {
  const cache = { events: [] };
  updateTableEvent(cache, '{"_id":0,"Value":1}');
  assert.deepEqual(cache.events, []);
  updateTableEvent(cache, '{"_id":1,"Value":2}');
  updateTableEvent(cache, '{"_id":1,"Value":2}');
  updateTableEvent(cache, '{"_id":2,"Value":3}', true);
  updateTableEvent(cache, '{"_id":1,"Value":4}');
  assert.deepEqual(cache.events, [{ _id: 2, Value: 3 }, { _id: 1, Value: 4 }]);
  updateTableEvent(cache, "invalid");
  assert.equal(cache.events.length, 2);
});
