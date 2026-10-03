import { registerWidgetSet } from "../widget-registry.js";

const fields = (items) => ({ label: "Größe und Position", fields: items });
const sliderShadow = (label, prefix) => ({ label, fields: [
  { label: "X-Versatz (px)", key: `${prefix}ShadowX`, type: "number", min: -100, max: 100, default: 0 },
  { label: "Y-Versatz (px)", key: `${prefix}ShadowY`, type: "number", min: -100, max: 100, default: 0 },
  { label: "Unschärfe (px)", key: `${prefix}ShadowBlur`, type: "number", min: 0, max: 100, default: 0 },
  { label: "Ausdehnung (px)", key: `${prefix}ShadowSize`, type: "number", min: -100, max: 100, default: 0 },
  { label: "Schattenfarbe (CSS / RGBA)", key: `${prefix}ShadowColor`, default: "rgba(0,0,0,0.5)" },
] });
const geometry = () => fields([
  { label: "z-index", key: "layer", type: "number", min: 0, max: 9999 },
  { label: "Breite (px)", key: "width", type: "number", min: 16, max: 7680 },
  { label: "Höhe (px)", key: "height", type: "number", min: 16, max: 4320 },
  { label: "X (px)", key: "x", type: "number", min: 0 },
  { label: "Y (px)", key: "y", type: "number", min: 0 },
]);
export const cssGroups = () => [
  { label: "CSS Allgemein", css: true, fields: [
    { label: "position", key: "cssPosition", type: "select", options: ["", "absolute", "relative", "static", "fixed"] },
    { label: "display", key: "cssDisplay", type: "select", options: ["", "block", "inline", "inline-block", "flex", "grid", "none"] },
    { label: "left", key: "cssLeft" }, { label: "top", key: "cssTop" },
    { label: "width", key: "cssWidth" }, { label: "height", key: "cssHeight" },
    { label: "z-index", key: "cssZIndex", type: "number" },
    { label: "overflow-x", key: "cssOverflowX", type: "select", options: ["", "visible", "hidden", "auto", "scroll"] },
    { label: "overflow-y", key: "cssOverflowY", type: "select", options: ["", "visible", "hidden", "auto", "scroll"] },
    { label: "opacity", key: "opacity", type: "range", min: 0, max: 1, step: 0.05 },
    { label: "cursor", key: "cssCursor" }, { label: "transform", key: "cssTransform" },
  ] },
  { label: "CSS Font & Text", css: true, fields: [
    { label: "Farbe", key: "textColor", type: "color" },
    { label: "Schriftstärke", key: "fontWeight", type: "select", options: ["400", "500", "600", "700"] },
    { label: "Textausrichtung", key: "textAlign", type: "select", options: ["left", "center", "right"] },
    { label: "text-shadow", key: "textShadow" }, { label: "font-family", key: "fontFamily" },
    { label: "font-style", key: "fontStyle", type: "select", options: ["", "normal", "italic", "oblique"] },
    { label: "font-variant", key: "fontVariant", type: "select", options: ["", "normal", "small-caps"] },
    { label: "font-size", key: "fontSize", type: "number", min: 6, max: 160 },
    { label: "line-height", key: "lineHeight" }, { label: "letter-spacing", key: "letterSpacing" }, { label: "word-spacing", key: "wordSpacing" },
  ] },
  { label: "CSS Hintergrund", css: true, fields: [
    { label: "background-color", key: "backgroundColor", type: "color" }, { label: "background-image", key: "backgroundImage" },
    { label: "background-repeat", key: "backgroundRepeat", type: "select", options: ["", "repeat", "no-repeat", "repeat-x", "repeat-y"] },
    { label: "background-attachment", key: "backgroundAttachment", type: "select", options: ["", "scroll", "fixed", "local"] },
    { label: "background-position", key: "backgroundPosition" }, { label: "background-size", key: "backgroundSize" },
    { label: "background-clip", key: "backgroundClip", type: "select", options: ["", "border-box", "padding-box", "content-box"] },
    { label: "background-origin", key: "backgroundOrigin", type: "select", options: ["", "border-box", "padding-box", "content-box"] },
  ] },
  { label: "CSS Ränder", css: true, fields: [
    { label: "Rahmenfarbe", key: "borderColor", type: "color" },
    { label: "Rahmenbreite (px)", key: "borderWidth", type: "number", min: 0, max: 32 },
    { label: "Eckenradius (px)", key: "radius", type: "number", min: 0, max: 200 },
    { label: "Rahmenstil", key: "borderStyle", type: "select", options: ["solid", "dashed", "dotted", "none"] },
  ] },
  { label: "CSS Schatten und Abstand", css: true, fields: [
    { label: "Abstand", key: "padding", type: "number", min: 0, max: 200 },
    { label: "padding-left", key: "paddingLeft" }, { label: "padding-top", key: "paddingTop" },
    { label: "padding-right", key: "paddingRight" }, { label: "padding-bottom", key: "paddingBottom" },
    { label: "box-shadow", key: "boxShadow" },
    { label: "margin-left", key: "marginLeft" }, { label: "margin-top", key: "marginTop" },
    { label: "margin-right", key: "marginRight" }, { label: "margin-bottom", key: "marginBottom" },
    { label: "Schatten aktivieren", key: "shadow", type: "checkbox" },
  ] },
];
const signalImages = () => ({ label: "Signalbilder", masterKey: "signalImagesEnabled", defaultEnabled: false, signalImages: true, fields: [
  { label: "Anzahl der Signale", key: "signalCount", type: "select", refreshProperties: true, options: Array.from({ length: 10 }, (_, index) => String(index)) },
] , hint: "Zustandsabhängige Bild-Overlays, zum Beispiel für Warnungen oder Batteriestände. In der Runtime gilt der Live-Zustand einer gebundenen Entität." });
const metadata = () => ({ label: "Generell", hint: "Der Name ist optional. Lass ihn leer, wenn du das Widget zum Beispiel über ein separates Textfeld beschriftest.", fields: [
  { label: "Name", key: "title" },
  { label: "Kommentar", key: "comment" },
  { label: "CSS Klasse", key: "cssClass" },
  { label: "Filterwort", key: "filterWord" },
  { label: "multi-views", key: "multiViews" },
] });
const visibility = () => ({ label: "Sichtbarkeit", hint: "Bedingte Sichtbarkeit wird aktiv, sobald die Home-Assistant-Zustandsbindung verfügbar ist.", fields: [
  { label: "Anzeigen", key: "visible", type: "checkbox" },
  { label: "Entität für Bedingung", key: "visibilityEntityId", disabled: true },
  { label: "Bedingung", key: "visibilityCondition", type: "select", options: ["==", "!=", ">", ">=", "<", "<="], disabled: true },
  { label: "Wert für die Bedingung", key: "visibilityValue", disabled: true },
  { label: "Nur für Gruppen", key: "visibilityGroups", disabled: true },
  { label: "Falls nicht erfüllt", key: "visibilityFallback", type: "select", options: ["ausblenden", "deaktivieren"], disabled: true },
] });
const entityWidget = (unit = false) => [
  metadata(),
  visibility(),
  { label: "Allgemein", fields: [
    { label: "Home-Assistant-Entität", key: "entityId" },
    { label: "HTML voranstellen", key: "prefix" },
    { label: "HTML anhängen (Singular)", key: "suffixSingular" },
    { label: "HTML anhängen (Plural)", key: "suffixPlural" },
    ...(unit ? [{ label: "Einheit", key: "unit" }] : []),
  ] },
  geometry(),
  { label: "Widget-Darstellung", fields: [
    { label: "Symbol", key: "icon", previewImage: true },
    { label: "Akzentfarbe", key: "color", type: "color" },
  ] },
  ...cssGroups(),
];
const basicDataWidget = (type, label, icon, defaults, dataFields, hint = "Ohne Entität gilt der Vorschauwert; eine gebundene Entität liefert in der Runtime ihren aktuellen Zustand.") => ({
  type, label, icon, defaults,
  propertyGroups: [
    metadata(), visibility(),
    { label: "Daten", ...(hint ? { hint } : {}), fields: dataFields },
    geometry(), ...cssGroups().map(group => ["value-list-html", "value-list-html-style", "bool-display", "table"].includes(type) ? { ...group, defaultEnabled: false } : group),
  ],
});
const dateFormats = ["YYYY-MM-DD HH:mm:ss", "DD.MM.YYYY HH:mm:ss", "DD.MM.YYYY HH:mm", "YYYY-MM-DD", "HH:mm:ss"];
const htmlAdditions = () => [{ label: "HTML voranstellen", key: "prefix" }, { label: "HTML anhängen", key: "suffix" }];
const entityTest = () => [{ label: "Home-Assistant-Entität", key: "entityId" }, { label: "Testwert", key: "state" }];
const refreshFields = () => [{ label: "Updatezeit (ms)", key: "refreshInterval", type: "range", min: 0, max: 180000, step: 100, default: 0 }, { label: "Update bei Aufwachen", key: "refreshOnWake", type: "checkbox", default: false }, { label: "Update bei Viewwechsel", key: "refreshOnView", type: "checkbox", default: false }, { label: "Addiere nichts zu URL", key: "noCacheBuster", type: "checkbox", default: false }];
const imageFields = () => [{ label: "Strecken", key: "stretch", type: "checkbox", default: false }, ...refreshFields(), { label: "allowUserInteractions", key: "allowUserInteractions", type: "checkbox", default: false }];
const frameFields = () => [...refreshFields(), { label: "Scroll X", key: "scrollX", type: "checkbox", default: false }, { label: "Scroll Y", key: "scrollY", type: "checkbox", default: false }, { label: "Kein Rahmen", key: "noFrame", type: "checkbox", default: true }];
const palettePreviews = {
  sensor: { kind: "number", lines: ["VAL", "53.27 MB"] },
  string: { kind: "code", lines: ["TEXT", "value"] },
  "string-raw": { kind: "code", lines: ["<div>", "</div>"] },
  "image-source": { kind: "image", lines: [] },
  "time-value": { kind: "time", lines: ["20.06.31", "16:51:56"] },
  "timestamp-value": { kind: "time", lines: ["20.06.31", "16:51:56"] },
  timestamp: { kind: "time", lines: ["20.06.31", "16:51:56"] },
  "last-changed": { kind: "time", lines: ["20.06.31", "16:51:56"] },
  "value-list-text": { kind: "list", lines: ["TEXT3", "TEXT2", "TEXT1"] },
  "value-list-html": { kind: "code", lines: ["<div>", "</div>"] },
  "value-list-html-style": { kind: "code", lines: ["<div>", "style", "</div>"] },
  "bool-display": { kind: "code", lines: ["TRUE", "FALSE"] },
  "ackflag-html": { kind: "code", lines: ["ACK TRUE", "ACK FALSE"] },
  checkbox: { kind: "control", lines: ["ctrl", "□"] },
  "bool-select": { kind: "control", lines: ["ctrl", "▾"] },
  "bool-html-control": { kind: "code", lines: ["TRUE", "FALSE"] },
  "html-state": { kind: "control", lines: ["value", "▾"] },
  table: { kind: "table", lines: ["TITLE", "VALUE", "ROW", "21°"] },
  fullscreen: { kind: "fullscreen", lines: ["⛶"] },
  bar: { kind: "bar", lines: ["35%"] },
  bulb: { kind: "bulb", lines: ["💡"] },
  image: { kind: "image", lines: [] },
  "image-8": { kind: "image", lines: [] },
  link: { kind: "plain", lines: ["↗"] },
  navigation: { kind: "plain", lines: ["➜"] },
  html: { kind: "code", lines: ["<html>", "</html>"] },
  note: { kind: "plain", lines: ["▤"] },
  "screen-resolution": { kind: "time", lines: ["1920", "1080"] },
  "red-number": { kind: "plain", lines: ["●"] },
  "bool-svg": { kind: "plain", lines: ["◇"] },
  "svg-shape": { kind: "plain", lines: ["◯"] },
  "input-value": { kind: "control", lines: ["input", "⌨"] },
};
const previousWidgetLabels = {
  "bool-svg": "Boolesches SVG", "input-value": "Eingegebener Wert", checkbox: "Checkbox",
  bulb: "Lampe ein/aus", "bool-html-control": "Bool HTML-Steuerung",
  "filter-dropdown": "Filter Dropdown", border: "Rahmen", image: "Bild / Kamera",
};

