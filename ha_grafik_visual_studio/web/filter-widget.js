export function filterEntries(widget) {
  let entries = widget.filterEntries ?? widget.items;
  if (typeof entries === "string") { try { entries = JSON.parse(entries); } catch { entries = []; } }
  if (!Array.isArray(entries)) entries = String(widget.filterOptions || "").split(/[;\n]/).map(value => ({ value: value.trim(), title: value.trim() })).filter(entry => entry.value);
  return entries.filter(entry => entry && typeof entry === "object").map(entry => ({ ...entry,
    value: String(entry.value ?? ""), title: String(entry.title ?? entry.label ?? ""),
    textColor: entry.textColor ?? entry.color ?? "", activeColor: entry.activeColor ?? "",
    isDefault: entry.isDefault ?? entry.default ?? false,
  }));
}

export function filterValues(values) {
  return [...new Set(values.flatMap(value => String(value).split(/[;,]/)).map(value => value.trim()).filter(Boolean))];
}

export function defaultFilters(widget) {
  const entries = filterEntries(widget).filter(entry => entry.isDefault && entry.value);
  return filterValues((widget.multiple ? entries : entries.slice(0, 1)).map(entry => entry.value));
}

export function filterSelected(entry, selected) {
  const values = filterValues([entry.value]);
  return values.length ? values.every(value => selected.includes(value)) : !selected.length;
}

export function chooseFilter(selected, value, multiple) {
  if (!value) return [];
  const values = filterValues([value]);
  if (!multiple) return values;
  return values.every(value => selected.includes(value)) ? selected.filter(value => !values.includes(value)) : filterValues([...selected, ...values]);
}

/** Preserve alpha when converting the RGB(A) values used in VIS2 exports. */
export function filterHex(value) {
  const color = String(value || "").trim();
  if (!color) return "";
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) {
    return (color.length < 6 ? `#${[...color.slice(1)].map(part => part + part).join("")}` : color).toUpperCase();
  }
  const match = color.match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(0?(?:\.\d+)|1(?:\.0+)?|0))?\s*\)$/i);
  if (!match || match.slice(1, 4).some(part => Number(part) > 255)) return color;
  const rgb = match.slice(1, 4).map(part => Math.round(Number(part)).toString(16).padStart(2, "0")).join("");
  const alpha = match[4] === undefined || Number(match[4]) === 1 ? "" : Math.round(Number(match[4]) * 255).toString(16).padStart(2, "0");
  return `#${rgb}${alpha}`.toUpperCase();
}
