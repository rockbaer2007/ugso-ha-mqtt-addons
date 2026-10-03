import { sliderStyle } from "./slider-style.js";

const finite = value => value !== "" && value !== null && value !== undefined && Number.isFinite(Number(value));
export function styledSliderDomain(widget) {
  const min = finite(widget.minValue) ? Number(widget.minValue) : 0;
  const max = finite(widget.maxValue) ? Number(widget.maxValue) : 100;
  const step = finite(widget.step) && Number(widget.step) > 0 ? Number(widget.step) : 1;
  return { min, max, step, valid: max > min && Number.isFinite(max - min) };
}
export function styledSliderValue(widget, entry) {
  const value = widget.entityId ? entry?.state : widget.value ?? 50;
  return finite(value) ? Number(value) : null;
}
export function styledSliderWritable(widget, entry) {
  return !widget.readOnly && styledSliderDomain(widget).valid && (!widget.entityId || (!widget.entityAttribute && /^input_number\.[a-z0-9_]+$/.test(widget.entityId) && styledSliderValue(widget, entry) !== null));
}
export const SLIDER_STYLE_GROUPS = [
  ["sliderTrack", ["sliderRailColor", "sliderRailActiveColor", "trackBarType", "trackWidth", "trackBorderRadius", "trackShadowX", "trackShadowY", "trackShadowBlur", "trackShadowSize", "trackShadowColor"]],
  ["sliderThumb", ["sliderThumbColor", "thumbSize", "thumbBorderRadius", "thumbShadowX", "thumbShadowY", "thumbShadowBlur", "thumbShadowSize", "thumbShadowColor"]],
];
export function styledSliderStyle(widget, widgets) {
  const result = {};
  for (const [prefix, keys] of SLIDER_STYLE_GROUPS) {
    let source = widget; const seen = new Set([widget.id]);
    while (source[`${prefix}FromWidget`]) {
      const next = widgets.find(item => item.type === "styled-slider" && item.id === source[`${prefix}FromWidget`]);
      if (!next || seen.has(next.id)) break;
      seen.add(next.id); source = next;
    }
    for (const key of keys) result[key] = source[key];
  }
  return result;
}
export function styledSliderMarks(widget) {
  const { min, max, valid } = styledSliderDomain(widget);
  if (!valid) return [];
  const values = new Set(widget.showMinMax ? [min, max] : []);
  if (widget.showSteps) {
    if (widget.stepMode === "custom") {
      for (const token of String(widget.customSteps || "").split(",").slice(0, 1000)) if (finite(token.trim())) { const value = Number(token); if (value >= min && value <= max && values.size < 201) values.add(value); }
    } else {
      const interval = finite(widget.stepDisplay) && Number(widget.stepDisplay) > 0 ? Number(widget.stepDisplay) : 10;
      const count = (max - min) / interval;
      const stride = Math.max(1, Math.ceil(count / 199));
      if (Number.isFinite(stride)) for (let i = 0; i <= Math.min(199, Math.floor(count / stride)); i++) values.add(Number((min + i * stride * interval).toPrecision(12)));
      values.add(max);
    }
  }
  return [...values].sort((a, b) => a - b).map(value => ({ value, percent: (value - min) / (max - min) * 100, endpoint: value === min || value === max }));
}

export function updateStyledSlider(root, widget, value) {
  const range = root.querySelector("input"), bubble = root.querySelector("output");
  if (value !== null && !range.dataset.dragging) range.value = String(value);
  const { min, max } = styledSliderDomain(widget);
  const percent = max > min ? Math.max(0, Math.min(100, (Number(range.value) - min) / (max - min) * 100)) : 0;
  const mode = root.dataset.trackMode, from = mode === "inverted" ? percent : 0, to = mode === "none" ? 0 : mode === "inverted" ? 100 : percent;
  range.style.setProperty("--slider-fill", `linear-gradient(to ${widget.orientation === "vertical" ? "top" : "right"}, var(--slider-rail) 0%, var(--slider-rail) ${from}%, var(--slider-active) ${from}%, var(--slider-active) ${to}%, var(--slider-rail) ${to}%, var(--slider-rail) 100%)`);
  bubble.textContent = value === null ? "—" : `${range.value}${widget.sliderUnit || ""}`;
  range.setAttribute("aria-valuetext", bubble.textContent);
  bubble.style[widget.orientation === "vertical" ? "bottom" : "left"] = `calc(${percent}% + ${(0.5 - percent / 100) * Number(root.dataset.thumbSize)}px)`;
  bubble.hidden = widget.valueLabelDisplay === "off" || (widget.valueLabelDisplay !== "on" && !range.dataset.dragging && !root.matches(":focus-within"));
}

