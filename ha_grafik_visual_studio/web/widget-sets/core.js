import { registerWidgetSet } from "../widget-registry.js";

const fields = (items) => ({ label: "Größe und Position", fields: items });
const geometry = () => fields([
  { label: "Ebene (ab 0)", key: "layer", type: "number", min: 0, max: 9999 },
  { label: "Breite (px)", key: "width", type: "number", min: 16, max: 7680 },
  { label: "Höhe (px)", key: "height", type: "number", min: 16, max: 4320 },
  { label: "X (px)", key: "x", type: "number", min: 0 },
  { label: "Y (px)", key: "y", type: "number", min: 0 },
]);
const cssGroups = () => [
  { label: "CSS Font & Text", css: true, fields: [
    { label: "Schriftgröße (px)", key: "fontSize", type: "number", min: 6, max: 160 },
    { label: "Schriftstärke", key: "fontWeight", type: "select", options: ["400", "500", "600", "700"] },
    { label: "Textausrichtung", key: "textAlign", type: "select", options: ["left", "center", "right"] },
    { label: "Textfarbe", key: "textColor", type: "color" },
  ] },
  { label: "CSS Hintergrund", css: true, fields: [{ label: "Hintergrundfarbe", key: "backgroundColor", type: "color" }] },
  { label: "CSS Ränder", css: true, fields: [
    { label: "Rahmenfarbe", key: "borderColor", type: "color" },
    { label: "Rahmenbreite (px)", key: "borderWidth", type: "number", min: 0, max: 32 },
    { label: "Eckenradius (px)", key: "radius", type: "number", min: 0, max: 200 },
    { label: "Rahmenstil", key: "borderStyle", type: "select", options: ["solid", "dashed", "dotted", "none"] },
  ] },
  { label: "CSS Schatten und Abstand", css: true, fields: [
    { label: "Innenabstand (px)", key: "padding", type: "number", min: 0, max: 200 },
    { label: "Schatten anzeigen", key: "shadow", type: "checkbox" },
    { label: "Deckkraft", key: "opacity", type: "number", min: 0, max: 1, step: 0.05 },
  ] },
];
const metadata = () => ({ label: "Generell", fields: [
  { label: "Name", key: "title" },
  { label: "Kommentar", key: "comment" },
  { label: "CSS Klasse", key: "cssClass" },
  { label: "Filterwort", key: "filterWord" },
  { label: "multi-views", key: "multiViews" },
] });
const visibility = () => ({ label: "Sichtbarkeit", hint: "Bedingte Sichtbarkeit wird aktiv, sobald die Home-Assistant-Zustandsbindung verfügbar ist.", fields: [
  { label: "Anzeigen", key: "visible", type: "checkbox" },
  { label: "Objekt-ID für Bedingung", key: "visibilityEntityId", disabled: true },
  { label: "Bedingung", key: "visibilityCondition", type: "select", options: ["==", "!=", ">", ">=", "<", "<="], disabled: true },
  { label: "Wert für die Bedingung", key: "visibilityValue", disabled: true },
  { label: "Nur für Gruppen", key: "visibilityGroups", disabled: true },
  { label: "Falls nicht erfüllt", key: "visibilityFallback", type: "select", options: ["ausblenden", "deaktivieren"], disabled: true },
] });
const entityWidget = (unit = false) => [
  metadata(),
  visibility(),
  { label: "Allgemein", fields: [
    { label: "Objekt-ID / Home-Assistant-Entity (Auswahl folgt)", key: "entityId" },
    { label: "HTML voranstellen", key: "prefix" },
    { label: "HTML anhängen (Singular)", key: "suffixSingular" },
    { label: "HTML anhängen (Plural)", key: "suffixPlural" },
    ...(unit ? [{ label: "Einheit", key: "unit" }] : []),
  ] },
  geometry(),
  { label: "Widget-Darstellung", fields: [
    { label: "Symbol", key: "icon" },
    { label: "Akzentfarbe", key: "color", type: "color" },
  ] },
  ...cssGroups(),
];

