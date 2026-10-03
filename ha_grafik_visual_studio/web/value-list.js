// Studio implementation: semicolon-separated HTML entries with an editor-only preview.
export function htmlListEntries(widget) {
  const legacy = String(widget.valueList || "").split(/\r?\n|;/);
  const entries = widget.type === "value-list-html-style" ? Array.from({ length: styledListCount(widget) + 1 }, (_, index) => legacy[index] ?? "") : legacy;
  return entries.map((entry, index) => String(widget[`listValue${index}`] ?? entry).replaceAll("§§", ";"));
}

export function styledListCount(widget) {
  const value = Number(widget.count ?? 2);
  return Number.isFinite(value) ? Math.max(0, Math.min(50, Math.trunc(value))) : 2;
}

export function htmlListEntry(widget, liveState, editor = false) {
  const values = htmlListEntries(widget);
  const preview = widget.testIndex;
  const raw = editor && preview !== undefined && preview !== null && String(preview) !== "" ? preview : liveState;
  const mapped = widget.type === "value-list-html-style" && (raw === true || raw === "true") ? 1 : widget.type === "value-list-html-style" && (raw === false || raw === "false") ? 0 : raw;
  const index = mapped === null || mapped === undefined || String(mapped).trim() === "" ? -1 : Number(mapped);
  return { values, index: Number.isFinite(index) ? Math.trunc(index) : -1, value: Number.isFinite(index) && index >= 0 ? values[Math.trunc(index)] ?? "" : "" };
}
