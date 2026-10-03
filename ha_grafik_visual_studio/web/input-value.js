export function inputValueDelay(widget) {
  const delay = Number(widget.autoSetDelay);
  return Number.isFinite(delay) && delay > 0 ? delay : 1000;
}

export function inputValueSubmission(widget, value, numberHelper = false) {
  if (!widget.numeric && !numberHelper) return { valid: true, value };
  const number = Number(value);
  if (!String(value).trim() || !Number.isFinite(number)) return { valid: false };
  for (const [key, invalid] of [["min", bound => number < bound], ["max", bound => number > bound]]) {
    if (widget[key] !== undefined && widget[key] !== null && String(widget[key]).trim() !== "" && Number.isFinite(Number(widget[key])) && invalid(Number(widget[key]))) return { valid: false };
  }
  return { valid: true, value: numberHelper || !widget.entityId ? number : String(value) };
}