registerWidgetSet({
  id: "ha-grafik-core",
  label: "HA Grafik – Basis",
  widgets: [
    { type: "button", label: "Schaltfläche", icon: "◉", defaults: { title: "Schaltfläche", entityId: "", state: "Aus" }, propertyGroups: entityWidget() },
    { type: "toggle", label: "Switch", icon: "⏻", defaults: { title: "Schalter", entityId: "", state: "off" }, propertyGroups: [
      metadata(), visibility(),
      { label: "Allgemein", fields: [
        { label: "Home-Assistant-Entity (Auswahl folgt)", key: "entityId" },
        { label: "Zustand", key: "state", type: "select", options: ["off", "on"] },
      ] },
      geometry(), ...cssGroups(),
    ] },
    { type: "checkbox", label: "Checkbox", icon: "☑", defaults: { title: "Checkbox", entityId: "", state: false }, propertyGroups: entityWidget() },
    { type: "bulb", label: "Lampe ein/aus", icon: "💡", defaults: { title: "Lampe", entityId: "", state: false, min: 0, max: 1, icon_off: "", icon_on: "", readOnly: false }, propertyGroups: [
      metadata(), visibility(),
      { label: "Allgemein", fields: [
        { label: "Objekt-ID / Home-Assistant-Entity (Auswahl folgt)", key: "entityId" },
        { label: "Zustand", key: "state", type: "select", options: [{ value: "off", label: "Aus" }, { value: "on", label: "Ein" }] },
        { label: "Minimum", key: "min", type: "number" },
        { label: "Maximum", key: "max", type: "number" },
        { label: "Symbol Aus (Bild-URL)", key: "icon_off" },
        { label: "Symbol Ein (Bild-URL)", key: "icon_on" },
        { label: "Nur lesen", key: "readOnly", type: "checkbox" },
      ] },
      geometry(), ...cssGroups(),
    ] },
    { type: "slider", label: "Slider", icon: "◉", defaults: { title: "Regler", entityId: "", value: 50, min: 0, max: 100, step: 1 }, propertyGroups: [
      metadata(), visibility(),
      { label: "Allgemein", fields: [
        { label: "Objekt-ID / Home-Assistant-Entity (Auswahl folgt)", key: "entityId" },
        { label: "Minimum", key: "min", type: "number" },
        { label: "Maximum", key: "max", type: "number" },
        { label: "Schrittweite", key: "step", type: "number", min: 0.01 },
        { label: "Vorschauwert", key: "value", type: "number" },
      ] },
      geometry(), ...cssGroups(),
    ] },
    { type: "sensor", label: "Zahlenwert", icon: "⌁", defaults: { title: "Sensor", entityId: "", state: "--", unit: "", digits: 1, factor: 1, decimalComma: true }, propertyGroups: [
      metadata(), visibility(),
      { label: "Allgemein", fields: [
        { label: "Objekt-ID / Home-Assistant-Entity (Auswahl folgt)", key: "entityId" },
        { label: "HTML voranstellen", key: "prefix" },
        { label: "HTML anhängen (Singular)", key: "suffixSingular" },
        { label: "HTML anhängen (Plural)", key: "suffixPlural" },
        { label: "Einheit", key: "unit" },
      ] },
      { label: "Zahlenformat", fields: [
        { label: "Nachkommastellen", key: "digits", type: "number", min: 0, max: 10 },
        { label: "Multiplikator", key: "factor", type: "number", step: 0.1 },
        { label: "Dezimalkomma verwenden", key: "decimalComma", type: "checkbox" },
      ] },
      geometry(), ...cssGroups(),
    ] },
    { type: "text", label: "Text", icon: "T", defaults: { title: "Text", textContent: "Eigener Text", backgroundColor: "", borderWidth: 0, borderStyle: "none" }, propertyGroups: [
      metadata(), visibility(),
      { label: "Text", fields: [
        { label: "Inhalt", key: "textContent", type: "textarea" },
      ] },
      geometry(), ...cssGroups(),
    ] },
    { type: "border", label: "Rahmen", icon: "▱", defaults: { title: "Titel", borderColor: "#1688e7", borderWidth: 1, borderStyle: "solid", backgroundColor: "", titleBackground: "", titleColor: "#e7ecee", titleTopOffset: -9, titleLeftOffset: 16, headerHeight: 0, headerColor: "" }, propertyGroups: [
      metadata(), visibility(),
      { label: "Allgemein", fields: [
        { label: "Titel", key: "title" },
        { label: "Titelhintergrund", key: "titleBackground", type: "color" },
        { label: "Titel-Oben-Abstand (px)", key: "titleTopOffset", type: "number" },
        { label: "Titel-Links-Abstand (px)", key: "titleLeftOffset", type: "number" },
        { label: "Kopfhöhe (px)", key: "headerHeight", type: "number", min: 0 },
        { label: "Kopffarbe", key: "headerColor", type: "color" },
        { label: "Titelfarbe", key: "titleColor", type: "color" },
      ] },
      geometry(), ...cssGroups(),
    ] },
    { type: "gauge", label: "Messanzeige", icon: "◴", defaults: { title: "Messanzeige", entityId: "", state: "--", unit: "%" }, propertyGroups: entityWidget(true) },
    { type: "image", label: "Bild / Kamera", icon: "▧", defaults: { title: "Kamera", entityId: "", state: "Bildfläche" }, propertyGroups: entityWidget() },
  ],
});
