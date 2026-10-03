export function viewCount(widget) {
  const count = Number(widget.count ?? 1);
  return Number.isFinite(count) ? Math.max(0, Math.min(50, Math.trunc(count))) : 1;
}

export function viewIndex(widget, value) {
  if (value === null || value === undefined || (typeof value === "string" && !value.trim())) return -1;
  const index = value === true || ["true", "on"].includes(value) ? 1 : value === false || ["false", "off"].includes(value) ? 0 : Number(value);
  return Number.isInteger(index) && index >= 0 && index <= viewCount(widget) && widget.enabledPropertyGroups?.[`indexed-view-in-widget-8-${index}`] !== false ? index : -1;
}
