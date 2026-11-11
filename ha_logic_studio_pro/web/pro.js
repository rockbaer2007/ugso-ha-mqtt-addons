import {makeYaml, validateYaml} from './pro-yaml-model.js';
import {connectLanguage, locales, translate} from './i18n.js';
import {translatePro} from './pro-locales.js';

const $ = id => document.getElementById(id);
const editor = $('editor');
const studioLayout = $('studio-layout');
const projectSidebar = $('project-sidebar');
const projectSplitter = $('project-splitter');
const projects = new Map();
const openTabs = new Set();
const icons = {yaml: '▤', rules: '⚡', blocks: '▦', flow: '◇', javascript: 'JS'};
let active;
let blocks;
let blocksRender;
let yamlDialogAction;
let flowFrame;
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
const languageKey = 'ha-logic-studio-pro-language';
let locale = 'de';
try {
  const saved = localStorage.getItem(languageKey);
  if (locales.includes(saved)) locale = saved;
} catch {}

function projectMessage(text) {
  $('project-message').textContent = text;
  $('project-message').hidden = !text;
}

function saveProjects() {
  try {
    const entries = [...projects].map(([id, {protocol, running, problem, ...draft}]) => [id, draft]);
    localStorage.setItem(projectStorageKey, JSON.stringify({folders: [...projectFolders], projects: entries}));
    return true;
  } catch {
    projectMessage('Projekte konnten in diesem Browser nicht gespeichert werden.');
    return false;
  }
}

function restoreProjects() {
  try {
    const saved = JSON.parse(localStorage.getItem(projectStorageKey));
    if (!saved || !Array.isArray(saved.folders) || !Array.isArray(saved.projects)) return;
    for (const [id, name] of saved.folders) {
      if (typeof id === 'string' && typeof name === 'string' && !projectFolders.has(id)) projectFolders.set(id, name);
    }
    for (const [id, draft] of saved.projects) {
      if (!/^\d+$/.test(id) || !draft || !Object.hasOwn(icons, draft.type) || typeof draft.name !== 'string') continue;
      projects.set(id, {...draft, folder: projectFolders.has(draft.folder) ? draft.folder : '',
        protocol: [], running: draft.type === 'javascript' ? false : undefined});
      nextId = Math.max(nextId, Number(id));
    }
  } catch {
    projectMessage('Die gespeicherte Projektliste konnte nicht gelesen werden.');
  }
}

function sidebarBounds() {
  const style = getComputedStyle(studioLayout);
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const min = parseFloat(style.getPropertyValue('--sidebar-min')) * rem;
  const editorMin = parseFloat(style.getPropertyValue('--editor-min')) * rem;
  return [min, Math.max(min, studioLayout.clientWidth - projectSplitter.offsetWidth - editorMin)];
}

function updateSplitterAria() {
  const [min, max] = sidebarBounds();
  projectSplitter.setAttribute('aria-valuemin', Math.round(min));
  projectSplitter.setAttribute('aria-valuemax', Math.round(max));
  projectSplitter.setAttribute('aria-valuenow', projectSidebar.offsetWidth);
}

