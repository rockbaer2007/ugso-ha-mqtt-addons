import { stringEntityValue } from "./string-display.js";

export function noteValue(widget, entry, runtime = false) {
  if (!runtime && widget.state) return String(widget.state);
  return String(stringEntityValue(widget, entry) || "");
}

export function noteWritable(widget, entry) {
  return /^input_text\.[a-z0-9_]+$/.test(widget.entityId || "") && !String(widget.entityAttribute || "").trim()
    && !!entry && !["unknown", "unavailable"].includes(entry.state);
}
