import { getWidgetSets, getWidgetDefinition } from "./widget-registry.js";
import "./widget-sets/core.js";
import "./widget-sets/basic2.js";

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
const workspace = $("#workspace");
const stage = $("#stage");
const state = { project: null, projectId: params.get("project") || "main", selectedId: null, nextId: 1, propertyTab: "widget", objectPath: "", selectedFiles: [] };
let mdiIcons = null;
let mdiIconsPromise = null;
let activeIconInput = null;

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

function projectForSave(project) {
  const saved = structuredClone(project);
  for (const page of saved.pages || []) {
    page.page.enabledPropertyGroups ??= {};
    for (const [index, group] of VIEW_PROPERTY_GROUPS.entries()) {
      if (propertyGroupEnabled(page.page, group, index)) continue;
      for (const descriptor of group.fields) delete page.page[descriptor.key];
    }
    for (const widget of page.widgets || []) {
      const groups = getWidgetDefinition(widget.type).propertyGroups;
      widget.enabledPropertyGroups ??= {};
      for (const [index, group] of groups.entries()) {
        if (propertyGroupEnabled(widget, group, index)) continue;
        for (const descriptor of group.fields) delete widget[descriptor.key];
        if (group.signalImages) {
          delete widget.signalCount;
          delete widget.signalImages;
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
  });
  project.currentPageId = project.pages.some((page) => page.id === project.currentPageId) ? project.currentPageId : project.pages[0].id;
  project.schemaVersion = 2;
  delete project.page;
  delete project.widgets;
  return project;
}

function currentPage() {
  const selected = state.project.pages.find((page) => page.id === state.project.currentPageId);
  if (runtimeMode && selected && !selected.visible) {
    const visible = state.project.pages.find((page) => page.visible);
    if (visible) { state.project.currentPageId = visible.id; return visible; }
  }
  return selected || state.project.pages[0];
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
  state.project.settings ??= {};
  state.nextId = Math.max(0, ...state.project.pages.flatMap((page) => page.widgets).map((widget) => Number(widget.id.replace(/\D/g, "")) || 0)) + 1;
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
    select.addEventListener("click", () => { state.project.currentPageId = page.id; state.selectedId = null; render(); });
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
        const name = window.prompt("Name der Seite", page.name);
        if (name !== null && name.trim()) { page.name = name.trim(); render(); }
      });
      row.append(rename);
      const duplicate = document.createElement("button"); duplicate.type = "button"; duplicate.textContent = "▣"; duplicate.title = "Seite duplizieren"; duplicate.setAttribute("aria-label", `${page.name} duplizieren`);
      duplicate.addEventListener("click", () => duplicatePage(page)); row.append(duplicate);
      if (state.project.pages.length > 1) {
        const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "▤"; remove.title = "Seite löschen"; remove.setAttribute("aria-label", `${page.name} löschen`);
        remove.addEventListener("click", () => { if (window.confirm(`Seite „${page.name}“ löschen?`)) deletePage(page); }); row.append(remove);
      }
    }
    list.append(row);
  }
}

function renderWidgetFinder() {
  const select = $("#widget-finder");
  const page = currentPage();
  select.replaceChildren();
  const placeholder = document.createElement("option"); placeholder.value = "";
  placeholder.textContent = page.widgets.length ? "Widget suchen …" : "Keine Widgets auf dieser Seite";
  select.append(placeholder);
  for (const widget of page.widgets) {
    const option = document.createElement("option"); option.value = widget.id;
    const definition = getWidgetDefinition(widget.type);
    option.textContent = `${widget.title?.trim() || "Ohne Namen"} — ${definition.label} · ${widget.id}`;
    option.selected = widget.id === state.selectedId;
    select.append(option);
  }
  select.disabled = page.widgets.length === 0;
  $("#widget-duplicate").disabled = !state.selectedId;
  $("#widget-delete").disabled = !state.selectedId;
  $("#widget-layer-up").disabled = !state.selectedId;
  $("#widget-layer-down").disabled = !state.selectedId || Number(page.widgets.find((widget) => widget.id === state.selectedId)?.layer || 0) <= 0;
  $("#widget-export").disabled = !state.selectedId;
}

function openObjects(path = "") {
  state.objectPath = path;
  state.selectedFiles = [];
  const dialog = $("#objects-dialog");
  if (!dialog.open) dialog.showModal();
  void renderObjects();
}

