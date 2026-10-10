import { Blockly, toolbox, knownTypes, workspaceModel, modelWorkspace, setupVariables } from './blocks.js';
import { examples, toYaml, fromYaml, filename, validateAutomation } from './model.js';
import { setupJinjaEditor } from './jinja-editor.js';
import { setupAutomationOptions } from './automation-options.js';
import './style.css';
import './appearance.css';
import { version } from '../package.json';
import { upgradeWorkspace } from './project.js';
import './search.js';
import { themes, themeOptions, themeKey, savedTheme } from './themes.js';
import * as ZoomModule from '@blockly/zoom-to-fit';
import { setupEntities } from './entities.js';
import { withPackages, installedPackages, usedPackages, customDefinition, packageStoreKey } from './custom-packages.js';
import { setupCustomEditor, refreshCustomToolbox } from './custom-editor.js';
import { setupWorkspaceTools } from './workspace-tools.js';
import { setupAppearance } from './appearance.js';
import { setupOutputPanel } from './output-panel.js';
import { language, languagePreference, languageKey, localizedToolbox, translateLabel } from './locales.js';

document.querySelector('#app').innerHTML = `
<header class="app-header"><a class="brand" href="/"><span class="brand-icon">▦</span><span>UGSo <strong>Blocks for HA</strong></span></a><div class="header-right"><span class="version">Vorschau 0.1.0</span><button id="about">Über & Lizenzen</button></div></header>
<main><section class="intro"><div><span class="eyebrow">AUTOMATIONEN VISUELL BAUEN</span><h1>Deine Idee. Deine Blocks.</h1><p>Auslöser verbinden, Bedingungen prüfen, Aktionen festlegen.</p></div><div class="local-badge"><span></span> Lokal · keine HA-Verbindung</div></section>
<section class="project-bar" aria-label="Automationseinstellungen"><label class="name-field">Name der Automation<input id="name" maxlength="160"></label><label>Ausführung<select id="mode"><option value="single">Einzeln</option><option value="restart">Neu starten</option><option value="queued">Warteschlange</option><option value="parallel">Parallel</option></select></label><label id="max-label" hidden>Maximal<input id="max" type="number" min="1" max="100" value="10"></label><label>Beispiel<select id="example"><option value="light">Licht bei Bewegung</option><option value="battery">Batterie laden</option><option value="evening">Abendlicht</option></select></label><button id="load-example">Beispiel laden</button></section>
<section class="editor-layout"><div class="canvas-panel"><div class="panel-heading"><div><h2>Blocks</h2><span>Wenn → Nur wenn → Dann</span></div><div class="canvas-actions"><button id="undo" title="Rückgängig">↶</button><button id="redo" title="Wiederholen">↷</button><button id="fit">Einpassen</button></div></div><div id="workspace"></div><div class="canvas-foot"><span><i class="dot trigger"></i>Auslöser</span><span><i class="dot condition"></i>Bedingungen</span><span><i class="dot action"></i>Aktionen</span></div></div>
<aside class="output-panel"><div class="panel-heading"><div><h2>HA-Automation</h2><span>Native YAML-Ausgabe</span></div><span id="valid-badge" class="valid-badge">Gültig</span></div><label class="format-label">Ausgabeformat<select id="format"><option value="single">Einzelne Automation · HA-Editor</option><option value="list">Liste · eine Automation</option></select></label><pre id="yaml" tabindex="0" aria-label="YAML-Ausgabe"></pre><div id="validation" role="status"></div><div class="file-actions"><button id="copy">Kopieren</button><button id="save" class="primary">Speichern</button><button id="open">Öffnen</button></div><p class="output-note">Speichern lädt eine YAML-Datei auf deinen Rechner. Öffnen lädt eine unterstützte Automation zurück in Blocks.</p><details class="more"><summary>Projekt & Beschreibung</summary><label>Beschreibung<textarea id="description" rows="2"></textarea></label><div class="project-actions"><button id="project-save">Projekt sichern</button><button id="project-open">Projekt öffnen</button></div><p>Das Projekt enthält auch die Anordnung der Blocks. Der letzte Stand wird automatisch in diesem Browser gesichert.</p></details><div class="ha-hint"><strong>In Home Assistant verwenden</strong><p>Beispiel-Entitäten durch deine eigenen IDs ersetzen. Für den HA-Editor das Format „Einzelne Automation“ wählen und den Inhalt in „Als YAML bearbeiten“ übernehmen. Speichern und in HA prüfen.</p><a href="https://www.home-assistant.io/docs/automation/yaml/" target="_blank" rel="noopener noreferrer">HA-Dokumentation ↗</a></div></aside></section><footer>UGSo Blocks for HA · Unabhängiges Community-Projekt <a class="blockly-attribution" href="https://www.blockly.com/" target="_blank" rel="noopener noreferrer"><img src="./branding/built-with-blockly-badge-white.svg" alt="Built with Blockly" width="87" height="32"></a></footer></main>
<input id="yaml-file" type="file" accept=".yaml,.yml,text/yaml" hidden><input id="project-file" type="file" accept=".json,application/json" hidden><div id="toast" role="status" hidden></div>
<dialog id="about-dialog"><h2>UGSo Blocks for HA</h2><p>Version 0.1.0 · Visueller Editor für native Home-Assistant-Automationen.</p><p>Built with <a href="https://www.blockly.com/" target="_blank" rel="noopener noreferrer">Blockly</a>, der Open-Source-Bibliothek der Raspberry Pi Foundation, ursprünglich bei Google entwickelt. Eigene HA-Blocks; keine ioBroker-Laufzeit.</p><p>Blockly: Apache-2.0 · YAML: ISC · fflate: MIT · Eigener Code: Apache-2.0.</p><a class="blockly-attribution" href="https://www.blockly.com/" target="_blank" rel="noopener noreferrer"><img src="./branding/built-with-blockly-badge-white.svg" alt="Built with Blockly" width="87" height="32"></a><p>Unabhängiges Community-Projekt, kein offizielles Produkt von Home Assistant oder Blockly.</p><a href="/licenses/THIRD_PARTY_NOTICES.txt" target="_blank">Lizenzhinweise öffnen</a><form method="dialog"><button class="primary">Schließen</button></form></dialog>`;
document.querySelector('.version').textContent = `Vorschau ${version}`;
document.querySelector('.project-bar').append(document.querySelector('.local-badge'));
setupAppearance();
setupOutputPanel(() => { Blockly.svgResize(workspace); workspace.scrollCenter(); });
document.querySelector('.brand-icon').innerHTML = '<img src="./blocks-icon.svg" alt="" width="34" height="34">';
document.querySelector('#about-dialog p').textContent = `Version ${version} · Visueller Editor für native Home-Assistant-Automationen.`;
const $ = id => document.getElementById(id);
document.querySelector('.brand').href = './';
document.querySelector('#about-dialog a[href="/licenses/THIRD_PARTY_NOTICES.txt"]').href = './licenses/THIRD_PARTY_NOTICES.txt';
const themeLabel = document.createElement('label'); themeLabel.className = 'theme-label'; themeLabel.textContent = 'Theme';
const themeSelect = document.createElement('select'); themeSelect.id = 'theme'; themeSelect.setAttribute('aria-label', 'Blockly-Theme');
for (const [id, text] of themeOptions) themeSelect.add(new Option(text, id));
themeLabel.append(themeSelect); document.querySelector('.canvas-actions').prepend(themeLabel);
let selectedTheme = savedTheme(() => localStorage); themeSelect.value = selectedTheme;
document.querySelector('#workspace').dataset.theme = selectedTheme;
const workspace = Blockly.inject('workspace', { toolbox: localizedToolbox(toolbox), theme: themes[selectedTheme], media: './media/', renderer: 'geras', grid: { spacing: 24, length: 2, colour: selectedTheme === 'dark' ? '#45525d' : '#d4dfdc', snap: true }, zoom: { controls: true, wheel: true, startScale: 1, maxScale: 2.4, minScale: .5 }, move: { scrollbars: true, drag: true, wheel: true }, trashcan: true, sounds: false });
// Blockly explicitly supports overriding the flyout scale. Palette blocks remain
// readable even when the user zooms out a large automation.
workspace.getFlyout().getFlyoutScale = () => 1;
const nativeZoomToFit = workspace.zoomToFit.bind(workspace);
workspace.zoomToFit = () => { nativeZoomToFit(); workspace.setScale(Math.max(.85, Math.min(1.2, workspace.scale))); workspace.scrollCenter(); };
const Zoom = ZoomModule.default || ZoomModule;
const zoomToFit = new Zoom.ZoomToFitControl(workspace); zoomToFit.init();
const zoomElement = document.querySelector('#workspace .zoomToFit');
zoomElement?.setAttribute('aria-label', 'Alle Blocks einpassen');
zoomElement?.querySelector('title')?.replaceChildren(document.createTextNode('Alle Blocks einpassen'));
function fitCompact() { workspace.zoomToFit(); }
setupVariables(workspace);
setupWorkspaceTools(workspace);
setupEntities(workspace);
setupJinjaEditor(Blockly, workspace);
let metadata = {};
let currentModel;
let timer;
let toastTimer;
const key = 'ugso-blocks-for-ha-project-v1';
const languageLabel = document.createElement('label'); languageLabel.className = 'theme-label'; languageLabel.textContent = translateLabel('Blocks-Sprache');
const languageSelect = document.createElement('select'); languageSelect.id = 'block-language'; languageSelect.setAttribute('aria-label', translateLabel('Blocks-Sprache'));
for (const [value, label] of [['system', `${translateLabel('Systemsprache')} (${language.toUpperCase()})`], ['de', 'Deutsch (DE)'], ['en', 'English (EN)'], ['fr', 'Français (FR)']]) languageSelect.add(new Option(label, value));
languageSelect.value = languagePreference; languageLabel.append(languageSelect); document.querySelector('.header-right').prepend(languageLabel);
languageSelect.addEventListener('change', () => {
  try { validateAutomation(workspaceModel(workspace, metadata)); }
  catch { languageSelect.value = languagePreference; notice('Zum Sprachwechsel die Blocks vervollständigen oder zuerst ein gültiges Projekt öffnen.'); return; }
  try {
    // Save the complete workspace before recreating Blockly with a different locale.
    // Do not reload when browser storage is unavailable: unsaved edits must survive.
    const project = snapshot();
    project.languageReload = { yaml: yamlInput.value, mode: $('yaml-mode').value, replace: $('yaml-replace').checked };
    localStorage.setItem(key, JSON.stringify(project));
    localStorage.setItem(languageKey, languageSelect.value);
    location.reload();
  } catch { languageSelect.value = languagePreference; notice('Sprache nicht geändert: Browser-Speicher nicht verfügbar. Projekt bitte zuerst sichern.'); }
});
const yamlModeLabel = document.createElement('label'); yamlModeLabel.className = 'format-label';
yamlModeLabel.innerHTML = '<span>YAML</span><select id="yaml-mode" aria-label="YAML-Modus"><option value="output">Ausgabe</option><option value="import">Code importieren</option></select>';
document.querySelector('.format-label').before(yamlModeLabel);
const yamlInput = document.createElement('textarea'); yamlInput.id = 'yaml-input'; yamlInput.rows = 17; yamlInput.spellcheck = false;
yamlInput.setAttribute('aria-label', 'YAML-Code zum Importieren'); yamlInput.placeholder = 'YAML einer Home-Assistant-Automation hier einfügen …'; yamlInput.hidden = true;
$('yaml').after(yamlInput);
const importError = document.createElement('p'); importError.id = 'yaml-import-error'; importError.setAttribute('role', 'alert'); importError.hidden = true; yamlInput.after(importError);
const replaceLabel = document.createElement('label'); replaceLabel.className = 'yaml-replace'; replaceLabel.hidden = true;
replaceLabel.innerHTML = '<input id="yaml-replace" type="checkbox">Aktuelle Automation vollständig ersetzen'; importError.after(replaceLabel);
const outputNote = document.querySelector('.output-note').textContent;
const yamlClear = document.createElement('button');
yamlClear.id = 'yaml-clear'; yamlClear.type = 'button'; yamlClear.textContent = 'Eingabefeld leeren'; yamlClear.hidden = true;
document.querySelector('.file-actions').append(yamlClear);
yamlClear.addEventListener('click', () => {
  yamlInput.value = ''; importError.textContent = ''; syncYamlMode(); yamlInput.focus();
});
function syncYamlMode() {
  const importing = $('yaml-mode').value === 'import';
  $('yaml').hidden = importing; yamlInput.hidden = !importing;
  replaceLabel.hidden = !importing;
  $('format').closest('label').hidden = importing;
  $('validation').hidden = $('valid-badge').hidden = $('copy').hidden = importing;
  document.querySelector('.file-actions').classList.toggle('import-actions', importing);
  yamlClear.hidden = !importing; yamlClear.disabled = !yamlInput.value.length;
  $('save').textContent = importing ? 'Importieren' : 'Speichern';
  $('save').disabled = importing ? !yamlInput.value.trim() : !currentModel;
  document.querySelector('.output-panel .panel-heading span').textContent = importing ? 'YAML einfügen und in Blocks übernehmen' : 'Native YAML-Ausgabe';
  document.querySelector('.output-note').textContent = importing ? 'Ohne Haken: Auslöser, Bedingungen und Aktionen ergänzen; Name und Einstellungen bleiben erhalten. Mit Haken: nach Bestätigung vollständig ersetzen. Vorher das Projekt sichern.' : outputNote;
  importError.hidden = !importing || !importError.textContent;
}
$('yaml-mode').addEventListener('change', syncYamlMode);
yamlInput.addEventListener('input', () => { importError.textContent = ''; syncYamlMode(); });
function notice(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 6000); }
themeSelect.addEventListener('change', () => {
  selectedTheme = Object.hasOwn(themes, themeSelect.value) ? themeSelect.value : 'standard';
  workspace.setTheme(themes[selectedTheme]);
  $('workspace').dataset.theme = selectedTheme;
  try { localStorage.setItem(themeKey, selectedTheme); } catch { notice('Theme geändert; Browser-Speicher nicht verfügbar.'); }
});
function metaFields() {
  $('name').value = metadata.alias || ''; $('description').value = metadata.description || ''; $('mode').value = metadata.mode;
  $('max').value = metadata.max || 10; $('max-label').hidden = !['queued', 'parallel'].includes(metadata.mode);
}
function setMeta(model) { const { triggers, conditions, actions, ...meta } = model; metadata = meta; metaFields(); }
function snapshot() { return { format: 'ugso-blocks-for-ha', version: 3, metadata, packages: usedPackages(workspace), workspace: Blockly.serialization.workspaces.save(workspace) }; }
function update() {
  try {
    currentModel = validateAutomation(workspaceModel(workspace, metadata));
    $('yaml').textContent = toYaml(currentModel, $('format').value, { omitId: $('format').value === 'single' });
    $('validation').textContent = 'Struktur geprüft · Entitäten und Aktionen in HA prüfen.';
    $('valid-badge').textContent = 'Gültig'; $('valid-badge').className = 'valid-badge';
    $('copy').disabled = $('save').disabled = false;
  } catch (error) {
    currentModel = undefined; $('yaml').textContent = '# Verbinde und vervollständige deine Blocks.\n# Die YAML-Ausgabe erscheint nach erfolgreicher Prüfung.';
    $('validation').textContent = error.message; $('valid-badge').textContent = 'Prüfen'; $('valid-badge').className = 'valid-badge invalid';
    $('copy').disabled = $('save').disabled = true;
  }
  syncYamlMode();
  try { localStorage.setItem(key, JSON.stringify(snapshot())); } catch { $('validation').textContent += ' Browser-Speicher nicht verfügbar; Projekt bitte sichern.'; }
}
function loadModel(model) { validateAutomation(model); modelWorkspace(workspace, model); setMeta(model); update(); requestAnimationFrame(fitCompact); }
function appendYamlModel(model) {
  if (!currentModel) throw new Error('Die aktuelle Automation ist unvollständig. Zum Importieren „Aktuelle Automation vollständig ersetzen“ aktivieren oder die Blocks vervollständigen.');
  const project = snapshot();
  const temp = new Blockly.Workspace();
  try {
    modelWorkspace(temp, model);
    const incoming = Blockly.serialization.workspaces.save(temp).blocks.blocks.find(b => b.type === 'ugso_automation');
    const root = project.workspace.blocks.blocks.find(b => b.type === 'ugso_automation');
    root.inputs ||= {};
    for (const name of ['TRIGGERS', 'ACTIONS']) {
      const added = incoming.inputs?.[name]; if (!added) continue;
      let tail = root.inputs[name]?.block;
      if (!tail) { root.inputs[name] = added; continue; }
      while (tail.next?.block) tail = tail.next.block;
      tail.next = added;
    }
    const added = incoming.inputs?.CONDITIONS;
    if (added) root.inputs.CONDITIONS = root.inputs.CONDITIONS ? { block: { type: 'ugso_logic_condition', fields: { LOGIC: 'and' }, extraState: { items: 2, list: true }, inputs: { COND0: root.inputs.CONDITIONS, COND1: added } } } : added;
  } finally { temp.dispose(); }
  restoreProject(project);
}
function restoreProject(data) {
  if (data?.format !== 'ugso-blocks-for-ha' || ![1, 2, 3].includes(data.version) || !data.metadata || !data.workspace) throw new Error('Kein unterstütztes Blocks-Projekt.');
  if (data.version === 1) data = { ...data, version: 2, workspace: upgradeWorkspace(data.workspace) };
  withPackages(Blockly, data.packages || [], () => {
  const temp = new Blockly.Workspace();
  try {
    // Validate types before serialization can skip an unknown block.
    const check = value => { if (!value || typeof value !== 'object') return; if (Object.hasOwn(value, 'type') && !knownTypes.has(value.type) && !customDefinition(value.type)) throw new Error(`Blockpaket fehlt: ${value.type}`); if (value.type === 'ugso_if_action' && !value.extraState) value.extraState = { branches: 0, hasElse: !!value.inputs?.ELSE }; Object.values(value).forEach(check); };
    check(data.workspace.blocks);
    Blockly.serialization.workspaces.load(data.workspace, temp);
    validateAutomation(workspaceModel(temp, data.metadata));
  } finally { temp.dispose(); }
  });
  Blockly.serialization.workspaces.load(data.workspace, workspace); metadata = data.metadata; metaFields(); update();
  refreshCustomToolbox(workspace, toolbox); savePackages();
  requestAnimationFrame(fitCompact);
}
function download(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
$('name').addEventListener('input', () => { if ($('name').value.trim()) metadata.alias = $('name').value; else delete metadata.alias; update(); });
setupAutomationOptions({getMetadata:()=>metadata,apply:next=>{validateAutomation(workspaceModel(workspace,next));metadata=next;update();}});
$('description').addEventListener('input', () => { metadata.description = $('description').value; update(); });
$('mode').addEventListener('change', () => { metadata.mode = $('mode').value; if (['queued', 'parallel'].includes(metadata.mode)) metadata.max = Number($('max').value); else delete metadata.max; metaFields(); update(); });
$('max').addEventListener('input', () => { metadata.max = Number($('max').value); update(); });
$('format').addEventListener('change', update);
$('load-example').addEventListener('click', () => { if (confirm('Aktuelle Blocks durch das Beispiel ersetzen? Speichere vorher deine Änderungen.')) loadModel(structuredClone(examples[$('example').value])); });
$('undo').addEventListener('click', () => workspace.undo(false)); $('redo').addEventListener('click', () => workspace.undo(true)); $('fit').addEventListener('click', fitCompact);
$('copy').addEventListener('click', async () => { if (!currentModel) return; try { await navigator.clipboard.writeText($('yaml').textContent); notice('YAML kopiert.'); } catch { notice('Kopieren nicht verfügbar. YAML markieren und mit Strg+C kopieren.'); } });
$('save').addEventListener('click', () => {
  if ($('yaml-mode').value === 'import') {
    try {
      if (new TextEncoder().encode(yamlInput.value).length > 1000000) throw new Error('YAML-Code ist größer als 1 MB.');
      const imported = fromYaml(yamlInput.value);
      if ($('yaml-replace').checked) {
        if (!confirm('Willst du die aktuellen Blocks vollständig ersetzen? Sichere vorher dein Projekt.')) return;
        loadModel(imported);
      } else {
        appendYamlModel(imported);
      }
      importError.textContent = ''; $('yaml-mode').value = 'output'; syncYamlMode(); notice('YAML-Code importiert.');
    } catch (error) { importError.textContent = error.message; importError.hidden = false; }
    return;
  }
  if (currentModel) { download($('yaml').textContent, filename(metadata.alias), 'text/yaml;charset=utf-8'); notice('YAML-Datei heruntergeladen.'); }
});
$('open').addEventListener('click', () => $('yaml-file').click());
$('project-save').addEventListener('click', () => download(JSON.stringify(snapshot(), null, 2), filename(metadata.alias).replace('.yaml', '.blocks.json'), 'application/json'));
$('project-open').addEventListener('click', () => $('project-file').click());
for (const [id, load] of [['yaml-file', source => loadModel(fromYaml(source))], ['project-file', source => restoreProject(JSON.parse(source))]]) {
  $(id).addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 1000000) throw new Error('Datei ist größer als 1 MB.');
      const source = await file.text();
      // Validate a YAML import before asking to replace the current project.
      if (id === 'yaml-file') fromYaml(source);
      if (confirm('Aktuelle Blocks durch die Datei ersetzen? Speichere vorher deine Änderungen.')) { load(source); notice('Datei geöffnet.'); }
    } catch (error) { notice(error.message); }
    event.target.value = '';
  });
}
$('about').addEventListener('click', () => $('about-dialog').showModal());
workspace.addChangeListener(event => { if (event.isUiEvent) return; clearTimeout(timer); timer = setTimeout(update, 120); });
new ResizeObserver(() => Blockly.svgResize(workspace)).observe($('workspace'));
function savePackages() {
  try { localStorage.setItem(packageStoreKey, JSON.stringify(installedPackages())); return ''; }
  catch { return 'Blockpaket für diese Sitzung übernommen. Browser-Speicher nicht verfügbar; Paket als JSON oder ZIP sichern.'; }
}
try { const saved = localStorage.getItem(packageStoreKey); if (saved) withPackages(Blockly, JSON.parse(saved)); }
catch (error) { notice(`Blockpakete konnten nicht geladen werden: ${error.message}`); }
refreshCustomToolbox(workspace, toolbox);
setupCustomEditor({ Blockly, workspace, download, notice, install: pkg => {
  withPackages(Blockly, [pkg]); refreshCustomToolbox(workspace, toolbox); update(); return savePackages();
} });
try {
  const saved = localStorage.getItem(key);
  if (saved) {
    const project = JSON.parse(saved); restoreProject(project);
    const draft = project.languageReload;
    if (draft && typeof draft.yaml === 'string' && ['output', 'import'].includes(draft.mode)) {
      yamlInput.value = draft.yaml; $('yaml-mode').value = draft.mode; $('yaml-replace').checked = draft.replace === true; syncYamlMode();
    }
  } else loadModel(structuredClone(examples.light));
}
catch { loadModel(structuredClone(examples.light)); notice('Gesicherter Browserstand konnte nicht geladen werden. Das Beispiel wurde geöffnet.'); }
