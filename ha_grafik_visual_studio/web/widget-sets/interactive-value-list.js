export const valueListDefinition = {
  type: "interactive-value-list", label: "Werteliste", icon: "☷", searchTerms: ["Value List", "Aufzählung", "Liste"],
  defaults: { width: 200, height: 150, entityId: "", manualText: "", separator: ",", trimItems: true, ignoreEmpty: true, bulletType: "disc", bulletCustom: "*", bulletSpacing: 8, lineSpacing: 4, padding: 4, backgroundColor: "transparent", borderWidth: 0, radius: 0 },
  propertyGroups: [
    { label: "Allgemein", fields: [
      { label: "Home-Assistant-Entität", key: "entityId", refreshProperties: true },
      { label: "Text (manuell)", key: "manualText", type: "textarea", showWhen: { key: "entityId", value: "", default: "" } },
      { label: "Trennzeichen", key: "separator", hint: "Mehrere Zeichen sind möglich. \\n trennt Zeilen, \\t trennt Tabulatoren; leer zeigt den gesamten Text als einen Eintrag." },
      { label: "Leerzeichen entfernen", key: "trimItems", type: "checkbox" },
      { label: "Leere Einträge ignorieren", key: "ignoreEmpty", type: "checkbox" },
    ] },
    { label: "Darstellung", defaultEnabled: true, fields: [
      { label: "Aufzählungszeichen", key: "bulletType", type: "select", refreshProperties: true, options: [{ value: "disc", label: "Punkt (•)" }, { value: "circle", label: "Kreis (○)" }, { value: "square", label: "Quadrat (▪)" }, { value: "dash", label: "Strich (–)" }, { value: "arrow", label: "Pfeil (›)" }, { value: "number", label: "Nummeriert (1. 2. 3.)" }, { value: "none", label: "Kein Zeichen" }, { value: "custom", label: "Eigenes Zeichen" }] },
      { label: "Eigenes Aufzählungszeichen", key: "bulletCustom", showWhen: { key: "bulletType", value: "custom" } },
      { label: "Farbe des Aufzählungszeichens", key: "bulletColor", type: "color", optionalColor: true, showWhen: { key: "bulletType", values: ["disc", "circle", "square", "dash", "arrow", "number", "custom"], default: "disc" } },
      { label: "Abstand Zeichen zu Text (px)", key: "bulletSpacing", type: "range", min: 0, max: 50, showWhen: { key: "bulletType", values: ["disc", "circle", "square", "dash", "arrow", "number", "custom"], default: "disc" } },
      { label: "Zeilenabstand (px)", key: "lineSpacing", type: "range", min: 0, max: 50 },
      { label: "Innenabstand", key: "padding", type: "number", min: 0, max: 200 },
    ] },
    { label: "Größe und Position", fields: [{ label: "Breite (px)", key: "width", type: "number", min: 16 }, { label: "Höhe (px)", key: "height", type: "number", min: 16 }, { label: "X (px)", key: "x", type: "number" }, { label: "Y (px)", key: "y", type: "number" }] },
  ],
};
