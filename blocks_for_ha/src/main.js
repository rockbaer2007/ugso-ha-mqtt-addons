import { Blockly, toolbox, knownTypes, workspaceModel, modelWorkspace } from './blocks.js';
import { examples, toYaml, fromYaml, filename, validateAutomation } from './model.js';
import './style.css';
import { version } from '../package.json';
import { upgradeWorkspace } from './project.js';

document.querySelector('#app').innerHTML = `
<header class="app-header"><a class="brand" href="/"><span class="brand-icon">▦</span><span>UGSo <strong>Blocks for HA</strong></span></a><div class="header-right"><span class="version">Vorschau 0.1.0</span><button id="about">Über & Lizenzen</button></div></header>
<main><section class="intro"><div><span class="eyebrow">AUTOMATIONEN VISUELL BAUEN</span><h1>Deine Idee. Deine Blocks.</h1><p>Auslöser verbinden, Bedingungen prüfen, Aktionen festlegen.</p></div><div class="local-badge"><span></span> Lokal · keine HA-Verbindung</div></section>
<section class="project-bar" aria-label="Automationseinstellungen"><label class="name-field">Name der Automation<input id="name" maxlength="160"></label><label>Ausführung<select id="mode"><option value="single">Einzeln</option><option value="restart">Neu starten</option><option value="queued">Warteschlange</option><option value="parallel">Parallel</option></select></label><label id="max-label" hidden>Maximal<input id="max" type="number" min="1" max="100" value="10"></label><label>Beispiel<select id="example"><option value="light">Licht bei Bewegung</option><option value="battery">Batterie laden</option><option value="evening">Abendlicht</option></select></label><button id="load-example">Beispiel laden</button></section>
<section class="editor-layout"><div class="canvas-panel"><div class="panel-heading"><div><h2>Blocks</h2><span>Wenn → Nur wenn → Dann</span></div><div class="canvas-actions"><button id="undo" title="Rückgängig">↶</button><button id="redo" title="Wiederholen">↷</button><button id="fit">Einpassen</button></div></div><div id="workspace"></div><div class="canvas-foot"><span><i class="dot trigger"></i>Auslöser</span><span><i class="dot condition"></i>Bedingungen</span><span><i class="dot action"></i>Aktionen</span></div></div>
<aside class="output-panel"><div class="panel-heading"><div><h2>HA-Automation</h2><span>Native YAML-Ausgabe</span></div><span id="valid-badge" class="valid-badge">Gültig</span></div><label class="format-label">Ausgabeformat<select id="format"><option value="single">Einzelne Automation · HA-Editor</option><option value="list">Liste · eine Automation</option></select></label><pre id="yaml" tabindex="0" aria-label="YAML-Ausgabe"></pre><div id="validation" role="status"></div><div class="file-actions"><button id="copy">Kopieren</button><button id="save" class="primary">Speichern</button><button id="open">Öffnen</button></div><p class="output-note">Speichern lädt eine YAML-Datei auf deinen Rechner. Öffnen lädt eine unterstützte Automation zurück in Blocks.</p><details class="more"><summary>Projekt & Beschreibung</summary><label>Beschreibung<textarea id="description" rows="2"></textarea></label><div class="project-actions"><button id="project-save">Projekt sichern</button><button id="project-open">Projekt öffnen</button></div><p>Das Projekt enthält auch die Anordnung der Blocks. Der letzte Stand wird automatisch in diesem Browser gesichert.</p></details><div class="ha-hint"><strong>In Home Assistant verwenden</strong><p>Beispiel-Entitäten durch deine eigenen IDs ersetzen. Für den HA-Editor das Format „Einzelne Automation“ wählen und den Inhalt in „Als YAML bearbeiten“ übernehmen. Speichern und in HA prüfen.</p><a href="https://www.home-assistant.io/docs/automation/yaml/" target="_blank" rel="noopener noreferrer">HA-Dokumentation ↗</a></div></aside></section><footer>UGSo Blocks for HA · Unabhängiges Community-Projekt <span>Built with <a href="https://www.blockly.com/" target="_blank" rel="noopener noreferrer">Blockly</a></span></footer></main>
<input id="yaml-file" type="file" accept=".yaml,.yml,text/yaml" hidden><input id="project-file" type="file" accept=".json,application/json" hidden><div id="toast" role="status" hidden></div>
<dialog id="about-dialog"><h2>UGSo Blocks for HA</h2><p>Version 0.1.0 · Visueller Editor für native Home-Assistant-Automationen.</p><p>Built with <a href="https://www.blockly.com/" target="_blank" rel="noopener noreferrer">Blockly</a>, der Open-Source-Bibliothek der Raspberry Pi Foundation, ursprünglich bei Google entwickelt. Eigene HA-Blocks; keine ioBroker-Laufzeit.</p><p>Blockly: Apache-2.0 · YAML: ISC · Eigener Code: Apache-2.0.</p><p>Unabhängiges Community-Projekt, kein offizielles Produkt von Home Assistant oder Blockly.</p><a href="/licenses/THIRD_PARTY_NOTICES.txt" target="_blank">Lizenzhinweise öffnen</a><form method="dialog"><button class="primary">Schließen</button></form></dialog>`;
document.querySelector('.version').textContent = `Vorschau ${version}`;
document.querySelector('#about-dialog p').textContent = `Version ${version} · Visueller Editor für native Home-Assistant-Automationen.`;
const $ = id => document.getElementById(id);
document.querySelector('.brand').href = './';
document.querySelector('#about-dialog a[href="/licenses/THIRD_PARTY_NOTICES.txt"]').href = './licenses/THIRD_PARTY_NOTICES.txt';
const compactTheme = Blockly.Theme.defineTheme('ugso_compact', { base: Blockly.Themes.Classic, fontStyle: { family: 'Segoe UI, sans-serif', size: 12, weight: 'normal' }, componentStyles: { toolboxBackgroundColour: '#20313c', toolboxForegroundColour: '#f4f7fa', flyoutBackgroundColour: '#eaf0f5', flyoutForegroundColour: '#233a36', flyoutOpacity: 1 } });
const workspace = Blockly.inject('workspace', { toolbox, theme: compactTheme, media: './media/', renderer: 'geras', grid: { spacing: 24, length: 2, colour: '#d4dfdc', snap: true }, zoom: { controls: true, wheel: true, startScale: .8, maxScale: 1.6, minScale: .35 }, move: { scrollbars: true, drag: true, wheel: true }, trashcan: true, sounds: false });
function fitCompact() { workspace.zoomToFit(); if (workspace.scale > .8) workspace.setScale(.8); workspace.scrollCenter(); }
let metadata = {};
let currentModel;
let timer;
let toastTimer;
const key = 'ugso-blocks-for-ha-project-v1';
function notice(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 6000); }
function metaFields() {
  $('name').value = metadata.alias; $('description').value = metadata.description || ''; $('mode').value = metadata.mode;
  $('max').value = metadata.max || 10; $('max-label').hidden = !['queued', 'parallel'].includes(metadata.mode);
}
function setMeta(model) { const { triggers, conditions, actions, ...meta } = model; metadata = meta; metaFields(); }
function snapshot() { return { format: 'ugso-blocks-for-ha', version: 2, metadata, workspace: Blockly.serialization.workspaces.save(workspace) }; }
function update() {
  try {
    currentModel = validateAutomation(workspaceModel(workspace, metadata));
    $('yaml').textContent = toYaml(currentModel, $('format').value);
    $('validation').textContent = 'Struktur geprüft · Entitäten und Aktionen in HA prüfen.';
    $('valid-badge').textContent = 'Gültig'; $('valid-badge').className = 'valid-badge';
    $('copy').disabled = $('save').disabled = false;
  } catch (error) {
    currentModel = undefined; $('yaml').textContent = '# Verbinde und vervollständige deine Blocks.\n# Die YAML-Ausgabe erscheint nach erfolgreicher Prüfung.';
    $('validation').textContent = error.message; $('valid-badge').textContent = 'Prüfen'; $('valid-badge').className = 'valid-badge invalid';
    $('copy').disabled = $('save').disabled = true;
  }
  try { localStorage.setItem(key, JSON.stringify(snapshot())); } catch { $('validation').textContent += ' Browser-Speicher nicht verfügbar; Projekt bitte sichern.'; }
}
function loadModel(model) { validateAutomation(model); modelWorkspace(workspace, model); setMeta(model); update(); requestAnimationFrame(fitCompact); }
function restoreProject(data) {
  if (data?.format !== 'ugso-blocks-for-ha' || ![1, 2].includes(data.version) || !data.metadata || !data.workspace) throw new Error('Kein unterstütztes Blocks-Projekt.');
  if (data.version === 1) data = { ...data, version: 2, workspace: upgradeWorkspace(data.workspace) };
  const temp = new Blockly.Workspace();
  try {
    // Validate types before serialization can skip an unknown block.
    const check = value => { if (!value || typeof value !== 'object') return; if (Object.hasOwn(value, 'type') && !knownTypes.has(value.type)) throw new Error(`Blockpaket fehlt: ${value.type}`); if (value.type === 'ugso_if_action' && !value.extraState) value.extraState = { branches: 0, hasElse: !!value.inputs?.ELSE }; Object.values(value).forEach(check); };
    check(data.workspace);
    Blockly.serialization.workspaces.load(data.workspace, temp);
    validateAutomation(workspaceModel(temp, data.metadata));
  } finally { temp.dispose(); }
  Blockly.serialization.workspaces.load(data.workspace, workspace); metadata = data.metadata; metaFields(); update();
  requestAnimationFrame(fitCompact);
}
function download(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
$('name').addEventListener('input', () => { metadata.alias = $('name').value; update(); });
$('description').addEventListener('input', () => { metadata.description = $('description').value; update(); });
$('mode').addEventListener('change', () => { metadata.mode = $('mode').value; if (['queued', 'parallel'].includes(metadata.mode)) metadata.max = Number($('max').value); else delete metadata.max; metaFields(); update(); });
$('max').addEventListener('input', () => { metadata.max = Number($('max').value); update(); });
$('format').addEventListener('change', update);
$('load-example').addEventListener('click', () => { if (confirm('Aktuelle Blocks durch das Beispiel ersetzen? Speichere vorher deine Änderungen.')) loadModel(structuredClone(examples[$('example').value])); });
$('undo').addEventListener('click', () => workspace.undo(false)); $('redo').addEventListener('click', () => workspace.undo(true)); $('fit').addEventListener('click', fitCompact);
$('copy').addEventListener('click', async () => { if (!currentModel) return; try { await navigator.clipboard.writeText($('yaml').textContent); notice('YAML kopiert.'); } catch { notice('Kopieren nicht verfügbar. YAML markieren und mit Strg+C kopieren.'); } });
$('save').addEventListener('click', () => { if (currentModel) { download($('yaml').textContent, filename(metadata.alias), 'text/yaml;charset=utf-8'); notice('YAML-Datei heruntergeladen.'); } });
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
try { const saved = localStorage.getItem(key); if (saved) restoreProject(JSON.parse(saved)); else loadModel(structuredClone(examples.light)); }
catch { loadModel(structuredClone(examples.light)); notice('Gesicherter Browserstand konnte nicht geladen werden. Das Beispiel wurde geöffnet.'); }
