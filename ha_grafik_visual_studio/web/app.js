import { getWidgetSets, getWidgetDefinition, registerWidgetSet, initializeWidgetCaption } from "./widget-registry.js";
import { getLanguagePreference, setLanguagePreference, startLocalization, uiText } from "./localization.js";
import { connectionAnimationEntityId, resolveConnectionAnimation, lineboxAnimationSettings } from "./connection-animation.js";
import { dockPointKey, initializeDockPoints, setAllDockPoints, dockPointSelection } from "./dock-points.js";
import { MATH_ANCHORS, MATH_IDS, mathBoxResult, mathLeadPoint, evaluateMathExpression } from "./linebox-math.js";
import { lineboxHelperOutput, lineboxInputSum, lineboxOutputForConnection, lineboxPortRole, lineboxRuntimeJoinPosition, numericWidgetInput } from "./linebox.js";
import { numberDisplay } from "./number-display.js";
import { sliderScale, sliderLiveValue } from "./slider-scale.js";
import { sliderStyle, updateSliderFill } from "./slider-style.js";
import { groupMembers, groupBounds, translateGroup, remapGroups } from "./widget-groups.js";
import { tabCount, ownTabSurface, allProjectWidgets, tabTarget, canEmbedTab, reidentifyTabWidgets, visibleTabSurfaces } from "./tabs-widget.js";
import "./widget-sets/core.js";
import "./widget-sets/basic2.js";
import "./widget-sets/special.js";

const PRESETS = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 1280, height: 800 },
  phone: { width: 390, height: 844 },
  custom: { width: 1600, height: 900 },
};
const VIEW_PROPERTY_GROUPS = [
  { label: "CSS allgemein", fields: [
    { label: "Anzeige", key: "display", type: "select", options: ["", "block", "none"] },
    { label: "Kommentar", key: "comment" }, { label: "CSS-Klasse", key: "cssClass" },
    { label: "Anfangsfilter", key: "filterWord" }, { label: "Nur für Gruppen", key: "groups" },
    { label: "Thema", key: "theme" },
    { label: "Wenn der Benutzer nicht in der Gruppe ist", key: "outsideGroup", type: "select", options: ["ausblenden", "deaktivieren"] },
  ] },
  { label: "CSS-Hintergrund", fields: [
    { label: "Bild (Datei oder HA-Pfad)", key: "backgroundAsset", previewImage: true }, { label: "Hintergrundklasse", key: "backgroundClass" },
    { label: "Ein Parameter", key: "backgroundSingleParameter", type: "checkbox", default: false },
    { label: "background-color", key: "background", type: "color" }, { label: "background-image", key: "backgroundImage", previewImage: true },
    { label: "background-repeat", key: "backgroundRepeat", type: "select", options: ["", "repeat", "no-repeat", "repeat-x", "repeat-y"] },
    { label: "background-attachment", key: "backgroundAttachment", type: "select", options: ["", "scroll", "fixed", "local"] },
    { label: "background-position", key: "backgroundPosition" }, { label: "background-size", key: "backgroundSize" },
    { label: "background-clip", key: "backgroundClip", type: "select", options: ["", "border-box", "padding-box", "content-box"] },
    { label: "background-origin", key: "backgroundOrigin", type: "select", options: ["", "border-box", "padding-box", "content-box"] },
    { label: "Darstellung", key: "backgroundMode", type: "select", options: [{ value: "tile", label: "Kacheln" }, { value: "center", label: "Zentriert" }, { value: "stretch", label: "Stretch" }] },
  ] },
  { label: "CSS-Schriftart und -Text", fields: [
    { label: "Farbe", key: "textColor", type: "color", default: "#e7ecee" }, { label: "Text-Schatten", key: "textShadow" },
    { label: "Schriftfamilie", key: "fontFamily" }, { label: "Schriftstil", key: "fontStyle", type: "select", options: ["", "normal", "italic", "oblique"] },
    { label: "Schriftart-Variante", key: "fontVariant", type: "select", options: ["", "normal", "small-caps"] },
    { label: "Schriftstärke", key: "fontWeight", type: "select", options: ["", "400", "500", "600", "700"] },
    { label: "Schriftgröße", key: "fontSize", type: "number", min: 6, max: 160 }, { label: "Zeilenhöhe", key: "lineHeight" },
    { label: "Buchstaben-Abstand", key: "letterSpacing" }, { label: "Wortabstand", key: "wordSpacing" },
  ] },
  { label: "Optionen", fields: [
    { label: "Standard", key: "standard", type: "checkbox", default: false }, { label: "Immer rendern", key: "alwaysRender", type: "checkbox", default: false },
    { label: "Netz", key: "grid", type: "select", options: ["", "aus", "sichtbar", "beim Bearbeiten"] },
    { label: "Auflösung", key: "preset", type: "select", refreshProperties: true, options: [
      { value: "custom", label: "Benutzerdefiniert" }, { value: "desktop", label: "Desktop 1920 × 1080" },
      { value: "tablet", label: "Tablet 1280 × 800" }, { value: "phone", label: "Telefon 390 × 844" },
    ] },
  ] },
  { label: "Navigation", fields: [{ label: "Navigation anzeigen", key: "navigationVisible", type: "checkbox", default: true }] },
  { label: "Anwendungsleiste", fields: [{ label: "Anzeigen", key: "appBarVisible", type: "checkbox", default: false }] },
  { label: "Responsive Einstellungen", fields: [
    { label: "Spaltenbreite (px)", key: "columnWidth", type: "range", min: 0, max: 1200 },
    { label: "Spaltenlücke (px)", key: "columnGap", type: "range", min: 0, max: 200 },
    { label: "Reihenlücke (px)", key: "rowGap", type: "range", min: 0, max: 200 },
  ] },
];

const $ = (selector) => document.querySelector(selector);
const params = new URLSearchParams(location.search);
const runtimeMode = location.pathname.endsWith("/runtime") || params.get("mode") === "runtime";
const rootRuntimeMode = runtimeMode;
const workspace = $("#workspace");
const stage = $("#stage");
const stageCanvas = $("#stage-canvas");
startLocalization();
const fileTypes = {
  image: ["png", "jpg", "jpeg", "webp", "svg", "gif", "bmp", "ico"],
  code: ["json", "js", "css", "xml", "yaml", "yml"],
  text: ["txt", "md", "csv", "log"],
  audio: ["mp3", "wav", "ogg", "m4a", "flac"],
  video: ["mp4", "webm", "mov", "mkv"],
};
const state = { project: null, projectId: params.get("project") || "main", selectedId: null, selectedIds: [], nextId: 1, propertyTab: "widget", collapsedWidgetSets: new Set(), expandedPropertySections: new Set(), objectPath: "", selectedFiles: [], fileView: "list", entities: [], devices: [], entityStates: {}, selectedEntityId: "", expandedDevices: new Set(), entitySnapshot: null, entityController: null, widgetClipboard: [], editorWidgetFilter: null, undoStack: [], redoStack: [] };
const WRITABLE_SWITCH_ENTITY = /^(switch|light|input_boolean)\.[a-z0-9_]+$/;
const WRITABLE_NUMBER_HELPER = /^input_number\.[a-z0-9_]+$/;
const WRITABLE_TEXT_HELPER = /^input_text\.[a-z0-9_]+$/;
const pendingSwitches = new Set();
const helperWriteQueue = new Map();
const stagedEntityValues = new Map();
const lineboxOutputTimers = new Map();
const lineboxOutputValues = new Map();
let runtimeStateRequestPending = false;
let runtimeStateError = false;
let runtimeRenderDeferred = false;
let runtimeEffectsFrame = 0;
let editorNumberRequestPending = false;
let mdiIcons = null;
let mdiIconsPromise = null;
let activeIconInput = null;
let activeEntityInput = null;

function createRandomId() {
  if (typeof window.crypto?.randomUUID === "function") return window.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof window.crypto?.getRandomValues === "function") window.crypto.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

const CONNECTION_ANCHORS = [
  ["left-top", "Links oben", 0, 0], ["left-center", "Links Mitte", 0, 0.5], ["left-bottom", "Links unten", 0, 1],
  ["right-top", "Rechts oben", 1, 0], ["right-center", "Rechts Mitte", 1, 0.5], ["right-bottom", "Rechts unten", 1, 1],
  ["top-quarter", "Oben 1/4", 0.25, 0], ["top-center", "Oben Mitte", 0.5, 0], ["top-three-quarter", "Oben 3/4", 0.75, 0],
  ["bottom-quarter", "Unten 1/4", 0.25, 1], ["bottom-center", "Unten Mitte", 0.5, 1], ["bottom-three-quarter", "Unten 3/4", 0.75, 1],
];
const CONNECTION_ANCHOR_IDS = CONNECTION_ANCHORS.map(([id]) => id);
const widgetAnchors = widget => widget.type === "linebox-math" ? MATH_ANCHORS : CONNECTION_ANCHORS;
const widgetAnchorIds = widget => widgetAnchors(widget).map(([id]) => id);
const connectionAnchorGroup = { id: "dock-points", label: "Andockpunkte", masterKey: "dockPointsEnabled", defaultEnabled: false, hint: "Der Haken in der Überschrift aktiviert den Bereich. Alle Punkte sind zunächst aus und lassen sich gemeinsam oder einzeln einschalten.", fields: [
  ...CONNECTION_ANCHORS.map(([id, label]) => ({ label, key: dockPointKey(id), type: "checkbox", default: false })),
  { label: "Mehrfachbelegung erlauben", key: "dockMultiple", type: "checkbox", default: true },
  { label: "Maximale Verbindungen (0 = unbegrenzt)", key: "dockMaxConnections", type: "number", min: 0, max: 99, default: 0 },
  { label: "Spurabstand (px)", key: "dockLaneSpacing", type: "number", min: 0, max: 40, default: 6 },
  { label: "Andockpunkte dauerhaft anzeigen", key: "dockAlwaysVisible", type: "checkbox", default: false },
] };

const commonWidgetGroups = [
  { id: "general", label: "Generell", masterKey: "generalEnabled", defaultEnabled: false, hint: "Gemeinsame Angaben für Auswahl, Suche, Filterung und Darstellung dieses Widgets.", fields: [
    { label: "Name", key: "name" }, { label: "Kommentar", key: "comment" }, { label: "CSS-Klasse", key: "cssClass" },
    { label: "Filterwort", key: "filterWord" }, { label: "multi-views", key: "multiViews" },
    { label: "Inaktiv (gesperrt)", key: "locked", type: "checkbox", default: false },
  ] },
  { id: "visibility", label: "Sichtbarkeit", masterKey: "visibilityEnabled", defaultEnabled: false, hint: "Steuert die Sichtbarkeit anhand eines Home-Assistant-Zustands und optionaler Benutzergruppen.", fields: [
    { label: "Object ID", key: "visibilityEntityId" },
    { label: "Bedingung", key: "visibilityCondition", type: "select", options: ["==", "!=", ">", ">=", "<", "<="] },
    { label: "Wert für die Bedingung", key: "visibilityValue" },
    { label: "Nur für Gruppen", key: "visibilityGroups" },
    { label: "Falls Anwender nicht in der Gruppe", key: "visibilityFallback", type: "select", options: ["ausblenden", "deaktivieren"] },
  ] },
];

function widgetPropertyGroups(widget) {
  const groups = getWidgetDefinition(widget.type).propertyGroups.filter((group) => !["Generell", "Sichtbarkeit"].includes(group.label));
  if (widget.type === "linebox-math") {
    const dockGroup = { ...connectionAnchorGroup, fields: [
      ...MATH_ANCHORS.map(([id, label]) => ({ label, key: dockPointKey(id), type: "checkbox", default: false })),
      ...connectionAnchorGroup.fields.filter(field => !field.key.startsWith("dock_")),
    ] };
    return [...commonWidgetGroups, dockGroup, ...groups];
  }
  if (widget.type === "linebox") {
    const dockGroup = { ...connectionAnchorGroup, fields: connectionAnchorGroup.fields.map(field => field.key.startsWith("dock_") ? { ...field, refreshProperties: true } : field) };
    const portFields = CONNECTION_ANCHORS.flatMap(([anchorId, label]) => {
      if (widget.dockPointsEnabled !== true || widget[dockPointKey(anchorId)] !== true) return [];
      const suffix = anchorId.replaceAll("-", "_");
      const role = { label: `${label}: Rolle`, key: `lineboxRole_${suffix}`, type: "radio", default: "none", options: [
        { value: "input", label: "Eingang" }, { value: "none", label: "Nullstellung" }, { value: "output", label: "Ausgang" },
      ] };
      return widget[role.key] === "output" ? [role, { label: `${label}: Berechneten Wert weitergeben`, key: `lineboxPass_${suffix}`, type: "checkbox", default: false }] : [role];
    });
    return [...commonWidgetGroups, dockGroup, { id: "linebox-ports", label: "Anschlüsse", hint: "Nur aktive Andockpunkte erhalten eine Rolle. Eingänge werden mit Vorzeichen summiert; Ausgänge geben den Wert nur bei aktiviertem Haken weiter.", fields: portFields }, ...groups];
  }
  return widget.type === "svg-connection" ? [...commonWidgetGroups, ...groups] : [...commonWidgetGroups, ...groups, connectionAnchorGroup];
}

async function loadMdiIcons() {
  if (mdiIcons) return mdiIcons;
  mdiIconsPromise ??= fetch("mdi-icons.json").then((response) => {
    if (!response.ok) throw new Error("MDI-Katalog konnte nicht geladen werden.");
    return response.json();
  }).then((catalog) => {
    mdiIcons = new Map(catalog.icons.map((icon) => [icon.name, icon.path]));
    return mdiIcons;
  });
  return mdiIconsPromise;
}

function iconDataUrl(path, color) {
  if (!/^[MmZzLlHhVvCcSsQqTtAa0-9.,+\-\sEe]+$/.test(path)) return "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${color}" d="${path}"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function openIconPicker(input) {
  activeIconInput = input;
  const dialog = $("#icon-picker");
  const search = $("#icon-picker-search");
  $("#icon-picker-value").value = input.value;
  search.value = input.value;
  renderIconPickerResults(search.value);
  dialog.showModal();
  search.focus();
}

async function renderIconPickerResults(query) {
  const results = $("#icon-picker-results");
  results.replaceChildren();
  const normalized = String(query || "").trim().toLowerCase().replace(/^mdi:/, "");
  if (!normalized || normalized.includes(":")) return;
  let icons;
  try { icons = await loadMdiIcons(); }
  catch (error) {
    const notice = document.createElement("p"); notice.className = "property-hint"; notice.textContent = error.message; results.append(notice); return;
  }
  if (normalized !== $("#icon-picker-search").value.trim().toLowerCase().replace(/^mdi:/, "")) return;
  const matches = [...icons.entries()].filter(([name]) => name.includes(normalized)).slice(0, 72);
  for (const [name, path] of matches) {
    const option = document.createElement("button"); option.type = "button"; option.className = "icon-picker-option";
    option.setAttribute("role", "option"); option.title = `mdi:${name}`;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true");
    const shape = document.createElementNS("http://www.w3.org/2000/svg", "path"); shape.setAttribute("d", path); shape.setAttribute("fill", "currentColor"); svg.append(shape);
    const label = document.createElement("span"); label.textContent = name;
    option.append(svg, label);
    option.addEventListener("click", () => applyIconPickerValue(`mdi:${name}`));
    results.append(option);
  }
  if (!matches.length) {
    const empty = document.createElement("p"); empty.className = "property-hint"; empty.textContent = "Keine passenden MDI-Icons gefunden. Andere Iconsets oder Bildpfade kannst du unten direkt eintragen."; results.append(empty);
  }
}

function applyIconPickerValue(value = $("#icon-picker-value").value) {
  if (!activeIconInput) return;
  const selected = String(value || "").trim();
  activeIconInput.value = selected && !selected.includes(":") && !selected.startsWith("/") && !/\.(png|jpe?g|svg|webp)(\?.*)?$/i.test(selected) ? `mdi:${selected}` : selected;
  activeIconInput.dispatchEvent(new Event("input", { bubbles: true }));
  $("#icon-picker").close();
  activeIconInput.focus();
  activeIconInput = null;
}

$("#icon-picker-search").addEventListener("input", (event) => {
  $("#icon-picker-value").value = event.target.value;
  void renderIconPickerResults(event.target.value);
});
$("#icon-picker-value").addEventListener("input", (event) => {
  const search = $("#icon-picker-search");
  if (event.target.value.startsWith("mdi:") || !event.target.value.includes(":")) {
    search.value = event.target.value;
    void renderIconPickerResults(search.value);
  }
});
$("#icon-picker-apply").addEventListener("click", () => applyIconPickerValue());
$("#icon-picker-value").addEventListener("keydown", (event) => {
  if (event.key === "Enter") { event.preventDefault(); applyIconPickerValue(); }
});
$("#icon-picker-close").addEventListener("click", () => $("#icon-picker").close());
$("#icon-picker-objects").addEventListener("click", () => openObjects());
$("#icon-picker").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) event.currentTarget.close();
});

function setIconImageSource(image, value, color = "") {
  const source = safeUrl(value, true);
  if (source) { image.src = source; return; }
  const match = String(value || "").match(/^mdi:([a-z0-9-]+)$/i);
  if (!match) return;
  image.dataset.iconValue = value;
  void loadMdiIcons().then((icons) => {
    const path = icons.get(match[1]);
    const safeColor = /^#[0-9a-f]{3,8}$/i.test(color) ? color : getComputedStyle(document.body).color;
    if (path && image.isConnected && image.dataset.iconValue === value) image.src = iconDataUrl(path, safeColor);
  }).catch(() => {});
}

function propertyGroupKey(group, index) {
  return group.id || `${index}-${group.label.toLocaleLowerCase("de").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function propertyGroupEnabled(widget, group, index) {
  return widget.enabledPropertyGroups?.[propertyGroupKey(group, index)] !== false;
}

function optionalWidgetGroupEnabled(widget, key) {
  if (widget[key] !== undefined) return widget[key] === true;
  const groups = widgetPropertyGroups(widget);
  const index = groups.findIndex(group => group.masterKey === key);
  if (index < 0 || !propertyGroupEnabled(widget, groups[index], index)) return false;
  return key === "signalImagesEnabled" ? Number(widget.signalCount) > 0 : Boolean(widget.extraUrlTrue || widget.extraUrlFalse);
}

function indexedWidgetGroups(widget) {
  if (["sensor", "red-number", "gauge", "bar"].includes(widget.type)) return [{ id: "numeric-source", label: "Wertquelle", fields: [
    { label: "Wertquelle", key: "numericSource", type: "select", default: "entity", refreshProperties: true, options: [{ value: "entity", label: "Home-Assistant-Entität / Vorschau" }, { value: "dock", label: "Wert vom Dockpunkt" }, { value: "preview", label: "Vorschauwert" }] },
    { label: "Eingangs-Dockpunkt", key: "numericInputAnchor", type: "select", default: "left-center", showWhen: { key: "numericSource", value: "dock" }, options: CONNECTION_ANCHORS.map(([value, label]) => ({ value, label })) },
  ], hint: "Den gewählten Andockpunkt aktivieren. Mehrere gültige Linienwerte werden mit Vorzeichen summiert. Ohne gültigen Eingang erscheint --; null ist ein gültiger Wert." }];
  if (widget.type === "tabs") return Array.from({ length: tabCount(widget) }, (_, index) => ({ id: `tab-${index}`, label: `Tab [${index + 1}]`, fields: [
    { label: "Tab-Titel", key: `tabTitle${index}`, default: `Tab ${index + 1}` },
    { label: "Tab-Inhalt", key: `tabSource${index}`, type: "select", default: "own", refreshProperties: true, options: [{ value: "own", label: "Eigene Widget-Fläche" }, { value: "page", label: "Vorhandene Projektseite" }] },
    { label: "Seite", key: `tabPage${index}`, type: "page", showWhen: { key: `tabSource${index}`, value: "page" } },
    { label: "Tabfläche bearbeiten", key: `tabEdit${index}`, type: "tab-edit", tabIndex: index },
    { label: "Symbol", key: `tabIcon${index}`, previewImage: true },
    { label: "Bild", key: `tabImage${index}`, previewImage: true },
    { label: "Symbolgröße (px)", key: `tabIconSize${index}`, type: "number", min: 8, max: 100, default: 24 },
    { label: "Symbolfarbe", key: `tabIconColor${index}`, type: "color", default: "#e7ecee" },
    { label: "Tab-Hintergrundfarbe", key: `tabBackground${index}`, type: "color", default: "transparent" },
    { label: "Überlauf X", key: `tabOverflowX${index}`, type: "select", default: "auto", options: ["none", "visible", "hidden", "scroll", "auto", "initial", "inherit"] },
    { label: "Überlauf Y", key: `tabOverflowY${index}`, type: "select", default: "auto", options: ["none", "visible", "hidden", "scroll", "auto", "initial", "inherit"] },
  ] }));
  const specs = { "iframe-8": ["frames", 20, [{ label: "URL falls Wert", key: "frameSource" }, { label: "Kein Sandkasten", key: "frameNoSandbox", type: "checkbox", default: false }]], "image-8": ["Bild", 50, [{ label: "Quelle", key: "imageSource", previewImage: true }]], "view-in-widget-8": ["Seite", 50, [{ label: "Seite", key: "page", type: "page" }]] };
  const spec = specs[widget.type]; if (!spec) return [];
  const [label, max, fields] = spec; const count = Math.max(1, Math.min(max, Math.trunc(Number(widget.count) || 1)));
  return Array.from({ length: count + 1 }, (_, index) => ({ id: `indexed-${widget.type}-${index}`, label: `${label} [${index}]`, indexed: { index, count, max, fields }, fields: fields.map(field => ({ ...field, key: `${field.key}${index}`, label: `${field.label} [${index}]` })) }));
}

function widgetStateIndex(widget) {
  const value = displayedWidgetState(widget); const index = value === true || ["true", "on"].includes(value) ? 1 : value === false || ["false", "off"].includes(value) ? 0 : Number(value ?? 0);
  const max = widget.type === "iframe-8" ? 20 : 50; const count = Math.max(1, Math.min(max, Math.trunc(Number(widget.count) || 1)));
  return Number.isInteger(index) && index >= 0 && index <= count && widget.enabledPropertyGroups?.[`indexed-${widget.type}-${index}`] !== false ? index : -1;
}

function projectForSave(project) {
  const saved = structuredClone(project);
  for (const page of [...(saved.pages || []), ...allProjectWidgets(saved).flatMap(widget => (widget.tabSurfaces || []).filter(Boolean))]) {
    page.page.enabledPropertyGroups ??= {};
    for (const [index, group] of VIEW_PROPERTY_GROUPS.entries()) {
      if (propertyGroupEnabled(page.page, group, index)) continue;
      for (const descriptor of group.fields) delete page.page[descriptor.key];
    }
    for (const widget of page.widgets || []) {
      const groups = [...widgetPropertyGroups(widget), ...indexedWidgetGroups(widget)];
      widget.enabledPropertyGroups ??= {};
      for (const [index, group] of groups.entries()) {
        if (group.masterKey || propertyGroupEnabled(widget, group, index)) continue;
        for (const descriptor of group.fields) delete widget[descriptor.key];
        if (group.signalImages) {
          delete widget.signalCount;
          delete widget.signalImages;
        }
      }
      if (widget.type === "value-list-html-style") {
        const count = Math.max(1, Math.min(50, Math.trunc(Number(widget.count) || 2)));
        for (let index = 0; index <= count; index++) {
          if (propertyGroupEnabled(widget, { label: `Wert [${index}]` }, groups.length + index)) continue;
          delete widget[`listValue${index}`]; delete widget[`listStyle${index}`];
        }
      }
    }
  }
  return saved;
}

function ensureProjectPages(project) {
  if (!Array.isArray(project.pages)) {
    project.pages = [{ id: "page-1", name: "main", visible: true, page: project.page || { preset: "desktop", ...PRESETS.desktop, background: "#242729", backgroundMode: "tile" }, widgets: Array.isArray(project.widgets) ? project.widgets : [] }];
  }
  if (!project.pages.length) project.pages.push({ id: "page-1", name: "main", visible: true, page: { preset: "desktop", ...PRESETS.desktop, background: "#242729", backgroundMode: "tile" }, widgets: [] });
  project.pages.forEach((page, index) => {
    page.id ||= `page-${index + 1}`;
    page.name ||= `Seite ${index + 1}`;
    page.visible ??= true;
    page.page ||= { preset: "desktop", ...PRESETS.desktop, background: "#242729", backgroundMode: "tile" };
    page.widgets = Array.isArray(page.widgets) ? page.widgets : [];
    for (const widget of page.widgets) if (widget.type !== "svg-connection") initializeDockPoints(widget, widgetAnchorIds(widget));
    ensureWidgetNames(page);
  });
  project.currentPageId = project.pages.some((page) => page.id === project.currentPageId) ? project.currentPageId : project.pages[0].id;
  project.schemaVersion = 2;
  delete project.page;
  delete project.widgets;
  return project;
}

function currentPage() {
  const selected = state.project.pages.find((page) => page.id === state.project.currentPageId);
  const tabContext = !runtimeMode ? state.tabEditor : params.get("tabsWidget") ? { ownerId: params.get("tabsWidget"), index: Number(params.get("tabsIndex")) || 0 } : null;
  if (tabContext) {
    const owner = selected?.widgets.find(widget => widget.id === tabContext.ownerId && widget.type === "tabs");
    if (owner && tabContext.index >= 0 && tabContext.index < tabCount(owner)) {
      const surface = ownTabSurface(owner, tabContext.index);
      for (const widget of surface.widgets) if (widget.type !== "svg-connection") initializeDockPoints(widget, widgetAnchorIds(widget));
      ensureWidgetNames(surface); return surface;
    }
    if (!runtimeMode) state.tabEditor = null;
  }
  if (runtimeMode && params.get("embedded") !== "1" && selected && !selected.visible) {
    const visible = state.project.pages.find((page) => page.visible);
    if (visible) { state.project.currentPageId = visible.id; return visible; }
  }
  return selected || state.project.pages[0];
}

function widgetDisplayName(widget) {
  const explicitName = String(widget?.name || "").trim();
  if (explicitName) return explicitName;
  const legacyTitle = String(widget?.title || "").trim();
  if (legacyTitle) return legacyTitle;
  try { return getWidgetDefinition(widget.type).label; } catch { return widget?.id || "Widget"; }
}

function uniqueWidgetName(page, requested, excludeId = "") {
  const base = String(requested || "Widget").trim() || "Widget";
  const used = new Set(page.widgets.filter(widget => widget.id !== excludeId).map(widget => String(widget.name || "").trim().toLocaleLowerCase("de")).filter(Boolean));
  if (!used.has(base.toLocaleLowerCase("de"))) return base;
  let suffix = 2;
  while (used.has(`${base} ${suffix}`.toLocaleLowerCase("de"))) suffix += 1;
  return `${base} ${suffix}`;
}

function ensureWidgetNames(page) {
  const used = new Set(page.widgets.map(widget => String(widget.name || "").trim().toLocaleLowerCase("de")).filter(Boolean));
  for (const widget of page.widgets) {
    initializeWidgetCaption(widget);
    if (String(widget.name || "").trim()) continue;
    let base = String(widget.title || "").trim();
    if (!base) { try { base = getWidgetDefinition(widget.type).label; } catch { base = "Widget"; } }
    let candidate = base || "Widget"; let suffix = 2;
    while (used.has(candidate.toLocaleLowerCase("de"))) candidate = `${base} ${suffix++}`;
    widget.name = candidate; used.add(candidate.toLocaleLowerCase("de"));
  }
}

let savedProjectSnapshot = "";
let observedProjectSnapshot = "";
let projectChangedAt = 0;
let projectSavePending = false;

function rawProjectSnapshot() { return state.project ? JSON.stringify(state.project) : ""; }

function updateHistoryButtons() {
  const undo = $("#widget-undo"); const redo = $("#widget-redo");
  if (!undo || !redo) return;
  undo.disabled = state.undoStack.length === 0; redo.disabled = state.redoStack.length === 0;
  $("#widget-undo-count").textContent = `${state.undoStack.length} / 50`;
  $("#widget-redo-count").textContent = `${state.redoStack.length} / 50`;
}

function recordHistorySnapshot() {
  const snapshot = rawProjectSnapshot();
  if (!snapshot || state.undoStack.at(-1) === snapshot) return;
  state.undoStack.push(snapshot);
  if (state.undoStack.length > 50) state.undoStack.shift();
  state.redoStack = [];
  updateHistoryButtons();
}

function restoreHistorySnapshot(snapshot) {
  state.editingGroupId = null;
  state.project = ensureProjectPages(JSON.parse(snapshot));
  const page = currentPage(); const available = new Set(page.widgets.map(widget => widget.id));
  state.selectedIds = state.selectedIds.filter(id => available.has(id));
  state.selectedId = state.selectedIds[0] || (available.has(state.selectedId) ? state.selectedId : null);
  state.nextId = Math.max(0, ...allProjectWidgets(state.project).map(widget => Number(widget.id.replace(/\D/g, "")) || 0)) + 1;
  observedProjectSnapshot = JSON.stringify(projectForSave(state.project));
  render();
}

function undoWidgetChange() {
  const snapshot = state.undoStack.pop(); if (!snapshot) return;
  state.redoStack.push(rawProjectSnapshot()); if (state.redoStack.length > 50) state.redoStack.shift();
  restoreHistorySnapshot(snapshot); $("#status").textContent = "Letzte Widget-Änderung rückgängig gemacht";
}

function redoWidgetChange() {
  const snapshot = state.redoStack.pop(); if (!snapshot) return;
  state.undoStack.push(rawProjectSnapshot()); if (state.undoStack.length > 50) state.undoStack.shift();
  restoreHistorySnapshot(snapshot); $("#status").textContent = "Widget-Änderung wiederholt";
}

async function saveProject(automatic = false) {
  if (projectSavePending) return false;
  projectSavePending = true;
  const projectId = state.projectId;
  try {
    const snapshot = JSON.stringify(projectForSave(state.project));
    const response = await fetch(`api/project?project=${encodeURIComponent(projectId)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: snapshot });
    if (!response.ok) throw new Error("Speichern fehlgeschlagen");
    if (state.projectId === projectId) savedProjectSnapshot = snapshot;
    $("#status").textContent = automatic ? "Projekt automatisch gespeichert" : "Projekt lokal gespeichert";
    return true;
  } catch {
    $("#status").textContent = "Speichern fehlgeschlagen – bitte erneut speichern";
    // Retry only after another change or a manual save.
    if (automatic) projectChangedAt = Infinity;
    return false;
  } finally {
    projectSavePending = false;
  }
}

async function loadProject() {
  try {
    const projectsResponse = await fetch("api/projects");
    const projects = projectsResponse.ok ? await projectsResponse.json() : [];
    if (projects.length && !projects.some((project) => project.id === state.projectId)) state.projectId = projects[0].id;
    const response = await fetch(`api/project?project=${encodeURIComponent(state.projectId)}`);
    if (!response.ok) throw new Error("Projekt konnte nicht geladen werden");
    state.project = await response.json();
  } catch {
    state.project = { schemaVersion: 2, name: "Mein Zuhause", pages: [{ id: "page-1", name: "main", visible: true, page: { preset: "desktop", ...PRESETS.desktop, background: "#242729", backgroundMode: "tile" }, widgets: [] }], currentPageId: "page-1" };
  }
  ensureProjectPages(state.project);
  const requestedPage = params.get("page");
  if (requestedPage && state.project.pages.some(page => page.id === requestedPage)) state.project.currentPageId = requestedPage;
  if (runtimeMode && params.get("onlyWidget")) {
    const page = state.project.pages.find(page => page.id === state.project.currentPageId); const widget = page.widgets.find(widget => widget.id === params.get("onlyWidget"));
    page.widgets = widget ? [{ ...widget, x: 0, y: 0 }] : []; if (widget) { page.page.width = widget.width; page.page.height = widget.height; }
  }
  if (params.get("embedded") === "1") document.body.classList.add("embedded-runtime");
  state.project.settings ??= {};
  state.tabEditor = null; state.tabReturn = null;
  state.selectedId = null; state.selectedIds = [];
  state.undoStack = []; state.redoStack = [];
  state.nextId = Math.max(0, ...allProjectWidgets(state.project).map(widget => Number(widget.id.replace(/\D/g, "")) || 0)) + 1;
  render();
  if (!runtimeMode) void renderEditorToolActions();
  document.documentElement.classList.remove("embedded-loading");
  if (params.get("embedded") === "1") parent.postMessage({ type: "gvs-surface-ready" }, location.origin);
  savedProjectSnapshot = observedProjectSnapshot = JSON.stringify(projectForSave(state.project));
  if (runtimeMode) void refreshRuntimeStates();
  else void refreshEditorLiveStates();
}

function displayedWidgetState(widget) {
  if (widget.numericSource) {
    const surface = visibleTabSurfaces(state.project, currentPage(), activeTabIndex).find(page => page.widgets.includes(widget));
    return numericWidgetInput(widget, surface?.widgets || currentPage().widgets, state.entityStates) ?? "--";
  }
  if (runtimeMode && widget.entityId) {
    return state.entityStates[widget.entityId]?.state ?? "--";
  }
  return widget.state;
}