function renderFileSelection() {
  const count = state.selectedFiles.length;
  $("#files-selection-count").textContent = count ? count + " Datei(en) ausgewählt" : "Keine Dateien ausgewählt";
  $("#files-copy").disabled = count === 0;
  $("#files-apply").disabled = !activeIconInput || count !== 1;
  $("#files-apply").title = count > 1 ? "Zum Übernehmen bitte genau eine Datei auswählen" : "Ausgewählte Datei ins Feld übernehmen";
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
  const breadcrumb = $("#objects-breadcrumb");
  browser.replaceChildren(); breadcrumb.replaceChildren();
  renderFileSelection();
  const parts = state.objectPath ? state.objectPath.split("/") : [];
  const root = document.createElement("button"); root.type = "button"; root.textContent = "www"; root.addEventListener("click", () => openObjects("")); breadcrumb.append(root);
  let path = "";
  for (const part of parts) {
    path = path ? `${path}/${part}` : part;
    const current = path; const crumb = document.createElement("button"); crumb.type = "button"; crumb.textContent = part; crumb.addEventListener("click", () => openObjects(current)); breadcrumb.append(" / ", crumb);
  }
  const response = await fetch(`api/objects?path=${encodeURIComponent(state.objectPath)}`);
  const data = response.ok ? await response.json() : { available: false, folders: [], files: [] };
  if (!data.available) { const hint = document.createElement("p"); hint.className = "empty"; hint.textContent = `Der HA-www-Ordner ist nicht verfügbar. Geprüfte Pfade: ${(data.checked || []).join(", ")}. Prüfe die schreibgeschützte Konfigurationseinbindung.`; browser.append(hint); return; }
  if (state.objectPath) {
    const up = document.createElement("button"); up.type = "button"; up.className = "object-folder"; up.textContent = "⬆ Übergeordneter Ordner";
    up.addEventListener("click", () => openObjects(parts.slice(0, -1).join("/"))); browser.append(up);
  }
  for (const folder of data.folders) {
    const button = document.createElement("button"); button.type = "button"; button.className = "object-folder"; button.textContent = `📁 ${folder.name}`;
    button.addEventListener("click", () => openObjects(folder.path)); browser.append(button);
  }
  for (const file of data.files) {
    const button = document.createElement("button"); button.type = "button"; button.className = "object-file"; button.title = file.path;
    const image = document.createElement("img"); image.src = file.url; image.alt = ""; image.loading = "lazy";
    const name = document.createElement("span"); name.textContent = file.name; button.append(image, name);
    button.setAttribute("aria-pressed", String(state.selectedFiles.includes(file.path)));
    button.addEventListener("click", () => {
      state.selectedFiles = state.selectedFiles.includes(file.path)
        ? state.selectedFiles.filter((path) => path !== file.path)
        : [...state.selectedFiles, file.path];
      button.setAttribute("aria-pressed", String(state.selectedFiles.includes(file.path)));
      renderFileSelection();
    }); browser.append(button);
  }
  if (!data.folders.length && !data.files.length) { const empty = document.createElement("p"); empty.className = "empty"; empty.textContent = "Dieser Ordner enthält keine unterstützten Bilder."; browser.append(empty); }
  renderFileSelection();
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
      const newName = window.prompt("Projektname", project.name); if (!newName?.trim()) return;
      await fetch(`api/projects/${encodeURIComponent(project.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName.trim() }) }); void renderProjects();
    }); row.append(rename);
    const duplicate = document.createElement("button"); duplicate.type = "button"; duplicate.textContent = "▣"; duplicate.title = "Projekt duplizieren"; duplicate.addEventListener("click", async () => {
      const newName = window.prompt("Name für die Projektkopie", `${project.name} (Kopie)`); if (!newName?.trim()) return;
      await fetch("api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName.trim(), source: project.id }) }); void renderProjects();
    }); row.append(duplicate);
    if (projects.length > 1) { const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "🗑"; remove.title = "Projekt löschen"; remove.addEventListener("click", async () => {
      if (!window.confirm(`Projekt „${project.name}“ löschen?`)) return;
      const result = await fetch(`api/projects/${encodeURIComponent(project.id)}`, { method: "DELETE" });
      if (result.ok && project.id === state.projectId) location.href = `?mode=editor&project=${encodeURIComponent(projects.find((item) => item.id !== project.id).id)}`;
      else void renderProjects();
    }); row.append(remove); }
    list.append(row);
  }
}

function focusWidget(widgetId) {
  const widget = currentPage().widgets.find((item) => item.id === widgetId);
  if (!widget) return;
  state.selectedId = widget.id;
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

function duplicateSelectedWidget() {
  const page = currentPage();
  const source = page.widgets.find((widget) => widget.id === state.selectedId);
  if (!source) return;
  const copy = structuredClone(source);
  copy.id = `widget-${state.nextId++}`;
  copy.x = Math.min(Math.max(0, currentPage().page.width - (copy.width || 140)), (copy.x || 0) + 20);
  copy.y = Math.min(Math.max(0, currentPage().page.height - (copy.height || 62)), (copy.y || 0) + 20);
  page.widgets.push(copy); state.selectedId = copy.id; render();
}

function deleteSelectedWidget() {
  const page = currentPage();
  if (!state.selectedId) return;
  page.widgets = page.widgets.filter((widget) => widget.id !== state.selectedId);
  state.selectedId = null; render();
}

function changeSelectedWidgetLayer(direction) {
  const widget = currentPage().widgets.find((item) => item.id === state.selectedId);
  if (!widget) return;
  const current = Math.max(0, Math.trunc(Number(widget.layer) || 0));
  widget.layer = Math.min(9999, Math.max(0, current + direction));
  widget.cssZIndex = "";
  renderStage(); renderProperties(); renderWidgetFinder();
  $("#status").textContent = `Widget ${widget.id}: Ebene ${widget.layer}`;
}

function exportSelectedWidget() {
  const widget = currentPage().widgets.find((item) => item.id === state.selectedId);
  if (!widget) return;
  const blob = new Blob([`${JSON.stringify({ schemaVersion: 1, widget }, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = `${widget.type}-${widget.id}.json`; link.click();
  URL.revokeObjectURL(url);
  $("#status").textContent = `Widget ${widget.id} exportiert`;
}

async function importWidgets(file) {
  try {
    const data = JSON.parse(await file.text());
    const incoming = Array.isArray(data) ? data : Array.isArray(data.widgets) ? data.widgets : [data.widget || data];
    const knownTypes = new Set(getWidgetSets().flatMap((set) => set.widgets.map((definition) => definition.type)));
    const widgets = incoming.filter((widget) => widget && typeof widget === "object" && knownTypes.has(widget.type));
    if (!widgets.length) throw new Error("Die Datei enthält keine unterstützten Widgets.");
    for (const source of widgets) {
      const widget = structuredClone(source);
      widget.id = `widget-${state.nextId++}`;
      widget.x = Math.max(0, Number(widget.x) || 0);
      widget.y = Math.max(0, Number(widget.y) || 0);
      widget.width = Math.max(16, Number(widget.width) || 140);
      widget.height = Math.max(16, Number(widget.height) || 62);
      widget.layer = Math.max(0, Math.min(9999, Math.trunc(Number(widget.layer) || 0)));
      currentPage().widgets.push(widget);
    }
    state.selectedId = currentPage().widgets.at(-widgets.length).id;
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
  state.project.pages.push(created); state.project.currentPageId = created.id; state.selectedId = null; render();
}

function duplicatePage(page) {
  const copy = structuredClone(page); copy.id = makePageId(); copy.name = `${page.name} (Kopie)`;
  for (const widget of copy.widgets) widget.id = `widget-${state.nextId++}`;
  state.project.pages.push(copy); state.project.currentPageId = copy.id; state.selectedId = null; render();
}

function deletePage(page) {
  state.project.pages = state.project.pages.filter((item) => item.id !== page.id);
  if (state.project.currentPageId === page.id) state.project.currentPageId = state.project.pages[0].id;
  state.selectedId = null; render();
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

const safeHtmlTags = new Set(["a", "b", "br", "caption", "code", "div", "em", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img", "li", "ol", "p", "small", "span", "strong", "sub", "sup", "table", "tbody", "td", "th", "thead", "tr", "u", "ul"]);
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
  const copyNode = (node, target) => {
    if (node.nodeType === Node.TEXT_NODE) { target.append(document.createTextNode(node.textContent)); return; }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName.toLowerCase();
    if (!safeHtmlTags.has(tag)) return;
    const safe = document.createElement(tag);
    for (const attribute of node.attributes) {
      const name = attribute.name.toLowerCase();
      if (["class", "title", "alt", "width", "height", "colspan", "rowspan", "role"].includes(name) || name.startsWith("aria-")) safe.setAttribute(name, attribute.value);
      if (name === "href" && tag === "a") {
        const url = safeUrl(attribute.value);
        if (url) { safe.setAttribute("href", url); safe.setAttribute("rel", "noopener noreferrer"); }
      }
      if (name === "src" && tag === "img") {
        const url = safeUrl(attribute.value, true);
        if (url) safe.setAttribute("src", url);
      }
    }
    for (const child of node.childNodes) copyNode(child, safe);
    target.append(safe);
  };
  for (const node of template.content.childNodes) copyNode(node, parent);
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
  const values = String(widget.valueList || "").split(/\r?\n|;/);
  const raw = Number(widget.state ?? widget.testIndex ?? 0);
  const index = Number.isFinite(raw) ? Math.trunc(raw) : 0;
  return { values, index, value: values[index] ?? "" };
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
  const id = `widget-${state.nextId++}`;
  const page = currentPage();
  const index = page.widgets.length;
  page.widgets.push({
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
  const activePage = currentPage();
  const page = activePage.page;
  stage.style.width = `${page.width}px`;
  stage.style.height = `${page.height}px`;
  stage.style.backgroundColor = page.background || "#242729";
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
  $("#runtime-pages-menu-toggle").hidden = page.navigationVisible === false;
  stage.replaceChildren();
  const activeFilter = state.activeFilter || "";
  for (const widget of activePage.widgets) {
    if (widget.visible === false) continue;
    const filterTags = String(widget.filterWord || "").split(/[;,]/).map((tag) => tag.trim()).filter(Boolean);
    if (widget.type !== "filter-dropdown" && activeFilter && filterTags.length && !filterTags.includes(activeFilter)) continue;
    const element = document.createElement("div");
    element.id = widget.id;
    element.dataset.widgetId = widget.id;
    const selected = !runtimeMode && widget.id === state.selectedId;
    element.className = `widget widget-${widget.type}${selected ? " selected" : ""}`;
    if (widget.cssClass) {
      const safeClasses = String(widget.cssClass).split(/\s+/).filter((name) => /^[A-Za-z_][\w-]*$/.test(name));
      element.classList.add(...safeClasses);
    }
    Object.assign(element.style, {
      position: widget.cssPosition || "absolute", display: widget.cssDisplay || "",
      left: widget.cssLeft || `${widget.x}px`, top: widget.cssTop || `${widget.y}px`,
      width: widget.cssWidth || `${widget.width}px`, height: widget.cssHeight || `${widget.height}px`,
      zIndex: widget.cssZIndex === undefined || widget.cssZIndex === "" ? String(Math.max(0, Number(widget.layer) || 0) + 2) : String(widget.cssZIndex),
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
    if (widget.type === "universal-button") {
      const visualStates = widget.visualStates || [];
      const matchingIndex = visualStates.findIndex((item) => matchesCondition(widget.state, item.condition || "==", item.value));
      const visualIndex = matchingIndex >= 0 ? matchingIndex : 0;
      const visual = visualStates[visualIndex] || {};
      content.classList.add("universal-widget-content");
      content.dataset.state = String(widget.state ?? "");
      content.style.display = "flex";
      content.style.flexDirection = widget.contentLayout === "horizontal" ? "row" : "column";
      content.style.justifyContent = widget.contentAlign === "start" ? "flex-start" : widget.contentAlign === "end" ? "flex-end" : "center";
      content.style.alignItems = widget.contentAlign === "start" ? "flex-start" : widget.contentAlign === "end" ? "flex-end" : "center";
      content.setAttribute("aria-label", widget.title || `Zustands-Element: ${widget.state ?? ""}`);
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
        content.classList.add("is-interactive"); content.tabIndex = 0;
        if (widget.interaction === "navigation") content.setAttribute("role", "link");
        else content.setAttribute("role", "button");
        const activate = (event) => {
          event.stopPropagation();
          if (widget.interaction === "navigation") {
            const target = safeUrl(widget.targetUrl);
            if (target) window.open(target, "_blank", "noopener,noreferrer");
          } else {
            widget.state = visualStates[(visualIndex + 1) % Math.max(visualStates.length, 1)]?.value ?? "on";
            renderStage();
          }
        };
        content.addEventListener("click", activate);
        content.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activate(event); } });
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
      const on = isOn(widget.state);
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
        content.classList.add("is-interactive"); content.setAttribute("role", "button"); content.tabIndex = 0;
        const toggle = (event) => { event.stopPropagation(); widget.state = on ? "off" : "on"; renderStage(); };
        content.addEventListener("click", toggle);
        content.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(event); } });
      }
    } else if (widget.type === "toggle") {
      const label = document.createElement("label"); label.className = "widget-toggle";
      const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.checked = widget.state === true || widget.state === "true" || widget.state === "on";
      checkbox.tabIndex = runtimeMode ? 0 : -1;
      checkbox.setAttribute("aria-label", widget.title || "Schalter"); checkbox.dataset.state = checkbox.checked ? "on" : "off";
      checkbox.addEventListener("change", (event) => { event.stopPropagation(); widget.state = checkbox.checked ? "on" : "off"; checkbox.dataset.state = widget.state; });
      const track = document.createElement("span"); track.className = "switch-track"; track.setAttribute("aria-hidden", "true");
      label.append(checkbox, track);
      if (widget.title) { const caption = document.createElement("span"); caption.textContent = widget.title; label.append(caption); }
      content.append(label);
    } else if (widget.type === "checkbox") {
      const label = document.createElement("label"); label.className = "widget-checkbox";
      const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.checked = widget.state === true || widget.state === "true" || widget.state === "on";
      checkbox.tabIndex = runtimeMode ? 0 : -1;
      checkbox.addEventListener("change", (event) => { event.stopPropagation(); widget.state = checkbox.checked ? "on" : "off"; });
      label.append(checkbox);
      if (widget.title) { const caption = document.createElement("span"); caption.textContent = widget.title; label.append(caption); }
      content.append(label);
    } else if (widget.type === "bulb") {
      const isOnState = isOn(widget.state);
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
        content.classList.add("is-interactive"); content.setAttribute("role", "button"); content.tabIndex = 0;
        content.addEventListener("click", (event) => { event.stopPropagation(); widget.state = isOn(widget.state) ? "off" : "on"; renderStage(); });
        content.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); widget.state = isOn(widget.state) ? "off" : "on"; renderStage(); } });
      }
    } else if (widget.type === "slider") {
      const range = document.createElement("input"); range.type = "range";
      range.min = String(widget.min ?? 0); range.max = String(widget.max ?? 100); range.value = String(widget.value ?? 50);
      range.step = String(widget.step ?? 1); range.disabled = !runtimeMode;
      range.setAttribute("aria-label", widget.title || "Regler");
      range.addEventListener("input", () => { widget.value = Number(range.value); }); content.append(range);
    } else if (widget.type === "image") {
      if (widget.imageSrc) { const image = document.createElement("img"); image.src = safeUrl(widget.imageSrc, true); image.alt = widget.title || "Bild"; content.append(image); }
      else { content.classList.add("image-placeholder"); content.setAttribute("aria-label", widget.title || "Bild"); }
    } else if (widget.type === "string") {
      const text = document.createElement("span"); text.className = "basic-string"; text.textContent = `${widget.prefix || ""}${widget.state ?? ""}${widget.suffix || ""}`; content.append(text);
    } else if (widget.type === "string-raw") {
      appendSafeHtml(content, `${widget.prefix || ""}${widget.state ?? ""}${widget.suffix || ""}`);
    } else if (widget.type === "image-source") {
      const src = safeUrl(widget.state, true);
      if (src) { const image = document.createElement("img"); image.className = "source-image"; image.src = src; image.alt = widget.alt || widget.title || "Bild"; content.append(image); }
      else { content.textContent = widget.alt || "Bild-URL nicht gesetzt"; content.classList.add("image-placeholder"); }
    } else if (["time-value", "timestamp-value", "timestamp", "last-changed"].includes(widget.type)) {
      const sourceKey = widget.type === "timestamp" ? "lastUpdated" : widget.type === "last-changed" ? "lastChanged" : "state";
      const value = formatDate(widget[sourceKey], widget.dateFormat, widget.showInterval);
      const output = document.createElement("span"); output.className = "basic-date"; output.textContent = value; content.append(output);
    } else if (["value-list-text", "value-list-html", "value-list-html-style"].includes(widget.type)) {
      const { value, index } = listEntry(widget);
      if (widget.type === "value-list-text") content.textContent = value;
      else {
        appendSafeHtml(content, value);
        if (widget.type === "value-list-html-style") applySafeStyle(content, String(widget.styleList || "").split(/\r?\n/)[index] || "");
      }
    } else if (widget.type === "bool-display" || widget.type === "bool-html-control") {
      const current = isOn(widget.state);
      const output = document.createElement("span"); output.className = "bool-html";
      appendSafeHtml(output, current ? widget.htmlTrue : widget.htmlFalse); content.append(output);
      if (widget.type === "bool-html-control") {
        output.classList.add("is-interactive"); output.setAttribute("role", "button"); output.tabIndex = runtimeMode ? 0 : -1;
        const toggle = (event) => { if (!runtimeMode) return; event.stopPropagation(); widget.state = current ? "off" : "on"; renderStage(); };
        output.addEventListener("click", toggle);
        output.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(event); } });
      }
    } else if (widget.type === "bool-select") {
      const select = document.createElement("select"); select.className = "widget-control";
      for (const [value, label] of [["off", widget.textOff || "Aus"], ["on", widget.textOn || "Ein"]]) { const option = document.createElement("option"); option.value = value; option.textContent = label; select.append(option); }
      select.value = isOn(widget.state) ? "on" : "off"; select.disabled = !runtimeMode;
      select.setAttribute("aria-label", widget.title || "Bool Select");
      select.addEventListener("change", (event) => { event.stopPropagation(); widget.state = select.value; }); content.append(select);
    } else if (widget.type === "html-state" || widget.type === "html") {
      const output = document.createElement("div"); output.className = "safe-html"; appendSafeHtml(output, widget.htmlContent || "");
      const url = safeUrl(widget.clickUrl);
      if (widget.type === "html-state" && url) { const link = document.createElement("a"); link.href = url; link.rel = "noopener noreferrer"; link.append(output); content.append(link); }
      else content.append(output);
    } else if (widget.type === "table") {
      const tableWrap = document.createElement("div"); tableWrap.className = "widget-table-wrap";
      try {
        const data = JSON.parse(widget.tableData || "[]");
        const rows = Array.isArray(data) ? data : Array.isArray(data?.rows) ? data.rows : [];
        if (rows.length) {
          const columns = [...new Set(rows.flatMap((row) => row && typeof row === "object" ? Object.keys(row) : []))];
          const table = document.createElement("table"); const head = table.createTHead().insertRow();
          columns.forEach((column) => { const cell = document.createElement("th"); cell.textContent = column; head.append(cell); });
          const body = table.createTBody();
          rows.forEach((row) => { const tr = body.insertRow(); columns.forEach((column) => { const cell = tr.insertCell(); cell.textContent = row?.[column] == null ? "" : String(row[column]); }); });
          tableWrap.append(table);
        } else tableWrap.textContent = "Keine Tabellendaten";
      } catch { tableWrap.textContent = "Ungültige JSON-Testdaten"; }
      content.append(tableWrap);
    } else if (widget.type === "fullscreen") {
      const button = document.createElement("button"); button.type = "button"; button.className = "fullscreen-button"; button.textContent = widget.buttonText || "Vollbild";
      button.addEventListener("click", async (event) => {
        event.stopPropagation();
        try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
        catch { button.textContent = "Vollbild nicht verfügbar"; }
      }); content.append(button);
    } else if (widget.type === "bar") {
      const min = Number(widget.min ?? 0); const max = Number(widget.max ?? 100); const current = Number(widget.state);
      const ratio = Number.isFinite(current) && max > min ? Math.max(0, Math.min(1, (current - min) / (max - min))) : 0;
      const track = document.createElement("div"); track.className = `bar-track ${widget.orientation === "vertical" ? "vertical" : "horizontal"}`;
      const fill = document.createElement("span"); fill.className = "bar-fill"; fill.style.backgroundColor = widget.barColor || "var(--accent)";
      fill.style[widget.orientation === "vertical" ? "height" : "width"] = `${ratio * 100}%`; track.append(fill); content.append(track);
    } else if (widget.type === "navigation") {
      const href = safeUrl(widget.navUrl);
      if (href) { const link = document.createElement("a"); link.className = "widget-navigation"; link.href = href; link.textContent = widget.navLabel || "Öffnen"; content.append(link); }
      else content.textContent = widget.navLabel || "Ziel-URL fehlt";
    } else if (widget.type === "filter-dropdown") {
      const select = document.createElement("select"); select.className = "widget-control"; select.setAttribute("aria-label", widget.title || "Widget-Filter");
      const all = document.createElement("option"); all.value = ""; all.textContent = "Alle Widgets"; select.append(all);
      for (const value of String(widget.filterOptions || "").split(/[;,\n]/).map((item) => item.trim()).filter(Boolean)) { const option = document.createElement("option"); option.value = value; option.textContent = value; select.append(option); }
      select.value = activeFilter; select.addEventListener("change", (event) => { event.stopPropagation(); state.activeFilter = select.value; renderStage(); }); content.append(select);
    } else {
      const value = document.createElement("span"); value.className = "value";
    let displayValue = widget.state ?? "--";
    let suffix = widget.unit || "";
    if (widget.type === "sensor" && Number.isFinite(Number(displayValue))) {
      const scaled = Number(displayValue) * Number(widget.factor ?? 1);
      displayValue = scaled.toFixed(Number(widget.digits ?? 1));
      if (widget.decimalComma) displayValue = displayValue.replace(".", ",");
      suffix = Number(displayValue.replace(",", ".")) === 1 ? widget.suffixSingular || suffix : widget.suffixPlural || suffix;
    }
    value.textContent = `${widget.entityId ? `${widget.entityId} · ` : ""}${widget.prefix || ""}${displayValue}${suffix}`;
      if (widget.title) { const title = document.createElement("span"); title.className = "widget-title"; title.textContent = widget.title; content.append(title); }
      content.append(value);
      if (widget.type === "gauge") content.classList.add("widget-gauge");
    }
    element.append(content);
    const signalCount = Math.max(0, Math.min(9, Number(widget.signalCount) || 0));
    for (const [signalIndex, signal] of (widget.signalImages || []).slice(0, signalCount).entries()) {
      if (!signal || (!runtimeMode && signal.hideInEditor)) continue;
      const actual = widget.state ?? widget.value ?? "";
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
  if (input.type === "checkbox") input.checked = widget[descriptor.key] ?? descriptor.default ?? true;
  else input.value = widget[descriptor.key] ?? descriptor.default ?? (descriptor.type === "color" ? "#29c8b5" : descriptor.type === "select" ? (typeof descriptor.options?.[0] === "string" ? descriptor.options[0] : descriptor.options?.[0]?.value) || "" : "");
  if (descriptor.min !== undefined) input.min = descriptor.min;
  if (descriptor.max !== undefined) input.max = descriptor.max;
  if (descriptor.step !== undefined) input.step = descriptor.step;
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
  if (descriptor.previewImage) {
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
  } else wrapper.append(input);
  const update = () => {
    widget[descriptor.key] = input.type === "number" || input.type === "range" ? Number(input.value) : input.type === "checkbox" ? input.checked : input.value;
    void updatePreview();
    renderStage();
    if (descriptor.refreshProperties) renderProperties();
    if (descriptor.key === "title" && widget.id) renderWidgetFinder();
  };
  input.addEventListener(descriptor.type === "select" ? "change" : "input", update);
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
  const groups = getWidgetDefinition(widget.type).propertyGroups;
  const heading = document.createElement("div"); heading.className = "selected-widget-heading";
  heading.textContent = `${getWidgetDefinition(widget.type).label} · ${widget.id}`; panel.append(heading);
  for (const [index, group] of groups.entries()) {
    const details = document.createElement("details"); details.className = "property-section";
    const summary = document.createElement("summary");
    const title = document.createElement("span"); title.className = "property-section-title"; title.textContent = group.label;
    const enabled = document.createElement("input"); enabled.type = "checkbox"; enabled.className = "property-section-enabled";
    enabled.checked = propertyGroupEnabled(widget, group, index);
    enabled.setAttribute("aria-label", `${group.label}: Optionen im Projekt speichern`);
    enabled.title = "Optionen dieser Gruppe im gespeicherten Projekt übernehmen";
    enabled.addEventListener("click", (event) => event.stopPropagation());
    enabled.addEventListener("change", (event) => {
      event.stopPropagation();
      widget.enabledPropertyGroups ??= {};
      widget.enabledPropertyGroups[propertyGroupKey(group, index)] = enabled.checked;
    });
    summary.append(title, enabled);
    const body = document.createElement("div"); body.className = "property-fields";
    if (group.hint) { const hint = document.createElement("p"); hint.className = "property-hint"; hint.textContent = group.hint; body.append(hint); }
    const visibleFields = (fields, model) => fields.filter((descriptor) => !descriptor.showWhen || model[descriptor.showWhen.key] === descriptor.showWhen.value).map((descriptor) => field(descriptor, model));
    body.append(...visibleFields(group.fields, widget));
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
          { value: "icon", label: "Icon" }, { value: "image", label: "Bild" }, { value: "text", label: "Text" }, { value: "html", label: "HTML (bereinigt)" },
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
        { label: "Objekt-ID", key: "entityId" },
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
        const details = document.createElement("details"); details.className = "signal-section"; details.open = count === 1 && signalIndex === 0;
        const summary = document.createElement("summary"); summary.textContent = `Signal [${signalIndex}]`; details.append(summary);
        const fields = document.createElement("div"); fields.className = "property-fields";
        fields.append(...signalFields.map((descriptor) => field({ ...descriptor, label: `${descriptor.label} [${signalIndex}]` }, signal)));
        details.append(fields); body.append(details);
      }
      widget.signalImages.length = count;
    }
    details.append(summary, body); panel.append(details);
  }
}

