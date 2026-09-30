import { getWidgetSets, getWidgetDefinition } from "./widget-registry.js";
import "./widget-sets/core.js";

const PRESETS = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 1280, height: 800 },
  phone: { width: 390, height: 844 },
  custom: { width: 1600, height: 900 },
};

const $ = (selector) => document.querySelector(selector);
const params = new URLSearchParams(location.search);
const runtimeMode = location.pathname.endsWith("/runtime") || params.get("mode") === "runtime";
const workspace = $("#workspace");
const stage = $("#stage");
const state = { project: null, selectedId: null, nextId: 1, propertyTab: "widget" };

async function loadProject() {
  try {
    const response = await fetch("api/project");
    if (!response.ok) throw new Error("Projekt konnte nicht geladen werden");
    state.project = await response.json();
  } catch {
    state.project = { schemaVersion: 1, name: "Mein Zuhause", page: { preset: "desktop", ...PRESETS.desktop, background: "#242729", backgroundMode: "tile" }, widgets: [] };
  }
  state.nextId = Math.max(0, ...state.project.widgets.map((widget) => Number(widget.id.replace(/\D/g, "")) || 0)) + 1;
  render();
}

function renderPalette() {
  const palette = $("#palette");
  palette.replaceChildren();
  for (const set of getWidgetSets()) {
    const group = document.createElement("details");
    group.className = "widget-group";
    group.open = true;
    const summary = document.createElement("summary");
    summary.textContent = set.label;
    const list = document.createElement("div");
    list.className = "widget-list";
    for (const definition of set.widgets) {
      const button = document.createElement("button");
      button.className = "widget-choice";
      button.textContent = `${definition.icon}  ${definition.label}`;
      button.addEventListener("click", () => addWidget(definition));
      list.append(button);
    }
    group.append(summary, list);
    palette.append(group);
  }
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

function addWidget(definition) {
  const id = `widget-${state.nextId++}`;
  const index = state.project.widgets.length;
  state.project.widgets.push({
    id, type: definition.type,
    x: 24 + (index % 4) * 150, y: 24 + Math.floor(index / 4) * 90, width: 140, height: 62, radius: 8, visible: true, layer: 0,
    fontSize: 13, fontWeight: "400", textAlign: "left", textColor: "#e7ecee", backgroundColor: "",
    borderColor: "#626c70", borderWidth: 0, borderStyle: "none", padding: 0, shadow: false, opacity: 1,
    ...structuredClone(definition.defaults),
  });
  state.selectedId = id;
  render();
}

function renderStage() {
  const page = state.project.page;
  stage.style.width = `${page.width}px`;
  stage.style.height = `${page.height}px`;
  stage.style.backgroundColor = page.background || "#242729";
  const backgroundImage = String(page.backgroundImage || "").trim();
  stage.style.backgroundImage = backgroundImage ? `url(${JSON.stringify(backgroundImage)})` : "none";
  stage.style.backgroundRepeat = page.backgroundMode === "tile" ? "repeat" : "no-repeat";
  stage.style.backgroundPosition = page.backgroundMode === "center" ? "center center" : "0 0";
  stage.style.backgroundSize = page.backgroundMode === "stretch" ? "100% 100%" : "auto";
  stage.replaceChildren();
  for (const widget of state.project.widgets) {
    if (widget.visible === false) continue;
    const element = document.createElement("div");
    element.id = widget.id;
    element.dataset.widgetId = widget.id;
    const selected = !runtimeMode && widget.id === state.selectedId;
    element.className = `widget widget-${widget.type}${selected ? " selected" : ""}`;
    if (widget.cssClass) {
      const safeClasses = String(widget.cssClass).split(/\s+/).filter((name) => /^[A-Za-z_][\w-]*$/.test(name));
      element.classList.add(...safeClasses);
    }
    Object.assign(element.style, { left: `${widget.x}px`, top: `${widget.y}px`, width: `${widget.width}px`, height: `${widget.height}px`, zIndex: String(Math.max(0, Number(widget.layer) || 0) + 2) });
    const content = document.createElement("div");
    content.className = "widget-content";
    Object.assign(content.style, {
      borderRadius: `${widget.radius}px`, color: widget.textColor || widget.color || "",
      backgroundColor: widget.backgroundColor || "", borderColor: widget.borderColor || "",
      borderWidth: `${widget.borderWidth ?? 1}px`, fontSize: `${widget.fontSize ?? 13}px`,
      fontWeight: widget.fontWeight || "400", textAlign: widget.textAlign || "left",
      padding: `${widget.padding ?? 0}px`, opacity: `${widget.opacity ?? 1}`,
      boxShadow: widget.shadow ? "0 2px 8px #0006" : "none",
      borderStyle: widget.borderStyle || "none",
    });
    if (widget.type === "text") {
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
      const button = document.createElement("button");
      button.type = "button"; button.textContent = widget.title || "Schaltfläche";
      button.style.cssText = "font:inherit;color:inherit;background:transparent;border:1px solid currentColor;border-radius:inherit;padding:4px 8px";
      content.append(button);
    } else if (widget.type === "toggle") {
      const label = document.createElement("label"); label.className = "widget-toggle";
      const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.checked = widget.state === true || widget.state === "true" || widget.state === "on";
      checkbox.tabIndex = runtimeMode ? 0 : -1;
      checkbox.setAttribute("aria-label", widget.title || "Schalter"); checkbox.dataset.state = checkbox.checked ? "on" : "off";
      checkbox.addEventListener("change", () => { widget.state = checkbox.checked ? "on" : "off"; checkbox.dataset.state = widget.state; });
      const caption = document.createElement("span"); caption.textContent = widget.title || "Schalter";
      const track = document.createElement("span"); track.className = "switch-track"; track.setAttribute("aria-hidden", "true");
      label.append(checkbox, track, caption); content.append(label);
    } else if (widget.type === "checkbox") {
      const label = document.createElement("label"); label.className = "widget-checkbox";
      const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.checked = widget.state === true || widget.state === "true" || widget.state === "on";
      checkbox.tabIndex = runtimeMode ? 0 : -1;
      const caption = document.createElement("span"); caption.textContent = widget.title || "Checkbox";
      label.append(checkbox, caption); content.append(label);
    } else if (widget.type === "bulb") {
      const isOn = widget.state === true || widget.state === "true" || widget.state === "on";
      const iconUrl = isOn ? widget.icon_on : widget.icon_off;
      if (iconUrl) {
        const image = document.createElement("img"); image.className = "bulb-image"; image.src = iconUrl;
        image.alt = `${widget.title || "Lampe"}: ${isOn ? "ein" : "aus"}`; content.append(image);
      } else {
      const svgNS = "http://www.w3.org/2000/svg";
      const bulb = document.createElementNS(svgNS, "svg"); bulb.setAttribute("viewBox", "0 0 64 64"); bulb.setAttribute("role", "img");
      bulb.setAttribute("aria-label", `${widget.title || "Lampe"}: ${isOn ? "ein" : "aus"}`);
      bulb.classList.add("bulb-symbol", isOn ? "is-on" : "is-off");
      const glass = document.createElementNS(svgNS, "path"); glass.setAttribute("d", "M20 25a12 12 0 1 1 24 0c0 5-3 8-6 12l-1 5H27l-1-5c-3-4-6-7-6-12Z");
      const base = document.createElementNS(svgNS, "path"); base.setAttribute("d", "M27 46h10m-9 5h8m-6 5h4");
      bulb.append(glass, base); content.append(bulb);
      }
      if (widget.title) { const caption = document.createElement("span"); caption.className = "bulb-title"; caption.textContent = widget.title; content.append(caption); }
    } else if (widget.type === "slider") {
      const range = document.createElement("input"); range.type = "range";
      range.min = String(widget.min ?? 0); range.max = String(widget.max ?? 100); range.value = String(widget.value ?? 50);
      range.setAttribute("aria-label", widget.title || "Regler"); content.append(range);
    } else if (widget.type === "image") {
      if (widget.imageSrc) { const image = document.createElement("img"); image.src = widget.imageSrc; image.alt = widget.title || "Bild"; content.append(image); }
      else { content.textContent = widget.title || "Bild"; content.classList.add("image-placeholder"); }
    } else {
      const title = document.createElement("span"); title.className = "widget-title"; title.textContent = widget.title || widget.type;
      const value = document.createElement("span"); value.className = "value";
    let displayValue = widget.state ?? "--";
    if (widget.type === "sensor" && Number.isFinite(Number(displayValue))) {
      const scaled = Number(displayValue) * Number(widget.factor ?? 1);
      displayValue = scaled.toFixed(Number(widget.digits ?? 1));
      if (widget.decimalComma) displayValue = displayValue.replace(".", ",");
    }
    value.textContent = `${widget.entityId ? `${widget.entityId} · ` : ""}${widget.prefix || ""}${displayValue}${widget.unit || ""}`;
      content.append(title, value);
      if (widget.type === "gauge") content.classList.add("widget-gauge");
    }
    element.append(content);
    if (selected) {
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
    element.addEventListener("click", () => { if (!runtimeMode) { state.selectedId = widget.id; render(); } });
    if (!runtimeMode) makeDraggable(element, widget);
    stage.append(element);
  }
}

function makeDraggable(element, widget) {
  let origin;
  element.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (event.target.closest(".resize-handle")) return;
    origin = { x: event.clientX, y: event.clientY, left: widget.x, top: widget.y };
    element.setPointerCapture(event.pointerId);
  });
  element.addEventListener("pointermove", (event) => {
    if (!origin || !(event.buttons & 1)) return;
    const scale = stage.clientWidth / Number.parseFloat(stage.style.width);
    widget.x = Math.max(0, Math.round(origin.left + (event.clientX - origin.x) / scale));
    widget.y = Math.max(0, Math.round(origin.top + (event.clientY - origin.y) / scale));
    element.style.left = `${widget.x}px`; element.style.top = `${widget.y}px`;
  });
  element.addEventListener("pointerup", () => { origin = null; });
}

