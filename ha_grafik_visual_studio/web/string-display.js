export function stringEntityValue(widget, entry) {
  const attribute = String(widget.entityAttribute || "").trim();
  if (!attribute) return entry?.state;
  return entry?.attributes && Object.hasOwn(entry.attributes, attribute) ? entry.attributes[attribute] : undefined;
}

export function stringDisplayValue(widget, entry, runtime = false) {
  if (!runtime && widget.state !== undefined && widget.state !== null && String(widget.state) !== "") return widget.state;
  if (widget.entityId) return stringEntityValue(widget, entry) ?? "--";
  return runtime ? "" : widget.state ?? "";
}