registerWidgetSet({
  id: "ha-grafik-core",
  label: "HA Grafik – Basis",
  widgets: [
    basicDataWidget("link", "link", "↗", { htmlContent: "Link", linkUrl: "" }, [{ label: "HTML", key: "htmlContent", type: "html" }, { label: "Link", key: "linkUrl" }], "HTML-Link mit frei formatiertem Inhalt."),
    basicDataWidget("note", "Note", "▤", { state: "Notiz", backgroundColor: "rgba(255,255,105,0.8)", hideCorner: false }, [...entityTest(), ...htmlAdditions(), { label: "Testtext (HTML)", key: "state", type: "html" }, { label: "Ecke ausblenden", key: "hideCorner", type: "checkbox", default: false }]),
    basicDataWidget("screen-resolution", "Screen Resolution", "▣", {}, [], "Reine Anzeige der aktuellen Fensterauflösung; aktualisiert sich bei Größenänderung."),
    basicDataWidget("red-number", "Red Number", "●", { state: 0, badgeType: "circle", radius: 16, badgeBackground: "#c62828", badgeBorder: "#c62828" }, [...entityTest(), { label: "type", key: "badgeType", type: "select", options: ["circle", "pin"], refreshProperties: true }, { label: "HTML voranstellen", key: "prefix" }, { label: "HTML anhängen (Singular)", key: "suffixSingular" }, { label: "HTML anhängen (Plural)", key: "suffixPlural" }, { label: "Hintergrund", key: "badgeBackground", type: "color" }, { label: "Randfarbe", key: "badgeBorder", type: "color", showWhen: { key: "badgeType", value: "circle" } }, { label: "Grenzradius", key: "radius", type: "range", min: 0, max: 100, step: 1, showWhen: { key: "badgeType", value: "circle" } }]),
    basicDataWidget("bool-svg", "Bool SVG", "◇", { state: false, readOnly: false, svgFalse: "<circle cx='50' cy='50' r='40' fill='#777'/>", svgTrue: "<circle cx='50' cy='50' r='40' fill='#29c8b5'/>", svgOpacity: 1 }, [...entityTest(), { label: "Nur Anzeige", key: "readOnly", type: "checkbox", default: false }, { label: "SVG bei false", key: "svgFalse", type: "html" }, { label: "SVG bei true", key: "svgTrue", type: "html" }, { label: "Durchsichtigkeit", key: "svgOpacity", type: "range", min: 0, max: 1, step: 0.05 }]),
    basicDataWidget("svg-shape", "SVG shape", "◯", { shape: "circle", strokeColor: "#009cb3", fillColor: "#00b3ac", strokeWidth: 5, rotation: 0, scaleX: 1, scaleY: 1, pointCount: 3 }, [{ label: "Typ", key: "shape", type: "select", options: ["line", "triangle", "square", "pentagon", "hexagon", "octagon", "circle", "star", "arrow", "custom"], refreshProperties: true }, { label: "Linienfarbe", key: "strokeColor", type: "color" }, { label: "Füllfarbe", key: "fillColor", type: "color" }, { label: "Linienbreite", key: "strokeWidth", type: "range", min: 0, max: 20, step: 1 }, { label: "Drehen", key: "rotation", type: "range", min: 0, max: 360, step: 1 }, { label: "Breitenskala", key: "scaleX", type: "range", min: 0, max: 1, step: 0.01 }, { label: "Höhenskala", key: "scaleY", type: "range", min: 0, max: 1, step: 0.01 }, { label: "Punkteanzahl", key: "pointCount", type: "range", min: 3, max: 20, step: 1, showWhen: { key: "shape", value: "custom" } }], "Eigene SVG-Geometrie ohne externe Grafiken."),
    basicDataWidget("input-value", "Input val", "⌨", { state: "", variant: "standard", withEnter: false }, [...entityTest(), ...htmlAdditions(), ...[["Nummer", "numeric"], ["Auto-setzen", "autoSet"], ["nur lesend", "readOnly"], ["Autofokus", "autofocus"], ["Kein Style", "noStyle"], ["withEnter", "withEnter"]].map(([label, key]) => ({ label, key, type: "checkbox", default: false })), { label: "variant", key: "variant", type: "select", options: ["standard", "filled", "outlined"] }], "Schreibt im Runtime-Modus in input_number oder input_text; ohne Entität bleibt die Eingabe lokal."),
    { type: "tabs", label: "Tabs", icon: "▤", defaults: { title: "Tabs", width: 500, height: 300, tabCount: 4, tabsVertical: false, tabsVariant: "standard", tabsColor: "#9f99bb" }, propertyGroups: [
      metadata(), visibility(),
      { label: "Tabs", fields: [
        { label: "Anzahl der Tabs", key: "tabCount", type: "number", min: 1, max: 20, default: 4, refreshProperties: true },
        { label: "Vertikale Tabs", key: "tabsVertical", type: "checkbox", default: false, refreshProperties: true },
        { label: "Tab-Variante", key: "tabsVariant", type: "select", default: "standard", showWhen: { key: "tabsVertical", value: false }, options: [{ value: "standard", label: "Standard" }, { value: "centered", label: "zentriert" }, { value: "fullWidth", label: "Gesamtbreite" }] },
        { label: "Tab-Farbe", key: "tabsColor", type: "color", default: "#9f99bb" },
        { label: "Textfarbe aktiv", key: "tabsActiveTextColor", type: "color" },
        { label: "Textfarbe nicht aktiv", key: "tabsInactiveTextColor", type: "color" },
        { label: "Inaktive Reiter abdunkeln (%)", key: "tabsInactiveDim", type: "range", min: 0, max: 90, step: 1, default: 0 },
      ] }, geometry(), ...cssGroups(),
    ] },
    basicDataWidget("view-in-widget", "View in widget", "▣", {}, [{ label: "Seite", key: "targetPage", type: "page" }], "Bettet eine gespeicherte Projektseite ein; rekursive Einbettung wird verhindert."),
    basicDataWidget("view-in-widget-8", "View in widget 8", "▣", { state: 0, count: 1 }, [...entityTest(), { label: "Werteanzahl bis", key: "count", type: "number", min: 1, max: 50, refreshProperties: true }]),
    basicDataWidget("iframe", "iFrame", "▣", { source: "", noFrame: true }, [{ label: "Quelle", key: "source" }, { label: "Kein Sandkasten", key: "noSandbox", type: "checkbox", default: false }, ...frameFields()], "Die Zielseite muss Einbettung erlauben."),
    basicDataWidget("iframe-8", "iFrame 8", "▣", { state: 0, count: 2, noFrame: true }, [...entityTest(), ...frameFields(), { label: "Werteanzahl bis", key: "count", type: "range", min: 1, max: 20, step: 1, refreshProperties: true }]),
    basicDataWidget("image-8", "Image 8", "▧", { state: 0, count: 1 }, [...entityTest(), { label: "Werteanzahl bis", key: "count", type: "number", min: 1, max: 50, refreshProperties: true }, ...imageFields()]),
    basicDataWidget("ackflag-html", "AckFlag HTML", "✓", { state: false, htmlTrue: "Bestätigt", htmlFalse: "Ausstehend" }, [...entityTest(), ...htmlAdditions(), { label: "HTML bei false", key: "htmlFalse", type: "html" }, { label: "HTML bei true", key: "htmlTrue", type: "html" }], "Home Assistant hat kein ioBroker-ack-Flag. Stattdessen kann eine eigene Bestätigungsentität als Live-Zustand dienen."),
    { type: "button", label: "Icon Toggle Button", searchTerms: ["Schaltfläche (Icon Ein/Aus)"], icon: "◉", defaults: { title: "Icon Toggle Button", entityId: "", state: "off", icon_off: "", icon_on: "", readOnly: false }, propertyGroups: [
      metadata(), visibility(),
      { label: "Allgemein", fields: [
        { label: "Home-Assistant-Entität", key: "entityId" },
        { label: "Zustand", key: "state", type: "select", options: [{ value: "off", label: "Aus" }, { value: "on", label: "Ein" }] },
        { label: "Icon für Aus (Bild-URL)", key: "icon_off", previewImage: true },
        { label: "Icon für Ein (Bild-URL)", key: "icon_on", previewImage: true },
        { label: "Nur lesen", key: "readOnly", type: "checkbox" },
      ] },
      geometry(), ...cssGroups(),
    ] },
    { type: "toggle", label: "Switch", icon: "⏻", defaults: { title: "Schalter", entityId: "", state: "off" }, propertyGroups: [
      metadata(), visibility(),
      { label: "Allgemein", fields: [
        { label: "Home-Assistant-Entität", key: "entityId" },
        { label: "Zustand", key: "state", type: "select", options: ["off", "on"] },
      ] },
      geometry(), ...cssGroups(),
    ] },
    { type: "checkbox", label: "Bool Checkbox", icon: "☑", defaults: { title: "Checkbox", entityId: "", state: false }, propertyGroups: entityWidget() },
    { type: "bulb", label: "Bulb on/off", icon: "💡", defaults: { title: "Lampe", entityId: "", state: false, min: 0, max: 1, icon_off: "", icon_on: "", readOnly: false }, propertyGroups: [
      metadata(), visibility(),
      { label: "Allgemein", fields: [
        { label: "Home-Assistant-Entität", key: "entityId" },
        { label: "Zustand", key: "state", type: "select", options: [{ value: "off", label: "Aus" }, { value: "on", label: "Ein" }] },
        { label: "Minimum", key: "min", type: "number" },
        { label: "Maximum", key: "max", type: "number" },
        { label: "Symbol Aus (Bild-URL)", key: "icon_off", previewImage: true },
        { label: "Symbol Ein (Bild-URL)", key: "icon_on", previewImage: true },
        { label: "Nur lesen", key: "readOnly", type: "checkbox" },
      ] },
      geometry(), ...cssGroups(),
    ] },
    { type: "slider", label: "Slider", icon: "◉", defaults: { title: "Regler", entityId: "", value: 50, min: 0, max: 100, step: 1, showMinMax: false }, propertyGroups: [
      metadata(), visibility(),
      { label: "Allgemein", fields: [
        { label: "Home-Assistant-Entität", key: "entityId" },
        { label: "Minimum", key: "min", type: "number" },
        { label: "Maximum", key: "max", type: "number" },
        { label: "Schrittweite", key: "step", type: "number", min: 0.01 },
        { label: "Min-/Max-Werte anzeigen", key: "showMinMax", type: "checkbox", default: false },
        { label: "Skalenposition", key: "scalePosition", type: "select", default: "below", options: [{ value: "above", label: "Oben" }, { value: "below", label: "Unten" }] },
        { label: "Zwischenmarkierungen (0 = aus)", key: "scaleSteps", type: "number", min: 0, step: 1, default: 0 },
        { label: "Werte der Zwischenmarkierungen anzeigen", key: "showStepValues", type: "checkbox", default: false },
        { label: "Vorschauwert", key: "value", type: "number" },
      ] },
      { label: "Slider-Schiene", fields: [
        { label: "Schienenfarbe", key: "sliderRailColor", type: "color", default: "#6e6e6e" },
        { label: "Aktive Schienenfarbe", key: "sliderRailActiveColor", type: "color", default: "#29c8b5" },
        { label: "Spurtyp", key: "trackBarType", type: "select", default: "normal", options: [{ value: "normal", label: "Normal" }, { value: "inverted", label: "Umgekehrt" }, { value: "none", label: "Ohne aktive Spur" }] },
        { label: "Schienenstärke (px)", key: "trackWidth", type: "number", min: 1, max: 64, default: 6 },
        { label: "Schienenradius (%)", key: "trackBorderRadius", type: "number", min: 0, max: 100, default: 100 },
      ] },
      sliderShadow("Schienenschatten", "track"),
      { label: "Slider-Regler", fields: [
        { label: "Reglerfarbe", key: "sliderThumbColor", type: "color", default: "#29c8b5" },
        { label: "Reglergröße (px)", key: "thumbSize", type: "number", min: 4, max: 64, default: 16 },
        { label: "Reglerradius (%)", key: "thumbBorderRadius", type: "number", min: 0, max: 100, default: 100 },
      ] },
      sliderShadow("Reglerschatten", "thumb"),
      geometry(), ...cssGroups(),
    ] },
    { type: "sensor", label: "Number", searchTerms: ["Zahlenwert"], icon: "⌁", defaults: { title: "Number", entityId: "", state: "--", unit: "", digits: 1, factor: 1, decimalComma: true }, propertyGroups: [
      metadata(), visibility(),
      { label: "Allgemein", fields: [
        { label: "Home-Assistant-Entität", key: "entityId" },
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
    basicDataWidget("string", "String", "T", { title: "Textwert", entityId: "", state: "Beispieltext", prefix: "", suffix: "" }, [
      { label: "Home-Assistant-Entity", key: "entityId" }, { label: "Testwert", key: "state" },
      { label: "HTML voranstellen", key: "prefix" }, { label: "HTML anhängen", key: "suffix" },
    ], "Der Zustand wird als Text ausgegeben, vorangestellter und angehängter HTML-Code als HTML. In der Runtime wird eine gebundene Entität gelesen."),
    basicDataWidget("string-raw", "String (unescaped)", "<>…", { title: "HTML-Wert", entityId: "", state: "<strong>Beispiel</strong>", prefix: "", suffix: "" }, [
      { label: "Home-Assistant-Entity", key: "entityId" }, { label: "Testwert (HTML)", key: "state", type: "textarea" },
      { label: "HTML voranstellen", key: "prefix", type: "textarea" }, { label: "HTML anhängen", key: "suffix", type: "textarea" },
    ]),
    basicDataWidget("image-source", "String img src", "▧", { title: "Bild aus Entity", entityId: "", state: "", alt: "Bild" }, [
      { label: "Home-Assistant-Entity", key: "entityId" }, { label: "Bild-URL / Testwert", key: "state", previewImage: true }, { label: "Alternativtext", key: "alt" },
    ]),
    ...[
      ["time-value", "TimesValue", "◷", "state"], ["timestamp-value", "Timestamp Value", "◷", "state"],
      ["timestamp", "Timestamp", "◷", "lastUpdated"], ["last-changed", "Last change Timestamp", "◷", "lastChanged"],
    ].map(([type, label, icon, sourceKey]) => basicDataWidget(type, label, icon, {
      title: label, entityId: "", state: "2026-09-30T12:00:00.000Z", lastUpdated: "2026-09-30T12:00:00.000Z", lastChanged: "2026-09-30T11:45:00.000Z", dateFormat: "DD.MM.YYYY HH:mm:ss", showInterval: false,
    }, [
      { label: "Home-Assistant-Entity", key: "entityId" }, { label: "Testwert / Zeitstempel", key: sourceKey },
      { label: "Datumsformat", key: "dateFormat", type: "select", options: dateFormats },
      { label: "Relative Zeit anzeigen", key: "showInterval", type: "checkbox" },
      ...htmlAdditions(),
    ])),
    ...[
      ["value-list-text", "ValueList Text"], ["value-list-html", "ValueList HTML"], ["value-list-html-style", "ValueList HTML Style"],
    ].map(([type, label]) => basicDataWidget(type, label, "☷", {
      title: label, entityId: "", state: "0", ...(type === "value-list-html-style" ? { count: 2, listValue0: "Aus", listValue1: "Ein", listValue2: "Automatik", listStyle0: "", listStyle1: "", listStyle2: "" } : { valueList: "Aus;Ein;Automatik" }), testIndex: type !== "value-list-text" ? "" : 0,
    }, [
      { label: "Home-Assistant-Entity (Indexwert)", key: "entityId" }, { label: "Test-Index / Zustand", key: "state" },
      ...(type === "value-list-html-style" ? [{ label: "Werteanzahl bis", key: "count", type: "number", min: 0, max: 50, default: 2, refreshProperties: true }] : [{ label: "Werteliste (ein Eintrag pro Zeile oder mit Semikolon)", key: "valueList", type: "textarea", refreshProperties: type === "value-list-html" }]),
      { label: type !== "value-list-text" ? "Testwert (nur Editor)" : "Vorschau-Index", key: "testIndex", type: type !== "value-list-text" ? "select" : "number", min: 0 },
      ...htmlAdditions(),
    ])),
    basicDataWidget("bool-display", "Bool HTML", "⇄", { title: "Bool HTML", entityId: "", state: false, htmlTrue: "", htmlFalse: "", prefix: "", suffix: "" }, [
      { label: "Home-Assistant-Entity", key: "entityId" }, { label: "Testzustand", key: "state", type: "select", options: [{ value: "false", label: "Aus" }, { value: "true", label: "Ein" }] },
      ...htmlAdditions(), { label: "HTML bei 'false'", key: "htmlFalse", type: "html" }, { label: "HTML bei 'true'", key: "htmlTrue", type: "html" },
    ]),
    basicDataWidget("bool-select", "Bool Select", "☑", { title: "Bool Select", entityId: "", state: "off", textOn: "Ein", textOff: "Aus" }, [
      { label: "Home-Assistant-Entity", key: "entityId" }, { label: "Zustand", key: "state", type: "select", options: [{ value: "off", label: "Aus" }, { value: "on", label: "Ein" }] },
      { label: "Text für Ein", key: "textOn" }, { label: "Text für Aus", key: "textOff" },
    ]),
    basicDataWidget("bool-html-control", "Bool HTML (control)", "⇆", { title: "HTML-Steuerung", entityId: "", state: false, htmlTrue: "Ein", htmlFalse: "Aus" }, [
      { label: "Home-Assistant-Entity", key: "entityId" }, { label: "Testzustand", key: "state", type: "select", options: [{ value: "false", label: "Aus" }, { value: "true", label: "Ein" }] },
      { label: "HTML für Ein", key: "htmlTrue", type: "textarea" }, { label: "HTML für Aus", key: "htmlFalse", type: "textarea" },
    ]),
    basicDataWidget("html-state", "HTML State", "HTML", { title: "HTML State", htmlContent: "<strong>Eigener HTML-Inhalt</strong>", clickUrl: "" }, [
      { label: "HTML-Inhalt", key: "htmlContent", type: "textarea" }, { label: "URL beim Anklicken (optional)", key: "clickUrl" },
    ]),
    basicDataWidget("table", "Table", "▦", { title: "Tabelle", entityId: "", tableData: "[{\"Name\":\"Temperatur\",\"Wert\":21.5},{\"Name\":\"Luftfeuchte\",\"Wert\":48}]" }, [
      { label: "Table Object ID (HA-Entität)", key: "entityId" }, { label: "Static JSON (ohne ID)", key: "tableData", type: "textarea" },
    ]),
    basicDataWidget("fullscreen", "Full Screen", "⛶", { title: "Vollbild", buttonText: "Vollbild" }, [
      { label: "Schaltflächentext", key: "buttonText" },
    ], "Der Button schaltet den Vollbildmodus für die Oberfläche ein und aus."),
    basicDataWidget("bar", "Bar", "▰", { title: "Balken", entityId: "", state: 35, min: 0, max: 100, barColor: "#29c8b5", orientation: "horizontal" }, [
      { label: "Home-Assistant-Entity", key: "entityId" }, { label: "Testwert", key: "state", type: "number" },
      { label: "Minimum", key: "min", type: "number" }, { label: "Maximum", key: "max", type: "number" },
      { label: "Farbe", key: "barColor", type: "color" }, { label: "Ausrichtung", key: "orientation", type: "select", options: [{ value: "horizontal", label: "Horizontal" }, { value: "vertical", label: "Vertikal" }] },
    ]),
    basicDataWidget("html", "HTML", "<>…", { title: "HTML", htmlContent: "<h3>Überschrift</h3><p>Eigener HTML-Inhalt</p>" }, [
      { label: "HTML-Inhalt", key: "htmlContent", type: "textarea" },
    ], "HTML-Code wird mit seinen Elementen, Attributen und Formatierungen dargestellt."),
    basicDataWidget("navigation", "HTML navigation", "➜", { title: "Navigation", navLabel: "Öffnen", navUrl: "" }, [
      { label: "Linktext", key: "navLabel" }, { label: "Ziel-URL oder HA-Pfad", key: "navUrl" },
    ]),
    basicDataWidget("filter-dropdown", "filter - dropdown", "▽", { title: "Filter", filterOptions: "Licht;Heizung;Sicherheit", filterType: "horizontal", variant: "outlined" }, [
      { label: "Filteroptionen (durch Semikolon getrennt)", key: "filterOptions" },
    ], "Ordne Widgets über „Filterwort“ in Generell einer Filteroption zu."),
    { type: "text", label: "Text", icon: "T", defaults: { title: "Text", textContent: "Eigener Text", backgroundColor: "", borderWidth: 0, borderStyle: "none" }, propertyGroups: [
      metadata(), visibility(),
      { label: "Text", fields: [
        { label: "Inhalt", key: "textContent", type: "textarea" },
      ] },
      geometry(), ...cssGroups(),
    ] },
    { type: "border", label: "Border", icon: "▱", defaults: { title: "Titel", borderColor: "#1688e7", borderWidth: 1, borderStyle: "solid", backgroundColor: "", titleBackground: "", titleColor: "#e7ecee", titleTopOffset: -9, titleLeftOffset: 16, headerHeight: 0, headerColor: "" }, propertyGroups: [
      metadata(), visibility(),
      { label: "Allgemein", fields: [
        { label: "Titel", key: "title" },
        { label: "Titelhintergrund", key: "titleBackground", type: "color" },
        { label: "Titel-Oben-Abstand (px)", key: "titleTopOffset", type: "range", min: -20, max: 20, step: 1 },
        { label: "Titel-Links-Abstand (px)", key: "titleLeftOffset", type: "range", min: -20, max: 30, step: 1 },
        { label: "Kopfhöhe (px)", key: "headerHeight", type: "range", min: 0, max: 100, step: 1 },
        { label: "Kopffarbe", key: "headerColor", type: "color" },
        { label: "Titelfarbe", key: "titleColor", type: "color" },
      ] },
      geometry(), ...cssGroups(),
    ] },
    { type: "gauge", label: "Gauge", searchTerms: ["Messanzeige"], icon: "◴", defaults: { title: "Gauge", entityId: "", state: "--", unit: "%" }, propertyGroups: entityWidget(true) },
    { type: "image", label: "Image", icon: "▧", defaults: { title: "Kamera", entityId: "", state: "Bildfläche" }, propertyGroups: entityWidget() },
  ].map((widget) => {
    if (previousWidgetLabels[widget.type]) widget.searchTerms = [...(widget.searchTerms || []), previousWidgetLabels[widget.type]];
    widget.preview = palettePreviews[widget.type] || { kind: "plain", lines: [widget.icon] };
    if (widget.type === "note") widget.propertyGroups.find(group => group.label === "Daten").fields = widget.propertyGroups.find(group => group.label === "Daten").fields.filter(field => field.key !== "state" || field.type === "html");
    if (widget.type === "screen-resolution") widget.propertyGroups = widget.propertyGroups.filter(group => group.label !== "Daten");
    const data = widget.propertyGroups.find(group => ["Daten", "Allgemein"].includes(group.label));
    const add = (...fields) => data?.fields.push(...fields);
    if (widget.type === "checkbox") {
      Object.assign(widget.defaults, { prefix: "", suffix: "", autofocus: false });
      widget.propertyGroups = widget.propertyGroups.map(group => group.css ? { ...group, defaultEnabled: false } : group);
      data.fields = data.fields.filter(field => !["suffixSingular", "suffixPlural"].includes(field.key));
      add({ label: "HTML anhängen", key: "suffix" }, { label: "Autofokus", key: "autofocus", type: "checkbox", default: false });
    }
    if (widget.type === "bool-select") add(...htmlAdditions(), { label: "Autofokus", key: "autofocus", type: "checkbox", default: false });
    if (widget.type === "html-state") add({ label: "Home-Assistant-Entität", key: "entityId" }, { label: "Wert (Vorschau)", key: "state" });
    if (widget.type === "string") add({ label: "Icon", key: "icon", previewImage: true });
    if (widget.type === "bar") add({ label: "Wert umkehren", key: "invert", type: "checkbox", default: false }, { label: "Rand", key: "barBorder" }, { label: "Durchsichtigkeit", key: "barOpacity", type: "range", min: 0, max: 1, step: 0.05, default: 1 });
    if (widget.type === "navigation") add({ label: "HTML", key: "navHtml", type: "html", default: "Öffnen" }, { label: "View zum Navigieren", key: "targetPage", type: "page" });
    if (widget.type === "image") add({ label: "Quelle", key: "imageSrc", previewImage: true }, ...imageFields());
    if (widget.type === "image-source") add(...htmlAdditions(), ...refreshFields());
    if (widget.type === "html") add({ label: "Updatezeit (ms)", key: "refreshInterval", type: "range", min: 0, max: 180000, step: 100, default: 0 });
    if (widget.type === "bulb") widget.propertyGroups.push({ label: "Extrasteuerung", masterKey: "extraControlEnabled", defaultEnabled: false, hint: "URLs sind nutzbar; Zielentitäten und Schreibwerte werden erst mit der HA-Schreibanbindung aktiv.", fields: [{ label: "URL bei true", key: "extraUrlTrue" }, { label: "URL bei false", key: "extraUrlFalse" }, { label: "Objekt ID bei true", key: "extraTrueEntityId", disabled: true }, { label: "Objekt ID bei false", key: "extraFalseEntityId", disabled: true }, { label: "Wert für ID bei false", key: "extraValueFalse", disabled: true }, { label: "Wert für ID bei true", key: "extraValueTrue", disabled: true }] });
    if (widget.type === "table") {
      Object.assign(widget.defaults, { noHeader: false, showScrollbar: false, newEventFirst: false, printText: "" });
      add({ label: "Ereignis ID", key: "eventEntityId" }, { label: "Neues Ereignis am Anfang", key: "newEventFirst", type: "checkbox", default: false }, { label: "Bestätigung ID (HA-Helfer)", key: "ackEntityId" }, { label: "Ausgewählt ID (input_text)", key: "selectedEntityId" }, { label: "Kein Header", key: "noHeader", type: "checkbox", default: false }, { label: "Zeige Scrollbar", key: "showScrollbar", type: "checkbox", default: false }, { label: "Detailed widget", key: "detailWidget", type: "widget" }, { label: "Maximale Zeilenanzahl", key: "maxRows", type: "number", min: 0 }, { label: "Kolumnanzahl", key: "maxColumns", type: "number", min: 0, max: 20, refreshProperties: true }, { label: "btn_print", key: "printText", default: "" }, { label: "view_for_print", key: "printPage", type: "page" });
    }
    if (widget.type === "filter-dropdown") add({ label: "editor", key: "filterEntries", type: "filter-editor" }, { label: "Typ", key: "filterType", type: "select", options: ["horizontal", "vertical", "dropdown"], default: "horizontal" }, { label: "Mehrfachauswahl", key: "multiple", type: "checkbox", default: false }, { label: "Keine Option Kein Filter", key: "hideNoFilter", type: "checkbox", default: false }, { label: "Etikett Kein Filter", key: "noFilterLabel", default: "Kein Filter" }, { label: "Variante", key: "variant", type: "select", options: ["outlined", "contained", "text"], default: "outlined" });
    if (["button", "toggle", "checkbox", "bulb", "slider", "sensor", "string", "string-raw", "image-source", "time-value", "timestamp-value", "timestamp", "last-changed", "value-list-text", "value-list-html", "value-list-html-style", "bool-display", "bool-select", "bool-html-control", "table", "bar", "gauge", "image"].includes(widget.type)) {
      widget.propertyGroups.push(signalImages());
    }
    return widget;
  }),
});
