// Independent Studio renderer, inspired by Sefina-DS Technic Widgets.
const pendingTargets = new Set();
const boolean = value => [true, 1, "on", "true", "1", "open"].includes(value) ? true : [false, 0, "off", "false", "0", "closed"].includes(value) ? false : null;
const percentage = value => value !== "" && value !== null && value !== undefined && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100 ? Number(value) : null;
const invert = (value, enabled, numeric = false) => value === null ? null : enabled ? numeric ? 100 - value : !value : value;
export const technicBindings = widget => [widget.contactEntityId, widget.coverEntityId, widget.modeEntityId].filter(Boolean);
export function technicWindowState(widget, states = {}, runtime = false) {
  const contact = widget.contactEntityId ? states[widget.contactEntityId]?.state : runtime ? undefined : widget.contactPreview;
  const cover = states[widget.coverEntityId], available = cover && ["open", "closed", "opening", "closing"].includes(cover.state);
  const rawPosition = widget.coverEntityId ? available ? cover.attributes?.current_position : undefined : runtime ? undefined : widget.positionPreview;
  const mode = widget.modeEntityId ? states[widget.modeEntityId]?.state : runtime ? undefined : widget.modePreview;
  return {
    contact: invert(boolean(contact), widget.invertContact),
    position: invert(percentage(rawPosition), widget.invertCover, true),
    manual: invert(boolean(mode), widget.invertMode),
    coverWritable: runtime && !widget.readOnly && !pendingTargets.has(widget.coverEntityId) && /^cover\.[a-z0-9_]+$/.test(widget.coverEntityId || "") && Boolean(available) && Number.isInteger(cover.attributes?.supported_features) && cover.attributes.supported_features >= 0 && (cover.attributes.supported_features & 4) !== 0,
    modeWritable: runtime && !widget.readOnly && !pendingTargets.has(widget.modeEntityId) && /^(input_boolean|switch)\.[a-z0-9_]+$/.test(widget.modeEntityId || "") && ["on", "off"].includes(mode),
  };
}
export function technicPositionTarget(widget, position) {
  const valid = typeof position === "number" ? percentage(position) : null;
  if (valid === null) throw new Error("Invalid position");
  return widget.invertCover ? 100 - valid : valid;
}
let activeDialog;
let activeSurface;
export function closeTechnicControls() { activeDialog?.close(); activeDialog?.remove(); activeDialog = null; }
export function syncTechnicControls(surface, ids) {
  if (activeDialog && (surface !== activeSurface || !ids.includes(activeDialog.dataset.widgetId))) closeTechnicControls();
  activeSurface = surface;
}
export function renderTechnicWindow(widget, doc, context = {}) {
  const { runtime = false, locale = "de", getStates = () => ({}), writePosition = async () => {}, writeMode = async () => {} } = context;
  const de = locale === "de", current = () => technicWindowState(widget, getStates(), runtime), model = current();
  const root = doc.createElement("div"); root.className = "technic-window";
  const caption = doc.createElement("span"); caption.className = "technic-window-caption"; caption.textContent = widget.heading || ""; caption.title = caption.textContent;
  if (widget.showName && widget.namePosition === "top") root.append(caption);
  const open = doc.createElement("button"); open.type = "button"; open.className = "technic-window-open";
  open.setAttribute("aria-label", widget.heading || (de ? "Fenster und Rollo" : "Window and blind"));
  open.disabled = !runtime || ![widget.coverEntityId, widget.modeEntityId].some(Boolean);
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", "0 0 120 160"); svg.setAttribute("aria-hidden", "true");
  const shape = (tag, attrs) => { const node = doc.createElementNS("http://www.w3.org/2000/svg", tag); for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value)); svg.append(node); return node; };
  const color = widget.iconColor || "#13c540";
  svg.style.width = `${Math.min(100, Math.max(10, Number(widget.iconScale) || 80))}%`;
  shape("rect", { x: 10, y: 10, width: 100, height: 135, rx: 3, fill: "#0d1820", stroke: color, "stroke-width": 3 });
  shape("rect", { x: 18, y: 18, width: 84, height: 119, fill: "#142c32", stroke: color });
  if (model.position !== null) {
    const height = 119 * (100 - model.position) / 100;
    shape("rect", { x: 18, y: 18, width: 84, height, fill: "#263d40" });
    for (let y = 24; y < 18 + height; y += 6) shape("line", { x1: 18, y1: y, x2: 102, y2: y, stroke: color, opacity: .5 });
  }
  const left = widget.handle !== "right";
  if (model.contact === true) shape("polygon", { points: left ? "102,18 102,137 66,148 66,29" : "18,18 18,137 54,148 54,29", fill: "#173942", stroke: color });
  shape("rect", { x: model.contact === true ? left ? 68 : 49 : left ? 22 : 93, y: 73, width: 5, height: 19, rx: 2, fill: color });
  if (model.contact === null) { const unknown = shape("text", { x: 60, y: 82, fill: color, "text-anchor": "middle", "font-size": 26 }); unknown.textContent = "?"; }
  if (widget.modeEntityId || !runtime) {
    shape("circle", { cx: 30, cy: 126, r: 10, fill: "#0d1820", stroke: color });
    const mode = shape("text", { x: 30, y: 130, fill: color, "text-anchor": "middle", "font-size": 12 }); mode.textContent = model.manual === null ? "?" : model.manual ? "M" : "A";
  }
  open.append(svg); root.append(open);
  if (widget.showName && widget.namePosition !== "top") root.append(caption);
  const status = doc.createElement("small"); status.className = "technic-window-status";
  status.textContent = !runtime && !technicBindings(widget).length ? de ? "Vorschau" : "Preview" : model.contact === null ? de ? "Kontakt unbekannt" : "Unknown contact" : "";
  root.append(status);
  open.addEventListener("click", event => {
    event.stopPropagation(); if (open.disabled) return;
    closeTechnicControls();
    const dialog = doc.createElement("dialog"); dialog.className = "technic-window-dialog"; dialog.dataset.widgetId = widget.id; activeDialog = dialog;
    const heading = doc.createElement("strong"); heading.textContent = widget.heading || (de ? "Fenster und Rollo" : "Window and blind");
    const close = doc.createElement("button"); close.type = "button"; close.textContent = de ? "Schließen" : "Close"; close.addEventListener("click", closeTechnicControls);
    const message = doc.createElement("small"); message.setAttribute("role", "status");
    let busy = false;
    const controls = [];
    const submit = async (kind, value) => {
      const now = current(); if (busy || !(kind === "position" ? now.coverWritable : now.modeWritable)) return;
      const target = kind === "position" ? widget.coverEntityId : widget.modeEntityId; pendingTargets.add(target);
      busy = true; controls.forEach(control => { control.disabled = true; }); message.textContent = de ? "Wird übertragen …" : "Sending …";
      try {
        if (kind === "position") await writePosition(widget.coverEntityId, technicPositionTarget(widget, value));
        else await writeMode(widget.modeEntityId, widget.invertMode ? !value : value);
        if (activeDialog === dialog) closeTechnicControls();
      } catch { message.textContent = de ? "Aktion fehlgeschlagen. Bitte erneut versuchen." : "Action failed. Please try again."; }
      finally { pendingTargets.delete(target); busy = false; controls.forEach(control => { control.disabled = !(control.dataset.kind === "position" ? current().coverWritable : current().modeWritable); }); }
    };
    dialog.append(heading);
    if (widget.coverEntityId) {
      const label = doc.createElement("label"), range = doc.createElement("input"), output = doc.createElement("output");
      label.textContent = de ? "Rolloposition (0 = geschlossen, 100 = offen)" : "Blind position (0 = closed, 100 = open)";
      range.type = "range"; range.min = "0"; range.max = "100"; range.step = "1"; range.value = String(current().position ?? 0); range.disabled = !current().coverWritable; range.dataset.kind = "position";
      range.setAttribute("aria-label", de ? "Rolloposition" : "Blind position"); output.textContent = current().position === null ? de ? "Unbekannt" : "Unknown" : `${current().position}%`;
      range.addEventListener("input", () => { output.textContent = `${range.value}%`; }); range.addEventListener("change", () => { void submit("position", Number(range.value)); });
      controls.push(range); label.append(range, output); dialog.append(label);
      const quick = doc.createElement("div"); quick.className = "technic-window-quick";
      for (const value of [0, 25, 50, 75, 100]) { const button = doc.createElement("button"); button.type = "button"; button.textContent = `${value}%`; button.disabled = !current().coverWritable; button.dataset.kind = "position"; button.addEventListener("click", () => { void submit("position", value); }); quick.append(button); controls.push(button); }
      dialog.append(quick);
    }
    if (widget.modeEntityId) {
      const mode = doc.createElement("button"); mode.type = "button"; mode.dataset.kind = "mode"; mode.disabled = !current().modeWritable || current().manual === null;
      mode.textContent = current().manual === null ? de ? "Modus unbekannt" : "Unknown mode" : current().manual ? de ? "Manuell → Automatik" : "Manual → Automatic" : de ? "Automatik → Manuell" : "Automatic → Manual";
      const desiredManual = current().manual === null ? null : !current().manual;
      mode.addEventListener("click", () => { if (desiredManual !== null && current().manual !== null) void submit("mode", desiredManual); }); controls.push(mode); dialog.append(mode);
    }
    dialog.append(message, close); dialog.addEventListener("close", () => { dialog.remove(); if (activeDialog === dialog) activeDialog = null; });
    doc.body.append(dialog); dialog.showModal();
  });
  return root;
}
