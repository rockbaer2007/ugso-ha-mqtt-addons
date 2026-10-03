function openState(row) {
  if ([true, 1, "true", "on", "open"].includes(row.isOpen)) return true;
  if ([false, 0, "false", "off", "closed"].includes(row.isOpen)) return false;
  if (row.isOpen != null) return null;
  if (typeof row.icon === "string" && /_open\.svg$/.test(row.icon)) return true;
  if (typeof row.icon === "string" && /fts_window_1w\.svg$/.test(row.icon)) return false;
  return null;
}
const text = value => typeof value === "string" ? value.slice(0, 512) : "";
export function windowRows(widget, states = {}, previewKey = "windowPreview") {
  const entry = states[widget.entityId];
  let source = widget.entityId ? widget.tableAttribute ? entry?.attributes?.[widget.tableAttribute] : entry?.state : widget[previewKey];
  if (typeof source === "string") { if (source.length > 200000) return null; try { source = JSON.parse(source); } catch { return null; } }
  if (!Array.isArray(source) || source.length > 500) return null;
  if (source.some(row => !row || typeof row !== "object" || typeof row.room !== "string" || !row.room.trim())) return null;
  return source.map(row => ({ room: text(row.room), sinceText: text(row.sinceText), changed: text(row.changed), isOpen: openState(row) }));
}
export function openRoomCount(widget, states, rows) {
  if (!widget.openCountEntityId) return rows?.length && rows.every(row => row.isOpen !== null) ? rows.filter(row => row.isOpen).length : null;
  const entry = states[widget.openCountEntityId];
  const value = widget.openCountAttribute ? entry?.attributes?.[widget.openCountAttribute] : entry?.state;
  const n = typeof value === "number" || typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}
export function renderWindowOverview(widget, doc, states = {}, locale = "de", previewKey = "windowPreview") {
  const de = locale === "de", root = doc.createElement("div"); root.className = "window-overview";
  const heading = doc.createElement("strong"); heading.textContent = de ? "Fensterstatus-Übersicht" : "Window Status Overview"; heading.style.color = widget.headlineColor || "#ffffff";
  const rows = windowRows(widget, states, previewKey), count = openRoomCount(widget, states, rows);
  const status = doc.createElement("p"); status.className = "window-statusline"; status.style.color = widget.statuslineColor || "#ffffff";
  status.textContent = count === null ? de ? "Anzahl offener Räume unbekannt" : "Open room count unknown" : count === 0 ? de ? "Alle Fenster geschlossen" : "All windows closed" : `${de ? "Räume mit offenen Fenstern" : "Rooms with open windows"}: ${count}`;
  root.append(heading, status);
  const list = doc.createElement("div"); list.className = "window-room-list";
  if (!rows?.length) list.textContent = de ? "Keine Fensterliste verfügbar" : "No window list available";
  for (const row of rows || []) {
    const item = doc.createElement("div"); item.className = "window-room"; item.style.backgroundColor = widget.roomBackgroundColor || "#20282d";
    const name = doc.createElement("strong"); name.textContent = row.room;
    const change = doc.createElement("span"); change.textContent = [row.sinceText, row.changed].filter(Boolean).join(" ");
    if (row.isOpen !== null) { name.style.color = row.isOpen ? widget.roomOpenColor || "#ff0000" : widget.roomClosedColor || "#008000"; change.style.color = row.isOpen ? widget.changedOpenColor || "#ff0000" : widget.changedClosedColor || "#0000ff"; }
    const state = doc.createElement("span"); state.className = "window-room-status"; state.textContent = row.isOpen === null ? de ? "Unbekannt" : "Unknown" : row.isOpen ? de ? "Offen" : "Open" : de ? "Geschlossen" : "Closed";
    item.append(name, state, change); list.append(item);
  }
  root.append(list); return root;
}
