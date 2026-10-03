import { weatherBindings } from "./weather-data.js";
const count = widget => Math.min(10, Math.max(1, Math.trunc(Number(widget.dataCount) || 1)));
const numeric = v => (typeof v === "number" || typeof v === "string" && v.trim()) && Number.isFinite(Number(v)) ? Number(v) : null;
export const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const chartBindings = widget => widget.chartMode === "weather" ? [...weatherBindings(widget), { entityId: widget.locationEntityId || "", attribute: "" }] : widget.chartMode === "two-weeks"
  ? widget.showWeekData === true ? ["previous", "current"].flatMap(week => WEEK_DAYS.map(day => ({ entityId: widget[`${week}${day}EntityId`] || "", attribute: "" }))) : []
  : Array.from({ length: count(widget) }, (_, i) => ({ entityId: widget[`seriesEntityId${i + 1}`] || (i === 0 ? widget.entityId : ""), attribute: widget[`seriesAttribute${i + 1}`] || "" }));
export function weekSeries(widget, states = {}, locale = "de") {
  const labels = WEEK_DAYS.map((_, i) => new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 1 + i))));
  return ["previous", "current"].map(week => ({
    name: locale === "de" ? week === "previous" ? "Vorwoche" : "Aktuelle Woche" : week === "previous" ? "Previous week" : "Current week",
    color: widget[`${week}WeekColor`] || (week === "previous" ? "#0000ff" : "#ffff00"),
    unit: widget.unit || "", type: "bar", axis: widget.positionYAxis === "left" ? "left" : "right",
    points: WEEK_DAYS.map((day, i) => ({ x: labels[i], y: numeric(widget.showWeekData === true ? states[widget[`${week}${day}EntityId`]]?.state : widget[`${week}${day}Preview`]) })),
  }));
}
export function chartPoints(source, { xKey = "x", yKey = "value", difference = false, time = true } = {}) {
  let rows; try { rows = typeof source === "string" ? JSON.parse(source) : source; } catch { return []; }
  if (!Array.isArray(rows) || rows.length > 20000) return [];
  let previous = null;
  const points = rows.map(row => {
    const x = Array.isArray(row) ? row[0] : row && typeof row === "object" ? row[xKey] : null;
    const raw = Array.isArray(row) ? row[1] : row && typeof row === "object" ? row[yKey] : null;
    const y = numeric(raw), date = typeof x === "string" && !/^-?\d+(\.\d+)?$/.test(x) ? Date.parse(x) : numeric(x);
    return { x: time ? date : x == null ? null : String(x), y };
  }).filter(p => p.x != null && (!time || Number.isFinite(new Date(p.x).getTime())));
  if (time) points.sort((a, b) => a.x - b.x);
  for (const point of points) { const value = point.y; if (difference) { const delta = value == null || previous == null ? null : value - previous; point.y = Number.isFinite(delta) ? delta : null; } previous = value; }
  // Bound SVG size while retaining endpoints and gaps; no executable formatters.
  if (points.length <= 500) return points;
  return Array.from({ length: 500 }, (_, i) => { const index = Math.round(i * (points.length - 1) / 499), last = i ? Math.round((i - 1) * (points.length - 1) / 499) : 0; return { ...points[index], breakBefore: points.slice(last, index).some(p => p.y == null) }; });
}
export function chartSeries(widget, states = {}) {
  return chartBindings(widget).map((binding, i) => {
    const n = i + 1, entry = states[binding.entityId];
    const source = binding.entityId ? binding.attribute ? entry?.attributes?.[binding.attribute] : entry?.state : widget[`seriesData${n}`];
    return { name: widget[`seriesName${n}`] || `Series ${n}`, color: widget[`seriesColor${n}`] || "#42aee8", unit: widget[`seriesUnit${n}`] || "", type: widget[`seriesType${n}`] === "bar" ? "bar" : "line", axis: widget[`seriesAxis${n}`] === "right" ? "right" : "left", points: chartPoints(source, { xKey: widget[`seriesXKey${n}`] || "x", yKey: widget[`seriesYKey${n}`] || "value", difference: widget[`seriesDifference${n}`] === true, time: widget.xAxisType !== "category" }) };
  });
}
export function chartTimeLabel(value, format = "ddd HH:mm", locale = "de") {
  const date = new Date(value); if (!Number.isFinite(date.getTime())) return "—";
  const pad = n => String(n).padStart(2, "0");
  const tokens = { YYYY: date.getFullYear(), MM: pad(date.getMonth() + 1), DD: pad(date.getDate()), HH: pad(date.getHours()), mm: pad(date.getMinutes()), ss: pad(date.getSeconds()), ddd: new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date) };
  return String(format).slice(0, 100).replace(/YYYY|ddd|MM|DD|HH|mm|ss/g, token => tokens[token]);
}
export function renderPackageChart(widget, doc, states = {}, locale = "de", valueKey = "headline") {
  const root = doc.createElement("div"); root.className = "package-chart";
  const weekly = widget.chartMode === "two-weeks";
  const heading = doc.createElement("strong"); heading.textContent = widget[valueKey] ?? ""; if (weekly) heading.style.color = widget.headlineColor || "#ffffff"; if (heading.textContent) root.append(heading);
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", "0 0 640 300"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", widget[valueKey] || "Chart"); root.append(svg);
  const node = (tag, attrs, parent = svg) => { const el = doc.createElementNS("http://www.w3.org/2000/svg", tag); for (const [key, val] of Object.entries(attrs)) el.setAttribute(key, val); parent.append(el); return el; };
  const text = (x, y, value, anchor = "middle") => { const el = node("text", { x, y, fill: widget.axisColor || "#dce6eb", "font-size": 11, "text-anchor": anchor }); el.textContent = value; return el; };
  const series = weekly ? weekSeries(widget, states, locale) : chartSeries(widget, states), all = series.flatMap(s => s.points), values = all.filter(p => p.y != null), time = !weekly && widget.xAxisType !== "category";
  const digits = Math.min(5, Math.max(0, Math.trunc(Number(widget.decimalPlaces) || 0)));
  const formatted = value => weekly ? value.toFixed(digits) : String(value);
  if (!values.length) { text(320, 140, locale === "de" ? "Keine gültigen Diagrammdaten" : "No valid chart data"); return root; }
  const categories = [...new Set(all.map(p => p.x))], xmin = time ? Math.min(...all.map(p => p.x)) : 0, xmax = time ? Math.max(...all.map(p => p.x)) : Math.max(1, categories.length - 1);
  const ranges = Object.fromEntries(["left", "right"].map(axis => { const ys = series.filter(s => s.axis === axis).flatMap(s => s.points).filter(p => p.y != null).map(p => p.y); const min = Math.min(0, ...ys), max = Math.max(0, ...ys); return [axis, { min, max: max > min ? max : min + 1 }]; }));
  const x = point => weekly ? 58 + (categories.indexOf(point.x) + .5) / 7 * 516 : 58 + ((time ? point.x : categories.indexOf(point.x)) - xmin) / (xmax - xmin || 1) * 516;
  const y = (value, axis) => { const { min, max } = ranges[axis]; return 256 - ((value / 2 - min / 2) / (max / 2 - min / 2 || 1)) * 230; };
  for (let tick = 0; tick <= 5; tick++) {
    const py = 256 - tick * 46; node("line", { x1: 58, y1: py, x2: 574, y2: py, stroke: widget.gridColor || "#45535c", "stroke-width": .5 });
    for (const axis of ["left", "right"]) if (series.some(s => s.axis === axis)) { const value = ranges[axis].min * (1 - tick / 5) + ranges[axis].max * (tick / 5); text(axis === "left" ? 52 : 580, py + 4, weekly ? formatted(value) : Number(value.toFixed(2)), axis === "left" ? "end" : "start"); }
  }
  if (weekly) {
    node("line", { x1: 58, y1: 256, x2: 574, y2: 256, stroke: widget.xAxisColor || "#ffffff" });
    categories.forEach(raw => { const label = text(x({ x: raw }), 281, raw); label.setAttribute("fill", widget.xAxisColor || "#ffffff"); });
  } else for (let tick = 0; tick <= 4; tick++) { const f = tick / 4, raw = time ? xmin + f * (xmax - xmin) : categories[Math.round(f * (categories.length - 1))]; const label = time ? chartTimeLabel(raw, widget.xAxisFormat, locale) : String(raw).slice(0, 18); text(58 + f * 516, 281, label); }
  const bars = series.filter(s => s.type === "bar"), barWidth = Math.max(1, Math.min(30, 480 / Math.max(1, categories.length) / Math.max(1, bars.length)));
  for (const s of series) {
    let run = [];
    const flush = () => { if (run.length > 1) node("polyline", { points: run.join(" "), fill: "none", stroke: s.color, "stroke-width": 2 }); run = []; };
    for (const p of s.points) {
      if (p.breakBefore) flush();
      if (p.y == null) { flush(); continue; }
      const px = x(p), py = y(p.y, s.axis); let mark;
      if (s.type === "bar") { const base = y(0, s.axis); mark = node("rect", { x: Math.max(58, Math.min(574 - barWidth, px - barWidth * bars.length / 2 + bars.indexOf(s) * barWidth)), y: Math.min(py, base), width: Math.max(.5, barWidth - 1), height: Math.abs(base - py), fill: s.color }); }
      else { run.push(`${px},${py}`); mark = node("circle", { cx: px, cy: py, r: 2.5, fill: s.color }); }
      const title = node("title", {}, mark); title.textContent = `${s.name}: ${formatted(p.y)} ${s.unit} · ${time ? chartTimeLabel(p.x, widget.xAxisFormat, locale) : p.x}`;
    }
    flush();
    if (widget.showLegend !== false) { const legend = doc.createElement("span"); legend.className = "package-chart-legend"; legend.style.color = weekly ? widget.legendTextColor || "#000000" : s.color; if (weekly) { const swatch = doc.createElement("i"); swatch.className = "package-chart-swatch"; swatch.style.backgroundColor = s.color; legend.append(swatch); } const caption = doc.createElement("span"); caption.textContent = `${s.name}${s.unit ? ` (${s.unit})` : ""} · ${s.axis === "right" ? "R" : "L"}`; legend.append(caption); root.append(legend); }
  }
  return root;
}
