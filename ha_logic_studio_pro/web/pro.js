import {makeYaml, validateYaml, readRuleFields, makeRulesJavaScript} from './pro-yaml-model.js';
import {connectLanguage, locales, translate} from './i18n.js';
import {translatePro} from './pro-locales.js';
import {mountCodeEditor} from './vendor/pro-code.js';

const $ = id => document.getElementById(id);
const editor = $('editor');
const studioLayout = $('studio-layout');
const projectSidebar = $('project-sidebar');
const projectSplitter = $('project-splitter');
const projects = new Map();
const openTabs = new Set();
const icons = {yaml: '{ }', rules: 'ϟ', blocks: '', 'blocks-js': '', flow: '', javascript: 'JS', typescript: 'TS'};
const runnable = type => ['javascript', 'typescript', 'blocks-js', 'flow'].includes(type);
const checkpoints = new Map();
const unsavedProjects = new Set();
let flowProjectId, legacyChecked = false;
let runtimeJobs = {};
let runtimeRequest = false;
const runtimeState = id => runtimeJobs[id]?.state ?? 'stopped';
const runtimeActive = id => ['starting', 'running'].includes(runtimeState(id));
let active;
let blocks;
let blocksRender;
let yamlDialogAction;
let flowFrame;
let codeEditor;
let nextId = 0;
let protocolHidden = false;
let protocolRight = false;
let protocolUrl;
let projectFilter;
let projectDraft;
let sortingProjects = false;
let draggedProject;
const collapsedProjectGroups = new Set();
const projectFolders = new Map([['common', 'Allgemeine Skripte'], ['global', 'Globale Skripte'], ['', 'Hauptordner']]);
const projectStorageKey = 'ha-logic-studio-pro-projects-v1';
const recoveryKey = projectStorageKey + '-recovery';
let projectRevision = null;
let pendingSave;
let saveInProgress;
const languageKey = 'ha-logic-studio-pro-language';
let locale = 'de';
let expertMode = false;
try {
  const saved = localStorage.getItem(languageKey);
  if (locales.includes(saved)) locale = saved;
} catch {}

function projectMessage(text) {
  $('project-message').textContent = translatePro(text, locale);
  $('project-message').hidden = !text;
}

const editable = ['name', 'source', 'workspace', 'fields', 'graph', 'autostart'];
function snapshot(project) {
  return structuredClone(Object.fromEntries(editable.map(key => [key, project[key]])));
}

function hasUnsavedChanges(id) {
  const project = projects.get(id);
  const saved = checkpoints.get(id);
  return unsavedProjects.has(id) || Boolean(project && saved &&
    editable.some(key => JSON.stringify(project[key]) !== JSON.stringify(saved[key])));
}

function refreshRuntimeControls(id = active) {
  for (const control of document.querySelectorAll('[data-runtime-project]')) {
    if (control.dataset.runtimeProject !== id) continue;
    if (control.dataset.runtimeRestart === 'true') {
      control.disabled = sortingProjects || runtimeRequest || hasUnsavedChanges(id);
    } else updateEngineControl(control, id);
  }
  if (flowProjectId === id && active === id) sendFlowDiagnosis();
}

function sendFlowDiagnosis() {
  if (flowProjectId !== active) return;
  const job = runtimeJobs[active];
  flowFrame?.contentDocument?.dispatchEvent(new CustomEvent('pro-fbd-diagnosis', {
    detail: job?.state === 'running' && !hasUnsavedChanges(active) ? job.diagnosis : undefined,
  }));
}

function captureFlow() {
  const project = projects.get(flowProjectId);
  const doc = flowFrame?.contentDocument;
  if (!project || !doc?.documentElement.hasAttribute('data-pro-plan-loaded')) return;
  doc.dispatchEvent(new CustomEvent('pro-fbd-read', {detail: ({plan}) => {
    project.graph = {...project.graph, plan};
  }}));
}

function commitEditor(id) {
  const project = projects.get(id);
  if (active === id && project.type === 'flow') captureFlow();
  if (active === id && blocks) project.workspace = blocks.snapshot();
  checkpoints.set(id, snapshot(project));
  unsavedProjects.delete(id);
  const accepted = saveProjects();
  refreshRuntimeControls(id);
  return accepted;
}

function saveProjects() {
  const entries = [...projects].filter(([id]) => !unsavedProjects.has(id)).map(([id, {protocol, running, problem, ...draft}]) =>
    [id, {...draft, ...checkpoints.get(id)}]);
  const tree = {folders: [...projectFolders], projects: entries, expertMode};
  try {
    localStorage.setItem(recoveryKey, JSON.stringify({revision: projectRevision, tree}));
  } catch {
    if (projectRevision === null) {
      projectMessage('Projektbaum konnte nicht gespeichert werden.');
      return false;
    }
  }
  pendingSave = tree;
  void flushProjects();
  return true;
}

function flushProjects() {
  if (saveInProgress) return saveInProgress;
  if (projectRevision === null || !pendingSave) return;
  saveInProgress = writePendingProjects().finally(() => { saveInProgress = undefined; });
  return saveInProgress;
}

async function writePendingProjects() {
  try {
    while (pendingSave) {
      const tree = pendingSave;
      const response = await fetch('./api/pro-projects', {
        method: 'PUT', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({revision: projectRevision, tree}),
      });
      if (response.status === 409) {
        projectRevision = null;
        projectMessage('Der Projektbaum wurde in einem anderen Browser geändert. Sichere den lokalen Entwurf über das Projektmenü.');
        return;
      }
      if (!response.ok) throw new Error('Save failed');
      projectRevision = (await response.json()).revision;
      if (tree === pendingSave) {
        pendingSave = undefined;
        try { localStorage.removeItem(recoveryKey); } catch {}
      } else {
        try { localStorage.setItem(recoveryKey, JSON.stringify({revision: projectRevision, tree: pendingSave})); } catch {}
      }
    }
    projectMessage('');
  } catch {
    projectMessage('Projektbaum konnte nicht auf dem Server gespeichert werden. Der lokale Entwurf ist im Projektmenü verfügbar.');
  }
}

function loadProjectTree(saved) {
    if (!Array.isArray(saved?.folders) || !Array.isArray(saved?.projects)) return;
    expertMode = saved.expertMode === true;
    for (const [id, name] of saved.folders) {
      if (typeof id === 'string' && typeof name === 'string' && !projectFolders.has(id)) projectFolders.set(id, name);
    }
    for (const [id, draft] of saved.projects) {
      if (!/^\d+$/.test(id) || !draft || !Object.hasOwn(icons, draft.type) || typeof draft.name !== 'string') continue;
      projects.set(id, {...draft, folder: projectFolders.has(draft.folder) ? draft.folder : '',
        protocol: [], running: runnable(draft.type) ? false : undefined});
      checkpoints.set(id, snapshot(projects.get(id)));
      nextId = Math.max(nextId, Number(id));
    }
}

async function restoreProjects() {
  let legacy, recovery;
  try { legacy = JSON.parse(localStorage.getItem(projectStorageKey)); } catch {}
  try { recovery = JSON.parse(localStorage.getItem(recoveryKey)); } catch {}
  try {
    const response = await fetch('./api/pro-projects');
    if (!response.ok) throw new Error('Load failed');
    const {revision, tree} = await response.json();
    projectRevision = revision;
    if (recovery?.tree && (recovery.revision === revision || (revision === 0 && recovery.revision === null))) {
      loadProjectTree(recovery.tree);
      saveProjects();
    } else if (tree) {
      loadProjectTree(tree);
      if (recovery?.tree) projectMessage('Ein älterer lokaler Entwurf ist im Projektmenü verfügbar.');
    } else if (legacy?.projects?.length || legacy?.folders?.length > 3) {
      loadProjectTree(legacy);
      saveProjects();
    }
  } catch {
    loadProjectTree(recovery?.tree ?? legacy);
    projectMessage('Projektbaum konnte nicht vom Server geladen werden.');
  }
}

function sidebarBounds() {
  const style = getComputedStyle(studioLayout);
  const min = parseFloat(style.getPropertyValue('--sidebar-min'));
  const max = studioLayout.clientWidth - projectSplitter.offsetWidth - parseFloat(style.getPropertyValue('--editor-min'));
  return [Math.min(min, max), max];
}

let sidebarMeasureFrame;
function scheduleSidebarMeasure() {
  if (sidebarMeasureFrame !== undefined) return;
  sidebarMeasureFrame = requestAnimationFrame(() => {
    sidebarMeasureFrame = undefined;
    const list = $('projects');
    const listLeft = list.getBoundingClientRect().left;
    const range = document.createRange();
    let rowsWidth = 0;
    for (const label of list.querySelectorAll('.project-row-name, summary > span')) {
      const row = label.closest('summary, .project-row');
      const ancestor = row.matches('summary') ? row.parentElement.parentElement : row.parentElement;
      if (ancestor.closest('details:not([open])') || !label.getClientRects().length) continue;
      range.selectNodeContents(label);
      const style = getComputedStyle(label);
      const actions = label.nextElementSibling?.getBoundingClientRect().width ?? 0;
      rowsWidth = Math.max(rowsWidth, label.getBoundingClientRect().left - listLeft +
        range.getBoundingClientRect().width + parseFloat(style.paddingLeft) +
        parseFloat(style.paddingRight) + actions);
    }
    const sidebarStyle = getComputedStyle(projectSidebar);
    const padding = parseFloat(sidebarStyle.paddingLeft) + parseFloat(sidebarStyle.paddingRight);
    const controlsWidth = id => [...$(id).children]
      .filter(child => !child.hidden && child.id !== 'project-menu')
      .reduce((width, child) => width + child.getBoundingClientRect().width, 0);
    const toolbarWidth = Math.max(controlsWidth('project-header'), controlsWidth('project-filters')) + 4;
    const automaticLimit = Math.max(toolbarWidth + padding, studioLayout.clientWidth * 0.5);
    const width = Math.ceil(Math.min(automaticLimit,
      Math.max(toolbarWidth, rowsWidth + list.offsetWidth - list.clientWidth) + padding));
    studioLayout.style.setProperty('--sidebar-min', width + 'px');
    updateSplitterAria();
  });
}

function updateSplitterAria() {
  const [min, max] = sidebarBounds();
  projectSplitter.setAttribute('aria-valuemin', Math.round(min));
  projectSplitter.setAttribute('aria-valuemax', Math.round(max));
  projectSplitter.setAttribute('aria-valuenow', projectSidebar.offsetWidth);
}

function setSidebarWidth(width) {
  const [min, max] = sidebarBounds();
  studioLayout.style.setProperty('--sidebar-width', width <= min ? 'var(--sidebar-min)' : Math.min(max, width) + 'px');
  updateSplitterAria();
}

