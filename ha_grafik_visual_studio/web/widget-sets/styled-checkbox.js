export const checkboxDefinition = {
  type: "styled-checkbox", label: "Checkbox", icon: "☑", searchTerms: ["Kontrollkästchen", "Wertepaar"],
  defaults: { width: 70, height: 40, entityId: "", state: false, valueFalse: "", valueTrue: "", textFalse: "", textTrue: "", textPosition: "end", boxSize: 24, backgroundColor: "transparent", borderWidth: 0, radius: 0, padding: 0, cssOverflowX: "visible", cssOverflowY: "visible" },
  propertyGroups: [
    { label: "Allgemein", fields: [{ label: "Home-Assistant-Entität", key: "entityId" }, { label: "Wert false", key: "valueFalse" }, { label: "Wert true", key: "valueTrue" }, { label: "Text falsch", key: "textFalse", type: "textarea" }, { label: "Text wahr", key: "textTrue", type: "textarea" }, { label: "Textposition", key: "textPosition", type: "select", options: [{ value: "end", label: "Ende" }, { value: "start", label: "Start" }, { value: "top", label: "Oben" }, { value: "bottom", label: "Unten" }] }, { label: "Vorschau-/Testzustand", key: "state" }] },
    { label: "CSS Checkbox – Stil", css: true, defaultEnabled: true, fields: [{ label: "Vom Widget", key: "styleFromWidget", type: "widget", widgetType: "styled-checkbox" }, { label: "Boxfarbe", key: "boxColor", type: "color", optionalColor: true }, { label: "Boxfarbe aktiv", key: "boxColorActive", type: "color", optionalColor: true }, { label: "Boxgröße (px)", key: "boxSize", type: "range", min: 0, max: 50 }] },
    { label: "Größe und Position", fields: [{ label: "Breite (px)", key: "width", type: "number", min: 16 }, { label: "Höhe (px)", key: "height", type: "number", min: 16 }, { label: "X (px)", key: "x", type: "number" }, { label: "Y (px)", key: "y", type: "number" }] },
  ],
};
