import { dockPointKey } from "./dock-points.js";
import { numericWidgetInput, lineboxInputSum, lineboxPortRole } from "./linebox.js";
import { mathBoxResult, mathPortRole } from "./linebox-math.js";

export const CONVERSIONS = [
  ["number-text", "Zahl → Text"], ["text-number", "Text → Zahl"],
  ["boolean-number", "Schaltzustand → Zahl"], ["number-boolean", "Zahl → Schaltzustand"],
  ["boolean-text", "Schaltzustand → Text"], ["normalize", "Schaltzustand normalisieren"],
  ["scale", "Zahl skalieren"],
];
const fail = error => ({ value: null, unit: "", type: "none", error });
const packet = (value, unit = "") => !["number", "boolean", "string"].includes(typeof value) || (typeof value === "number" && !Number.isFinite(value)) ? fail("Ungültiger Werttyp oder Zahlenbereich") : ({ value, unit, type: typeof value, error: "" });
const unavailable = value => value === null || value === undefined || String(value).trim() === "" || /^(unknown|unavailable|nan)$/i.test(String(value).trim());
export function parseNumberUnit(value, unit = "") {
  if (unavailable(value) || typeof value === "boolean") throw new Error("Kein gültiger Zahlenwert");
  const match = String(value).trim().match(/^([+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?)\s*([^\d]*)$/i);
  if (!match || !Number.isFinite(Number(match[1].replace(",", ".")))) throw new Error("Kein gültiger Zahlenwert");
  return { value: Number(match[1].replace(",", ".")), unit: match[2].trim() || unit };
}
function booleanValue(value) {
  if (typeof value === "boolean") return value;
  const text = String(value).trim().toLowerCase();
  if (["on", "true", "1"].includes(text)) return true;
  if (["off", "false", "0"].includes(text)) return false;
  throw new Error("Unbekannter Schaltzustand");
}
export function convertPacket(config, input) {
  try {
    if (input.error || unavailable(input.value)) throw new Error(input.error || "Eingangswert fehlt");
    const mode = config.conversion || "text-number";
    if (!CONVERSIONS.some(([id]) => id === mode)) throw new Error("Unbekannte Konvertierung");
    if (["normalize", "boolean-number", "boolean-text"].includes(mode)) {
      let value = booleanValue(input.value); if (config.invert === true) value = !value;
      const format = mode === "boolean-number" ? "number" : mode === "boolean-text" ? "text" : config.booleanFormat || "boolean";
      return packet(format === "number" ? Number(value) : format === "on-off" ? (value ? "on" : "off") : format === "text" ? (value ? config.onText ?? "Ein" : config.offText ?? "Aus") : value);
    }
    let { value, unit } = parseNumberUnit(input.value, input.unit || config.unit || "");
    if (mode === "number-boolean") {
      const threshold = Number(config.threshold ?? 0); if (!Number.isFinite(threshold)) throw new Error("Ungültiger Schwellwert");
      return packet(config.invert === true ? !(value >= threshold) : value >= threshold);
    }
    if (mode === "scale") {
      const factor = Number(config.factor ?? 1), offset = Number(config.offset ?? 0);
      if (![factor, offset].every(Number.isFinite)) throw new Error("Ungültiger Faktor oder Offset");
      value = value * factor + offset; unit = config.unit || unit;
    }
    if (!Number.isFinite(value)) throw new Error("Ergebnis außerhalb des Zahlenbereichs");
    if (mode === "number-text") {
      const decimals = Math.max(0, Math.min(10, Math.trunc(Number(config.decimals) || 0)));
      let text = value.toFixed(decimals); if (config.decimalComma === true) text = text.replace(".", ",");
      return packet(text + (config.includeUnit === true && unit ? ` ${unit}` : ""), unit);
    }
    return packet(value, unit);
  } catch (error) {
    return config.fallbackEnabled === true ? packet(config.fallback ?? "") : fail(error.message);
  }
}
function activeDock(widget, anchor) { return widget?.dockPointsEnabled === true && widget[dockPointKey(anchor)] === true; }
export function widgetValuePacket(widget, widgets, states, visited = new Set(), anchor = "right-center") {
  if (!widget) return fail("Keine Wertquelle verbunden");
  if (visited.has(`data:${widget.id}`)) return fail("Rückkopplung im Datenfluss");
  const next = new Set(visited).add(`data:${widget.id}`);
  if (!activeDock(widget, anchor)) return fail("Ausgangs-Dockpunkt ist nicht aktiv");
  if (widget.type === "linebox-math") {
    if (mathPortRole(widget, anchor) !== "output") return fail("Kein Berechnungsausgang");
    const result = mathBoxResult(widget, widgets, states, visited, anchor); return result.error ? fail(result.error) : packet(result.value);
  }
  if (widget.type === "linebox") {
    if (lineboxPortRole(widget, anchor) !== "output" || widget[`lineboxPass_${anchor.replaceAll("-", "_")}`] !== true) return fail("Kein aktiver LineBox-Ausgang");
    const value = lineboxInputSum(widget, widgets, states, visited); return value === null ? fail("Eingangswert fehlt") : packet(value);
  }
  if (anchor !== (widget.dataOutputAnchor || "right-center")) return fail("Kein Wertausgang an diesem Dockpunkt");
  if (widget.type === "value-converter") return convertPacket(widget, widgetInputPacket(widget, widgets, states, next));
  if (widget.dataInputEnabled === true) return widgetInputPacket(widget, widgets, states, next);
  const entry = states[widget.entityId];
  let value = widget.entityId && widget.numericSource !== "preview" ? entry?.state : widget.state ?? widget.value;
  if (widget.numericSource === "dock") value = numericWidgetInput(widget, widgets, states, visited);
  if (unavailable(value)) return fail("Quelle hat keinen verfügbaren Wert");
  if (widget.type === "sensor") {
    try { const parsed = parseNumberUnit(value, entry?.attributes?.unit_of_measurement || widget.unit || ""); return packet(parsed.value * (Number(widget.factor ?? 1)), parsed.unit); }
    catch (error) { return fail(error.message); }
  }
  return packet(value, entry?.attributes?.unit_of_measurement || widget.unit || "");
}
export function lineValuePacket(line, widgets, states, visited = new Set()) {
  if (visited.has(`data-line:${line.id}`)) return fail("Rückkopplung im Datenfluss");
  const next = new Set(visited).add(`data-line:${line.id}`);
  if (line.startCollector) {
    const [id, pointId] = String(line.startCollector).split(":");
    const parent = widgets.find(widget => widget.type === "svg-connection" && widget.id === id && widget.visible !== false);
    if (!parent?.connectionPoints?.some(point => point.id === pointId && point.collectorEnabled === true)) return fail("Sammelpunkt ist nicht aktiv");
    return lineValuePacket(parent, widgets, states, next);
  }
  return widgetValuePacket(widgets.find(widget => widget.id === line.startWidgetId), widgets, states, next, line.startAnchor || "right-center");
}
export function widgetInputPacket(widget, widgets, states, visited = new Set()) {
  const anchor = widget.dataInputAnchor || "left-center";
  if (!activeDock(widget, anchor)) return fail("Eingangs-Dockpunkt ist nicht aktiv");
  const lines = widgets.filter(line => line.type === "svg-connection" && line.visible !== false && line.endWidgetId === widget.id && (line.endAnchor || "left-center") === anchor);
  if (lines.length !== 1) return fail(lines.length ? "Genau eine Quelle pro Eingang erlaubt" : "Keine Eingangsverbindung");
  return lineValuePacket(lines[0], widgets, states, visited);
}