function setSidebarWidth(width) {
  const [min, max] = sidebarBounds();
  studioLayout.style.setProperty('--sidebar-width', Math.min(max, Math.max(min, width)) + 'px');
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

function recordProtocol(project, text, error = false) {
  if (!text) return;
  if (error) setProjectProblem(project, true);
  const entries = project.protocol;
  const last = entries.at(-1);
  if (last?.text === text && last.error === error) return;
  entries.push({time: new Date().toLocaleTimeString(), text, error});
  if (entries.length > 200) entries.shift();
  if (projects.get(active) === project) renderProtocol();
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
  lines.replaceChildren(...(project?.protocol || []).map(entry => {
    const line = element('p', `[${entry.time}] ${entry.text}`);
    line.dataset.error = String(entry.error);
    return line;
  }));
  if (project && !project.protocol.length) lines.append(element('p', 'Noch keine Protokolleinträge.'));
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
  const lines = project.protocol.map(({time, text}) => `[${time}] ${text}`);
  protocolUrl = URL.createObjectURL(new Blob(
    [[project.name, ...lines].join('\n') + '\n'], {type: 'text/plain;charset=utf-8'},
  ));
  const link = event.currentTarget;
  link.href = protocolUrl;
  link.download = (project.name.replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'logic-studio') + '.protokoll.txt';
};

function add(project) {
  const id = String(++nextId);
  projects.set(id, {...project, protocol: []});
  if (!sortingProjects) saveProjects();
  show(id);
}

const projectFilters = [
  ['running', 'M9 5v14m6-14v14', 'Nur laufende Skripte anzeigen', project => project.running === true],
  ['stopped', 'm8 5 12 7-12 7z', 'Nur angehaltene Skripte anzeigen', project => project.running === false],
  ['problem', 'M12 3 2 20h20zM12 9v4m0 3h.01', 'Nur Skripte mit Problemen anzeigen', project => project.problem === true],
  ['blocks', 'M4 4h6a2 2 0 1 1 4 0h6v6a2 2 0 1 0 0 4v6H4z', 'Nur Blockly anzeigen'],
  ['javascript', 'm8 6-6 6 6 6m8-12 6 6-6 6m-3-14-2 16', 'Nur JavaScript anzeigen'],
  ['typescript', 'M3 4h12v4m-6-4v16m-3 0h6m6-8v8m-3-8h6', 'Nur TypeScript anzeigen'],
  ['rules', 'm3 7 2 2 3-4m3 3h10M3 15l2 2 3-4m3 3h10', 'Nur Rules anzeigen'],
  ['flow', 'M3 3h6v6H3zm12 12h6v6h-6zM9 6h9v9', 'Nur FBD anzeigen'],
];
function projectIconButton(path, label, action) {
  const control = button('', action);
  control.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
  control.title = label;
  control.setAttribute('aria-label', label);
  return control;
}
const filterControls = element('div');
filterControls.className = 'project-filter-controls';
for (const [id, path, label, matches = project => project.type === id] of projectFilters) {
  const filter = projectIconButton(path, label, () => {
    projectFilter = projectFilter?.id === id ? undefined : {id, matches};
    renderProjectList();
  });
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
  $('folder-name').value = '';
  $('folder-dialog').returnValue = '';
  $('folder-dialog').showModal();
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
  const item = button(icons[project.type] + ' ' + project.name, () => show(id));
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
  const run = projectIconButton(project.running ? 'M6 4h4v16H6zm8 0h4v16h-4z' : 'M6 3l15 9-15 9z',
    (project.running ? 'Testlauf läuft: ' : 'Testlauf starten: ') + project.name, () => {
    show(id);
    editor.querySelector('[data-run-javascript]')?.click();
  });
  run.dataset.projectRun = project.running ? 'running' : 'stopped';
  run.disabled = sortingProjects || project.type !== 'javascript' || Boolean(project.running);
  const remove = projectIconButton('M9 3h6l1 2h5v2H3V5h5zm-4 6h14l-1 12H6z', 'Projekt löschen: ' + project.name, () => {
    if (!window.confirm('Projekt „' + project.name + '“ löschen?')) return;
    closeTab(id);
    projects.delete(id);
    saveProjects();
    renderNavigation();
  });
  remove.dataset.projectDelete = '';
  // The embedded Funktionsplan has its own stored workspace.
  remove.disabled = sortingProjects || project.type === 'flow' || Boolean(project.running);
  const open = projectIconButton('M6 4h15v16H6v-4m0-8V4M2 12h13m-4-4 4 4-4 4', 'Projekt öffnen: ' + project.name, () => show(id));
  open.disabled = sortingProjects;
  actions.append(run, remove, open);
  row.append(name, actions);
  return {row, name};
}

function renderProjectList() {
  for (const filter of $('project-filters').querySelectorAll('[data-filter]')) {
    filter.setAttribute('aria-pressed', String(filter.dataset.filter === projectFilter?.id));
  }
  const query = searchProjects.value.trim().toLocaleLowerCase();
  const visible = [...projects].filter(([, project]) => sortingProjects ||
    ((!projectFilter || projectFilter.matches(project)) && project.name.toLocaleLowerCase().includes(query)));
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
    if (folder && folder !== 'common' && folder !== 'global') folderLabel.dataset.userText = '';
    if (folder === 'common' || folder === 'global') folderLabel.className = 'folder-label-' + folder;
    summary.append(folderLabel);
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
  blocksRender = undefined;
  if (blocks) {
    projects.get(active).workspace = blocks.snapshot();
    if (!sortingProjects) saveProjects();
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
  if (project.type === 'flow') {
    if (!flowFrame) {
      flowFrame = element('iframe');
      flowFrame.title = 'Funktionsplan';
      flowFrame.src = './funktionsplan.html?pro=' + locale;
      flowFrame.addEventListener('load', () => {
        const doc = flowFrame.contentDocument;
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
    return;
  }
  const panel = element('section');
  panel.className = 'project-panel';
  editor.append(panel);
  if (project.type === 'yaml') renderYaml(panel, project);
  if (project.type === 'rules') renderRules(panel, project);
  if (project.type === 'blocks') renderBlocks(panel, project, id);
  if (project.type === 'javascript') renderJavaScript(panel, project);
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
    if (!sortingProjects) saveProjects();
    renderNavigation();
  };
  row.append(name);
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
    if (!sortingProjects) saveProjects();
    onEdit?.();
  };
  panel.append(area);
  return area;
}

function download(filename, content) {
  document.getElementById('yaml-download-form')?.remove();
  const form = element('form');
  form.id = 'yaml-download-form';
  form.method = 'post';
  form.action = './api/pro-export-yaml';
  form.hidden = true;
  for (const [name, value] of Object.entries({filename, source: content})) {
    const input = element('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.append(input);
  }
  document.body.append(form);
  form.submit();
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
  function group(title, prefix, labels) {
    const fieldset = element('fieldset');
    fieldset.append(element('legend', title));
    for (const [key, labelText] of labels) {
      const label = element('label', labelText);
      const input = element('input');
      const name = prefix + key;
      input.value = fields[name] || '';
      input.oninput = () => {
        fields[name] = input.value.trim();
        if (!sortingProjects) saveProjects();
      };
      label.append(input);
      fieldset.append(label);
    }
    form.append(fieldset);
  }
  const stateFields = [['Entity', 'Entität'], ['State', 'Zustand']];
  const actionFields = [['Action', 'HA-Aktion'], ['Entity', 'Ziel-Entität']];
  group('FALLS · Zustandswechsel', 'trigger', stateFields);
  group('UND · Optional', 'condition', stateFields);
  group('DANN', 'then', actionFields);
  group('SONST · Optional', 'else', actionFields);
  const state = prefix => ({entity: fields[prefix + 'Entity'] || '', state: fields[prefix + 'State'] || ''});
  const action = prefix => ({entity: fields[prefix + 'Entity'] || '', action: fields[prefix + 'Action'] || ''});
  const read = () => ({
    triggers: fields.triggerEntity || fields.triggerState ? [state('trigger')] : [],
    condition: fields.conditionEntity || fields.conditionState ? state('condition') : undefined,
    actions: [action('then')],
    otherwise: fields.elseEntity || fields.elseAction ? action('else') : undefined,
  });
  row.append(button('Als HA-YAML öffnen', () => openGenerated(project, read, report)));
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
    const {mountBlocks} = await import('./vendor/pro-blocks.js');
    if (blocksRender !== renderToken || active !== id || !panel.isConnected) return;
    blocks = mountBlocks(workspace, project.workspace, saved => {
      project.workspace = saved;
      if (!sortingProjects) saveProjects();
    }, locale);
    const read = blocks.read;
    row.append(button('Als HA-YAML öffnen', () => openGenerated(project, read, report)));
  } catch (error) {
    report(error.message, true);
  }
}

function renderJavaScript(panel, project) {
  const row = toolbar(panel, project);
  const report = (text, error) => recordProtocol(project, text, error);
  const run = button('Testlauf starten', async () => {
    run.disabled = true;
    project.running = true;
    project.problem = false;
    renderProjectList();
    report('Testlauf wird ausgeführt …');
    try {
      const response = await fetch('./api/pro-test-run', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({source: project.source}),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error);
      report(JSON.stringify(result.trace, null, 2));
    } catch (error) {
      report(error.message, true);
    } finally {
      run.disabled = false;
      project.running = false;
      const currentRun = projects.get(active) === project && editor.querySelector('[data-run-javascript]');
      if (currentRun) currentRun.disabled = false;
      renderProjectList();
    }
  });
  run.dataset.runJavascript = '';
  run.disabled = Boolean(project.running);
  row.append(run);
  panel.append(element('p', 'Testlauf mit Demo-Zuständen und protokollierten HA-Aktionen.'));
  sourceArea(panel, project, 'JavaScript-Quelltext');
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
  projectName.value = draft.name;
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

$('folder-dialog').onclose = () => {
  if ($('folder-dialog').returnValue !== 'create') return;
  const name = $('folder-name').value.trim();
  if (!name) return;
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
      chooseProjectDetails({type: 'blocks', name: 'Neues Blockprojekt'});
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
restoreProjects();
renderProjectList();
syncLanguage();
const language = connectLanguage({
  picker: false,
  getLanguage: () => locale,
  translateText: translatePro,
  setLanguage: value => {
    locale = value;
    try { localStorage.setItem(languageKey, value); } catch {}
    syncLanguage();
    const project = projects.get(active);
    if (project?.type === 'blocks') show(active, true);
  },
});