function makeResizable(element, handle, widget) {
  let origin;
  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    origin = { x: event.clientX, y: event.clientY, left: widget.x, top: widget.y, width: widget.width, height: widget.height };
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener("pointermove", (event) => {
    if (!origin || !(event.buttons & 1)) return;
    const scale = stage.clientWidth / Number.parseFloat(stage.style.width);
    const direction = handle.dataset.direction;
    const dx = (event.clientX - origin.x) / scale; const dy = (event.clientY - origin.y) / scale;
    if (direction.includes("e")) widget.width = Math.max(16, Math.round(origin.width + dx));
    if (direction.includes("s")) widget.height = Math.max(16, Math.round(origin.height + dy));
    if (direction.includes("w")) { widget.width = Math.max(16, Math.round(origin.width - dx)); widget.x = Math.max(0, Math.round(origin.left + origin.width - widget.width)); }
    if (direction.includes("n")) { widget.height = Math.max(16, Math.round(origin.height - dy)); widget.y = Math.max(0, Math.round(origin.top + origin.height - widget.height)); }
    element.style.left = `${widget.x}px`; element.style.top = `${widget.y}px`;
    element.style.width = `${widget.width}px`; element.style.height = `${widget.height}px`;
  });
  handle.addEventListener("pointerup", () => { origin = null; });
}