async function fetchEntityStates(ids) {
  const states = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const query = new URLSearchParams(ids.slice(offset, offset + 100).map((id) => ["entity_id", id]));
    const response = await fetch(`api/states?${query}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    states.push(...(payload.states || []));
  }
  return Object.fromEntries(states.map((entry) => [entry.entity_id, entry]));
}

function editorLiveEntityIds() {
  return [...new Set(visibleWidgets().flatMap((widget) => [
    ["sensor", "red-number", "gauge", "bar", "slider", "input-value"].includes(widget.type) && !["dock", "preview"].includes(widget.numericSource) ? widget.entityId : "",
    widget.type === "svg-connection" ? connectionAnimationEntityId(widget) : "",
  ]))]
    .filter((id) => /^[a-z][a-z0-9_]*\.[a-z0-9_]+$/.test(id || ""));
}

async function refreshEditorLiveStates() {
  if (runtimeMode || !state.project || document.hidden || editorNumberRequestPending) return;
  const pageId = currentPage().id;
  const ids = editorLiveEntityIds();
  if (!ids.length) return;
  editorNumberRequestPending = true;
  try {
    const fresh = await fetchEntityStates(ids);
    if (currentPage().id !== pageId) return;
    const next = { ...state.entityStates };
    for (const id of ids) {
      if (fresh[id]) next[id] = fresh[id];
      else delete next[id];
    }
    if (JSON.stringify(next) !== JSON.stringify(state.entityStates)) { state.entityStates = next; renderStage(); }
  } catch {
    if (currentPage().id !== pageId) return;
    const next = { ...state.entityStates };
    for (const id of ids) delete next[id];
    if (JSON.stringify(next) !== JSON.stringify(state.entityStates)) { state.entityStates = next; renderStage(); }
  } finally {
    editorNumberRequestPending = false;
    if (currentPage().id !== pageId || editorLiveEntityIds().join("|") !== ids.join("|")) void refreshEditorLiveStates();
  }
}

function runtimeLiveEntityIds() {
  return [...new Set(visibleWidgets().flatMap((widget) => [
    widget.entityId, widget.visibilityEnabled ? widget.visibilityEntityId : "",
    widget.type === "svg-connection" ? connectionAnimationEntityId(widget) : "",
    widget.type === "linebox" && widget.outputHelperEnabled ? widget.outputHelperEntityId : "",
  ]))]
    .filter((id) => /^[a-z][a-z0-9_]*\.[a-z0-9_]+$/.test(id));
}

async function refreshRuntimeStates() {
  if (!runtimeMode || !state.project || document.hidden || runtimeStateRequestPending) return;
  const pageId = currentPage().id;
  const ids = runtimeLiveEntityIds();
  if (!ids.length) return;
  runtimeStateRequestPending = true;
  try {
    const next = await fetchEntityStates(ids);
    if (currentPage().id !== pageId) return;
    for (const [entityId, staged] of stagedEntityValues) {
      if (String(next[entityId]?.state) === staged.value) { stagedEntityValues.delete(entityId); continue; }
      if (helperWriteQueue.has(entityId) || pendingSwitches.has(entityId) || Date.now() < staged.expiresAt) {
        next[entityId] = { ...(next[entityId] || { entity_id: entityId }), state: staged.value };
      } else stagedEntityValues.delete(entityId);
    }
    const changed = JSON.stringify(next) !== JSON.stringify(state.entityStates);
    if (changed) state.entityStates = next;
    scheduleLineboxHelperOutputs();
    if (changed || runtimeRenderDeferred) renderRuntimeStageWhenReady();
    if (runtimeStateError) $("#status").textContent = "Home-Assistant-Zustände wieder verfügbar";
    runtimeStateError = false;
  } catch {
    if (currentPage().id !== pageId) return;
    if (Object.keys(state.entityStates).length) { state.entityStates = {}; renderRuntimeStageWhenReady(); }
    $("#status").textContent = "Home-Assistant-Zustände konnten nicht geladen werden";
    runtimeStateError = true;
  } finally {
    runtimeStateRequestPending = false;
    if (currentPage().id !== pageId || ids.join("|") !== runtimeLiveEntityIds().join("|")) void refreshRuntimeStates();
  }
}

function stageRuntimeEntityValue(entityId, value) {
  const textValue = String(value);
  stagedEntityValues.set(entityId, { value: textValue, expiresAt: Date.now() + 3000 });
  state.entityStates[entityId] = { ...(state.entityStates[entityId] || { entity_id: entityId }), state: textValue };
  scheduleLineboxHelperOutputs();
  if (runtimeEffectsFrame) return;
  runtimeEffectsFrame = requestAnimationFrame(() => {
    runtimeEffectsFrame = 0;
    for (const surface of visibleTabSurfaces(state.project, currentPage(), activeTabIndex)) {
    const widgets = surface.widgets;
    for (const widget of widgets) {
      if (widget.type === "svg-connection") {
        const content = document.getElementById(widget.id)?.querySelector(".widget-content");
        if (content) updateRuntimeConnectionVisual(widget, widgets, content);
      } else if (widget.type === "slider" && widget.entityId) {
        const range = document.getElementById(widget.id)?.querySelector('input[type="range"]');
        const value = sliderLiveValue(widget, state.entityStates[widget.entityId]);
        if (range && !range.dataset.dragging && value !== null) { range.value = String(value); updateSliderFill(range, widget); }
      } else if (widget.type === "sensor" && (widget.entityId || widget.numericSource === "dock")) {
        const value = document.getElementById(widget.id)?.querySelector(".widget-content .value");
        if (value) renderNumberValue(value, widget, state.entityStates[widget.entityId]);
      } else if (widget.type === "linebox") {
        const value = document.getElementById(`linebox-junction-${widget.id}`)?.querySelector(".linebox-output-value");
        if (value) { value.textContent = lineboxValueText(widget, widgets); value.setAttribute("aria-label", `${uiText("Ausgabewert")}: ${value.textContent}`); }
      } else if (widget.type === "linebox-math") {
        const value = document.getElementById(widget.id)?.querySelector(".math-result");
        if (value) updateMathResult(widget, widgets, value);
      }
    }
    }
  });
}

function scheduleLineboxHelperOutputs() {
  if (!runtimeMode || !state.project || document.hidden) return;
  const rootPageId = currentPage().id;
  const projectId = state.projectId;
  for (const page of visibleTabSurfaces(state.project, currentPage(), activeTabIndex)) {
  const widgets = page.widgets;
  for (const box of widgets.filter(widget => widget.type === "linebox")) {
    const key = `${projectId}:${page.id}:${box.id}`;
    clearTimeout(lineboxOutputTimers.get(key));
    lineboxOutputTimers.delete(key);
    if (box.visible === false) continue;
    const output = lineboxHelperOutput(box, widgets, state.entityStates);
    if (!output) continue;
    if (state.entityStates[output.entityId] === undefined) continue;
    const last = lineboxOutputValues.get(key);
    if (last?.entityId === output.entityId && last.value === output.value) continue;
    if (state.entityStates[output.entityId]?.state !== undefined && Number(state.entityStates[output.entityId].state) === output.value) {
      lineboxOutputValues.set(key, output);
      continue;
    }
    lineboxOutputTimers.set(key, window.setTimeout(() => {
      lineboxOutputTimers.delete(key);
      if (state.projectId !== projectId || currentPage().id !== rootPageId || !visibleTabSurfaces(state.project, currentPage(), activeTabIndex).includes(page)) return;
      const current = lineboxHelperOutput(box, page.widgets, state.entityStates);
      if (!current || current.entityId !== output.entityId || current.value !== output.value) return;
      lineboxOutputValues.set(key, current);
      void writeRuntimeHelperValue(current.entityId, current.value);
    }, 350));
  }
  }
}

function renderRuntimeStageWhenReady() {
  if (helperWriteQueue.size || document.activeElement?.matches(".widget-input[data-editing='true'], input[type='range'][data-dragging='true']")) {
    runtimeRenderDeferred = true;
    return;
  }
  runtimeRenderDeferred = false;
  renderStage();
}

async function writeRuntimeSwitch(widget, enabled) {
  const entityId = widget.entityId;
  if (!WRITABLE_SWITCH_ENTITY.test(entityId || "") || pendingSwitches.has(entityId)) return;
  pendingSwitches.add(entityId);
  stageRuntimeEntityValue(entityId, enabled ? "on" : "off");
  renderRuntimeStageWhenReady();
  try {
    const response = await fetch("api/switch", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_id: entityId, enabled }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(uiText(payload.error || `HTTP ${response.status}`));
    }
    $("#status").textContent = "Schaltbefehl gesendet; warte auf Home Assistant";
  } catch (error) {
    stagedEntityValues.delete(entityId);
    $("#status").textContent = `${uiText("Schalten fehlgeschlagen")}: ${error.message}`;
  } finally {
    pendingSwitches.delete(entityId);
    renderRuntimeStageWhenReady();
    void refreshRuntimeStates();
  }
}

function switchWidgetReady(widget) {
  return !widget.entityId || WRITABLE_SWITCH_ENTITY.test(widget.entityId) && ["on", "off"].includes(state.entityStates[widget.entityId]?.state) && !pendingSwitches.has(widget.entityId);
}

function setRuntimeBooleanWidget(widget, enabled) {
  if (widget.entityId) {
    if (switchWidgetReady(widget)) void writeRuntimeSwitch(widget, enabled);
    else $("#status").textContent = uiText("Keine schaltbare Home-Assistant-Entität mit verfügbarem Zustand");
  } else {
    widget.state = enabled ? "on" : "off";
    renderStage();
  }
}

function stateElementReady(widget, nextValue) {
  if (!widget.entityId) return true;
  if (WRITABLE_SWITCH_ENTITY.test(widget.entityId)) return switchWidgetReady(widget) && ["on", "off", "true", "false", "1", "0"].includes(String(nextValue).toLowerCase());
  if (WRITABLE_NUMBER_HELPER.test(widget.entityId)) return state.entityStates[widget.entityId] !== undefined && nextValue !== "" && Number.isFinite(Number(nextValue));
  return WRITABLE_TEXT_HELPER.test(widget.entityId) && state.entityStates[widget.entityId] !== undefined;
}

function setRuntimeStateElement(widget, value) {
  if (!widget.entityId) { widget.state = value; renderStage(); return; }
  if (WRITABLE_SWITCH_ENTITY.test(widget.entityId)) {
    const enabled = isOn(value);
    if (["on", "off", "true", "false", "1", "0"].includes(String(value).toLowerCase())) setRuntimeBooleanWidget(widget, enabled);
    else $("#status").textContent = uiText("Der Zustand passt nicht zur schaltbaren Entität");
  } else if (WRITABLE_NUMBER_HELPER.test(widget.entityId)) {
    const number = Number(value);
    if (Number.isFinite(number)) void writeRuntimeHelperValue(widget.entityId, number);
    else $("#status").textContent = uiText("Der Zustand muss eine Zahl sein");
  } else if (WRITABLE_TEXT_HELPER.test(widget.entityId)) void writeRuntimeHelperValue(widget.entityId, String(value));
}

async function writeRuntimeHelperValue(entityId, value) {
  stageRuntimeEntityValue(entityId, value);
  const previous = helperWriteQueue.get(entityId) || Promise.resolve();
  const request = previous.catch(() => {}).then(async () => {
    const response = await fetch("api/helper-value", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_id: entityId, value }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(uiText(payload.error || `HTTP ${response.status}`));
    }
  });
  helperWriteQueue.set(entityId, request);
  try {
    await request;
    $("#status").textContent = uiText("Wert an Home Assistant gesendet");
    return true;
  } catch (error) {
    stagedEntityValues.delete(entityId);
    $("#status").textContent = `${uiText("Wert konnte nicht gesetzt werden")}: ${error.message}`;
    return false;
  } finally {
    if (helperWriteQueue.get(entityId) === request) {
      helperWriteQueue.delete(entityId);
      renderRuntimeStageWhenReady();
      void refreshRuntimeStates();
    }
  }
}

if (runtimeMode) {
  window.setInterval(() => { void refreshRuntimeStates(); }, 5000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) void refreshRuntimeStates(); });
} else {
  window.setInterval(() => { void refreshEditorLiveStates(); }, 5000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) void refreshEditorLiveStates(); });
}

if (!runtimeMode) setInterval(() => {
  if (!savedProjectSnapshot || !state.project) return;
  const snapshot = JSON.stringify(projectForSave(state.project));
  if (snapshot !== observedProjectSnapshot) {
    observedProjectSnapshot = snapshot;
    projectChangedAt = Date.now();
  }
  const settings = state.project.settings || {};
  const delay = Math.max(1, Math.min(300, Number(settings.autoSaveDelaySeconds) || 5)) * 1000;
  if (settings.autoSave !== false && snapshot !== savedProjectSnapshot && Date.now() - projectChangedAt >= delay) void saveProject(true);
}, 250);

function renderPalette() {
  const palette = $("#palette");
  palette.replaceChildren();
  const search = $("#palette-search").value.trim().toLocaleLowerCase();
  const widgetSets = getWidgetSets();
  if (!state.paletteAccordionReady) {
    state.collapsedWidgetSets = new Set(widgetSets.slice(1).map(set => set.id));
    state.paletteAccordionReady = true;
  }
  for (const set of widgetSets) {
    const widgets = search ? set.widgets.filter(definition =>
      [definition.label, definition.type, set.label, ...(definition.searchTerms || [])].some(value => String(value || "").toLocaleLowerCase().includes(search))) : set.widgets;
    if (!widgets.length) continue;
    const group = document.createElement("details");
    group.className = "widget-group";
    group.dataset.widgetSetId = set.id;
    group.open = Boolean(search) || !state.collapsedWidgetSets.has(set.id);
    group.addEventListener("toggle", () => {
      if (search) return;
      if (group.open) {
        state.collapsedWidgetSets.delete(set.id);
        for (const other of palette.querySelectorAll(".widget-group")) {
          if (other === group) continue;
          other.open = false;
          state.collapsedWidgetSets.add(other.dataset.widgetSetId);
        }
      } else state.collapsedWidgetSets.add(set.id);
    });
    const summary = document.createElement("summary");
    summary.textContent = set.label;
    const list = document.createElement("div");
    list.className = "widget-list";
    for (const definition of widgets) {
      const button = document.createElement("button");
      button.className = "widget-choice";
      const label = document.createElement("span");
      label.className = "widget-choice-label";
      label.textContent = definition.label;
      const preview = document.createElement("span");
      preview.className = "widget-choice-preview";
      preview.dataset.kind = definition.preview?.kind || "symbol";
      preview.setAttribute("aria-hidden", "true");
      if (definition.iconSvg) {
        const icon = document.createElement("img"); icon.src = definition.iconSvg; icon.alt = ""; preview.append(icon);
      } else for (const lineText of definition.preview?.lines || [definition.icon]) {
        const line = document.createElement("span");
        line.textContent = lineText;
        preview.append(line);
      }
      button.append(label, preview);
      button.addEventListener("click", () => addWidget(definition));
      list.append(button);
    }
    group.append(summary, list);
    palette.append(group);
  }
  if (search && !palette.childElementCount) {
    const empty = document.createElement("p");
    empty.className = "palette-empty";
    empty.textContent = uiText("Keine Widgets gefunden");
    palette.append(empty);
  }
}

function renderPageMenu() {
  const list = $("#page-list");
  list.replaceChildren();
  for (const page of state.project.pages) {
    if (runtimeMode && !page.visible) continue;
    const row = document.createElement("div");
    row.className = `page-row${page.id === state.project.currentPageId ? " active" : ""}${page.visible ? "" : " hidden-page"}`;
    if (runtimeMode) row.classList.add("runtime-page-row");
    const select = document.createElement("button"); select.type = "button"; select.className = "page-select";
    select.textContent = `${page.visible ? "◉" : "◌"}  ${page.name}`;
    select.setAttribute("aria-current", String(page.id === state.project.currentPageId));
    select.addEventListener("click", () => { state.tabEditor = null; state.tabReturn = null; state.project.currentPageId = page.id; state.selectedId = null; state.selectedIds = []; render(); if (runtimeMode) void refreshRuntimeStates(); else void refreshEditorLiveStates(); });
    row.append(select);
    if (!runtimeMode) {
      const visibility = document.createElement("button"); visibility.type = "button"; visibility.textContent = page.visible ? "◉" : "◌"; visibility.title = page.visible ? "In Runtime sichtbar" : "In Runtime ausgeblendet"; visibility.setAttribute("aria-label", `${page.visible ? "Ausblenden" : "Einblenden"}: ${page.name}`);
      visibility.disabled = page.visible && state.project.pages.filter((item) => item.visible).length <= 1;
      visibility.addEventListener("click", () => {
        if (page.visible && state.project.pages.filter((item) => item.visible).length <= 1) return;
        page.visible = !page.visible; render();
      }); row.append(visibility);
      const rename = document.createElement("button"); rename.type = "button"; rename.textContent = "✎"; rename.title = "Seitennamen bearbeiten"; rename.setAttribute("aria-label", `Name von ${page.name} bearbeiten`);
      rename.addEventListener("click", () => {
        const name = window.prompt(uiText("Name der Seite"), page.name);
        if (name !== null && name.trim()) { page.name = name.trim(); render(); }
      });
      row.append(rename);
      const duplicate = document.createElement("button"); duplicate.type = "button"; duplicate.textContent = "▣"; duplicate.title = "Seite duplizieren"; duplicate.setAttribute("aria-label", `${page.name} duplizieren`);
      duplicate.addEventListener("click", () => duplicatePage(page)); row.append(duplicate);
      if (state.project.pages.length > 1) {
        const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "▤"; remove.title = "Seite löschen"; remove.setAttribute("aria-label", `${page.name} löschen`);
        remove.addEventListener("click", () => { if (window.confirm(uiText("Seite „{name}“ löschen?", { name: page.name }))) deletePage(page); }); row.append(remove);
      }
    }
    list.append(row);
  }
}

function renderWidgetFinder() {
  const page = currentPage();
  const selected = new Set(state.selectedIds.length ? state.selectedIds : state.selectedId ? [state.selectedId] : []);
  $("#widget-selection-count").textContent = String(page.widgets.length);
  const toggle = $("#widget-finder-toggle");
  toggle.disabled = page.widgets.length === 0;
  toggle.firstChild.textContent = selected.size === 1 ? `${widgetDisplayName(page.widgets.find(widget => selected.has(widget.id)))} ` : selected.size ? `${selected.size} Widgets ausgewählt ` : page.widgets.length ? "Widgets auswählen " : "Keine Widgets ";
  const list = $("#widget-selector-list");
  list.replaceChildren();
  const draft = state.widgetSelectionDraft || selected;
  for (const widget of page.widgets) {
    const definition = getWidgetDefinition(widget.type);
    const row = document.createElement("label"); row.className = "widget-selector-row";
    const check = document.createElement("input"); check.type = "checkbox"; check.checked = draft.has(widget.id); check.dataset.widgetId = widget.id;
    check.addEventListener("change", () => {
      state.widgetSelectionDraft ??= new Set(selected);
      if (check.checked) state.widgetSelectionDraft.add(widget.id); else state.widgetSelectionDraft.delete(widget.id);
      applyWidgetSelection(state.widgetSelectionDraft);
    });
    const preview = document.createElement("span"); preview.className = "widget-choice-preview widget-selector-preview"; preview.dataset.kind = definition.preview?.kind || "symbol";
    for (const lineText of definition.preview?.lines || [definition.icon || "□"]) { const line = document.createElement("span"); line.textContent = lineText; preview.append(line); }
    const name = document.createElement("span"); name.className = "widget-selector-name"; name.textContent = widgetDisplayName(widget);
    const meta = document.createElement("small"); meta.textContent = `${definition.label} · ${widget.id}`; name.append(meta);
    row.append(check, preview, name); list.append(row);
  }
  updateWidgetSelectorAllState();
  const selectionCount = selected.size;
  $("#widget-selector-copy").disabled = selectionCount === 0;
  $("#widget-selector-delete").disabled = selectionCount === 0;
  $("#widget-duplicate").disabled = selectionCount === 0;
  $("#widget-delete").disabled = selectionCount === 0;
  $("#widget-cut").disabled = selectionCount === 0;
  $("#widget-copy").disabled = selectionCount === 0;
  $("#widget-paste").disabled = state.widgetClipboard.length === 0;
  $("#widget-layer-up").disabled = !state.selectedId;
  $("#widget-layer-down").disabled = !state.selectedId || Number(page.widgets.find((widget) => widget.id === state.selectedId)?.layer || 0) <= 0;
  $("#widget-export").disabled = !state.selectedId;
  const alignmentCount = selectedNormalWidgets().length;
  for (const button of document.querySelectorAll(".alignment-toolbar button")) button.disabled = alignmentCount < 2;
  updateHistoryButtons();
}

function updateWidgetSelectorAllState() {
  const check = $("#widget-selector-all");
  if (!check || !state.project) return;
  const total = currentPage().widgets.length; const count = (state.widgetSelectionDraft || new Set()).size;
  check.checked = total > 0 && count === total; check.indeterminate = count > 0 && count < total;
}

function applyWidgetSelection(ids) {
  const ordered = currentPage().widgets.map(widget => widget.id).filter(id => ids.has(id));
  state.selectedIds = ordered; state.selectedId = ordered[0] || null;
  renderStage(); renderProperties(); renderWidgetFinder();
}

function toggleWidgetSelector(open = $("#widget-selector-menu").hidden) {
  const menu = $("#widget-selector-menu"); const button = $("#widget-finder-toggle");
  if (open) {
    state.widgetSelectionDraft = new Set(state.selectedIds.length ? state.selectedIds : state.selectedId ? [state.selectedId] : []);
    renderWidgetFinder();
    const rect = button.getBoundingClientRect(); menu.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - Math.min(470, innerWidth - 16) - 8))}px`; menu.style.minWidth = `${Math.max(260, rect.width)}px`;
  } else state.widgetSelectionDraft = null;
  menu.hidden = !open; button.setAttribute("aria-expanded", String(open));
}

function selectedWidgetFilterWords() {
  return [...new Set(selectedWidgets().filter(widget => widget.generalEnabled === true).flatMap(widget => String(widget.filterWord || "").split(/[;,]/)).map(word => word.trim()).filter(Boolean))];
}

function openWidgetFilterDialog() {
  const words = selectedWidgetFilterWords(); const dialog = $("#widget-filter-dialog");
  $("#widget-filter-summary").textContent = words.length ? `Verwendete Filterschlüssel: ${words.join(", ")}` : "Die ausgewählten Widgets besitzen keinen aktivierten Filterschlüssel.";
  $("#widget-filter-apply").disabled = words.length === 0;
  const mode = state.editorWidgetFilter?.mode || "hide";
  const radio = document.querySelector(`input[name="widget-filter-mode"][value="${mode}"]`); if (radio) radio.checked = true;
  dialog.dataset.words = JSON.stringify(words); dialog.showModal();
}

function applyWidgetEditorFilter() {
  const words = JSON.parse($("#widget-filter-dialog").dataset.words || "[]");
  const mode = document.querySelector('input[name="widget-filter-mode"]:checked')?.value || "hide";
  state.editorWidgetFilter = words.length ? { words, mode } : null;
  $("#widget-filter-open").setAttribute("aria-pressed", String(Boolean(state.editorWidgetFilter)));
  renderStage();
  $("#status").textContent = state.editorWidgetFilter ? `Widget-Filter aktiv: ${words.join(", ")}` : "Widget-Filter aufgehoben";
}

function openObjects(path = "") {
  state.objectPath = path;
  state.selectedFiles = [];
  const dialog = $("#objects-dialog");
  if (!dialog.open) dialog.showModal();
  void renderObjects();
}

function openEntities(input = null) {
  activeEntityInput = input;
  const dialog = $("#entities-dialog");
  $("#entities-copy").hidden = Boolean(input);
  $("#entities-insert").hidden = !input;
  $("#entities-insert").disabled = !state.selectedEntityId;
  $("#entities-copy").disabled = !state.selectedEntityId;
  if (input?.value) state.selectedEntityId = input.value;
  if (!dialog.open) dialog.showModal();
  $("#entities-search").focus();
  renderEntities();
  void loadEntities();
}

function closeEntities() {
  $("#entities-dialog").close();
  activeEntityInput = null;
  window.clearTimeout(state.entityRequestTimeout);
  state.entityController?.abort();
  state.entityController = null;
}