function render() {
  applyProjectCss();
  const page = currentPage();
  workspace.classList.toggle("runtime", runtimeMode);
  document.body.classList.toggle("runtime-mode", runtimeMode);
  document.body.classList.toggle("editor-mode", !runtimeMode);
  $("#editor-link").classList.toggle("active", !runtimeMode);
  $("#runtime-link").classList.toggle("active", runtimeMode);
  const projectQuery = `project=${encodeURIComponent(state.projectId)}`;
  $("#editor-link").href = `?mode=editor&${projectQuery}`;
  $("#runtime-link").href = `?mode=runtime&${projectQuery}`;
  document.title = `${state.project.settings?.title || state.project.name} · HA Grafik Visual Studio`;
  const favicon = safeUrl(state.project.settings?.favicon || "", true);
  $("#project-favicon-link").href = favicon || "studio-icon.svg";
  document.body.style.overflow = runtimeMode ? (state.project.settings?.bodyOverflow || "auto") : "hidden";
  $("#active-page-name").textContent = page.name;
  $("#preset").value = page.page.preset || "custom";
  $("#custom-size").hidden = page.page.preset !== "custom";
  $("#page-width").value = page.page.width;
  $("#page-height").value = page.page.height;
  renderPalette(); renderPageMenu(); renderStage(); renderProperties(); renderWidgetFinder();
}

