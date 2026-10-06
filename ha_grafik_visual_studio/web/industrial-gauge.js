import { radialArc, radialPoint } from "./radial-slider.js";
import { finite } from "./gauges.js";

export function industrialDomain(widget) {
  const min = finite(widget.minValue) ?? -20, max = finite(widget.maxValue) ?? 30;
  const step = finite(widget.step) ?? 1, division = finite(widget.scaleDivision) ?? 5;
  return { min, max, step, division, valid: max > min && step > 0 && division > 0 && Number.isFinite(max - min) };
}
export function industrialModel(widget, states = {}, input) {
  const domain = industrialDomain(widget), gauge = Boolean(widget.entityId || widget.dataInputEnabled === true);
  const value = finite(widget.dataInputEnabled === true ? input : widget.entityId ? states[widget.entityId]?.state : widget.state);
  return { ...domain, gauge, value, fraction: value == null || !domain.valid ? 0 : Math.max(0, Math.min(1, (value - domain.min) / (domain.max - domain.min))) };
}
export function industrialTicks(widget) {
  const { min, max, division, valid } = industrialDomain(widget);
  if (!valid || (max - min) / division > 500) return [];
  const ticks = [];
  for (let n = 0; n <= Math.floor((max - min) / division + 1e-9); n++) ticks.push(Number((min + n * division).toPrecision(12)));
  if (ticks.at(-1) !== max) ticks.push(max);
  if (min < 0 && max > 0 && !ticks.includes(0)) ticks.push(0);
  return ticks.sort((a, b) => a - b);
}
export function industrialBands(widget) {
  const { min, max, valid } = industrialDomain(widget);
  if (!valid) return [];
  const count = Math.min(8, Math.max(1, Math.trunc(finite(widget.bandCount) ?? 4)));
  const result = []; let from = min;
  for (let n = 1; n <= count; n++) {
    const to = n === count ? max : finite(widget[`bandEnd${n}`]);
    const color = widget[`bandColor${n}`];
    if (to == null || to <= from || to > max || !/^#[0-9a-f]{6}$/i.test(color || "")) return [];
    result.push({ from, to, color }); from = to;
  }
  return result;
}
export function industrialQuantize(widget, value) {
  const { min, max, step, valid } = industrialDomain(widget);
  if (!valid || finite(value) == null) return null;
  return Math.min(max, Math.max(min, Number((min + Math.round((value - min) / step) * step).toPrecision(12))));
}
export function industrialPointerValue(widget, angle, previous) {
  const { min, max, valid } = industrialDomain(widget);
  if (!valid) return null;
  const offset = ((angle - 225) % 360 + 360) % 360;
  // In the bottom gap retain the previously reached endpoint; never wrap across it.
  const fraction = offset > 270 ? (finite(previous) == null ? (offset < 315 ? 1 : 0) : (previous - min) / (max - min) >= .5 ? 1 : 0) : offset / 270;
  return industrialQuantize(widget, min + fraction * (max - min));
}

export function renderIndustrialGauge(widget, doc, context = {}) {
  const root = doc.createElement("div"); root.className = "industrial-gauge";
  const model = industrialModel(widget, context.states, context.inputValue);
  const unit = String(widget.unit || (widget.dataInputEnabled !== true ? context.states?.[widget.entityId]?.attributes?.unit_of_measurement : "") || "");
  const enabled = Boolean(context.runtime && !model.gauge && model.valid);
  root.classList.toggle("industrial-housing", widget.industrialStyle !== false);
  root.style.borderRadius = `${Math.max(0, Math.min(200, finite(widget.radius) ?? 4))}px`;
  root.setAttribute("role", enabled ? "slider" : "img"); root.setAttribute("aria-label", widget.heading || "Gauge/Poti");
  root.tabIndex = enabled ? 0 : -1; root.setAttribute("aria-disabled", String(!enabled));
  root.setAttribute("aria-valuemin", model.min); root.setAttribute("aria-valuemax", model.max);
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", "0 0 128 128"); svg.setAttribute("aria-hidden", "true"); root.append(svg);
  const shape = (name, attrs) => { const node = doc.createElementNS("http://www.w3.org/2000/svg", name); for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value)); svg.append(node); return node; };
  if (widget.industrialStyle !== false) for (const [x, y] of [[10, 10], [118, 10], [10, 118], [118, 118]]) {
    shape("circle", { cx: x, cy: y, r: 4, fill: "#92999d", stroke: "#11181c", "stroke-width": 1 });
    shape("path", { d: `M${x - 2},${y - 2}L${x + 2},${y + 2}M${x - 2},${y + 2}L${x + 2},${y - 2}`, stroke: "#30383c", "stroke-width": 1 });
  }
  shape("path", { d: radialArc(64, 45, 225, 270), fill: "none", stroke: "#526069", "stroke-width": 6 });
  const bands = industrialBands(widget), ticks = industrialTicks(widget);
  if (widget.scaleMode === "ring" && model.valid) for (const band of bands) shape("path", { d: radialArc(64, 45, 225 + (band.from - model.min) / (model.max - model.min) * 270, (band.to - band.from) / (model.max - model.min) * 270), fill: "none", stroke: band.color, "stroke-width": 6 });
  if (widget.scaleMode !== "ring") for (const tick of ticks) {
    const angle = 225 + (tick - model.min) / (model.max - model.min) * 270;
    const a = radialPoint(64, tick === 0 ? 35 : 39, angle), b = radialPoint(64, 49, angle);
    shape("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: widget.scaleColor || "#e1e7e9", "stroke-width": tick === 0 ? 2.5 : 1.2 });
  }
  if (!model.gauge) shape("circle", { cx: 64, cy: 64, r: 29, fill: "#303a40", stroke: "#7f8a90", "stroke-width": 2 });
  const pointer = shape("polygon", { points: "64,23 59,34 69,34", fill: widget.pointerColor || "#f2f5f6" });
  const displaySize = Math.max(1, Math.min(finite(widget.width) ?? 64, finite(widget.height) ?? 64) - (widget.industrialStyle !== false ? 4 : 0));
  const fontSize = Math.max(6, Math.min(72, finite(widget.valueFontSize) ?? 12)) * 128 / displaySize;
  const valueColor = /^#[0-9a-f]{6}$/i.test(widget.valueColor || "") ? widget.valueColor : "#dce5e9";
  const output = shape("text", { x: 64, y: widget.valuePosition === "center" ? 64 : 110, "dominant-baseline": "middle", "text-anchor": "middle", fill: valueColor, "font-size": fontSize });
  const update = value => {
    root.dataset.value = value == null ? "" : String(value);
    pointer.style.display = value == null || !model.valid ? "none" : "";
    pointer.setAttribute("transform", `rotate(${225 + (value == null || !model.valid ? 0 : Math.max(0, Math.min(1, (value - model.min) / (model.max - model.min))) * 270)} 64 64)`);
    if (value == null) root.removeAttribute("aria-valuenow"); else root.setAttribute("aria-valuenow", value);
    const error = !model.valid ? "Ungültige Skala" : widget.scaleMode === "ring" && !bands.length ? "Farbbereiche prüfen" : widget.scaleMode !== "ring" && !ticks.length ? "Teilung zu klein" : value == null ? "Kein Eingangswert" : "";
    const reading = value == null ? "—" : `${Number(value.toFixed(3))}${unit ? ` ${unit}` : ""}`;
    root.title = error ? `${error}${value == null ? "" : ` · ${reading}`}` : reading;
    root.setAttribute("aria-valuetext", root.title);
    output.textContent = widget.showValue === true ? reading : value == null ? "—" : "";
    root.classList.toggle("is-invalid", Boolean(error));
  };
  let origin = null, changed = false;
  const input = value => { if (value == null) return; changed ||= root.dataset.value !== String(value); update(value); context.onInput?.(value); if (widget.outputMode === "continuous") context.onCommit?.(value); };
  const fromPointer = event => {
    const box = svg.getBoundingClientRect(), x = (event.clientX - box.left) / box.width * 128 - 64, y = (event.clientY - box.top) / box.height * 128 - 64;
    if (Math.hypot(x, y) < 10) return;
    input(industrialPointerValue(widget, Math.atan2(x, -y) * 180 / Math.PI, finite(root.dataset.value)));
  };
  root.addEventListener("pointerdown", event => { if (!enabled || event.button !== 0 || root.dataset.dragging) return; event.preventDefault(); root.focus(); origin = finite(root.dataset.value); changed = false; root.dataset.dragging = "true"; root.setPointerCapture(event.pointerId); fromPointer(event); });
  root.addEventListener("pointermove", event => { if (root.dataset.dragging && root.hasPointerCapture(event.pointerId)) fromPointer(event); });
  root.addEventListener("pointerup", event => { if (!root.dataset.dragging || !root.hasPointerCapture(event.pointerId)) return; fromPointer(event); delete root.dataset.dragging; root.releasePointerCapture(event.pointerId); if (changed && widget.outputMode !== "continuous") context.onCommit?.(Number(root.dataset.value)); context.onSettled?.(); });
  const cancel = () => { if (!root.dataset.dragging) return; delete root.dataset.dragging; update(origin); context.onInput?.(origin); if (widget.outputMode === "continuous" && origin != null) context.onCommit?.(origin); context.onSettled?.(); };
  root.addEventListener("pointercancel", cancel); root.addEventListener("lostpointercapture", cancel);
  root.addEventListener("keydown", event => {
    if (!enabled) return; const current = finite(root.dataset.value) ?? model.min;
    const next = { Home: model.min, End: model.max, ArrowUp: current + model.step, ArrowRight: current + model.step, ArrowDown: current - model.step, ArrowLeft: current - model.step, PageUp: current + model.step * 10, PageDown: current - model.step * 10 }[event.key];
    if (next === undefined) return; event.preventDefault(); const value = industrialQuantize(widget, next); input(value); if (widget.outputMode !== "continuous") context.onCommit?.(value); context.onSettled?.();
  });
  update(model.gauge ? model.value : industrialQuantize(widget, model.value ?? model.min));
  return root;
}
