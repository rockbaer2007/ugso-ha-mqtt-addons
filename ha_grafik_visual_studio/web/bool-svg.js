export function boolSvgOn(value) {
  const normalized = typeof value === "string" ? value.toLowerCase() : value;
  return !(normalized == null || normalized === false || normalized === "false" || normalized === "off" || parseFloat(normalized) === 0);
}

export function boolSvgNext(value) {
  const normalized = typeof value === "string" ? value.toLowerCase() : value;
  if (normalized == null || normalized === "" || normalized === false || normalized === "false" || normalized === "off") return 1;
  if (normalized === true || normalized === "true" || normalized === "on") return 0;
  return parseFloat(normalized) >= 0.5 ? 0 : 1;
}

export function boolSvgOpacity(value, runtime) {
  const opacity = value == null || value === "" ? 1 : Number(value);
  const bounded = Number.isFinite(opacity) ? Math.max(0, Math.min(1, opacity)) : 1;
  return runtime ? bounded : Math.max(0.2, bounded);
}
