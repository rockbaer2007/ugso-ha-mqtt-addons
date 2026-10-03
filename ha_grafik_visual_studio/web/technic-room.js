// Read-only room status and local Studio page overlays.
const count = widget => Math.min(10, Math.max(0, Math.trunc(Number(widget.rowCount) || 0)));
const extras = (widget, i) => String(widget[`extraEntityIds${i}`] || "").split(",").map(id => id.trim()).filter(Boolean);
const boolean = value => [true, "true", "on", 1, "1"].includes(value) ? true : [false, "false", "off", 0, "0"].includes(value) ? false : null;
const bounded = (value, fallback, min, max) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;
export function technicRoomBindings(widget) {
  return [...new Set(Array.from({ length: count(widget) }, (_, n) => [widget[`rowEntityId${n + 1}`], ...(widget[`valueType${n + 1}`] === "bool" ? extras(widget, n + 1) : [])]).flat().filter(Boolean))];
}
export function technicRoomRows(widget, states = {}, locale = "de") {
  return Array.from({ length: count(widget) }, (_, n) => {
    const i = n + 1, raw = states[widget[`rowEntityId${i}`]]?.state;
    let text = "—", color = widget[`numberColor${i}`] || "#c8e6e3";
    if (widget[`valueType${i}`] === "bool") {
      const values = [raw, ...extras(widget, i).map(id => states[id]?.state)].map(boolean);
      // Unknown inputs remain unknown instead of falsely reporting a safe state.
      const value = values.includes(null) ? null : widget[`logic${i}`] === "or" ? values.some(Boolean) : values.every(Boolean);
      if (value !== null) text = widget[`${value ? "true" : "false"}Text${i}`] || (locale === "de" ? value ? "Ein" : "Aus" : value ? "On" : "Off");
      color = widget[`${value ? "true" : "false"}Color${i}`] || "#c8e6e3";
    } else if ((typeof raw === "number" || typeof raw === "string" && raw.trim() !== "") && Number.isFinite(Number(raw))) {
      text = Number(raw).toLocaleString(locale, { minimumFractionDigits: bounded(widget[`decimals${i}`], 1, 0, 6), maximumFractionDigits: bounded(widget[`decimals${i}`], 1, 0, 6) });
      if (widget[`unit${i}`]) text += ` ${widget[`unit${i}`]}`;
    }
    return { label: widget[`rowLabel${i}`] || "", text, color };
  });
}
export function technicRoomUrl(href, project, source, target, chain = []) {
  if (!target || target === source || chain.includes(target) || chain.length >= 8) return null;
  const url = new URL(href);
  for (const key of ["tabsWidget", "tabsIndex"]) url.searchParams.delete(key);
  url.searchParams.set("mode", "runtime"); url.searchParams.set("project", project);
  url.searchParams.set("page", target); url.searchParams.set("embedded", "1");
  url.searchParams.set("chain", [...chain, source].join(","));
  return url.href;
}
let active, timer, activeSurface;
export function closeTechnicRoom() {
  clearTimeout(timer); timer = null;
  const dialog = active; active = null; dialog?.close(); dialog?.remove();
}
export function syncTechnicRoom(surface, ids) {
  if (active && (surface !== activeSurface || !ids.includes(active.dataset.widgetId))) closeTechnicRoom();
  activeSurface = surface;
}
export function renderTechnicRoom(widget, doc, context = {}) {
  const { states = {}, runtime = false, locale = "de", popupUrl = null, navigate = () => {} } = context;
  const root = doc.createElement("div"); root.className = "technic-room";
  root.style.padding = ["Top", "Right", "Bottom", "Left"].map(side => `${bounded(widget[`padding${side}`], 8, 0, 100)}px`).join(" ");
  root.style.justifyContent = ({ top: "flex-start", middle: "center", bottom: "flex-end" })[widget.nameVerticalAlign] || "flex-start";
  root.style.textAlign = ["left", "center", "right"].includes(widget.nameAlign) ? widget.nameAlign : "left";
  const name = doc.createElement("strong"); name.textContent = widget.roomName || "";
  name.style.color = widget.nameColor || "#e8f4f3"; name.style.fontSize = `${bounded(widget.nameFontSize, 14, 8, 100)}px`; name.style.fontWeight = widget.nameBold ? "700" : "400";
  const rows = doc.createElement("div"); rows.className = "technic-room-rows";
  rows.style.flexDirection = widget.horizontalLayout ? "row" : "column";
  rows.style.gap = `${widget.horizontalLayout ? bounded(widget.rowGap, 12, 0, 100) : 4}px`;
  rows.style.fontSize = `${bounded(widget.rowFontSize, 13, 8, 100)}px`;
  technicRoomRows(widget, states, locale).forEach((row, i) => {
    if (widget.horizontalLayout && i && widget.rowSeparator) { const separator = doc.createElement("span"); separator.textContent = widget.rowSeparator; rows.append(separator); }
    const line = doc.createElement("span"), label = doc.createElement("span"), value = doc.createElement("span");
    line.className = "technic-room-row"; label.textContent = row.label ? `${row.label}: ` : ""; label.style.color = widget.rowLabelColor || "#c8e6e3"; value.textContent = row.text; value.style.color = row.color;
    line.append(label, value); rows.append(line);
  });
  root.append(name, rows);
  if (runtime && popupUrl) {
    root.setAttribute("role", "button"); root.tabIndex = 0; root.setAttribute("aria-label", widget.roomName || (locale === "de" ? "Raum öffnen" : "Open room"));
    const open = () => {
      if (widget.clickMode === "switchView") { navigate(); return; }
      closeTechnicRoom();
      const dialog = doc.createElement("dialog"); dialog.className = "technic-room-dialog"; dialog.dataset.widgetId = widget.id; active = dialog;
      Object.assign(dialog.style, { width: `${bounded(widget.popupWidth, 800, 160, 3000)}px`, height: `${bounded(widget.popupHeight, 600, 100, 3000)}px`, backgroundColor: widget.popupBackgroundColor || "#0d1820", border: `${bounded(widget.popupBorderWidth, 1, 0, 20)}px solid ${widget.popupBorderColor || "#2ecfbf"}`, borderRadius: `${bounded(widget.popupBorderRadius, 8, 0, 100)}px` });
      if (widget.popupUseOffset) Object.assign(dialog.style, { margin: "0", left: `clamp(0px, ${bounded(widget.popupOffsetX, 0, 0, 10000)}px, max(0px, calc(100vw - ${bounded(widget.popupWidth, 800, 160, 3000)}px)))`, top: `clamp(0px, ${bounded(widget.popupOffsetY, 0, 0, 10000)}px, max(0px, calc(100vh - ${bounded(widget.popupHeight, 600, 100, 3000)}px)))` });
      if (widget.showCloseButton !== false) { const close = doc.createElement("button"); close.type = "button"; close.textContent = locale === "de" ? "Schließen" : "Close"; close.addEventListener("click", closeTechnicRoom); dialog.append(close); }
      const frame = doc.createElement("iframe"); frame.src = popupUrl; frame.title = widget.roomName || (locale === "de" ? "Raumseite" : "Room page"); dialog.append(frame);
      dialog.addEventListener("click", event => { if (widget.closeOnOutsideClick === false || event.target !== dialog) return; const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeTechnicRoom(); });
      dialog.addEventListener("close", () => { if (active === dialog) { active = null; clearTimeout(timer); timer = null; } dialog.remove(); });
      doc.body.append(dialog); dialog.showModal();
      if (Number(widget.autoCloseSeconds) > 0) timer = setTimeout(closeTechnicRoom, bounded(widget.autoCloseSeconds, 0, 0, 86400) * 1000);
    };
    root.addEventListener("click", event => { event.stopPropagation(); open(); });
    root.addEventListener("keydown", event => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); event.stopPropagation(); open(); } });
  }
  return root;
}
