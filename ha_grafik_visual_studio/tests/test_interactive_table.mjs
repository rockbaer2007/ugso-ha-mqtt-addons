import test from "node:test";
import assert from "node:assert/strict";
import { interactiveRows, interactiveColumns, tableFormula, tableCellValue, tableCellText, tableDateText, tableDefaultSort, tableViewRows, tableRowRule, interactiveTableStyle } from "../web/interactive-table.js";
import { tableEntryGroups } from "../web/widget-sets/interactive-table.js";
test("strict JSON lists and automatic columns preserve later row fields", () => {
  assert.deepEqual(interactiveRows('[{"a":1}]'), [{ a: 1 }]);
  for (const source of ['{"rows":[]}', '[1]', '[null]', 'invalid']) assert.throws(() => interactiveRows(source));
  assert.deepEqual(interactiveColumns({}, [{ a: 1 }, { b: 2 }]).map(column => column.key), ["a", "b"]);
  const columns = interactiveColumns({ countColumns: 2, columnKey1: "b", columnHidden2: true }, [{ a: 1, b: 2 }]); assert.equal(columns[0].key, "b"); assert.equal(columns[1].hidden, true);
});
test("arithmetic parser supports precedence and rejects executable expressions", () => {
  assert.equal(tableFormula("price * amount + 2 ** 3 ** 2", { price: "2.5", amount: 4 }), 522);
  assert.equal(tableFormula("-2 ** 2 + (10 % 3)", {}), -3);
  assert.equal(tableFormula("1e2 / 4", {}), 25);
  for (const formula of ["process.exit()", "a.constructor", "a[0]", "Math.random()", "1/0", "missing+1", "1+", "(2", "2;3"]) assert.throws(() => tableFormula(formula, { a: 2 }));
  assert.equal(tableCellValue({ columnFormula1: "bad()" }, { index: 1 }, {}), null);
});
test("formatting retains zero, placeholders and explicit numeric separators", () => {
  const column = { index: 1, format: "number" }, widget = { columnNumberDecimals1: 2, columnDecimalSeparator1: ",", columnThousandSeparator1: ".", columnPrefix1: "~", columnSuffix1: " W", columnPlaceholder1: "leer" };
  assert.equal(tableCellText(widget, column, 1234.5), "~1.234,50 W"); assert.equal(tableCellText(widget, column, 0), "~0,00 W"); assert.equal(tableCellText(widget, column, null), "leer");
  assert.equal(tableCellText({}, { index: 1, format: "text" }, "<script>x</script>"), "<script>x</script>");
  assert.equal(tableDateText(new Date(2026, 9, 3, 12, 30, 4, 123).getTime(), "custom", "YYYY-MM-DD hh:mm:ss.sss", "de"), "2026-10-03 12:30:04.123");
});
test("stable multi-sort, numeric and IP sorting precede row limits and pagination", () => {
  const widget = { countColumns: 2, columnKey1: "group", columnKey2: "value", pagination: true, rowsPerPage: 2, maxRows: 3 }, rows = [{ group: "b", value: 2 }, { group: "a", value: 12 }, { group: "a", value: 3 }, { group: "a", value: 3 }], columns = interactiveColumns(widget, rows), state = { sort: [{ key: "group", order: "asc" }, { key: "value", order: "desc" }], filters: {}, page: 999 };
  const view = tableViewRows(widget, rows, columns, state); assert.equal(state.page, 1); assert.equal(view.total, 3); assert.equal(view.pages, 2); assert.equal(view.rows[0], rows[3]);
  const ips = [{ ip: "10.0.0.12" }, { ip: "10.0.0.2" }], ipColumns = interactiveColumns({ columnValueFormat1: "ip" }, ips);
  assert.equal(tableViewRows({}, ips, ipColumns, { sort: [{ key: "ip", order: "asc" }] }).rows[0], ips[1]);
});
test("filter sets distinguish no selection from no filter and clamp the current page", () => {
  const rows = [{ name: "a" }, { name: "b" }], columns = interactiveColumns({}, rows), state = { filters: { name: new Set() }, page: 5 };
  assert.equal(tableViewRows({ pagination: true }, rows, columns, state).total, 0); assert.equal(state.page, 0);
  state.filters.name.add("b"); assert.deepEqual(tableViewRows({}, rows, columns, state).rows, [rows[1]]);
});
test("first matching row rule resolves column indices and numeric comparisons", () => {
  const widget = { countRowConditions: 2, rowConditionKey1: "0", rowConditionOperator1: ">=", rowConditionValue1: "20", rowConditionColor1: "#FF0000", rowConditionKey2: "temp", rowConditionOperator2: "===", rowConditionValue2: "25", rowConditionColor2: "#00FF00" }, columns = interactiveColumns({}, [{ temp: 25 }]);
  assert.equal(tableRowRule(widget, { temp: "25" }, columns).background, "#FF0000"); assert.equal(tableRowRule(widget, { temp: 10 }, columns), null);
});
test("default sort entries and dynamic groups are bounded and one-based", () => {
  assert.deepEqual(tableDefaultSort({ multiSort: true, countDefaultSortColumns: 2, defaultSortKey1: "a", defaultSortDir1: "desc", defaultSortKey2: "b" }), [{ key: "a", order: "desc" }, { key: "b", order: "asc" }]);
  const groups = tableEntryGroups({ countColumns: 1000, countRowConditions: 1000, countDefaultSortColumns: 1000 }); assert.equal(groups.length, 90); assert.equal(groups[0].label, "Spalte [1]"); assert.ok(groups[0].fields.some(field => field.key === "columnFormula1"));
});
test("per-group CSS inheritance stays type scoped and cycle safe", () => {
  const a = { id: "a", type: "interactive-table", tableStyleFromWidget: "b", borderRadiusStyleFromWidget: "c", borderSizeTop: 4 }, b = { id: "b", type: "interactive-table", headerHeight: 40, tableStyleFromWidget: "a" }, c = { id: "c", type: "interactive-table", borderRadiusTopLeft: 30 };
  const styles = interactiveTableStyle(a, [a, b, c]); assert.equal(styles.headerHeight, 40); assert.equal(styles.borderRadiusTopLeft, 30); assert.equal(styles.borderSizeTop, 4); c.type = "table"; assert.equal(interactiveTableStyle(a, [a, b, c]).borderRadiusTopLeft, undefined);
});