async function loadEntities() {
  state.entityController?.abort();
  const controller = new AbortController();
  state.entityController = controller;
  $("#entities-status").textContent = "Entitäten und Zustände werden von Home Assistant geladen …";
  state.entityRequestTimeout = window.setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch("api/entities", { cache: "no-store", signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (state.entityController !== controller) return;
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    receiveEntities(data);
  } catch (error) {
    if (state.entityController !== controller) return;
    const message = error.name === "AbortError" ? "Zeitüberschreitung beim Abruf der Home-Assistant-API." : error.message;
    $("#entities-status").textContent = `Entitäten konnten nicht geladen werden: ${message}`;
  } finally {
    window.clearTimeout(state.entityRequestTimeout);
    if (state.entityController === controller) state.entityController = null;
  }
}

function receiveEntities(message) {
  const entities = Array.isArray(message.entities) ? message.entities.filter((entity) => entity.entity_id && !entity.disabled_by) : [];
  const devices = Array.isArray(message.devices) ? message.devices : [];
  const entityStates = Object.fromEntries((Array.isArray(message.states) ? message.states : []).map((item) => [item.entity_id, item]));
  const signature = (entity) => JSON.stringify([entity.entity_id, entity.name, entity.name_by_user, entity.device_id, entityStates[entity.entity_id]?.state]);
  const nextSnapshot = new Map(entities.map((entity) => [entity.entity_id, signature(entity)]));
  let summary = `${entities.length} Entitäten geladen`;
  if (state.entitySnapshot) {
    let added = 0; let removed = 0; let changed = 0;
    for (const [id, value] of nextSnapshot) {
      if (!state.entitySnapshot.has(id)) added++;
      else if (state.entitySnapshot.get(id) !== value) changed++;
    }
    for (const id of state.entitySnapshot.keys()) if (!nextSnapshot.has(id)) removed++;
    summary += added || removed || changed ? ` · ${added} neu, ${removed} entfernt, ${changed} geändert` : " · keine Änderungen";
  }
  state.entitySnapshot = nextSnapshot;
  state.entities = entities;
  state.devices = devices;
  state.entityStates = entityStates;
  if (!entities.some((entity) => entity.entity_id === state.selectedEntityId)) state.selectedEntityId = "";
  $("#entities-status").textContent = summary;
  renderEntities();
  renderStage();
}

function entityName(entity) {
  const stateEntry = state.entityStates[entity.entity_id];
  return stateEntry?.attributes?.friendly_name || entity.name_by_user || entity.name || entity.original_name || entity.entity_id;
}

function renderEntities() {
  const tree = $("#entities-tree");
  tree.replaceChildren();
  const selected = state.entities.find((entity) => entity.entity_id === state.selectedEntityId);
  $("#entity-selected-id").textContent = selected?.entity_id || "Keine Entität ausgewählt";
  $("#entity-selected-state").textContent = selected ? `Zustand: ${state.entityStates[selected.entity_id]?.state ?? "unbekannt"}` : "";
  $("#entities-copy").disabled = !selected;
  $("#entities-insert").disabled = !selected || !activeEntityInput;
  if (!state.entities.length) {
    return;
  }
  const query = $("#entities-search").value.trim().toLocaleLowerCase("de");
  const devices = new Map(state.devices.map((device) => [device.id, device]));
  const groups = new Map(); const unassigned = [];
  for (const entity of state.entities) {
    if (!entity.device_id) { unassigned.push(entity); continue; }
    if (!groups.has(entity.device_id)) groups.set(entity.device_id, []);
    groups.get(entity.device_id).push(entity);
  }
  const createEntityRow = (entity) => {
    const row = document.createElement("button"); row.type = "button"; row.className = "entity-tree-item"; row.setAttribute("role", "treeitem");
    row.setAttribute("aria-selected", String(entity.entity_id === state.selectedEntityId));
    const icon = document.createElement("img"); icon.src = "icons/entity.svg"; icon.alt = "";
    const text = document.createElement("span"); text.className = "entity-tree-label";
    const title = document.createElement("strong"); title.textContent = entityName(entity);
    const id = document.createElement("small"); id.textContent = entity.entity_id; text.append(title, id);
    const value = document.createElement("span"); value.className = "entity-tree-state"; value.textContent = state.entityStates[entity.entity_id]?.state ?? "—";
    row.append(icon, text, value);
    row.addEventListener("click", () => { state.selectedEntityId = entity.entity_id; renderEntities(); });
    return row;
  };
  const matchingUnassigned = unassigned.filter((entity) => !query || `${entityName(entity)} ${entity.entity_id}`.toLocaleLowerCase("de").includes(query));
  if (matchingUnassigned.length) {
    const group = document.createElement("section"); group.className = "entity-tree-group";
    const heading = document.createElement("h3"); heading.textContent = `Ohne Gerät (${matchingUnassigned.length})`; group.append(heading);
    for (const entity of matchingUnassigned) group.append(createEntityRow(entity));
    tree.append(group);
  }
  for (const [deviceId, deviceEntities] of groups) {
    const device = devices.get(deviceId) || {};
    const deviceName = device.name_by_user || device.name || device.model || device.manufacturer || `Gerät ${deviceId}`;
    const deviceMatches = !query || deviceName.toLocaleLowerCase("de").includes(query);
    const matching = deviceMatches ? deviceEntities : deviceEntities.filter((entity) => `${entityName(entity)} ${entity.entity_id}`.toLocaleLowerCase("de").includes(query));
    if (!matching.length) continue;
    const section = document.createElement("section"); section.className = "entity-tree-group";
    const expanded = deviceMatches && query ? true : state.expandedDevices.has(deviceId);
    const heading = document.createElement("button"); heading.type = "button"; heading.className = "entity-device-row"; heading.setAttribute("role", "treeitem"); heading.setAttribute("aria-expanded", String(expanded));
    const caret = document.createElement("span"); caret.className = "entity-caret"; caret.textContent = expanded ? "▾" : "▸";
    const icon = document.createElement("img"); icon.src = "icons/folder.svg"; icon.alt = "";
    const label = document.createElement("strong"); label.textContent = deviceName;
    const count = document.createElement("small"); count.textContent = `${matching.length}`;
    heading.append(caret, icon, label, count);
    heading.addEventListener("click", () => {
      if (state.expandedDevices.has(deviceId)) state.expandedDevices.delete(deviceId); else state.expandedDevices.add(deviceId);
      renderEntities();
    });
    section.append(heading);
    if (expanded) for (const entity of matching) section.append(createEntityRow(entity));
    tree.append(section);
  }
  if (!tree.childElementCount) {
    const empty = document.createElement("p"); empty.className = "empty";
    empty.textContent = "Keine passenden Entitäten gefunden."; tree.append(empty);
  }
}

function renderFileSelection() {
  const count = state.selectedFiles.length;
  $("#files-selection-count").textContent = count ? count + " Datei(en) ausgewählt" : "Keine Dateien ausgewählt";
  $("#files-copy").disabled = count === 0;
  const oneImage = count === 1 && fileCategory(state.selectedFiles[0]) === "image";
  $("#files-apply").disabled = !activeIconInput || !oneImage;
  $("#files-apply").title = count > 1 ? "Zum Übernehmen bitte genau eine Bilddatei auswählen" : "Ausgewählte Bilddatei ins Feld übernehmen";
}

function fileCategory(path) {
  const extension = String(path).split(".").pop().toLowerCase();
  return Object.entries(fileTypes).find(([, extensions]) => extensions.includes(extension))?.[0] || "other";
}

function fileAccept(category) {
  const extensions = category === "all" ? Object.values(fileTypes).flat() : fileTypes[category] || [];
  return extensions.map((extension) => "." + extension).join(",");
}

function cancelFileSelection() {
  $("#objects-dialog").close();
  state.selectedFiles = [];
  renderFileSelection();
  if (!$("#icon-picker").open) activeIconInput = null;
}

async function uploadFiles(fileList) {
  const files = [...fileList];
  if (!files.length) return;
  $("#files-upload").disabled = true;
  $("#files-upload").textContent = "Upload läuft …";
  const results = [];
  let uploadError = "";
  try {
    for (const file of files) {
      const path = [state.objectPath, file.name].filter(Boolean).join("/");
      const response = await fetch("api/files?path=" + encodeURIComponent(path), {
        method: "POST", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file,
      });
      const result = await response.json().catch(() => ({}));
      results.push({ file, response, result });
    }
  } catch (error) {
    uploadError = error.message;
  } finally {
    $("#files-upload").disabled = false;
    $("#files-upload").textContent = "⬆ Hochladen";
  }
  const succeeded = results.filter((item) => item.response.ok).length;
  const failures = results.filter((item) => !item.response.ok);
  const messages = failures.map((item) => item.file.name + ": " + (item.result.error || item.response.statusText));
  if (uploadError) messages.push("Übertragung abgebrochen: " + uploadError);
  $("#status").textContent = messages.length
    ? succeeded + "/" + files.length + " Dateien hochgeladen. " + messages.join("; ")
    : succeeded + " Datei(en) hochgeladen";
  $("#files-upload-input").value = "";
  state.selectedFiles = [];
  await renderObjects();
}

async function renderObjects() {
  const browser = $("#objects-browser");
  browser.classList.toggle("grid-view", state.fileView === "grid");
  const breadcrumb = $("#objects-breadcrumb");
  browser.replaceChildren(); breadcrumb.replaceChildren();
  renderFileSelection();
  const parts = state.objectPath ? state.objectPath.split("/") : [];
  const root = document.createElement("button"); root.type = "button"; root.textContent = "studio"; root.title = "/config/www/studio"; root.addEventListener("click", () => openObjects("")); breadcrumb.append(root);
  let path = "";
  for (const part of parts) {
    path = path ? `${path}/${part}` : part;
    const current = path; const crumb = document.createElement("button"); crumb.type = "button"; crumb.textContent = part; crumb.addEventListener("click", () => openObjects(current)); breadcrumb.append(" / ", crumb);
  }
  const search = $("#files-search").value.trim();
  const request = ++renderObjects.request;
  const response = await fetch(`api/objects?path=${encodeURIComponent(state.objectPath)}&search=${encodeURIComponent(search)}`);
  const data = response.ok ? await response.json() : { available: false, folders: [], files: [] };
  if (request !== renderObjects.request) return;
  if (!data.available) { const hint = document.createElement("p"); hint.className = "empty"; hint.textContent = data.error || `Der Ordner /config/www/studio ist nicht verfügbar. Bitte den Ordner erstellen und die Zugriffsrechte prüfen. Geprüfte Pfade: ${(data.checked || []).join(", ")}.`; browser.append(hint); return; }
  if (state.objectPath) {
    const up = document.createElement("button"); up.type = "button"; up.className = "object-folder object-folder-up";
    const upIcon = document.createElement("img"); upIcon.src = "icons/folder-up.svg"; upIcon.alt = "";
    const upName = document.createElement("span"); upName.textContent = "Übergeordneter Ordner"; up.append(upIcon, upName);
    up.addEventListener("click", () => openObjects(parts.slice(0, -1).join("/"))); browser.append(up);
  }
  for (const folder of data.folders) {
    const row = document.createElement("div"); row.className = "object-row object-folder-row";
    const button = document.createElement("button"); button.type = "button"; button.className = "object-folder";
    const folderIcon = document.createElement("img"); folderIcon.src = "icons/folder.svg"; folderIcon.alt = "";
    const folderName = document.createElement("span"); folderName.textContent = folder.name; button.append(folderIcon, folderName);
    button.title = `Ordner ${folder.name} öffnen`; button.addEventListener("click", () => openObjects(folder.path));
    const count = document.createElement("span"); count.className = "object-size"; count.textContent = "Ordner";
    row.append(button, count, document.createElement("span")); browser.append(row);
  }
  const category = $("#files-type-filter").value;
  const visibleFiles = data.files.filter((file) => category === "all" || fileCategory(file.path) === category);
  for (const file of visibleFiles) {
    const row = document.createElement("div"); row.className = "object-row object-file-row";
    const select = document.createElement("button"); select.type = "button"; select.className = "object-file"; select.title = `Datei ${file.name} auswählen`;
    if (fileCategory(file.path) === "image") {
      const image = document.createElement("img"); image.src = file.url; image.alt = ""; image.loading = "lazy"; select.append(image);
    } else {
      const typeIcon = document.createElement("img"); typeIcon.className = "object-type-icon";
      typeIcon.src = `icons/${fileCategory(file.path) === "other" ? "file" : fileCategory(file.path)}.svg`; typeIcon.alt = ""; select.append(typeIcon);
    }
    const name = document.createElement("span"); name.textContent = file.name;
    if (search) { const path = document.createElement("small"); path.className = "object-search-path"; path.textContent = file.path; name.append(path); }
    select.append(name);
    select.setAttribute("aria-pressed", String(state.selectedFiles.includes(file.path)));
    select.addEventListener("click", () => {
      state.selectedFiles = state.selectedFiles.includes(file.path)
        ? state.selectedFiles.filter((path) => path !== file.path)
        : [...state.selectedFiles, file.path];
      select.setAttribute("aria-pressed", String(state.selectedFiles.includes(file.path)));
      renderFileSelection();
    });
    const size = document.createElement("span"); size.className = "object-size"; size.textContent = formatFileSize(file.size);
    const actions = document.createElement("span"); actions.className = "object-file-actions";
    const download = document.createElement("a"); download.className = "object-icon-action"; download.href = file.url; download.download = file.name;
    const downloadIcon = document.createElement("img"); downloadIcon.src = "icons/download.svg"; downloadIcon.alt = ""; download.append(downloadIcon);
    download.title = `Datei ${file.name} herunterladen`; download.setAttribute("aria-label", `Datei ${file.name} herunterladen`);
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "object-icon-action";
    const deleteIcon = document.createElement("img"); deleteIcon.src = "icons/delete.svg"; deleteIcon.alt = ""; remove.append(deleteIcon);
    remove.title = `Datei ${file.name} löschen`; remove.setAttribute("aria-label", `Datei ${file.name} löschen`);
    remove.addEventListener("click", async () => {
      if (!window.confirm(uiText("Datei „{name}“ dauerhaft löschen?", { name: file.name }))) return;
      const response = await fetch(`api/files?path=${encodeURIComponent(file.path)}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { $("#status").textContent = result.error || "Datei konnte nicht gelöscht werden"; return; }
      state.selectedFiles = state.selectedFiles.filter((path) => path !== file.path);
      $("#status").textContent = `Datei ${file.name} gelöscht`;
      await renderObjects();
    });
    actions.append(download, remove); row.append(select, size, actions); browser.append(row);
  }
  if (!data.folders.length && !visibleFiles.length) { const empty = document.createElement("p"); empty.className = "empty"; empty.textContent = search ? uiText("Keine passenden Dateien gefunden.") : category === "all" ? "Dieser Ordner enthält keine unterstützten Dateien." : "Keine Dateien dieses Typs in diesem Ordner."; browser.append(empty); }
  renderFileSelection();
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function renderProjects() {
  const list = $("#projects-list"); list.replaceChildren();
  const response = await fetch("api/projects");
  const projects = response.ok ? await response.json() : [];
  for (const project of projects) {
    const row = document.createElement("div"); row.className = "project-row";
    const name = document.createElement("strong"); name.textContent = project.name; row.append(name);
    const edit = document.createElement("button"); edit.type = "button"; edit.textContent = "Editor"; edit.addEventListener("click", () => { location.href = `?mode=editor&project=${encodeURIComponent(project.id)}`; }); row.append(edit);
    const runtime = document.createElement("button"); runtime.type = "button"; runtime.textContent = "Runtime"; runtime.addEventListener("click", () => { window.open(`?mode=runtime&project=${encodeURIComponent(project.id)}`, "_blank", "noopener"); }); row.append(runtime);
    const rename = document.createElement("button"); rename.type = "button"; rename.textContent = "✎"; rename.title = "Projekt umbenennen"; rename.addEventListener("click", async () => {
      const newName = window.prompt(uiText("Projektname"), project.name); if (!newName?.trim()) return;
      await fetch(`api/projects/${encodeURIComponent(project.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName.trim() }) }); void renderProjects();
    }); row.append(rename);
    const duplicate = document.createElement("button"); duplicate.type = "button"; duplicate.textContent = "▣"; duplicate.title = "Projekt duplizieren"; duplicate.addEventListener("click", async () => {
      const newName = window.prompt(uiText("Name für die Projektkopie"), `${project.name} ${uiText("(Kopie)")}`); if (!newName?.trim()) return;
      await fetch("api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName.trim(), source: project.id }) }); void renderProjects();
    }); row.append(duplicate);
    if (projects.length > 1) { const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "🗑"; remove.title = "Projekt löschen"; remove.addEventListener("click", async () => {
      if (!window.confirm(uiText("Projekt „{name}“ löschen?", { name: project.name }))) return;
      const result = await fetch(`api/projects/${encodeURIComponent(project.id)}`, { method: "DELETE" });
      if (result.ok && project.id === state.projectId) location.href = `?mode=editor&project=${encodeURIComponent(projects.find((item) => item.id !== project.id).id)}`;
      else void renderProjects();
    }); row.append(remove); }
    list.append(row);
  }
}

function setSingleWidgetSelection(widgetId) {
  const widget = currentPage().widgets.find(item => item.id === widgetId);
  if (!widget || widget.editorGroupId !== state.editingGroupId) state.editingGroupId = null;
  state.selectedIds = groupMembers(currentPage().widgets, widget, state.editingGroupId).map(item => item.id);
  state.selectedId = state.selectedIds[0] || null;
}

function selectedNormalWidgets() {
  return selectedWidgets().filter(widget => widget.type !== "svg-connection");
}

function selectedWidgets() {
  const ids = new Set(state.selectedIds.length ? state.selectedIds : state.selectedId ? [state.selectedId] : []);
  for (const widget of currentPage().widgets.filter(item => ids.has(item.id))) groupMembers(currentPage().widgets, widget, state.editingGroupId).forEach(item => ids.add(item.id));
  return currentPage().widgets.filter(widget => ids.has(widget.id));
}

function selectWidget(widgetId, additive = false) {
  if (!additive) { setSingleWidgetSelection(widgetId); return; }
  const selected = state.selectedIds.length ? [...state.selectedIds] : state.selectedId ? [state.selectedId] : [];
  const widget = currentPage().widgets.find(item => item.id === widgetId);
  const members = groupMembers(currentPage().widgets, widget, state.editingGroupId).map(item => item.id);
  if (members.every(id => selected.includes(id))) members.forEach(id => { selected.splice(selected.indexOf(id), 1); });
  else members.forEach(id => { if (!selected.includes(id)) selected.push(id); });
  state.selectedIds = selected;
  state.selectedId = selected[0] || null;
}

function focusWidget(widgetId) {
  const widget = currentPage().widgets.find((item) => item.id === widgetId);
  if (!widget) return;
  setSingleWidgetSelection(widget.id);
  renderStage(); renderProperties(); renderWidgetFinder();
  requestAnimationFrame(() => {
    const element = document.getElementById(widget.id);
    const container = $(".stage-scroll");
    if (!element || !container) return;
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    container.scrollBy({
      left: elementRect.left + elementRect.width / 2 - containerRect.left - container.clientWidth / 2,
      top: elementRect.top + elementRect.height / 2 - containerRect.top - container.clientHeight / 2,
      behavior: "smooth",
    });
  });
}

function groupSelectedWidgets() {
  const widgets = selectedWidgets();
  if (widgets.length < 2 || widgets.some(widget => widget.type === "svg-connection" || (widget.generalEnabled && widget.locked))) return;
  recordHistorySnapshot();
  const groupId = `group-${createRandomId()}`;
  widgets.forEach(widget => { widget.editorGroupId = groupId; });
  state.editingGroupId = null; render();
}

function selectedEditorGroup() {
  const widgets = selectedWidgets();
  return widgets.length && widgets.every(widget => widget.editorGroupId === widgets[0].editorGroupId) ? widgets[0].editorGroupId : null;
}

function ungroupSelectedWidgets() {
  const groupId = selectedEditorGroup(); if (!groupId) return;
  recordHistorySnapshot();
  currentPage().widgets.filter(widget => widget.editorGroupId === groupId).forEach(widget => { delete widget.editorGroupId; });
  state.editingGroupId = null; render();
}

function renderEditorGroups() {
  const widgets = currentPage().widgets;
  for (const groupId of new Set(widgets.map(widget => widget.editorGroupId).filter(Boolean))) {
    const members = widgets.filter(widget => widget.editorGroupId === groupId);
    if (members.length < 2) continue;
    const bounds = groupBounds(members), outline = document.createElement("div");
    outline.className = "editor-group-outline";
    outline.dataset.groupId = groupId;
    outline.classList.toggle("is-selected", members.some(widget => state.selectedIds.includes(widget.id)));
    Object.assign(outline.style, { left: `${bounds.x}px`, top: `${bounds.y}px`, width: `${bounds.width}px`, height: `${bounds.height}px` });
    const flag = document.createElement("button"); flag.type = "button"; flag.className = "editor-group-flag";
    flag.textContent = `${uiText(state.editingGroupId === groupId ? "Gruppe bearbeiten" : "Gruppe")} (${members.length})`;
    flag.title = groupId;
    flag.addEventListener("click", event => { event.stopPropagation(); state.editingGroupId = null; setSingleWidgetSelection(members[0].id); render(); });
    flag.addEventListener("contextmenu", event => { state.editingGroupId = null; openWidgetContextMenu(event, members[0]); });
    if (state.editingGroupId !== groupId) makeDraggable(flag, members[0]);
    outline.append(flag); stage.append(outline);
  }
}

let widgetContextMenu;
function closeWidgetContextMenu() { widgetContextMenu?.remove(); widgetContextMenu = null; }

function openWidgetContextMenu(event, widget = null) {
  if (runtimeMode) return;
  event.preventDefault(); event.stopPropagation(); closeWidgetContextMenu();
  const overlapping = currentPage().widgets.filter(item => {
    const rect = document.getElementById(item.id)?.getBoundingClientRect();
    return rect && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
  }).reverse();
  if (widget && !state.selectedIds.includes(widget.id)) { setSingleWidgetSelection(widget.id); render(); }
  const chosen = selectedWidgets(), groupId = selectedEditorGroup();
  const menu = document.createElement("div"); menu.className = "widget-context-menu"; menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", uiText("Widget-Aktionen"));
  const action = (parent, label, run, disabled = false, icon = "") => {
    const button = document.createElement("button"); button.type = "button"; button.setAttribute("role", "menuitem"); button.disabled = disabled;
    if (icon) { const image = document.createElement("img"); image.src = `icons/${icon}.svg`; image.alt = ""; button.append(image); }
    button.append(document.createTextNode(uiText(label)));
    button.onclick = () => { closeWidgetContextMenu(); run(); };
    parent.append(button);
  };
  const submenu = label => {
    const details = document.createElement("details"), summary = document.createElement("summary");
    summary.textContent = `${uiText(label)} ▸`; details.append(summary); menu.append(details);
    return details;
  };
  const selection = submenu("Auswählen");
  action(selection, "Alle Widgets", () => { state.selectedIds = currentPage().widgets.map(item => item.id); state.selectedId = state.selectedIds[0] || null; render(); });
  for (const item of overlapping) action(selection, widgetDisplayName(item), () => { setSingleWidgetSelection(item.id); render(); });
  action(menu, "Gruppieren", groupSelectedWidgets, Boolean(groupId) || chosen.length < 2 || chosen.some(item => item.type === "svg-connection" || (item.generalEnabled && item.locked)));
  if (groupId) {
    action(menu, "Gruppierung aufheben", ungroupSelectedWidgets);
    action(menu, "Gruppe bearbeiten", () => { state.editingGroupId = groupId; state.selectedIds = [chosen[0].id]; state.selectedId = chosen[0].id; render(); });
  }
  if (state.editingGroupId) action(menu, "Gruppenbearbeitung beenden", () => { state.editingGroupId = null; if (widget) setSingleWidgetSelection(widget.id); render(); });
  action(menu, "Kopieren", () => copySelectedWidgets(), !chosen.length, "copy-clip");
  action(menu, "Ausschneiden", () => copySelectedWidgets(true), !chosen.length);
  action(menu, "Einfügen", pasteWidgets, !state.widgetClipboard.length, "clipboard");
  action(menu, "Löschen", deleteSelectedWidget, !chosen.length, "trash");
  const more = submenu("Mehr");
  action(more, "Duplizieren", duplicateSelectedWidget, !chosen.length, "duplicat");
  for (const [label, front] of [["In den Vordergrund", true], ["In den Hintergrund", false]]) action(more, label, () => {
    recordHistorySnapshot();
    const layer = front ? Math.min(9999, Math.max(0, ...currentPage().widgets.map(item => Number(item.layer) || 0)) + 1) : 0;
    chosen.forEach(item => { item.layer = layer; item.cssZIndex = ""; }); render();
  }, !chosen.length);
  for (const [label, locked] of [["Sperren", true], ["Entsperren", false]]) action(more, label, () => { recordHistorySnapshot(); chosen.forEach(item => { item.generalEnabled = true; item.locked = locked; }); render(); }, !chosen.length);
  action(more, "Rückgängig", undoWidgetChange, !state.undoStack.length);
  action(more, "Wiederholen", redoWidgetChange, !state.redoStack.length);
  action(more, "Widget importieren", () => $("#widget-import-file").click());
  action(more, "Ausgewähltes Widget exportieren", exportSelectedWidget, !chosen.length);
  document.body.append(menu); widgetContextMenu = menu;
  const placeMenu = () => {
    const rect = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(4, Math.min(event.clientX, window.innerWidth - rect.width - 4))}px`;
    menu.style.top = `${Math.max(4, Math.min(event.clientY, window.innerHeight - rect.height - 4))}px`;
  };
  menu.addEventListener("toggle", placeMenu, true); placeMenu();
  menu.querySelector("summary").focus();
  menu.addEventListener("keydown", key => {
    if (key.key === "Escape") { closeWidgetContextMenu(); return; }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(key.key)) return;
    const items = [...menu.querySelectorAll("button:not(:disabled), summary")].filter(item => item.getClientRects().length);
    const index = items.indexOf(document.activeElement);
    key.preventDefault();
    items[key.key === "Home" ? 0 : key.key === "End" ? items.length - 1 : (index + (key.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  });
}

stage.addEventListener("contextmenu", event => { if (!event.target.closest(".widget, .editor-group-outline")) openWidgetContextMenu(event); });
document.addEventListener("pointerdown", event => { if (widgetContextMenu && !widgetContextMenu.contains(event.target)) closeWidgetContextMenu(); });
window.addEventListener("resize", closeWidgetContextMenu);

function duplicateSelectedWidget() {
  const page = currentPage();
  const sources = selectedWidgets(); if (!sources.length) return;
  recordHistorySnapshot();
  const idMap = new Map(sources.map(source => [source.id, `widget-${state.nextId++}`]));
  remapGroups(sources, idMap, () => `group-${createRandomId()}`);
  const copies = sources.map(source => cloneWidgetForInsert(source, page, idMap));
  page.widgets.push(...copies); state.selectedIds = copies.map(widget => widget.id); state.selectedId = state.selectedIds[0]; render();
}

let suppressWidgetDeleteUntil = 0;

async function deleteSelectedWidget() {
  const page = currentPage();
  const widgets = selectedWidgets();
  if (!widgets.length) return;
  if (Date.now() >= suppressWidgetDeleteUntil) {
    const confirmed = await new Promise(resolve => {
      const dialog = document.createElement("dialog"); dialog.className = "studio-dialog widget-delete-dialog";
      const heading = document.createElement("h2"); heading.id = "widget-delete-heading"; heading.textContent = uiText("Widgets löschen"); dialog.setAttribute("aria-labelledby", heading.id);
      const message = document.createElement("p"); message.textContent = uiText("Die Widgets {names} wirklich löschen?", { names: widgets.map(widget => widget.id).join(", ") });
      const label = document.createElement("label"); label.className = "widget-delete-suppress";
      const suppress = document.createElement("input"); suppress.type = "checkbox";
      label.append(suppress, document.createTextNode(uiText("Frage für die nächsten 5 Minuten unterdrücken")));
      const actions = document.createElement("div"); actions.className = "dialog-actions";
      const remove = document.createElement("button"); remove.type = "button"; remove.className = "primary"; remove.textContent = "✓ " + uiText("Löschen");
      const cancel = document.createElement("button"); cancel.type = "button"; cancel.textContent = "× " + uiText("Abbrechen");
      remove.addEventListener("click", () => { if (suppress.checked) suppressWidgetDeleteUntil = Date.now() + 5 * 60 * 1000; dialog.close("delete"); });
      cancel.addEventListener("click", () => dialog.close("cancel"));
      dialog.addEventListener("close", () => { const accepted = dialog.returnValue === "delete"; dialog.remove(); resolve(accepted); }, { once: true });
      actions.append(remove, cancel); dialog.append(heading, message, label, actions); document.body.append(dialog); dialog.showModal(); cancel.focus();
    });
    if (!confirmed) return;
  }
  removeWidgets(page, new Set(widgets.map(widget => widget.id)));
}

function removeWidgets(page, removedIds) {
  if (!removedIds.size) return;
  recordHistorySnapshot();
  page.widgets = page.widgets.filter((widget) => !removedIds.has(widget.id));
  for (const widget of page.widgets.filter(item => item.type === "svg-connection")) {
    if (removedIds.has(widget.startWidgetId)) widget.startWidgetId = "";
    if (removedIds.has(widget.endWidgetId)) widget.endWidgetId = "";
    if (removedIds.has(widget.flowParentId)) widget.flowParentId = "";
    if ([...removedIds].some(id => String(widget.startCollector || "").startsWith(`${id}:`))) widget.startCollector = "";
    if ([...removedIds].some(id => String(widget.endCollector || "").startsWith(`${id}:`))) widget.endCollector = "";
  }
  setSingleWidgetSelection(null); render();
}

function cloneWidgetForInsert(source, page, idMap) {
  const copy = structuredClone(source); const oldId = source.id;
  if (copy.editorGroupId) { if (idMap.has(copy.editorGroupId)) copy.editorGroupId = idMap.get(copy.editorGroupId); else delete copy.editorGroupId; }
  copy.id = idMap.get(oldId) || `widget-${state.nextId++}`;
  reidentifyTabWidgets(copy, () => `widget-${state.nextId++}`, () => `group-${createRandomId()}`);
  copy.name = uniqueWidgetName(page, `${widgetDisplayName(source)} Kopie`);
  for (const key of ["startWidgetId", "endWidgetId", "flowParentId"]) if (copy[key]) copy[key] = idMap.get(copy[key]) || "";
  for (const key of ["startCollector", "endCollector"]) {
    const [widgetId, pointId] = String(copy[key] || "").split(":");
    copy[key] = idMap.has(widgetId) ? `${idMap.get(widgetId)}:${pointId}` : "";
  }
  if (copy.type === "svg-connection") {
    copy.connectionPoints = (copy.connectionPoints || []).map(point => ({ ...point, id: createRandomId(), x: (Number(point.x) || 0) + 20, y: (Number(point.y) || 0) + 20 }));
    copy.startX = (Number(copy.startX) || 0) + 20; copy.startY = (Number(copy.startY) || 0) + 20;
    copy.endX = (Number(copy.endX) || 0) + 20; copy.endY = (Number(copy.endY) || 0) + 20;
  } else {
    copy.x = copy.editorGroupId ? (copy.x || 0) + 20 : Math.min(Math.max(0, page.page.width - (copy.width || 140)), (copy.x || 0) + 20);
    copy.y = copy.editorGroupId ? (copy.y || 0) + 20 : Math.min(Math.max(0, page.page.height - (copy.height || 62)), (copy.y || 0) + 20);
  }
  return copy;
}

function copySelectedWidgets(cut = false) {
  const widgets = selectedWidgets(); if (!widgets.length) return;
  state.widgetClipboard = structuredClone(widgets);
  $("#status").textContent = `${widgets.length} Widget(s) ${cut ? "ausgeschnitten" : "kopiert"}`;
  if (cut) removeWidgets(currentPage(), new Set(widgets.map(widget => widget.id))); else renderWidgetFinder();
}

function pasteWidgets() {
  if (!state.widgetClipboard.length) return;
  if (state.tabEditor && state.widgetClipboard.some(widget => widget.type === "tabs")) { $("#status").textContent = uiText("Verschachtelte eigene Tabs sind noch nicht unterstützt."); return; }
  recordHistorySnapshot();
  const page = currentPage(); const idMap = new Map(state.widgetClipboard.map(source => [source.id, `widget-${state.nextId++}`]));
  remapGroups(state.widgetClipboard, idMap, () => `group-${createRandomId()}`);
  const copies = state.widgetClipboard.map(source => cloneWidgetForInsert(source, page, idMap));
  page.widgets.push(...copies); state.selectedIds = copies.map(widget => widget.id); state.selectedId = state.selectedIds[0];
  render(); $("#status").textContent = `${copies.length} Widget(s) eingefügt`;
}

function alignSelectedWidgets(action, explicitSize = null) {
  const widgets = selectedNormalWidgets();
  if (widgets.length < 2) return;
  recordHistorySnapshot();
  const reference = widgets[0];
  const number = value => Number(value) || 0;
  if (action === "left") for (const widget of widgets.slice(1)) widget.x = number(reference.x);
  if (action === "right") for (const widget of widgets.slice(1)) widget.x = number(reference.x) + number(reference.width) - number(widget.width);
  if (action === "top") for (const widget of widgets.slice(1)) widget.y = number(reference.y);
  if (action === "bottom") for (const widget of widgets.slice(1)) widget.y = number(reference.y) + number(reference.height) - number(widget.height);
  if (action === "center-x") for (const widget of widgets.slice(1)) widget.x = Math.round(number(reference.x) + (number(reference.width) - number(widget.width)) / 2);
  if (action === "center-y") for (const widget of widgets.slice(1)) widget.y = Math.round(number(reference.y) + (number(reference.height) - number(widget.height)) / 2);
  if (action === "width") for (const widget of widgets) widget.width = Math.max(16, Math.round(explicitSize ?? number(reference.width)));
  if (action === "height") for (const widget of widgets) widget.height = Math.max(16, Math.round(explicitSize ?? number(reference.height)));
  if (action === "distribute-x") {
    const sorted = [...widgets].sort((a, b) => number(a.x) + number(a.width) / 2 - number(b.x) - number(b.width) / 2);
    const firstCenter = number(sorted[0].x) + number(sorted[0].width) / 2; const lastCenter = number(sorted.at(-1).x) + number(sorted.at(-1).width) / 2;
    sorted.slice(1, -1).forEach((widget, index) => { const center = firstCenter + (lastCenter - firstCenter) * (index + 1) / (sorted.length - 1); widget.x = Math.round(center - number(widget.width) / 2); });
  }
  if (action === "distribute-y") {
    const sorted = [...widgets].sort((a, b) => number(a.y) + number(a.height) / 2 - number(b.y) - number(b.height) / 2);
    const firstCenter = number(sorted[0].y) + number(sorted[0].height) / 2; const lastCenter = number(sorted.at(-1).y) + number(sorted.at(-1).height) / 2;
    sorted.slice(1, -1).forEach((widget, index) => { const center = firstCenter + (lastCenter - firstCenter) * (index + 1) / (sorted.length - 1); widget.y = Math.round(center - number(widget.height) / 2); });
  }
  $("#status").textContent = `${widgets.length} Widgets ausgerichtet · Referenz: ${widgetDisplayName(reference)}`;
  renderStage(); renderProperties(); renderWidgetFinder();
}

function openAlignmentSizeDialog(action) {
  const widgets = selectedNormalWidgets(); if (widgets.length < 2) return;
  const dimension = action === "width" ? "Breite" : "Höhe"; const key = action === "width" ? "width" : "height";
  const dialog = document.createElement("dialog"); dialog.className = "studio-dialog alignment-size-dialog";
  const heading = document.createElement("h2"); heading.textContent = `Gewünschte ${dimension}`;
  const label = document.createElement("label"); label.textContent = `${dimension} in Pixel`;
  const input = document.createElement("input"); input.type = "number"; input.min = "16"; input.max = action === "width" ? "7680" : "4320"; input.step = "1"; input.value = String(Math.round(Number(widgets[0][key]) || 16)); label.append(input);
  const actions = document.createElement("div"); actions.className = "dialog-actions";
  const apply = document.createElement("button"); apply.type = "button"; apply.textContent = "Übernehmen";
  const cancel = document.createElement("button"); cancel.type = "button"; cancel.textContent = "Abbrechen";
  apply.addEventListener("click", () => { alignSelectedWidgets(action, Math.max(16, Number(input.value) || 16)); dialog.close(); });
  cancel.addEventListener("click", () => dialog.close()); actions.append(apply, cancel); dialog.append(heading, label, actions); document.body.append(dialog);
  dialog.addEventListener("close", () => dialog.remove()); dialog.showModal(); input.select();
}

function changeSelectedWidgetLayer(direction) {
  const widget = currentPage().widgets.find((item) => item.id === state.selectedId);
  if (!widget) return;
  recordHistorySnapshot();
  const current = Math.max(0, Math.trunc(Number(widget.layer) || 0));
  widget.layer = Math.min(9999, Math.max(0, current + direction));
  widget.cssZIndex = "";
  renderStage(); renderProperties(); renderWidgetFinder();
  $("#status").textContent = `Widget ${widget.id}: z-index ${widget.layer}`;
}

function exportSelectedWidget() {
  const widget = currentPage().widgets.find((item) => item.id === state.selectedId);
  if (!widget) return;
  const widgets = selectedWidgets();
  const blob = new Blob([`${JSON.stringify(widgets.length > 1 ? { schemaVersion: 1, widgets } : { schemaVersion: 1, widget }, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = `${widgets.length > 1 ? "widget-group" : widget.type}-${widget.id}.json`; link.click();
  URL.revokeObjectURL(url);
  $("#status").textContent = `Widget ${widget.id} exportiert`;
}

async function importWidgets(file) {
  try {
    const data = JSON.parse(await file.text());
    const incoming = Array.isArray(data) ? data : Array.isArray(data.widgets) ? data.widgets : [data.widget || data];
    const knownTypes = new Set(getWidgetSets().flatMap((set) => set.widgets.map((definition) => definition.type)));
    const widgets = incoming.filter((widget) => widget && typeof widget === "object" && knownTypes.has(widget.type));
    if (state.tabEditor && widgets.some(widget => widget.type === "tabs")) throw Error(uiText("Verschachtelte eigene Tabs sind noch nicht unterstützt."));
    if (!widgets.length) throw new Error("Die Datei enthält keine unterstützten Widgets.");
    recordHistorySnapshot();
    const importGroups = new Map(); remapGroups(widgets, importGroups, () => `group-${createRandomId()}`);
    for (const source of widgets) {
      const widget = structuredClone(source);
      if (importGroups.has(widget.editorGroupId)) widget.editorGroupId = importGroups.get(widget.editorGroupId); else delete widget.editorGroupId;
      widget.id = `widget-${state.nextId++}`;
      reidentifyTabWidgets(widget, () => `widget-${state.nextId++}`, () => `group-${createRandomId()}`);
      widget.name = uniqueWidgetName(currentPage(), widget.name || widget.title || getWidgetDefinition(widget.type).label);
      widget.x = Math.max(0, Number(widget.x) || 0);
      widget.y = Math.max(0, Number(widget.y) || 0);
      widget.width = Math.max(16, Number(widget.width) || 140);
      widget.height = Math.max(16, Number(widget.height) || 62);
      widget.layer = Math.max(0, Math.min(9999, Math.trunc(Number(widget.layer) || 0)));
      widget.generalEnabled ??= false; widget.visibilityEnabled ??= false; widget.locked ??= false;
      if (widget.type !== "svg-connection") initializeDockPoints(widget, widgetAnchorIds(widget));
      currentPage().widgets.push(widget);
    }
    setSingleWidgetSelection(currentPage().widgets.at(-widgets.length).id);
    render();
    $("#status").textContent = `${widgets.length} Widget(s) importiert`;
  } catch (error) {
    $("#status").textContent = `Widget-Import fehlgeschlagen: ${error.message}`;
  } finally {
    $("#widget-import-file").value = "";
  }
}

function makePageId() { return `page-${Date.now()}-${state.project.pages.length + 1}`; }

function addPage() {
  const name = state.project.pages.some((page) => page.name === "Neue Seite") ? `Seite ${state.project.pages.length + 1}` : "Neue Seite";
  const page = currentPage();
  const created = { id: makePageId(), name, visible: true, page: structuredClone(page.page), widgets: [] };
  state.project.pages.push(created); state.project.currentPageId = created.id; setSingleWidgetSelection(null); render();
}

function duplicatePage(page) {
  const copy = structuredClone(page); copy.id = makePageId(); copy.name = `${page.name} (Kopie)`;
  for (const widget of copy.widgets) { widget.id = `widget-${state.nextId++}`; reidentifyTabWidgets(widget, () => `widget-${state.nextId++}`, () => `group-${createRandomId()}`); }
  state.project.pages.push(copy); state.project.currentPageId = copy.id; setSingleWidgetSelection(null); render();
}

function deletePage(page) {
  state.project.pages = state.project.pages.filter((item) => item.id !== page.id);
  if (state.project.currentPageId === page.id) state.project.currentPageId = state.project.pages[0].id;
  setSingleWidgetSelection(null); render();
}

function togglePagesMenu(open = $("#pages-panel").hidden) {
  $("#pages-panel").hidden = !open;
  $("#pages-menu-toggle").setAttribute("aria-expanded", String(open));
  $("#runtime-pages-menu-toggle").setAttribute("aria-expanded", String(open));
}

function applyProjectCss() {
  let style = document.getElementById("project-user-css");
  if (!style) {
    style = document.createElement("style");
    style.id = "project-user-css";
    document.head.append(style);
  }
  style.textContent = state.project.css || "";
}

function isOn(value) {
  return value === true || value === 1 || ["true", "on", "ein", "yes", "1"].includes(String(value).toLowerCase());
}

function safeUrl(value, allowDataImage = false) {
  const raw = String(value || "").trim();
  if (!raw || /[\u0000-\u0020]/.test(raw) && !raw.startsWith("/")) return "";
  if (allowDataImage && /^data:image\/(png|jpeg|gif|webp|svg\+xml);base64,/i.test(raw)) return raw;
  try {
    const url = new URL(raw, location.href);
    if (["http:", "https:"].includes(url.protocol)) return raw;
    if (url.origin === location.origin && (raw.startsWith("/") || raw.startsWith("./") || raw.startsWith("../"))) return raw;
  } catch { /* invalid URL */ }
  return "";
}

function appendSafeHtml(parent, markup) {
  const template = document.createElement("template");
  template.innerHTML = String(markup ?? "");
  parent.append(template.content);
}

const mediaRefreshers = new Set();
function refreshableMedia(element, widget, source) {
  const update = (refresh = true) => {
    const url = safeUrl(source, element.tagName === "IMG");
    if (!url) return;
    if (refresh && !widget.noCacheBuster && !url.startsWith("data:")) {
      const parsed = new URL(url, location.href); parsed.searchParams.set("_gvs", Date.now()); element.src = parsed.href;
    } else element.src = url;
  };
  update(widget.refreshOnView === true);
  const interval = Math.max(0, Number(widget.refreshInterval) || 0);
  const entry = { widget, update, timer: interval > 0 ? setInterval(update, Math.max(100, interval)) : null };
  mediaRefreshers.add(entry);
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) for (const entry of mediaRefreshers) if (entry.widget.refreshOnWake) entry.update(); });
window.addEventListener("resize", () => { for (const element of document.querySelectorAll(".screen-resolution-value")) element.textContent = `${window.innerWidth} × ${window.innerHeight}`; });

function renderSvgShape(widget) {
  const ns = "http://www.w3.org/2000/svg"; const svg = document.createElementNS(ns, "svg"); svg.setAttribute("viewBox", "0 0 100 100"); svg.style.width = "100%"; svg.style.height = "100%";
  let shape;
  if (widget.shape === "circle") { shape = document.createElementNS(ns, "circle"); shape.setAttribute("cx", "50"); shape.setAttribute("cy", "50"); shape.setAttribute("r", "40"); }
  else if (widget.shape === "line") { shape = document.createElementNS(ns, "line"); for (const [key, value] of Object.entries({ x1: 10, y1: 50, x2: 90, y2: 50 })) shape.setAttribute(key, value); }
  else {
    shape = document.createElementNS(ns, "polygon");
    const counts = { triangle: 3, square: 4, pentagon: 5, hexagon: 6, octagon: 8, star: 10 };
    const count = counts[widget.shape] || Math.max(3, Math.min(20, Number(widget.pointCount) || 3));
    const points = Array.from({ length: count }, (_, index) => { const angle = -Math.PI / 2 + index * 2 * Math.PI / count; const radius = widget.shape === "star" && index % 2 ? 18 : 40; return `${50 + Math.cos(angle) * radius},${50 + Math.sin(angle) * radius}`; });
    shape.setAttribute("points", widget.shape === "arrow" ? "10,35 55,35 55,10 90,50 55,90 55,65 10,65" : points.join(" "));
  }
  shape.setAttribute("stroke", widget.strokeColor || "#009cb3"); shape.setAttribute("fill", widget.fillColor || "#00b3ac"); shape.setAttribute("stroke-width", widget.strokeWidth ?? 5);
  shape.setAttribute("transform", `translate(50 50) rotate(${Number(widget.rotation) || 0}) scale(${Number(widget.scaleX ?? 1)} ${Number(widget.scaleY ?? 1)}) translate(-50 -50)`); svg.append(shape); return svg;
}

function connectionAnchorPosition(widget, anchorId) {
  const anchors = widgetAnchors(widget);
  const anchor = anchors.find(([id]) => id === anchorId) || anchors.find(([id]) => id === "right-center") || anchors[0];
  return { x: Number(widget.x) + Number(widget.width) * anchor[2], y: Number(widget.y) + Number(widget.height) * anchor[3] };
}

function closestConnectionAnchor(clientX, clientY, connection, prefix, widgets, bounds, width, height) {
  let closest = null;
  for (const target of widgets.filter(item => item.type !== "svg-connection" && item.visible !== false && item.dockPointsEnabled === true)) {
    for (const [anchorId] of widgetAnchors(target)) {
      if (target[dockPointKey(anchorId)] !== true) continue;
      const occupied = widgets.filter(item => item.type === "svg-connection").flatMap(item => ["start", "end"].map(side => ({ item, side }))).filter(({ item, side }) => {
        if (item.id === connection.id && side === prefix) return false;
        return item[`${side}WidgetId`] === target.id && (item[`${side}Anchor`] || (side === "start" ? "right-center" : "left-center")) === anchorId && !item[`${side}Collector`];
      }).length;
      const limit = Math.max(1, Number(target.dockMaxConnections) || 99);
      if (occupied >= limit || target.dockMultiple === false && occupied > 0) continue;
      const position = connectionAnchorPosition(target, anchorId);
      const anchorClientX = bounds.left + position.x / width * bounds.width;
      const anchorClientY = bounds.top + position.y / height * bounds.height;
      const distance = Math.hypot(clientX - anchorClientX, clientY - anchorClientY);
      if (distance <= 24 && (!closest || distance < closest.distance)) closest = { widgetId: target.id, anchorId, position, distance };
    }
  }
  return closest;
}

function closestConnectionCollector(clientX, clientY, connection, widgets, bounds, width, height) {
  let closest = null;
  for (const target of widgets.filter(item => item.type === "svg-connection" && item.id !== connection.id && item.visible !== false)) {
    for (const point of target.connectionPoints || []) {
      if (!point.collectorEnabled) continue;
      const position = { x: Number(point.x) || 0, y: Number(point.y) || 0 };
      const distance = Math.hypot(clientX - (bounds.left + position.x / width * bounds.width), clientY - (bounds.top + position.y / height * bounds.height));
      if (distance <= 24 && (!closest || distance < closest.distance)) closest = { collectorReference: `${target.id}:${point.id}`, position, distance };
    }
  }
  return closest;
}

function connectionCollectorPosition(reference, widgets) {
  if (!reference) return null;
  const separator = reference.indexOf(":");
  if (separator < 1) return null;
  const connection = widgets.find(item => item.id === reference.slice(0, separator) && item.type === "svg-connection");
  const point = connection?.connectionPoints?.find(item => item.id === reference.slice(separator + 1) && item.collectorEnabled);
  return point ? { x: Number(point.x) || 0, y: Number(point.y) || 0 } : null;
}

function connectionEndpoint(widget, prefix, widgets) {
  const collector = connectionCollectorPosition(widget[`${prefix}Collector`], widgets);
  if (collector) return collector;
  const target = widgets.find(item => item.id === widget[`${prefix}WidgetId`] && item.type !== "svg-connection");
  const anchorId = widget[`${prefix}Anchor`] || (prefix === "start" ? "right-center" : "left-center");
  const anchorEnabled = target?.dockPointsEnabled === true && target?.[dockPointKey(anchorId)] === true;
  if (target && anchorEnabled) {
    const connections = widgets.filter(item => item.type === "svg-connection").flatMap(item => ["start", "end"].map(side => ({
      id: `${item.id}:${side}`, widget: item, side,
    }))).filter(item => item.widget[`${item.side}WidgetId`] === target.id && (item.widget[`${item.side}Anchor`] || (item.side === "start" ? "right-center" : "left-center")) === anchorId && !item.widget[`${item.side}Collector`]).sort((a, b) => a.id.localeCompare(b.id));
    const currentIndex = connections.findIndex(item => item.widget.id === widget.id && item.side === prefix);
    const limit = Math.max(1, Number(target.dockMaxConnections) || 99);
    if (currentIndex > 0 && target.dockMultiple === false || currentIndex >= limit) return { x: Number(widget[`${prefix}X`]) || 0, y: Number(widget[`${prefix}Y`]) || 0 };
    if (runtimeMode && target.type === "linebox") {
      const join = lineboxRuntimeJoinPosition(target, anchorId);
      if (join) return join;
    }
    const position = connectionAnchorPosition(target, anchorId);
    if (target.type !== "linebox-math" && connections.length > 1 && currentIndex >= 0) {
      const offset = (currentIndex - (Math.min(connections.length, limit) - 1) / 2) * (Number(target.dockLaneSpacing) || 6);
      if (anchorId.startsWith("left-") || anchorId.startsWith("right-")) position.y += offset;
      else position.x += offset;
    }
    return position;
  }
  return { x: Number(widget[`${prefix}X`]) || 0, y: Number(widget[`${prefix}Y`]) || 0 };
}

function preserveDockedConnectionPositions(target, widgets) {
  for (const connection of widgets.filter(item => item.type === "svg-connection")) {
    for (const prefix of ["start", "end"]) {
      if (connection[`${prefix}WidgetId`] !== target.id) continue;
      const position = connectionEndpoint(connection, prefix, widgets);
      connection[`${prefix}X`] = position.x;
      connection[`${prefix}Y`] = position.y;
    }
  }
}

function connectionRoute(widget, widgets, reverse = false) {
  const start = connectionEndpoint(widget, "start", widgets); const end = connectionEndpoint(widget, "end", widgets);
  const intermediate = Array.isArray(widget.connectionPoints) ? widget.connectionPoints.map(point => ({ x: Number(point.x) || 0, y: Number(point.y) || 0, point })) : [];
  let points;
  if (widget.pathMode === "orthogonal" && !intermediate.length) {
    const middleX = start.x + (end.x - start.x) / 2;
    points = [start, { x: middleX, y: start.y }, { x: middleX, y: end.y }, end];
  } else points = [start, ...intermediate, end];
  const startBox = widgets.find(item => item.id === widget.startWidgetId);
  const endBox = widgets.find(item => item.id === widget.endWidgetId);
  const startLead = mathLeadPoint(startBox, widget.startAnchor, start);
  const endLead = mathLeadPoint(endBox, widget.endAnchor, end);
  if (startLead || endLead) {
    const inner = intermediate.length ? intermediate : [{ x: (startLead || start).x, y: (endLead || end).y }];
    points = [start, ...(startLead ? [startLead] : []), ...inner, ...(endLead ? [endLead] : []), end];
  }
  if (reverse) points.reverse();
  return points;
}

function closestConnectionSegmentIndex(widget, widgets, point) {
  const route = connectionRoute(widget, widgets);
  let closest = { index: Math.max(0, route.length - 2), distance: Number.POSITIVE_INFINITY };
  for (let index = 0; index < route.length - 1; index += 1) {
    const start = route[index]; const end = route[index + 1];
    const dx = end.x - start.x; const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    const ratio = lengthSquared ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared)) : 0;
    const projectedX = start.x + ratio * dx; const projectedY = start.y + ratio * dy;
    const distance = Math.hypot(point.x - projectedX, point.y - projectedY);
    if (distance < closest.distance) closest = { index, distance };
  }
  return closest.index;
}

