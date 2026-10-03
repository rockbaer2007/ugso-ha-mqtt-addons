import { styledSliderDomain, styledSliderValue, styledSliderWritable } from "./styled-slider.js";
export const RADIAL_STYLE_GROUPS = [
  ["radialTrack", ["trackColor", "trackActiveColor", "trackWidth", "trackShadowX", "trackShadowY", "trackShadowBlur", "trackShadowColor"]],
  ["radialThumb", ["thumbColor", "thumbSize", "thumbShadowX", "thumbShadowY", "thumbShadowBlur", "thumbShadowColor"]],
];
const clamp = (v, fallback, min, max) => Math.min(max, Math.max(min, v !== "" && v != null && Number.isFinite(Number(v)) ? Number(v) : fallback));
const mod = angle => (angle % 360 + 360) % 360;
export function radialAngles(widget) {
  const start = mod(clamp(widget.startAngle, 225, 0, 360)), end = mod(clamp(widget.endAngle, 135, 0, 360));
  return { start, sweep: mod(end - start) || 360 };
}
export function radialValue(widget, value) {
  const { min, max, step, valid } = styledSliderDomain(widget);
  if (!valid || value == null || !Number.isFinite(Number(value))) return null;
  return Math.min(max, Math.max(min, Number((min + Math.round((Number(value) - min) / step) * step).toPrecision(12))));
}
export function radialPointerValue(widget, angle) {
  const { min, max } = styledSliderDomain(widget), { start, sweep } = radialAngles(widget);
  let offset = mod(angle - start);
  if (offset > sweep) offset = offset - sweep < 360 - offset ? sweep : 0;
  return radialValue(widget, min + (max - min) * offset / sweep);
}
export function radialPoint(center, radius, angle) { const rad = angle * Math.PI / 180; return { x: center + Math.sin(rad) * radius, y: center - Math.cos(rad) * radius }; }
export function radialArc(center, radius, start, sweep) {
  if (!(sweep > 0)) return "";
  const a = radialPoint(center, radius, start), b = radialPoint(center, radius, start + sweep);
  if (sweep >= 359.999) { const mid = radialPoint(center, radius, start + 180); return `M ${a.x} ${a.y} A ${radius} ${radius} 0 1 1 ${mid.x} ${mid.y} A ${radius} ${radius} 0 1 1 ${a.x} ${a.y}`; }
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${sweep > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
}
export function radialStyle(widget, widgets) {
  const result = {};
  for (const [prefix, keys] of RADIAL_STYLE_GROUPS) {
    let source = widget; const seen = new Set([widget.id]);
    while (source[`${prefix}FromWidget`]) { const next = widgets.find(item => item.type === "radial-slider" && item.id === source[`${prefix}FromWidget`]); if (!next || seen.has(next.id)) break; seen.add(next.id); source = next; }
    for (const key of keys) result[key] = source[key];
  }
  return result;
}
export function updateRadialSlider(root, widget, value) {
  const domain = styledSliderDomain(widget), { start, sweep } = radialAngles(widget), center = Number(root.dataset.size) / 2, radius = Number(root.dataset.radius);
  const normalized = value == null || !Number.isFinite(Number(value)) ? null : Math.min(domain.max, Math.max(domain.min, Number(value)));
  root.dataset.value = normalized == null ? "" : String(normalized);
  if (normalized == null) root.removeAttribute("aria-valuenow"); else root.setAttribute("aria-valuenow", String(normalized));
  root.setAttribute("aria-valuetext", normalized == null ? "—" : `${normalized}${widget.label ? ` ${widget.label}` : ""}`);
  const fraction = normalized == null || !domain.valid ? 0 : (normalized - domain.min) / (domain.max - domain.min);
  root.querySelector(".radial-active").setAttribute("d", radialArc(center, radius, start, sweep * fraction));
  const thumb = root.querySelector(".radial-thumb"), point = radialPoint(center, radius, start + sweep * fraction);
  thumb.setAttribute("cx", point.x); thumb.setAttribute("cy", point.y); thumb.style.display = normalized == null ? "none" : "";
  const valueText = normalized == null ? "—" : String(normalized), output = root.querySelector(".radial-value");
  output.textContent = valueText;
  output.style.fontSize = `${Math.min(clamp(widget.valueSize, 32, 8, 100), center * 1.3 / Math.max(1, valueText.length * .65), center * (widget.showLabel !== false && widget.label ? .65 : 1))}px`;
}
export function renderRadialSlider(widget, doc, context) {
  const root = doc.createElement("div"); root.className = "radial-slider";
  const domain = styledSliderDomain(widget), style = radialStyle(widget, context.widgets), { start, sweep } = radialAngles(widget);
  const size = clamp(Math.min(Number(widget.width) || 200, Number(widget.height) || 200), 200, 16, 4096), center = size / 2;
  const width = clamp(style.trackWidth, 10, 1, 50), thumbSize = clamp(style.thumbSize, 16, 1, 50), radius = Math.max(1, center - Math.max(width, thumbSize) / 2 - 10);
  root.dataset.size = String(size); root.dataset.radius = String(radius);
  const enabled = context.runtime && styledSliderWritable(widget, context.entry);
  root.setAttribute("role", "slider"); root.setAttribute("aria-label", widget.label || widget.name || context.label); root.setAttribute("aria-valuemin", domain.min); root.setAttribute("aria-valuemax", domain.valid ? domain.max : domain.min); root.setAttribute("aria-disabled", String(!enabled)); root.tabIndex = context.runtime ? 0 : -1;
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", `0 0 ${size} ${size}`); svg.setAttribute("aria-hidden", "true");
  const shape = (tag, className) => { const node = doc.createElementNS("http://www.w3.org/2000/svg", tag); node.setAttribute("class", className); svg.append(node); return node; };
  const track = shape("path", "radial-track"), active = shape("path", "radial-active"), thumb = shape("circle", "radial-thumb");
  const shadow = (prefix, fallback) => `drop-shadow(${clamp(style[`${prefix}ShadowX`], 2, -50, 50)}px ${clamp(style[`${prefix}ShadowY`], 2, -50, 50)}px ${clamp(style[`${prefix}ShadowBlur`], 2, 0, 50)}px ${style[`${prefix}ShadowColor`] || fallback})`;
  track.setAttribute("d", radialArc(center, radius, start, sweep));
  for (const path of [track, active]) { path.setAttribute("fill", "none"); path.setAttribute("stroke-width", width); path.setAttribute("stroke-linecap", "round"); }
  track.setAttribute("stroke", style.trackColor || "#6E6E6E"); active.setAttribute("stroke", style.trackActiveColor || "#5E6B3F"); track.style.filter = shadow("track", "#000000");
  thumb.setAttribute("r", thumbSize / 2); thumb.setAttribute("fill", style.thumbColor || "#455618"); thumb.style.filter = shadow("thumb", "#00000080");
  const centerText = doc.createElement("div"), value = doc.createElement("div"), label = doc.createElement("div"); centerText.className = "radial-center"; value.className = "radial-value"; label.className = "radial-label";
  value.hidden = widget.showValue === false; value.style.fontSize = `${clamp(widget.valueSize, 32, 8, 100)}px`; value.style.color = widget.valueColor || "#FFFFFF";
  label.hidden = widget.showLabel === false || !widget.label; label.textContent = String(widget.label || ""); label.title = label.textContent; label.style.fontSize = `${Math.min(clamp(widget.labelSize, 14, 8, 50), size * .15)}px`; label.style.color = widget.labelColor || "#C8C8C8";
  centerText.append(value, label); root.append(svg, centerText);
  let origin = null, changed = false;
  const input = next => { if (next == null) return; if (root.dataset.value !== String(next)) changed = true; updateRadialSlider(root, widget, next); context.input(next); };
  const fromPointer = event => { const box = svg.getBoundingClientRect(), x = event.clientX - box.left - box.width / 2, y = event.clientY - box.top - box.height / 2; if (Math.hypot(x, y) < Math.min(box.width, box.height) * .1) return; input(radialPointerValue(widget, mod(Math.atan2(x, -y) * 180 / Math.PI))); };
  root.addEventListener("pointerdown", event => { if (!enabled || event.button !== 0) return; event.preventDefault(); root.focus(); origin = root.dataset.value === "" ? null : Number(root.dataset.value); changed = false; root.dataset.dragging = "true"; root.setPointerCapture(event.pointerId); fromPointer(event); });
  root.addEventListener("pointermove", event => { if (root.dataset.dragging) fromPointer(event); });
  root.addEventListener("pointerup", event => { if (!root.dataset.dragging) return; fromPointer(event); delete root.dataset.dragging; if (root.hasPointerCapture(event.pointerId)) root.releasePointerCapture(event.pointerId); if (changed && root.dataset.value !== "") context.commit(Number(root.dataset.value)); context.dragEnd(); });
  const cancel = () => { if (!root.dataset.dragging) return; delete root.dataset.dragging; if (origin != null) input(origin); context.dragEnd(); };
  root.addEventListener("pointercancel", cancel); root.addEventListener("lostpointercapture", cancel);
  root.addEventListener("keydown", event => { if (!enabled) return; const current = Number(root.dataset.value || domain.min); const next = ({ Home: domain.min, End: domain.max, ArrowUp: current + domain.step, ArrowRight: current + domain.step, ArrowDown: current - domain.step, ArrowLeft: current - domain.step, PageUp: current + domain.step * 10, PageDown: current - domain.step * 10 })[event.key]; if (next === undefined) return; event.preventDefault(); const value = radialValue(widget, next); input(value); context.commit(value); });
  updateRadialSlider(root, widget, styledSliderValue(widget, context.entry)); return root;
}