let sidebarDrag;
projectSplitter.onpointerdown = event => {
  if (event.button !== 0 || sidebarDrag) return;
  sidebarDrag = {pointerId: event.pointerId, x: event.clientX, width: projectSidebar.offsetWidth};
  projectSplitter.setPointerCapture(event.pointerId);
  projectSplitter.dataset.dragging = '';
  studioLayout.dataset.resizing = '';
  projectSplitter.focus();
  event.preventDefault();
};
projectSplitter.onpointermove = event => {
  if (sidebarDrag?.pointerId === event.pointerId) {
    setSidebarWidth(sidebarDrag.width + event.clientX - sidebarDrag.x);
  }
};
projectSplitter.onlostpointercapture = () => {
  sidebarDrag = undefined;
  delete projectSplitter.dataset.dragging;
  delete studioLayout.dataset.resizing;
};
projectSplitter.onkeydown = event => {
  const [min, max] = sidebarBounds();
  const width = projectSidebar.offsetWidth;
  const target = {ArrowLeft: width - 16, ArrowRight: width + 16, Home: min, End: max}[event.key];
  if (target === undefined) return;
  event.preventDefault();
  setSidebarWidth(target);
};
new ResizeObserver(updateSplitterAria).observe(projectSidebar);
new ResizeObserver(scheduleSidebarMeasure).observe(studioLayout);
new MutationObserver(scheduleSidebarMeasure).observe(projectSidebar, {
  childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['open'],
});

function element(tag, text) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(text, action) {
  const node = element('button', text);
  node.type = 'button';
  node.onclick = action;
  return node;
}

function recordProtocol(project, text, error = false, line) {
  if (!text) return;
  if (error) setProjectProblem(project, true);
  const entries = project.protocol;
  const last = entries.at(-1);
  if (last?.text === text && last.error === error && last.line === line) return;
  entries.push({time: new Date().toLocaleTimeString(), text, error, line});
  if (entries.length > 200) entries.shift();
  if (projects.get(active) === project) renderProtocol();
}

function protocolEntries(project) {
  const runtime = runtimeJobs[active]?.messages ?? [];
  return [...(project?.protocol ?? []), ...runtime.map(entry => ({...entry,
    time: new Date(entry.time).toLocaleString(), text: 'Runtime · ' + entry.text}))];
}

function setProjectProblem(project, problem) {
  if (Boolean(project.problem) === problem) return;
  project.problem = problem;
  renderProjectList();
}

function renderProtocol() {
  const project = projects.get(active);
  $('protocol').hidden = !project || protocolHidden;
  $('protocol-show').hidden = !project || !protocolHidden;
  $('editor-layout').dataset.dock = project && !protocolHidden && protocolRight ? 'right' : 'bottom';
  const dock = $('protocol-dock');
  dock.title = protocolRight ? 'Protokoll unten anordnen' : 'Protokoll rechts anordnen';
  dock.setAttribute('aria-label', dock.title);
  dock.innerHTML = protocolRight
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 14h18"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M14 4v16"/></svg>';
  const lines = $('protocol-lines');
  const entries = protocolEntries(project);
  lines.replaceChildren(...entries.map(entry => {
    const line = element('p', `[${entry.time}] ${entry.text}`);
    line.dataset.error = String(entry.error);
    if (codeEditor && entry.error && Number.isInteger(entry.line) && entry.line > 0 &&
        ['javascript', 'typescript'].includes(project?.type)) {
      const label = {de: 'Zeile', en: 'Line', fr: 'Ligne'}[document.documentElement.lang] ?? 'Zeile';
      line.append(' ', button(label + ' ' + entry.line, () => codeEditor?.goToLine(entry.line)));
    }
    return line;
  }));
  if (project && !entries.length) lines.append(element('p', 'Noch keine Protokolleinträge.'));
  lines.scrollTop = lines.scrollHeight;
}

$('protocol-dock').onclick = () => {
  protocolRight = !protocolRight;
  renderProtocol();
};
$('protocol-hide').onclick = () => {
  protocolHidden = true;
  renderProtocol();
  $('protocol-show').focus();
};
$('protocol-show').onclick = () => {
  protocolHidden = false;
  renderProtocol();
  $('protocol-hide').focus();
};
$('protocol-download').href = '#protocol';
$('protocol-download').onclick = event => {
  const project = projects.get(active);
  if (!project) {
    event.preventDefault();
    return;
  }
  if (protocolUrl) URL.revokeObjectURL(protocolUrl);
  const lines = protocolEntries(project).map(({time, text}) => `[${time}] ${text}`);
  protocolUrl = URL.createObjectURL(new Blob(
    [[project.name, ...lines].join('\n') + '\n'], {type: 'text/plain;charset=utf-8'},
  ));
  const link = event.currentTarget;
  link.href = protocolUrl;
  link.download = (project.name.replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'logic-studio') + '.protokoll.txt';
};

function add(project) {
  const id = String(++nextId);
  projects.set(id, {...project, autostart: false, protocol: []});
  unsavedProjects.add(id);
  show(id);
}

const projectFilters = [
  ['running', 'M9 5v14m6-14v14', 'Nur laufende Skripte anzeigen', (_, id) => runtimeActive(id)],
  ['stopped', 'm8 5 12 7-12 7z', 'Nur angehaltene Skripte anzeigen', (project, id) => runnable(project.type) && !runtimeActive(id)],
  ['problem', 'M12 3 2 20h20zM12 9v4m0 3h.01', 'Nur Skripte mit Problemen anzeigen', (project, id) => project.problem === true || runtimeState(id) === 'error'],
  ['blocks', null, 'Nur Blocks A anzeigen'],
  ['blocks-js', null, 'Nur Blocks JS anzeigen'],
  ['javascript', null, 'Nur JavaScript anzeigen'],
  ['typescript', null, 'Nur TypeScript anzeigen'],
  ['rules', null, 'Nur Regeln anzeigen'],
  ['flow', null, 'Nur Funktionspläne anzeigen'],
  ['yaml', null, 'Nur HA-YAML anzeigen'],
];
function scriptTypeButton(type, action) {
  const control = button('', action);
  const icon = element('span', icons[type]);
  icon.className = 'project-type-icon';
  icon.setAttribute('aria-hidden', 'true');
  control.dataset.scriptType = type;
  control.append(icon);
  return control;
}
function projectIconButton(path, label, action) {
  const control = button('', action);
  control.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
  control.title = label;
  control.setAttribute('aria-label', label);
  return control;
}

const editorIcons = {
  locate: 'M12 2v5m0 10v5M2 12h5m10 0h5M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14z',
  restart: 'M20 10a8 8 0 1 0 0 5M20 4v6h-6',
  play: 'M7 4l14 8-14 8z',
  test: 'M8 3h8m-6 0v7l-5 9a1 1 0 0 0 1 2h12a1 1 0 0 0 1-2l-5-9V3M8 15h8',
  step: 'M3 5l10 7-10 7zM18 8v8m-4-4h8',
  preview: 'M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  undo: 'M3 10h10a6 6 0 0 1 6 6M3 10l5-5m-5 5 5 5',
  redo: 'M21 10H11a6 6 0 0 0-6 6m16-6-5-5m5 5-5 5',
  code: 'M8 6l-6 6 6 6m8-12 6 6-6 6',
  time: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4v6l4 2',
  sun: 'M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
  entity: 'M9 5H5v16h14V5h-4m-6-2h6v4H9zm-1 8h8m-8 4h8m-8 3h6',
  assist: 'M4 20l12-12 4 4L8 24M13 11l4 4M19 2v4m-2-2h4M8 4v4M6 6h4',
  export: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  import: 'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5',
  check: 'M4 22V3m0 1c5-4 10 4 16 0v10c-6 4-11-4-16 0',
  tools: 'M14 6l4 4 3-3a6 6 0 0 1-7 8l-7 7-4-4 7-7a6 6 0 0 1 8-8z',
  help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9 9a3 3 0 1 1 3 3v2m0 3h.01',
};

const flowOutputLabels = {
  automation: 'HA-Automation · YAML',
  script: 'HA-Skript · YAML',
  blueprint: 'HA-Blueprint · YAML',
};

function toolIcon(group, icon, label, action) {
  const control = projectIconButton(editorIcons[icon], label, action);
  control.classList.add('editor-icon-button');
  control.disabled = !action;
  group.append(control);
  return control;
}

function expertTools(group, label = 'Expertenwerkzeuge') {
  const tools = element('details');
  tools.className = 'editor-expert-tools';
  const content = element('div');
  content.className = 'editor-tool-group';
  tools.append(element('summary', label), content);
  group.append(tools);
  return content;
}

function updateEngineControl(control, id) {
  const state = runtimeState(id);
  const isRunning = runtimeActive(id);
  const blocked = !isRunning && hasUnsavedChanges(id);
  const label = isRunning ? 'Runtime stoppen' : blocked ? 'Änderungen zuerst speichern oder abbrechen.' : 'In Runtime starten';
  control.dataset.runtimeProject = id;
  control.dataset.projectRun = isRunning ? 'running' : 'stopped';
  control.title = translatePro(label, locale);
  control.setAttribute('aria-label', control.title);
  control.querySelector('path').setAttribute('d', isRunning ? 'M7 5h3v14H7zm7 0h3v14h-3z' : editorIcons.play);
  control.disabled = sortingProjects || runtimeRequest || blocked;
  const status = control.parentElement.querySelector('[data-runtime-status]');
  if (status) status.textContent = {starting: 'Runtime startet …', running: 'Skript läuft',
    stopped: 'Skript läuft nicht', error: 'Runtime-Fehler'}[state];
}

function syncRuntime(next) {
  if (JSON.stringify(runtimeJobs) === JSON.stringify(next)) return;
  const old = runtimeJobs;
  runtimeJobs = next;
  if ([...new Set([...Object.keys(old), ...Object.keys(next)])].some(id => old[id]?.state !== next[id]?.state)) {
    renderProjectList();
    refreshRuntimeControls();
  }
  renderProtocol();
  sendFlowDiagnosis();
}

async function pollRuntime() {
  if (runtimeRequest) return;
  try {
    const response = await fetch('./api/pro-runtime');
    if (response.ok && !runtimeRequest) { syncRuntime(await response.json()); return; }
  } catch {}
  if (!runtimeRequest) syncRuntime(Object.fromEntries(Object.entries(runtimeJobs)
    .map(([id, {diagnosis, ...job}]) => [id, job])));
}

