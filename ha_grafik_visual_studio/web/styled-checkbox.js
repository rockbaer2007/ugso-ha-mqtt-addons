export const checkboxValue = (widget, checked) => {
  const value = widget[checked ? "valueTrue" : "valueFalse"];
  return value === undefined || value === null || value === "" ? checked : value;
};
const comparable = value => {
  if (value === true || value === "true" || value === "on") return 1;
  if (value === false || value === "false" || value === "off") return 0;
  return value !== "" && value !== null && value !== undefined && Number.isFinite(Number(value)) ? Number(value) : value;
};
export const checkboxChecked = (widget, value) => comparable(value) === comparable(checkboxValue(widget, true));
export function checkboxWritable(widget, entry) {
  if (!widget.entityId) return true;
  if (!entry || ["unknown", "unavailable"].includes(entry.state) || widget.entityAttribute) return false;
  const values = [checkboxValue(widget, false), checkboxValue(widget, true)];
  if (/^(switch|light|input_boolean)\.[a-z0-9_]+$/.test(widget.entityId)) return ["on", "off"].includes(entry.state) && values.every(value => ["on", "off", "true", "false", "1", "0"].includes(String(value).toLowerCase()));
  if (/^input_number\.[a-z0-9_]+$/.test(widget.entityId)) return values.every(value => Number.isFinite(Number(value)));
  return /^input_text\.[a-z0-9_]+$/.test(widget.entityId) && values.every(value => String(value).length <= 255);
}
export function checkboxStyle(widget, widgets, seen = new Set()) {
  const local = { boxSize: widget.boxSize ?? 24, boxColor: widget.boxColor, boxColorActive: widget.boxColorActive };
  seen.add(widget.id);
  const source = widgets.find(item => item.type === "styled-checkbox" && item.id === widget.styleFromWidget);
  return source && !seen.has(source.id) ? checkboxStyle(source, widgets, seen) : local;
}
export function renderCheckbox(widget, document, context) {
  const label = document.createElement("label"), input = document.createElement("input"), text = document.createElement("span");
  const position = ["start", "end", "top", "bottom"].includes(widget.textPosition) ? widget.textPosition : "end";
  label.className = `styled-checkbox position-${position}`;
  const styles = checkboxStyle(widget, context.widgets);
  label.style.setProperty("--checkbox-size", `${Math.min(50, Math.max(0, Number(styles.boxSize) || 0))}px`);
  if (styles.boxColor) label.style.setProperty("--checkbox-color", styles.boxColor);
  if (styles.boxColorActive) label.style.setProperty("--checkbox-active", styles.boxColorActive);
  input.type = "checkbox"; input.checked = checkboxChecked(widget, context.value);
  if (Number(styles.boxSize) === 0) input.className = "zero-size";
  input.disabled = !context.runtime || !context.ready || !checkboxWritable(widget, context.entry);
  text.className = "styled-checkbox-text"; text.textContent = String(widget[input.checked ? "textTrue" : "textFalse"] || "");
  input.setAttribute("aria-label", text.textContent || widget.name || "Checkbox");
  text.hidden = !text.textContent;
  if (!context.runtime) label.style.pointerEvents = "none";
  input.addEventListener("change", event => { event.stopPropagation(); if (input.disabled) return; const value = checkboxValue(widget, input.checked); input.disabled = true; context.write(value); if (!widget.entityId) document.getElementById?.(widget.id)?.querySelector?.("input")?.focus(); });
  label.append(input, text); return label;
}
