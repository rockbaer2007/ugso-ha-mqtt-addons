import { registerWidgetSet } from "../widget-registry.js";

const layout = () => ({ label: "Größe und Position", fields: [
  { label: "z-index", key: "layer", type: "number", min: 0, max: 9999 },
  { label: "Breite (px)", key: "width", type: "number", min: 24, max: 7680 },
  { label: "Höhe (px)", key: "height", type: "number", min: 24, max: 4320 },
  { label: "X (px)", key: "x", type: "number", min: 0 }, { label: "Y (px)", key: "y", type: "number", min: 0 },
] });

registerWidgetSet({
  id: "ha-grafik-basic2",
  label: "HA Grafik – Interaktiv",
  widgets: [{
    type: "universal-button",
    label: "Zustands-Element",
    icon: "◉",
    defaults: {
      title: "", entityId: "", state: "off", interaction: "switch", targetUrl: "", width: 144, height: 112,
      stateCount: "2", contentLayout: "vertical", contentAlign: "center",
      visualStates: [
        { condition: "==", value: "off", contentType: "icon", icon: "mdi:lightbulb", image: "", text: "", html: "", iconSize: 48, iconColor: "#94a3b8", imageFit: "contain" },
        { condition: "==", value: "on", contentType: "icon", icon: "mdi:lightbulb-on", image: "", text: "", html: "", iconSize: 48, iconColor: "#facc15", imageFit: "contain" },
      ],
    },
    propertyGroups: [
      { label: "Allgemein", fields: [
        { label: "Beschriftung (optional)", key: "title" },
        { label: "Home-Assistant-Entität", key: "entityId" },
        { label: "Bedienung", key: "interaction", type: "select", options: [
          { value: "switch", label: "Schalter: Zustand wechseln" },
          { value: "button", label: "Button: nächsten Zustand zeigen" },
          { value: "read-only", label: "Nur anzeigen" },
          { value: "navigation", label: "URL öffnen" },
        ] },
        { label: "Vorschau-/Testzustand", key: "state" },
        { label: "Ziel-URL für Navigation", key: "targetUrl" },
        { label: "Inhaltsanordnung", key: "contentLayout", type: "select", options: [
          { value: "vertical", label: "Symbol über Text" }, { value: "horizontal", label: "Symbol neben Text" },
        ] },
        { label: "Ausrichtung", key: "contentAlign", type: "select", options: [
          { value: "center", label: "Zentriert" }, { value: "start", label: "Links / oben" }, { value: "end", label: "Rechts / unten" },
        ] },
      ] },
      { label: "Zustände und Inhalte", universalStates: true, fields: [
        { label: "Anzahl der Zustände", key: "stateCount", type: "select", refreshProperties: true, options: ["1", "2", "3", "4", "5"] },
      ] },
      layout(),
      { label: "Darstellung", fields: [
        { label: "Hintergrundfarbe", key: "backgroundColor", type: "color" },
        { label: "Rahmenfarbe", key: "borderColor", type: "color" },
        { label: "Rahmenbreite (px)", key: "borderWidth", type: "number", min: 0, max: 32 },
        { label: "Eckenradius (px)", key: "radius", type: "number", min: 0, max: 200 },
        { label: "Innenabstand (px)", key: "padding", type: "number", min: 0, max: 120 },
        { label: "Schatten", key: "shadow", type: "checkbox" },
      ] },
    ],
  }],
});
