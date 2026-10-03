export const marqueeDefinition = {
  type: "marquee", label: "Lauftext", icon: "↔", searchTerms: ["Ticker", "Marquee", "Nachrichtenbanner"],
  defaults: { width: 300, height: 40, entityId: "", marqueeText: "", direction: "left", speed: 80, textRepeat: 3, gap: 50, pauseOnHover: false, respectReducedMotion: true, backgroundColor: "transparent", borderWidth: 0, radius: 0, padding: 0 },
  propertyGroups: [
    { label: "Allgemein", fields: [
      { label: "Home-Assistant-Entität", key: "entityId" },
      { label: "Lauftext (statisch)", key: "marqueeText", type: "textarea" },
      { label: "Richtung", key: "direction", type: "select", options: [{ value: "left", label: "Links" }, { value: "right", label: "Rechts" }] },
      { label: "Geschwindigkeit (px/s)", key: "speed", type: "range", min: 10, max: 500 },
      { label: "Textkopien", key: "textRepeat", type: "number", min: 1, max: 200 },
      { label: "Abstand zwischen Kopien (px)", key: "gap", type: "range", min: 0, max: 1000 },
      { label: "Bei Hover pausieren", key: "pauseOnHover", type: "checkbox" },
      { label: "Reduzierte Bewegung beachten", key: "respectReducedMotion", type: "checkbox" },
      { label: "Hintergrund", key: "backgroundColor", type: "color", optionalColor: true },
    ] },
    { label: "Größe und Position", fields: [{ label: "Breite (px)", key: "width", type: "number", min: 16 }, { label: "Höhe (px)", key: "height", type: "number", min: 16 }, { label: "X (px)", key: "x", type: "number" }, { label: "Y (px)", key: "y", type: "number" }] },
  ],
};
