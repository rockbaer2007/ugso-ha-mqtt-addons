// Independent geometric dimmer for the declarative Technic package.
const pending = new Set(), failed = new Set();
const modes = new Set(["brightness", "color_temp", "hs", "xy", "rgb", "rgbw", "rgbww", "white"]);
const percent = value => (typeof value === "number" || typeof value === "string" && value.trim() !== "") && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100 ? Number(value) : null;
export const technicLightBindings = widget => [widget.powerEntityId, widget.brightnessEntityId].filter(Boolean);
export function technicLightState(widget, states = {}, runtime = false) {
  const power = states[widget.powerEntityId], dimmer = states[widget.brightnessEntityId];
  const rawPower = widget.powerEntityId ? power?.state : runtime ? undefined : widget.powerPreview;
  const on = [true, "true", "on", 1, "1"].includes(rawPower) ? true : [false, "false", "off", 0, "0"].includes(rawPower) ? false : null;
  const isLight = /^light\.[a-z0-9_]+$/.test(widget.brightnessEntityId || "");
  const available = dimmer && ["on", "off"].includes(dimmer.state);
  const brightness = widget.brightnessEntityId ? isLight ? available ? dimmer.state === "off" ? 0 : percent(typeof dimmer.attributes?.brightness === "number" && dimmer.attributes.brightness >= 0 && dimmer.attributes.brightness <= 255 ? dimmer.attributes.brightness / 255 * 100 : undefined) : null : percent(dimmer?.state) : runtime ? null : percent(widget.brightnessPreview);
  const attrs = dimmer?.attributes || {};
  const numericWritable = /^input_number\.[a-z0-9_]+$/.test(widget.brightnessEntityId || "") && [attrs.min, attrs.max, attrs.step].every(value => typeof value === "number" && Number.isFinite(value)) && attrs.min <= 0 && attrs.max >= 100 && attrs.step > 0 && attrs.step <= 1;
  const powerReady = /^(light|switch|input_boolean)\.[a-z0-9_]+$/.test(widget.powerEntityId || "") && ["on", "off"].includes(power?.state);
  const dimmerReady = brightness !== null && (isLight ? available && Array.isArray(attrs.supported_color_modes) && attrs.supported_color_modes.some(mode => modes.has(mode)) : numericWritable);
  const busy = technicLightBindings(widget).some(id => pending.has(id));
  const writable = runtime && !widget.readOnly && !busy;
  return { on, brightness: brightness === null ? null : Math.round(brightness), busy, powerWritable: writable && powerReady && (widget.linkPowerDimmer === false || dimmerReady), brightnessWritable: writable && dimmerReady && (widget.linkPowerDimmer === false || powerReady) };
}
export function technicLightPercent(x, y) {
  const angle = (Math.atan2(y - 50, x - 50) * 180 / Math.PI - 135 + 360) % 360;
  return angle > 270 ? angle < 315 ? 100 : 0 : Math.round(angle / 270 * 100);
}
export function renderTechnicLight(widget, doc, { runtime = false, locale = "de", getStates = () => ({}), write = async () => {}, onSettled = () => {} } = {}) {
  const de = locale === "de", model = () => technicLightState(widget, getStates(), runtime);
  const root = doc.createElement("div"); root.className = "technic-light";
  const caption = doc.createElement("span"); caption.className = "technic-window-caption"; caption.textContent = widget.heading ?? "Light"; caption.title = caption.textContent;
  const dial = doc.createElement("div"); dial.className = "technic-light-dial"; dial.style.width = `${Math.min(100, Math.max(10, Number(widget.iconScale) || 80))}%`;
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", "0 0 100 100"); svg.setAttribute("aria-hidden", "true");
  const shape = (tag, attrs) => { const node = doc.createElementNS("http://www.w3.org/2000/svg", tag); for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value)); svg.append(node); return node; };
  const arc = "M21.72 78.28 A40 40 0 1 1 78.28 78.28";
  shape("path", { d: arc, fill: "none", stroke: widget.colorAUS || "#5f8f8a", "stroke-width": 6 });
  const track = shape("path", { d: arc, pathLength: 100, fill: "none", stroke: widget.colorAN || "#2ecfbf", "stroke-width": 6 });
  const thumb = shape("circle", { cx: 22, cy: 78, r: 5, fill: widget.colorBg || "#0d1820", stroke: widget.colorAN || "#2ecfbf", "stroke-width": 2 });
  const label = shape("text", { x: 50, y: 88, "text-anchor": "middle", "font-size": 12, fill: widget.colorAN || "#2ecfbf" });
  const power = doc.createElement("button"); power.type = "button"; power.className = "technic-light-power"; power.textContent = "⏻"; power.setAttribute("aria-label", `${caption.textContent}: ${de ? "Ein/Aus" : "On/Off"}`); power.setAttribute("role", "switch");
  dial.append(svg, power);
  const range = doc.createElement("input"); range.type = "range"; range.min = "0"; range.max = "100"; range.step = "1"; range.setAttribute("aria-label", `${caption.textContent}: ${de ? "Helligkeit" : "Brightness"}`);
  const status = doc.createElement("small"); status.className = "technic-window-status"; status.setAttribute("role", "status");
  if (widget.showName && widget.namePosition === "top") root.append(caption);
  root.append(dial, range);
  if (widget.showName && widget.namePosition !== "top") root.append(caption);
  root.append(status);
  const paint = value => { const angle = (135 + (value ?? 0) * 2.7) * Math.PI / 180; track.setAttribute("stroke-dasharray", `${value ?? 0} 100`); thumb.setAttribute("cx", 50 + 40 * Math.cos(angle)); thumb.setAttribute("cy", 50 + 40 * Math.sin(angle)); thumb.style.visibility = value === null ? "hidden" : "visible"; label.textContent = value === null ? "? %" : `${value} %`; range.value = String(value ?? 0); };
  const update = () => { const current = model(); paint(current.brightness); power.disabled = !current.powerWritable; power.style.color = current.on === true ? widget.colorAN || "#2ecfbf" : widget.colorAUS || "#5f8f8a"; power.setAttribute("aria-checked", String(current.on === true)); range.disabled = !current.brightnessWritable; range.setAttribute("aria-valuetext", current.brightness === null ? de ? "Unbekannt" : "Unknown" : `${current.brightness}%`); status.textContent = current.busy ? de ? "Wird übertragen …" : "Sending …" : technicLightBindings(widget).some(id => failed.has(id)) ? de ? "Aktion fehlgeschlagen. Zustand prüfen und erneut versuchen." : "Action failed. Check the state and retry." : !runtime && !technicLightBindings(widget).length ? de ? "Vorschau" : "Preview" : current.on === null || current.brightness === null ? de ? "Unbekannt" : "Unknown" : ""; };
  const submit = async (action, value) => {
    const current = model(); if (!(action === "power" ? current.powerWritable : current.brightnessWritable)) { update(); onSettled(); return; }
    const focusedRange = doc.activeElement === range;
    const ids = technicLightBindings(widget); ids.forEach(id => { failed.delete(id); pending.add(id); }); update();
    if (action === "brightness") paint(value);
    else if (widget.linkPowerDimmer !== false) paint(value ? 100 : 0);
    try { await write({ power_entity: widget.powerEntityId || "", brightness_entity: widget.brightnessEntityId || "", linked: widget.linkPowerDimmer !== false, action, value }); }
    catch { ids.forEach(id => failed.add(id)); }
    finally { ids.forEach(id => pending.delete(id)); update(); onSettled(focusedRange && (doc.activeElement === range || doc.activeElement === doc.body)); }
  };
  power.addEventListener("click", event => { event.stopPropagation(); if (model().on !== null) void submit("power", !model().on); });
  range.addEventListener("input", () => { if (model().brightnessWritable) paint(Number(range.value)); });
  range.addEventListener("change", () => { delete root.dataset.dragging; void submit("brightness", Number(range.value)); });
  range.addEventListener("pointerdown", () => { if (model().brightnessWritable) root.dataset.dragging = "true"; });
  range.addEventListener("pointerup", () => { delete root.dataset.dragging; });
  range.addEventListener("pointercancel", () => { delete root.dataset.dragging; update(); onSettled(); });
  let pointer = null, draft = null;
  const pointerValue = event => { const bounds = svg.getBoundingClientRect(), size = Math.min(bounds.width, bounds.height); return size > 0 ? technicLightPercent((event.clientX - bounds.left - (bounds.width - size) / 2) / size * 100, (event.clientY - bounds.top - (bounds.height - size) / 2) / size * 100) : null; };
  svg.addEventListener("pointerdown", event => { if (!model().brightnessWritable || event.button !== 0) return; event.preventDefault(); event.stopPropagation(); pointer = event.pointerId; root.dataset.dragging = "true"; svg.setPointerCapture(pointer); draft = pointerValue(event); paint(draft); });
  svg.addEventListener("pointermove", event => { if (pointer === event.pointerId) { draft = pointerValue(event); paint(draft); } });
  const finish = (event, commit) => { if (pointer !== event.pointerId) return; pointer = null; delete root.dataset.dragging; if (commit && draft !== null) void submit("brightness", draft); else { update(); onSettled(); } };
  svg.addEventListener("pointerup", event => finish(event, true)); svg.addEventListener("pointercancel", event => finish(event, false)); svg.addEventListener("lostpointercapture", event => finish(event, false));
  update(); return root;
}