$("#widget-finder").addEventListener("change", (event) => focusWidget(event.target.value));
$("#widget-duplicate").addEventListener("click", duplicateSelectedWidget);
$("#widget-delete").addEventListener("click", deleteSelectedWidget);
$("#widget-layer-up").addEventListener("click", () => changeSelectedWidgetLayer(1));
$("#widget-layer-down").addEventListener("click", () => changeSelectedWidgetLayer(-1));
$("#widget-export").addEventListener("click", exportSelectedWidget);
$("#widget-import").addEventListener("click", () => $("#widget-import-file").click());
$("#widget-import-file").addEventListener("change", (event) => { if (event.target.files[0]) void importWidgets(event.target.files[0]); });

$("#preset").addEventListener("change", (event) => {
  const preset = event.target.value;
  const page = currentPage().page;
  Object.assign(page, { ...page, preset, ...(PRESETS[preset] || {}) });
  $("#custom-size").hidden = preset !== "custom";
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
    $("#custom-size").hidden = false;
    renderStage();
  });
}
$("#save").addEventListener("click", async () => {
  const response = await fetch(`api/project?project=${encodeURIComponent(state.projectId)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(projectForSave(state.project)) });
  if (response.ok) {
    state.project = projectForSave(state.project);
    render();
  }
  $("#status").textContent = response.ok ? "Projekt lokal gespeichert" : "Speichern fehlgeschlagen";
});
$("#pages-menu-toggle").addEventListener("click", () => togglePagesMenu());
$("#runtime-pages-menu-toggle").addEventListener("click", () => togglePagesMenu());
$("#pages-close").addEventListener("click", () => togglePagesMenu(false));
$("#page-add").addEventListener("click", addPage);
$("#widgets-menu").addEventListener("click", () => {
  const panel = $("#palette-panel"); panel.hidden = !panel.hidden;
  $("#widgets-menu").setAttribute("aria-pressed", String(!panel.hidden));
});
$("#settings-menu").addEventListener("click", () => {
  const settings = state.project.settings ??= {};
  $("#settings-reload").value = settings.reloadMode || "reload";
  $("#settings-dark-reconnect").checked = Boolean(settings.darkReconnect);
  $("#settings-debounce").value = settings.debounceMs ?? 200;
  $("#settings-instance").value = settings.browserInstanceId || crypto.randomUUID().slice(0, 8);
  $("#settings-public").checked = Boolean(settings.public);
  $("#project-title").value = settings.title || state.project.name || "";
  $("#project-favicon").value = settings.favicon || "";
  $("#settings-ignore-unloaded").checked = settings.ignoreUnloaded !== false;
  $("#settings-overflow").value = settings.bodyOverflow || "auto";
  $("#settings-dialog").showModal();
});
$("#project-favicon-browse").addEventListener("click", () => {
  activeIconInput = $("#project-favicon");
  openObjects();
});
$("#settings-instance-new").addEventListener("click", () => { $("#settings-instance").value = crypto.randomUUID().slice(0, 8); });
$("#settings-save").addEventListener("click", async (event) => {
  event.preventDefault();
  state.project.settings ??= {};
  Object.assign(state.project.settings, {
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
  const response = await fetch(`api/project?project=${encodeURIComponent(state.projectId)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(projectForSave(state.project)) });
  if (response.ok) { $("#settings-dialog").close(); render(); $("#status").textContent = "Projekteinstellungen gespeichert"; }
});
$("#files-menu").addEventListener("click", () => openObjects());
$("#objects-close").addEventListener("click", cancelFileSelection);
$("#files-cancel").addEventListener("click", cancelFileSelection);
$("#files-upload").addEventListener("click", () => $("#files-upload-input").click());
$("#files-upload-input").addEventListener("change", (event) => { void uploadFiles(event.target.files); });
$("#files-copy").addEventListener("click", async () => {
  const paths = state.selectedFiles.map((path) => "/local/" + path);
  try {
    await navigator.clipboard.writeText(paths.join("\n"));
    $("#status").textContent = paths.length + " Pfad(e) in die Zwischenablage kopiert";
  } catch {
    $("#status").textContent = "Zwischenablage nicht verfügbar";
  }
});
$("#files-apply").addEventListener("click", () => {
  if (!activeIconInput || state.selectedFiles.length !== 1) return;
  activeIconInput.value = "/local/" + state.selectedFiles[0];
  activeIconInput.dispatchEvent(new Event("input", { bubbles: true }));
  $("#objects-dialog").close();
  if ($("#icon-picker").open) $("#icon-picker").close();
  activeIconInput.focus(); activeIconInput = null; state.selectedFiles = [];
});
$("#projects-menu").addEventListener("click", () => { $("#projects-dialog").showModal(); void renderProjects(); });
$("#projects-close").addEventListener("click", () => $("#projects-dialog").close());
$("#project-create").addEventListener("click", async () => {
  const name = window.prompt("Name des neuen Projekts", "Neues Projekt"); if (!name?.trim()) return;
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

loadProject();
