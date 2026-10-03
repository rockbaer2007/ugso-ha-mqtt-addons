import { radialArc, radialPoint } from "./radial-slider.js";
const clamp = (value, fallback, min, max) => Math.min(max, Math.max(min, finite(value) ?? fallback));
export function finite(value) { return (typeof value === "number" || typeof value === "string" && value.trim() !== "") && Number.isFinite(Number(value)) ? Number(value) : null; }
export const isGauge = widget => /^gauge-(color|water|battery|arc|compass|linear|radial|rings|tank|thermometer)$/.test(widget.type || "");
export function gaugeValue(widget, states = {}, override) {
  const raw = override !== undefined ? override : widget.entityId ? states[widget.entityId]?.state : widget.state;
  const min = finite(widget.minValue) ?? 0, max = finite(widget.maxValue) ?? 100, value = finite(raw);
  return { value, min, max, valid: max > min, fraction: value == null || max <= min ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min))) };
}
export function gaugeLevels(widget) {
  const levels = [];
  for (let n = 1; n <= clamp(widget.levelCount, 3, 1, 10); n++) {
    if (widget.enabledPropertyGroups?.[`gauge-level-${n}`] === false) continue;
    const threshold = finite(widget[`levelThreshold${n}`]);
    if (threshold != null && widget[`levelColor${n}`]) levels.push({ threshold, color: widget[`levelColor${n}`] });
  }
  return levels.sort((a, b) => a.threshold - b.threshold);
}
export function gaugeColor(widget, value) {
  const levels = gaugeLevels(widget);
  return value == null ? widget.trackColor || "#33434c" : (levels.find(level => value <= level.threshold) || levels.at(-1))?.color || widget.activeColor || "#29c8b5";
}
export function gaugeEntityIds(widget) {
  if (!isGauge(widget)) return [];
  return [widget.entityId, widget.targetEntityId, widget.chargingEntityId, widget.speedEntityId, ...Array.from({ length: clamp(widget.ringCount, 3, 1, 8) }, (_, i) => widget[`ringEntityId${i + 1}`])].filter(Boolean);
}
export function compassHeading(widget, value) {
  const raw = finite(value); if (raw == null) return null;
  return (((widget.invertDirection ? -raw : raw) + (finite(widget.northOffset) ?? 0)) % 360 + 360) % 360;
}
export function compassDirection(degrees) { return degrees == null ? "—" : ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(degrees / 45) % 8]; }
let serial = 0;
export function renderGauge(widget, doc, { states = {}, value, runtime = false } = {}) {
  if (widget.enabledPropertyGroups?.["gauge-style"] === false) {
    widget = { ...widget };
    for (const key of ["activeColor", "trackColor", "scaleColor", "needleColor", "valueColor", "valueSize", "trackWidth", "roundedCaps"]) delete widget[key];
  }
  const model = gaugeValue(widget, states, value), kind = widget.type.slice(6), root = doc.createElement("div");
  root.className = `gauge-instrument gauge-instrument-${kind}`;
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 240 240"); svg.setAttribute("role", "img");
  root.append(svg);
  const el = (name, attrs = {}, parent = svg) => { const node = doc.createElementNS("http://www.w3.org/2000/svg", name); for (const [key, val] of Object.entries(attrs)) node.setAttribute(key, val); parent.append(node); return node; };
  const textColor = widget.valueColor || "#fff", track = widget.trackColor || "#33434c", scaleColor = widget.scaleColor || "#dce6eb", active = gaugeColor(widget, model.value), width = clamp(widget.trackWidth, 12, 1, 30);
  const fmt = number => number == null ? "—" : Number(number).toFixed(clamp(widget.digits, 0, 0, 6));
  const reading = model.valid ? `${fmt(model.value)}${widget.unit ? ` ${widget.unit}` : ""}` : "—";
  const label = String(widget.label || "");
  svg.setAttribute("aria-label", `${label || kind}: ${reading}`);
  const title = el("title"); title.textContent = `${label || kind}: ${reading}`;
  const text = (x, y, content, size = 12, fill = textColor, parent = svg) => { const node = el("text", { x, y, fill, "font-size": size, "font-family": "system-ui, sans-serif", "text-anchor": "middle", "dominant-baseline": "middle" }, parent); node.textContent = content; if (String(content).length > 22) { node.setAttribute("textLength", 200); node.setAttribute("lengthAdjust", "spacingAndGlyphs"); } return node; };
  const line = (x1, y1, x2, y2, stroke = scaleColor, strokeWidth = 1, parent = svg) => el("line", { x1, y1, x2, y2, stroke, "stroke-width": strokeWidth }, parent);
  const arc = (radius, start, sweep, stroke, strokeWidth = width, parent = svg) => sweep > 0 && el("path", { d: radialArc(120, radius, start, sweep), fill: "none", stroke, "stroke-width": strokeWidth, "stroke-linecap": widget.roundedCaps === false ? "butt" : "round" }, parent);
  const sweep = clamp(widget.sweepAngle, 240, 30, 360), start = 180 + (360 - sweep) / 2 + (finite(widget.rotation) ?? 0);
  const fraction = model.fraction, available = model.value != null && model.valid;
  const point = (radius, angle) => radialPoint(120, radius, angle);
  const target = widget.targetEntityId ? finite(states[widget.targetEntityId]?.state) : finite(widget.targetValue);
  const targetFraction = target != null && model.valid ? Math.min(1, Math.max(0, (target - model.min) / (model.max - model.min))) : null;
  const ticks = (radial = false, parent = svg) => {
    if (widget.showScale === false || !model.valid) return;
    const major = Math.trunc(clamp(widget.majorTicks, 5, 1, 20)), minor = Math.trunc(clamp(widget.minorTicks, 4, 0, 10)) + 1;
    for (let i = 0; i <= major * minor; i++) {
      const f = i / (major * minor), main = i % minor === 0;
      if (radial) { const a = point(87, start + sweep * f), b = point(main ? 77 : 82, start + sweep * f); line(a.x, a.y, b.x, b.y, scaleColor, main ? 2 : 1, parent); if (main) { const p = point(66, start + sweep * f); text(p.x, p.y, fmt(model.min + f * (model.max - model.min)), 9, scaleColor, parent); } }
      else { const y = kind === "thermometer" ? 172 - f * 134 : widget.tankShape === "horizontal" ? 174 - f * 107 : 197 - f * 165; line(161, y, main ? 174 : 169, y, scaleColor, main ? 2 : 1, parent); if (main) text(194, y, fmt(model.min + f * (model.max - model.min)), 9, scaleColor, parent); }
    }
  };
  const from = widget.fromZero && model.valid ? Math.min(1, Math.max(0, -model.min / (model.max - model.min))) : 0;
  const needle = (angle, radius = 74, parent = svg) => {
    const p = point(radius, angle), c = widget.needleColor || "#ef5350";
    if (widget.needleType === "line") line(120, 120, p.x, p.y, c, 3, parent);
    else { const a = point(9, angle - 90), b = point(9, angle + 90), tail = point(widget.needleType === "triangle" ? 0 : 18, angle + 180); el("polygon", { points: `${p.x},${p.y} ${a.x},${a.y} ${tail.x},${tail.y} ${b.x},${b.y}`, fill: c }, parent); }
    el("circle", { cx: 120, cy: 120, r: 7, fill: scaleColor }, parent);
  };
  if (["color", "arc", "radial"].includes(kind)) {
    if (kind === "radial") {
      el("circle", { cx: 120, cy: 120, r: 104, fill: track, stroke: widget.bezel === "none" ? "none" : scaleColor, "stroke-width": widget.bezel === "metal" ? 8 : 2 });
      ticks(true);
    }
    arc(94, start, sweep, track);
    if (kind === "color" || kind === "radial") {
      let last = 0;
      for (const level of gaugeLevels(widget)) { const end = model.valid ? Math.min(1, Math.max(last, (level.threshold - model.min) / (model.max - model.min))) : 0; arc(94, start + sweep * last, sweep * (end - last), level.color, kind === "radial" ? 6 : width); last = end; }
      if (last < 1) arc(94, start + sweep * last, sweep * (1 - last), active, kind === "radial" ? 6 : width);
      if (available) needle(start + sweep * fraction);
    } else if (available) {
      const segments = Math.trunc(clamp(widget.segments, 0, 0, 100));
      if (segments) for (let i = 0; i < segments; i++) { const lo = i / segments, hi = (i + 1) / segments, a = Math.max(lo, Math.min(from, fraction)), b = Math.min(hi, Math.max(from, fraction)); if (b > a) arc(94, start + sweep * a, Math.max(0, sweep * (b - a) - clamp(widget.segmentGap, 2, 0, 10)), active); }
      else arc(94, start + sweep * Math.min(from, fraction), sweep * Math.abs(fraction - from), active);
    }
    if (widget.showTarget && targetFraction != null) { const a = point(83, start + sweep * targetFraction), b = point(106, start + sweep * targetFraction); line(a.x, a.y, b.x, b.y, widget.targetColor || "#ffca28", 3); }
    if (widget.showValue !== false) text(120, kind === "radial" ? 163 : 166, reading, clamp(widget.valueSize, 22, 8, 48));
    if (kind !== "radial" && widget.showMinMax !== false && model.valid) { text(34, 203, fmt(model.min), 11); text(206, 203, fmt(model.max), 11); }
  } else if (kind === "compass") {
    const heading = compassHeading(widget, model.value), dial = el("g", { transform: `rotate(${widget.rotateDial && heading != null ? -heading : 0} 120 120)` });
    el("circle", { cx: 120, cy: 120, r: 99, fill: track, stroke: scaleColor, "stroke-width": 2 }, dial);
    for (let degree = 0; degree < 360; degree += 10) { const a = point(94, degree), b = point(degree % 30 ? 90 : 85, degree); line(a.x, a.y, b.x, b.y, scaleColor, 1, dial); }
    for (let n = 0; n < 8; n++) if (n % 2 === 0 || widget.showIntercardinal !== false) { const p = point(72, n * 45); text(p.x, p.y, compassDirection(n * 45), 14, n === 0 ? widget.needleColor || "#ef5350" : scaleColor, dial); }
    if (heading != null) needle(widget.rotateDial ? 0 : heading, 60);
    const valueText = heading == null ? "—" : widget.compassFormat === "direction" ? compassDirection(heading) : widget.compassFormat === "degrees" ? `${fmt(heading)}°` : `${fmt(heading)}° ${compassDirection(heading)}`;
    if (widget.showValue !== false) text(120, 165, valueText, 18);
    const speed = widget.speedEntityId ? finite(states[widget.speedEntityId]?.state) : finite(widget.speedValue);
    if (speed != null) text(120, 232, `${fmt(speed)} ${widget.speedUnit || ""}`, 12);
    svg.setAttribute("aria-label", `${label || kind}: ${valueText}${speed != null ? `, ${fmt(speed)} ${widget.speedUnit || ""}` : ""}`);
    title.textContent = svg.getAttribute("aria-label");
  } else if (kind === "rings") {
    const count = Math.trunc(clamp(widget.ringCount, 3, 1, 8)), gap = clamp(widget.ringGap, 5, 1, 10), ringWidth = Math.min(width, (82 - gap * (count - 1)) / count);
    const readings = [];
    for (let n = 1; n <= count; n++) {
      if (widget.enabledPropertyGroups?.[`gauge-ring-${n}`] === false) continue;
      const ring = gaugeValue({ entityId: widget[`ringEntityId${n}`], state: widget[`ringValue${n}`] ?? 50, minValue: widget[`ringMin${n}`] ?? 0, maxValue: widget[`ringMax${n}`] ?? 100 }, states);
      const radius = 100 - (n - 1) * (ringWidth + gap), c = widget[`ringColor${n}`] || widget.activeColor || "#29c8b5";
      readings.push(`${widget[`ringLabel${n}`] || n}: ${ring.valid ? fmt(ring.value) : "—"} ${widget[`ringUnit${n}`] || ""}`);
      arc(radius, start, sweep, track, ringWidth); if (ring.value != null && ring.valid) arc(radius, start, sweep * ring.fraction, c, ringWidth);
      if (widget.legend !== "none") { const row = doc.createElement("div"); row.className = "gauge-ring-reading"; row.style.color = c; row.textContent = `${widget[`ringLabel${n}`] || n}: ${ring.valid ? fmt(ring.value) : "—"}${widget[`ringUnit${n}`] ? ` ${widget[`ringUnit${n}`]}` : ""}`; root.append(row); }
    }
    if (label) text(120, 120, label, 16);
    root.classList.toggle("gauge-legend-side", widget.legend === "side");
    svg.setAttribute("aria-label", readings.join(", ")); title.textContent = readings.join(", ");
  } else if (kind === "battery") {
    const vertical = widget.orientation === "vertical", body = el("g", { transform: vertical ? "rotate(-90 120 120)" : "" });
    el("rect", { x: 22, y: 69, width: 182, height: 102, rx: 10, fill: track, stroke: scaleColor, "stroke-width": 5 }, body);
    el("rect", { x: 206, y: 95, width: 13, height: 50, rx: 4, fill: scaleColor }, body);
    const cells = Math.trunc(clamp(widget.cells, 5, 1, 20)), cellWidth = 166 / cells;
    if (available) for (let i = 0; i < cells; i++) { const filled = Math.min(1, Math.max(0, fraction * cells - i)); if (filled) el("rect", { x: 30 + i * cellWidth, y: 77, width: Math.max(0, cellWidth * filled - 2), height: 86, rx: 2, fill: active }, body); }
    const charging = widget.chargingEntityId ? ["on", "true", "charging", "1"].includes(String(states[widget.chargingEntityId]?.state).toLowerCase()) : widget.charging === true;
    if (charging) el("path", { d: "M127 86 L104 123 H119 L111 154 L139 116 H123 Z", fill: widget.chargingColor || "#ffca28", stroke: track, "stroke-width": 1 });
    if (widget.showValue !== false) text(120, vertical ? 227 : 205, reading, clamp(widget.valueSize, 22, 8, 48));
    root.dataset.charging = String(charging);
  } else if (kind === "linear") {
    const vertical = widget.orientation === "vertical", group = el("g", { transform: vertical ? "" : "rotate(90 120 120)" });
    el("rect", { x: 91, y: 40, width: 38, height: 160, rx: widget.roundedCaps === false ? 0 : 8, fill: track }, group);
    if (available) {
      if (widget.displayMode === "pointer") { const y = 200 - 160 * fraction; el("polygon", { points: `78,${y - 7} 91,${y} 78,${y + 7}`, fill: active }, group); }
      else el("rect", { x: 94, y: 200 - 160 * Math.max(from, fraction), width: 32, height: 160 * Math.abs(fraction - from), rx: widget.roundedCaps === false ? 0 : 4, fill: active }, group);
    }
    if (widget.showScale !== false && model.valid) {
      const major = Math.trunc(clamp(widget.majorTicks, 5, 1, 20)), minor = Math.trunc(clamp(widget.minorTicks, 4, 0, 10)) + 1;
      for (let n = 0; n <= major * minor; n++) { const f = n / (major * minor), y = 200 - 160 * f, main = n % minor === 0; line(135, y, main ? 146 : 141, y, scaleColor, 1, group); if (main) { const labelGroup = el("g", { transform: vertical ? "" : `rotate(-90 163 ${y})` }, group); text(163, y, fmt(model.min + f * (model.max - model.min)), 10, scaleColor, labelGroup); } }
    }
    if (widget.showTarget && targetFraction != null) { const y = 200 - 160 * targetFraction; line(86, y, 135, y, widget.targetColor || "#ffca28", 3, group); }
    if (widget.showValue !== false) text(120, 223, reading, clamp(widget.valueSize, 22, 8, 48));
  } else if (kind === "thermometer") {
    el("rect", { x: 97, y: 27, width: 34, height: 154, rx: 17, fill: track, stroke: scaleColor, "stroke-width": 3 });
    el("circle", { cx: 114, cy: 184, r: 28, fill: track, stroke: scaleColor, "stroke-width": 3 });
    if (available) { el("rect", { x: 105, y: 172 - 134 * fraction, width: 18, height: 134 * fraction + 14, rx: 8, fill: active }); el("circle", { cx: 114, cy: 184, r: 20, fill: active }); }
    if (widget.scaleSide !== "left") ticks();
    if (["left", "both"].includes(widget.scaleSide)) { const left = el("g", { transform: "translate(-110 0)" }); ticks(false, left); }
    if (widget.showValue !== false) text(120, 228, reading, clamp(widget.valueSize, 22, 8, 48));
  } else if (["water", "tank"].includes(kind)) {
    const id = `gauge-clip-${++serial}`, defs = el("defs"), clip = el("clipPath", { id }, defs), shape = widget.tankShape || "cylinder";
    const shapeAttrs = kind === "water" ? { cx: 120, cy: 116, r: 91 } : shape === "horizontal" ? { x: 28, y: 67, width: 183, height: 107, rx: 50 } : { x: 58, y: 32, width: 103, height: 165, rx: shape === "rect" ? 3 : 18 };
    const tag = kind === "water" ? "circle" : "rect";
    el(tag, { ...shapeAttrs, fill: track, stroke: scaleColor, "stroke-width": 3 }); el(tag, shapeAttrs, clip);
    if (available) {
      const top = kind === "water" ? 25 : shape === "horizontal" ? 67 : 32, height = kind === "water" ? 182 : shape === "horizontal" ? 107 : 165, surface = top + height * (1 - fraction);
      const liquid = el("g", { "clip-path": `url(#${id})` });
      // Empty and full values must be exact even when the wave has amplitude.
      const wave = el("path", { d: fraction <= 0 || fraction >= 1 ? `M0 ${surface}H480V240H0Z` : `M0 ${surface} ${Array.from({ length: 8 }, (_, i) => `Q ${i * 60 + 15} ${surface - clamp(widget.waveAmplitude, 3, 0, 15)} ${i * 60 + 30} ${surface} T ${i * 60 + 60} ${surface}`).join(" ")} V240H0Z`, fill: active }, liquid);
      if (runtime && widget.waveAnimation !== false && fraction > 0 && fraction < 1) { wave.setAttribute("class", "gauge-wave"); wave.style.animationDuration = `${clamp(widget.waveDuration, 3, .5, 30)}s`; }
      if (kind === "tank" && shape === "cylinder") el("ellipse", { cx: 109.5, cy: 39, rx: 50, ry: 10, fill: "none", stroke: scaleColor, "stroke-width": 2 });
    }
    if (kind === "tank") ticks();
    if (widget.showValue !== false) text(kind === "water" ? 120 : 110, kind === "water" ? 116 : 218, widget.showPercent && kind === "tank" && available ? `${fmt(model.value)} ${widget.unit || ""} (${Math.round(fraction * 100)}%)` : reading, clamp(widget.valueSize, 22, 8, 48));
  }
  if (label && kind !== "rings") { const caption = doc.createElement("div"); caption.className = "gauge-instrument-label"; caption.textContent = label; caption.title = label; root.append(caption); }
  root.dataset.value = model.value == null ? "" : String(model.value);
  root.dataset.fraction = String(fraction);
  return root;
}
