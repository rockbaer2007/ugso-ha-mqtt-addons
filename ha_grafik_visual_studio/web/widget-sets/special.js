import { registerWidgetSet } from "../widget-registry.js";
import { MATH_ANCHORS } from "../linebox-math.js";
import { cssGroups } from "./core.js";

const anchorOptions = [
  ["left-top", "Links oben"], ["left-center", "Links Mitte"], ["left-bottom", "Links unten"],
  ["right-top", "Rechts oben"], ["right-center", "Rechts Mitte"], ["right-bottom", "Rechts unten"],
  ["top-quarter", "Oben 1/4"], ["top-center", "Oben Mitte"], ["top-three-quarter", "Oben 3/4"],
  ["bottom-quarter", "Unten 1/4"], ["bottom-center", "Unten Mitte"], ["bottom-three-quarter", "Unten 3/4"],
].map(([value, label]) => ({ value, label })).concat(MATH_ANCHORS.map(([value, label]) => ({ value, label })));

registerWidgetSet({
  id: "ha-grafik-special",
  label: "HA Grafik – Spezial",
  widgets: [{
    type: "dashboard-in-widget", label: "Dashboard in widget", searchTerms: ["HA Dashboard", "Dashboard im Widget"], icon: "▣",
    iconSvg: "icons/dashboard.svg", preview: { kind: "svg", lines: [] },
    defaults: { title: "", width: 300, height: 200, dashboardPath: "", dashboardView: "", dashboardBaseUrl: "" },
    propertyGroups: [
      { label: "Allgemein", fields: [
        { label: "Dashboard", key: "dashboardPath", type: "dashboard" },
        { label: "Dashboard-Ansicht (optional)", key: "dashboardView" },
        { label: "HA-Basis-URL (optional)", key: "dashboardBaseUrl" },
      ] },
      { label: "Größe und Position", fields: [
        { label: "Breite (px)", key: "width", type: "number", min: 32, max: 800 },
        { label: "Höhe (px)", key: "height", type: "number", min: 32, max: 640 },
        { label: "X (px)", key: "x", type: "number", min: 0 }, { label: "Y (px)", key: "y", type: "number", min: 0 },
      ] }, ...cssGroups().map(group => ({ ...group, defaultEnabled: false })),
    ],
  }, {
    type: "svg-connection",
    label: "SVG-Line",
    searchTerms: ["SVG-Verbindungslinie"],
    icon: "↝",
    preview: { kind: "plain", lines: ["↝"] },
    defaults: {
      title: "Verbindung", comment: "", visible: true,
      startWidgetId: "", startAnchor: "right-center", startCollector: "", startX: 100, startY: 120,
      endWidgetId: "", endAnchor: "left-center", endCollector: "", endX: 420, endY: 120,
      pathMode: "orthogonal", cornerRadius: 8, connectionPoints: [],
      baseColor: "#607d8b", flowColor: "#29c8b5", lineWidth: 4, lineOpacity: 1,
      lineStyle: "solid", dashLength: 12, gapLength: 8, lineCap: "round",
      markerStart: "none", markerEnd: "arrow", markerSize: 8, markerColor: "#29c8b5",
      animationEnabled: false, animationStyle: "two-color", animationSource: "manual", animationDirection: "forward", animationDuration: 2,
      animationNumberEntityId: "", animationBooleanEntityId: "", animationDivisor: 1, animationBooleanInvert: false, lineboxDivisor: 1,
      animationAutoDivisor: false, animationTargetSpeed: 1, lineboxAutoDivisor: false, lineboxTargetSpeed: 1,
      flowParentId: "", inheritFlow: true, synchronization: "same-phase",
      crossingStyle: "overlay", connectionZMode: "auto", layer: 0, clickThrough: true,
    },
    propertyGroups: [
      { label: "Allgemein", fields: [
        { label: "Kommentar", key: "comment" },
        { label: "Sichtbar", key: "visible", type: "checkbox", default: true },
        { label: "CSS Klasse", key: "cssClass" }, { label: "Filterwort", key: "filterWord" },
      ] },
      { label: "Start", fields: [
        { label: "Startwidget", key: "startWidgetId", type: "widget" },
        { label: "Andockpunkt", key: "startAnchor", type: "select", options: anchorOptions },
        { label: "Oder aktiver Sammelpunkt", key: "startCollector", type: "collector" },
        { label: "Freies X", key: "startX", type: "number", min: 0, max: 7680 },
        { label: "Freies Y", key: "startY", type: "number", min: 0, max: 4320 },
      ] },
      { label: "Ziel", fields: [
        { label: "Zielwidget", key: "endWidgetId", type: "widget" },
        { label: "Andockpunkt", key: "endAnchor", type: "select", options: anchorOptions },
        { label: "Oder aktiver Sammelpunkt", key: "endCollector", type: "collector" },
        { label: "Freies X", key: "endX", type: "number", min: 0, max: 7680 },
        { label: "Freies Y", key: "endY", type: "number", min: 0, max: 4320 },
      ] },
      { label: "Pfad und Sammelpunkte", fields: [
        { label: "Pfadart", key: "pathMode", type: "select", refreshProperties: true, options: [
          { value: "straight", label: "Gerade" }, { value: "orthogonal", label: "Automatisch rechtwinklig" },
          { value: "curve", label: "Kurve" }, { value: "zigzag", label: "Manueller Zickzack-/Mehrpunktpfad" },
        ] },
        { label: "Eckenradius", key: "cornerRadius", type: "range", min: 0, max: 80, step: 1 },
        { label: "Linienpunkte", key: "connectionPoints", type: "connection-points" },
      ] },
      { label: "Linie", fields: [
        { label: "Grundfarbe", key: "baseColor", type: "color" },
        { label: "Animationsfarbe", key: "flowColor", type: "color" },
        { label: "Dicke", key: "lineWidth", type: "range", min: 1, max: 40, step: 1 },
        { label: "Deckkraft", key: "lineOpacity", type: "range", min: 0, max: 1, step: 0.05 },
        { label: "Linienart", key: "lineStyle", type: "select", options: [
          { value: "solid", label: "Durchgezogen" }, { value: "dashed", label: "Gestrichelt" }, { value: "dotted", label: "Gepunktet" },
        ] },
        { label: "Strichlänge", key: "dashLength", type: "range", min: 1, max: 100, step: 1 },
        { label: "Abstand", key: "gapLength", type: "range", min: 1, max: 100, step: 1 },
        { label: "Linienenden", key: "lineCap", type: "select", options: ["round", "butt", "square"] },
      ] },
      { label: "Pfeilspitzen", fields: [
        { label: "Am Anfang", key: "markerStart", type: "select", options: ["none", "arrow", "open", "circle"] },
        { label: "Am Ende", key: "markerEnd", type: "select", options: ["none", "arrow", "open", "circle"] },
        { label: "Größe", key: "markerSize", type: "range", min: 2, max: 30, step: 1 },
        { label: "Farbe", key: "markerColor", type: "color" },
      ] },
      { label: "Animation", hint: "Zahlenwert / Teiler ergibt Zyklen pro Sekunde (0,05 bis 20). Ein aktiver SVG LineBox-Ausgang hat Vorrang vor der gewählten Richtungsquelle; Farbe und Linienart bleiben erhalten.", fields: [
        { label: "Animation aktivieren", key: "animationEnabled", type: "checkbox", default: false },
        { label: "Animationsart", key: "animationStyle", type: "select", options: [
          { value: "two-color", label: "Zweifarbenfluss" }, { value: "dash", label: "Laufende Striche" },
          { value: "pulse", label: "Puls" }, { value: "light", label: "Lichtpunkt" },
        ] },
        { label: "Richtungsquelle", key: "animationSource", type: "radio", default: "manual", options: [
          { value: "manual", label: "Manuell" }, { value: "number", label: "Zahlen-Entität" },
          { value: "boolean", label: "Bool-Entität" },
        ] },
        { label: "Zahlen-Entität", key: "animationNumberEntityId", showWhen: { key: "animationSource", value: "number" } },
        { label: "Teiler", key: "animationDivisor", type: "number", min: 0.001, step: 0.001, default: 1, showWhen: { key: "animationSource", value: "number" } },
        { label: "Teiler automatisch anpassen (Zahlen-Entität)", key: "animationAutoDivisor", type: "checkbox", default: false, showWhen: { key: "animationSource", value: "number" } },
        { label: "Zielgeschwindigkeit Zahlen-Entität (Zyklen/s)", key: "animationTargetSpeed", type: "number", min: 0.05, max: 5, step: 0.05, default: 1, showWhen: { key: "animationAutoDivisor", value: true } },
        { label: "Bool-Entität", key: "animationBooleanEntityId", showWhen: { key: "animationSource", value: "boolean" } },
        { label: "Bool-Richtung umkehren", key: "animationBooleanInvert", type: "checkbox", default: false, showWhen: { key: "animationSource", value: "boolean" } },
        { label: "Richtung", key: "animationDirection", type: "select", showWhen: { key: "animationSource", value: "manual", default: "manual" }, options: [
          { value: "forward", label: "Anfang → Ende" }, { value: "reverse", label: "Ende → Anfang" },
        ] },
        { label: "Dauer (Sekunden)", key: "animationDuration", type: "range", min: 0.2, max: 20, step: 0.1, showWhen: { key: "animationSource", value: "manual", default: "manual" } },
        { label: "Dauer (Sekunden)", key: "animationDuration", type: "range", min: 0.2, max: 20, step: 0.1, showWhen: { key: "animationSource", value: "boolean" } },
        { label: "Poti / SVG LineBox-Teiler (bei Übergabe)", key: "lineboxDivisor", type: "number", min: 0.001, step: 0.001, default: 1 },
        { label: "Teiler automatisch anpassen (Poti / SVG LineBox)", key: "lineboxAutoDivisor", type: "checkbox", default: false },
        { label: "Zielgeschwindigkeit Poti / SVG LineBox (Zyklen/s)", key: "lineboxTargetSpeed", type: "number", min: 0.05, max: 5, step: 0.05, default: 1, showWhen: { key: "lineboxAutoDivisor", value: true } },
        { label: "Hauptlinie / Flussgruppe", key: "flowParentId", type: "connection" },
        { label: "Animationstakt der Hauptlinie übernehmen (eigene Farben behalten)", key: "inheritFlow", type: "checkbox", default: true },
        { label: "Synchronisierung", key: "synchronization", type: "select", options: [
          { value: "same-phase", label: "Gleicher Takt" }, { value: "arrival", label: "Am Sammelpunkt synchron ankommen" },
        ] },
      ] },
      { label: "Kreuzung und z-index", fields: [
        { label: "Kreuzungsdarstellung", key: "crossingStyle", type: "select", options: [
          { value: "overlay", label: "Überlagerung" }, { value: "gap", label: "Lücke" }, { value: "bridge", label: "Brücke / Bogen" },
        ] },
        { label: "z-index-Modus", key: "connectionZMode", type: "select", options: [
          { value: "auto", label: "Automatisch" }, { value: "above", label: "Darüber" },
          { value: "below", label: "Darunter" }, { value: "manual", label: "Manuell" },
        ] },
        { label: "z-index", key: "layer", type: "number", min: 0, max: 9999 },
        { label: "Klicks durchlassen", key: "clickThrough", type: "checkbox", default: true },
      ] },
    ],
  }, {
    type: "linebox",
    label: "SVG LineBox",
    searchTerms: ["Linebox"],
    icon: "Σ",
    preview: { kind: "plain", lines: ["Σ"] },
    defaults: {
      title: "SVG LineBox", visible: true, dockPointsEnabled: false, width: 140, height: 76,
      backgroundColor: "#12383b", borderColor: "#29c8b5", borderWidth: 1, borderStyle: "dashed",
      junctionVisible: true, junctionDiameter: 16, junctionColor: "#29c8b5", junctionBorderColor: "#d9f8f3", junctionBorderWidth: 2, junctionValuePosition: "off",
      outputHelperEnabled: false, outputHelperEntityId: "",
    },
    propertyGroups: [
      { label: "Verbindungspunkt", fields: [
        { label: "Kreis anzeigen", key: "junctionVisible", type: "checkbox", default: true, refreshProperties: true },
        { label: "Durchmesser (px)", key: "junctionDiameter", type: "range", min: 4, max: 100, step: 1, showWhen: { key: "junctionVisible", value: true, default: true } },
        { label: "Füllfarbe", key: "junctionColor", type: "color", showWhen: { key: "junctionVisible", value: true, default: true } },
        { label: "Randfarbe", key: "junctionBorderColor", type: "color", showWhen: { key: "junctionVisible", value: true, default: true } },
        { label: "Randbreite (px)", key: "junctionBorderWidth", type: "range", min: 0, max: 20, step: 1, showWhen: { key: "junctionVisible", value: true, default: true } },
        { label: "Ausgabewert anzeigen", key: "junctionValuePosition", type: "select", default: "off", options: [
          { value: "off", label: "Aus" }, { value: "above", label: "Über dem Kreis" }, { value: "below", label: "Unter dem Kreis" },
        ] },
      ] },
      { label: "Zahlenhelfer-Ausgabe", hint: "Die interne Übergabe bleibt aktiv. Ein optionaler input_number-Helfer erhält die Summe nur bei einer Wertänderung.", fields: [
        { label: "Zusätzlich an Zahlenhelfer schreiben", key: "outputHelperEnabled", type: "checkbox", default: false, refreshProperties: true },
        { label: "Zahlenhelfer", key: "outputHelperEntityId", showWhen: { key: "outputHelperEnabled", value: true } },
      ] },
    ],
  }, {
    type: "linebox-math", label: "SVG LineBox Math", icon: "▣", preview: { kind: "plain", lines: ["ƒ"] },
    defaults: {
      title: "", width: 160, height: 160, radius: 0, dockPointsEnabled: false, dockAlwaysVisible: true,
      backgroundColor: "#12383b", borderColor: "#29c8b5", borderWidth: 2, borderStyle: "solid",
      mathMode: "expression", mathExpression: "A + B", lineboxDivisor: 1,
      mathIcon: "", mathIconSize: 24, mathIconColor: "#29c8b5", mathShowResult: true,
      padding: 2, textAlign: "center",
      ...Object.fromEntries(MATH_ANCHORS.map(([id]) => [`mathRole_${id}`, "input"])),
    },
    propertyGroups: [{ label: "Berechnung", hint: "Berechnung bearbeiten öffnet die Formel und Rollen A–P. Mehrere Leitungen an einem Eingang werden zuerst summiert. Ungültige Werte stoppen die Ausgabe.", fields: [
      { label: "Beschriftung (optional)", key: "title" },
      { label: "Ergebnis anzeigen", key: "mathShowResult", type: "checkbox", default: true },
      { label: "In Runtime ausblenden", key: "hideInRuntime", type: "checkbox", default: false },
    ] }, { label: "Darstellung", fields: [
      { label: "Icon", key: "mathIcon", previewImage: true },
      { label: "Icongröße (px)", key: "mathIconSize", type: "number", min: 8, max: 512 },
      { label: "Iconfarbe", key: "mathIconColor", type: "color" },
      { label: "Hintergrundfarbe", key: "backgroundColor", type: "color" },
      { label: "Rahmenfarbe", key: "borderColor", type: "color" },
      { label: "Ergebnistextfarbe", key: "textColor", type: "color" },
      { label: "Zusätzlicher CSS-Stil", key: "mathStyle", type: "textarea" },
    ] }, ...cssGroups()],
  }],
});
