// Original Studio thermostat geometry, fixed HA actions and Recorder charts.
const pending = new Set(), failed = new Set();
const number = value => (typeof value === "number" || typeof value === "string" && value.trim() !== "") && Number.isFinite(Number(value)) ? Number(value) : null;
const boolean = value => [true, "true", "on", 1, "1"].includes(value) ? true : [false, "false", "off", 0, "0"].includes(value) ? false : null;
const available = entry => entry && ![undefined, null, "unknown", "unavailable"].includes(entry.state);
const grid = (value, min, step) => Math.abs((value - min) / step - Math.round((value - min) / step)) < 1e-7;
export function temperatureBindings(widget) { return [...new Set([widget.targetEntityId, widget.actualEntityId, widget.humidityEntityId, widget.actuatorEntityId, widget.coolingEntityId].filter(Boolean))]; }
export function temperatureModel(widget, states = {}, runtime = false) {
  const entry = states[widget.targetEntityId], climate = widget.targetEntityId?.startsWith("climate."), attrs = entry?.attributes || {};
  const read = (id, attribute, fallback = "") => { const item = states[id || fallback]; return available(item) ? (id || fallback)?.startsWith("climate.") ? item.attributes?.[attribute] : item.state : undefined; };
  const target = number(read(widget.targetEntityId, "temperature")), actual = number(read(widget.actualEntityId, "current_temperature", climate ? widget.targetEntityId : ""));
  const humidity = number(read(widget.humidityEntityId, "current_humidity", climate ? widget.targetEntityId : ""));
  const rawMotor = read(widget.actuatorEntityId, "hvac_action", climate ? widget.targetEntityId : "");
  const motor = ["heating", "cooling"].includes(rawMotor) ? 100 : ["idle", "off"].includes(rawMotor) ? 0 : boolean(rawMotor) !== null && number(rawMotor) === null ? boolean(rawMotor) ? 100 : 0 : number(rawMotor);
  const coolingEntry = states[widget.coolingEntityId || (climate ? widget.targetEntityId : "")];
  const cooling = available(coolingEntry) ? (widget.coolingEntityId || widget.targetEntityId)?.startsWith("climate.") ? coolingEntry.attributes?.hvac_action === "cooling" || coolingEntry.state === "cool" ? true : ["heat", "off"].includes(coolingEntry.state) || ["heating", "idle", "off"].includes(coolingEntry.attributes?.hvac_action) ? false : null : boolean(coolingEntry.state) : null;
  const configuredMin = number(widget.tempMin) ?? 15, configuredMax = number(widget.tempMax) ?? 28, step = number(widget.tempStep) ?? .5;
  const haMin = number(attrs[climate ? "min_temp" : "min"]), haMax = number(attrs[climate ? "max_temp" : "max"]), haStep = number(attrs[climate ? "target_temp_step" : "step"]) ?? (climate ? .5 : null);
  const min = haMin === null ? configuredMin : Math.max(configuredMin, haMin), limit = haMax === null ? configuredMax : Math.min(configuredMax, haMax);
  const max = step > 0 ? Number((min + Math.floor((limit - min) / step + 1e-9) * step).toFixed(6)) : limit;
  const valid = configuredMin >= -100 && configuredMax <= 200 && min < max && step > 0 && step <= max - min;
  const compatible = haMin !== null && haMax !== null && haStep > 0 && grid(min, configuredMin, step) && grid(min, haMin, haStep) && grid(step, 0, haStep);
  const supported = climate ? Number.isInteger(attrs.supported_features) && (attrs.supported_features & 1) !== 0 : /^input_number\.[a-z0-9_]+$/.test(widget.targetEntityId || "");
  return { target, actual, humidity: humidity !== null && humidity >= 0 && humidity <= 100 ? humidity : null, motor: motor !== null && motor >= 0 && motor <= 100 ? motor : null, cooling, min, max, step, configuredMin, configuredMax, busy: pending.has(widget.targetEntityId), writable: runtime && !widget.readOnly && !pending.has(widget.targetEntityId) && target !== null && valid && compatible && supported };
}
export function temperaturePointer(x, y, model) {
  const angle = (Math.atan2(y - 50, x - 50) * 180 / Math.PI - 120 + 360) % 360;
  const percent = angle > 300 ? angle < 330 ? 1 : 0 : angle / 300;
  return Number(Math.max(model.min, Math.min(model.max, model.min + Math.round(percent * (model.max - model.min) / model.step) * model.step)).toFixed(6));
}
let activeDialog, activeSurface;
export function closeTemperatureHistory() { const dialog = activeDialog; activeDialog = null; dialog?.close(); dialog?.remove(); }
export function syncTemperatureHistory(surface, ids) { if (activeDialog && (surface !== activeSurface || !ids.includes(activeDialog.dataset.widgetId))) closeTemperatureHistory(); activeSurface = surface; }
export function temperatureHistorySvg(data, widget, doc, locale = "de") {
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", "0 0 600 260"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", locale === "de" ? "Soll, Ist und Stellmotor im Verlauf" : "Target, actual and actuator history");
  const shape = (tag, attrs, text) => { const node = doc.createElementNS("http://www.w3.org/2000/svg", tag); for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value); if (text !== undefined) node.textContent = text; svg.append(node); };
  const series = data.series || {}, all = [series.target_entity, series.actual_entity].flatMap(points => (points || []).filter(p => typeof p.value === "number" && Number.isFinite(p.value)).map(p => p.value));
  if (!all.length) { shape("text", { x: 300, y: 130, fill: "#e8f4f3", "text-anchor": "middle" }, locale === "de" ? "Keine aufgezeichneten Temperaturen" : "No recorded temperatures"); return svg; }
  const low = Math.min(...all) - 1, high = Math.max(...all) + 1, x = t => 45 + (t - data.start) / Math.max(1, data.end - data.start) * 505;
  for (let i = 0; i <= 4; i++) { const y = 20 + i * 45; shape("line", { x1: 45, x2: 550, y1: y, y2: y, stroke: "#5f8f8a", opacity: .3 }); shape("text", { x: 40, y: y + 4, fill: "#c8e6e3", "font-size": 11, "text-anchor": "end" }, `${(high - i * (high - low) / 4).toFixed(1)}°`); shape("text", { x: 555, y: y + 4, fill: widget.colorVerlaufAktor || "#2ecfbf", "font-size": 11 }, `${100 - i * 25}%`); }
  for (const [key, color] of [["actuator_entity", widget.colorVerlaufAktor || "#2ecfbf"], ["target_entity", widget.colorVerlaufSoll || "#ffffff"], ["actual_entity", widget.colorVerlaufIst || "#ffb347"]]) {
    let path = "", connected = false, previous;
    for (const point of series[key] || []) { if (typeof point.value !== "number" || !Number.isFinite(point.value)) { connected = false; continue; } const y = 200 - (key === "actuator_entity" ? point.value / 100 : (point.value - low) / (high - low)) * 180; path += !connected ? `M${x(point.t)} ${y} ` : key === "actual_entity" ? `L${x(point.t)} ${y} ` : `L${x(point.t)} ${previous} L${x(point.t)} ${y} `; previous = y; connected = true; }
    if (path) shape("path", { d: path, fill: "none", stroke: color, "stroke-width": key === "actuator_entity" ? 1.5 : 2.5 });
  }
  for (let i = 0; i <= 4; i++) { const t = data.start + (data.end - data.start) * i / 4; shape("text", { x: 45 + i * 126.25, y: 225, fill: "#c8e6e3", "font-size": 10, "text-anchor": "middle" }, new Date(t).toLocaleString(locale, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })); }
  for (const [i, label, color] of [[0, locale === "de" ? "Soll" : "Target", widget.colorVerlaufSoll || "#ffffff"], [1, locale === "de" ? "Ist" : "Actual", widget.colorVerlaufIst || "#ffb347"], [2, locale === "de" ? "Stellmotor" : "Actuator", widget.colorVerlaufAktor || "#2ecfbf"]]) { shape("line", { x1: 80 + i * 170, x2: 105 + i * 170, y1: 249, y2: 249, stroke: color, "stroke-width": 3 }); shape("text", { x: 111 + i * 170, y: 253, fill: "#e8f4f3", "font-size": 12 }, label); }
  return svg;
}
export function renderTemperature(widget, doc, { runtime = false, locale = "de", getStates = () => ({}), write = async () => {}, history = async () => ({}), onSettled = () => {} } = {}) {
  const de = locale === "de", model = () => temperatureModel(widget, getStates(), runtime);
  const root = doc.createElement("div"); root.className = "technic-temperature";
  const caption = doc.createElement("span"); caption.className = "technic-window-caption"; caption.textContent = widget.heading ?? "Temperatur";
  const dial = doc.createElement("div"); dial.className = "technic-temperature-dial"; dial.style.width = `${Math.max(10, Math.min(100, Number(widget.iconScale) || 80))}%`;
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", "0 0 100 100"); svg.setAttribute("aria-hidden", "true");
  const shape = (tag, attrs) => { const node = doc.createElementNS("http://www.w3.org/2000/svg", tag); for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value); svg.append(node); return node; };
  const arc = "M30 84.64 A40 40 0 1 1 70 84.64";
  shape("path", { d: arc, fill: "none", stroke: widget.colorAUS || "#5f8f8a", "stroke-width": 5 });
  const track = shape("path", { d: arc, pathLength: 100, fill: "none", "stroke-width": 5 }), thumb = shape("circle", { r: 5, fill: "#0d1820", "stroke-width": 2 });
  const target = shape("text", { x: 50, y: 43, "text-anchor": "middle", "font-size": 19, "font-weight": "700" }), actual = shape("text", { x: 50, y: 59, "text-anchor": "middle", "font-size": 9, fill: widget.colorAUS || "#5f8f8a" }), motor = shape("text", { x: 50, y: 74, "text-anchor": "middle", "font-size": 9 });
  dial.append(svg);
  const range = doc.createElement("input"); range.type = "range"; range.setAttribute("aria-label", `${caption.textContent}: ${de ? "Soll-Temperatur" : "Target temperature"}`);
  const status = doc.createElement("small"); status.className = "technic-window-status"; status.setAttribute("role", "status");
  const paint = value => { const m = model(), p = value === null || m.max <= m.min ? 0 : Math.max(0, Math.min(1, (value - m.min) / (m.max - m.min))), color = m.cooling === true ? widget.colorKuehlen || "#4aa8ff" : widget.colorAN || "#2ecfbf", angle = (120 + p * 300) * Math.PI / 180; track.setAttribute("stroke", color); track.setAttribute("stroke-dasharray", `${p * 100} 100`); thumb.setAttribute("cx", 50 + 40 * Math.cos(angle)); thumb.setAttribute("cy", 50 + 40 * Math.sin(angle)); thumb.setAttribute("stroke", color); thumb.style.visibility = value === null ? "hidden" : "visible"; target.setAttribute("fill", color); target.textContent = value === null ? "—°" : `${value.toFixed(1)}°`; range.value = String(value ?? m.min); };
  const update = () => { const m = model(); range.min = m.min; range.max = m.max; range.step = m.step; range.disabled = !m.writable; paint(m.target); range.setAttribute("aria-valuetext", m.target === null ? de ? "Unbekannt" : "Unknown" : `${m.target}°`); actual.textContent = `${de ? "Ist" : "Actual"}: ${m.actual === null ? "—" : m.actual.toFixed(1)}°${m.humidity !== null ? ` · ${m.humidity}%` : ""}`; motor.setAttribute("fill", m.motor > 0 ? m.cooling === true ? widget.colorKuehlen || "#4aa8ff" : widget.colorAN || "#2ecfbf" : widget.colorAUS || "#5f8f8a"); motor.textContent = m.motor === null ? "—" : `${m.motor > 0 ? m.cooling === true ? "❄" : "♨" : "○"} ${m.motor}%`; status.textContent = m.busy ? de ? "Wird übertragen …" : "Sending …" : failed.has(widget.targetEntityId) ? de ? "Aktion fehlgeschlagen. Zustand prüfen." : "Action failed. Check state." : !m.writable ? de ? "Nur Anzeige" : "Display only" : ""; };
  const submit = async value => { const focusRange = doc.activeElement === range, m = model(); if (!m.writable || number(value) === null) { update(); onSettled(focusRange); return; } pending.add(widget.targetEntityId); failed.delete(widget.targetEntityId); update(); paint(value); try { await write({ entity_id: widget.targetEntityId, value, min: m.configuredMin, max: m.configuredMax, step: m.step }); } catch { failed.add(widget.targetEntityId); } finally { pending.delete(widget.targetEntityId); update(); onSettled(focusRange); } };
  range.addEventListener("input", () => { if (model().writable) paint(Number(range.value)); }); range.addEventListener("change", () => { delete root.dataset.dragging; void submit(Number(range.value)); });
  range.addEventListener("pointerdown", () => { if (model().writable) root.dataset.dragging = "true"; }); range.addEventListener("pointerup", () => { delete root.dataset.dragging; }); range.addEventListener("pointercancel", () => { delete root.dataset.dragging; update(); onSettled(); });
  let pointer = null, draft = null;
  const position = event => { const rect = svg.getBoundingClientRect(), size = Math.min(rect.width, rect.height); return size > 0 ? temperaturePointer((event.clientX - rect.left - (rect.width - size) / 2) / size * 100, (event.clientY - rect.top - (rect.height - size) / 2) / size * 100, model()) : null; };
  svg.addEventListener("pointerdown", event => { if (!model().writable || event.button !== 0) return; event.preventDefault(); event.stopPropagation(); pointer = event.pointerId; root.dataset.dragging = "true"; svg.setPointerCapture(pointer); draft = position(event); paint(draft); });
  svg.addEventListener("pointermove", event => { if (event.pointerId === pointer) { draft = position(event); paint(draft); } });
  const finish = (event, commit) => { if (event.pointerId !== pointer) return; pointer = null; delete root.dataset.dragging; if (commit && draft !== null) void submit(draft); else { update(); onSettled(); } };
  svg.addEventListener("pointerup", event => finish(event, true)); svg.addEventListener("pointercancel", event => finish(event, false)); svg.addEventListener("lostpointercapture", event => finish(event, false));
  const historyButton = doc.createElement("button"); historyButton.type = "button"; historyButton.textContent = de ? "Verlauf" : "History"; historyButton.disabled = !runtime || ![widget.targetEntityId, widget.actualEntityId, widget.actuatorEntityId].some(Boolean);
  historyButton.addEventListener("click", event => {
    event.stopPropagation(); if (historyButton.disabled) return; closeTemperatureHistory();
    const dialog = doc.createElement("dialog"); dialog.className = "technic-temperature-history"; dialog.dataset.widgetId = widget.id; activeDialog = dialog;
    const title = doc.createElement("strong"); title.textContent = `${caption.textContent} – ${de ? "Verlauf" : "History"}`;
    const controls = doc.createElement("div"), chart = doc.createElement("div"), message = doc.createElement("small"); controls.className = "technic-temperature-history-actions"; message.setAttribute("role", "status");
    let generation = 0;
    const load = async period => { const current = ++generation; for (const button of controls.children) if (button.dataset.period) button.setAttribute("aria-pressed", String(button.dataset.period === period)); message.textContent = de ? "Verlauf wird geladen …" : "Loading history …"; chart.replaceChildren(); try { const data = await history({ target_entity: widget.targetEntityId || "", actual_entity: widget.actualEntityId || (widget.targetEntityId?.startsWith("climate.") ? widget.targetEntityId : ""), actuator_entity: widget.actuatorEntityId || (widget.targetEntityId?.startsWith("climate.") ? widget.targetEntityId : ""), range: period }); if (current !== generation || activeDialog !== dialog) return; chart.replaceChildren(temperatureHistorySvg(data, widget, doc, locale)); message.textContent = de ? "Soll / Ist: ° · Stellmotor: % (rechte Achse)" : "Target / actual: ° · actuator: % (right axis)"; } catch { if (current === generation && activeDialog === dialog) message.textContent = de ? "Verlauf nicht verfügbar. HA-Recorder und Aufzeichnung prüfen." : "History unavailable. Check HA Recorder and recording."; } };
    for (const [label, period] of [["24 h", "24h"], [de ? "7 Tage" : "7 days", "7d"]]) { const button = doc.createElement("button"); button.type = "button"; button.textContent = label; button.dataset.period = period; button.addEventListener("click", () => void load(period)); controls.append(button); }
    const close = doc.createElement("button"); close.type = "button"; close.textContent = de ? "Schließen" : "Close"; close.addEventListener("click", closeTemperatureHistory); controls.append(close);
    dialog.append(title, controls, chart, message); dialog.addEventListener("close", () => { generation++; if (activeDialog === dialog) activeDialog = null; dialog.remove(); }); doc.body.append(dialog); dialog.showModal(); void load("24h");
  });
  if (widget.showName && widget.namePosition === "top") root.append(caption);
  root.append(dial, range, historyButton); if (widget.showName && widget.namePosition !== "top") root.append(caption); root.append(status); update(); return root;
}