function field(descriptor, widget) {
  const wrapper = document.createElement("label"); wrapper.textContent = descriptor.label;
  let input;
  if (descriptor.type === "textarea") input = document.createElement("textarea");
  else if (descriptor.type === "select") {
    input = document.createElement("select");
    for (const item of descriptor.options || []) {
      const option = document.createElement("option"); option.value = typeof item === "string" ? item : item.value;
      option.textContent = typeof item === "string" ? item : item.label; input.append(option);
    }
  } else { input = document.createElement("input"); input.type = descriptor.type || "text"; }
  if (input.type === "checkbox") input.checked = widget[descriptor.key] !== false;
  else input.value = widget[descriptor.key] ?? (descriptor.type === "color" ? "#29c8b5" : descriptor.type === "select" ? (typeof descriptor.options?.[0] === "string" ? descriptor.options[0] : descriptor.options?.[0]?.value) || "" : "");
  if (descriptor.min !== undefined) input.min = descriptor.min;
  if (descriptor.max !== undefined) input.max = descriptor.max;
  if (descriptor.step !== undefined) input.step = descriptor.step;
  input.disabled = descriptor.disabled === true;
  input.addEventListener("input", () => { widget[descriptor.key] = input.type === "number" ? Number(input.value) : input.type === "checkbox" ? input.checked : input.value; renderStage(); });
  wrapper.append(input); return wrapper;
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
  const widget = state.project.widgets.find((item) => item.id === state.selectedId);
  if (!widget && !["view", "css"].includes(state.propertyTab)) { const empty = document.createElement("p"); empty.className = "empty"; empty.textContent = "Wähle ein Widget aus, um seine Eigenschaften zu bearbeiten."; panel.append(empty); return; }
  if (state.propertyTab === "view") {
    const heading = document.createElement("div"); heading.className = "selected-widget-heading"; heading.textContent = "Ansicht / Hintergrund"; panel.append(heading);
    const details = document.createElement("details"); details.className = "property-section"; details.open = true;
    const summary = document.createElement("summary"); summary.textContent = "Seiteneigenschaften";
    const body = document.createElement("div"); body.className = "property-fields";
    const descriptors = [
      { label: "Hintergrundfarbe", key: "background", type: "color" },
      { label: "Hintergrundbild (URL oder HA-Pfad)", key: "backgroundImage" },
      { label: "Darstellung", key: "backgroundMode", type: "select", options: [
        { value: "tile", label: "Kacheln" }, { value: "center", label: "Zentriert" }, { value: "stretch", label: "Stretch" },
      ] },
    ];
    body.append(...descriptors.map((descriptor) => field(descriptor, state.project.page)));
    details.append(summary, body); panel.append(details); return;
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
  const groups = getWidgetDefinition(widget.type).propertyGroups;
  const heading = document.createElement("div"); heading.className = "selected-widget-heading";
  heading.textContent = `${getWidgetDefinition(widget.type).label} · ${widget.id}`; panel.append(heading);
  for (const [index, group] of groups.entries()) {
    const details = document.createElement("details"); details.className = "property-section"; details.open = index === 0;
    const summary = document.createElement("summary"); summary.textContent = group.label;
    const body = document.createElement("div"); body.className = "property-fields";
    if (group.hint) { const hint = document.createElement("p"); hint.className = "property-hint"; hint.textContent = group.hint; body.append(hint); }
    body.append(...group.fields.map((descriptor) => field(descriptor, widget)));
    details.append(summary, body); panel.append(details);
  }
}

function render() {
  applyProjectCss();
  workspace.classList.toggle("runtime", runtimeMode);
  document.body.classList.toggle("runtime-mode", runtimeMode);
  $("#editor-link").classList.toggle("active", !runtimeMode);
  $("#runtime-link").classList.toggle("active", runtimeMode);
  $("#project-name").textContent = state.project.name || "Unbenanntes Projekt";
  $("#preset").value = state.project.page.preset || "custom";
  $("#custom-size").hidden = state.project.page.preset !== "custom";
  $("#page-width").value = state.project.page.width;
  $("#page-height").value = state.project.page.height;
  renderPalette(); renderStage(); renderProperties();
}

$("#preset").addEventListener("change", (event) => {
  const preset = event.target.value;
  state.project.page = { ...state.project.page, preset, ...(PRESETS[preset] || {}) };
  $("#custom-size").hidden = preset !== "custom";
  $("#page-width").value = state.project.page.width;
  $("#page-height").value = state.project.page.height;
  renderStage();
});
for (const [id, key, max] of [["page-width", "width", 7680], ["page-height", "height", 4320]]) {
  $("#" + id).addEventListener("change", (event) => {
    state.project.page.preset = "custom";
    state.project.page[key] = Math.max(240, Math.min(max, Number(event.target.value) || 240));
    $("#preset").value = "custom";
    $("#custom-size").hidden = false;
    renderStage();
  });
}
$("#save").addEventListener("click", async () => {
  const response = await fetch("api/project", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state.project) });
  $("#status").textContent = response.ok ? "Projekt lokal gespeichert" : "Speichern fehlgeschlagen";
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

loadProject();
