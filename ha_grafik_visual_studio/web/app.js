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
const state = { project: null, selectedId: null, nextId: 1 };

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
  state.project.widgets.push({ id, type: definition.type, ...structuredClone(definition.defaults), x: 24 + (index % 4) * 150, y: 24 + Math.floor(index / 4) * 90, width: 140, height: 62, radius: 8, visible: true });
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
    element.className = `widget${widget.id === state.selectedId ? " selected" : ""}`;
    element.style.cssText = `left:${widget.x}px;top:${widget.y}px;width:${widget.width}px;height:${widget.height}px;border-radius:${widget.radius}px${widget.color ? `;color:${widget.color}` : ""}`;
    const glyph = document.createElement("span"); glyph.className = "glyph"; glyph.textContent = widget.icon || "●";
    const copy = document.createElement("span");
    const title = document.createElement("strong"); title.textContent = widget.title || widget.type;
    const value = document.createElement("span"); value.className = "value"; value.textContent = `${widget.entityId || "Entity nicht verbunden"} · ${widget.state ?? "--"}${widget.unit || ""}`;
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
  const input = document.createElement("input"); input.type = descriptor.type || "text";
  if (input.type === "checkbox") input.checked = widget[descriptor.key] !== false;
  else input.value = widget[descriptor.key] ?? (input.type === "color" ? "#29c8b5" : "");
  input.addEventListener("input", () => { widget[descriptor.key] = input.type === "number" ? Number(input.value) : input.type === "checkbox" ? input.checked : input.value; renderStage(); });
  wrapper.append(input); return wrapper;
}

function renderProperties() {
  const panel = $("#properties"); panel.replaceChildren();
  const widget = state.project.widgets.find((item) => item.id === state.selectedId);
  if (!widget) { const empty = document.createElement("p"); empty.className = "empty"; empty.textContent = "Wähle ein Widget aus, um seine Eigenschaften zu bearbeiten."; panel.append(empty); return; }
  for (const group of getWidgetDefinition(widget.type).propertyGroups) {
    const details = document.createElement("details"); details.className = "property-section"; details.open = true;
    const summary = document.createElement("summary"); summary.textContent = group.label;
    const body = document.createElement("div"); body.className = "property-fields";
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