async function controlRuntime(id, command) {
  const project = projects.get(id);
  if (runtimeRequest || !project) return;
  if (command !== 'stop' && hasUnsavedChanges(id)) return;
  runtimeRequest = true;
  try {
    const payload = {id, command};
    if (command !== 'stop') {
      if (unsavedProjects.has(id)) throw new Error('Projekt zuerst auf dem Server speichern.');
      await flushProjects();
      if (projectRevision === null || pendingSave || saveInProgress) throw new Error('Projekt zuerst auf dem Server speichern.');
      payload.revision = projectRevision;
      if (project.type === 'blocks-js') {
        const {generateBlocks} = await import('./vendor/pro-blocks.js');
        const saved = checkpoints.get(id);
        payload.source = generateBlocks(saved.workspace, saved.name);
      }
    }
    const response = await fetch('./api/pro-runtime', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    syncRuntime(result);
  } catch (error) { recordProtocol(project, error.message, true); }
  finally {
    runtimeRequest = false;
    renderProjectList();
    refreshRuntimeControls();
  }
}

void pollRuntime();
setInterval(pollRuntime, 1500);

function editorTools(row, project, {undo, redo} = {}) {
  const left = element('div'), right = element('div');
  left.className = 'editor-tool-group';
  right.className = 'editor-tool-group editor-tool-right';
  row.prepend(left);
  row.append(right);
  toolIcon(left, 'locate', 'Projekt in der Liste zeigen', () => {
    const item = [...$('projects').querySelectorAll('.project-row-name')]
      .find(node => node.getAttribute('aria-current') === 'true');
    for (let parent = item?.parentElement; parent; parent = parent.parentElement) {
      if (parent.tagName === 'DETAILS') parent.open = true;
    }
    item?.scrollIntoView({block: 'nearest'});
    item?.focus({preventScroll: true});
  });
  const unavailable = 'Server-Engine noch nicht verfügbar';
  const id = active;
  const canRun = runnable(project.type);
  const restart = toolIcon(left, 'restart', canRun ? 'Runtime neu starten' : unavailable,
    canRun ? () => controlRuntime(id, 'restart') : undefined);
  const play = toolIcon(left, 'play', unavailable,
    canRun ? () => controlRuntime(id, runtimeActive(id) ? 'stop' : 'start') : undefined);
  play.classList.add('engine-play');
  const status = element('span', 'Skript läuft nicht');
  left.append(status);
  if (canRun) {
    restart.dataset.runtimeProject = id;
    restart.dataset.runtimeRestart = 'true';
    restart.disabled = sortingProjects || runtimeRequest || hasUnsavedChanges(id);
    play.dataset.runtimeControl = '';
    status.dataset.runtimeStatus = '';
    updateEngineControl(play, id);
  }
  if (undo) toolIcon(left, 'undo', 'Rückgängig', undo);
  if (redo) toolIcon(left, 'redo', 'Wiederholen', redo);
  return right;
}

function editorDialog(title, content) {
  const dialog = element('dialog');
  dialog.className = 'editor-tool-dialog';
  const close = button('Schließen', () => dialog.close());
  dialog.append(element('h2', title), content, close);
  dialog.addEventListener('close', () => dialog.remove(), {once: true});
  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}

function showSource(source) {
  const code = element('textarea');
  code.readOnly = true;
  code.value = source;
  code.setAttribute('aria-label', 'Quelltext');
  editorDialog('Quelltext', code);
  code.focus();
  code.select();
}

async function editorEntities(query) {
  const response = await fetch('./api/entities?q=' + encodeURIComponent(query));
  if (!response.ok) throw new Error('HA-Entitäten sind nicht verfügbar.');
  return (await response.json()).items;
}

function openBlockEntity(spec, current, apply, validate) {
  const labels = {
    de: ['Entität auswählen', 'Nach Name oder ID suchen', 'Übernehmen', 'Keine passenden Entitäten.', 'HA-Entitäten sind nicht verfügbar.', 'Passende Entitäts-ID eingeben.'],
    en: ['Choose an entity', 'Search by name or ID', 'Apply', 'No matching entities.', 'HA entities are unavailable.', 'Enter a valid entity ID.'],
    fr: ['Choisir une entité', 'Rechercher par nom ou identifiant', 'Appliquer', 'Aucune entité correspondante.', 'Les entités HA sont indisponibles.', 'Saisissez un identifiant valide.'],
  };
  const attributeLabels = {
    de: ['Attribut auswählen', 'Nach Attribut suchen', 'Übernehmen', 'Keine passenden Attribute.', 'HA-Attribute sind nicht verfügbar.', 'Attributnamen eingeben.'],
    en: ['Choose an attribute', 'Search attributes', 'Apply', 'No matching attributes.', 'HA attributes are unavailable.', 'Enter an attribute name.'],
    fr: ['Choisir un attribut', 'Rechercher un attribut', 'Appliquer', 'Aucun attribut correspondant.', 'Les attributs HA sont indisponibles.', 'Saisissez un nom d’attribut.'],
  };
  const actionLabels = {
    de: ['HA-Aktion auswählen', 'Nach Aktion suchen', 'Übernehmen', 'Keine passenden Aktionen.', 'HA-Aktionen sind nicht verfügbar.', 'Gültige Aktions-ID eingeben.'],
    en: ['Choose an HA action', 'Search actions', 'Apply', 'No matching actions.', 'HA actions are unavailable.', 'Enter a valid action ID.'],
    fr: ['Choisir une action HA', 'Rechercher une action', 'Appliquer', 'Aucune action correspondante.', 'Les actions HA sont indisponibles.', 'Saisissez un identifiant d’action valide.'],
  };
  const pickerLabels = spec.kind === 'attribute' ? attributeLabels : spec.kind === 'action' ? actionLabels : labels;
  const [entityTitle, placeholder, accept, empty, unavailable, invalid] = pickerLabels[locale] ?? pickerLabels.en;
  const title = entityTitle;
  const content = element('div');
  const search = element('input');
  search.type = 'search';
  search.placeholder = placeholder;
  search.setAttribute('aria-label', placeholder);
  const list = element('ul');
  list.style.maxHeight = '45vh';
  list.style.overflowY = 'auto';
  const input = element('input');
  input.value = current;
  input.setAttribute('aria-label', spec.kind ? title : 'entity_id');
  input.oninput = () => input.setCustomValidity('');
  const submit = () => {
    const value = input.value.trim();
    if (!validate(value)) {
      input.setCustomValidity(invalid);
      input.reportValidity();
      return;
    }
    apply(value);
    dialog.close();
  };
  const applyButton = button(accept, submit);
  applyButton.dataset.userText = '';
  content.append(search, list, input, applyButton);
  const dialog = editorDialog(title, content);
  let request, timer;
  const refresh = async () => {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    try {
      const domains = spec.domains?.length ? spec.domains : spec.numeric ? ['sensor', 'input_number', 'number'] : [''];
      const attributeChoices = async () => {
        if (!spec.entity) return [];
        const response = await fetch('./api/entities?' + new URLSearchParams({q: spec.entity}), {signal: controller.signal});
        if (!response.ok) throw new Error(unavailable);
        const entity = (await response.json()).items.find(item => item.entity_id === spec.entity);
        return Object.keys(entity?.attributes ?? {});
      };
      const choices = spec.kind === 'attribute' ? await attributeChoices() :
        spec.loadChoices ? await spec.loadChoices(controller.signal) : spec.choices;
      const pages = choices ? [choices.filter(id => id.toLowerCase().includes(search.value.trim().toLowerCase()))
        .map(id => ({entity_id: id, name: id}))] : await Promise.all(domains.map(async domain => {
        const query = new URLSearchParams({q: search.value.trim(), domain});
        const response = await fetch('./api/entities?' + query, {signal: controller.signal});
        if (!response.ok) throw new Error(unavailable);
        return (await response.json()).items;
      }));
      if (controller.signal.aborted || !dialog.open) return;
      const entities = pages.flat();
      list.replaceChildren(...entities.map(({entity_id, name}) => {
        const item = element('li');
        const choose = button(name === entity_id ? name : name + ' · ' + entity_id, () => {
          if (spec.listOnly || (spec.structured && input.value.trim().startsWith('['))) {
            let existing;
            try { existing = JSON.parse(input.value); } catch {}
            const ids = new Set(Array.isArray(existing) ? existing : []);
            if (ids.has(entity_id)) ids.delete(entity_id);
            else ids.add(entity_id);
            input.value = JSON.stringify([...ids]);
          } else input.value = entity_id;
          input.setCustomValidity('');
        });
        choose.dataset.userText = '';
        item.append(choose);
        return item;
      }));
      if (!entities.length) list.append(element('li', empty));
    } catch {
      if (!controller.signal.aborted && dialog.open) list.replaceChildren(element('li', unavailable));
    }
  };
  search.oninput = () => {
    clearTimeout(timer);
    request?.abort();
    timer = setTimeout(refresh, 150);
  };
  input.onkeydown = event => { if (event.key === 'Enter') submit(); };
  dialog.addEventListener('close', () => { clearTimeout(timer); request?.abort(); });
  search.focus();
  void refresh();
}

function openRuleAction(current, apply) {
  const common = ['homeassistant.turn_on', 'homeassistant.turn_off', 'homeassistant.toggle',
    'input_number.set_value', 'input_text.set_value', 'light.turn_on', 'notify.send_message'];
  let catalog;
  openBlockEntity({kind: 'action', loadChoices: async signal => {
    if (catalog) return catalog;
    const response = await fetch('./api/rules-actions', {signal});
    if (!response.ok) return common;
    const {items} = await response.json();
    catalog = items.length ? items : common;
    return catalog;
  }}, current, apply, value => /^[a-z0-9_]+\.[a-z0-9_]+$/.test(value));
}

async function showSun(project) {
  try {
    const [sun] = (await editorEntities('sun.sun')).filter(item => item.entity_id === 'sun.sun');
    if (!sun) throw new Error('Entität sun.sun ist nicht verfügbar.');
    const rows = element('dl');
    for (const [key, label] of Object.entries({next_rising: 'Nächster Sonnenaufgang',
      next_setting: 'Nächster Sonnenuntergang', next_dawn: 'Nächste Morgendämmerung',
      next_dusk: 'Nächste Abenddämmerung', next_noon: 'Nächster Sonnenhöchststand',
      next_midnight: 'Nächste solare Mitternacht'})) {
      if (sun.attributes[key]) rows.append(element('dt', label),
        element('dd', new Date(sun.attributes[key]).toLocaleString(locale)));
    }
    if (!rows.children.length) rows.append(element('dd', 'Keine Sonnenzeiten verfügbar.'));
    if (projects.get(active) === project) editorDialog('Astronomische Ereignisse', rows);
  } catch (error) { recordProtocol(project, error.message, true); }
}

function debugTools(project) {
  const content = element('div');
  const show = element('label', 'Protokoll anzeigen ');
  const checkbox = element('input');
  checkbox.type = 'checkbox';
  checkbox.checked = !protocolHidden;
  checkbox.onchange = () => { protocolHidden = !checkbox.checked; renderProtocol(); };
  show.append(checkbox);
  content.append(show, button('Protokoll leeren', () => {
    project.protocol.length = 0;
    renderProtocol();
  }));
  editorDialog('Debug-Einstellungen', content);
}

function exportEditorData(name, data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
  const link = element('a');
  link.href = url;
  link.download = name.replace(/[^\p{L}\p{N}_-]+/gu, '_') + '.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importEditorData(project, parse) {
  const input = element('input');
  input.type = 'file';
  input.accept = '.json,.js,.txt,.xml';
  input.onchange = async () => {
    try {
      const [file] = input.files;
      if (!file || projects.get(active) !== project) return;
      if (file.size > 1_000_000) throw new Error('Datei zu groß.');
      const data = await parse(await file.text(), file.name);
      if (projects.get(active) === project && data) add(data);
    } catch (error) { recordProtocol(project, error.message, true); }
  };
  input.click();
}

function reviewIoBrokerImport(name, workspace) {
  const replacements = new Map([
    ['exec', 'Shell-Befehl durch eine konfigurierte HA-Aktion ersetzen.'],
    ['http_get', 'HTTP-Aufruf als HA-REST-Befehl konfigurieren und Antwortverarbeitung prüfen.'],
    ['http_post', 'HTTP-Aufruf als HA-REST-Befehl konfigurieren und Antwortverarbeitung prüfen.'],
    ['get_value_async', 'HA-Zustand im Block „Zustand lesen“ abfragen und den bisherigen Callback als Folgeblöcke einfügen.'],
  ]);
  const missing = new Map();
  const messageNotes = [];
  const sources = new Set();
  let dynamicIds = 0;
  function inspect(block) {
    if (!block) return;
    const message = block.fields?.MESSAGE ?? 'customMessage';
    if (block.type === 'ha_js_script_message_request') {
      messageNotes.push('sendto_otherscript (' + message + ') — ' + translatePro('Empfangsadresse und Antwortverarbeitung prüfen. Ohne Antwort meldet der Block einen Timeout.', locale));
    } else if (block.type === 'ha_js_script_message_dynamic') {
      messageNotes.push('sendto_otherscript (' + message + ') — ' + translatePro('Der Zielausdruck muss die Empfangsadresse des Studio-Skripts liefern.', locale));
    } else if (block.type === 'ha_js_script_message_receive') {
      messageNotes.push('onMessage (' + message + ') — ' + translatePro('Empfangsadresse eintragen, die der Sender verwendet.', locale));
    }
    const metadata = block.extraState;
    if (block.type === 'iob_get_dynamic_value') dynamicIds++;
    if (block.type === 'iob_placeholder') {
      const type = metadata?.type ?? '?';
      missing.set(type, (missing.get(type) ?? 0) + 1);
    }
    for (const source of [metadata?.source, ...(metadata?.sources ?? [])]) {
      if (typeof source === 'string' && source) sources.add(source);
    }
    for (const input of Object.values(block.inputs ?? {})) inspect(input.block ?? input.shadow);
    inspect(block.next?.block);
  }
  workspace.blocks.blocks.forEach(inspect);
  const content = element('div');
  function section(title, entries, empty) {
    content.append(element('h3', title));
    if (!entries.length) {
      content.append(element('p', empty));
      return;
    }
    const list = element('ul');
    entries.forEach(entry => list.append(element('li', entry)));
    content.append(list);
  }
  section('Nicht unterstützte Blöcke', [...missing].sort().map(([type, count]) => type + ' × ' + count),
    'Keine nicht unterstützten Blöcke gefunden.');
  if (missing.size || messageNotes.length) {
    section('Nötige Codeanpassungen', [...missing.keys()].sort().map(type =>
      type + ' — ' + translatePro(replacements.get(type) ?? 'Platzhalter durch einen passenden Blocks-JS-Block ersetzen und Anschlüsse prüfen.', locale)).concat(messageNotes));
  }
  section('ioBroker-IDs zur Zuordnung', [...sources].sort(), 'Keine festen ioBroker-IDs zur Zuordnung gefunden.');
  if (dynamicIds) {
    content.append(element('h3', 'Berechnete ioBroker-IDs'),
      element('p', translatePro('Betroffene Blöcke', locale) + ' (' + dynamicIds + ')'),
      element('p', 'Hinterlege im Feld ID-Zuordnung (JSON) für jede mögliche ioBroker-ID die passende HA-Entität.'));
  }
  content.append(element('p', 'Ersetze Platzhalter und ordne die ioBroker-IDs in den Blöcken zu. Prüfe anschließend den erzeugten JavaScript-Code.'));
  content.append(button('Als Projekt öffnen', () => {
    dialog.close();
    add({type: 'blocks-js', name, workspace});
  }));
  const dialog = editorDialog('ioBroker-Import prüfen', content);
}
const filterControls = element('div');
filterControls.className = 'project-filter-controls';
for (const [id, path, label, matches = project => project.type === id] of projectFilters) {
  const toggleFilter = () => {
    projectFilter = projectFilter?.id === id ? undefined : {id, matches};
    renderProjectList();
  };
  const filter = path ? projectIconButton(path, label, toggleFilter) : scriptTypeButton(id, toggleFilter);
  filter.title = label;
  filter.setAttribute('aria-label', label);
  filter.dataset.filter = id;
  filterControls.append(filter);
}
function setAllProjectGroups(open) {
  collapsedProjectGroups.clear();
  if (!open) {
    for (const folder of projectFolders.keys()) collapsedProjectGroups.add(folder);
  }
  $('projects').querySelectorAll('details').forEach(group => {
    group.open = open;
  });
}
const treeControls = element('div');
treeControls.className = 'project-tree-controls';
treeControls.append(
  projectIconButton('m8 9 4-4 4 4m-8 6 4 4 4-4', 'Alles aufklappen', () => setAllProjectGroups(true)),
  projectIconButton('m8 5 4 4 4-4m-8 14 4-4 4 4', 'Alles einklappen', () => setAllProjectGroups(false)),
);
$('project-filters').append(filterControls, treeControls);

const projectMenu = $('project-menu');
const expertModeControl = $('expert-mode');
function syncExpertMode() {
  expertModeControl.checked = expertMode;
  studioLayout.toggleAttribute('data-expert-mode', expertMode);
}
expertModeControl.onchange = () => {
  expertMode = expertModeControl.checked;
  if (!saveProjects()) expertMode = !expertMode;
  syncExpertMode();
};
const searchProjects = $('project-search');
const menuControl = projectIconButton('M12 5h.01m0 7h.01m0 7h.01', 'Projektmenü', () => {
  projectMenu.hidden = !projectMenu.hidden;
  menuControl.setAttribute('aria-expanded', String(!projectMenu.hidden));
});
menuControl.setAttribute('aria-expanded', 'false');
menuControl.setAttribute('aria-controls', 'project-menu');
const newProjectControl = projectIconButton('M12 5v14M5 12h14', 'Neues Projekt', () => {
  $('project-dialog').returnValue = '';
  $('project-dialog').showModal();
});
const folderControl = projectIconButton('M3 7h7l2 2h9v11H3zM12 11v6m-3-3h6', 'Neuen Ordner erstellen', () => {
  openFolderDialog();
});
$('project-actions').append(menuControl, newProjectControl, folderControl);

const sortControl = projectIconButton('M8 20V4m-4 4 4-4 4 4m4-4v16m-4-4 4 4 4-4', 'Projekte sortieren', () => {
  if (sortingProjects && !saveProjects()) return;
  sortingProjects = !sortingProjects;
  sortControl.setAttribute('aria-pressed', String(sortingProjects));
  sortControl.title = sortingProjects ? 'Sortierung speichern' : 'Projekte sortieren';
  sortControl.setAttribute('aria-label', sortControl.title);
  projectMessage(sortingProjects ? 'Skripte ziehen und mit den roten Pfeilen speichern.' : '');
  renderProjectList();
});
sortControl.dataset.sort = '';
sortControl.setAttribute('aria-pressed', 'false');
const searchControl = projectIconButton('M21 21l-5-5m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z', 'Projekte suchen', () => {
  searchProjects.hidden = !searchProjects.hidden;
  searchControl.setAttribute('aria-expanded', String(!searchProjects.hidden));
  if (searchProjects.hidden) searchProjects.value = '';
  else searchProjects.focus();
  renderProjectList();
});
searchControl.setAttribute('aria-expanded', 'false');
searchControl.setAttribute('aria-controls', 'project-search');
$('project-view-actions').append(sortControl, searchControl);
const languageButtons = locales.map((value, index) => {
  const control = button(value.toUpperCase(), () => language.changeLanguage(value));
  control.setAttribute('aria-label', ['Deutsch', 'English', 'Français'][index]);
  return control;
});
$('project-languages').append(...languageButtons);

function syncLanguage() {
  languageButtons.forEach((control, index) => {
    control.setAttribute('aria-pressed', String(locales[index] === locale));
  });
  const doc = flowFrame?.contentDocument;
  if (doc) doc.dispatchEvent(new CustomEvent('pro-language', {detail: locale}));
}
searchProjects.oninput = renderProjectList;

function projectDropTarget(node, folder, before) {
  node.ondragover = event => {
    if (!draggedProject) return;
    event.stopPropagation();
    if (draggedProject === before) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    node.dataset.dropTarget = '';
  };
  node.ondragleave = () => delete node.dataset.dropTarget;
  node.ondrop = event => {
    if (!draggedProject) return;
    event.preventDefault();
    event.stopPropagation();
    if (draggedProject === before) return;
    const id = draggedProject;
    const project = projects.get(id);
    project.folder = folder;
    const ordered = [...projects].filter(([other]) => other !== id);
    const index = before ? ordered.findIndex(([other]) => other === before) : -1;
    ordered.splice(index < 0 ? ordered.length : index, 0, [id, project]);
    projects.clear();
    for (const entry of ordered) projects.set(...entry);
    draggedProject = undefined;
    renderProjectList();
  };
}

function projectButton(id, project) {
  const item = scriptTypeButton(project.type, () => show(id));
  item.append(document.createTextNode(' ' + project.name));
  item.setAttribute('aria-current', String(active === id));
  return item;
}

function projectRow(id, project) {
  const row = element('div');
  row.className = 'project-row';
  const name = projectButton(id, project);
  name.className = 'project-row-name';
  name.dataset.userText = '';
  name.title = project.name;
  const actions = element('div');
  actions.className = 'project-row-actions';
  if (runnable(project.type)) {
    const run = projectIconButton(editorIcons.play, 'In Runtime starten', () => controlRuntime(id, runtimeActive(id) ? 'stop' : 'start'));
    actions.append(run);
    updateEngineControl(run, id);
  }
  const remove = projectIconButton('M9 3h6l1 2h5v2H3V5h5zm-4 6h14l-1 12H6z', 'Projekt löschen: ' + project.name, () => {
    if (!window.confirm('Projekt „' + project.name + '“ löschen?')) return;
    closeTab(id);
    projects.delete(id);
    checkpoints.delete(id);
    unsavedProjects.delete(id);
    saveProjects();
    renderNavigation();
  });
  remove.dataset.projectDelete = '';
  // The embedded Funktionsplan has its own stored workspace.
  remove.disabled = sortingProjects || project.type === 'flow' || Boolean(project.running) || runtimeActive(id);
  const open = projectIconButton('M6 4h15v16H6v-4m0-8V4M2 12h13m-4-4 4 4-4 4', 'Projekt öffnen: ' + project.name, () => show(id));
  open.disabled = sortingProjects;
  actions.append(remove, open);
  row.append(name, actions);
  return {row, name};
}

function renderProjectList() {
  for (const filter of $('project-filters').querySelectorAll('[data-filter]')) {
    filter.setAttribute('aria-pressed', String(filter.dataset.filter === projectFilter?.id));
  }
  const query = searchProjects.value.trim().toLocaleLowerCase();
  const visible = [...projects].filter(([id, project]) => sortingProjects ||
    ((!projectFilter || projectFilter.matches(project, id)) && project.name.toLocaleLowerCase().includes(query)));
  const list = $('projects');
  list.replaceChildren();
  let rootGroup;
  for (const [folder, name] of projectFolders) {
    const entries = visible.filter(([, project]) => (project.folder || '') === folder);
    const hasVisibleChild = folder === '' && visible.some(([, project]) =>
      project.folder && project.folder !== 'common' && project.folder !== 'global');
    if (!entries.length && !hasVisibleChild && !sortingProjects && (projectFilter || query)) continue;
    const group = element('details');
    group.open = sortingProjects || Boolean(query) || !collapsedProjectGroups.has(folder);
    group.ontoggle = () => {
      if (!sortingProjects && !query) {
        if (group.open) collapsedProjectGroups.delete(folder);
        else collapsedProjectGroups.add(folder);
      }
    };
    const summary = element('summary');
    summary.innerHTML = '<svg class="project-folder-icon" viewBox="0 0 24 24" aria-hidden="true"><path class="folder-closed" d="M3 5h7l2 2h9v12H3z"/><path class="folder-open" d="M3 19V5h7l2 2h7v3M3 19l3-9h16l-3 9z"/></svg>';
    const folderLabel = element('span', name);
    folderLabel.title = name;
    if (folder && folder !== 'common' && folder !== 'global') folderLabel.dataset.userText = '';
    if (folder === 'common' || folder === 'global') folderLabel.className = 'folder-label-' + folder;
    summary.append(folderLabel);
    if (folder && folder !== 'common' && folder !== 'global') {
      const rename = projectIconButton('M4 16v4h4L20 8l-4-4zM14 6l4 4',
        translatePro('Ordner umbenennen', locale), event => {
          event.preventDefault();
          openFolderDialog(folder);
        });
      rename.className = 'project-folder-rename';
      rename.disabled = sortingProjects;
      summary.append(rename);
    }
    group.append(summary);
    if (sortingProjects) projectDropTarget(group, folder);
    for (const [id, project] of entries) {
      const {row, name: item} = projectRow(id, project);
      if (sortingProjects) {
        item.draggable = true;
        item.ondragstart = event => {
          draggedProject = id;
          event.dataTransfer.setData('text/plain', project.name);
          event.dataTransfer.effectAllowed = 'move';
        };
        item.ondragend = () => {
          draggedProject = undefined;
          list.querySelectorAll('[data-drop-target]').forEach(target => delete target.dataset.dropTarget);
        };
        projectDropTarget(row, folder, id);
      }
      group.append(row);
    }
    if (folder === '') rootGroup = group;
    const isCustomFolder = folder && folder !== 'common' && folder !== 'global';
    (isCustomFolder && rootGroup ? rootGroup : list).append(group);
  }
  if (!sortingProjects && (projectFilter || query) && !visible.length) {
    const emptyFilter = element('p', 'Keine passenden Projekte.');
    emptyFilter.className = 'empty-project-filter';
    list.append(emptyFilter);
  }
}

function renderNavigation() {
  renderProjectList();
  $('tabs').replaceChildren(...Array.from(openTabs, id => {
    const project = projects.get(id);
    const tab = element('div');
    tab.className = 'project-tab';
    const close = button('×', () => closeTab(id));
    close.setAttribute('aria-label', project.name + ' schließen');
    const tabButton = projectButton(id, project);
    tabButton.dataset.userText = '';
    tab.append(tabButton, close);
    return tab;
  }));
  const current = $('tabs').querySelector('[aria-current="true"]');
  current?.scrollIntoView({block: 'nearest', inline: 'nearest'});
}

function leaveEditor() {
  captureFlow();
  codeEditor?.destroy();
  codeEditor = undefined;
  blocksRender = undefined;
  if (blocks) {
    projects.get(active).workspace = blocks.snapshot();
    blocks.dispose();
    blocks = undefined;
  }
  if (flowFrame) flowFrame.hidden = true;
  editor.querySelector('.project-panel')?.remove();
}

function closeTab(id) {
  openTabs.delete(id);
  if (active === id) {
    const next = [...openTabs].at(-1);
    if (next) {
      show(next);
      return;
    }
    leaveEditor();
    active = undefined;
    editor.append(empty);
    renderProtocol();
  }
  renderNavigation();
}

function show(id, refresh = false) {
  if (active === id && !refresh) return;
  leaveEditor();
  empty.remove();
  openTabs.add(id);
  active = id;
  renderNavigation();
  renderProtocol();
  const project = projects.get(id);
  if (!checkpoints.has(id)) checkpoints.set(id, snapshot(project));
  if (project.type === 'flow') {
    const panel = element('section');
    panel.className = 'project-panel flow-tools';
    editor.prepend(panel);
    const childClick = id => flowFrame?.contentDocument?.getElementById(id)?.click();
    const right = editorTools(toolbar(panel, project), project, {
      undo: () => childClick('undo'), redo: () => childClick('redo'),
    });
    const simulation = element('div');
    simulation.className = 'editor-tool-group';
    simulation.setAttribute('role', 'group');
    simulation.setAttribute('aria-label', 'Simulation');
    right.before(simulation);
    toolIcon(simulation, 'test', '▶ Simulation', () => childClick('simulate'));
    toolIcon(simulation, 'step', 'Simulation +1 s', () => childClick('simulation-advance'));
    toolIcon(simulation, 'step', 'Einzelschritt', () =>
      flowFrame?.contentDocument?.dispatchEvent(new Event('pro-fbd-step')));
    toolIcon(simulation, 'restart', 'Simulation zurücksetzen', () => childClick('simulation-reset'));
    right.append(button('Automatisch anordnen', () =>
      flowFrame?.contentDocument?.dispatchEvent(new Event('pro-fbd-arrange'))));
    const expert = expertTools(right, 'Diagnose und Ausführung');
    toolIcon(expert, 'sun', 'Astronomische Ereignisse', () => showSun(project));
    expert.append(button('FBD → JS', () => {
      flowFrame?.contentDocument?.dispatchEvent(new CustomEvent('pro-export-js', {detail: {
        success: showSource,
        failure: error => recordProtocol(project, error, true),
      }}));
    }));
    toolIcon(expert, 'tools', 'Debug-Einstellungen', () => debugTools(project));
    const output = element('select');
    output.className = 'flow-output';
    output.setAttribute('aria-label', 'Ausgabe');
    output.disabled = true;
    output.onchange = () => {
      const target = flowFrame?.contentDocument?.getElementById('target');
      if (!target || target.value === output.value) return;
      target.value = output.value;
      target.dispatchEvent(new Event('change', {bubbles: true}));
    };
    right.append(output);
    const mode = element('select');
    for (const [value, label] of [['auto', 'Automatisch'], ['cycle', 'Fester Zyklus']]) {
      const option = element('option', label);
      option.value = value;
      mode.append(option);
    }
    mode.setAttribute('aria-label', 'FBD-Ausführung');
    const memoryOption = element('label');
    memoryOption.className = 'editor-autostart';
    const memoryToggle = element('input');
    memoryToggle.type = 'checkbox';
    memoryToggle.checked = project.graph?.retainMemory === true;
    memoryToggle.onchange = () => {
      project.graph = {...project.graph, retainMemory: memoryToggle.checked};
      refreshRuntimeControls(id);
    };
    memoryOption.append(memoryToggle, element('span', 'Zähler und Merker speichern'));
    expert.append(memoryOption);
    const interval = element('input');
    interval.type = 'number';
    interval.min = '100';
    interval.max = '60000';
    interval.setAttribute('aria-label', 'Zyklus in Millisekunden');
    mode.value = project.graph?.mode ?? 'auto';
    interval.value = project.graph?.interval ?? 200;
    interval.hidden = mode.value !== 'cycle';
    mode.onchange = interval.onchange = () => {
      interval.hidden = mode.value !== 'cycle';
      project.graph = {...project.graph, mode: mode.value, interval: Number(interval.value)};
      refreshRuntimeControls(id);
    };
    expert.append(mode, interval);
    toolIcon(right, 'preview', 'Ausgabe ansehen', () => childClick('export'));
    const syncOutput = () => {
      const control = editor.querySelector('.flow-output');
      const target = flowFrame?.contentDocument?.getElementById('target');
      if (!control || !target) return;
      if (!control.options.length) {
        for (const option of target.options) {
          const label = flowOutputLabels[option.value];
          if (!label) continue;
          const copy = element('option', label);
          copy.value = option.value;
          control.append(copy);
        }
      }
      control.value = target.value;
      control.disabled = false;
    };
    let flowLoaded = false;
    const loadFlow = () => {
      const doc = flowFrame.contentDocument;
      if (flowLoaded || !doc?.documentElement.hasAttribute('data-embedded-pro')) return;
      flowLoaded = true;
      if (!legacyChecked && !project.graph.plan) {
        doc.dispatchEvent(new CustomEvent('pro-fbd-read', {detail: ({plan}) => {
          if (plan.blocks.length) project.graph.plan = plan;
        }}));
      }
      legacyChecked = true;
      doc.documentElement.setAttribute('data-pro-plan-loaded', '');
      doc.dispatchEvent(new CustomEvent('pro-fbd-load', {detail: project.graph.plan}));
      flowProjectId = id;
      sendFlowDiagnosis();
    };
    if (flowFrame && flowProjectId !== id) {
      flowFrame.remove();
      flowFrame = undefined;
      flowProjectId = undefined;
    }
    if (!flowFrame) {
      flowFrame = element('iframe');
      flowProjectId = id;
      flowFrame.title = 'Funktionsplan';
      flowFrame.src = './funktionsplan.html?v=0.1.63&pro=' + locale;
      flowFrame.addEventListener('pro-fbd-ready', () => { loadFlow(); syncOutput(); syncLanguage(); });
      flowFrame.addEventListener('load', () => {
        const doc = flowFrame.contentDocument;
        loadFlow();
        doc?.addEventListener('pro-fbd-render', () => {
          syncOutput();
          if (flowLoaded && active === id) {
            captureFlow();
            refreshRuntimeControls(id);
          }
        });
        syncOutput();
        const bottom = doc?.getElementById('bottom');
        if (bottom) bottom.hidden = true;
        for (const id of ['status', 'issues']) {
          const node = doc?.getElementById(id);
          if (!node) continue;
          let previous;
          const sync = () => {
            const current = node.textContent.trim();
            if (current === previous) return;
            previous = current;
            const success = 'Grundprüfung erfolgreich. Ausgabevorschau vor Verwendung kontrollieren.';
            const problem = id === 'issues' && Boolean(current) &&
              !locales.some(value => current === translate(success, value));
            if (id === 'issues') setProjectProblem(project, problem);
            recordProtocol(project, current, problem);
          };
          new MutationObserver(sync).observe(node, {childList: true, characterData: true, subtree: true});
          sync();
        }
        syncLanguage();
      });
      editor.append(flowFrame);
    }
    flowFrame.hidden = false;
    loadFlow();
    syncOutput();
    return;
  }
  const panel = element('section');
  panel.className = 'project-panel';
  editor.append(panel);
  if (project.type === 'yaml') renderYaml(panel, project);
  if (project.type === 'rules') renderRules(panel, project);
  if (project.type === 'blocks' || project.type === 'blocks-js') renderBlocks(panel, project, id);
  if (project.type === 'javascript' || project.type === 'typescript') renderJavaScript(panel, project);
}

function toolbar(panel, project) {
  const row = element('div');
  row.className = 'editor-toolbar';
  const name = element('input');
  name.value = project.name;
  name.maxLength = 100;
  name.setAttribute('aria-label', 'Projektname');
  name.onchange = () => {
    project.name = name.value.trim() || project.name;
    name.value = project.name;
    renderNavigation();
    refreshRuntimeControls();
  };
  row.append(name);
  const id = active;
  if (['javascript', 'typescript', 'flow'].includes(project.type)) {
    const label = element('label');
    label.className = 'editor-autostart';
    const toggle = element('input');
    toggle.type = 'checkbox';
    toggle.checked = project.autostart === true;
    toggle.onchange = () => {
      project.autostart = toggle.checked;
      refreshRuntimeControls(id);
    };
    label.append(toggle, element('span', 'Beim Start der App ausführen'));
    row.append(label);
  }
  const save = button('Speichern', () => commitEditor(id));
  const cancel = button('Abbrechen', () => {
    if (unsavedProjects.has(id)) {
      closeTab(id);
      unsavedProjects.delete(id);
      checkpoints.delete(id);
      projects.delete(id);
      if (flowProjectId === id) {
        flowFrame?.remove();
        flowFrame = undefined;
        flowProjectId = undefined;
      }
      renderNavigation();
      return;
    }
    const saved = checkpoints.get(id);
    if (!saved) return;
    leaveEditor();
    flowFrame?.remove();
    flowFrame = undefined;
    flowProjectId = undefined;
    Object.assign(project, structuredClone(saved));
    show(id, true);
  });
  save.className = 'editor-commit';
  cancel.className = 'editor-discard';
  row.append(save, cancel);
  panel.append(row);
  return row;
}

function sourceArea(panel, project, label, onEdit) {
  const area = element('textarea');
  area.className = 'yaml-source';
  area.spellcheck = false;
  area.setAttribute('aria-label', label);
  area.value = project.source;
  area.oninput = () => {
    project.source = area.value;
    onEdit?.();
  };
  panel.append(area);
  return area;
}

function download(filename, content) {
  const type = filename.endsWith('.json') ? 'application/json' : 'application/yaml';
  const url = URL.createObjectURL(new Blob([content], {type: type + ';charset=utf-8'}));
  const link = element('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function renderYaml(panel, project) {
  const row = toolbar(panel, project);
  const label = project.kind === 'script' ? 'HA-Skript' : 'HA-Automation';
  row.append(element('strong', label));
  const report = (text, error) => recordProtocol(project, text, error);
  const check = () => {
    try {
      const count = validateYaml(project.source, project.kind);
      setProjectProblem(project, false);
      report(`YAML-Syntax und Grundstruktur gültig (${count} Eintrag/Einträge).`);
      return true;
    } catch (error) {
      report(error.message, true);
      return false;
    }
  };
  row.append(button('Prüfen', check), button('Exportieren', () => {
    if (check()) {
      const name = project.name.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 180) || 'logic-studio';
      download(name + '.' + project.kind + '.yaml', project.source);
    }
  }));
  sourceArea(panel, project, label + ' YAML', () => report('Bearbeitet. Vor dem Export prüfen.'));
}

function chooseYaml(title, callback) {
  $('yaml-title').textContent = title;
  yamlDialogAction = callback;
  $('yaml-dialog').returnValue = '';
  $('yaml-dialog').showModal();
}

function openGenerated(project, read, report) {
  chooseYaml('Als HA-YAML öffnen', kind => {
    try {
      const source = makeYaml({name: project.name, kind, ...read()});
      validateYaml(source, kind);
      setProjectProblem(project, false);
      add({type: 'yaml', name: project.name + ' · YAML', kind, source});
    } catch (error) {
      report(error.message, true);
    }
  });
}

function renderRules(panel, project) {
  const row = toolbar(panel, project);
  const report = (text, error) => recordProtocol(project, text, error);
  const form = element('div');
  form.className = 'rule-form';
  const fields = project.fields ||= {};
  const wording = {
    de: ['Assistent', 'Regel Schritt für Schritt erstellen', 'Löst aus', 'Bedingungen', 'Aktionen', 'Übersicht', 'Zurück', 'Weiter', 'Übernehmen', 'Abbrechen', 'Zustand', 'Zeitplan', 'HA-Ereignis', 'Entität', 'Ziel-Entität', 'Uhrzeit', 'Ereignistyp', 'HA-Aktion', 'FALLS', 'UND', 'DANN', 'SONST', 'ohne Bedingung', 'Auswählen'],
    en: ['Wizard', 'Create a rule step by step', 'Trigger', 'Conditions', 'Actions', 'Review', 'Back', 'Next', 'Apply', 'Cancel', 'State', 'Schedule', 'HA event', 'Entity', 'Target entity', 'Time', 'Event type', 'HA action', 'WHEN', 'AND', 'THEN', 'ELSE', 'no condition', 'Choose'],
    fr: ['Assistant', 'Créer une règle étape par étape', 'Déclencheur', 'Conditions', 'Actions', 'Récapitulatif', 'Retour', 'Suivant', 'Appliquer', 'Annuler', 'État', 'Horaire', 'Événement HA', 'Entité', 'Entité cible', 'Heure', 'Type d’événement', 'Action HA', 'QUAND', 'ET', 'ALORS', 'SINON', 'sans condition', 'Choisir'],
  };
  const [wizard, title, triggerStep, conditionStep, actionStep, review, back, next, apply, cancel,
    status, schedule, event, entity, target, time, eventType, service, when, and, then, otherwise, empty, choose] =
    wording[locale] ?? wording.en;
  const ruleLabels = {triggers: when, conditions: and, actions: then, elseActions: otherwise};
  const triggerKinds = [['state', status, 'ϟ'], ['time', schedule, '◷'], ['event', event, '✉']];
  const [from, to, attribute, hold, numeric, above, below, delay, seconds, parameters, actionType] = ({
    de: ['Von', 'Nach', 'Attribut (optional)', 'Mindestdauer (Sekunden)', 'Zahlenwert', 'Über', 'Unter', 'Verzögerung', 'Sekunden', 'Parameter (JSON)', 'Schritttyp'],
    en: ['From', 'To', 'Attribute (optional)', 'Minimum duration (seconds)', 'Numeric state', 'Above', 'Below', 'Delay', 'Seconds', 'Parameters (JSON)', 'Step type'],
    fr: ['De', 'À', 'Attribut (facultatif)', 'Durée minimale (secondes)', 'État numérique', 'Au-dessus de', 'En dessous de', 'Délai', 'Secondes', 'Paramètres (JSON)', 'Type d’étape'],
  })[locale] ?? ['From', 'To', 'Attribute (optional)', 'Minimum duration (seconds)', 'Numeric state', 'Above', 'Below', 'Delay', 'Seconds', 'Parameters (JSON)', 'Step type'];
  const [remove, addItem, all, any, none] = ({
    de: ['Entfernen', 'Hinzufügen', 'Alle (UND)', 'Mindestens eine (ODER)', 'Keine (NICHT)'],
    en: ['Remove', 'Add', 'All (AND)', 'At least one (OR)', 'None (NOT)'],
    fr: ['Supprimer', 'Ajouter', 'Toutes (ET)', 'Au moins une (OU)', 'Aucune (NON)'],
  })[locale] ?? ['Remove', 'Add', 'All (AND)', 'At least one (OR)', 'None (NOT)'];
  let rules = readRuleFields(fields);
  let category = 'triggers';
  const update = () => { project.fields = rules; };
  function append(data, key, kind = 'state') {
    const entry = key === 'triggers' ? {type: kind} : {};
    data[key].push(entry);
    return entry;
  }
  function group(key, data, refresh, changed, allowAdd) {
    const fieldset = element('fieldset');
    fieldset.dataset.ruleGroup = {triggers: 'trigger', conditions: 'condition', actions: 'then', elseActions: 'else'}[key];
    fieldset.append(element('legend', ruleLabels[key]));
    if (key === 'conditions' && !data[key].length) fieldset.append(element('small', empty));
    if (key === 'conditions' && data[key].length) {
      const select = element('select');
      select.setAttribute('aria-label', conditionStep);
      for (const [value, label] of [['and', all], ['or', any], ['not', none]]) {
        const option = element('option', label);
        option.value = value;
        select.append(option);
      }
      select.value = data.conditionMode;
      select.onchange = () => { data.conditionMode = select.value; changed(); };
      fieldset.append(select);
    }
    for (const [index, entry] of data[key].entries()) {
      const inputs = element('div');
      inputs.className = 'rule-inputs';
      const isAction = key === 'actions' || key === 'elseActions';
      if (key === 'conditions' || isAction) {
        const caption = element('label', isAction ? actionType : conditionStep);
        const select = element('select');
        const options = isAction ? [['action', service], ['delay', delay]] : [['state', status], ['numeric', numeric]];
        for (const [value, name] of options) {
          const option = element('option', name);
          option.value = value;
          select.append(option);
        }
        select.value = entry.type || options[0][0];
        select.onchange = () => { entry.type = select.value; changed(); refresh(); };
        caption.append(select);
        inputs.append(caption);
      }
      let labels;
      if (key === 'triggers') {
        if (entry.type === 'time') labels = [['time', time]];
        else if (entry.type === 'event') labels = [['event', eventType]];
        else labels = [['entity', entity], ['attribute', attribute], ['from', from], ['state', to], ['seconds', hold]];
      } else if (key === 'conditions') {
        labels = [['entity', entity], ['attribute', attribute],
          ...(entry.type === 'numeric' ? [['above', above], ['below', below]] : [['state', status]])];
      } else {
        labels = entry.type === 'delay' ? [['seconds', seconds]] : [['action', service], ['entity', target], ['data', parameters]];
      }
      for (const [name, caption] of labels) {
        const label = element('label', caption);
        const input = element(name === 'data' ? 'textarea' : 'input');
        input.value = entry[name] || '';
        if (name === 'time') input.type = 'time';
        if (name === 'seconds') { input.type = 'number'; input.min = '1'; input.step = '1'; }
        if (name === 'above' || name === 'below') { input.type = 'number'; input.step = 'any'; }
        if (name === 'data') { input.rows = 2; input.placeholder = '{}'; }
        input.oninput = () => { entry[name] = input.value.trim(); changed(); };
        const line = element('span');
        line.append(input);
        if (name === 'action') {
          line.append(button(choose, () => openRuleAction(input.value, value => {
            input.value = value;
            input.oninput();
          })));
        }
        if (name === 'entity' || name === 'attribute') {
          line.append(button(choose, () => openBlockEntity(
            name === 'attribute' ? {kind: 'attribute', entity: entry.entity} : {}, input.value, value => {
            input.value = value;
            input.oninput();
          }, value => name === 'attribute' ? Boolean(value) : /^[a-z0-9_]+\.[a-z0-9_]+$/.test(value))));
        }
        label.append(line);
        inputs.append(label);
      }
      const deleteItem = button('×', () => {
        data[key].splice(index, 1);
        changed();
        refresh();
      });
      deleteItem.className = 'rule-remove';
      deleteItem.setAttribute('aria-label', remove + ' ' + (index + 1));
      inputs.append(deleteItem);
      fieldset.append(inputs);
    }
    if (allowAdd) {
      const choices = key === 'triggers' ? triggerKinds : [[null, addItem, '+']];
      const controls = element('div');
      controls.className = 'rule-inline';
      for (const [kind, label, icon] of choices) {
        controls.append(button(icon + ' ' + label, () => {
          append(data, key, kind);
          changed();
          refresh();
        }));
      }
      fieldset.append(controls);
    }
    return fieldset;
  }
  const renderForm = (focusGroup) => {
    const palette = element('nav');
    palette.className = 'rule-palette';
    palette.setAttribute('aria-label', title);
    palette.append(button('✦ ' + wizard, openWizard));
    const tabs = element('div');
    tabs.className = 'rule-palette-tabs';
    for (const [key, label, icon] of [['triggers', triggerStep, 'ϟ'], ['conditions', conditionStep, '?'], ['actions', actionStep, '↳']]) {
      const tab = button(icon, () => { category = key; renderForm(); form.querySelector('[aria-pressed="true"]')?.focus(); });
      tab.setAttribute('aria-label', label);
      tab.setAttribute('aria-pressed', String(key === category));
      tab.title = label;
      tabs.append(tab);
    }
    palette.append(tabs);
    const choices = category === 'triggers' ? triggerKinds.map(([kind, label, icon]) => [category, label, icon, kind]) :
      category === 'conditions' ? [[category, status, '?']] :
        [['actions', then, '↳'], ['elseActions', otherwise, '↳']];
    for (const [key, label, icon, kind] of choices) {
      const item = button(icon + ' ' + label, () => {
        append(rules, key, kind);
        update();
        renderForm(key);
      });
      item.className = 'rule-palette-item';
      palette.append(item);
    }
    const bands = element('div');
    bands.className = 'rule-form';
    for (const key of Object.keys(ruleLabels)) {
      if (key !== 'elseActions' || rules[key].length) bands.append(group(key, rules, renderForm, update, false));
    }
    form.replaceChildren(palette, bands);
    if (focusGroup) {
      const index = Object.keys(ruleLabels).indexOf(focusGroup);
      const inputs = bands.children[index]?.querySelectorAll('input');
      if (inputs?.length) inputs[inputs.length - 2]?.focus();
    }
  };
  form.classList.add('rules-editor');
  function openWizard() {
    const draft = structuredClone(rules);
    const body = element('div');
    const dialog = editorDialog(title, body);
    dialog.classList.add('rules-wizard');
    dialog.lastElementChild.remove();
    let step = 0;
    const render = () => {
      const steps = element('ol');
      [triggerStep, conditionStep, actionStep, review].forEach((label, index) => {
        const item = element('li', (index + 1) + ' · ' + label);
        if (index === step) item.setAttribute('aria-current', 'step');
        steps.append(item);
      });
      const content = element('div');
      content.className = 'rule-form';
      const controls = element('footer');
      const previous = button(back, () => { step--; render(); });
      previous.disabled = step === 0;
      const proceed = button(step === 3 ? apply : next, () => {
        if (step === 3) {
          rules = draft;
          update();
          renderForm();
          dialog.close();
        } else { step++; render(); }
      });
      if (step < 3) {
        for (const key of [['triggers'], ['conditions'], ['actions', 'elseActions']][step]) {
          content.append(group(key, draft, render, () => {}, true));
        }
      } else {
        try {
          const yaml = makeYaml({name: project.name, kind: 'automation', ...draft});
          validateYaml(yaml, 'automation');
          content.append(element('pre', yaml));
        } catch (error) {
          proceed.disabled = true;
          const message = element('p', error.message);
          message.setAttribute('role', 'alert');
          content.append(message);
        }
      }
      controls.append(previous, button(cancel, () => dialog.close()), proceed);
      body.replaceChildren(steps, content, controls);
    };
    render();
  }
  renderForm();
  const source = () => makeRulesJavaScript(project.name, rules);
  const convert = open => {
    try {
      const javascript = source();
      if (open) add({type: 'javascript', name: project.name + ' · JS', source: javascript});
      else showSource(javascript);
    } catch (error) { report(error.message, true); }
  };
  const right = editorTools(row, project);
  const expert = expertTools(right);
  toolIcon(expert, 'code', 'Quelltext anzeigen', () => convert(false));
  toolIcon(expert, 'sun', 'Astronomische Ereignisse', () => showSun(project));
  toolIcon(right, 'export', 'Regel exportieren', () => exportEditorData(project.name, {type: 'rules', fields: rules}));
  toolIcon(right, 'import', 'Regel importieren', () => importEditorData(project, (text, name) => {
    const data = JSON.parse(text);
    if (data?.type !== 'rules') throw new Error('Ungültige Rules-Datei.');
    return {type: 'rules', name: name.replace(/\.json$/i, ''), fields: readRuleFields(data.fields)};
  }));
  right.append(button('Rules → JS', () => convert(true)),
    button('Als HA-YAML öffnen', () => openGenerated(project, () => rules, report)));
  toolIcon(expert, 'tools', 'Debug-Einstellungen', () => debugTools(project));
  panel.append(form);
}

async function renderBlocks(panel, project, id) {
  const renderToken = Symbol();
  blocksRender = renderToken;
  const row = toolbar(panel, project);
  const report = (text, error) => recordProtocol(project, text, error);
  const workspace = element('div');
  workspace.className = 'block-workspace';
  panel.append(workspace);
  try {
    const [{mountBlocks, importIoBroker, validateBlockSnapshot}, callmebotCatalogs] = await Promise.all([
      import('./vendor/pro-blocks.js'),
      project.type === 'blocks-js' ? fetch('./api/callmebot', {signal: AbortSignal.timeout(3000)})
        .then(response => response.ok ? response.json() : {}).catch(() => ({})) : {},
    ]);
    if (blocksRender !== renderToken || active !== id || !panel.isConnected) return;
    blocks = mountBlocks(workspace, project.workspace, saved => {
      project.workspace = saved;
      refreshRuntimeControls(id);
    }, locale, project.type === 'blocks-js' ? 'js' : 'yaml', openBlockEntity, callmebotCatalogs);
    const read = blocks.read;
    const openYaml = () => {
      if (!blocks.usesAutomation()) {
        return openGenerated(project, read, report);
      }
      try {
        const source = blocks.automationYaml(project.name);
        validateYaml(source, 'automation');
        add({type: 'yaml', name: project.name + ' · YAML', kind: 'automation', source});
      } catch (error) { report(error.message, true); }
    };
    const isJavaScript = project.type === 'blocks-js';
    const right = isJavaScript ? editorTools(row, project, blocks) : row;
    const source = () => {
      if (isJavaScript) return blocks.generate(project.name);
      if (blocks.usesAutomation()) return blocks.automationYaml(project.name);
      return makeYaml({name: project.name, kind: 'automation', ...read()});
    };
    const safely = action => () => {
      try { action(source()); }
      catch (error) { report(error.message, true); }
    };
    if (isJavaScript) right.append(button('Entitäts-ID', () => {
      const id = blocks.selectedEntity();
      editorDialog('Entitäts-ID', element('p', id || 'Einen Block mit einer HA-Entität auswählen.'));
    }));
    const expert = expertTools(right);
    toolIcon(expert, 'code', 'Quelltext anzeigen', safely(showSource));
    toolIcon(right, 'export', 'Blöcke exportieren', () => exportEditorData(project.name,
      {type: project.type, workspace: blocks.exportSelection()}));
    toolIcon(isJavaScript ? expert : right, 'import', 'Blöcke importieren', () => importEditorData(project, (text, filename) => {
      const name = filename.replace(/\.[^.]+$/, '');
      if (!filename.toLowerCase().endsWith('.json')) {
        if (!isJavaScript) throw new Error('Für Blocks A eine exportierte JSON-Datei auswählen.');
        reviewIoBrokerImport(name, importIoBroker(text));
        return;
      }
      const data = JSON.parse(text);
      if (data?.type !== project.type) throw new Error('Die Datei gehört zu einem anderen Blockly-Editor.');
      validateBlockSnapshot(data.workspace);
      return {type: project.type, name, workspace: data.workspace};
    }));
    toolIcon(right, 'check', 'Blöcke prüfen', safely(output => {
      if (!isJavaScript) validateYaml(output, 'automation');
      setProjectProblem(project, false);
      report('Prüfung erfolgreich.');
    }));
    if (isJavaScript) {
      right.append(button('Testlauf starten', () => runBlocks(project)));
      toolIcon(expert, 'sun', 'Astronomische Ereignisse', () => showSun(project));
      expert.append(button('Blockly → JS', safely(output => add({
        type: 'javascript', name: project.name + ' · JS', source: output,
      }))));
    } else {
      toolIcon(right, 'undo', 'Rückgängig', blocks.undo);
      toolIcon(right, 'redo', 'Wiederholen', blocks.redo);
      toolIcon(expert, 'sun', 'Astronomische Ereignisse', () => showSun(project));
      right.append(button('Als HA-YAML öffnen', openYaml));
    }
    toolIcon(expert, 'tools', 'Debug-Einstellungen', () => debugTools(project));
  } catch (error) {
    report(error.message, true);
  }
}

async function runBlocks(project) {
  if (project.running) return;
  project.running = true;
  renderProjectList();
  try {
    const {generateBlocks} = await import('./vendor/pro-blocks.js');
    const source = blocks && projects.get(active) === project ? blocks.generate(project.name) :
      generateBlocks(project.workspace, project.name);
    const response = await fetch('./api/pro-test-run', {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({source}),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error);
    recordProtocol(project, JSON.stringify(result.trace, null, 2));
  } catch (error) { recordProtocol(project, error.message, true); }
  finally { project.running = false; renderProjectList(); }
}

function renderJavaScript(panel, project) {
  const row = toolbar(panel, project);
  const report = (text, error, line) => recordProtocol(project, text, error, line);
  const checkLabels = {de: ['Typen prüfen', 'Typprüfung erfolgreich.'],
    en: ['Check types', 'Type check passed.'], fr: ['Vérifier les types', 'Vérification des types réussie.']};
  const [checkLabel, checkPassed] = checkLabels[document.documentElement.lang] ?? checkLabels.de;
  const execute = async checkOnly => {
    const source = project.source;
    run.disabled = true;
    if (check) check.disabled = true;
    project.running = true;
    project.problem = false;
    renderProjectList();
    if (!checkOnly) report('Testlauf wird ausgeführt …');
    try {
      const response = await fetch('./api/pro-test-run', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({source, language: project.type, checkOnly}),
      });
      const result = await response.json();
      if (projects.get(active) === project && project.source === source) {
        codeEditor?.showProblems(result.diagnostics ?? []);
      }
      if (result.diagnostics?.length) {
        for (const {message, line} of result.diagnostics) report(message, true, line);
      } else if (!response.ok || !result.ok) report(result.error, true, result.line);
      else report(checkOnly ? checkPassed : JSON.stringify(result.trace, null, 2));
    } catch (error) {
      report(error.message, true);
    } finally {
      run.disabled = false;
      if (check) check.disabled = false;
      project.running = false;
      const currentRun = projects.get(active) === project && editor.querySelector('[data-run-javascript]');
      if (currentRun) currentRun.disabled = false;
      const currentCheck = projects.get(active) === project && editor.querySelector('[data-check-types]');
      if (currentCheck) currentCheck.disabled = false;
      renderProjectList();
    }
  };
  const run = button('Testlauf starten', () => execute(false));
  const check = project.type === 'typescript' ? button(checkLabel, () => execute(true)) : null;
  run.dataset.runJavascript = '';
  run.disabled = Boolean(project.running);
  const right = editorTools(row, project, {undo: () => codeEditor?.undo(), redo: () => codeEditor?.redo()});
  right.append(run);
  if (check) {
    check.dataset.checkTypes = '';
    check.disabled = Boolean(project.running);
    right.append(check);
  }
  const expert = expertTools(right);
  toolIcon(expert, 'code', 'Quelltext anzeigen', () => showSource(project.source));
  toolIcon(expert, 'time', 'Zeitplan einfügen', () => {
    const content = element('div');
    const cron = element('input');
    cron.value = '0 7 * * *';
    cron.setAttribute('aria-label', 'CRON-Ausdruck');
    const status = element('p');
    content.append(cron, button('Einfügen', async () => {
      try {
        const {scheduleTrigger} = await import('./vendor/pro-blocks.js');
        const schedule = scheduleTrigger(cron.value);
        if (!dialog.open || projects.get(active) !== project) return;
        dialog.close();
        codeEditor?.insert('ha.schedule(' + JSON.stringify(schedule) + ', () => {\n});\n');
      } catch (error) { status.textContent = error.message; }
    }), status);
    const dialog = editorDialog('Zeitplan einfügen', content);
  });
  toolIcon(right, 'assist', 'Codebeispiel einfügen', () => {
    const choices = element('div');
    for (const [label, snippet] of [
      ['Zustand lesen', 'const state = ha.readState("binary_sensor.bewegung");\nha.log(state);\n'],
      ['Auf Zustandswechsel reagieren', 'ha.onState("binary_sensor.bewegung", () => {\n  ha.log("Zustand geändert");\n});\n'],
      ['HA-Aktion mit Parametern', 'ha.callAction("light.turn_on", "light.flur", {brightness_pct: 30});\n'],
    ]) {
      choices.append(button(label, () => { dialog.close(); codeEditor?.insert(snippet); }));
    }
    const dialog = editorDialog('Codebeispiel einfügen', choices);
  });
  toolIcon(expert, 'sun', 'Astronomische Ereignisse', () => showSun(project));
  toolIcon(right, 'entity', 'HA-Entität einfügen', () => {
    const content = element('div'), query = element('input'), results = element('ul');
    query.type = 'search';
    query.setAttribute('aria-label', 'HA-Entität suchen');
    const search = async () => {
      try {
        const items = await editorEntities(query.value);
        if (!dialog.open) return;
        results.replaceChildren(...items.map(item => {
          const row = element('li');
          const pick = button(item.entity_id, () => {
            dialog.close();
            codeEditor?.insert(JSON.stringify(item.entity_id));
          });
          pick.dataset.userText = '';
          row.append(pick);
          return row;
        }));
        if (!items.length) results.append(element('li', 'Keine passenden Entitäten.'));
      } catch (error) { results.replaceChildren(element('li', error.message)); }
    };
    content.append(query, button('Suchen', search), results);
    const dialog = editorDialog('HA-Entität einfügen', content);
    query.onkeydown = event => { if (event.key === 'Enter') void search(); };
    void search();
  });
  toolIcon(expert, 'tools', 'Debug-Einstellungen', () => debugTools(project));
  toolIcon(expert, 'help', 'Skript-API anzeigen', () => editorDialog('Skript-API', element('pre',
    'ha.readState(entity)\nha.readAttribute(entity, attribute)\nha.callAction(action, entity, data)\n' +
    'ha.onState(entity, callback)\nha.onEvent(event, callback)\nha.schedule(schedule, callback)\n' +
    'ha.timeout(name, ms, callback)\nha.log(message)')));
  renderCode(panel, project);
}

function renderCode(panel, project) {
  const typescript = project.type === 'typescript';
  const host = element('div');
  host.className = 'script-code';
  panel.append(host);
  codeEditor = mountCodeEditor(host, {
    source: project.source,
    typescript,
    label: typescript ? 'TypeScript-Quelltext' : 'JavaScript-Quelltext',
    onChange: source => {
      project.source = source;
      refreshRuntimeControls();
    },
  });
}

const templates = {
  script: 'alias: Neues Skript\nmode: single\nsequence:\n  - action: light.turn_on\n    target:\n      entity_id: light.flur\n',
  automation: 'alias: Neue Automation\nmode: single\ntriggers:\n  - trigger: state\n    entity_id: binary_sensor.bewegung\n    to: "on"\nconditions: []\nactions:\n  - action: light.turn_on\n    target:\n      entity_id: light.flur\n',
};
const detailsDialog = $('project-details-dialog');
const projectName = $('project-name');
const projectFolder = $('project-folder');
const projectIdPreview = $('project-id-preview');

function updateProjectId() {
  const name = projectName.value.trim();
  projectName.setCustomValidity(name ? '' : 'Bitte einen Namen eingeben.');
  const slug = projectSlug(name) || 'skript';
  const base = ['logic_studio', projectFolder.value, slug].filter(Boolean).join('.');
  const used = new Set([...projects.values()].map(project => project.scriptId));
  let id = base;
  for (let number = 2; used.has(id); number++) id = base + '_' + number;
  projectIdPreview.value = name ? id : '';
}

function chooseProjectDetails(draft) {
  projectDraft = draft;
  projectName.value = translatePro(draft.name, locale);
  projectFolder.replaceChildren(...[...projectFolders].map(([id, name]) => {
    const option = element('option', name);
    option.value = id;
    return option;
  }));
  projectFolder.value = '';
  updateProjectId();
  detailsDialog.returnValue = '';
  detailsDialog.showModal();
  projectName.select();
}

projectName.oninput = updateProjectId;
projectFolder.onchange = updateProjectId;
detailsDialog.onclose = () => {
  const draft = projectDraft;
  projectDraft = undefined;
  if (draft && detailsDialog.returnValue === 'create') {
    const folder = projectFolder.value;
    collapsedProjectGroups.delete(folder);
    if (folder !== 'common' && folder !== 'global') collapsedProjectGroups.delete('');
    add({...draft, name: projectName.value.trim(), folder, scriptId: projectIdPreview.value});
  }
};

function projectSlug(name) {
  return name.normalize('NFKD').toLowerCase().replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

let folderToRename;
function openFolderDialog(folder) {
  folderToRename = folder;
  const dialog = $('folder-dialog');
  $('folder-title').textContent = translatePro(folder ? 'Ordner umbenennen' : 'Neuen Ordner erstellen', locale);
  $('folder-submit').textContent = translatePro(folder ? 'Speichern' : 'Erstellen', locale);
  $('folder-name').value = projectFolders.get(folder) ?? '';
  dialog.returnValue = '';
  dialog.showModal();
  $('folder-name').select();
}

$('folder-dialog').onclose = () => {
  const folder = folderToRename;
  folderToRename = undefined;
  if ($('folder-dialog').returnValue !== 'create') return;
  const name = $('folder-name').value.trim();
  if (!name) return;
  if (folder !== undefined) {
    const previousName = projectFolders.get(folder);
    if (name === previousName || previousName === undefined) return;
    projectFolders.set(folder, name);
    if (!saveProjects()) projectFolders.set(folder, previousName);
    renderProjectList();
    return;
  }
  const base = projectSlug(name) || 'ordner';
  let id = base;
  for (let number = 2; projectFolders.has(id); number++) id = base + '_' + number;
  projectFolders.set(id, name);
  collapsedProjectGroups.delete('');
  if (!sortingProjects) saveProjects();
  renderProjectList();
};
$('project-dialog').onclose = () => {
  switch ($('project-dialog').returnValue) {
    case 'yaml':
      chooseYaml('HA-YAML erstellen', kind => chooseProjectDetails({
        type: 'yaml', name: kind === 'script' ? 'Neues HA-Skript' : 'Neue HA-Automation', kind, source: templates[kind],
      }));
      break;
    case 'rules':
      chooseProjectDetails({type: 'rules', name: 'Neue Regel'});
      break;
    case 'blocks':
      chooseProjectDetails({type: 'blocks', name: 'Neues Blockprojekt · YAML'});
      break;
    case 'blocks-js':
      chooseProjectDetails({type: 'blocks-js', name: 'Neues Blockprojekt · JS'});
      break;
    case 'flow': {
      const id = [...projects].find(([, project]) => project.type === 'flow')?.[0];
      if (id) show(id);
      else chooseProjectDetails({type: 'flow', name: 'Funktionsplan'});
      break;
    }
    case 'javascript':
      chooseProjectDetails({type: 'javascript', name: 'Neues JavaScript', running: false, source:
        'const motion = ha.readState("binary_sensor.bewegung");\nif (motion === "on") ha.callAction("light.turn_on", "light.flur");\nha.log(motion);\n'});
      break;
    case 'typescript':
      chooseProjectDetails({type: 'typescript', name: 'Neues TypeScript', source:
        '// Typisierter Beispielcode\nconst temperature: number = 21;\n'});
      break;
  }
};
$('yaml-dialog').onclose = () => {
  const callback = yamlDialogAction;
  yamlDialogAction = undefined;
  if ($('yaml-dialog').returnValue === 'confirm') callback?.($('yaml-kind').value);
};
$('open-yaml').onclick = () => {
  projectMenu.hidden = true;
  menuControl.setAttribute('aria-expanded', 'false');
  $('yaml-file').click();
};
$('yaml-file').onchange = async event => {
  const [file] = event.target.files;
  event.target.value = '';
  if (!file) return;
  const message = element('p');
  message.setAttribute('role', 'alert');
  try {
    if (file.size > 1_000_000) throw new Error('Die YAML-Datei darf höchstens 1 MB groß sein.');
    const source = await file.text();
    chooseYaml('YAML-Datei öffnen', kind => add({type: 'yaml', name: file.name.replace(/\.ya?ml$/i, ''), kind, source}));
  } catch (error) {
    message.textContent = error.message;
    editor.prepend(message);
  }
};
const empty = element('p', 'Ein Skript aus der Projektliste öffnen oder mit ＋ ein neues erstellen.');
empty.className = 'empty-editor';
editor.append(empty);
await restoreProjects();
syncExpertMode();
renderProjectList();
syncLanguage();
fetch('./api/info').then(response => response.ok ? response.json() : null).then(info => {
  if (info?.version) $('pro-version').textContent = info.version;
}).catch(() => {});
$('download-project-draft').onclick = () => {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(recoveryKey))?.tree; } catch {}
  const tree = saved ?? {folders: [...projectFolders], expertMode, projects: [...projects].map(
    ([id, {protocol, running, problem, ...project}]) => [id, project])};
  download('logic-studio-pro-projekte.json', JSON.stringify(tree, null, 2));
};
const language = connectLanguage({
  picker: false,
  getLanguage: () => locale,
  translateText: translatePro,
  setLanguage: value => {
    locale = value;
    try { localStorage.setItem(languageKey, value); } catch {}
    syncLanguage();
    const project = projects.get(active);
    if (['blocks', 'blocks-js', 'rules'].includes(project?.type)) show(active, true);
  },
});
