// Read-only status list, sharing the Studio's numeric/Boolean row semantics.
import { technicRoomRows } from "./technic-room.js";
const pixels = (value, fallback, max) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(max, Number(value))) : fallback;
export function renderTechnicStatusList(widget, doc, { states = {}, locale = "de" } = {}) {
  const root = doc.createElement("div"); root.className = "technic-status-list";
  const rows = doc.createElement("div"); rows.className = "technic-status-list-rows";
  rows.style.paddingLeft = `${pixels(widget.containerPaddingLeft, 8, 100)}px`;
  rows.style.setProperty("--status-value-offset", `${pixels(widget.valueOffset, 90, 2000)}px`);
  for (const row of technicRoomRows(widget, states, locale)) {
    const line = doc.createElement("div"), label = doc.createElement("span"), value = doc.createElement("span");
    line.className = "technic-status-list-row";
    label.textContent = row.label; label.title = row.label;
    value.textContent = row.text; value.title = row.text; value.style.color = row.color;
    line.append(label, value); rows.append(line);
  }
  root.append(rows); return root;
}
