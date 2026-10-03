/** Table data and metadata are kept separate from visible columns. */
export function tableRows(source) {
  const parsed = typeof source === "string" ? JSON.parse(source || "[]") : source;
  const rows = Array.isArray(parsed) ? parsed : parsed?.rows;
  return Array.isArray(rows) ? rows.filter(row => row && typeof row === "object" && !Array.isArray(row)) : [];
}

export function tableColumns(widget, row = {}) {
  const columns = [];
  let index = 1;
  for (const key of Object.keys(row)) {
    if (key.startsWith("jQuery") || typeof row[key] === "function") continue;
    const override = widget[`columnAttribute${index}`];
    const attribute = override || key;
    if (attribute.startsWith("_") && !attribute.startsWith("_btn") && !override) continue;
    if (!(Number(widget.maxColumns) > 0) || index <= Number(widget.maxColumns)) {
      columns.push({ attribute, button: attribute.startsWith("_btn"), title: widget[`columnTitle${index}`] || (attribute.startsWith("_btn") ? "" : attribute), width: widget[`columnWidth${index}`] || "" });
    }
    index++;
  }
  return columns;
}

export function updateTableEvent(cache, source, first = false) {
  const signature = typeof source === "string" ? source : JSON.stringify(source);
  if (!cache.initialized) { cache.initialized = true; cache.last = signature; return; }
  if (!source || cache.last === signature) return;
  cache.last = signature;
  let row;
  try { row = typeof source === "string" ? JSON.parse(source) : source; } catch { return; }
  if (!row || typeof row !== "object" || Array.isArray(row)) return;
  const index = row._id === undefined ? -1 : cache.events.findIndex(item => item._id === row._id);
  if (index >= 0) cache.events[index] = row;
  else if (first) cache.events.unshift(row);
  else cache.events.push(row);
}
