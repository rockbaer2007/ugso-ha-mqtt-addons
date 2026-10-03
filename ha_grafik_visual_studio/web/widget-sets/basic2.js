import { registerWidgetSet } from "../widget-registry.js";
import { UNIVERSAL_STYLE_GROUPS, universalColors } from "../universal-element.js";
import { calendarDefinition } from "./calendar.js";
import { eventCalendarDefinition } from "./event-calendar.js";
import { checkboxDefinition } from "./styled-checkbox.js";
import { styledSliderDefinition } from "./styled-slider.js";
import { interactiveTableDefinition } from "./interactive-table.js";
import { marqueeDefinition } from "./marquee.js";
import { valueListDefinition } from "./interactive-value-list.js";
import { switchDefinition } from "./styled-switch.js";
import { radialSliderDefinition } from "./radial-slider.js";
registerWidgetSet({
  id: "ha-grafik-basic2", label: "HA Grafik – Interaktiv",
  widgets: [{
    type: "universal-button", label: "Universal Element", searchTerms: ["State Element", "Zustands-Element"], icon: "◉",
    defaults: {
      title: "", entityId: "", state: "off", interaction: "switch", falseValue: "off", trueValue: "on", targetUrl: "", width: 144, height: 112,
      stateCount: "2", buttonMode: "single", contentLayout: "vertical", contentAlign: "center",
      defaultState: { contentType: "icon", icon: "mdi:lightbulb", text: "", iconColor: "#94a3b8" }, feedback: { duration: 0 },
      visualStates: [
        { condition: "==", value: "off", contentType: "icon", icon: "mdi:lightbulb", text: "", iconColor: "#94a3b8" },
        { condition: "==", value: "on", contentType: "icon", icon: "mdi:lightbulb-on", text: "", iconColor: "#facc15" },
      ],
    },
    propertyGroups: [
      { label: "Allgemein", fields: [
        { label: "Beschriftung (optional)", key: "title" }, { label: "Home-Assistant-Entität", key: "entityId" },
        { label: "Bedienung", key: "interaction", type: "select", refreshProperties: true, options: [
          { value: "switch", label: "Schalten" }, { value: "button", label: "Taster / nächsten Zustand" },
          { value: "read-only", label: "Nur anzeigen" }, { value: "navigation", label: "Navigation" },
        ] },
        { label: "Modus", key: "buttonMode", type: "select", options: [{ value: "single", label: "Einzeltaste" }, { value: "separate", label: "Getrennte Tasten" }] },
        { label: "Wert false", key: "falseValue" }, { label: "Wert true", key: "trueValue" },
        { label: "Vorschau-/Testzustand", key: "state" }, { label: "Ziel-URL für Navigation", key: "targetUrl" },
      ] },
      { id: "ue-feedback", label: "Klick-Feedback", universalModel: "feedback", fields: [{ label: "Klick durchlassen", key: "clickThrough", type: "checkbox", default: false }], modelFields: [
        { label: "Dauer (ms)", key: "duration", type: "range", min: 0, max: 10000, default: 0 }, ...universalColors(),
      ] },
      { id: "ue-default", label: "Standardzustand", universalModel: "defaultState", fields: [] },
      { label: "Zustände und Inhalte", universalStates: true, fields: [{ label: "Anzahl der Zustände", key: "stateCount", type: "select", refreshProperties: true, options: Array.from({ length: 20 }, (_, i) => String(i + 1)) }] },
      ...UNIVERSAL_STYLE_GROUPS,
    ],
  }, calendarDefinition, eventCalendarDefinition, checkboxDefinition, styledSliderDefinition, interactiveTableDefinition, marqueeDefinition, valueListDefinition, switchDefinition, radialSliderDefinition],
});
