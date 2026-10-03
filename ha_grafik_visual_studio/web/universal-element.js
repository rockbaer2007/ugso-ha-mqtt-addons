// Original Studio implementation; VIS2 is a functional reference, not a dependency.
export const COLOR_FIELDS = [
  ["iconColor", "Inhaltsfarbe"], ["backgroundColor", "Hintergrund"], ["textColor", "Textfarbe"],
  ["borderColor", "Randfarbe"], ["outerShadowColor", "Äußere Schattenfarbe"], ["innerShadowColor", "Innere Schattenfarbe"],
];
const number = (label, key, min = 0, max = 200, fallback = 0, step = 1) => ({ label, key, type: "range", min, max, step, default: fallback });
const optionLabels = { none: "Keiner", underline: "Unterstrichen", overline: "Überstrichen", "line-through": "Durchgestrichen", start: "Start", center: "Zentriert", end: "Ende", "space-between": "Raum zwischen", "space-around": "Raum rundherum", "space-evenly": "Gleichmäßig", stretch: "Strecken", solid: "Durchgezogen", dashed: "Gestrichelt", dotted: "Gepunktet", double: "Doppelt", groove: "Rille", ridge: "Erhöht", inset: "Vertieft", outset: "Hervorgehoben", rectangle: "Rechteck", triangle: "Dreieck", diamond: "Raute", pentagon: "Pentagon", hexagon: "Sechseck", heptagon: "Siebeneck", octagon: "Achteck", star: "Stern", custom: "Benutzerdefiniertes Polygon" };
const select = (label, key, options, fallback) => ({ label, key, type: "select", options: options.map(option => typeof option === "string" && optionLabels[option] ? { value: option, label: optionLabels[option] } : option), default: fallback, refreshProperties: true });
const check = (label, key) => ({ label, key, type: "checkbox", default: false });
const reference = key => ({ label: "Vom Widget", key, type: "widget", widgetType: "universal-button" });
const sides = (label, prefix, fallback = 0) => ["Top", "Right", "Bottom", "Left"].map((side, i) => number(`${label} ${["oben", "rechts", "unten", "links"][i]}`, prefix + side, 0, 200, fallback));
export const universalColors = () => [reference("colorsFrom"), ...COLOR_FIELDS.map(([key, label]) => ({ key, label, type: "color", optionalColor: true }))];
export function universalStateFields(condition = true) {
  return [
    ...(condition ? [select("Vergleichen nach", "compareSource", [{ value: "widget", label: "Widget-Standard" }, { value: "entity", label: "Andere HA-Entität" }], "widget"),
      { label: "Home-Assistant-Entität", key: "entityId", universalEntity: true, showWhen: { key: "compareSource", value: "entity" } },
      select("Vergleichsoperator", "condition", ["==", "!=", ">", ">=", "<", "<="], "=="), { label: "Wert", key: "value" }, check("Klick deaktivieren wenn aktiv", "disableClick")] : []),
    select("Inhaltstyp", "contentType", [{ value: "icon", label: "Symbol" }, { value: "image", label: "Bild" }, { value: "text", label: "Text" }, { value: "html", label: "HTML" }], "icon"),
    { label: "Symbol", key: "icon", previewImage: true, showWhen: { key: "contentType", value: "icon", default: "icon" } },
    { label: "Bild", key: "image", previewImage: true, showWhen: { key: "contentType", value: "image" } },
    { label: "Text", key: "text", type: "html" },
    { label: "HTML-Inhalt", key: "html", type: "html", showWhen: { key: "contentType", value: "html" } },
    number("Inhaltsblinkintervall (ms)", "blinkInterval", 0, 10000),
    check("Spiegel", "contentMirror"),
    number("Inhaltsgröße (px, 0 = Widget)", "iconSize", 0, 768),
    select("Bildanpassung", "imageFit", ["contain", "cover", "fill"], "contain"),
    ...universalColors(),
  ];
}
export const UNIVERSAL_STYLE_GROUPS = [
  { id: "ue-text", label: "Text", fields: [select("Textdekoration", "textDecoration", ["none", "underline", "overline", "line-through"], "none"), ...sides("Rand", "textMargin")] },
  { id: "ue-content", label: "Inhalt", fields: [select("Inhaltstyp", "contentType", [{ value: "icon", label: "Symbol" }, { value: "image", label: "Bild" }, { value: "text", label: "Text" }, { value: "html", label: "HTML" }], "icon"), number("Inhaltsgröße (px)", "contentSize", 0, 768, 48), number("Drehung", "contentRotation", -180, 180), check("Spiegel", "contentMirror"), ...sides("Rand", "contentMargin")] },
  { id: "ue-alignment", label: "Ausrichtung", fields: [select("Richtung", "contentLayout", [{ value: "vertical", label: "Spalte" }, { value: "horizontal", label: "Zeile" }], "vertical"),
    select("Ausrichtung", "contentAlign", ["start", "center", "end", "space-between", "space-around", "space-evenly"], "center"),
    select("Textausrichtung", "textAlign", ["start", "center", "end"], "center"), select("Inhalt ausrichten", "itemsAlign", ["start", "center", "end", "stretch"], "center"), check("Reihenfolge umkehren", "reverseContent")] },
  { id: "ue-opacity", label: "Transparenz", fields: [number("Hintergrundopazität", "backgroundOpacity", 0, 1, 1, 0.01), number("Inhaltsopazität", "contentOpacity", 0, 1, 1, 0.01)] },
  { id: "ue-padding", label: "Abstand", fields: sides("Innenabstand", "inner", 10) },
  { id: "ue-corners", label: "Ecken", fields: [select("Eckentyp", "cornerType", [{ value: "round", label: "Abgerundet" }, { value: "bevel", label: "Abgeschrägt" }], "round"),
    ...["TopLeft", "TopRight", "BottomRight", "BottomLeft"].map((side, i) => number(["Oben links", "Oben rechts", "Unten rechts", "Unten links"][i], "corner" + side, 0, 200, 12))] },
  { id: "ue-border", label: "Rahmen", fields: [...sides("Größe", "frame"), select("Rahmenstil", "frameStyle", ["none", "solid", "dashed", "dotted", "double", "groove", "ridge", "inset", "outset"], "none")] },
  ...["outer", "inner"].map(kind => ({ id: `ue-${kind}-shadow`, label: kind === "outer" ? "Äußerer Schatten" : "Innerer Schatten", fields: [number("X-Versatz", kind + "X", -100, 100), number("Y-Versatz", kind + "Y", -100, 100), number("Verwischen", kind + "Blur", 0, 100), number("Größe", kind + "Spread", -100, 100)] })),
  { id: "ue-shape", label: "Form", fields: [select("Form", "elementShape", ["rectangle", "triangle", "diamond", "pentagon", "hexagon", "heptagon", "octagon", "star", "custom"], "rectangle"),
    number("Drehung der Form", "shapeRotation", -180, 180), number("Eckenradius der Form (px)", "shapeRadius", 0, 100), { label: "Polygonpunkte (%, z. B. 50% 0%, 100% 100%, 0% 100%)", key: "shapePoints", showWhen: { key: "elementShape", value: "custom" } }] },
].map(group => ({ ...group, fields: [reference(group.id + "From"), ...group.fields] }));

