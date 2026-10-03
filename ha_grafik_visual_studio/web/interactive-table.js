import { calendarWeek } from "./calendar-widget.js";
export const tableCount = (value, max = 50) => Math.min(max, Math.max(0, Math.trunc(Number(value) || 0)));
const numeric = value => value !== null && value !== undefined && String(value).trim() !== "" && Number.isFinite(Number(value));
const text = value => value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
export function interactiveRows(source) {
  const parsed = typeof source === "string" ? JSON.parse(source || "[]") : source;
  if (!Array.isArray(parsed) || parsed.some(row => !row || typeof row !== "object" || Array.isArray(row))) throw new Error("Tabellendaten müssen eine JSON-Liste von Objekten sein.");
  return parsed;
}
export function tableFormula(expression, row) {
  const source = String(expression || "");
  if (source.length > 512) throw new Error("Ungültige Formel");
  const tokens = source.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[A-Za-z_][A-Za-z_0-9]*|\*\*|[()+\-*/%]|\S/gi) || [];
  let index = 0;
  const primary = () => {
    const token = tokens[index++];
    if (token === "(") { const value = sum(); if (tokens[index++] !== ")") throw new Error("Ungültige Formel"); return value; }
    if (/^(?:\d|\.)/.test(token || "") && numeric(token)) return Number(token);
    if (/^[A-Za-z_][A-Za-z_0-9]*$/.test(token || "") && Object.hasOwn(row, token) && numeric(row[token])) return Number(row[token]);
    throw new Error("Ungültige Formel");
  };
  const power = () => { const value = primary(); return tokens[index] === "**" ? (index++, value ** unary()) : value; };
  const unary = () => tokens[index] === "+" ? (index++, unary()) : tokens[index] === "-" ? (index++, -unary()) : power();
  const product = () => { let value = unary(); while (["*", "/", "%"].includes(tokens[index])) { const operator = tokens[index++], right = unary(); value = operator === "*" ? value * right : operator === "/" ? value / right : value % right; } return value; };
  const sum = () => { let value = product(); while (["+", "-"].includes(tokens[index])) { const operator = tokens[index++], right = product(); value = operator === "+" ? value + right : value - right; } return value; };
  const result = sum(); if (index !== tokens.length || !Number.isFinite(result)) throw new Error("Ungültige Formel"); return result;
}
export function interactiveColumns(widget, rows) {
  const keys = [...new Set(rows.flatMap(row => Object.keys(row)))];
  const count = tableCount(widget.countColumns);
  return Array.from({ length: count || keys.length }, (_, i) => {
    const index = i + 1, key = widget[`columnKey${index}`] || keys[i] || "";
    return { index, key, title: widget[`columnTitle${index}`] || key, hidden: widget[`columnHidden${index}`] === true, format: widget[`columnValueFormat${index}`] || "text", sortable: widget[`sortable${index}`] ?? count === 0, filterable: widget[`columnFilterable${index}`] === true };
  });
}
export function tableCellValue(widget, column, row) {
  const formula = widget[`columnFormula${column.index}`];
  if (!formula) return row[column.key];
  try { return tableFormula(formula, row); } catch { return null; }
}
export function tableDate(value) {
  if (value == null || value === "") return null;
  const date = new Date(typeof value === "number" || /^-?\d+$/.test(String(value)) ? Number(value) : value);
  return Number.isNaN(date.getTime()) ? null : date;
}
export function tableDateText(value, mode, pattern, locale) {
  const date = tableDate(value); if (!date) return "";
  if (mode !== "custom") return mode === "date" ? date.toLocaleDateString(locale) : mode === "time" ? date.toLocaleTimeString(locale) : date.toLocaleString(locale);
  const pad = (value, size = 2) => String(value).padStart(size, "0"), week = calendarWeek(date);
  const tokens = { YYYY: date.getFullYear(), YY: pad(date.getFullYear() % 100), MM: pad(date.getMonth() + 1), M: date.getMonth() + 1, DD: pad(date.getDate()), D: date.getDate(), hh: pad(date.getHours()), h: date.getHours(), mm: pad(date.getMinutes()), ss: pad(date.getSeconds()), sss: pad(date.getMilliseconds(), 3), WD: date.toLocaleDateString(locale, { weekday: "short" }), WDL: date.toLocaleDateString(locale, { weekday: "long" }), KW: pad(week), K: week };
  return String(pattern || "DD.MM.YYYY hh:mm").replace(/YYYY|WDL|sss|YY|MM|DD|hh|mm|ss|WD|KW|M|D|h|K/g, token => tokens[token]);
}
export function tableCellText(widget, column, value, locale = "de") {
  const index = column.index;
  if (value == null || value === "") return widget[`columnPlaceholder${index}`] || "";
  let result = text(value);
  if (column.format === "number") {
    if (!numeric(value)) return widget[`columnPlaceholder${index}`] || "";
    const digits = tableCount(widget[`columnNumberDecimals${index}`], 10), [whole, decimal] = Number(value).toFixed(digits).split(".");
    const separator = widget[`columnDecimalSeparator${index}`] || (1.1).toLocaleString(locale).replace(/1/g, ""), thousands = widget[`columnThousandSeparator${index}`] || "";
    result = whole.replace(/\B(?=(\d{3})+(?!\d))/g, thousands) + (decimal ? separator + decimal : "");
  } else if (column.format === "datetime") result = tableDateText(value, widget[`columnDatetimeFormat${index}`] || "datetime", widget[`columnDatetimeFormatCustom${index}`], locale) || widget[`columnPlaceholder${index}`] || "";
  return `${widget[`columnPrefix${index}`] || ""}${result}${widget[`columnSuffix${index}`] || ""}`;
}
const ipNumber = value => { const parts = String(value).split("."); return parts.length === 4 && parts.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255) ? parts.reduce((sum, part) => sum * 256 + Number(part), 0) : null; };
function compare(left, right, column) {
  if (column.format === "ip") { left = ipNumber(left); right = ipNumber(right); }
  if (column.format === "datetime") { left = tableDate(left)?.getTime(); right = tableDate(right)?.getTime(); }
  if (left == null || right == null) return left == null ? right == null ? 0 : 1 : -1;
  return numeric(left) && numeric(right) ? Number(left) - Number(right) : text(left).localeCompare(text(right), undefined, { numeric: true });
}
export function tableDefaultSort(widget) {
  const count = widget.multiSort ? tableCount(widget.countDefaultSortColumns, 20) : 0;
  return count ? Array.from({ length: count }, (_, i) => ({ key: widget[`defaultSortKey${i + 1}`], order: widget[`defaultSortDir${i + 1}`] === "desc" ? "desc" : "asc" })).filter(item => item.key) : widget.defaultSortColumn ? [{ key: widget.defaultSortColumn, order: widget.defaultSortOrder === "desc" ? "desc" : "asc" }] : [];
}
export function tableViewRows(widget, rows, columns, state) {
  let result = rows.filter(row => columns.every(column => !state.filters?.[column.key] || state.filters[column.key].has(text(tableCellValue(widget, column, row)))));
  result = result.map((row, index) => ({ row, index })).sort((a, b) => {
    for (const criterion of state.sort || tableDefaultSort(widget)) { const column = columns.find(column => column.key === criterion.key); if (!column) continue; const order = compare(tableCellValue(widget, column, a.row), tableCellValue(widget, column, b.row), column); if (order) return order * (criterion.order === "desc" ? -1 : 1); }
    return a.index - b.index;
  }).map(item => item.row);
  if (Number(widget.maxRows) > 0) result = result.slice(0, tableCount(widget.maxRows, Number.MAX_SAFE_INTEGER));
  const perPage = Math.max(1, tableCount(widget.rowsPerPage || 10, 500)), pages = Math.max(1, Math.ceil(result.length / perPage));
  state.page = Math.min(pages - 1, Math.max(0, state.page || 0));
  return { rows: widget.pagination ? result.slice(state.page * perPage, (state.page + 1) * perPage) : result, total: result.length, pages, last: result.at(-1) };
}
export function tableRowRule(widget, row, columns) {
  for (let i = 1; i <= tableCount(widget.countRowConditions, 20); i++) {
    const key = widget[`rowConditionKey${i}`], column = columns.find(column => column.key === key) || (/^\d+$/.test(String(key)) ? columns[Number(key)] : null);
    if (!column) continue;
    const value = tableCellValue(widget, column, row), expected = widget[`rowConditionValue${i}`], bothNumbers = numeric(value) && numeric(expected);
    const left = bothNumbers ? Number(value) : text(value), right = bothNumbers ? Number(expected) : text(expected);
    const operator = widget[`rowConditionOperator${i}`] || "===";
    const matches = operator === "===" || operator === "==" ? left === right : operator === "!=" ? left !== right : operator === ">" ? left > right : operator === "<" ? left < right : operator === ">=" ? left >= right : operator === "<=" ? left <= right : false;
    if (matches) return { key: column.key, background: widget[`rowConditionColor${i}`], color: widget[`rowConditionValueColor${i}`], cellColor: widget[`rowConditionColumnValueColor${i}`] };
  }
  return null;
}
export const TABLE_STYLE_GROUPS = [
  ["table", "tableStyleFromWidget", ["backgroundHeader", "backgroundOddRow", "backgroundEvenRow", "headerHeight", "columnHeight", "paginationHeight", "headerBorderWidth", "headerBorderColor", "rowBorderWidth", "rowBorderColor"]],
  ["radius", "borderRadiusStyleFromWidget", ["borderRadiusTopLeft", "borderRadiusTopRight", "borderRadiusBottomRight", "borderRadiusBottomLeft"]],
  ["border", "borderStyleFromWidget", ["borderColor", "borderSizeTop", "borderSizeBottom", "borderSizeLeft", "borderSizeRight", "borderStyle"]],
  ["shadow", "outerShadowStyleFromWidget", ["outerShadowColor", "outerShadowX", "outerShadowY", "outerShadowBlur", "outerShadowSize"]],
];
export function interactiveTableStyle(widget, widgets) {
  const result = {};
  for (const [, reference, keys] of TABLE_STYLE_GROUPS) { let source = widget; const seen = new Set([widget.id]); while (source[reference]) { const next = widgets.find(item => item.type === "interactive-table" && item.id === source[reference]); if (!next || seen.has(next.id)) break; source = next; seen.add(next.id); } for (const key of keys) result[key] = source[key]; }
  return result;
}
export function renderInteractiveTable(widget, document, context) {
  const root = document.createElement("div"), scroll = document.createElement("div"), styles = interactiveTableStyle(widget, context.widgets), state = context.state;
  root.className = "interactive-table"; scroll.className = "interactive-table-scroll";
  const px = (key, fallback = 0, negative = false) => `${Math.min(200, Math.max(negative ? -100 : 0, Number(styles[key] ?? fallback) || 0))}px`;
  root.style.borderRadius = ["TopLeft", "TopRight", "BottomRight", "BottomLeft"].map(corner => px(`borderRadius${corner}`)).join(" ");
  root.style.borderStyle = ["none", "solid", "dashed", "dotted", "double"].includes(styles.borderStyle) ? styles.borderStyle : "none";
  root.style.borderWidth = ["Top", "Right", "Bottom", "Left"].map(side => px(`borderSize${side}`)).join(" "); root.style.borderColor = styles.borderColor || "transparent";
  root.style.boxShadow = `${px("outerShadowX", 2, true)} ${px("outerShadowY", 2, true)} ${px("outerShadowBlur", 2)} ${px("outerShadowSize", 1, true)} ${styles.outerShadowColor || "#000000"}`;
  for (const [key, value] of Object.entries({ "--it-header-height": px("headerHeight", 50), "--it-row-height": px("columnHeight", 50), "--it-page-height": px("paginationHeight", 52), "--it-header-border": `${px("headerBorderWidth", 1)} solid ${styles.headerBorderColor || "#515151"}`, "--it-row-border": `${px("rowBorderWidth", 1)} solid ${styles.rowBorderColor || "#515151"}`, "--it-header-bg": styles.backgroundHeader || "var(--panel, #202426)" })) root.style.setProperty(key, value);
  const make = (tag, label) => { const element = document.createElement(tag); if (label !== undefined) element.textContent = label; return element; };
  let rows;
  try { rows = interactiveRows(context.source); } catch { root.append(make("p", context.t("Tabellendaten müssen eine JSON-Liste von Objekten sein."))); return root; }
  const columns = interactiveColumns(widget, rows), visible = columns.filter(column => !column.hidden), view = tableViewRows(widget, rows, columns, state);
  const table = make("table"); table.setAttribute("aria-label", widget.name || context.t("Tabelle"));
  if (widget.stickyHeader) table.className = "sticky-header";
  if (widget.showHead !== false) {
    const head = make("thead"), tr = make("tr");
    for (const column of visible) {
      const cell = make("th"), index = column.index, criterion = (state.sort || []).find(item => item.key === column.key);
      cell.scope = "col"; cell.style.textAlign = widget[`columnTitleAlign${index}`] || "center";
      if (Number(widget[`columnWidth${index}`]) > 0) cell.style.width = `${Number(widget[`columnWidth${index}`])}px`;
      const label = make(column.sortable ? "button" : "span", column.title + (criterion ? ` ${criterion.order === "asc" ? "↑" : "↓"}${widget.multiSort ? (state.sort.indexOf(criterion) + 1) : ""}` : ""));
      if (column.sortable) { label.type = "button"; label.disabled = !context.runtime; label.setAttribute("aria-label", `${context.t("Sortieren")}: ${column.title}`); cell.setAttribute("aria-sort", criterion ? criterion.order === "asc" ? "ascending" : "descending" : "none"); label.addEventListener("click", event => { event.stopPropagation(); const current = state.sort || [], found = current.find(item => item.key === column.key); state.sort = widget.multiSort ? current.filter(item => item.key !== column.key) : []; if (!found || found.order === "asc") state.sort.splice(widget.multiSort && found ? current.indexOf(found) : state.sort.length, 0, { key: column.key, order: found ? "desc" : "asc" }); state.page = 0; context.redraw(); }); }
      cell.append(label);
      if (column.filterable) {
        const details = make("details"), summary = make("summary", "⌕"); summary.setAttribute("aria-label", `${context.t("Filtern")}: ${column.title}`); details.className = "interactive-table-filter";
        if (!context.runtime) details.style.pointerEvents = "none";
        const options = make("div"), values = [...new Set(rows.map(row => text(tableCellValue(widget, column, row))))];
        for (const value of values) { const label = make("label"), input = make("input"); input.type = "checkbox"; input.checked = !state.filters[column.key] || state.filters[column.key].has(value); input.disabled = !context.runtime; input.addEventListener("change", event => { event.stopPropagation(); const selected = new Set(state.filters[column.key] || values); if (input.checked) selected.add(value); else selected.delete(value); state.filters[column.key] = selected; state.page = 0; context.redraw(); }); label.append(input, make("span", value || "—")); options.append(label); }
        details.open = state.openFilter === column.key;
        details.addEventListener("toggle", () => { if (details.isConnected && context.runtime) { if (details.open) state.openFilter = column.key; else if (state.openFilter === column.key) delete state.openFilter; } });
        for (const label of options.children) { const input = label.querySelector("input"), caption = label.querySelector("span"); input.setAttribute("aria-label", caption.textContent); input.addEventListener("change", () => { state.openFilter = column.key; }); }
        details.append(summary, options); cell.append(details);
      }
      tr.append(cell);
    }
    head.append(tr); table.append(head);
  }
  const body = make("tbody");
  view.rows.forEach((row, rowIndex) => {
    const tr = make("tr"), rule = tableRowRule(widget, row, columns);
    tr.style.backgroundColor = rule?.background || styles[rowIndex % 2 === 0 ? "backgroundOddRow" : "backgroundEvenRow"] || "transparent";
    if (rule?.color) tr.style.color = rule.color;
    if (widget.showSumRow && row === view.last) tr.className = "sum-row";
    for (const column of visible) {
      const cell = make("td"), index = column.index, value = tableCellValue(widget, column, row), formatted = tableCellText(widget, column, value, context.locale);
      cell.style.textAlign = widget[`columnContentAlign${index}`] || "left";
      if (Number(widget[`columnWidth${index}`]) > 0) cell.style.width = `${Number(widget[`columnWidth${index}`])}px`;
      if (rule?.key === column.key && rule.cellColor) cell.style.color = rule.cellColor;
      if (column.format === "boolean" && value != null && value !== "") { const checkbox = make("input"); checkbox.type = "checkbox"; checkbox.checked = [true, 1, "1", "true", "on"].includes(value); checkbox.disabled = true; checkbox.setAttribute("aria-label", column.title); checkbox.style.accentColor = widget[`columnBoolean${checkbox.checked ? "Checked" : "Unchecked"}Color${index}`] || "var(--accent)"; cell.append(checkbox); }
      else if (["image", "url"].includes(column.format) && context.safeUrl(text(value), column.format === "image")) { const element = make(column.format === "image" ? "img" : "a"); if (column.format === "image") { element.src = context.safeUrl(text(value), true); element.alt = column.title; element.loading = "lazy"; } else { element.href = context.safeUrl(text(value)); element.textContent = formatted; element.target = ["_blank", "_self", "_parent", "_top"].includes(widget[`columnUrlTarget${index}`]) ? widget[`columnUrlTarget${index}`] : "_blank"; element.rel = "noopener noreferrer"; if (!context.runtime) element.removeAttribute("href"); } cell.append(element); }
      else cell.textContent = formatted;
      tr.append(cell);
    }
    body.append(tr);
  });
  table.append(body); scroll.append(table); if (!view.total) scroll.append(make("p", context.t("Keine Tabellendaten"))); root.append(scroll);
  if (widget.pagination) { const footer = make("div"); footer.className = "interactive-table-pagination"; const previous = make("button", "‹"), next = make("button", "›"); previous.type = next.type = "button"; previous.setAttribute("aria-label", context.t("Vorherige Tabellenseite")); next.setAttribute("aria-label", context.t("Nächste Tabellenseite")); previous.disabled = !context.runtime || state.page === 0; next.disabled = !context.runtime || state.page >= view.pages - 1; previous.addEventListener("click", () => { state.page--; context.redraw(); }); next.addEventListener("click", () => { state.page++; context.redraw(); }); footer.append(previous, make("span", `${state.page + 1} / ${view.pages} · ${view.total} ${context.t("Zeilen")}`), next); root.append(footer); }
  return root;
}