export function renderStyledSlider(widget, document, context) {
  const root = document.createElement("div"), body = document.createElement("div"), range = document.createElement("input"), bubble = document.createElement("output");
  const vertical = widget.orientation === "vertical", styles = styledSliderStyle(widget, context.widgets);
  root.className = `styled-slider${vertical ? " vertical" : ""}${styles.thumbSize === 0 ? " hidden-thumb" : ""}`;
  root.dataset.trackMode = styles.trackBarType === false || styles.trackBarType === "none" ? "none" : styles.trackBarType || "normal";
  root.dataset.thumbSize = String(Math.max(4, Math.min(50, Number(styles.thumbSize ?? 16) || 16)));
  for (const [key, value] of Object.entries(sliderStyle(styles))) root.style.setProperty(key, value);
  if (widget.sliderTitle) { const heading = document.createElement("div"); heading.className = "styled-slider-title"; heading.textContent = widget.sliderTitle; heading.style.marginBottom = `${Math.max(0, Math.min(100, Number(widget.sliderTitleSpacing) || 0))}px`; root.append(heading); }
  body.className = `styled-slider-body${widget.stepsInside ? " marks-inside" : widget.stepsAbove ? " marks-above" : " marks-below"}`;
  range.type = "range"; range.className = "styled-slider-input";
  const domain = styledSliderDomain(widget), value = styledSliderValue(widget, context.entry);
  range.min = String(domain.min); range.max = String(domain.valid ? domain.max : domain.min + 1); range.step = String(domain.step); range.value = String(value ?? domain.min);
  range.disabled = !context.runtime || !styledSliderWritable(widget, context.entry);
  range.setAttribute("aria-label", widget.sliderTitle || widget.name || context.label);
  range.setAttribute("aria-orientation", vertical ? "vertical" : "horizontal");
  bubble.className = "styled-slider-value"; bubble.setAttribute("aria-hidden", "true");
  body.append(range, bubble); root.append(body);
  const marks = styledSliderMarks(widget), labelStride = Math.max(1, Math.ceil(marks.length / Math.max(2, Math.floor(Number(vertical ? widget.height : widget.width) / (vertical ? 32 : 55)))));
  marks.forEach((mark, index) => {
    const node = document.createElement("span"); node.className = `styled-slider-mark${mark.endpoint ? " endpoint" : ""}`;
    node.style[vertical ? "bottom" : "left"] = `calc(${mark.percent}% + ${(0.5 - mark.percent / 100) * Number(root.dataset.thumbSize)}px)`;
    if (widget.showSteps) { const tick = document.createElement("i"); node.append(tick); }
    if (mark.endpoint ? widget.showMinMax : index % labelStride === 0 && index < marks.length - labelStride) { const text = document.createElement("span"); text.textContent = `${mark.value}${widget.sliderUnit || ""}`; node.append(text); }
    body.append(node);
  });
  const update = () => updateStyledSlider(root, widget, Number(range.value));
  const end = () => { delete range.dataset.dragging; update(); context.dragEnd(); };
  range.addEventListener("pointerdown", event => { if (range.disabled) return; range.dataset.dragging = "true"; range.setPointerCapture(event.pointerId); update(); });
  range.addEventListener("pointerup", end); range.addEventListener("pointercancel", end); range.addEventListener("lostpointercapture", end);
  range.addEventListener("focus", update); range.addEventListener("blur", () => { bubble.hidden = widget.valueLabelDisplay !== "on"; context.dragEnd(); });
  range.addEventListener("input", () => { if (range.disabled) return; update(); context.input(Number(range.value)); });
  range.addEventListener("change", () => { if (range.disabled) return; delete range.dataset.dragging; update(); context.commit(Number(range.value)); });
  updateStyledSlider(root, widget, value);
  return root;
}
