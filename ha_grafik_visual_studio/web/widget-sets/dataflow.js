import { registerWidgetSet, getWidgetDefinition } from "../widget-registry.js";
import { cssGroups } from "./core.js";
import "./special.js";

const math = getWidgetDefinition("linebox-math");
const line = getWidgetDefinition("svg-connection");
const compactGroups = groups => groups.map(group => ({ ...group, defaultEnabled: group.css || group.label === "Darstellung" ? false : group.defaultEnabled }));
registerWidgetSet({ id: "ha-grafik-dataflow", label: "HA Grafik – Datenfluss", widgets: [
  { ...structuredClone(math), type: "value-calculation", label: "Wert-Berechnung", runtimeType: "linebox-math", defaults: { ...math.defaults, dataFlowVariant: "value-calculation", hideInRuntime: true }, propertyGroups: compactGroups(math.propertyGroups) },
  { ...structuredClone(line), type: "value-connection", label: "Wert-Verbindung", runtimeType: "svg-connection", defaults: { ...line.defaults, dataFlowVariant: "value-connection", hideInRuntime: true, animationEnabled: false, lineWidth: 2, markerStart: "none", markerEnd: "none" }, propertyGroups: compactGroups(line.propertyGroups.filter(group => !["Animation", "Animationssteuerung"].includes(group.label))) },
  { type: "value-converter", label: "Wert-Konverter", icon: "⇄", preview: { kind: "plain", lines: ["⇄"] },
    defaults: { width: 160, height: 80, backgroundColor: "#12383b", borderColor: "#29c8b5", borderWidth: 1, borderStyle: "solid", radius: 6, conversion: "text-number", dataInputAnchor: "left-center", dataOutputAnchor: "right-center", hideInRuntime: true, decimals: 1, includeUnit: false, booleanFormat: "boolean", invert: false, fallbackEnabled: false, factor: 1, offset: 0, threshold: 0, onText: "Ein", offText: "Aus" },
    propertyGroups: compactGroups([{ label: "Konvertierung", fields: [{ label: "Beschriftung (optional)", key: "title" }] }, ...cssGroups()]),
  },
] });
