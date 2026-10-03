// Studio implementation: semicolon-separated HTML entries with an editor-only preview.
export function htmlListEntries(widget) {
  return String(widget.valueList || "").split(/\r?\n|;/).map((entry, index) => String(widget[`listValue${index}`] ?? entry).replaceAll("§§", ";"));
}

export function htmlListEntry(widget, liveState, editor = false) {
  const values = htmlListEntries(widget);
  const preview = widget.testIndex;
  const raw = editor && preview !== undefined && preview !== null && String(preview) !== "" ? preview : liveState;
  const index = raw === null || raw === undefined || String(raw).trim() === "" ? -1 : Number(raw);
  return { values, index: Number.isFinite(index) ? Math.trunc(index) : -1, value: Number.isFinite(index) && index >= 0 ? values[Math.trunc(index)] ?? "" : "" };
}
