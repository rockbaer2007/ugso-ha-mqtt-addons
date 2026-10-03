import { checkboxChecked, checkboxValue, checkboxWritable } from "./styled-checkbox.js";
import { booleanCaption } from "./state-caption.js";

export const SWITCH_STYLE_GROUPS = [
  ["track", ["trackColor", "trackColorTrue", "trackSize", "trackBorderRadius", "trackShadowX", "trackShadowY", "trackShadowBlur", "trackShadowSize", "trackShadowColor", "trackShadowColorTrue"]],
  ["thumb", ["thumbColor", "thumbColorTrue", "thumbSize", "thumbBorderRadius", "thumbShadowX", "thumbShadowY", "thumbShadowBlur", "thumbShadowSize", "thumbShadowColor", "thumbShadowColorTrue"]],
];
export function switchStyle(widget, widgets) {
  const result = {};
  for (const [prefix, keys] of SWITCH_STYLE_GROUPS) {
    let source = widget; const seen = new Set([widget.id]);
    while (source[`${prefix}FromWidget`]) {
      const next = widgets.find(item => item.type === "styled-switch" && item.id === source[`${prefix}FromWidget`]);
      if (!next || seen.has(next.id)) break;
      seen.add(next.id); source = next;
    }
    for (const key of keys) result[key] = source[key];
  }
  return result;
}
const number = (value, fallback, min, max) => Math.min(max, Math.max(min, Number.isFinite(Number(value)) && value !== "" && value != null ? Number(value) : fallback));
export function switchAppearance(style, checked) {
  const trackSize = number(style.trackSize, 12, 1, 50), thumbSize = number(style.thumbSize, 16, 1, 50);
  const shadow = (prefix, fallback) => `${number(style[`${prefix}ShadowX`], 2, -50, 50)}px ${number(style[`${prefix}ShadowY`], 2, -50, 50)}px ${number(style[`${prefix}ShadowBlur`], 2, 0, 50)}px ${number(style[`${prefix}ShadowSize`], 1, -50, 50)}px ${style[`${prefix}ShadowColor${checked ? "True" : ""}`] || fallback}`;
  const width = Math.max(32, thumbSize * 2 + 4, trackSize * 2 + 4);
  return { width, height: Math.max(24, thumbSize, trackSize), trackSize, thumbSize, offset: checked ? width - thumbSize : 0, trackRadius: trackSize / 2 * number(style.trackBorderRadius, 100, 1, 100) / 100, thumbRadius: thumbSize / 2 * number(style.thumbBorderRadius, 100, 1, 100) / 100, trackColor: style[checked ? "trackColorTrue" : "trackColor"] || (checked ? "#8FA455" : "#6E6E6E"), thumbColor: style[checked ? "thumbColorTrue" : "thumbColor"] || (checked ? "#455618" : "#CCCCCC"), trackShadow: shadow("track", "#000000"), thumbShadow: shadow("thumb", "#00000080") };
}

export function renderStyledSwitch(widget, doc, context) {
  const label = doc.createElement("label"), visual = doc.createElement("span"), input = doc.createElement("input"), track = doc.createElement("span"), thumb = doc.createElement("span"), text = doc.createElement("span");
  const position = ["start", "end", "top", "bottom"].includes(widget.textPosition) ? widget.textPosition : "end";
  label.className = `styled-switch position-${position}`;
  input.type = "checkbox"; input.setAttribute("role", "switch"); input.checked = checkboxChecked(widget, context.value);
  input.disabled = !context.runtime || !context.ready || !checkboxWritable(widget, context.entry);
  if (input.disabled) label.className += " switch-disabled";
  text.className = "styled-switch-text"; text.textContent = booleanCaption(widget, input.checked); text.hidden = !text.textContent;
  input.setAttribute("aria-label", text.textContent || widget.name || "Switch");
  const appearance = switchAppearance(switchStyle(widget, context.widgets), input.checked);
  visual.className = "styled-switch-visual"; Object.assign(visual.style, { width: `${appearance.width}px`, height: `${appearance.height}px` });
  track.className = "styled-switch-track"; thumb.className = "styled-switch-thumb";
  track.setAttribute("aria-hidden", "true"); thumb.setAttribute("aria-hidden", "true");
  Object.assign(track.style, { height: `${appearance.trackSize}px`, borderRadius: `${appearance.trackRadius}px`, background: appearance.trackColor, boxShadow: appearance.trackShadow });
  Object.assign(thumb.style, { width: `${appearance.thumbSize}px`, height: `${appearance.thumbSize}px`, borderRadius: `${appearance.thumbRadius}px`, background: appearance.thumbColor, boxShadow: appearance.thumbShadow, transform: `translate(${appearance.offset}px, -50%)` });
  if (!context.runtime) label.style.pointerEvents = "none";
  input.addEventListener("change", event => { event.stopPropagation(); if (input.disabled) return; const next = checkboxValue(widget, input.checked); input.disabled = true; context.write(next); if (!widget.entityId) doc.getElementById?.(widget.id)?.querySelector?.("input")?.focus(); });
  visual.append(track, thumb, input); label.append(visual, text); return label;
}
