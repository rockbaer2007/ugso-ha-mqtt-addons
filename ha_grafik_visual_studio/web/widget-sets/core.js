import { registerWidgetSet } from "../widget-registry.js";

const geometry = () => [
  { label: "Größe und Position", fields: [{ label: "Breite", key: "width", type: "number" }, { label: "Höhe", key: "height", type: "number" }, { label: "Eckenradius", key: "radius", type: "number" }, { label: "X", key: "x", type: "number" }, { label: "Y", key: "y", type: "number" }] },
];
const common = (entity = true, unit = false) => [
  { label: "Allgemein", fields: [{ label: "Beschriftung", key: "title" }, ...(entity ? [{ label: "Home-Assistant-Entity (Entity-Picker folgt)", key: "entityId" }] : [])] },
  ...geometry(),
  { label: "Darstellung", fields: [{ label: "Symbol", key: "icon" }, { label: "Farbe", key: "color", type: "color" }, ...(unit ? [{ label: "Einheit", key: "unit" }] : [])] },
  { label: "Sichtbarkeit", fields: [{ label: "Anzeigen", key: "visible", type: "checkbox" }] },
];

registerWidgetSet({
  id: "ha-grafik-core",
  label: "HA Grafik – Basis",
  widgets: [
    { type: "button", label: "Schaltfläche", icon: "◉", defaults: { title: "Schaltfläche", entityId: "", state: "Aus" }, propertyGroups: common() },
    { type: "toggle", label: "Schalter", icon: "⏻", defaults: { title: "Schalter", entityId: "", state: "Aus" }, propertyGroups: common() },
    { type: "slider", label: "Regler", icon: "◉", defaults: { title: "Regler", entityId: "", state: "50 %" }, propertyGroups: common() },
    { type: "sensor", label: "Sensorwert", icon: "⌁", defaults: { title: "Sensor", entityId: "", state: "--", unit: "" }, propertyGroups: common(true, true) },
    { type: "text", label: "Text", icon: "T", defaults: { title: "Text", state: "Eigener Text" }, propertyGroups: [{ label: "Allgemein", fields: [{ label: "Beschriftung", key: "title" }, { label: "Textinhalt", key: "state" }] }, ...geometry(), { label: "Darstellung", fields: [{ label: "Farbe", key: "color", type: "color" }] }, { label: "Sichtbarkeit", fields: [{ label: "Anzeigen", key: "visible", type: "checkbox" }] }] },
    { type: "gauge", label: "Messanzeige", icon: "◴", defaults: { title: "Messanzeige", entityId: "", state: "--", unit: "%" }, propertyGroups: common(true, true) },
    { type: "image", label: "Bild / Kamera", icon: "▧", defaults: { title: "Kamera", entityId: "", state: "Bildfläche" }, propertyGroups: common() },
  ],
});