function openConnectionPointDialog(widget, widgets, point) {
  const dialog = document.createElement("dialog"); dialog.className = "studio-dialog connection-point-type-dialog";
  const heading = document.createElement("h2"); heading.textContent = "Punkt auf der Linie erstellen";
  const hint = document.createElement("p"); hint.className = "property-hint";
  hint.textContent = "Ein Zwischenpunkt teilt den Pfad in weitere Segmente. Nur ein Sammelpunkt kann von anderen Linien gezielt verwendet werden.";
  const choices = document.createElement("fieldset"); const legend = document.createElement("legend"); legend.textContent = "Punkttyp"; choices.append(legend);
  const name = `connection-point-type-${createRandomId()}`;
  for (const [value, label, checked] of [["click", "Zwischenpunkt", true], ["collector", "Sammelpunkt", false]]) {
    const row = document.createElement("label"); const radio = document.createElement("input"); radio.type = "radio"; radio.name = name; radio.value = value; radio.checked = checked;
    row.append(radio, document.createTextNode(label)); choices.append(row);
  }
  const actions = document.createElement("div"); actions.className = "dialog-actions";
  const confirm = document.createElement("button"); confirm.type = "button"; confirm.textContent = "OK";
  const cancel = document.createElement("button"); cancel.type = "button"; cancel.textContent = "Abbrechen";
  confirm.addEventListener("click", () => {
    const collectorEnabled = choices.querySelector("input:checked")?.value === "collector";
    const points = widget.connectionPoints ??= [];
    const count = points.length + 1;
    const insertAt = Math.min(points.length, closestConnectionSegmentIndex(widget, widgets, point));
    points.splice(insertAt, 0, {
      id: createRandomId(), name: `${uiText(collectorEnabled ? "Sammelpunkt" : "Zwischenpunkt")} ${count}`,
      x: point.x, y: point.y, collectorEnabled, display: collectorEnabled ? "distributor" : "point",
    });
    widget.pathMode = "zigzag";
    dialog.close(); render();
  });
  cancel.addEventListener("click", () => dialog.close());
  actions.append(confirm, cancel); dialog.append(heading, hint, choices, actions); document.body.append(dialog);
  dialog.addEventListener("close", () => dialog.remove()); dialog.showModal(); confirm.focus();
}

function connectionPathData(widget, widgets, reverse = false) {
  const points = connectionRoute(widget, widgets, reverse);
  if (points.length < 2) return "";
  if (widget.pathMode === "curve" && points.length === 2) {
    const [start, end] = points; const middleX = start.x + (end.x - start.x) / 2;
    return `M ${start.x} ${start.y} C ${middleX} ${start.y}, ${middleX} ${end.y}, ${end.x} ${end.y}`;
  }
  const radius = Math.max(0, Number(widget.cornerRadius) || 0);
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const current = points[index];
    if (!radius || index === points.length - 1) { path += ` L ${current.x} ${current.y}`; continue; }
    const previous = points[index - 1]; const next = points[index + 1];
    const beforeDistance = Math.hypot(current.x - previous.x, current.y - previous.y); const afterDistance = Math.hypot(next.x - current.x, next.y - current.y);
    const corner = Math.min(radius, beforeDistance / 2, afterDistance / 2);
    const before = { x: current.x + (previous.x - current.x) * corner / Math.max(beforeDistance, 1), y: current.y + (previous.y - current.y) * corner / Math.max(beforeDistance, 1) };
    const after = { x: current.x + (next.x - current.x) * corner / Math.max(afterDistance, 1), y: current.y + (next.y - current.y) * corner / Math.max(afterDistance, 1) };
    path += ` L ${before.x} ${before.y} Q ${current.x} ${current.y} ${after.x} ${after.y}`;
  }
  return path;
}

function effectiveConnectionStyle(widget, widgets, visited = new Set()) {
  const entityId = connectionAnimationEntityId(widget);
  let result = { ...widget, ...resolveConnectionAnimation(widget, state.entityStates[entityId]) };
  const collectorReference = [widget.endCollector, widget.startCollector].find(reference => connectionCollectorPosition(reference, widgets));
  const collectorParentId = String(collectorReference || "").split(":", 1)[0];
  const parentId = collectorParentId || widget.flowParentId;
  if (parentId && !visited.has(widget.id)) {
    visited.add(widget.id);
    const parent = widgets.find(item => item.id === parentId && item.type === "svg-connection");
    if (parent && !visited.has(parent.id)) {
      const source = effectiveConnectionStyle(parent, widgets, visited);
      if (widget.inheritFlow) {
        const inherited = ["dashLength", "gapLength", "animationEnabled", "animationStyle", "animationDirection", "animationDuration"];
        result = Object.assign(result, Object.fromEntries(inherited.map(key => [key, source[key]])));
      }
      if (collectorParentId && !source.animationEnabled) {
        result.animationEnabled = false;
        result.baseColor = source.baseColor;
        result.flowColor = source.baseColor;
        result.markerColor = source.baseColor;
      }
    }
  }
  if (!widget.animationSource || widget.animationSource === "manual") {
    if (widget.endCollector) result.animationDirection = "forward";
    else if (widget.startCollector) result.animationDirection = "reverse";
  }
  const forwarded = lineboxOutputForConnection(widget, widgets, state.entityStates);
  if (forwarded) {
    for (const key of ["baseColor", "flowColor", "markerColor", "animationStyle", "lineStyle", "dashLength", "gapLength"]) result[key] = widget[key];
    const source = lineboxAnimationSettings(widget);
    const entry = forwarded.value === null ? undefined : { state: String(forwarded.value) };
    Object.assign(result, resolveConnectionAnimation(source, entry));
    result.animationEnabled = widget.animationEnabled === true && forwarded.value !== null && forwarded.value !== 0;
  }
  return result;
}

function appendConnectionMarker(defs, id, type, color, size) {
  if (!type || type === "none") return "";
  const ns = "http://www.w3.org/2000/svg"; const marker = document.createElementNS(ns, "marker");
  marker.id = id; marker.setAttribute("viewBox", "0 0 10 10"); marker.setAttribute("refX", "5"); marker.setAttribute("refY", "5"); marker.setAttribute("markerWidth", String(size)); marker.setAttribute("markerHeight", String(size)); marker.setAttribute("orient", "auto-start-reverse"); marker.setAttribute("markerUnits", "userSpaceOnUse");
  const shape = document.createElementNS(ns, type === "circle" ? "circle" : "path");
  if (type === "circle") { shape.setAttribute("cx", "5"); shape.setAttribute("cy", "5"); shape.setAttribute("r", "3.5"); shape.setAttribute("fill", color); }
  else { shape.setAttribute("d", type === "open" ? "M 1 1 L 8 5 L 1 9" : "M 1 1 L 9 5 L 1 9 Z"); shape.setAttribute("fill", type === "open" ? "none" : color); shape.setAttribute("stroke", color); shape.setAttribute("stroke-width", "1.5"); }
  marker.append(shape); defs.append(marker); return `url(#${id})`;
}

function connectionZIndex(widget, widgets) {
  const otherValues = widgets.filter(item => item.type === "svg-connection" && item.id !== widget.id).map(item => Math.max(0, Number(item.layer) || 0));
  if (widget.connectionZMode === "above") return (otherValues.length ? Math.max(...otherValues) : 0) + 1;
  if (widget.connectionZMode === "below") return Math.max(0, (otherValues.length ? Math.min(...otherValues) : 1) - 1);
  return Math.max(0, Number(widget.layer) || 0);
}

function renderSvgConnection(widget, widgets, width, height, selected) {
  const ns = "http://www.w3.org/2000/svg"; const svg = document.createElementNS(ns, "svg");
  svg.classList.add("svg-connection-canvas"); if (runtimeMode && widget.clickThrough !== false) svg.classList.add("is-click-through"); svg.setAttribute("viewBox", `0 0 ${width} ${height}`); svg.setAttribute("aria-label", widgetDisplayName(widget));
  const defs = document.createElementNS(ns, "defs"); svg.append(defs);
  const style = effectiveConnectionStyle(widget, widgets); const pathData = connectionPathData(widget, widgets);
  svg.dataset.animationEnabled = String(Boolean(style.animationEnabled));
  svg.dataset.animationStyle = style.animationStyle || "";
  const markerStartType = style.animationDirection === "reverse" ? widget.markerEnd : widget.markerStart;
  const markerEndType = style.animationDirection === "reverse" ? widget.markerStart : widget.markerEnd;
  const markerStart = appendConnectionMarker(defs, `${widget.id}-start-marker`, markerStartType, style.markerColor || style.flowColor, Number(widget.markerSize) || 8);
  const markerEnd = appendConnectionMarker(defs, `${widget.id}-end-marker`, markerEndType, style.markerColor || style.flowColor, Number(widget.markerSize) || 8);
  if (["gap", "bridge"].includes(widget.crossingStyle)) {
    const gap = document.createElementNS(ns, "path"); gap.classList.add("connection-crossing-gap"); gap.setAttribute("d", pathData); gap.setAttribute("stroke-width", String((Number(style.lineWidth) || 4) + 6)); svg.append(gap);
  }
  const base = document.createElementNS(ns, "path"); base.classList.add("connection-base"); base.setAttribute("d", pathData); base.setAttribute("fill", "none"); base.setAttribute("stroke", style.baseColor || "#607d8b"); base.setAttribute("stroke-width", String(Number(style.lineWidth) || 4)); base.setAttribute("stroke-opacity", String(style.lineOpacity ?? 1)); base.setAttribute("stroke-linecap", style.lineCap || "round"); base.setAttribute("stroke-linejoin", "round");
  if (style.lineStyle === "dashed") base.setAttribute("stroke-dasharray", `${Number(style.dashLength) || 12} ${Number(style.gapLength) || 8}`);
  if (style.lineStyle === "dotted") base.setAttribute("stroke-dasharray", `1 ${Number(style.gapLength) || 8}`);
  if (markerStart) base.setAttribute("marker-start", markerStart); if (markerEnd) base.setAttribute("marker-end", markerEnd); svg.append(base);
  const hit = document.createElementNS(ns, "path"); hit.classList.add("connection-hit-target"); hit.setAttribute("d", pathData); hit.setAttribute("fill", "none"); hit.setAttribute("stroke", "transparent"); hit.setAttribute("stroke-width", String(Math.max(14, (Number(style.lineWidth) || 4) + 8))); svg.append(hit);
  if (style.animationEnabled) {
    const animationDuration = Math.max(0.05, Number(style.animationDuration) || 2);
    if (style.animationStyle === "light") {
      const light = document.createElementNS(ns, "circle"); light.setAttribute("r", String(Math.max(2, Number(style.lineWidth) || 4))); light.setAttribute("fill", style.flowColor || "#29c8b5");
      const motion = document.createElementNS(ns, "animateMotion"); motion.setAttribute("path", connectionPathData(widget, widgets, style.animationDirection === "reverse")); motion.setAttribute("dur", `${animationDuration}s`); motion.setAttribute("repeatCount", "indefinite"); light.append(motion); svg.append(light);
    } else {
      const flow = document.createElementNS(ns, "path"); flow.classList.add("connection-flow"); if (style.animationStyle === "pulse") flow.classList.add("is-pulse"); flow.setAttribute("d", pathData); flow.setAttribute("fill", "none"); flow.setAttribute("stroke", style.flowColor || "#29c8b5"); flow.setAttribute("stroke-width", String(Number(style.lineWidth) || 4)); flow.setAttribute("stroke-linecap", style.lineCap || "round");
      const dash = Math.max(1, Number(style.dashLength) || 12); const gap = Math.max(1, Number(style.gapLength) || 8); flow.setAttribute("stroke-dasharray", style.animationStyle === "pulse" ? "none" : `${dash} ${gap}`); flow.style.setProperty("--connection-shift", `${-(dash + gap)}px`); flow.style.animationDuration = `${animationDuration}s`; flow.style.animationDirection = style.animationDirection === "reverse" ? "reverse" : "normal";
      if (widget.synchronization === "arrival") requestAnimationFrame(() => { try { const cycle = dash + gap; const offset = flow.getTotalLength() % cycle; flow.style.animationDelay = `${-offset / cycle * animationDuration}s`; } catch { /* SVG path length is optional in older webviews. */ } });
      svg.append(flow);
    }
  }
  const points = widget.connectionPoints || [];
  const update = () => {
    recordHistorySnapshot();
    const d = connectionPathData(widget, widgets); base.setAttribute("d", d);
    for (const path of svg.querySelectorAll(".connection-flow, .connection-crossing-gap, .connection-hit-target")) path.setAttribute("d", d);
    for (const motion of svg.querySelectorAll("animateMotion")) motion.setAttribute("path", connectionPathData(widget, widgets, style.animationDirection === "reverse"));
  };
  for (const point of points) {
    if (!selected && (!point.collectorEnabled || point.display === "hidden")) continue;
    const marker = document.createElementNS(ns, "circle"); marker.classList.add("connection-junction", `is-${point.display || "point"}`); if (point.collectorEnabled) marker.classList.add("is-collector");
    marker.setAttribute("cx", String(Number(point.x) || 0)); marker.setAttribute("cy", String(Number(point.y) || 0)); marker.setAttribute("r", point.display === "distributor" ? "7" : "5"); marker.dataset.pointId = point.id; marker.setAttribute("aria-label", `${point.name || "Zwischenpunkt"}${point.collectorEnabled ? ", Sammelpunkt aktiv" : ""}`); svg.append(marker);
    if (selected) {
      marker.classList.add("is-editable"); let dragging = false;
      marker.addEventListener("pointerdown", event => { event.preventDefault(); event.stopPropagation(); dragging = true; marker.setPointerCapture(event.pointerId); });
      marker.addEventListener("pointermove", event => { if (!dragging) return; const bounds = stage.getBoundingClientRect(); const scaleX = width / bounds.width; const scaleY = height / bounds.height; point.x = Math.round((event.clientX - bounds.left) * scaleX); point.y = Math.round((event.clientY - bounds.top) * scaleY); marker.setAttribute("cx", point.x); marker.setAttribute("cy", point.y); update(); });
      marker.addEventListener("pointerup", () => { dragging = false; renderProperties(); });
    }
  }
  if (selected) {
    for (const prefix of ["start", "end"]) {
      const position = connectionEndpoint(widget, prefix, widgets);
      const handle = document.createElementNS(ns, "circle");
      handle.classList.add("connection-endpoint", `is-${prefix}`);
      let attached = Boolean(widget[`${prefix}WidgetId`] || widget[`${prefix}Collector`]);
      if (attached) handle.classList.add("is-attached");
      handle.setAttribute("cx", String(position.x)); handle.setAttribute("cy", String(position.y)); handle.setAttribute("r", "7");
      handle.setAttribute("tabindex", "0");
      const endpointName = prefix === "start" ? "Anfangspunkt" : "Endpunkt";
      handle.setAttribute("aria-label", attached ? `${endpointName} mit Strg und Ziehen lösen` : `${endpointName} verschieben`);
      handle.setAttribute("title", attached ? "Strg halten und ziehen, um die Verbindung zu lösen" : "Ziehen zum Verschieben");
      svg.append(handle);
      let dragOrigin = null;
      handle.addEventListener("pointerdown", event => {
        event.preventDefault(); event.stopPropagation();
        if (attached && !event.ctrlKey) { $("#status").textContent = "Angedockten Linienpunkt mit Strg + Maustaste ziehen"; return; }
        dragOrigin = { x: event.clientX, y: event.clientY, detached: !attached, changed: false, snapTarget: null };
        handle.setPointerCapture(event.pointerId);
      });
      handle.addEventListener("pointermove", event => {
        if (!dragOrigin) return;
        if (!dragOrigin.detached && Math.abs(event.clientX - dragOrigin.x) <= 1 && Math.abs(event.clientY - dragOrigin.y) <= 1) return;
        if (!dragOrigin.detached) {
          widget[`${prefix}WidgetId`] = "";
          widget[`${prefix}Collector`] = "";
          handle.classList.remove("is-attached");
          handle.setAttribute("aria-label", `${endpointName} verschieben`);
          handle.setAttribute("title", "Ziehen zum Verschieben");
          attached = false;
          dragOrigin.detached = true;
        }
        const bounds = stage.getBoundingClientRect(); const scaleX = width / bounds.width; const scaleY = height / bounds.height;
        const anchorTarget = closestConnectionAnchor(event.clientX, event.clientY, widget, prefix, widgets, bounds, width, height);
        const collectorTarget = closestConnectionCollector(event.clientX, event.clientY, widget, widgets, bounds, width, height);
        const snapTarget = collectorTarget && (!anchorTarget || collectorTarget.distance <= anchorTarget.distance) ? collectorTarget : anchorTarget;
        for (const marker of document.querySelectorAll(".widget-dock-point.is-snap-target")) marker.classList.remove("is-snap-target");
        for (const marker of document.querySelectorAll(".connection-junction.is-snap-target")) marker.classList.remove("is-snap-target");
        if (snapTarget?.widgetId) document.getElementById(snapTarget.widgetId)?.querySelector(`[data-anchor-id="${snapTarget.anchorId}"]`)?.classList.add("is-snap-target");
        if (snapTarget?.collectorReference) {
          const [targetId, pointId] = snapTarget.collectorReference.split(":");
          [...(document.getElementById(targetId)?.querySelectorAll(".connection-junction") || [])].find(marker => marker.dataset.pointId === pointId)?.classList.add("is-snap-target");
        }
        dragOrigin.snapTarget = snapTarget;
        dragOrigin.changed = true;
        const x = snapTarget ? snapTarget.position.x : Math.max(0, Math.min(width, Math.round((event.clientX - bounds.left) * scaleX)));
        const y = snapTarget ? snapTarget.position.y : Math.max(0, Math.min(height, Math.round((event.clientY - bounds.top) * scaleY)));
        widget[`${prefix}X`] = x; widget[`${prefix}Y`] = y;
        handle.setAttribute("cx", String(x)); handle.setAttribute("cy", String(y)); update();
      });
      const finish = (attach) => {
        if (!dragOrigin) return;
        const { changed, snapTarget } = dragOrigin; dragOrigin = null;
        for (const marker of document.querySelectorAll(".widget-dock-point.is-snap-target")) marker.classList.remove("is-snap-target");
        for (const marker of document.querySelectorAll(".connection-junction.is-snap-target")) marker.classList.remove("is-snap-target");
        if (attach && snapTarget) {
          widget[`${prefix}WidgetId`] = snapTarget.widgetId || "";
          widget[`${prefix}Collector`] = snapTarget.collectorReference || "";
          if (snapTarget.anchorId) widget[`${prefix}Anchor`] = snapTarget.anchorId;
        }
        if (changed) render(); else renderProperties();
      };
      handle.addEventListener("pointerup", () => finish(true));
      handle.addEventListener("pointercancel", () => finish(false));
      handle.addEventListener("keydown", event => {
        const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        if (!directions[event.key]) return;
        if ((widget[`${prefix}WidgetId`] || widget[`${prefix}Collector`]) && !event.ctrlKey) { $("#status").textContent = "Angedockten Linienpunkt mit Strg + Pfeiltaste lösen"; return; }
        event.preventDefault(); event.stopPropagation();
        const current = connectionEndpoint(widget, prefix, widgets);
        widget[`${prefix}WidgetId`] = ""; widget[`${prefix}Collector`] = ""; handle.classList.remove("is-attached"); attached = false;
        handle.setAttribute("aria-label", `${endpointName} verschieben`); handle.setAttribute("title", "Ziehen zum Verschieben");
        const step = event.shiftKey ? 10 : 1;
        const x = Math.max(0, Math.min(width, current.x + directions[event.key][0] * step));
        const y = Math.max(0, Math.min(height, current.y + directions[event.key][1] * step));
        widget[`${prefix}X`] = x; widget[`${prefix}Y`] = y;
        handle.setAttribute("cx", String(x)); handle.setAttribute("cy", String(y)); update(); renderProperties();
      });
    }
  }
  let lineDrag = null;
  let suppressLineClick = false;
  makeDraggable(hit, widget);
  hit.addEventListener("pointerdown", event => {
    if (runtimeMode || event.button !== 0) return;
    if (state.selectedIds.includes(widget.id) && selectedWidgets().length > 1) return;
    event.preventDefault(); event.stopPropagation();
    lineDrag = {
      clientX: event.clientX,
      clientY: event.clientY,
      start: connectionEndpoint(widget, "start", widgets),
      end: connectionEndpoint(widget, "end", widgets),
      points: points.map(point => ({ point, x: Number(point.x) || 0, y: Number(point.y) || 0 })),
      moved: false,
    };
    hit.setPointerCapture(event.pointerId);
  });
  hit.addEventListener("pointermove", event => {
    if (!lineDrag) return;
    const bounds = stage.getBoundingClientRect();
    const dx = Math.round((event.clientX - lineDrag.clientX) * width / bounds.width);
    const dy = Math.round((event.clientY - lineDrag.clientY) * height / bounds.height);
    if (!lineDrag.moved && Math.abs(dx) <= 2 && Math.abs(dy) <= 2) return;
    if (!lineDrag.moved) {
      lineDrag.moved = true;
      setSingleWidgetSelection(widget.id);
      widget.startWidgetId = ""; widget.startCollector = "";
      widget.endWidgetId = ""; widget.endCollector = "";
      for (const handle of svg.querySelectorAll(".connection-endpoint")) {
        handle.classList.remove("is-attached");
        const name = handle.classList.contains("is-start") ? "Anfangspunkt" : "Endpunkt";
        handle.setAttribute("aria-label", `${name} verschieben`);
        handle.setAttribute("title", "Ziehen zum Verschieben");
      }
      hit.classList.add("is-dragging");
    }
    widget.startX = lineDrag.start.x + dx; widget.startY = lineDrag.start.y + dy;
    widget.endX = lineDrag.end.x + dx; widget.endY = lineDrag.end.y + dy;
    for (const origin of lineDrag.points) {
      origin.point.x = origin.x + dx; origin.point.y = origin.y + dy;
      const marker = [...svg.querySelectorAll(".connection-junction")].find(item => item.dataset.pointId === origin.point.id);
      if (marker) { marker.setAttribute("cx", String(origin.point.x)); marker.setAttribute("cy", String(origin.point.y)); }
    }
    const startHandle = svg.querySelector(".connection-endpoint.is-start");
    const endHandle = svg.querySelector(".connection-endpoint.is-end");
    if (startHandle) { startHandle.setAttribute("cx", String(widget.startX)); startHandle.setAttribute("cy", String(widget.startY)); }
    if (endHandle) { endHandle.setAttribute("cx", String(widget.endX)); endHandle.setAttribute("cy", String(widget.endY)); }
    update();
  });
  const finishLineDrag = () => {
    if (!lineDrag) return;
    const moved = lineDrag.moved; lineDrag = null; hit.classList.remove("is-dragging");
    if (!moved) return;
    suppressLineClick = true;
    $("#status").textContent = "Verbindungslinie vollständig verschoben";
    render();
  };
  hit.addEventListener("pointerup", finishLineDrag);
  hit.addEventListener("pointercancel", finishLineDrag);
  hit.addEventListener("click", event => {
    if (runtimeMode) return;
    event.stopPropagation();
    if (suppressLineClick) { suppressLineClick = false; return; }
    const coveredWidget = document.elementsFromPoint(event.clientX, event.clientY).map(element => element.closest?.(".widget")).find(element => element && !element.classList.contains("widget-svg-connection"));
    if (coveredWidget) { setSingleWidgetSelection(coveredWidget.dataset.widgetId); render(); return; }
    const wasSelected = state.selectedId === widget.id;
    setSingleWidgetSelection(widget.id);
    state.propertyTab = "widget";
    if (!wasSelected) {
      renderStage(); renderProperties(); renderWidgetFinder();
      $("#status").textContent = `${widgetDisplayName(widget)} ausgewählt · erneut klicken für einen Punkt`;
      return;
    }
    renderProperties(); renderWidgetFinder();
    const bounds = stage.getBoundingClientRect();
    openConnectionPointDialog(widget, widgets, {
      x: Math.max(0, Math.min(width, Math.round((event.clientX - bounds.left) * width / bounds.width))),
      y: Math.max(0, Math.min(height, Math.round((event.clientY - bounds.top) * height / bounds.height))),
    });
  });
  return svg;
}

function updateRuntimeConnectionVisual(widget, widgets, content) {
  const style = effectiveConnectionStyle(widget, widgets);
  const svg = content.querySelector(".svg-connection-canvas");
  if (!svg || svg.dataset.animationEnabled !== String(Boolean(style.animationEnabled)) || svg.dataset.animationStyle !== (style.animationStyle || "")) {
    content.replaceChildren(renderSvgConnection(widget, widgets, Number(currentPage().page.width), Number(currentPage().page.height), false));
    return;
  }
  svg.querySelector(".connection-base")?.setAttribute("stroke", style.baseColor || "#607d8b");
  const flow = svg.querySelector(".connection-flow");
  if (flow) {
    flow.setAttribute("stroke", style.flowColor || "#29c8b5");
    flow.style.animationDuration = `${Math.max(0.05, Number(style.animationDuration) || 2)}s`;
    flow.style.animationDirection = style.animationDirection === "reverse" ? "reverse" : "normal";
  }
  const light = svg.querySelector("animateMotion")?.parentElement;
  if (light) {
    light.setAttribute("fill", style.flowColor || "#29c8b5");
    const motion = light.querySelector("animateMotion");
    motion.setAttribute("dur", `${Math.max(0.05, Number(style.animationDuration) || 2)}s`);
    motion.setAttribute("path", connectionPathData(widget, widgets, style.animationDirection === "reverse"));
  }
  for (const marker of svg.querySelectorAll("defs marker path, defs marker circle")) {
    const color = style.markerColor || style.flowColor || "#29c8b5";
    if (marker.getAttribute("fill") !== "none") marker.setAttribute("fill", color);
    marker.setAttribute("stroke", color);
  }
}

function formatDate(value, format, relative) {
  let date = value instanceof Date ? value : new Date(value);
  if (typeof value === "number" || /^\d{10,13}$/.test(String(value))) {
    const numeric = Number(value);
    date = new Date(numeric < 1e12 ? numeric * 1000 : numeric);
  }
  if (!Number.isFinite(date.getTime())) return String(value ?? "--");
  const pad = (number) => String(number).padStart(2, "0");
  const parts = { YYYY: String(date.getFullYear()), MM: pad(date.getMonth() + 1), DD: pad(date.getDate()), HH: pad(date.getHours()), mm: pad(date.getMinutes()), ss: pad(date.getSeconds()) };
  const formatted = String(format || "DD.MM.YYYY HH:mm:ss").replace(/YYYY|MM|DD|HH|mm|ss/g, (token) => parts[token]);
  if (!relative) return formatted;
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absolute = Math.abs(seconds);
  const [amount, unit] = absolute < 60 ? [absolute, "Sek."] : absolute < 3600 ? [Math.round(absolute / 60), "Min."] : absolute < 86400 ? [Math.round(absolute / 3600), "Std."] : [Math.round(absolute / 86400), "Tage"];
  return `${formatted} (${seconds <= 0 ? "vor" : "in"} ${amount} ${unit})`;
}

function listEntry(widget) {
  const values = String(widget.valueList || "").split(/\r?\n|;/).map((value, index) => widget[`listValue${index}`] ?? value);
  const raw = Number(displayedWidgetState(widget) ?? widget.testIndex ?? 0);
  const index = Number.isFinite(raw) ? Math.trunc(raw) : 0;
  return { values, index, value: widget[`listValue${index}`] ?? values[index] ?? "" };
}