export function universalStyle(widget, widgets, group, seen = new Set()) {
  if (seen.has(widget.id)) return {};
  const local = Object.fromEntries(group.fields.filter(field => field.type !== "widget").map(field => [field.key, widget[field.key] ?? field.default]));
  const trail = new Set(seen); let cursor = widget;
  while (cursor) {
    if (trail.has(cursor.id)) return local;
    trail.add(cursor.id);
    cursor = widgets.find(item => item.id === cursor[group.id + "From"] && item.type === "universal-button");
  }
  const next = new Set(seen); next.add(widget.id);
  const source = widgets.find(item => item.id === widget[group.id + "From"] && item.type === "universal-button");
  const model = source ? { ...widget, ...universalStyle(source, widgets, group, next) } : widget;
  return Object.fromEntries(group.fields.filter(field => field.type !== "widget").map(field => [field.key, model[field.key] ?? field.default]));
}
export function universalVisual(widget, actual, entities, compare) {
  const states = (widget.visualStates || []).slice(0, Math.max(1, Math.min(20, Number(widget.stateCount) || 2)));
  const index = states.findIndex(item => item.enabled !== false && compare(item.compareSource === "entity" ? entities[item.entityId]?.state : actual, item.condition || "==", item.value));
  return { index, visual: index < 0 ? widget.defaultState || states[0] || {} : { ...widget.defaultState, ...states[index] }, states };
}
export function universalNext(widget, actual, index, states) {
  if (widget.interaction === "switch") {
    const low = widget.falseValue ?? states[0]?.value ?? "off", high = widget.trueValue ?? states[1]?.value ?? "on";
    const boolean = value => ["on", "true", "1"].includes(String(value).toLowerCase()) ? true : ["off", "false", "0"].includes(String(value).toLowerCase()) ? false : null;
    const same = boolean(actual) !== null && boolean(high) !== null ? boolean(actual) === boolean(high) : String(actual).toLowerCase() === String(high).toLowerCase();
    return same ? low : high;
  }
  const active = states.filter(item => item.enabled !== false);
  const current = active.indexOf(states[index]);
  return active[(current + 1) % Math.max(1, active.length)]?.value ?? widget.trueValue ?? "on";
}
export function universalResolvedColors(visual, widget, widgets, seen = new Set(), widgetFallback = true) {
  if (seen.has(widget.id)) return {};
  const trail = new Set(seen); trail.add(widget.id); let cursor = visual;
  while (cursor?.colorsFrom) {
    const owner = widgets.find(item => item.id === cursor.colorsFrom && item.type === "universal-button");
    if (!owner) break;
    if (trail.has(owner.id)) return Object.fromEntries(COLOR_FIELDS.map(([key]) => [key, visual[key] || (widgetFallback ? widget[key] : "") || ""]));
    trail.add(owner.id); cursor = owner.defaultState;
  }
  const next = new Set(seen); next.add(widget.id);
  const source = widgets.find(item => item.id === visual.colorsFrom && item.type === "universal-button");
  const inherited = source ? universalResolvedColors(source.defaultState || {}, source, widgets, next) : {};
  return Object.fromEntries(COLOR_FIELDS.map(([key]) => [key, inherited[key] || visual[key] || (widgetFallback ? widget[key] : "") || ""]));
}
export function remapUniversalReferences(widget, map) {
  if (widget.type !== "universal-button") return;
  for (const group of UNIVERSAL_STYLE_GROUPS) { const key = group.id + "From"; if (map.has(widget[key])) widget[key] = map.get(widget[key]); }
  for (const model of [widget.defaultState, widget.feedback, ...(widget.visualStates || [])]) if (model && map.has(model.colorsFrom)) model.colorsFrom = map.get(model.colorsFrom);
}
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
export function universalClip(model, width, height) {
  const shape = model.elementShape || "rectangle";
  let points;
  if (shape === "custom") {
    points = String(model.shapePoints || "").split(",").map(part => part.trim().match(/^(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/)).map(match => match ? [+match[1], +match[2]] : null);
    if (points.length < 3 || points.length > 64 || points.some(point => !point || point.some(value => value > 100))) return "";
  } else if (shape === "rectangle") {
    if (model.cornerType !== "bevel") return "";
    const [tl, tr, br, bl] = ["TopLeft", "TopRight", "BottomRight", "BottomLeft"].map(side => Math.min(width / 2, height / 2, Math.max(0, finite(model["corner" + side], 12))));
    return `polygon(${tl}px 0, calc(100% - ${tr}px) 0, 100% ${tr}px, 100% calc(100% - ${br}px), calc(100% - ${br}px) 100%, ${bl}px 100%, 0 calc(100% - ${bl}px), 0 ${tl}px)`;
  } else {
    const count = { triangle: 3, diamond: 4, pentagon: 5, hexagon: 6, heptagon: 7, octagon: 8, star: 10 }[shape];
    if (!count) return "";
    points = Array.from({ length: count }, (_, i) => { const angle = i * 2 * Math.PI / count - Math.PI / 2, radius = shape === "star" && i % 2 ? 22 : 50; return [50 + Math.cos(angle) * radius, 50 + Math.sin(angle) * radius]; });
  }
  const angle = finite(model.shapeRotation) * Math.PI / 180;
  points = points.map(([x, y]) => [(50 + (x - 50) * Math.cos(angle) - (y - 50) * Math.sin(angle)) * width / 100, (50 + (x - 50) * Math.sin(angle) + (y - 50) * Math.cos(angle)) * height / 100]);
  const radius = Math.max(0, finite(model.shapeRadius));
  if (!radius) return `polygon(${points.map(([x, y]) => `${x}px ${y}px`).join(",")})`;
  const arcs = points.map((point, i) => {
    const previous = points[(i + points.length - 1) % points.length], next = points[(i + 1) % points.length];
    const a = Math.hypot(previous[0] - point[0], previous[1] - point[1]), b = Math.hypot(next[0] - point[0], next[1] - point[1]);
    const offset = Math.min(radius, a / 2, b / 2);
    const towards = (other, distance) => point.map((value, axis) => value + (other[axis] - value) * (distance ? offset / distance : 0));
    return { start: towards(previous, a), end: towards(next, b), point };
  });
  return `path('M ${arcs[0].start.join(" ")} ${arcs.map(arc => `L ${arc.start.join(" ")} Q ${arc.point.join(" ")} ${arc.end.join(" ")}`).join(" ")} Z')`;
}
