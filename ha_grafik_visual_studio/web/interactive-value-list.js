export function valueListItems(widget, value) {
  const text = String(widget.entityId ? value ?? "" : widget.manualText ?? "");
  const separator = String(widget.separator ?? ",").replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\r/g, "\r").replace(/\r\n/g, "\n");
  const normalized = separator.includes("\n") ? text.replace(/\r\n/g, "\n") : text;
  const items = (separator ? normalized.split(separator) : [normalized]).map(item => widget.trimItems !== false ? item.trim() : item);
  return widget.ignoreEmpty !== false ? items.filter(item => item !== "") : items;
}

export function valueListBullet(widget, index) {
  if (widget.bulletType === "number") return `${index + 1}.`;
  if (widget.bulletType === "custom") return String(widget.bulletCustom || "*");
  return ({ disc: "•", circle: "○", square: "▪", dash: "–", arrow: "›", none: "" })[widget.bulletType || "disc"] ?? "•";
}

const spacing = (value, fallback, max = 50) => `${Math.min(max, Math.max(0, Number.isFinite(Number(value)) && value !== "" ? Number(value) : fallback))}px`;

export function renderValueList(widget, doc, value) {
  const list = doc.createElement("ul"); list.className = "interactive-value-list"; list.setAttribute("role", "list");
  Object.assign(list.style, { listStyle: "none", margin: "0", padding: spacing(widget.padding, 4, 200), boxSizing: "border-box", display: "flex", flexDirection: "column", gap: spacing(widget.lineSpacing, 4), width: "100%", height: "100%", overflow: "auto", textAlign: "left" });
  for (const [index, item] of valueListItems(widget, value).entries()) {
    const row = doc.createElement("li"); Object.assign(row.style, { display: "flex", flex: "0 0 auto", alignItems: "baseline", gap: spacing(widget.bulletSpacing, 8), minHeight: "1em" });
    const bullet = valueListBullet(widget, index);
    if (bullet) { const marker = doc.createElement("span"); marker.className = "value-list-bullet"; marker.textContent = bullet; marker.setAttribute("aria-hidden", "true"); Object.assign(marker.style, { flex: "0 0 auto", whiteSpace: "pre" }); if (widget.bulletColor) marker.style.color = widget.bulletColor; row.append(marker); }
    const text = doc.createElement("span"); text.className = "value-list-text"; text.textContent = item; Object.assign(text.style, { whiteSpace: "break-spaces", overflowWrap: "anywhere", minWidth: "0" }); row.append(text); list.append(row);
  }
  return list;
}