function applySafeStyle(element, cssText) {
  const allowed = new Set(["color", "background-color", "font-weight", "font-style", "text-align", "border", "border-radius", "padding", "opacity", "filter", "object-fit", "object-position", "box-shadow", "transform", "display", "width", "height", "margin"]);
  for (const declaration of String(cssText || "").split(";")) {
    const separator = declaration.indexOf(":");
    if (separator < 1) continue;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();
    if (allowed.has(property) && value && !/url\s*\(|expression|javascript:/i.test(value)) element.style.setProperty(property, value);
  }
}

function matchesCondition(actual, condition, expected) {
  const actualString = String(actual ?? ""); const expectedString = String(expected ?? "");
  const a = Number(actual); const b = Number(expected);
  const numeric = actualString.trim() !== "" && expectedString.trim() !== "" && Number.isFinite(a) && Number.isFinite(b);
  const left = numeric ? a : actualString.toLowerCase(); const right = numeric ? b : expectedString.toLowerCase();
  switch (condition) {
    case "!=": return left !== right;
    case ">": return left > right;
    case ">=": return left >= right;
    case "<": return left < right;
    case "<=": return left <= right;
    default: return left === right;
  }
}

function addWidget(definition) {
  if (state.tabEditor && definition.type === "tabs") { $("#status").textContent = uiText("Verschachtelte eigene Tabs sind noch nicht unterstützt."); return; }
  recordHistorySnapshot();
  const id = `widget-${state.nextId++}`;
  const page = currentPage();
  const index = page.widgets.length;
  const widget = {
    id, type: definition.type, generalEnabled: false, visibilityEnabled: false, dockPointsEnabled: false, signalImagesEnabled: false, extraControlEnabled: false, locked: false,
    x: 24 + (index % 4) * 150, y: 24 + Math.floor(index / 4) * 90, width: 140, height: 62, radius: 8, visible: true, layer: 0,
    fontSize: 13, fontWeight: "400", textAlign: "left", textColor: "#e7ecee", backgroundColor: "",
    borderColor: "#626c70", borderWidth: 0, borderStyle: "none", padding: 0, shadow: false, opacity: 1,
    ...structuredClone(definition.defaults),
  };
  if (widget.type !== "svg-connection") {
    widget.dockPointsEnabled = false;
    setAllDockPoints(widget, widgetAnchorIds(widget), false);
  }
  if (definition.packageId) { widget.packageId = definition.packageId; widget.definitionVersion = "0.1"; }
  widget.name = uniqueWidgetName(page, widget.name || definition.label);
  if (definition.type === "svg-connection") {
    const connectionLayers = page.widgets.filter(item => item.type === "svg-connection").map(item => Math.max(0, Number(item.layer) || 0));
    widget.layer = (connectionLayers.length ? Math.max(...connectionLayers) : 0) + 1;
    widget.startX = Math.min(page.page.width - 40, 100 + (index % 4) * 30);
    widget.startY = Math.min(page.page.height - 40, 100 + (index % 4) * 30);
    widget.endX = Math.min(page.page.width - 40, widget.startX + 260);
    widget.endY = widget.startY;
  }
  page.widgets.push(widget);
  setSingleWidgetSelection(id);
  render();
  $("#status").textContent = `${widget.name} hinzugefügt`;
  requestAnimationFrame(() => {
    const element = document.getElementById(id);
    const target = definition.type === "svg-connection" ? element?.querySelector(".connection-endpoint.is-start") : element;
    target?.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
}

function lineboxValueText(box, widgets) {
  const sum = lineboxInputSum(box, widgets, state.entityStates);
  return sum === null || !Number.isFinite(sum) ? "—" : String(Number(sum.toFixed(6)));
}

function renderLineboxJunction(box, widgets) {
  const connected = widgets.filter(line => line.type === "svg-connection" && line.visible !== false && ["start", "end"].some(side => line[`${side}WidgetId`] === box.id && lineboxPortRole(box, line[`${side}Anchor`] || (side === "start" ? "right-center" : "left-center")) !== "none"));
  const showCircle = box.junctionVisible !== false && connected.length >= 2;
  const valuePosition = ["above", "below"].includes(box.junctionValuePosition) ? box.junctionValuePosition : "off";
  if (!connected.length || (!showCircle && valuePosition === "off")) return null;
  const position = lineboxRuntimeJoinPosition(box, connected[0].startWidgetId === box.id ? connected[0].startAnchor || "right-center" : connected[0].endAnchor || "left-center");
  if (!position) return null;
  const borderWidth = Math.max(0, Math.min(20, Number(box.junctionBorderWidth ?? 2) || 0));
  const requestedDiameter = Math.max(4, Math.min(100, Number(box.junctionDiameter) || 16));
  const diameter = showCircle ? Math.max(requestedDiameter, ...connected.map(line => Math.max(1, Number(line.lineWidth) || 4) + borderWidth * 2 + 2)) : requestedDiameter;
  const zIndex = Math.max(...connected.map(line => line.cssZIndex !== undefined && line.cssZIndex !== "" ? Number(line.cssZIndex) || 0 : Math.max(0, Number(line.layer) || 0) + 2)) + 1;
  const overlay = document.createElement("span");
  overlay.id = `linebox-junction-${box.id}`;
  overlay.className = "linebox-junction-overlay";
  Object.assign(overlay.style, {
    left: `${position.x - diameter / 2}px`, top: `${position.y - diameter / 2}px`,
    width: `${diameter}px`, height: `${diameter}px`, zIndex: String(zIndex),
  });
  if (showCircle) {
    const circle = document.createElement("span");
    circle.className = "linebox-junction";
    circle.setAttribute("aria-hidden", "true");
    Object.assign(circle.style, {
      backgroundColor: box.junctionColor || "#29c8b5",
      borderColor: box.junctionBorderColor || "#d9f8f3", borderWidth: `${borderWidth}px`,
    });
    overlay.append(circle);
  }
  if (valuePosition !== "off") {
    const value = document.createElement("span");
    value.className = `linebox-output-value is-${valuePosition}`;
    value.textContent = lineboxValueText(box, widgets);
    value.setAttribute("aria-label", `${uiText("Ausgabewert")}: ${value.textContent}`);
    overlay.append(value);
  }
  return overlay;
}

function renderNumberValue(element, widget, entityState) {
  const source = widget.numericSource;
  const display = source === "dock" ? numberDisplay({ ...widget, entityId: "dock" }, { state: displayedWidgetState(widget) })
    : source === "preview" ? numberDisplay({ ...widget, entityId: "" }) : numberDisplay(widget, entityState);
  element.replaceChildren();
  appendSafeHtml(element, display.prefix);
  element.append(document.createTextNode(display.value));
  appendSafeHtml(element, display.suffix);
}

function renderStage(surface = null, target = null, surfaceChain = []) {
  const embedded = Boolean(surface);
  const runtimeMode = rootRuntimeMode || embedded;
  const stage = target || $("#stage");
  if (!embedded) {
    for (const entry of mediaRefreshers) if (entry.timer) clearInterval(entry.timer);
    mediaRefreshers.clear();
  }
  const activePage = surface || currentPage();
  const page = activePage.page;
  if (!runtimeMode) {
    let minX = 0; let minY = 0; let maxX = Number(page.width) || 0; let maxY = Number(page.height) || 0;
    for (const widget of activePage.widgets) {
      const points = widget.type === "svg-connection" ? connectionRoute(widget, activePage.widgets) : [
        { x: Number(widget.x) || 0, y: Number(widget.y) || 0 },
        { x: (Number(widget.x) || 0) + (Number(widget.width) || 0), y: (Number(widget.y) || 0) + (Number(widget.height) || 0) },
      ];
      for (const point of points) { minX = Math.min(minX, point.x); minY = Math.min(minY, point.y); maxX = Math.max(maxX, point.x); maxY = Math.max(maxY, point.y); }
    }
    const margin = 160;
    const spaces = { left: Math.ceil(Math.max(margin, margin - minX)), top: Math.ceil(Math.max(margin, margin - minY)), right: Math.ceil(Math.max(margin, margin + maxX - page.width)), bottom: Math.ceil(Math.max(margin, margin + maxY - page.height)) };
    const scroller = stageCanvas.parentElement; const previousLeft = Number(stageCanvas.dataset.workspaceLeft || spaces.left); const previousTop = Number(stageCanvas.dataset.workspaceTop || spaces.top); const initialized = stageCanvas.dataset.workspaceReady === "true" && stageCanvas.dataset.workspacePage === activePage.id;
    for (const [side, value] of Object.entries(spaces)) stageCanvas.style.setProperty(`--workspace-${side}`, `${value}px`);
    stageCanvas.dataset.workspaceLeft = String(spaces.left); stageCanvas.dataset.workspaceTop = String(spaces.top); stageCanvas.dataset.workspaceReady = "true"; stageCanvas.dataset.workspacePage = activePage.id;
    requestAnimationFrame(() => {
      scroller.scrollLeft = initialized ? scroller.scrollLeft + spaces.left - previousLeft : Math.max(0, spaces.left - 16);
      scroller.scrollTop = initialized ? scroller.scrollTop + spaces.top - previousTop : Math.max(0, spaces.top - 16);
    });
  }
  stage.style.width = `${page.width}px`;
  stage.style.height = `${page.height}px`;
  stage.style.backgroundColor = page.background || "#242729";
  stage.style.setProperty("--stage-background", page.background || "#242729");
  stage.style.setProperty("--dock-color", state.project.settings?.dockColor || "#ffd54f");
  const backgroundImage = safeUrl(page.backgroundAsset || page.backgroundImage, true);
  stage.style.backgroundImage = backgroundImage ? `url(${JSON.stringify(backgroundImage)})` : "none";
  stage.style.backgroundRepeat = page.backgroundRepeat || (page.backgroundMode === "tile" ? "repeat" : "no-repeat");
  stage.style.backgroundAttachment = page.backgroundAttachment || "scroll";
  stage.style.backgroundPosition = page.backgroundPosition || (page.backgroundMode === "center" ? "center center" : "0 0");
  stage.style.backgroundSize = page.backgroundSize || (page.backgroundMode === "stretch" ? "100% 100%" : "auto");
  stage.style.backgroundClip = page.backgroundClip || "";
  stage.style.backgroundOrigin = page.backgroundOrigin || "";
  stage.style.color = page.textColor || "";
  stage.style.fontFamily = page.fontFamily || "";
  stage.style.fontStyle = page.fontStyle || "";
  stage.style.fontVariant = page.fontVariant || "";
  stage.style.fontWeight = page.fontWeight || "";
  stage.style.fontSize = page.fontSize ? `${page.fontSize}px` : "";
  stage.style.lineHeight = page.lineHeight || "";
  stage.style.letterSpacing = page.letterSpacing || "";
  stage.style.wordSpacing = page.wordSpacing || "";
  stage.style.textShadow = page.textShadow || "";
  stage.style.display = runtimeMode && page.display === "none" ? "none" : "";
  const pageClasses = `${page.cssClass || ""} ${page.backgroundClass || ""}`.split(/\s+/).filter((name) => /^[A-Za-z_][\w-]*$/.test(name));
  const runtimeGrid = runtimeMode && page.grid === "sichtbar";
  const hideEditorGrid = !runtimeMode && page.grid === "aus";
  stage.className = `stage${runtimeGrid ? " runtime-grid" : ""}${hideEditorGrid ? " no-grid" : ""}${pageClasses.map((name) => ` ${name}`).join("")}`;
  if (!embedded) $("#runtime-pages-menu-toggle").hidden = page.navigationVisible === false;
  stage.replaceChildren();
  if (state.activeFilter === undefined) {
    const filter = activePage.widgets.find(widget => widget.type === "filter-dropdown"); const defaults = (filter?.filterEntries || []).filter(entry => entry.isDefault).map(entry => String(entry.value)); state.activeFilter = filter?.multiple ? defaults : defaults.slice(0, 1);
  }
  const activeFilter = state.activeFilter || "";
  const selectedFilters = Array.isArray(activeFilter) ? activeFilter : activeFilter ? [activeFilter] : [];
  for (const widget of activePage.widgets) {
    if (widget.type === "linebox-math") { widget.width = Math.max(96, Number(widget.width) || 160); widget.height = widget.width; }
    if (widget.visible === false) continue;
    const editorFilterWords = String(widget.generalEnabled === true ? widget.filterWord || "" : "").split(/[;,]/).map((tag) => tag.trim()).filter(Boolean);
    const editorFilterMatches = state.editorWidgetFilter?.words?.some((word) => editorFilterWords.includes(word));
    if (!runtimeMode && state.editorWidgetFilter?.mode === "hide" && editorFilterMatches) continue;
    if (!runtimeMode && state.editorWidgetFilter?.mode === "only" && !editorFilterMatches) continue;
    let visibilityDisabled = false;
    if (runtimeMode && widget.visibilityEnabled === true && widget.visibilityEntityId) {
      const stateEntry = state.entityStates[widget.visibilityEntityId];
      if (!stateEntry || !matchesCondition(stateEntry.state, widget.visibilityCondition || "==", widget.visibilityValue)) {
        if ((widget.visibilityFallback || "ausblenden") === "ausblenden") continue;
        visibilityDisabled = true;
      }
    }
    const filterTags = String(widget.filterWord || "").split(/[;,]/).map((tag) => tag.trim()).filter(Boolean);
    if (widget.type !== "filter-dropdown" && selectedFilters.length && filterTags.length && !selectedFilters.some(value => filterTags.includes(value))) continue;
    if (runtimeMode && widget.type === "linebox") {
      const junction = renderLineboxJunction(widget, activePage.widgets);
      if (junction) stage.append(junction);
      continue;
    }
    const element = document.createElement("div");
    element.id = widget.id;
    element.dataset.widgetId = widget.id;
    const selected = !runtimeMode && (state.selectedIds.length ? state.selectedIds.includes(widget.id) : widget.id === state.selectedId);
    const primarySelected = !runtimeMode && widget.id === state.selectedId;
    const isConnection = widget.type === "svg-connection";
    const widgetLocked = widget.generalEnabled === true && widget.locked === true;
    element.className = `widget widget-${widget.type}${selected ? " selected" : ""}${primarySelected ? " selection-primary" : ""}${widgetLocked ? " is-locked" : ""}${visibilityDisabled ? " is-visibility-disabled" : ""}`;
    if (widget.generalEnabled === true && widget.cssClass) {
      const safeClasses = String(widget.cssClass).split(/\s+/).filter((name) => /^[A-Za-z_][\w-]*$/.test(name));
      element.classList.add(...safeClasses);
    }
    Object.assign(element.style, {
      position: widget.cssPosition || "absolute", display: widget.cssDisplay || "",
      left: isConnection ? "0" : widget.cssLeft || `${widget.x}px`, top: isConnection ? "0" : widget.cssTop || `${widget.y}px`,
      width: isConnection ? `${page.width}px` : widget.cssWidth || `${widget.width}px`, height: isConnection ? `${page.height}px` : widget.cssHeight || `${widget.height}px`,
      zIndex: (() => {
        const hasExplicitZIndex = widget.cssZIndex !== undefined && widget.cssZIndex !== "";
        const requestedZIndex = hasExplicitZIndex ? Number(widget.cssZIndex) || 0 : Math.max(0, Number(widget.layer) || 0);
        if (runtimeMode) return String(hasExplicitZIndex ? widget.cssZIndex : requestedZIndex + 2);
        if (isConnection && selected) return "200000";
        if (isConnection) return String(Math.min(9999, Math.max(0, hasExplicitZIndex ? requestedZIndex : connectionZIndex(widget, activePage.widgets))) + 2);
        return String(10002 + Math.max(0, requestedZIndex));
      })(),
      overflowX: widget.cssOverflowX || "visible", overflowY: widget.cssOverflowY || "visible",
      cursor: widget.cssCursor || "", transform: widget.cssTransform || "",
      marginLeft: widget.marginLeft || "", marginTop: widget.marginTop || "", marginRight: widget.marginRight || "", marginBottom: widget.marginBottom || "",
    });
    const content = document.createElement("div");
    content.className = "widget-content";
    Object.assign(content.style, {
      borderRadius: `${widget.radius}px`, color: widget.textColor || widget.color || "",
      backgroundColor: widget.backgroundColor || "", borderColor: widget.borderColor || "",
      borderWidth: `${widget.borderWidth ?? 1}px`, fontSize: `${widget.fontSize ?? 13}px`,
      fontWeight: widget.fontWeight || "400", textAlign: widget.textAlign || "left",
      justifyContent: ["sensor", "red-number"].includes(widget.type) ? ({ left: "flex-start", center: "center", right: "flex-end" }[widget.textAlign] || "flex-start") : "",
      padding: `${widget.padding ?? 0}px`, opacity: `${widget.opacity ?? 1}`,
      borderStyle: widget.borderStyle || "none",
      fontFamily: widget.fontFamily || "", fontStyle: widget.fontStyle || "", fontVariant: widget.fontVariant || "",
      lineHeight: widget.lineHeight || "", letterSpacing: widget.letterSpacing || "", wordSpacing: widget.wordSpacing || "", textShadow: widget.textShadow || "",
      paddingLeft: widget.paddingLeft || "", paddingTop: widget.paddingTop || "", paddingRight: widget.paddingRight || "", paddingBottom: widget.paddingBottom || "",
      boxShadow: widget.boxShadow || (widget.shadow ? "0 2px 8px #0006" : "none"),
      backgroundRepeat: widget.backgroundRepeat || "", backgroundAttachment: widget.backgroundAttachment || "",
      backgroundPosition: widget.backgroundPosition || "", backgroundSize: widget.backgroundSize || "",
      backgroundClip: widget.backgroundClip || "", backgroundOrigin: widget.backgroundOrigin || "",
    });
    const widgetBackgroundImage = safeUrl(widget.backgroundImage);
    content.style.backgroundImage = widgetBackgroundImage ? `url(${JSON.stringify(widgetBackgroundImage)})` : "";
    if (isConnection) {
      content.style.background = "none"; content.style.border = "0"; content.style.padding = "0"; content.style.overflow = "visible";
      content.append(renderSvgConnection(widget, activePage.widgets, page.width, page.height, selected));
    } else if (widget.type === "linebox-math") {
      content.classList.add("linebox-math-content");
      content.style.borderRadius = "0";
      if (widget.title) { const caption = document.createElement("strong"); caption.textContent = widget.title; content.append(caption); }
      const value = document.createElement("span"); value.className = "math-result"; content.append(value);
      updateMathResult(widget, activePage.widgets, value);
    } else if (widget.type === "linebox") {
      content.classList.add("linebox-content");
      const title = document.createElement("strong"); title.textContent = widget.title || "";
      const sum = lineboxInputSum(widget, activePage.widgets, state.entityStates);
      const value = document.createElement("span"); value.textContent = `Σ ${sum === null ? "—" : Number(sum.toFixed(3))}`;
      const ports = document.createElement("small");
      const inputs = CONNECTION_ANCHOR_IDS.filter(id => lineboxPortRole(widget, id) === "input").length;
      const outputs = CONNECTION_ANCHOR_IDS.filter(id => lineboxPortRole(widget, id) === "output").length;
      ports.textContent = `IN ${inputs} · OUT ${outputs}`;
      if (widget.title) content.append(title);
      content.append(value, ports);
    } else if (widget.type === "universal-button") {
      const visualStates = widget.visualStates || [];
      const currentState = displayedWidgetState(widget);
      const matchingIndex = visualStates.findIndex((item) => matchesCondition(currentState, item.condition || "==", item.value));
      const visualIndex = matchingIndex >= 0 ? matchingIndex : 0;
      const visual = visualStates[visualIndex] || {};
      content.classList.add("universal-widget-content");
      content.dataset.state = String(currentState ?? "");
      content.style.display = "flex";
      content.style.flexDirection = widget.contentLayout === "horizontal" ? "row" : "column";
      content.style.justifyContent = widget.contentAlign === "start" ? "flex-start" : widget.contentAlign === "end" ? "flex-end" : "center";
      content.style.alignItems = widget.contentAlign === "start" ? "flex-start" : widget.contentAlign === "end" ? "flex-end" : "center";
      content.setAttribute("aria-label", widget.title || `State Element: ${currentState ?? ""}`);
      if (visual.contentType === "icon") {
        const iconValue = String(visual.icon || "").trim();
        if (safeUrl(iconValue, true) || /^mdi:[a-z0-9-]+$/i.test(iconValue)) {
          const image = document.createElement("img"); image.className = "universal-widget-icon";
          const iconSize = Math.max(8, Math.min(512, Number(visual.iconSize) || 48));
          image.style.width = `${iconSize}px`; image.style.height = `${iconSize}px`; image.style.objectFit = "contain";
          setIconImageSource(image, iconValue, visual.iconColor); image.alt = visual.text || iconValue; content.append(image);
        } else if (/^[a-z0-9_-]+:[a-z0-9_-]+$/i.test(iconValue)) {
          const name = document.createElement("span"); name.className = "universal-widget-icon-fallback"; name.textContent = iconValue; content.append(name);
        }
      } else if (visual.contentType === "image") {
        const imageUrl = safeUrl(visual.image, true);
        if (imageUrl) {
          const image = document.createElement("img"); image.className = "universal-widget-image";
          const size = Math.max(8, Math.min(768, Number(visual.iconSize) || 96));
          image.style.width = `${size}px`; image.style.height = `${size}px`; image.style.objectFit = visual.imageFit || "contain";
          image.src = imageUrl; image.alt = visual.text || ""; content.append(image);
        }
      } else if (visual.contentType === "text") {
        const text = document.createElement("span"); text.className = "universal-widget-text"; text.textContent = visual.text || ""; content.append(text);
      } else if (visual.contentType === "html") {
        const html = document.createElement("span"); html.className = "universal-widget-html"; appendSafeHtml(html, visual.html || ""); content.append(html);
      }
      if (runtimeMode && widget.interaction !== "read-only") {
        const nextValue = widget.interaction === "switch" && WRITABLE_SWITCH_ENTITY.test(widget.entityId || "") ? !isOn(currentState) ? "on" : "off" : visualStates[(visualIndex + 1) % Math.max(visualStates.length, 1)]?.value ?? "on";
        const ready = widget.interaction === "navigation" || stateElementReady(widget, nextValue);
        content.classList.add("is-interactive"); content.tabIndex = ready ? 0 : -1; content.setAttribute("aria-disabled", String(!ready));
        if (widget.interaction === "navigation") content.setAttribute("role", "link");
        else content.setAttribute("role", "button");
        const activate = (event) => {
          event.stopPropagation();
          if (!ready) return;
          if (widget.interaction === "navigation") {
            const target = safeUrl(widget.targetUrl);
            if (target) window.open(target, "_blank", "noopener,noreferrer");
          } else {
            setRuntimeStateElement(widget, nextValue);
          }
        };
        if (ready) { content.addEventListener("click", activate); content.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activate(event); } }); }
      }
    } else if (widget.type === "text") {
      content.textContent = widget.textContent ?? widget.state ?? "";
      content.style.whiteSpace = widget.whiteSpace || "pre-wrap";
    } else if (widget.type === "border") {
      content.classList.add("border-content");
      const header = document.createElement("span"); header.className = "border-header";
      header.style.height = `${Math.max(0, Number(widget.headerHeight) || 0)}px`; header.style.backgroundColor = widget.headerColor || "transparent";
      const heading = document.createElement("span"); heading.className = "border-title"; heading.textContent = widget.title || "";
      heading.style.backgroundColor = widget.titleBackground || "transparent";
      heading.style.color = widget.titleColor || "inherit";
      heading.style.top = `${widget.titleTopOffset ?? -9}px`; heading.style.left = `${widget.titleLeftOffset ?? 16}px`;
      content.append(header, heading);
    } else if (widget.type === "button") {
      const on = isOn(displayedWidgetState(widget));
      const iconValue = on ? widget.icon_on : widget.icon_off;
      const iconUrl = safeUrl(iconValue, true);
      if (iconUrl || /^mdi:[a-z0-9-]+$/i.test(iconValue || "")) {
        const image = document.createElement("img"); image.className = "button-icon"; setIconImageSource(image, iconValue);
        image.alt = `${widget.title || "Schaltfläche"}: ${on ? "ein" : "aus"}`; content.append(image);
      } else {
        const fallback = document.createElement("span"); fallback.className = `button-icon-fallback ${on ? "is-on" : "is-off"}`;
        fallback.textContent = on ? "●" : "○"; fallback.setAttribute("aria-hidden", "true"); content.append(fallback);
      }
      if (widget.title) { const caption = document.createElement("span"); caption.className = "button-icon-title"; caption.textContent = widget.title; content.append(caption); }
      content.setAttribute("aria-label", `${widget.title || "Schaltfläche"}: ${on ? "ein" : "aus"}`);
      if (runtimeMode && !widget.readOnly) {
        const ready = switchWidgetReady(widget);
        content.classList.add("is-interactive"); content.setAttribute("role", "button"); content.tabIndex = ready ? 0 : -1; content.setAttribute("aria-disabled", String(!ready));
        if (ready) {
          const toggle = (event) => { event.stopPropagation(); setRuntimeBooleanWidget(widget, !on); };
          content.addEventListener("click", toggle);
          content.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(event); } });
        }
      }
    } else if (widget.type === "toggle") {
      const label = document.createElement("label"); label.className = "widget-toggle";
      const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.checked = isOn(displayedWidgetState(widget));
      checkbox.tabIndex = runtimeMode ? 0 : -1;
      checkbox.autofocus = runtimeMode && widget.autofocus === true;
      checkbox.setAttribute("aria-label", widget.title || "Schalter"); checkbox.dataset.state = checkbox.checked ? "on" : "off";
      const bound = runtimeMode && Boolean(widget.entityId);
      checkbox.disabled = bound && (!WRITABLE_SWITCH_ENTITY.test(widget.entityId) || !["on", "off"].includes(state.entityStates[widget.entityId]?.state) || pendingSwitches.has(widget.entityId));
      if (bound && checkbox.disabled) label.title = "Keine schaltbare Home-Assistant-Entität mit verfügbarem Zustand";
      checkbox.addEventListener("change", (event) => {
        event.stopPropagation();
        if (bound) {
          const enabled = checkbox.checked;
          checkbox.checked = !enabled;
          checkbox.disabled = true;
          void writeRuntimeSwitch(widget, enabled);
        } else {
          widget.state = checkbox.checked ? "on" : "off";
          checkbox.dataset.state = widget.state;
        }
      });
      const track = document.createElement("span"); track.className = "switch-track"; track.setAttribute("aria-hidden", "true");
      label.append(checkbox, track);
      if (widget.title) { const caption = document.createElement("span"); caption.textContent = widget.title; label.append(caption); }
      content.append(label);
    } else if (widget.type === "checkbox") {
      const label = document.createElement("label"); label.className = "widget-checkbox";
      const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.checked = isOn(displayedWidgetState(widget));
      checkbox.tabIndex = runtimeMode ? 0 : -1;
      checkbox.autofocus = runtimeMode && widget.autofocus === true;
      checkbox.disabled = !runtimeMode || !switchWidgetReady(widget);
      checkbox.addEventListener("change", (event) => { event.stopPropagation(); setRuntimeBooleanWidget(widget, checkbox.checked); });
      label.append(checkbox);
      if (widget.title) { const caption = document.createElement("span"); caption.textContent = widget.title; label.append(caption); }
      content.append(label);
    } else if (widget.type === "bulb") {
      const currentState = displayedWidgetState(widget);
      const isOnState = WRITABLE_NUMBER_HELPER.test(widget.entityId || "") || typeof currentState === "number" ? Number(currentState) >= Number(widget.max ?? 1) : isOn(currentState);
      const iconUrl = isOnState ? widget.icon_on : widget.icon_off;
      if (safeUrl(iconUrl, true) || /^mdi:[a-z0-9-]+$/i.test(iconUrl || "")) {
        const image = document.createElement("img"); image.className = "bulb-image"; setIconImageSource(image, iconUrl);
        image.alt = `${widget.title || "Lampe"}: ${isOnState ? "ein" : "aus"}`; content.append(image);
      } else {
      const svgNS = "http://www.w3.org/2000/svg";
      const bulb = document.createElementNS(svgNS, "svg"); bulb.setAttribute("viewBox", "0 0 64 64"); bulb.setAttribute("role", "img");
      bulb.setAttribute("aria-label", `${widget.title || "Lampe"}: ${isOnState ? "ein" : "aus"}`);
      bulb.classList.add("bulb-symbol", isOnState ? "is-on" : "is-off");
      const glass = document.createElementNS(svgNS, "path"); glass.setAttribute("d", "M20 25a12 12 0 1 1 24 0c0 5-3 8-6 12l-1 5H27l-1-5c-3-4-6-7-6-12Z");
      const base = document.createElementNS(svgNS, "path"); base.setAttribute("d", "M27 46h10m-9 5h8m-6 5h4");
      bulb.append(glass, base); content.append(bulb);
      }
      if (widget.title) { const caption = document.createElement("span"); caption.className = "bulb-title"; caption.textContent = widget.title; content.append(caption); }
      if (runtimeMode && !widget.readOnly) {
        const numberHelper = WRITABLE_NUMBER_HELPER.test(widget.entityId || "");
        const ready = numberHelper ? Number.isFinite(Number(currentState)) : switchWidgetReady(widget);
        content.classList.add("is-interactive"); content.setAttribute("role", "button"); content.tabIndex = ready ? 0 : -1; content.setAttribute("aria-disabled", String(!ready));
        if (ready) {
          const toggle = event => {
            event.stopPropagation();
            if (numberHelper) void writeRuntimeHelperValue(widget.entityId, isOnState ? Number(widget.min ?? 0) : Number(widget.max ?? 1));
            else setRuntimeBooleanWidget(widget, !isOnState);
            const url = optionalWidgetGroupEnabled(widget, "extraControlEnabled") ? safeUrl(isOnState ? widget.extraUrlFalse : widget.extraUrlTrue) : null; if (url) window.open(url, "_blank", "noopener,noreferrer");
          };
          content.addEventListener("click", toggle);
          content.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(event); } });
        }
      }
    } else if (widget.type === "slider") {
      const range = document.createElement("input"); range.type = "range";
      range.className = "widget-slider-input";
      for (const [key, value] of Object.entries(sliderStyle(widget))) content.style.setProperty(key, value);
      const bound = Boolean(widget.entityId);
      const liveNumber = sliderLiveValue(widget, state.entityStates[widget.entityId]);
      range.min = String(widget.min ?? 0); range.max = String(widget.max ?? 100);
      range.value = String(liveNumber ?? widget.min ?? 0);
      range.step = String(widget.step ?? 1); range.disabled = !runtimeMode || (bound && (!WRITABLE_NUMBER_HELPER.test(widget.entityId) || liveNumber === null));
      updateSliderFill(range, widget);
      range.setAttribute("aria-label", widget.title || "Regler");
      range.addEventListener("pointerdown", event => { range.dataset.dragging = "true"; range.setPointerCapture(event.pointerId); });
      range.addEventListener("pointerup", () => { delete range.dataset.dragging; });
      range.addEventListener("pointercancel", () => { delete range.dataset.dragging; });
      range.addEventListener("lostpointercapture", () => { delete range.dataset.dragging; if (runtimeRenderDeferred) renderRuntimeStageWhenReady(); });
      range.addEventListener("input", () => { updateSliderFill(range, widget); if (bound) stageRuntimeEntityValue(widget.entityId, Number(range.value)); else widget.value = Number(range.value); });
      range.addEventListener("change", () => { delete range.dataset.dragging; if (bound && !range.disabled) void writeRuntimeHelperValue(widget.entityId, Number(range.value)); });
      const scale = sliderScale(widget);
      if (scale.marks.length) {
        const values = document.createElement("div"); values.className = `widget-slider-values scale-${scale.position}`;
        const labels = document.createElement("div"); labels.className = "widget-slider-scale";
        for (const mark of scale.marks) {
          const item = document.createElement("span"); item.className = `widget-slider-mark${mark.endpoint ? " is-endpoint" : ""}`;
          item.style.left = `${mark.percent}%`;
          if (!mark.endpoint) { const tick = document.createElement("i"); tick.className = "widget-slider-tick"; item.append(tick); }
          if (mark.label) { const label = document.createElement("span"); label.textContent = mark.label; item.append(label); }
          labels.append(item);
        }
        values.append(range, labels); content.append(values);
      } else content.append(range);
    } else if (widget.type === "svg-shape") {
      content.append(renderSvgShape(widget));
    } else if (widget.type === "screen-resolution") {
      const value = document.createElement("span"); value.className = "screen-resolution-value"; value.textContent = `${window.innerWidth} × ${window.innerHeight}`; content.append(value);
    } else if (widget.type === "link") {
      const link = document.createElement("a"); link.href = safeUrl(widget.linkUrl) || "#"; link.rel = "noopener noreferrer"; appendSafeHtml(link, widget.htmlContent || ""); content.append(link);
    } else if (widget.type === "note") {
      const note = document.createElement("div"); note.className = `note-content${widget.hideCorner ? " no-corner" : ""}`; appendSafeHtml(note, `${widget.prefix || ""}${displayedWidgetState(widget) ?? ""}${widget.suffix || ""}`); content.append(note);
    } else if (widget.type === "red-number") {
      const liveValue = displayedWidgetState(widget);
      const badge = document.createElement("span"); badge.className = `widget-badge ${widget.badgeType === "pin" ? "pin" : "circle"}`; badge.style.background = widget.badgeBackground || "#c62828";
      badge.style.border = `1px solid ${widget.badgeBorder || "transparent"}`; badge.style.borderRadius = `${Number(widget.radius ?? 16)}px`;
      appendSafeHtml(badge, widget.prefix || ""); badge.append(document.createTextNode(String(liveValue ?? ""))); appendSafeHtml(badge, Number(liveValue) === 1 ? widget.suffixSingular || "" : widget.suffixPlural || ""); content.append(badge);
    } else if (widget.type === "bool-svg") {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", "0 0 100 100"); svg.style.width = "100%"; svg.style.height = "100%"; svg.style.opacity = String(widget.svgOpacity ?? 1); svg.innerHTML = isOn(displayedWidgetState(widget)) ? widget.svgTrue || "" : widget.svgFalse || "";
      if (runtimeMode && !widget.readOnly) { const ready = switchWidgetReady(widget); svg.setAttribute("role", "button"); svg.setAttribute("aria-disabled", String(!ready)); svg.tabIndex = ready ? 0 : -1; if (ready) { const toggle = event => { event.stopPropagation(); setRuntimeBooleanWidget(widget, !isOn(displayedWidgetState(widget))); }; svg.addEventListener("click", toggle); svg.addEventListener("keydown", event => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); toggle(event); } }); } } content.append(svg);
    } else if (widget.type === "input-value") {
      const bound = Boolean(widget.entityId); const numberHelper = WRITABLE_NUMBER_HELPER.test(widget.entityId || ""); const textHelper = WRITABLE_TEXT_HELPER.test(widget.entityId || "");
      const live = state.entityStates[widget.entityId]?.state;
      const input = document.createElement("input"); input.type = numberHelper || (!bound && widget.numeric) ? "number" : "text";
      if (input.type === "number") input.step = "any";
      input.value = String(bound ? live ?? "" : widget.state ?? "");
      input.readOnly = !runtimeMode || widget.readOnly === true || (bound && ((!numberHelper && !textHelper) || live === undefined));
      input.autofocus = runtimeMode && widget.autofocus === true; input.className = widget.noStyle ? "" : `widget-input ${widget.variant || "standard"}`; input.setAttribute("aria-label", widget.title || "Eingegebener Wert");
      let timer = null; let lastSubmitted;
      const apply = () => {
        clearTimeout(timer);
        if (input.readOnly || input.value === lastSubmitted || (numberHelper && input.value.trim() === "")) return;
        lastSubmitted = input.value;
        if (bound) void writeRuntimeHelperValue(widget.entityId, numberHelper ? Number(input.value) : input.value).then((ok) => { if (!ok && lastSubmitted === input.value) lastSubmitted = undefined; });
        else widget.state = widget.numeric && input.value !== "" ? Number(input.value) : input.value;
      };
      input.addEventListener("focus", () => { input.dataset.editing = "true"; });
      input.addEventListener("blur", () => { delete input.dataset.editing; if (bound) window.setTimeout(renderRuntimeStageWhenReady, 0); });
      input.addEventListener("input", () => { if (widget.autoSet && !widget.withEnter && !input.readOnly) { clearTimeout(timer); timer = window.setTimeout(apply, 350); } });
      input.addEventListener("change", () => { if (!widget.withEnter) apply(); });
      input.addEventListener("keydown", event => { event.stopPropagation(); if (event.key === "Enter") apply(); });
      appendSafeHtml(content, widget.prefix || ""); content.append(input); appendSafeHtml(content, widget.suffix || "");
    } else if (widget.type === "tabs") {
      content.append(renderTabsWidget(widget, activePage, surfaceChain));
    } else if (["view-in-widget", "view-in-widget-8"].includes(widget.type)) {
      const index = widgetStateIndex(widget);
      const target = widget.type === "view-in-widget" ? widget.targetPage : widget[`page${index}`]; const chain = (params.get("chain") || "").split(",").filter(Boolean);
      if (!target) content.textContent = "Seite auswählen";
      else if (target === activePage.id || chain.includes(target) || chain.length >= 8) content.textContent = "Rekursive Einbettung verhindert";
      else if (!runtimeMode) content.textContent = `Seite: ${state.project.pages.find(page => page.id === target)?.name || target}`;
      else { const frame = document.createElement("iframe"); frame.title = widget.title || "Eingebettete Seite"; const url = new URL(location.href); url.searchParams.delete("tabsWidget"); url.searchParams.delete("tabsIndex"); url.searchParams.set("mode", "runtime"); url.searchParams.set("project", state.projectId); url.searchParams.set("page", target); url.searchParams.set("embedded", "1"); url.searchParams.set("chain", [...chain, activePage.id].join(",")); frame.src = url.href; frame.className = "widget-frame"; content.append(frame); }
    } else if (["iframe", "iframe-8"].includes(widget.type)) {
      const index = widgetStateIndex(widget); const source = widget.type === "iframe" ? widget.source : widget[`frameSource${index}`];
      if (safeUrl(source)) { const frame = document.createElement("iframe"); frame.title = widget.title || "iframe"; frame.className = "widget-frame"; frame.style.border = widget.noFrame !== false ? "0" : "1px solid currentColor"; frame.setAttribute("scrolling", widget.scrollX || widget.scrollY ? "yes" : "no"); if (!(widget.type === "iframe" ? widget.noSandbox : widget[`frameNoSandbox${index}`])) frame.setAttribute("sandbox", "allow-scripts allow-forms"); refreshableMedia(frame, widget, source); content.append(frame); }
      else content.textContent = "Quelle auswählen";
    } else if (widget.type === "image" || widget.type === "image-8") {
      const index = widgetStateIndex(widget);
      const liveSource = widget.type === "image" && runtimeMode && widget.entityId ? safeUrl(displayedWidgetState(widget), true) : "";
      const source = liveSource || (widget.type === "image" ? widget.imageSrc : widget[`imageSource${index}`]);
      if (source) { const image = document.createElement("img"); refreshableMedia(image, widget, source); image.style.objectFit = widget.stretch ? "fill" : "contain"; image.style.pointerEvents = widget.allowUserInteractions ? "auto" : "none"; image.alt = widget.title || "Bild"; content.append(image); }
      else { content.classList.add("image-placeholder"); content.setAttribute("aria-label", widget.title || "Bild"); }
    } else if (widget.type === "string") {
      if (widget.icon) { const image = document.createElement("img"); image.className = "button-icon"; setIconImageSource(image, widget.icon); image.alt = ""; content.append(image); }
      const text = document.createElement("span"); text.className = "basic-string"; appendSafeHtml(text, widget.prefix || ""); text.append(document.createTextNode(String(displayedWidgetState(widget) ?? ""))); appendSafeHtml(text, widget.suffix || ""); content.append(text);
    } else if (widget.type === "string-raw") {
      appendSafeHtml(content, `${widget.prefix || ""}${displayedWidgetState(widget) ?? ""}${widget.suffix || ""}`);
    } else if (widget.type === "image-source") {
      const src = safeUrl(displayedWidgetState(widget), true);
      if (src) { const image = document.createElement("img"); image.className = "source-image"; refreshableMedia(image, widget, src); image.alt = widget.alt || widget.title || "Bild"; content.append(image); }
      else { content.textContent = widget.alt || "Bild-URL nicht gesetzt"; content.classList.add("image-placeholder"); }
    } else if (["time-value", "timestamp-value", "timestamp", "last-changed"].includes(widget.type)) {
      const sourceKey = widget.type === "timestamp" ? "lastUpdated" : widget.type === "last-changed" ? "lastChanged" : "state";
      const live = runtimeMode && widget.entityId ? state.entityStates[widget.entityId] : null;
      const sourceValue = live ? sourceKey === "lastUpdated" ? live.last_updated : sourceKey === "lastChanged" ? live.last_changed : live.state : widget[sourceKey];
      const value = formatDate(sourceValue, widget.dateFormat, widget.showInterval);
      const output = document.createElement("span"); output.className = "basic-date"; output.textContent = value; content.append(output);
    } else if (["value-list-text", "value-list-html", "value-list-html-style"].includes(widget.type)) {
      const { value, index } = listEntry(widget);
      if (widget.type === "value-list-text") content.textContent = value;
      else {
        appendSafeHtml(content, value);
        if (widget.type === "value-list-html-style") applySafeStyle(content, widget[`listStyle${index}`] ?? String(widget.styleList || "").split(/\r?\n/)[index] ?? "");
      }
    } else if (["bool-display", "bool-html-control", "ackflag-html"].includes(widget.type)) {
      const current = isOn(displayedWidgetState(widget));
      const output = document.createElement("span"); output.className = "bool-html";
      appendSafeHtml(output, current ? widget.htmlTrue : widget.htmlFalse); content.append(output);
      if (widget.type === "bool-html-control") {
        const ready = runtimeMode && switchWidgetReady(widget);
        output.classList.add("is-interactive"); output.setAttribute("role", "button"); output.setAttribute("aria-disabled", String(!ready)); output.tabIndex = ready ? 0 : -1;
        if (ready) { const toggle = (event) => { event.stopPropagation(); setRuntimeBooleanWidget(widget, !current); }; output.addEventListener("click", toggle); output.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(event); } }); }
      }
    } else if (widget.type === "bool-select") {
      const select = document.createElement("select"); select.className = "widget-control";
      for (const [value, label] of [["off", widget.textOff || "Aus"], ["on", widget.textOn || "Ein"]]) { const option = document.createElement("option"); option.value = value; option.textContent = label; select.append(option); }
      select.value = isOn(displayedWidgetState(widget)) ? "on" : "off"; select.disabled = !runtimeMode || !switchWidgetReady(widget);
      select.autofocus = runtimeMode && widget.autofocus === true;
      select.setAttribute("aria-label", widget.title || "Bool Select");
      select.addEventListener("change", (event) => { event.stopPropagation(); setRuntimeBooleanWidget(widget, select.value === "on"); }); content.append(select);
    } else if (widget.type === "html-state" || widget.type === "html") {
      const output = document.createElement("div"); output.className = "safe-html"; appendSafeHtml(output, String(widget.htmlContent || "").replaceAll("{value}", String(displayedWidgetState(widget) ?? "")));
      if (widget.type === "html" && Number(widget.refreshInterval) > 0) { const update = () => { output.replaceChildren(); appendSafeHtml(output, widget.htmlContent || ""); }; mediaRefreshers.add({ widget, update, timer: setInterval(update, Math.max(100, Number(widget.refreshInterval))) }); }
      const url = safeUrl(widget.clickUrl);
      if (widget.type === "html-state" && url) { const link = document.createElement("a"); link.href = url; link.rel = "noopener noreferrer"; link.append(output); content.append(link); }
      else content.append(output);
    } else if (widget.type === "table") {
      const tableWrap = document.createElement("div"); tableWrap.className = "widget-table-wrap";
      try {
        const data = JSON.parse(runtimeMode && widget.entityId ? String(displayedWidgetState(widget) || "[]") : widget.tableData || "[]");
        let rows = Array.isArray(data) ? data : Array.isArray(data?.rows) ? data.rows : [];
        if (widget.newEventFirst) rows = [...rows].reverse();
        if (Number(widget.maxRows) > 0) rows = rows.slice(0, Math.trunc(Number(widget.maxRows)));
        tableWrap.style.overflow = widget.showScrollbar ? "auto" : "hidden";
        if (rows.length) {
          let columns = [...new Set(rows.flatMap((row) => row && typeof row === "object" ? Object.keys(row) : []))];
          if (Number(widget.maxColumns) > 0) columns = columns.slice(0, Math.trunc(Number(widget.maxColumns)));
          const table = document.createElement("table");
          if (!widget.noHeader) { const head = table.createTHead().insertRow(); columns.forEach((column) => { const cell = document.createElement("th"); cell.textContent = column; head.append(cell); }); }
          const body = table.createTBody();
          rows.forEach((row, index) => { const tr = body.insertRow(); columns.forEach((column) => { const cell = tr.insertCell(); cell.textContent = row?.[column] == null ? "" : String(row[column]); }); if (runtimeMode) { tr.tabIndex = 0; const select = event => { event.stopPropagation(); widget.selectedRow = index; for (const item of body.rows) item.classList.toggle("selected-row", item === tr); if (detail) detail.hidden = false; }; tr.addEventListener("click", select); tr.addEventListener("keydown", event => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); select(event); } }); } });
          tableWrap.append(table);
        } else tableWrap.textContent = "Keine Tabellendaten";
      } catch { tableWrap.textContent = "Ungültige JSON-Testdaten"; }
      content.append(tableWrap);
      const detailTarget = activePage.widgets.find(item => item.id === widget.detailWidget && item.id !== widget.id);
      const detail = detailTarget ? document.createElement("iframe") : null;
      if (detail) { detail.title = "Tabellendetail"; detail.className = "widget-frame"; detail.hidden = true; const url = new URL(location.href); url.searchParams.set("mode", "runtime"); url.searchParams.set("project", state.projectId); url.searchParams.set("page", activePage.id); url.searchParams.set("onlyWidget", detailTarget.id); url.searchParams.set("embedded", "1"); detail.src = url.href; content.append(detail); }
      if (widget.printText) { const button = document.createElement("button"); button.type = "button"; button.textContent = widget.printText; button.addEventListener("click", event => { event.stopPropagation(); if (widget.printPage) { const url = new URL(location.href); url.searchParams.set("page", widget.printPage); url.searchParams.set("mode", "runtime"); window.open(url.href, "_blank", "noopener,noreferrer"); } else window.print(); }); content.append(button); }
    } else if (widget.type === "fullscreen") {
      const button = document.createElement("button"); button.type = "button"; button.className = "fullscreen-button"; button.textContent = widget.buttonText || "Vollbild";
      button.addEventListener("click", async (event) => {
        event.stopPropagation();
        try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
        catch { button.textContent = "Vollbild nicht verfügbar"; }
      }); content.append(button);
    } else if (widget.type === "bar") {
      const min = Number(widget.min ?? 0); const max = Number(widget.max ?? 100); const current = Number(displayedWidgetState(widget));
      const ratio = Number.isFinite(current) && max > min ? Math.max(0, Math.min(1, (current - min) / (max - min))) : 0;
      const track = document.createElement("div"); track.className = `bar-track ${widget.orientation === "vertical" ? "vertical" : "horizontal"}`;
      track.style.border = widget.barBorder || ""; track.style.opacity = String(widget.barOpacity ?? 1);
      const fill = document.createElement("span"); fill.className = "bar-fill"; fill.style.backgroundColor = widget.barColor || "var(--accent)";
      fill.style[widget.orientation === "vertical" ? "height" : "width"] = `${(widget.invert ? 1 - ratio : ratio) * 100}%`; track.append(fill); content.append(track);
      if (widget.numericSource === "dock" && !Number.isFinite(current)) { fill.style[widget.orientation === "vertical" ? "height" : "width"] = "0%"; const missing = document.createElement("span"); missing.textContent = "--"; content.append(missing); }
    } else if (widget.type === "navigation") {
      const href = safeUrl(widget.navUrl);
      if (widget.targetPage) {
        const button = document.createElement("button"); button.type = "button"; appendSafeHtml(button, widget.navHtml ?? widget.navLabel ?? "Öffnen");
        button.addEventListener("click", event => { event.stopPropagation(); if (!runtimeMode) return; const page = state.project.pages.find(page => page.id === widget.targetPage); if (page) { state.project.currentPageId = page.id; setSingleWidgetSelection(null); render(); void refreshRuntimeStates(); } }); content.append(button);
      } else if (href) { const link = document.createElement("a"); link.className = "widget-navigation"; link.href = href; appendSafeHtml(link, widget.navHtml ?? widget.navLabel ?? "Öffnen"); content.append(link); }
      else content.textContent = widget.navLabel || "Ziel-URL fehlt";
    } else if (widget.type === "filter-dropdown") {
      const entries = Array.isArray(widget.filterEntries) ? widget.filterEntries : String(widget.filterOptions || "").split(/[;,\n]/).map(value => ({ value: value.trim(), title: value.trim() })).filter(entry => entry.value);
      const values = widget.hideNoFilter ? entries : [{ value: "", title: widget.noFilterLabel || "Kein Filter" }, ...entries];
      const choose = value => { state.activeFilter = widget.multiple && value ? selectedFilters.includes(value) ? selectedFilters.filter(item => item !== value) : [...selectedFilters, value] : value ? [value] : []; renderStage(); };
      if (!widget.filterType || widget.filterType === "dropdown") {
        const select = document.createElement("select"); select.className = "widget-control"; select.multiple = widget.multiple === true; select.setAttribute("aria-label", widget.title || "Widget-Filter");
        for (const entry of values) { const option = document.createElement("option"); option.value = String(entry.value); option.textContent = entry.title || entry.value; option.selected = selectedFilters.includes(String(entry.value)) || !selectedFilters.length && !entry.value; select.append(option); }
        select.addEventListener("change", event => { event.stopPropagation(); state.activeFilter = [...select.selectedOptions].map(option => option.value).filter(Boolean); renderStage(); }); content.append(select);
      } else {
        const buttons = document.createElement("div"); buttons.className = `widget-filter-buttons ${widget.filterType}`;
        for (const entry of values) { const button = document.createElement("button"); button.type = "button"; const selected = entry.value ? selectedFilters.includes(String(entry.value)) : !selectedFilters.length; button.setAttribute("aria-pressed", selected); button.className = widget.variant || "outlined"; button.style.color = entry.textColor || ""; button.style.backgroundColor = selected ? entry.activeColor || "" : ""; const icon = entry.image || entry.icon; if (icon) { const image = document.createElement("img"); image.alt = ""; image.width = 18; image.height = 18; setIconImageSource(image, icon); button.append(image); } button.append(document.createTextNode(entry.title || entry.value)); button.addEventListener("click", event => { event.stopPropagation(); choose(String(entry.value)); }); buttons.append(button); } content.append(buttons);
      }
    } else if (widget.type === "sensor") {
      const display = numberDisplay({ ...widget, entityId: widget.numericSource === "dock" ? "dock" : widget.numericSource === "preview" ? "" : widget.entityId }, state.entityStates[widget.entityId]);
      const value = document.createElement("span"); value.className = "value";
      renderNumberValue(value, widget, state.entityStates[widget.entityId]);
      if (!display.bound) {
        if (widget.title) { const title = document.createElement("span"); title.className = "widget-title"; title.textContent = widget.title; content.append(title); }
      }
      content.append(value);
    } else if (getWidgetDefinition(widget.type).render?.kind === "text") {
      const definition = getWidgetDefinition(widget.type);
      const value = document.createElement("span");
      value.className = "value";
      value.textContent = String(widget[definition.render.valueKey] ?? definition.defaults[definition.render.valueKey] ?? "");
      content.append(value);
    } else {
      const value = document.createElement("span"); value.className = "value";
    let displayValue = displayedWidgetState(widget) ?? "--";
    let suffix = Number(displayValue) === 1 ? widget.suffixSingular || widget.unit || "" : widget.suffixPlural || widget.unit || "";
    if (widget.entityId && !["dock", "preview"].includes(widget.numericSource)) value.append(document.createTextNode(`${widget.entityId} · `));
    appendSafeHtml(value, widget.prefix || ""); value.append(document.createTextNode(String(displayValue))); appendSafeHtml(value, suffix);
      if (widget.title) { const title = document.createElement("span"); title.className = "widget-title"; title.textContent = widget.title; content.append(title); }
      content.append(value);
      if (widget.type === "gauge") content.classList.add("widget-gauge");
    }
    if (["time-value", "timestamp-value", "timestamp", "last-changed", "value-list-text", "value-list-html", "value-list-html-style", "bool-select", "image-source", "ackflag-html"].includes(widget.type)) {
      const prefix = document.createElement("span"); appendSafeHtml(prefix, widget.prefix || ""); content.prepend(prefix);
      appendSafeHtml(content, widget.suffix || "");
    }
    if (["checkbox", "button", "image"].includes(widget.type)) {
      const prefix = document.createElement("span"); appendSafeHtml(prefix, widget.prefix || ""); content.prepend(prefix);
      appendSafeHtml(content, widget.suffix ?? (Number(displayedWidgetState(widget)) === 1 ? widget.suffixSingular || "" : widget.suffixPlural || ""));
    }
    element.append(content);
    if (isConnection && !runtimeMode) {
      const start = connectionEndpoint(widget, "start", activePage.widgets);
      const tab = document.createElement("div");
      tab.className = "connection-name-tab";
      tab.style.left = `${Math.max(0, Math.min(Math.max(0, page.width - 140), start.x + 10))}px`;
      tab.style.top = `${start.y >= 30 ? start.y - 27 : start.y + 12}px`;
      const select = document.createElement("button"); select.type = "button";
      select.className = "connection-name-select"; select.textContent = widgetDisplayName(widget);
      select.title = "Linie auswählen und Eigenschaften anzeigen";
      select.addEventListener("click", event => {
        event.stopPropagation();
        setSingleWidgetSelection(widget.id); state.propertyTab = "widget";
        renderStage(); renderProperties(); renderWidgetFinder();
      });
      const edit = document.createElement("button"); edit.type = "button";
      edit.className = "connection-name-edit"; edit.textContent = "✎";
      edit.title = "Liniennamen bearbeiten"; edit.setAttribute("aria-label", `Liniennamen von ${widgetDisplayName(widget)} bearbeiten`);
      edit.addEventListener("click", event => {
        event.stopPropagation();
        setSingleWidgetSelection(widget.id); state.propertyTab = "widget";
        renderProperties(); renderWidgetFinder();
        const input = document.createElement("input"); input.type = "text";
        input.className = "connection-name-input"; input.value = widgetDisplayName(widget);
        input.setAttribute("aria-label", "Linienname");
        tab.replaceChildren(input);
        let finished = false;
        const finish = save => {
          if (finished) return;
          finished = true;
          const name = input.value.trim();
          if (save && name && name !== widgetDisplayName(widget)) {
            recordHistorySnapshot();
            widget.name = uniqueWidgetName(activePage, name, widget.id);
            renderWidgetFinder(); renderProperties();
          }
          renderStage();
        };
        input.addEventListener("keydown", keyEvent => {
          if (keyEvent.key === "Enter") { keyEvent.preventDefault(); finish(true); }
          if (keyEvent.key === "Escape") { keyEvent.preventDefault(); finish(false); }
          keyEvent.stopPropagation();
        });
        input.addEventListener("blur", () => finish(true));
        input.addEventListener("click", inputEvent => inputEvent.stopPropagation());
        input.focus(); input.select();
      });
      tab.append(select, edit); element.append(tab);
    }
    const hasConnections = activePage.widgets.some(item => item.type === "svg-connection" && item.visible !== false);
    const showDockPoints = !runtimeMode && !isConnection && widget.dockPointsEnabled === true && (selected || widget.dockAlwaysVisible || hasConnections);
    if (showDockPoints) {
      for (const [anchorId, label, x, y] of widgetAnchors(widget)) {
        if (widget[dockPointKey(anchorId)] !== true) continue;
        const marker = document.createElement("span"); marker.className = "widget-dock-point"; marker.style.left = `${x * 100}%`; marker.style.top = `${y * 100}%`; marker.dataset.anchorId = anchorId; marker.dataset.widgetId = widget.id;
        const occupied = activePage.widgets.filter(item => item.type === "svg-connection" && [[item.startWidgetId, item.startAnchor], [item.endWidgetId, item.endAnchor]].some(([id, anchor]) => id === widget.id && (anchor || "right-center") === anchorId)).length;
        marker.dataset.count = String(occupied); marker.title = `${label}${occupied ? ` · ${occupied} Verbindung${occupied === 1 ? "" : "en"}` : ""}`; element.append(marker);
        if (widget.type === "linebox-math") { marker.classList.add("math-dock-point"); marker.classList.toggle("is-occupied", occupied > 0); marker.textContent = anchorId; }
      }
    }
    const signalCount = isConnection || !optionalWidgetGroupEnabled(widget, "signalImagesEnabled") ? 0 : Math.max(0, Math.min(9, Number(widget.signalCount) || 0));
    for (const [signalIndex, signal] of (widget.signalImages || []).slice(0, signalCount).entries()) {
      if (!signal || (!runtimeMode && signal.hideInEditor)) continue;
      const actual = widget.entityId ? displayedWidgetState(widget) : widget.state ?? widget.value ?? "";
      if (!matchesCondition(actual, signal.condition || "==", signal.value ?? "true")) continue;
      const imageSrc = safeUrl(signal.image, true);
      if (!imageSrc && !/^mdi:[a-z0-9-]+$/i.test(signal.image || "")) continue;
      const overlay = document.createElement("span"); overlay.className = "signal-overlay";
      overlay.style.left = `${Number(signal.horizontal) || 0}px`; overlay.style.top = `${Number(signal.vertical) || 0}px`;
      overlay.style.zIndex = String(20 + signalIndex);
      for (const name of String(signal.className || "").split(/\s+/).filter((item) => /^[A-Za-z_][\w-]*$/.test(item))) overlay.classList.add(name);
      if (signal.blink) overlay.classList.add("signal-blink");
      const image = document.createElement("img"); setIconImageSource(image, signal.image); image.alt = signal.text || `Signal ${signalIndex + 1}`;
      const imageSize = Math.max(8, Math.min(256, Number(signal.imageSize) || 24));
      image.style.width = `${imageSize}px`; image.style.height = `${imageSize}px`; image.style.objectFit = "contain";
      applySafeStyle(image, signal.imageStyle); overlay.append(image);
      const smallIconUrl = safeUrl(signal.smallIcon, true);
      if (smallIconUrl || /^mdi:[a-z0-9-]+$/i.test(signal.smallIcon || "")) { const smallIcon = document.createElement("img"); smallIcon.className = "signal-small-icon"; setIconImageSource(smallIcon, signal.smallIcon); smallIcon.alt = ""; smallIcon.style.width = `${Math.round(imageSize * 0.45)}px`; smallIcon.style.height = `${Math.round(imageSize * 0.45)}px`; overlay.append(smallIcon); }
      if (signal.text) {
        const caption = document.createElement("span"); caption.className = "signal-caption";
        caption.textContent = String(signal.text).replaceAll("{value}", String(actual)).replaceAll("{entity}", String(signal.entityId || ""));
        applySafeStyle(caption, signal.textStyle); overlay.append(caption);
      }
      element.append(overlay);
    }
    if (primarySelected && !isConnection && !widgetLocked && (!widget.editorGroupId || widget.editorGroupId === state.editingGroupId)) {
      const flag = document.createElement("span"); flag.className = "widget-id-flag"; flag.textContent = widget.id;
      element.append(flag);
      for (const direction of ["n", "ne", "e", "se", "s", "sw", "w", "nw"]) {
        const handle = document.createElement("span"); handle.className = `resize-handle resize-${direction}`;
        handle.dataset.direction = direction; handle.setAttribute("role", "separator");
        handle.setAttribute("aria-label", `Widget ${widget.id} an der ${direction.toUpperCase()}-Kante skalieren`);
        handle.title = "Ziehen zum Ändern der Größe"; element.append(handle);
        makeResizable(element, handle, widget);
      }
    }
    if (!runtimeMode) element.addEventListener("contextmenu", event => openWidgetContextMenu(event, widget));
    if (!isConnection) element.addEventListener("click", event => { if (!runtimeMode && !event.target.closest("[data-tab-switch]")) { if (!(state.selectedIds.includes(widget.id) && state.selectedIds.length > 1 && !event.ctrlKey)) selectWidget(widget.id, event.ctrlKey && event.shiftKey); render(); } }, { capture: true });
    if (!runtimeMode && !isConnection && !widgetLocked) makeDraggable(element, widget);
    stage.append(element);
  }
  if (!runtimeMode) renderEditorGroups();
}

