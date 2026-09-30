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
    state.project = { schemaVersion: 1, name: "Mein Zuhause", page: { preset: "desktop", ...PRESETS.desktop, background: "#242729" }, widgets: [] };
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

function addWidget(definition) {
  const id = `widget-${state.nextId++}`;
  const index = state.project.widgets.length;
  state.project.widgets.push({
    id, type: definition.type,
    x: 24 + (index % 4) * 150, y: 24 + Math.floor(index / 4) * 90, width: 140, height: 62, radius: 8, visible: true,
    fontSize: 13, fontWeight: "400", textAlign: "left", textColor: "#e7ecee", backgroundColor: "",
    borderColor: "#626c70", borderWidth: 1, borderStyle: "solid", padding: 8, shadow: false, opacity: 1,
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
  stage.replaceChildren();
  for (const widget of state.project.widgets) {
    if (widget.visible === false) continue;
    const element = document.createElement("div");
    element.className = `widget${widget.type === "text" ? " widget-text" : ""}${widget.id === state.selectedId ? " selected" : ""}`;
    if (widget.cssClass) {
      const safeClasses = String(widget.cssClass).split(/\s+/).filter((name) => /^[A-Za-z_][\w-]*$/.test(name));
      element.classList.add(...safeClasses);
    }
    Object.assign(element.style, {
      left: `${widget.x}px`, top: `${widget.y}px`, width: `${widget.width}px`, height: `${widget.height}px`,
      borderRadius: `${widget.radius}px`, color: widget.textColor || widget.color || "",
      backgroundColor: widget.backgroundColor || "", borderColor: widget.borderColor || "",
      borderWidth: `${widget.borderWidth ?? 1}px`, fontSize: `${widget.fontSize ?? 13}px`,
      fontWeight: widget.fontWeight || "400", textAlign: widget.textAlign || "left",
      padding: `${widget.padding ?? 8}px`, opacity: `${widget.opacity ?? 1}`,
    });
    if (widget.shadow) element.style.boxShadow = "0 2px 8px #0006";
    else element.style.removeProperty("box-shadow");
    if (widget.borderStyle) element.style.borderStyle = widget.borderStyle;
    else element.style.removeProperty("border-style");
    if (widget.type === "text") {
      element.textContent = widget.textContent ?? widget.state ?? "";
      element.style.whiteSpace = widget.whiteSpace || "pre-wrap";
      element.style.alignItems = "flex-start";
      element.style.justifyContent = "flex-start";
      element.addEventListener("click", () => { if (!runtimeMode) { state.selectedId = widget.id; render(); } });
      if (!runtimeMode) makeDraggable(element, widget);
      stage.append(element);
      continue;
    }
    const glyph = document.createElement("span"); glyph.className = "glyph"; glyph.textContent = widget.icon || "●";
    const copy = document.createElement("span");
    const title = document.createElement("strong"); title.textContent = widget.title || widget.type;
    const value = document.createElement("span"); value.className = "value";
    let displayValue = widget.state ?? "--";
    if (widget.type === "sensor" && Number.isFinite(Number(displayValue))) {
      const scaled = Number(displayValue) * Number(widget.factor ?? 1);
      displayValue = scaled.toFixed(Number(widget.digits ?? 1));
      if (widget.decimalComma) displayValue = displayValue.replace(".", ",");
    }
    value.textContent = `${widget.entityId ? `${widget.entityId} · ` : ""}${widget.prefix || ""}${displayValue}${widget.unit || ""}`;
    copy.append(title, document.createElement("br"), value);
    element.append(glyph, copy);
    element.addEventListener("click", () => { if (!runtimeMode) { state.selectedId = widget.id; render(); } });
    if (!runtimeMode) makeDraggable(element, widget);
    stage.append(element);
  }
}

function makeDraggable(element, widget) {
  let origin;
  element.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
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

function field(descriptor, widget) {
  const wrapper = document.createElement("label"); wrapper.textContent = descriptor.label;
  let input;
  if (descriptor.type === "textarea") input = document.createElement("textarea");
  else if (descriptor.type === "select") {
    input = document.createElement("select");
    for (const optionValue of descriptor.options || []) {
      const option = document.createElement("option"); option.value = optionValue; option.textContent = optionValue; input.append(option);
    }
  } else { input = document.createElement("input"); input.type = descriptor.type || "text"; }
  if (input.type === "checkbox") input.checked = widget[descriptor.key] !== false;
  else input.value = widget[descriptor.key] ?? (descriptor.type === "color" ? "#29c8b5" : descriptor.type === "select" ? descriptor.options?.[0] || "" : "");
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
  if (!widget && state.propertyTab !== "view") { const empty = document.createElement("p"); empty.className = "empty"; empty.textContent = "Wähle ein Widget aus, um seine Eigenschaften zu bearbeiten."; panel.append(empty); return; }
  if (state.propertyTab === "view") { const empty = document.createElement("p"); empty.className = "empty"; empty.textContent = "Seiteneigenschaften werden ergänzt."; panel.append(empty); return; }
  if (state.propertyTab === "scripts") { const empty = document.createElement("p"); empty.className = "empty"; empty.textContent = "Widget-Skripte werden in einem späteren Ausbauschritt ergänzt."; panel.append(empty); return; }
  const groups = getWidgetDefinition(widget.type).propertyGroups.filter((group) => state.propertyTab === "css" ? group.css === true : group.css !== true);
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
