import { registerWidgetSet } from "../widget-registry.js";

const fields = (items) => ({ label: "Größe und Position", fields: items });
const geometry = () => fields([
  { label: "z-index", key: "layer", type: "number", min: 0, max: 9999 },
  { label: "Breite (px)", key: "width", type: "number", min: 16, max: 7680 },
  { label: "Höhe (px)", key: "height", type: "number", min: 16, max: 4320 },
  { label: "X (px)", key: "x", type: "number", min: 0 },
  { label: "Y (px)", key: "y", type: "number", min: 0 },
]);
const cssGroups = () => [
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
const signalImages = () => ({ label: "Signalbilder", signalImages: true, fields: [
  { label: "Anzahl der Signale", key: "signalCount", type: "select", refreshProperties: true, options: Array.from({ length: 10 }, (_, index) => String(index)) },
] , hint: "Zustandsabhängige Bild-Overlays, zum Beispiel für Warnungen oder Batteriestände. Die Vorschau vergleicht den konfigurierten Wert mit dem Widget-Testzustand." });
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
const basicDataWidget = (type, label, icon, defaults, dataFields, hint = "Entity-Auswahl ist vorbereitet; die Vorschau nutzt derzeit den konfigurierten Testwert.") => ({
  type, label, icon, defaults,
  propertyGroups: [
    metadata(), visibility(),
    { label: "Daten", ...(hint ? { hint } : {}), fields: dataFields },
    geometry(), ...cssGroups(),
  ],
});
const dateFormats = ["YYYY-MM-DD HH:mm:ss", "DD.MM.YYYY HH:mm:ss", "DD.MM.YYYY HH:mm", "YYYY-MM-DD", "HH:mm:ss"];

registerWidgetSet({
  id: "ha-grafik-core",
  label: "HA Grafik – Basis",
  widgets: [
    { type: "button", label: "Schaltfläche (Icon Ein/Aus)", icon: "◉", defaults: { title: "Schaltfläche", entityId: "", state: "off", icon_off: "", icon_on: "", readOnly: false }, propertyGroups: [
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
    { type: "checkbox", label: "Checkbox", icon: "☑", defaults: { title: "Checkbox", entityId: "", state: false }, propertyGroups: entityWidget() },
    { type: "bulb", label: "Lampe ein/aus", icon: "💡", defaults: { title: "Lampe", entityId: "", state: false, min: 0, max: 1, icon_off: "", icon_on: "", readOnly: false }, propertyGroups: [
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
    { type: "slider", label: "Slider", icon: "◉", defaults: { title: "Regler", entityId: "", value: 50, min: 0, max: 100, step: 1 }, propertyGroups: [
      metadata(), visibility(),
      { label: "Allgemein", fields: [
        { label: "Home-Assistant-Entität", key: "entityId" },
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
    ], "Der Zustandswert wird als Text ausgegeben, vorangestellter und angehängter HTML-Code als HTML. Eine Entity-Bindung folgt."),
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
    ])),
    ...[
      ["value-list-text", "ValueList Text"], ["value-list-html", "ValueList HTML"], ["value-list-html-style", "ValueList HTML Style"],
    ].map(([type, label]) => basicDataWidget(type, label, "☷", {
      title: label, entityId: "", state: "0", valueList: "Aus;Ein;Automatik", styleList: "color:#9aa;\ncolor:#29c8b5;\ncolor:#ffb74d", testIndex: 0,
    }, [
      { label: "Home-Assistant-Entity (Indexwert)", key: "entityId" }, { label: "Test-Index / Zustand", key: "state" },
      { label: "Werteliste (ein Eintrag pro Zeile oder mit Semikolon)", key: "valueList", type: "textarea" },
      ...(type === "value-list-html-style" ? [{ label: "CSS-Stil je Zeile", key: "styleList", type: "textarea" }] : []),
      { label: "Vorschau-Index", key: "testIndex", type: "number", min: 0 },
    ])),
    basicDataWidget("bool-display", "Bool HTML", "⇄", { title: "Bool HTML", entityId: "", state: false, htmlTrue: "<strong>Ein</strong>", htmlFalse: "Aus" }, [
      { label: "Home-Assistant-Entity", key: "entityId" }, { label: "Testzustand", key: "state", type: "select", options: [{ value: "false", label: "Aus" }, { value: "true", label: "Ein" }] },
      { label: "HTML für Ein", key: "htmlTrue", type: "textarea" }, { label: "HTML für Aus", key: "htmlFalse", type: "textarea" },
    ]),
    basicDataWidget("bool-select", "Bool Select", "☑", { title: "Bool Select", entityId: "", state: "off", textOn: "Ein", textOff: "Aus" }, [
      { label: "Home-Assistant-Entity", key: "entityId" }, { label: "Zustand", key: "state", type: "select", options: [{ value: "off", label: "Aus" }, { value: "on", label: "Ein" }] },
      { label: "Text für Ein", key: "textOn" }, { label: "Text für Aus", key: "textOff" },
    ]),
    basicDataWidget("bool-html-control", "Bool HTML-Steuerung", "⇆", { title: "HTML-Steuerung", entityId: "", state: false, htmlTrue: "Ein", htmlFalse: "Aus" }, [
      { label: "Home-Assistant-Entity", key: "entityId" }, { label: "Testzustand", key: "state", type: "select", options: [{ value: "false", label: "Aus" }, { value: "true", label: "Ein" }] },
      { label: "HTML für Ein", key: "htmlTrue", type: "textarea" }, { label: "HTML für Aus", key: "htmlFalse", type: "textarea" },
    ]),
    basicDataWidget("html-state", "HTML State", "HTML", { title: "HTML State", htmlContent: "<strong>Eigener HTML-Inhalt</strong>", clickUrl: "" }, [
      { label: "HTML-Inhalt", key: "htmlContent", type: "textarea" }, { label: "URL beim Anklicken (optional)", key: "clickUrl" },
    ]),
    basicDataWidget("table", "Table", "▦", { title: "Tabelle", entityId: "", tableData: "[{\"Name\":\"Temperatur\",\"Wert\":21.5},{\"Name\":\"Luftfeuchte\",\"Wert\":48}]" }, [
      { label: "Home-Assistant-Entity (JSON-Attribut, später)", key: "entityId" }, { label: "JSON-Testdaten", key: "tableData", type: "textarea" },
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
    basicDataWidget("navigation", "HTML Navigation", "➜", { title: "Navigation", navLabel: "Öffnen", navUrl: "" }, [
      { label: "Linktext", key: "navLabel" }, { label: "Ziel-URL oder HA-Pfad", key: "navUrl" },
    ]),
    basicDataWidget("filter-dropdown", "Filter Dropdown", "▽", { title: "Filter", filterOptions: "Licht;Heizung;Sicherheit" }, [
      { label: "Filteroptionen (durch Semikolon getrennt)", key: "filterOptions" },
    ], "Ordne Widgets über „Filterwort“ in Generell einer Filteroption zu."),
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
        { label: "Titel-Oben-Abstand (px)", key: "titleTopOffset", type: "range", min: -20, max: 20, step: 1 },
        { label: "Titel-Links-Abstand (px)", key: "titleLeftOffset", type: "range", min: -20, max: 30, step: 1 },
        { label: "Kopfhöhe (px)", key: "headerHeight", type: "range", min: 0, max: 100, step: 1 },
        { label: "Kopffarbe", key: "headerColor", type: "color" },
        { label: "Titelfarbe", key: "titleColor", type: "color" },
      ] },
      geometry(), ...cssGroups(),
    ] },
    { type: "gauge", label: "Messanzeige", icon: "◴", defaults: { title: "Messanzeige", entityId: "", state: "--", unit: "%" }, propertyGroups: entityWidget(true) },
    { type: "image", label: "Bild / Kamera", icon: "▧", defaults: { title: "Kamera", entityId: "", state: "Bildfläche" }, propertyGroups: entityWidget() },
  ].map((widget) => {
    if (["button", "toggle", "checkbox", "bulb", "slider", "sensor", "string", "string-raw", "image-source", "time-value", "timestamp-value", "timestamp", "last-changed", "value-list-text", "value-list-html", "value-list-html-style", "bool-display", "bool-select", "bool-html-control", "table", "bar", "gauge", "image"].includes(widget.type)) {
      widget.propertyGroups.push(signalImages());
    }
    return widget;
  }),
});