const selectedTabs = new Map();
function activeTabIndex(widget, page) {
  const key = `gvs.tabs.${state.projectId}.${page.id}.${widget.id}`;
  if (selectedTabs.has(key)) return selectedTabs.get(key);
  try { return Number(localStorage.getItem(key)) || 0; } catch { return 0; }
}
function visibleWidgets() {
  return visibleTabSurfaces(state.project, currentPage(), activeTabIndex).flatMap(page => page.widgets);
}
function renderTabsWidget(widget, parent, surfaceChain = []) {
  const root = document.createElement("div"); root.className = `widget-tabs ${widget.tabsVertical ? "is-vertical" : "is-horizontal"} variant-${widget.tabsVariant || "standard"}`;
  root.style.setProperty("--tabs-color", widget.tabsColor || "#9f99bb");
  const key = `gvs.tabs.${state.projectId}.${parent.id}.${widget.id}`;
  let active = selectedTabs.get(key);
  if (active === undefined) { try { active = Number(localStorage.getItem(key)) || 0; } catch { active = 0; } }
  active = Math.max(0, Math.min(tabCount(widget) - 1, active));
  const nav = document.createElement("div"); nav.className = "widget-tabs-nav"; nav.setAttribute("role", "tablist");
  nav.setAttribute("aria-label", widget.title || "Tabs"); nav.setAttribute("aria-orientation", widget.tabsVertical ? "vertical" : "horizontal");
  const panel = document.createElement("div"); panel.className = "widget-tabs-panel"; panel.setAttribute("role", "tabpanel");
  panel.id = `${widget.id}-tabpanel`; panel.setAttribute("aria-labelledby", `${widget.id}-tab-${active}`);
  const select = index => {
    selectedTabs.set(key, index); try { localStorage.setItem(key, String(index)); } catch { /* Tab selection remains available for this session. */ }
    if (!runtimeMode) setSingleWidgetSelection(widget.id);
    renderStage(); if (!runtimeMode) { renderProperties(); renderWidgetFinder(); }
    if (runtimeMode) void refreshRuntimeStates(); else void refreshEditorLiveStates();
    document.getElementById(`${widget.id}-tab-${index}`)?.focus();
  };
  for (let index = 0; index < tabCount(widget); index++) {
    const button = document.createElement("button"); button.type = "button"; button.dataset.tabSwitch = "true";
    button.id = `${widget.id}-tab-${index}`; button.setAttribute("role", "tab"); button.setAttribute("aria-controls", panel.id);
    button.setAttribute("aria-selected", String(index === active)); button.tabIndex = index === active ? 0 : -1;
    button.style.color = widget[index === active ? "tabsActiveTextColor" : "tabsInactiveTextColor"] || widget.tabsColor || "#9f99bb";
    button.style.backgroundColor = widget[`tabBackground${index}`] || "";
    if (index !== active) button.style.filter = `brightness(${1 - Math.max(0, Math.min(90, Number(widget.tabsInactiveDim) || 0)) / 100})`;
    const title = widget[`tabTitle${index}`] ?? `Tab ${index + 1}`;
    const icon = widget[`tabImage${index}`] || widget[`tabIcon${index}`];
    if (icon) {
      const image = document.createElement("img"); image.alt = "";
      const size = Math.max(8, Math.min(100, Number(widget[`tabIconSize${index}`]) || 24)); image.width = size; image.height = size;
      setIconImageSource(image, icon, widget[`tabImage${index}`] ? "" : widget[`tabIconColor${index}`] || "#e7ecee");
      const source = safeUrl(icon, true);
      if (!widget[`tabImage${index}`] && source && (/^data:image\/svg\+xml/i.test(source) || /\.svg(?:[?#]|$)/i.test(source))) {
        const symbol = document.createElement("span"); symbol.className = "widget-tab-symbol";
        Object.assign(symbol.style, { width: `${size}px`, height: `${size}px`, backgroundColor: widget[`tabIconColor${index}`] || "#e7ecee", maskImage: `url(${JSON.stringify(source)})` });
        button.append(symbol);
      } else button.append(image);
    }
    const label = document.createElement("span"); label.textContent = title; button.append(label);
    button.setAttribute("aria-label", title || `Tab ${index + 1}`);
    button.onclick = event => { event.stopPropagation(); select(index); };
    button.onkeydown = event => {
      const keys = widget.tabsVertical ? ["ArrowUp", "ArrowDown"] : ["ArrowLeft", "ArrowRight"];
      if (![...keys, "Home", "End"].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      select(event.key === "Home" ? 0 : event.key === "End" ? tabCount(widget) - 1 : (index + (event.key === keys[0] ? -1 : 1) + tabCount(widget)) % tabCount(widget));
    };
    nav.append(button);
  }
  for (const axis of ["X", "Y"]) {
    const value = widget[`tabOverflow${axis}${active}`];
    panel.style[`overflow${axis}`] = value === "none" ? "" : ["visible", "hidden", "scroll", "auto", "initial", "inherit"].includes(value) ? value : "auto";
  }
  const target = tabTarget(widget, active, parent.id), chain = [...(params.get("chain") || "").split(",").filter(Boolean), ...surfaceChain];
  const own = widget[`tabSource${active}`] !== "page";
  const targetPage = own ? ownTabSurface(widget, active) : state.project.pages.find(page => page.id === target);
  if (!targetPage) panel.textContent = uiText("Seite auswählen");
  else if (!canEmbedTab(target, parent.id, chain)) panel.textContent = uiText("Rekursive Einbettung verhindert");
  else {
    const surface = document.createElement("div");
    surface.dataset.tabSurface = target;
    panel.append(surface);
    renderStage(targetPage, surface, [...surfaceChain, parent.id]);
    surface.classList.add("widget-tabs-surface");
    if (!runtimeMode) {
      surface.inert = true;
      panel.dataset.tabSwitch = "true";
      panel.title = uiText("Tabfläche bearbeiten");
      panel.onclick = event => {
        event.preventDefault(); event.stopPropagation();
        state.tabReturn = { ownerId: widget.id, pageId: state.project.currentPageId };
        if (own) state.tabEditor = { ownerId: widget.id, index: active };
        else { state.tabEditor = null; state.project.currentPageId = target; }
        setSingleWidgetSelection(null); render();
      };
    }
  }
  root.append(nav, panel); return root;
}

function makeDraggable(element, widget) {
  let origin;
  element.addEventListener("pointerdown", (event) => {
    if (runtimeMode) return;
    if (event.button !== 0) return;
    if (event.target.closest(".resize-handle")) return;
    if (event.target.closest("[data-tab-switch]")) return;
    const members = state.selectedIds.includes(widget.id) ? selectedWidgets() : groupMembers(currentPage().widgets, widget, state.editingGroupId);
    if (widget.type === "svg-connection" && members.length < 2) return;
    if (members.some(item => item.generalEnabled && item.locked)) return;
    origin = { x: event.clientX, y: event.clientY, members: members.map(item => {
      if (item.type !== "svg-connection") return { id: item.id, x: Number(item.x) || 0, y: Number(item.y) || 0 };
      const start = connectionEndpoint(item, "start", currentPage().widgets), end = connectionEndpoint(item, "end", currentPage().widgets);
      const points = structuredClone(item.connectionPoints || []);
      return { id: item.id, x: Math.min(start.x, end.x, ...points.map(point => Number(point.x) || 0)), y: Math.min(start.y, end.y, ...points.map(point => Number(point.y) || 0)), start, end, points };
    }), moved: false, historyCaptured: false };
    element.setPointerCapture(event.pointerId);
  });
  element.addEventListener("pointermove", (event) => {
    if (!origin || !(event.buttons & 1)) return;
    if (Math.abs(event.clientX - origin.x) > 1 || Math.abs(event.clientY - origin.y) > 1) origin.moved = true;
    if (!origin.moved) return;
    if (!origin.historyCaptured) { recordHistorySnapshot(); origin.historyCaptured = true; }
    const scale = stage.clientWidth / Number.parseFloat(stage.style.width);
    for (const position of translateGroup(origin.members, (event.clientX - origin.x) / scale, (event.clientY - origin.y) / scale)) {
      const member = currentPage().widgets.find(item => item.id === position.id);
      const initial = origin.members.find(item => item.id === position.id);
      if (member.type === "svg-connection") {
        const dx = position.x - initial.x, dy = position.y - initial.y;
        member.startX = initial.start.x + dx; member.startY = initial.start.y + dy;
        member.endX = initial.end.x + dx; member.endY = initial.end.y + dy;
        member.connectionPoints = initial.points.map(point => ({ ...point, x: (Number(point.x) || 0) + dx, y: (Number(point.y) || 0) + dy }));
        continue;
      }
      member.x = position.x; member.y = position.y;
      const target = document.getElementById(member.id);
      if (target) { target.style.left = `${member.x}px`; target.style.top = `${member.y}px`; }
    }
    for (const line of currentPage().widgets.filter(item => item.type === "svg-connection")) {
      const path = connectionPathData(line, currentPage().widgets);
      for (const shape of document.getElementById(line.id)?.querySelectorAll(".connection-base, .connection-hit-target, .connection-flow, .connection-crossing-gap") || []) shape.setAttribute("d", path);
    }
    for (const outline of stage.querySelectorAll(".editor-group-outline")) {
      const bounds = groupBounds(currentPage().widgets.filter(item => item.editorGroupId === outline.dataset.groupId));
      if (bounds) Object.assign(outline.style, { left: `${bounds.x}px`, top: `${bounds.y}px`, width: `${bounds.width}px`, height: `${bounds.height}px` });
    }
  });
  element.addEventListener("pointerup", () => {
    if (!origin) return;
    const moved = origin.moved;
    origin = null;
    if (moved) {
      if (!state.selectedIds.includes(widget.id)) setSingleWidgetSelection(widget.id);
      render();
    }
  });
}

function makeResizable(element, handle, widget) {
  let origin;
  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    origin = { x: event.clientX, y: event.clientY, left: widget.x, top: widget.y, width: widget.width, height: widget.height, historyCaptured: false };
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener("pointermove", (event) => {
    if (!origin || !(event.buttons & 1)) return;
    if (!origin.historyCaptured) { recordHistorySnapshot(); origin.historyCaptured = true; }
    const scale = stage.clientWidth / Number.parseFloat(stage.style.width);
    const direction = handle.dataset.direction;
    const dx = (event.clientX - origin.x) / scale; const dy = (event.clientY - origin.y) / scale;
    if (direction.includes("e")) widget.width = Math.max(16, Math.round(origin.width + dx));
    if (direction.includes("s")) widget.height = Math.max(16, Math.round(origin.height + dy));
    if (direction.includes("w")) { widget.width = Math.max(16, Math.round(origin.width - dx)); widget.x = Math.max(0, Math.round(origin.left + origin.width - widget.width)); }
    if (direction.includes("n")) { widget.height = Math.max(16, Math.round(origin.height - dy)); widget.y = Math.max(0, Math.round(origin.top + origin.height - widget.height)); }
    if (widget.type === "linebox-math") {
      const size = Math.max(96, direction.includes("e") || direction.includes("w") ? widget.width : widget.height);
      widget.width = size; widget.height = size;
      if (direction.includes("n")) widget.y = Math.max(0, origin.top + origin.height - size);
      if (direction.includes("w")) widget.x = Math.max(0, origin.left + origin.width - size);
    }
    element.style.left = `${widget.x}px`; element.style.top = `${widget.y}px`;
    element.style.width = `${widget.width}px`; element.style.height = `${widget.height}px`;
  });
  handle.addEventListener("pointerup", () => { if (origin) { origin = null; renderStage(); } });
}

function openPageSelector(input, multiple = true) {
  const dialog = document.createElement("dialog"); dialog.className = "studio-dialog";
  const heading = document.createElement("h2"); heading.textContent = "Seiten auswählen"; dialog.append(heading);
  const selected = new Set(input.value.split(/[;,]/).map(value => value.trim()));
  const options = [];
  for (const page of multiple ? state.project.pages : [{ id: "", name: "Keine Seite" }, ...state.project.pages]) {
    const label = document.createElement("label"); const check = document.createElement("input"); check.type = multiple ? "checkbox" : "radio"; check.name = "page-choice"; check.checked = selected.has(page.id) || selected.has(page.name);
    label.append(check, document.createTextNode(page.name)); dialog.append(label); options.push([page.id, check]);
  }
  const actions = document.createElement("div"); actions.className = "dialog-actions";
  for (const [label, apply] of [["Übernehmen", true], ["Abbrechen", false]]) {
    const button = document.createElement("button"); button.type = "button"; button.textContent = label;
    button.addEventListener("click", () => { if (apply) { input.value = options.filter(([, check]) => check.checked).map(([id]) => id).join(";"); input.dispatchEvent(new Event(input.tagName === "SELECT" ? "change" : "input", { bubbles: true })); } dialog.close(); }); actions.append(button);
  }
  dialog.append(actions); document.body.append(dialog); dialog.addEventListener("close", () => dialog.remove()); dialog.showModal();
}

function openHtmlEditor(input) {
  const dialog = document.createElement("dialog"); dialog.className = "studio-dialog html-editor";
  const heading = document.createElement("h2"); heading.textContent = "HTML bearbeiten";
  const area = document.createElement("div"); area.className = "html-editor-code";
  const lines = document.createElement("pre"); lines.setAttribute("aria-hidden", "true");
  const editor = document.createElement("textarea"); editor.value = input.value; editor.spellcheck = false; editor.setAttribute("aria-label", "HTML-Code");
  const updateLines = () => { lines.textContent = Array.from({ length: editor.value.split("\n").length }, (_, index) => index + 1).join("\n"); };
  editor.addEventListener("input", updateLines); editor.addEventListener("scroll", () => { lines.scrollTop = editor.scrollTop; }); updateLines();
  const actions = document.createElement("div"); actions.className = "dialog-actions";
  for (const [label, save] of [["Speichern", true], ["Abbrechen", false]]) {
    const button = document.createElement("button"); button.type = "button"; button.textContent = label;
    button.addEventListener("click", () => { if (save) { input.value = editor.value; input.dispatchEvent(new Event("input", { bubbles: true })); } dialog.close(); }); actions.append(button);
  }
  area.append(lines, editor); dialog.append(heading, area, actions); document.body.append(dialog);
  dialog.addEventListener("close", () => { dialog.remove(); input.focus(); }); dialog.showModal(); editor.focus();
}

function updateMathResult(widget, widgets, element) {
  const result = mathBoxResult(widget, widgets, state.entityStates);
  element.textContent = result.value === null ? "—" : String(Number(result.value.toFixed(6)));
  element.title = result.error || "Berechneter Wert";
  element.classList.toggle("is-error", Boolean(result.error));
  element.setAttribute("aria-label", result.error || `Ergebnis: ${element.textContent}`);
}

function openMathDialog(widget) {
  const draft = structuredClone(widget);
  const dialog = document.createElement("dialog"); dialog.className = "studio-dialog math-editor";
  const heading = document.createElement("h2"); heading.textContent = "SVG LineBox Math · Berechnung";
  const hint = document.createElement("p"); hint.textContent = "A–P im Uhrzeigersinn. Mehrere Leitungen je Eingang werden mit Vorzeichen summiert. Formel: + − * / und Klammern, z. B. (A + B) / C. Dezimalzahlen mit Punkt.";
  const modeLabel = document.createElement("label"); modeLabel.textContent = "Berechnungsart ";
  const mode = document.createElement("select");
  for (const [value, label] of [["expression", "Eigene Formel"], ["average", "Durchschnitt aller belegten Eingänge"]]) { const option = document.createElement("option"); option.value = value; option.textContent = label; mode.append(option); }
  mode.value = draft.mathMode || "expression"; modeLabel.append(mode);
  const formulaLabel = document.createElement("label"); formulaLabel.textContent = "Formel ";
  const formula = document.createElement("input"); formula.value = draft.mathExpression || "A + B"; formula.maxLength = 512; formulaLabel.append(formula);
  const sizeLabel = document.createElement("label"); sizeLabel.textContent = "Quadratgröße (px) ";
  const size = document.createElement("input"); size.type = "number"; size.min = "96"; size.max = "2000"; size.value = String(widget.width || 160); sizeLabel.append(size);
  const list = document.createElement("div"); list.className = "math-port-list";
  const preview = document.createElement("p"); preview.className = "math-preview"; preview.setAttribute("aria-live", "polite");
  const inputValues = new Map();
  const refresh = () => {
    draft.mathMode = mode.value; draft.mathExpression = formula.value;
    formula.disabled = mode.value === "average";
    const widgets = currentPage().widgets.map(item => item.id === widget.id ? draft : item);
    const result = mathBoxResult(draft, widgets, state.entityStates);
    preview.textContent = result.error ? result.error : `Ergebnis: ${Number(result.value.toFixed(6))}`;
    for (const [id, element] of inputValues) element.textContent = result.values[id] === undefined ? "—" : String(Number(result.values[id].toFixed(6)));
  };
  for (const [id, label] of MATH_ANCHORS) {
    const row = document.createElement("label"); row.className = "math-port-row";
    const letter = document.createElement("strong"); letter.textContent = id; letter.title = label;
    const occupied = currentPage().widgets.some(line => line.type === "svg-connection" && ["start", "end"].some(side => line[`${side}WidgetId`] === widget.id && line[`${side}Anchor`] === id));
    letter.className = occupied ? "math-port-letter is-occupied" : "math-port-letter";
    const role = document.createElement("select"); role.setAttribute("aria-label", `${id}: Rolle`);
    for (const [value, text] of [["none", "Aus"], ["input", "Eingang"], ["output", "Ausgang"]]) { const option = document.createElement("option"); option.value = value; option.textContent = text; role.append(option); }
    role.value = draft.dockPointsEnabled === true && draft[dockPointKey(id)] === true ? draft[`mathRole_${id}`] || "input" : "none";
    const value = document.createElement("span"); inputValues.set(id, value);
    role.addEventListener("change", () => { draft[`mathRole_${id}`] = role.value; draft[dockPointKey(id)] = role.value !== "none"; draft.dockPointsEnabled = MATH_IDS.some(id => draft[dockPointKey(id)] === true); refresh(); });
    row.append(letter, role, value); list.append(row);
  }
  mode.addEventListener("change", refresh); formula.addEventListener("input", refresh);
  const actions = document.createElement("div"); actions.className = "dialog-actions";
  const apply = document.createElement("button"); apply.textContent = "Anwenden"; apply.type = "button";
  apply.addEventListener("click", () => {
    refresh();
    if (!Number.isFinite(Number(size.value)) || Number(size.value) < 96 || Number(size.value) > 2000) { preview.textContent = "Quadratgröße: 96 bis 2000 px"; return; }
    if (draft.mathMode === "expression") { try { evaluateMathExpression(draft.mathExpression, Object.fromEntries(MATH_IDS.map(id => [id, 1])), true); } catch (error) { preview.textContent = error.message; return; } }
    recordHistorySnapshot(); preserveDockedConnectionPositions(widget, currentPage().widgets);
    for (const key of ["mathMode", "mathExpression", "dockPointsEnabled", ...MATH_IDS.flatMap(id => [dockPointKey(id), `mathRole_${id}`])]) widget[key] = draft[key];
    widget.width = widget.height = Math.round(Number(size.value)); dialog.close(); render();
  });
  const cancel = document.createElement("button"); cancel.textContent = "Abbrechen"; cancel.type = "button"; cancel.addEventListener("click", () => dialog.close());
  actions.append(apply, cancel); dialog.append(heading, hint, modeLabel, formulaLabel, sizeLabel, list, preview, actions);
  document.body.append(dialog); dialog.addEventListener("close", () => dialog.remove()); refresh(); dialog.showModal(); formula.focus();
}

function openFilterEditor(widget) {
  const draft = Array.isArray(widget.filterEntries) ? structuredClone(widget.filterEntries) : String(widget.filterOptions || "").split(/[;,\n]/).filter(Boolean).map(value => ({ value, title: value }));
  const dialog = document.createElement("dialog"); dialog.className = "studio-dialog filter-editor";
  const heading = document.createElement("h2"); heading.textContent = "Filter bearbeiten"; const list = document.createElement("div"); list.className = "filter-editor-list";
  const fields = [{ label: "Wert", key: "value" }, { label: "Titel", key: "title" }, { label: "Symbol", key: "icon", previewImage: true }, { label: "Bild", key: "image", previewImage: true }, { label: "Textfarbe", key: "textColor", type: "color" }, { label: "Aktive Farbe", key: "activeColor", type: "color" }, { label: "Standard", key: "isDefault", type: "checkbox", default: false }];
  const draw = () => { list.replaceChildren(); draft.forEach((entry, index) => { const row = document.createElement("div"); row.className = "filter-editor-row"; for (const descriptor of fields) row.append(field(descriptor, entry)); const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "×"; remove.setAttribute("aria-label", `Eintrag ${index + 1} löschen`); remove.addEventListener("click", () => { draft.splice(index, 1); draw(); }); row.append(remove); list.append(row); }); };
  const add = document.createElement("button"); add.type = "button"; add.textContent = "+ Hinzufügen"; add.addEventListener("click", () => { draft.push({ value: "", title: "", isDefault: false }); draw(); });
  const actions = document.createElement("div"); actions.className = "dialog-actions";
  for (const [label, apply] of [["Anwenden", true], ["Abbrechen", false]]) { const button = document.createElement("button"); button.type = "button"; button.textContent = label; button.addEventListener("click", () => { if (apply) { widget.filterEntries = draft; const selected = draft.filter(entry => entry.isDefault).map(entry => String(entry.value)); state.activeFilter = widget.multiple ? selected : selected.slice(0, 1); renderStage(); } dialog.close(); }); actions.append(button); }
  draw(); dialog.append(heading, add, list, actions); document.body.append(dialog); dialog.addEventListener("close", () => dialog.remove()); dialog.showModal();
}

function openConnectionPointsEditor(widget) {
  const draft = Array.isArray(widget.connectionPoints) ? structuredClone(widget.connectionPoints) : [];
  const dialog = document.createElement("dialog"); dialog.className = "studio-dialog connection-points-editor";
  const heading = document.createElement("h2"); heading.textContent = "Zwischen- und Sammelpunkte";
  const hint = document.createElement("p"); hint.className = "property-hint";
  hint.textContent = "Nur ausdrücklich aktivierte Sammelpunkte können von anderen Linien gewählt werden. Kreuzungen koppeln sich nie automatisch.";
  const list = document.createElement("div"); list.className = "connection-points-list";
  const draw = () => {
    list.replaceChildren();
    draft.forEach((point, index) => {
      const row = document.createElement("div"); row.className = "connection-point-row";
      const makeInput = (label, key, type = "text") => {
        const wrapper = document.createElement("label"); wrapper.textContent = label;
        const input = document.createElement("input"); input.type = type;
        if (type === "checkbox") input.checked = point[key] === true;
        else input.value = point[key] ?? "";
        input.addEventListener("input", () => { point[key] = type === "checkbox" ? input.checked : type === "number" ? Number(input.value) : input.value; });
        wrapper.append(input); return wrapper;
      };
      row.append(makeInput("Name", "name"), makeInput("X", "x", "number"), makeInput("Y", "y", "number"), makeInput("Als Sammelpunkt aktivieren", "collectorEnabled", "checkbox"));
      const display = document.createElement("label"); display.textContent = "Darstellung";
      const select = document.createElement("select");
      for (const [value, label] of [["hidden", "Unsichtbar"], ["point", "Punkt"], ["ring", "Ring"], ["distributor", "Verteiler"]]) { const option = document.createElement("option"); option.value = value; option.textContent = label; select.append(option); }
      select.value = point.display || "point"; select.addEventListener("change", () => { point.display = select.value; }); display.append(select); row.append(display);
      const actions = document.createElement("span"); actions.className = "connection-point-actions";
      for (const [label, disabled, action] of [
        ["↑", index === 0, () => { [draft[index - 1], draft[index]] = [draft[index], draft[index - 1]]; }],
        ["↓", index === draft.length - 1, () => { [draft[index + 1], draft[index]] = [draft[index], draft[index + 1]]; }],
        ["×", false, () => draft.splice(index, 1)],
      ]) { const button = document.createElement("button"); button.type = "button"; button.textContent = label; button.disabled = disabled; button.addEventListener("click", () => { action(); draw(); }); actions.append(button); }
      row.append(actions); list.append(row);
    });
  };
  const add = document.createElement("button"); add.type = "button"; add.textContent = "+ Zwischenpunkt";
  add.addEventListener("click", () => { const count = draft.length + 1; draft.push({ id: createRandomId(), name: `Punkt ${count}`, x: Number(widget.startX || 100) + count * 60, y: Number(widget.startY || 100), collectorEnabled: false, display: "point" }); draw(); });
  const actions = document.createElement("div"); actions.className = "dialog-actions";
  for (const [label, apply] of [["Übernehmen", true], ["Abbrechen", false]]) { const button = document.createElement("button"); button.type = "button"; button.textContent = label; button.addEventListener("click", () => { if (apply) { widget.connectionPoints = draft; renderStage(); renderProperties(); } dialog.close(); }); actions.append(button); }
  draw(); dialog.append(heading, hint, add, list, actions); document.body.append(dialog); dialog.addEventListener("close", () => dialog.remove()); dialog.showModal();
}

function field(descriptor, widget) {
  if (descriptor.type === "tab-edit") {
    const button = document.createElement("button"); button.type = "button"; button.textContent = uiText(descriptor.label);
    button.onclick = () => {
      state.tabReturn = { ownerId: widget.id, pageId: state.project.currentPageId };
      if (widget[`tabSource${descriptor.tabIndex}`] === "page") {
        const page = state.project.pages.find(item => item.id === widget[`tabPage${descriptor.tabIndex}`]);
        if (!page) return;
        state.project.currentPageId = page.id; state.tabEditor = null;
      } else {
        recordHistorySnapshot(); ownTabSurface(widget, descriptor.tabIndex);
        state.tabEditor = { ownerId: widget.id, index: descriptor.tabIndex };
      }
      setSingleWidgetSelection(null); render();
    };
    return button;
  }
  const htmlField = descriptor.html === true || descriptor.type === "html" || /HTML/i.test(descriptor.label) || (descriptor.key === "state" && ["string", "string-raw"].includes(widget.type));
  if (descriptor.type === "radio") {
    const choices = document.createElement("fieldset"); choices.className = "property-radio-field";
    const legend = document.createElement("legend"); legend.textContent = descriptor.label; choices.append(legend);
    const selected = widget[descriptor.key] ?? descriptor.default ?? descriptor.options?.[0]?.value;
    for (const option of descriptor.options || []) {
      const label = document.createElement("label"); label.className = "property-radio-option";
      const input = document.createElement("input"); input.type = "radio"; input.name = `${widget.id}-${descriptor.key}`;
      input.value = option.value; input.checked = selected === option.value; input.disabled = descriptor.disabled === true;
      input.addEventListener("change", () => { if (!input.checked) return; widget[descriptor.key] = input.value; renderStage(); renderProperties(); });
      label.append(input, document.createTextNode(option.label)); choices.append(label);
    }
    return choices;
  }
  const wrapper = document.createElement("label"); wrapper.textContent = descriptor.label;
  if (descriptor.type === "filter-editor") { const button = document.createElement("button"); button.type = "button"; button.textContent = "Bearbeiten"; button.setAttribute("aria-label", "Filter bearbeiten"); button.addEventListener("click", () => openFilterEditor(widget)); wrapper.append(button); return wrapper; }
  if (descriptor.type === "connection-points") { const button = document.createElement("button"); button.type = "button"; button.textContent = `${Array.isArray(widget.connectionPoints) ? widget.connectionPoints.length : 0} Punkte bearbeiten`; button.addEventListener("click", () => openConnectionPointsEditor(widget)); wrapper.append(button); return wrapper; }
  let input;
  if (descriptor.type === "textarea" || htmlField) input = document.createElement("textarea");
  else if (["select", "page", "widget", "collector", "connection"].includes(descriptor.type)) {
    input = document.createElement("select");
    const choices = descriptor.type === "page" ? [{ value: "", label: "Keine Seite" }, ...state.project.pages.map(page => ({ value: page.id, label: page.name }))]
      : descriptor.type === "widget" ? [{ value: "", label: "Kein Widget / freier Punkt" }, ...currentPage().widgets.filter(item => item.id !== widget.id && item.type !== "svg-connection").map(item => ({ value: item.id, label: `${widgetDisplayName(item)} · ${item.id}` }))]
      : descriptor.type === "connection" ? [{ value: "", label: "Keine Hauptlinie" }, ...currentPage().widgets.filter(item => item.id !== widget.id && item.type === "svg-connection").map(item => ({ value: item.id, label: `${widgetDisplayName(item)} · ${item.id}` }))]
      : descriptor.type === "collector" ? [{ value: "", label: "Kein Sammelpunkt" }, ...currentPage().widgets.filter(item => item.id !== widget.id && item.type === "svg-connection").flatMap(item => (item.connectionPoints || []).filter(point => point.collectorEnabled).map(point => ({ value: `${item.id}:${point.id}`, label: `${widgetDisplayName(item)} · ${point.name || point.id}` })))]
      : descriptor.options || [];
    for (const item of choices) {
      const option = document.createElement("option"); option.value = typeof item === "string" ? item : item.value;
      option.textContent = typeof item === "string" ? item : item.label; input.append(option);
    }
  } else { input = document.createElement("input"); input.type = descriptor.type || "text"; }
  if (descriptor.min !== undefined) input.min = descriptor.min;
  if (descriptor.max !== undefined) input.max = descriptor.max;
  if (widget.type === "slider" && descriptor.key === "scaleSteps") input.max = sliderScale(widget).limit;
  if (descriptor.step !== undefined) input.step = descriptor.step;
  if (input.type === "checkbox" && descriptor.key?.startsWith("dock_")) input.dataset.dockPoint = descriptor.key;
  if (input.type === "checkbox") input.checked = widget[descriptor.key] ?? descriptor.default ?? true;
  else input.value = widget[descriptor.key] ?? descriptor.default ?? (descriptor.type === "color" ? "#29c8b5" : descriptor.type === "select" ? (typeof descriptor.options?.[0] === "string" ? descriptor.options[0] : descriptor.options?.[0]?.value) || "" : "");
  input.disabled = descriptor.disabled === true;
  let preview;
  let aliasPreview;
  let previewRow;
  const updatePreview = async () => {
    if (!preview) return;
    const value = input.value.trim();
    let source = safeUrl(value, true);
    let alias = "";
    const iconMatch = value.match(/^([a-z0-9_-]+):([a-z0-9_-]+)$/i);
    if (!source && iconMatch) {
      alias = iconMatch[1];
      if (alias.toLowerCase() === "mdi") {
        try {
          const icons = await loadMdiIcons();
          const path = icons.get(iconMatch[2]);
          if (path && input.value.trim() === value) source = iconDataUrl(path, getComputedStyle(document.body).color);
        } catch { /* Keep the entered icon name visible when the catalog cannot be loaded. */ }
      }
    }
    if (input.value.trim() !== value) return;
    const showAlias = Boolean(alias && !source);
    previewRow.classList.toggle("has-preview", Boolean(source || showAlias));
    preview.hidden = !source;
    preview.removeAttribute("src");
    if (source) preview.src = source;
    else if (iconMatch?.[1].toLowerCase() === "mdi") setIconImageSource(preview, value);
    aliasPreview.hidden = !showAlias;
    aliasPreview.textContent = alias ? alias.slice(0, 3) : "";
  };
  if (descriptor.key === "entityId" || /EntityId$/.test(descriptor.key)) {
    const row = document.createElement("span"); row.className = "property-entity-row";
    const picker = document.createElement("button"); picker.type = "button"; picker.className = "property-icon-picker-button";
    picker.textContent = "…";
    picker.title = "Home-Assistant-Entität auswählen"; picker.setAttribute("aria-label", picker.title);
    picker.disabled = input.disabled;
    picker.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); openEntities(input); });
    row.append(input, picker); wrapper.append(row);
  } else if (descriptor.previewImage || descriptor.key === "backgroundImage") {
    const row = document.createElement("span"); row.className = "property-input-row"; previewRow = row;
    preview = document.createElement("img"); preview.className = "property-image-preview"; preview.alt = ""; preview.loading = "lazy";
    preview.addEventListener("error", () => {
      preview.hidden = true;
      if (input.value.trim() && /^[a-z0-9_-]+:[a-z0-9_-]+$/i.test(input.value.trim())) {
        const namespace = input.value.trim().split(":", 1)[0];
        aliasPreview.textContent = namespace.slice(0, 3);
        aliasPreview.hidden = false;
        previewRow.classList.add("has-preview");
      } else {
        previewRow.classList.remove("has-preview");
      }
    });
    aliasPreview = document.createElement("span"); aliasPreview.className = "property-iconset-preview"; aliasPreview.hidden = true;
    const picker = document.createElement("button"); picker.type = "button"; picker.className = "property-icon-picker-button"; picker.textContent = "…";
    picker.title = "Icon oder Bild auswählen"; picker.setAttribute("aria-label", "Icon oder Bild auswählen");
    picker.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); openIconPicker(input); });
    row.append(preview, aliasPreview, input, picker); wrapper.append(row); void updatePreview();
  } else if (descriptor.key === "multiViews" || descriptor.type === "page") {
    const row = document.createElement("span"); row.className = "property-input-row";
    const picker = document.createElement("button"); picker.type = "button"; picker.className = "property-icon-picker-button"; picker.textContent = "…"; picker.title = "Seiten auswählen"; picker.setAttribute("aria-label", picker.title);
    picker.addEventListener("click", () => openPageSelector(input, descriptor.type !== "page")); row.append(input, picker); wrapper.append(row);
  } else if (htmlField) {
    const row = document.createElement("span"); row.className = "property-input-row";
    const button = document.createElement("button"); button.type = "button"; button.className = "property-icon-picker-button"; button.textContent = "✎"; button.title = "HTML bearbeiten"; button.setAttribute("aria-label", button.title);
    button.disabled = input.disabled; button.addEventListener("click", () => openHtmlEditor(input)); row.append(input, button); wrapper.append(row);
  } else wrapper.append(input);
  if (input.type === "range") {
    const number = document.createElement("input"); number.type = "number"; number.min = input.min; number.max = input.max; number.step = input.step; number.value = input.value; number.setAttribute("aria-label", descriptor.label);
    input.addEventListener("input", () => { number.value = input.value; });
    number.addEventListener("input", () => { input.value = number.value; number.value = input.value; input.dispatchEvent(new Event("input", { bubbles: true })); }); wrapper.append(number);
    number.addEventListener("change", () => input.dispatchEvent(new Event("change", { bubbles: true })));
  }
  const update = () => {
    if (widget.type === "slider" && descriptor.key === "scaleSteps") input.value = String(sliderScale({ ...widget, scaleSteps: input.value }).count);
    if (descriptor.key === "count" && input.type === "number") input.value = String(Math.max(Number(descriptor.min ?? 1), Math.min(Number(descriptor.max ?? 50), Math.trunc(Number(input.value) || 1))));
    widget[descriptor.key] = input.type === "number" || input.type === "range" ? Number(input.value) : input.type === "checkbox" ? input.checked : input.value;
    if ((["sensor", "slider", "input-value"].includes(widget.type) && descriptor.key === "entityId") ||
        (widget.type === "svg-connection" && ["animationSource", "animationNumberEntityId", "animationBooleanEntityId"].includes(descriptor.key))) {
      void refreshEditorLiveStates();
    }
    if (widget.type === "linebox" && descriptor.key?.startsWith("dock_") && input.type === "checkbox" && !input.checked) widget[`lineboxRole_${descriptor.key.slice(5)}`] = "none";
    if (descriptor.key === "testIndex" && widget.type?.startsWith("value-list-")) widget.state = input.value;
    void updatePreview();
    renderStage();
    if (descriptor.refreshProperties && !["number", "range"].includes(input.type)) renderProperties();
    if (["name", "title"].includes(descriptor.key) && widget.id) {
      renderWidgetFinder();
      const heading = document.querySelector(".selected-widget-heading");
      if (heading) heading.textContent = `${widgetDisplayName(widget)} — ${getWidgetDefinition(widget.type).label} · ${widget.id}`;
    }
  };
  input.addEventListener(input.tagName === "SELECT" ? "change" : "input", update);
  if (descriptor.refreshProperties && ["number", "range"].includes(input.type)) input.addEventListener("change", renderProperties);
  if (descriptor.key === "preset") input.addEventListener("change", () => {
    if (PRESETS[input.value]) Object.assign(widget, PRESETS[input.value]);
    render();
  });
  return wrapper;
}

