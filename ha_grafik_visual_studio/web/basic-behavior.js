// Independent HA implementation of the Basic contracts. Legacy modes stay valid.
export function basicOn(widget, value, fallback) {
  if (widget.booleanMode !== "reference") return fallback(value);
  const normalize = value => value === "true" ? true : value === "false" ? false : value;
  if (widget.min !== "" && widget.min != null) {
    // Reference states use equal on/off sentinels, rather than a numeric threshold.
    return widget.max !== "" && widget.max != null ? normalize(value) == normalize(widget.max) : normalize(value) != normalize(widget.min);
  }
  if (value == null || value === false || ["", "false", "off"].includes(String(value).toLowerCase())) return false;
  const number = parseFloat(value);
  return Number.isNaN(number) || number !== 0;
}
export function ackValue(widget, states, fallback) {
  if (widget.ackMode !== "entity") return fallback;
  const entry = states[widget.ackEntityId];
  if (!entry) return undefined;
  return widget.ackAttribute ? entry.attributes?.[widget.ackAttribute] : entry.state;
}
export function groupVisible(required, groups) {
  const allowed = String(required || "").split(/[;,\s]+/).filter(Boolean);
  return !allowed.length || allowed.some(id => groups.includes(id));
}
export function basicDate(value, format = "auto", relative = false, locale = "de", now = Date.now(), unit = "auto") {
  let date = new Date(value);
  if (typeof value === "number" || /^\d{10,13}$/.test(String(value))) {
    const number = Number(value); date = new Date(unit === "seconds" || unit === "auto" && Math.abs(number) < 1e11 ? number * 1000 : number);
  }
  if (!Number.isFinite(date.getTime())) return "--";
  if (relative) {
    const seconds = (date.getTime() - now) / 1000, absolute = Math.abs(seconds);
    const [unit, divisor] = absolute < 60 ? ["second", 1] : absolute < 3600 ? ["minute", 60] : absolute < 86400 ? ["hour", 3600] : ["day", 86400];
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(Math.round(seconds / divisor), unit);
  }
  if (!format || format === "auto") return new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "medium" }).format(date);
  const pad = (n, size = 2) => String(n).padStart(size, "0");
  const part = (options) => new Intl.DateTimeFormat(locale, options).format(date);
  const tokens = { YYYY: date.getFullYear(), YY: pad(date.getFullYear() % 100), MMMM: part({ month: "long" }), MMM: part({ month: "short" }), MM: pad(date.getMonth() + 1), M: date.getMonth() + 1, DD: pad(date.getDate()), D: date.getDate(), dddd: part({ weekday: "long" }), ddd: part({ weekday: "short" }), HH: pad(date.getHours()), H: date.getHours(), hh: pad(date.getHours() % 12 || 12), h: date.getHours() % 12 || 12, mm: pad(date.getMinutes()), m: date.getMinutes(), ss: pad(date.getSeconds()), s: date.getSeconds(), SSS: pad(date.getMilliseconds(), 3), A: date.getHours() < 12 ? "AM" : "PM" };
  return String(format).replace(/\[[^\]]*\]|YYYY|MMMM|dddd|MMM|ddd|SSS|YY|MM|DD|HH|hh|mm|ss|M|D|H|h|m|s|A/g, token => token.startsWith("[") ? token.slice(1, -1) : String(tokens[token]));
}
export function qualityClass(widget, states) {
  const value = states[widget.qualityEntityId]?.state;
  return String([true, "true", "on", 1, "1"].includes(value) ? widget.qualityClassTrue || "" : widget.qualityClassFalse || "").split(/\s+/).filter(name => /^[A-Za-z_][\w-]*$/.test(name));
}
export function speechResult(text, keywords, mode) {
  const entries = String(keywords || "").split(/[;\n]/).map(value => value.trim()).filter(Boolean);
  if (mode !== "keywords" || !entries.length) return String(text).trim();
  return entries.find(value => String(text).toLocaleLowerCase().includes(value.toLocaleLowerCase())) || "";
}