function renderProperties() {
  const panel = $("#properties"); panel.replaceChildren();
  const tabs = document.createElement("nav"); tabs.className = "property-tabs"; tabs.setAttribute("aria-label", "Eigenschaften-Reiter");
  for (const [id, label] of [["view", "ANSICHT"], ["widget", "WIDGET"], ["css", "CSS"], ["scripts", "SKRIPTE"]]) {
    const tab = document.createElement("button"); tab.type = "button"; tab.textContent = label;
    tab.classList.toggle("active", state.propertyTab === id);
    tab.setAttribute("aria-pressed", String(state.propertyTab === id));
    tab.addEventListener("click", () => { state.propertyTab = id; renderProperties(); });
    tabs.append(tab);
  }
  panel.append(tabs);
  const page = currentPage();
  const widget = page.widgets.find((item) => item.id === state.selectedId);
  if (!widget && !["view", "css"].includes(state.propertyTab)) { const empty = document.createElement("p"); empty.className = "empty"; empty.textContent = "Wähle ein Widget aus, um seine Eigenschaften zu bearbeiten."; panel.append(empty); return; }
  if (state.propertyTab === "view") {
    const heading = document.createElement("div"); heading.className = "selected-widget-heading"; heading.textContent = "Ansicht / Hintergrund"; panel.append(heading);
    for (const [index, group] of VIEW_PROPERTY_GROUPS.entries()) {
      const details = document.createElement("details"); details.className = "property-section";
      const sectionKey = `view:${group.label}:${index}`;
      details.open = state.expandedPropertySections.has(sectionKey);
      details.addEventListener("toggle", () => { if (details.open) state.expandedPropertySections.add(sectionKey); else state.expandedPropertySections.delete(sectionKey); });
      const summary = document.createElement("summary");
      const title = document.createElement("span"); title.className = "property-section-title"; title.textContent = group.label;
      const enabled = document.createElement("input"); enabled.type = "checkbox"; enabled.className = "property-section-enabled";
      enabled.checked = propertyGroupEnabled(page.page, group, index);
      enabled.setAttribute("aria-label", `${group.label}: Optionen im Projekt speichern`);
      enabled.title = "Optionen dieser Gruppe im gespeicherten Projekt übernehmen";
      enabled.addEventListener("click", (event) => event.stopPropagation());
      enabled.addEventListener("change", (event) => {
        event.stopPropagation();
        page.page.enabledPropertyGroups ??= {};
        page.page.enabledPropertyGroups[propertyGroupKey(group, index)] = enabled.checked;
      });
      summary.append(title, enabled);
      const body = document.createElement("div"); body.className = "property-fields";
      body.append(...group.fields.map((descriptor) => field(descriptor, page.page)));
      details.append(summary, body); panel.append(details);
    }
    return;
  }
  if (state.propertyTab === "css") {
    const heading = document.createElement("div"); heading.className = "selected-widget-heading"; heading.textContent = "Globales CSS · alle Widgets dieses Projekts"; panel.append(heading);
    const hint = document.createElement("p"); hint.className = "property-hint global-css-hint";
    hint.textContent = "Diese Regeln gelten projektweit. Individuelle CSS-Werte des ausgewählten Widgets findest du unter WIDGET.";
    const editor = document.createElement("textarea"); editor.className = "project-css-editor"; editor.setAttribute("aria-label", "Globales Projekt-CSS");
    editor.spellcheck = false; editor.value = state.project.css || "";
    editor.placeholder = ".widget-toggle {\n  /* CSS für alle Switch-Widgets */\n}\n\n.widget-text {\n  /* CSS für alle Text-Widgets */\n}";
    editor.addEventListener("input", () => { state.project.css = editor.value; applyProjectCss(); });
    panel.append(hint, editor);
    return;
  }
  if (state.propertyTab === "scripts") { const empty = document.createElement("p"); empty.className = "empty"; empty.textContent = "Widget-Skripte werden in einem späteren Ausbauschritt ergänzt."; panel.append(empty); return; }
  if (widget.type === "toggle" && typeof widget.state === "boolean") widget.state = widget.state ? "on" : "off";
  let groups = widgetPropertyGroups(widget);
  groups = [...groups, ...indexedWidgetGroups(widget)];
  if (widget.type === "value-list-html-style") {
    const count = Math.max(1, Math.min(50, Math.trunc(Number(widget.count) || 2)));
    const values = String(widget.valueList || "").split(/\r?\n|;/); const styles = String(widget.styleList || "").split(/\r?\n/);
    const options = Array.from({ length: count + 1 }, (_, index) => ({ value: String(index), label: `${index}: ${widget[`listValue${index}`] ?? values[index] ?? ""}` }));
    groups = groups.map(group => ({ ...group, fields: group.fields.map(descriptor => descriptor.key === "state" || descriptor.key === "testIndex" ? { ...descriptor, type: "select", options } : descriptor) }));
    groups = [...groups, ...Array.from({ length: count + 1 }, (_, index) => ({ label: `Wert [${index}]`, fields: [
      { label: `HTML Wert [${index}]`, key: `listValue${index}`, default: values[index] || "", refreshProperties: false },
      { label: `Stil für [${index}]`, key: `listStyle${index}`, default: styles[index] || "", type: "textarea" },
    ] }))];
  }
  const heading = document.createElement("div"); heading.className = "selected-widget-heading";
  const updateHeading = () => { heading.textContent = `${widgetDisplayName(widget)} — ${getWidgetDefinition(widget.type).label} · ${widget.id}`; };
  updateHeading(); panel.append(heading);
  if (widget.type === "linebox-math") {
    const edit = document.createElement("button"); edit.type = "button"; edit.textContent = "Berechnung bearbeiten";
    edit.addEventListener("click", () => openMathDialog(widget)); panel.append(edit);
  }
  for (const [index, group] of groups.entries()) {
    const details = document.createElement("details"); details.className = "property-section";
    const sectionKey = `widget:${widget.id}:${group.label}:${index}`;
    details.open = state.expandedPropertySections.has(sectionKey);
    details.addEventListener("toggle", () => { if (details.open) state.expandedPropertySections.add(sectionKey); else state.expandedPropertySections.delete(sectionKey); });
    const summary = document.createElement("summary");
    const title = document.createElement("span"); title.className = "property-section-title"; title.textContent = group.label;
    summary.append(title);
    if (group.indexed) {
      const { index: entryIndex, count, max, fields } = group.indexed;
      const swap = (a, b) => { for (const descriptor of fields) { const keyA = `${descriptor.key}${a}`; const keyB = `${descriptor.key}${b}`; [widget[keyA], widget[keyB]] = [widget[keyB], widget[keyA]]; } const enabled = widget.enabledPropertyGroups ??= {}; const aKey = `indexed-${widget.type}-${a}`; const bKey = `indexed-${widget.type}-${b}`; [enabled[aKey], enabled[bKey]] = [enabled[bKey], enabled[aKey]]; };
      for (const [label, disabled, action] of [
        ["Kopieren", count >= max, () => { for (let i = count + 1; i > entryIndex + 1; i--) swap(i, i - 1); for (const descriptor of fields) widget[`${descriptor.key}${entryIndex + 1}`] = widget[`${descriptor.key}${entryIndex}`]; widget.count = count + 1; }],
        ["Löschen", count <= 1, () => { for (let i = entryIndex; i < count; i++) swap(i, i + 1); for (const descriptor of fields) delete widget[`${descriptor.key}${count}`]; delete widget.enabledPropertyGroups?.[`indexed-${widget.type}-${count}`]; widget.count = count - 1; }],
        ["Nach oben", entryIndex === 0, () => swap(entryIndex, entryIndex - 1)], ["Nach unten", entryIndex === count, () => swap(entryIndex, entryIndex + 1)],
      ]) {
        const button = document.createElement("button"); button.type = "button"; button.textContent = { Kopieren: "⧉", Löschen: "×", "Nach oben": "↑", "Nach unten": "↓" }[label]; button.title = label; button.setAttribute("aria-label", `${label} ${group.label}`); button.disabled = disabled; button.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); action(); renderProperties(); renderStage(); }); summary.append(button);
      }
    }
    const enabled = document.createElement("input"); enabled.type = "checkbox"; enabled.className = "property-section-enabled";
    enabled.checked = ["signalImagesEnabled", "extraControlEnabled"].includes(group.masterKey) ? optionalWidgetGroupEnabled(widget, group.masterKey) : group.masterKey ? (widget[group.masterKey] ?? group.defaultEnabled ?? true) : propertyGroupEnabled(widget, group, index);
    enabled.setAttribute("aria-label", group.masterKey ? `${group.label} aktivieren` : `${group.label}: Optionen im Projekt speichern`);
    enabled.title = group.masterKey ? `${group.label} vollständig aktivieren oder deaktivieren` : "Optionen dieser Gruppe im gespeicherten Projekt übernehmen";
    enabled.addEventListener("click", (event) => event.stopPropagation());
    enabled.addEventListener("change", (event) => {
      event.stopPropagation();
      if (group.masterKey) {
        recordHistorySnapshot();
        if (group.masterKey === "dockPointsEnabled" && !enabled.checked) {
          preserveDockedConnectionPositions(widget, page.widgets);
        }
        widget[group.masterKey] = enabled.checked;
        details.classList.toggle("is-disabled", !enabled.checked);
        for (const control of body.querySelectorAll("input, select, textarea, button")) control.disabled = !enabled.checked;
        renderStage();
        if (widget.type === "linebox" && group.masterKey === "dockPointsEnabled") renderProperties();
      } else {
        widget.enabledPropertyGroups ??= {};
        widget.enabledPropertyGroups[propertyGroupKey(group, index)] = enabled.checked;
      }
    });
    summary.append(enabled);
    const body = document.createElement("div"); body.className = "property-fields";
    let updateDockAll = null;
    if (group.id === "dock-points") {
      const allLabel = document.createElement("label"); allLabel.className = "dock-all-label";
      const allCheckbox = document.createElement("input"); allCheckbox.type = "checkbox"; allCheckbox.setAttribute("aria-label", "Alle Punkte");
      allLabel.append(allCheckbox, document.createTextNode("Alle Punkte")); body.append(allLabel);
      updateDockAll = () => {
        const selection = dockPointSelection(widget, widgetAnchorIds(widget));
        allCheckbox.checked = selection === "all";
        allCheckbox.indeterminate = selection === "some";
      };
      allCheckbox.addEventListener("change", () => {
        recordHistorySnapshot();
        if (!allCheckbox.checked) preserveDockedConnectionPositions(widget, page.widgets);
        setAllDockPoints(widget, widgetAnchorIds(widget), allCheckbox.checked);
        if (widget.type === "linebox" && !allCheckbox.checked) for (const anchorId of CONNECTION_ANCHOR_IDS) widget[`lineboxRole_${anchorId.replaceAll("-", "_")}`] = "none";
        for (const input of body.querySelectorAll("input[data-dock-point]")) input.checked = allCheckbox.checked;
        updateDockAll(); renderStage();
        if (widget.type === "linebox") renderProperties();
      });
    }
    if (group.hint) { const hint = document.createElement("p"); hint.className = "property-hint"; hint.textContent = group.hint; body.append(hint); }
    const visibleFields = (fields, model) => fields.filter((descriptor) => !descriptor.showWhen || (model[descriptor.showWhen.key] ?? descriptor.showWhen.default) === descriptor.showWhen.value).map((descriptor) => field(descriptor, model));
    body.append(...visibleFields(group.fields, widget));
    if (updateDockAll) {
      for (const input of body.querySelectorAll("input[data-dock-point]")) input.addEventListener("input", updateDockAll);
      updateDockAll();
    }
    if (group.universalStates) {
      const count = Math.max(1, Math.min(5, Number(widget.stateCount) || 2));
      widget.visualStates ??= [];
      while (widget.visualStates.length < count) {
        const stateIndex = widget.visualStates.length;
        widget.visualStates.push({ condition: "==", value: `state-${stateIndex + 1}`, contentType: "icon", icon: "mdi:checkbox-blank-circle", image: "", text: "", html: "", iconSize: 48, iconColor: "#29c8b5", imageFit: "contain" });
      }
      const stateFields = [
        { label: "Vergleich", key: "condition", type: "select", options: ["==", "!=", ">", ">=", "<", "<="] },
        { label: "Zustandswert", key: "value" },
        { label: "Inhalt", key: "contentType", type: "select", refreshProperties: true, options: [
          { value: "icon", label: "Icon" }, { value: "image", label: "Bild" }, { value: "text", label: "Text" }, { value: "html", label: "HTML" },
        ] },
        { label: "Icon / Iconset", key: "icon", previewImage: true, showWhen: { key: "contentType", value: "icon" } },
        { label: "Bildpfad / URL", key: "image", previewImage: true, showWhen: { key: "contentType", value: "image" } },
        { label: "Text", key: "text", type: "textarea", showWhen: { key: "contentType", value: "text" } },
        { label: "HTML-Inhalt", key: "html", type: "textarea", showWhen: { key: "contentType", value: "html" } },
        { label: "Icongröße (px)", key: "iconSize", type: "range", min: 8, max: 512, step: 1, showWhen: { key: "contentType", value: "icon" } },
        { label: "Bildgröße (px)", key: "iconSize", type: "range", min: 8, max: 768, step: 1, showWhen: { key: "contentType", value: "image" } },
        { label: "Iconfarbe", key: "iconColor", type: "color", showWhen: { key: "contentType", value: "icon" } },
        { label: "Bildanpassung", key: "imageFit", type: "select", options: ["contain", "cover", "fill"], showWhen: { key: "contentType", value: "image" } },
      ];
      for (let stateIndex = 0; stateIndex < count; stateIndex += 1) {
        const visualState = widget.visualStates[stateIndex];
        const details = document.createElement("details"); details.className = "signal-section";
        const nestedKey = `widget:${widget.id}:${group.label}:state:${stateIndex}`;
        details.open = state.expandedPropertySections.has(nestedKey);
        details.addEventListener("toggle", () => { if (details.open) state.expandedPropertySections.add(nestedKey); else state.expandedPropertySections.delete(nestedKey); });
        const summary = document.createElement("summary"); summary.textContent = `Zustand ${stateIndex + 1}`; details.append(summary);
        const fields = document.createElement("div"); fields.className = "property-fields";
        fields.append(...visibleFields(stateFields, visualState));
        details.append(fields); body.append(details);
      }
      widget.visualStates.length = count;
    }
    if (group.signalImages) {
      const count = Math.max(0, Math.min(9, Number(widget.signalCount) || 0));
      widget.signalImages ??= [];
      const signalFields = [
        { label: "Home-Assistant-Entität", key: "entityId" },
        { label: "Bedingung", key: "condition", type: "select", options: ["==", "!=", ">", ">=", "<", "<="] },
        { label: "Wert für die Bedingung", key: "value" },
        { label: "Bild (URL oder HA-Pfad)", key: "image", previewImage: true }, { label: "Kleines Symbol", key: "smallIcon", previewImage: true },
        { label: "Bildgröße in px", key: "imageSize", type: "range", min: 8, max: 128, step: 1 },
        { label: "CSS Bildstil", key: "imageStyle" }, { label: "Text oder Vorlage ({value})", key: "text" },
        { label: "CSS Textstil", key: "textStyle" }, { label: "Klassen", key: "className" },
        { label: "Blinken", key: "blink", type: "checkbox" },
        { label: "Horizontale Position (px)", key: "horizontal", type: "number" },
        { label: "Vertikale Position (px)", key: "vertical", type: "number" },
        { label: "Nicht im Editor zeigen", key: "hideInEditor", type: "checkbox" },
      ];
      for (let signalIndex = 0; signalIndex < count; signalIndex += 1) {
        const signal = widget.signalImages[signalIndex] ??= { condition: "==", value: "true", imageSize: 24, horizontal: 0, vertical: 0, blink: false, hideInEditor: false };
        const details = document.createElement("details"); details.className = "signal-section";
        const nestedKey = `widget:${widget.id}:${group.label}:signal:${signalIndex}`;
        details.open = state.expandedPropertySections.has(nestedKey);
        details.addEventListener("toggle", () => { if (details.open) state.expandedPropertySections.add(nestedKey); else state.expandedPropertySections.delete(nestedKey); });
        const summary = document.createElement("summary"); summary.textContent = `Signal [${signalIndex}]`; details.append(summary);
        const fields = document.createElement("div"); fields.className = "property-fields";
        fields.append(...signalFields.map((descriptor) => field({ ...descriptor, label: `${descriptor.label} [${signalIndex}]` }, signal)));
        details.append(fields); body.append(details);
      }
      widget.signalImages.length = count;
    }
    if (group.masterKey && !enabled.checked) {
      details.classList.add("is-disabled");
      for (const control of body.querySelectorAll("input, select, textarea, button")) control.disabled = true;
    }
    details.append(summary, body); panel.append(details);
  }
}

function render() {
  applyProjectCss();
  const page = currentPage();
  let exitTabs = $("#exit-tab-editor");
  if (!exitTabs) {
    exitTabs = document.createElement("button"); exitTabs.id = "exit-tab-editor"; exitTabs.type = "button";
    exitTabs.textContent = uiText("Zurück\nzum\nTabs-Widget"); exitTabs.className = "toolbar-tile";
    exitTabs.setAttribute("aria-label", uiText("Zurück zum Tabs-Widget"));
    exitTabs.onclick = () => { const owner = state.tabReturn?.ownerId || state.tabEditor?.ownerId; if (state.tabReturn) state.project.currentPageId = state.tabReturn.pageId; state.tabEditor = null; state.tabReturn = null; setSingleWidgetSelection(owner); render(); };
    $(".toolbar").prepend(exitTabs);
  }
  exitTabs.hidden = !(state.tabEditor || state.tabReturn) || runtimeMode;
  for (const id of ["preset", "page-width", "page-height"]) $("#" + id).disabled = Boolean(state.tabEditor);
  workspace.classList.toggle("runtime", runtimeMode);
  document.body.classList.toggle("runtime-mode", runtimeMode);
  document.body.classList.toggle("editor-mode", !runtimeMode);
  $("#editor-link").classList.toggle("active", !runtimeMode);
  $("#runtime-link").classList.toggle("active", runtimeMode);
  const projectQuery = `project=${encodeURIComponent(state.projectId)}`;
  $("#editor-link").href = `?mode=editor&${projectQuery}`;
  const tabQuery = state.tabEditor ? `&page=${encodeURIComponent(state.project.currentPageId)}&tabsWidget=${encodeURIComponent(state.tabEditor.ownerId)}&tabsIndex=${state.tabEditor.index}&embedded=1` : "";
  $("#runtime-link").href = `?mode=runtime&${projectQuery}${tabQuery}`;
  const runtimeTabUrl = new URL("runtime", document.baseURI);
  runtimeTabUrl.search = new URLSearchParams({ mode: "runtime", project: state.projectId, page: state.tabEditor ? state.project.currentPageId : page.id,
    ...(state.tabEditor ? { tabsWidget: state.tabEditor.ownerId, tabsIndex: state.tabEditor.index, embedded: "1" } : {}) }).toString();
  $("#runtime-tab-link").href = runtimeTabUrl.href;
  document.title = `${state.project.settings?.title || state.project.name} · HA Grafik Visual Studio`;
  const favicon = safeUrl(state.project.settings?.favicon || "", true);
  $("#project-favicon-link").href = favicon || "studio-icon.svg";
  document.body.style.overflow = runtimeMode ? (state.project.settings?.bodyOverflow || "auto") : "hidden";
  $("#active-page-name").textContent = page.name;
  $("#preset").value = page.page.preset || "custom";
  $("#page-width").value = page.page.width;
  $("#page-height").value = page.page.height;
  renderPalette(); renderPageMenu(); renderStage(); renderProperties(); renderWidgetFinder();
}

$("#widget-finder-toggle").addEventListener("click", (event) => { event.stopPropagation(); toggleWidgetSelector(); });
$("#widget-selector-menu").addEventListener("click", (event) => event.stopPropagation());
$("#widget-selector-all").addEventListener("change", (event) => {
  state.widgetSelectionDraft = event.target.checked ? new Set(currentPage().widgets.map(widget => widget.id)) : new Set();
  for (const check of document.querySelectorAll("#widget-selector-list input[type=checkbox]")) check.checked = event.target.checked;
  applyWidgetSelection(state.widgetSelectionDraft);
});
$("#widget-selector-select").addEventListener("click", () => { applyWidgetSelection(state.widgetSelectionDraft || new Set()); toggleWidgetSelector(false); });
$("#widget-selector-clear").addEventListener("click", () => { applyWidgetSelection(new Set()); toggleWidgetSelector(false); });
$("#widget-selector-copy").addEventListener("click", () => { applyWidgetSelection(state.widgetSelectionDraft || new Set()); copySelectedWidgets(false); });
$("#widget-selector-delete").addEventListener("click", () => { applyWidgetSelection(state.widgetSelectionDraft || new Set()); toggleWidgetSelector(false); void deleteSelectedWidget(); });
$("#widget-duplicate").addEventListener("click", duplicateSelectedWidget);
$("#widget-delete").addEventListener("click", deleteSelectedWidget);
$("#widget-cut").addEventListener("click", () => copySelectedWidgets(true));
$("#widget-copy").addEventListener("click", () => copySelectedWidgets(false));
$("#widget-paste").addEventListener("click", pasteWidgets);
$("#widget-undo").addEventListener("click", undoWidgetChange);
$("#widget-redo").addEventListener("click", redoWidgetChange);
$("#widget-filter-open").addEventListener("click", openWidgetFilterDialog);
$("#widget-filter-apply").addEventListener("click", applyWidgetEditorFilter);
$("#widget-filter-reset").addEventListener("click", () => { state.editorWidgetFilter = null; $("#widget-filter-open").setAttribute("aria-pressed", "false"); $("#widget-filter-dialog").close(); renderStage(); $("#status").textContent = "Widget-Filter aufgehoben"; });
$("#widget-layer-up").addEventListener("click", () => changeSelectedWidgetLayer(1));
$("#widget-layer-down").addEventListener("click", () => changeSelectedWidgetLayer(-1));
$("#widget-export").addEventListener("click", exportSelectedWidget);
$("#widget-import").addEventListener("click", () => $("#widget-import-file").click());
$("#widget-import-file").addEventListener("change", (event) => { if (event.target.files[0]) void importWidgets(event.target.files[0]); });
document.addEventListener("keydown", (event) => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey || ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
  if (event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redoWidgetChange(); else undoWidgetChange(); }
  if (event.key.toLowerCase() === "y") { event.preventDefault(); redoWidgetChange(); }
});
for (const button of document.querySelectorAll(".alignment-toolbar button")) {
  const action = button.dataset.align;
  if (!["width", "height"].includes(action)) { button.addEventListener("click", () => alignSelectedWidgets(action)); continue; }
  let longPressTimer = null; let longPressTriggered = false;
  const cancelTimer = () => { if (longPressTimer) clearTimeout(longPressTimer); longPressTimer = null; button.classList.remove("is-long-press"); };
  button.addEventListener("pointerdown", event => {
    if (event.button !== 0 || button.disabled) return;
    longPressTriggered = false;
    longPressTimer = setTimeout(() => { longPressTriggered = true; button.classList.add("is-long-press"); openAlignmentSizeDialog(action); }, 600);
  });
  button.addEventListener("pointerup", cancelTimer); button.addEventListener("pointercancel", cancelTimer); button.addEventListener("pointerleave", cancelTimer);
  button.addEventListener("click", event => {
    if (longPressTriggered) { event.preventDefault(); longPressTriggered = false; return; }
    alignSelectedWidgets(action);
  });
}

$("#preset").addEventListener("change", (event) => {
  const preset = event.target.value;
  const page = currentPage().page;
  Object.assign(page, { ...page, preset, ...(PRESETS[preset] || {}) });
  $("#page-width").value = page.width;
  $("#page-height").value = page.height;
  renderStage();
});
for (const [id, key, max] of [["page-width", "width", 7680], ["page-height", "height", 4320]]) {
  $("#" + id).addEventListener("change", (event) => {
    const page = currentPage().page;
    page.preset = "custom";
    page[key] = Math.max(240, Math.min(max, Number(event.target.value) || 240));
    $("#preset").value = "custom";
    renderStage();
  });
}
$("#save").addEventListener("click", async () => {
  await saveProject();
});
$("#pages-menu-toggle").addEventListener("click", () => togglePagesMenu());
$("#runtime-pages-menu-toggle").addEventListener("click", () => togglePagesMenu());
$("#pages-close").addEventListener("click", () => togglePagesMenu(false));
$("#page-add").addEventListener("click", addPage);
$("#palette-search").addEventListener("input", renderPalette);
$("#widgets-menu").addEventListener("click", () => {
  const panel = $("#palette-panel"); panel.hidden = !panel.hidden;
  $("#widgets-menu").setAttribute("aria-pressed", String(!panel.hidden));
});
const SETTINGS_TABS = ["general", "widgets", "tools"];

async function fetchWidgetPackages() {
  const response = await fetch("api/widget-packages", { cache: "no-store" });
  if (!response.ok) throw new Error("Widget-Pakete konnten nicht geladen werden.");
  return (await response.json()).packages;
}

async function loadWidgetPackages() {
  try {
    for (const manifest of await fetchWidgetPackages()) {
      registerWidgetSet({
        id: manifest.id, label: manifest.name,
        widgets: manifest.widgets.map(widget => ({
          ...widget, packageId: manifest.id, iconSvg: widget.iconData || "icons/text.svg", preview: { kind: "svg", lines: [] },
        })),
      });
    }
  } catch (error) { console.warn("Widget-Pakete:", error); }
}

async function renderWidgetPackageList() {
  const list = $("#widget-package-list");
  try {
    const packages = await fetchWidgetPackages();
    list.replaceChildren();
    if (!packages.length) {
      const empty = document.createElement("p"); empty.className = "settings-package-empty";
      empty.setAttribute("role", "listitem"); empty.textContent = uiText("Keine zusätzlichen Widget-Pakete installiert."); list.append(empty);
    }
    for (const manifest of packages) {
      const row = document.createElement("div"); row.className = "settings-package-row"; row.setAttribute("role", "listitem");
      if (manifest.iconData) { const image = document.createElement("img"); image.className = "settings-package-image"; image.src = manifest.iconData; image.alt = ""; row.append(image); }
      const info = document.createElement("div"); info.className = "settings-package-info";
      const name = document.createElement("div"); name.textContent = manifest.name;
      const meta = document.createElement("div"); meta.className = "settings-package-meta";
      meta.textContent = `${manifest.id} · ${manifest.version} · API ${manifest.apiVersion} · ${manifest.widgets.length} Widget(s) · ${manifest.license}`;
      info.append(name, meta);
      const reload = document.createElement("button"); reload.type = "button"; reload.title = uiText("Paketliste neu laden"); reload.setAttribute("aria-label", reload.title);
      const reloadIcon = document.createElement("img"); reloadIcon.src = "icons/refresh.svg"; reloadIcon.alt = ""; reload.append(reloadIcon);
      reload.addEventListener("click", () => { location.reload(); });
      const remove = document.createElement("button"); remove.type = "button"; remove.title = uiText("Paket entfernen"); remove.setAttribute("aria-label", `${remove.title}: ${manifest.name}`);
      const deleteIcon = document.createElement("img"); deleteIcon.src = "icons/delete.svg"; deleteIcon.alt = ""; remove.append(deleteIcon);
      remove.addEventListener("click", async () => {
        if (!window.confirm(uiText("Widget-Paket wirklich entfernen?"))) return;
        const response = await fetch(`api/widget-packages/${encodeURIComponent(manifest.id)}`, { method: "DELETE" });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) { $("#widget-package-message").textContent = result.error || uiText("Paket konnte nicht entfernt werden."); return; }
        location.reload();
      });
      row.append(info, reload, remove); list.append(row);
    }
  } catch (error) { $("#widget-package-message").textContent = error.message; }
}

async function fetchToolPackages() {
  const response = await fetch("api/tool-packages", { cache: "no-store" });
  if (!response.ok) throw new Error(uiText("Tool-Pakete konnten nicht geladen werden."));
  return (await response.json()).packages;
}

async function renderEditorToolActions(packages = null) {
  if (runtimeMode) return;
  const list = $("#editor-tool-list");
  try {
    const installed = packages ?? await fetchToolPackages();
    for (const button of list.querySelectorAll(".editor-tool-button")) button.remove();
    for (const manifest of installed) {
      for (const tool of manifest.tools) {
        const button = document.createElement("button"); button.type = "button"; button.className = "editor-tool-button";
        button.title = `${manifest.name}: ${tool.label}`;
        button.setAttribute("aria-label", `${uiText("Tool ausführen")}: ${tool.label}`);
        const icon = document.createElement("img"); icon.src = tool.iconData || manifest.iconData || "icons/check.svg"; icon.alt = "";
        button.append(icon);
        button.addEventListener("click", () => previewTool(tool));
        list.append(button);
      }
    }
  } catch (error) { console.warn("Tool-Pakete:", error); }
}

let pendingTool = null;
function previewTool(tool) {
  if (!runtimeMode && tool.context === "page" && tool.action?.kind === "color-picker") {
    $("#settings-dialog").close();
    void import("./color-picker.js").then(module => module.openColorPicker(tool.action.defaultColor)).catch(error => { $("#status").textContent = String(error.message); });
    return;
  }
  if (runtimeMode || !state.project || tool.context !== "page" || tool.action?.kind !== "set-page-background") return;
  pendingTool = tool;
  $("#settings-dialog").close();
  $("#tool-preview-title").textContent = tool.label;
  $("#tool-preview-description").textContent = tool.description;
  $("#tool-preview-color").value = tool.action.defaultColor;
  const updatePreview = () => {
    $("#tool-preview-change").textContent = `${uiText("Aktuelle Seite")}: ${currentPage().name} · ${currentPage().page.background || "#242729"} → ${$("#tool-preview-color").value}`;
  };
  updatePreview();
  $("#tool-preview-color").oninput = updatePreview;
  $("#tool-preview-dialog").showModal();
}

$("#tool-preview-apply").addEventListener("click", () => {
  if (!pendingTool || runtimeMode || !state.project) return;
  const color = $("#tool-preview-color").value;
  if (!/^#[0-9a-f]{6}$/i.test(color)) return;
  if (currentPage().page.background !== color) {
    recordHistorySnapshot();
    currentPage().page.background = color;
    render();
    $("#status").textContent = uiText("Seitenhintergrund geändert. Rückgängig ist möglich.");
  }
  $("#tool-preview-dialog").close();
  pendingTool = null;
});
$("#tool-preview-dialog").addEventListener("close", () => { pendingTool = null; });

async function renderToolPackageList() {
  const list = $("#tool-package-list");
  try {
    const packages = await fetchToolPackages();
    void renderEditorToolActions(packages);
    list.replaceChildren();
    if (!packages.length) {
      const empty = document.createElement("p"); empty.className = "settings-package-empty";
      empty.setAttribute("role", "listitem"); empty.textContent = uiText("Keine zusätzlichen Tool-Pakete installiert."); list.append(empty);
    }
    for (const manifest of packages) {
      const row = document.createElement("div"); row.className = "settings-package-row"; row.setAttribute("role", "listitem");
      if (manifest.iconData) { const image = document.createElement("img"); image.className = "settings-package-image"; image.src = manifest.iconData; image.alt = ""; row.append(image); }
      const info = document.createElement("div"); info.className = "settings-package-info";
      const name = document.createElement("div"); name.textContent = manifest.name;
      const meta = document.createElement("div"); meta.className = "settings-package-meta";
      meta.textContent = `${manifest.id} · ${manifest.version} · API ${manifest.apiVersion} · ${manifest.license}`;
      info.append(name, meta);
      const reload = document.createElement("button"); reload.type = "button"; reload.title = uiText("Paketliste neu laden"); reload.setAttribute("aria-label", reload.title);
      const reloadIcon = document.createElement("img"); reloadIcon.src = "icons/refresh.svg"; reloadIcon.alt = ""; reload.append(reloadIcon);
      reload.addEventListener("click", () => void renderToolPackageList());
      const remove = document.createElement("button"); remove.type = "button"; remove.title = uiText("Paket entfernen"); remove.setAttribute("aria-label", `${remove.title}: ${manifest.name}`);
      const deleteIcon = document.createElement("img"); deleteIcon.src = "icons/delete.svg"; deleteIcon.alt = ""; remove.append(deleteIcon);
      remove.addEventListener("click", async () => {
        if (!window.confirm(uiText("Tool-Paket wirklich entfernen?"))) return;
        const response = await fetch(`api/tool-packages/${encodeURIComponent(manifest.id)}`, { method: "DELETE" });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) { $("#tool-package-message").textContent = result.error || uiText("Tool-Paket konnte nicht entfernt werden."); return; }
        void renderToolPackageList();
      });
      const tools = document.createElement("div"); tools.className = "settings-tool-list";
      for (const tool of manifest.tools) {
        const item = document.createElement("div"); item.className = "settings-tool-row";
        if (tool.iconData) { const image = document.createElement("img"); image.className = "settings-tool-image"; image.src = tool.iconData; image.alt = ""; item.append(image); }
        const description = document.createElement("span"); description.textContent = `${tool.label} · ${tool.description}`;
        const run = document.createElement("button"); run.type = "button"; run.title = uiText("Tool ausführen"); run.setAttribute("aria-label", `${run.title}: ${tool.label}`);
        const icon = document.createElement("img"); icon.src = "icons/check.svg"; icon.alt = ""; run.append(icon);
        run.addEventListener("click", () => previewTool(tool));
        item.append(description, run); tools.append(item);
      }
      const entry = document.createElement("div"); entry.className = "settings-package-entry"; entry.setAttribute("role", "listitem");
      row.removeAttribute("role"); row.append(info, reload, remove); entry.append(row, tools); list.append(entry);
    }
  } catch (error) { $("#tool-package-message").textContent = error.message; }
}

function showSettingsTab(tabId) {
  const selected = SETTINGS_TABS.includes(tabId) ? tabId : "general";
  for (const id of SETTINGS_TABS) {
    const active = id === selected;
    const tab = $(`#settings-tab-${id}`);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    $(`#settings-panel-${id}`).hidden = !active;
  }
  $("#settings-general-actions").hidden = selected !== "general";
  $("#settings-extension-actions").hidden = selected === "general";
  if (selected === "widgets") void renderWidgetPackageList();
  if (selected === "tools") void renderToolPackageList();
}

function openSettingsDialog() {
  if (!state.project) { $("#status").textContent = "Projekt wird noch geladen …"; return; }
  const settings = state.project.settings ??= {};
  $("#settings-auto-save").checked = settings.autoSave !== false;
  $("#settings-auto-save-delay").value = settings.autoSaveDelaySeconds ?? 5;
  $("#settings-auto-save-delay").disabled = settings.autoSave === false;
  $("#settings-language").value = getLanguagePreference();
  $("#settings-dock-color").value = /^#[0-9a-f]{6}$/i.test(settings.dockColor || "") ? settings.dockColor : "#ffd54f";
  $("#settings-reload").value = settings.reloadMode || "reload";
  $("#settings-dark-reconnect").checked = Boolean(settings.darkReconnect);
  $("#settings-debounce").value = settings.debounceMs ?? 200;
  $("#settings-instance").value = settings.browserInstanceId || createRandomId().slice(0, 8);
  $("#settings-public").checked = Boolean(settings.public);
  $("#project-title").value = settings.title || state.project.name || "";
  $("#project-favicon").value = settings.favicon || "";
  $("#settings-ignore-unloaded").checked = settings.ignoreUnloaded !== false;
  $("#settings-overflow").value = settings.bodyOverflow || "auto";
  showSettingsTab("general");
  const dialog = $("#settings-dialog");
  if (!dialog.open) dialog.showModal();
}
$("#settings-menu").addEventListener("click", openSettingsDialog);
$("#editor-tools-manage").addEventListener("click", () => { openSettingsDialog(); showSettingsTab("tools"); });
$("#widget-package-local").addEventListener("click", () => $("#widget-package-file").click());
$("#widget-package-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const message = $("#widget-package-message");
  if (![".wg", ".wg.zip"].some(suffix => file.name.toLowerCase().endsWith(suffix))) { message.textContent = uiText("Widget-Paket muss auf .wg oder .wg.zip enden."); return; }
  message.textContent = uiText("Widget-Paket wird geprüft …");
  try {
    const response = await fetch("api/widget-packages", { method: "POST", headers: { "Content-Type": "application/zip", "X-Package-Name": file.name }, body: file });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { message.textContent = result.error || uiText("Widget-Paket konnte nicht installiert werden."); return; }
    location.reload();
  } catch { message.textContent = uiText("Widget-Paket konnte nicht installiert werden."); }
  finally { event.target.value = ""; }
});
$("#tool-package-local").addEventListener("click", () => $("#tool-package-file").click());
$("#tool-package-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const message = $("#tool-package-message");
  if (![".tp", ".tp.zip"].some(suffix => file.name.toLowerCase().endsWith(suffix))) { message.textContent = uiText("Tool-Paket muss auf .tp oder .tp.zip enden."); return; }
  message.textContent = uiText("Tool-Paket wird geprüft …");
  try {
    const response = await fetch("api/tool-packages", { method: "POST", headers: { "Content-Type": "application/zip", "X-Package-Name": file.name }, body: file });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { message.textContent = result.error || uiText("Tool-Paket konnte nicht installiert werden."); return; }
    message.textContent = uiText("Tool-Paket installiert.");
    await renderToolPackageList();
  } catch { message.textContent = uiText("Tool-Paket konnte nicht installiert werden."); }
  finally { event.target.value = ""; }
});
$("#settings-close").addEventListener("click", () => $("#settings-dialog").close());
$("#settings-form .settings-tabs").addEventListener("click", (event) => {
  const tab = event.target.closest("[data-settings-tab]");
  if (tab) showSettingsTab(tab.dataset.settingsTab);
});
$("#settings-form .settings-tabs").addEventListener("keydown", (event) => {
  const index = SETTINGS_TABS.indexOf(event.target.dataset.settingsTab);
  if (index < 0 || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const next = event.key === "Home" ? 0 : event.key === "End" ? SETTINGS_TABS.length - 1
    : (index + (event.key === "ArrowRight" ? 1 : -1) + SETTINGS_TABS.length) % SETTINGS_TABS.length;
  showSettingsTab(SETTINGS_TABS[next]);
  $(`#settings-tab-${SETTINGS_TABS[next]}`).focus();
});
$("#project-favicon-browse").addEventListener("click", () => {
  activeIconInput = $("#project-favicon");
  openObjects();
});
$("#settings-instance-new").addEventListener("click", () => { $("#settings-instance").value = createRandomId().slice(0, 8); });
$("#settings-auto-save").addEventListener("change", () => {
  $("#settings-auto-save-delay").disabled = !$("#settings-auto-save").checked;
});
$("#settings-save").addEventListener("click", async (event) => {
  event.preventDefault();
  state.project.settings ??= {};
  Object.assign(state.project.settings, {
    autoSave: $("#settings-auto-save").checked,
    autoSaveDelaySeconds: Math.max(1, Math.min(300, Math.round(Number($("#settings-auto-save-delay").value) || 5))),
    dockColor: /^#[0-9a-f]{6}$/i.test($("#settings-dock-color").value) ? $("#settings-dock-color").value : "#ffd54f",
    reloadMode: $("#settings-reload").value,
    darkReconnect: $("#settings-dark-reconnect").checked,
    debounceMs: Math.max(0, Math.min(10000, Number($("#settings-debounce").value) || 0)),
    browserInstanceId: $("#settings-instance").value.trim(),
    public: $("#settings-public").checked,
    ignoreUnloaded: $("#settings-ignore-unloaded").checked,
    bodyOverflow: $("#settings-overflow").value,
  });
  state.project.settings.title = $("#project-title").value.trim();
  state.project.settings.favicon = $("#project-favicon").value.trim();
  if (await saveProject()) { setLanguagePreference($("#settings-language").value); $("#settings-dialog").close(); render(); $("#status").textContent = "Projekteinstellungen gespeichert"; }
});
$("#files-menu").addEventListener("click", () => openObjects());
$("#entities-menu").addEventListener("click", () => openEntities());
$("#entities-close").addEventListener("click", closeEntities);
$("#entities-dialog").addEventListener("close", () => {
  activeEntityInput = null;
  window.clearTimeout(state.entityRequestTimeout);
  state.entityController?.abort();
  state.entityController = null;
});
$("#entities-reload").addEventListener("click", () => { void loadEntities(); });
$("#entities-search").addEventListener("input", renderEntities);
$("#entities-copy").addEventListener("click", async () => {
  if (!state.selectedEntityId) return;
  try {
    await navigator.clipboard.writeText(state.selectedEntityId);
    $("#entities-status").textContent = `${state.selectedEntityId} in die Zwischenablage kopiert`;
  } catch { $("#entities-status").textContent = "Zwischenablage nicht verfügbar"; }
});
$("#entities-insert").addEventListener("click", () => {
  if (!activeEntityInput || !state.selectedEntityId) return;
  activeEntityInput.value = state.selectedEntityId;
  activeEntityInput.dispatchEvent(new Event("input", { bubbles: true }));
  closeEntities();
});
$("#objects-close").addEventListener("click", cancelFileSelection);
$("#files-cancel").addEventListener("click", cancelFileSelection);
$("#files-upload").addEventListener("click", () => {
  $("#files-upload-input").accept = fileAccept($("#files-type-filter").value);
  $("#files-upload-input").click();
});
$("#files-upload-input").addEventListener("change", (event) => { void uploadFiles(event.target.files); });
$("#files-type-filter").addEventListener("change", () => { state.selectedFiles = []; void renderObjects(); });
renderObjects.request = 0;
let fileSearchTimer;
$("#files-search").addEventListener("input", () => {
  clearTimeout(fileSearchTimer); ++renderObjects.request;
  state.selectedFiles = []; renderFileSelection();
  fileSearchTimer = setTimeout(() => void renderObjects(), 200);
});
$("#files-reload").addEventListener("click", () => { void renderObjects(); });
$("#files-view-toggle").addEventListener("click", () => {
  state.fileView = state.fileView === "list" ? "grid" : "list";
  const grid = state.fileView === "grid";
  const button = $("#files-view-toggle");
  button.querySelector("img").src = grid ? "icons/view-list.svg" : "icons/view-grid.svg";
  button.title = grid ? "Listenansicht anzeigen" : "Kachelansicht anzeigen";
  button.setAttribute("aria-label", button.title);
  void renderObjects();
});
$("#files-folder").addEventListener("click", async () => {
  const name = window.prompt(uiText("Name des neuen Ordners"));
  if (!name?.trim()) return;
  const path = [state.objectPath, name.trim()].filter(Boolean).join("/");
  const response = await fetch("api/files/folder?path=" + encodeURIComponent(path), { method: "POST" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) { $("#status").textContent = result.error || "Ordner konnte nicht erstellt werden"; return; }
  $("#status").textContent = `Ordner ${name.trim()} erstellt`;
  await renderObjects();
});
$("#files-copy").addEventListener("click", async () => {
  const paths = state.selectedFiles.map((path) => "/local/studio/" + path);
  try {
    await navigator.clipboard.writeText(paths.join("\n"));
    $("#status").textContent = paths.length + " Pfad(e) in die Zwischenablage kopiert";
  } catch {
    $("#status").textContent = "Zwischenablage nicht verfügbar";
  }
});
$("#files-apply").addEventListener("click", () => {
  if (!activeIconInput || state.selectedFiles.length !== 1) return;
  activeIconInput.value = "/local/studio/" + state.selectedFiles[0];
  activeIconInput.dispatchEvent(new Event("input", { bubbles: true }));
  $("#objects-dialog").close();
  if ($("#icon-picker").open) $("#icon-picker").close();
  activeIconInput.focus(); activeIconInput = null; state.selectedFiles = [];
});
$("#projects-menu").addEventListener("click", () => { $("#projects-dialog").showModal(); void renderProjects(); });
$("#projects-close").addEventListener("click", () => $("#projects-dialog").close());
$("#project-create").addEventListener("click", async () => {
  const name = window.prompt(uiText("Name des neuen Projekts"), uiText("Neues Projekt")); if (!name?.trim()) return;
  const response = await fetch("api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
  if (response.ok) { const project = await response.json(); location.href = `?mode=editor&project=${encodeURIComponent(project.id)}`; }
});
document.querySelectorAll(".collapse").forEach((button) => button.addEventListener("click", () => {
  const panel = document.getElementById(button.dataset.target);
  panel.classList.toggle("collapsed");
  const collapsed = panel.classList.contains("collapsed");
  const isPalette = panel.classList.contains("palette");
  workspace.style.setProperty(isPalette ? "--left-panel-width" : "--right-panel-width", collapsed ? "34px" : isPalette ? "225px" : "260px");
  panel.querySelector(".panel-content").hidden = collapsed;
  button.textContent = collapsed ? (isPalette ? "›" : "‹") : (isPalette ? "‹" : "›");
}));

loadWidgetPackages().finally(loadProject);
