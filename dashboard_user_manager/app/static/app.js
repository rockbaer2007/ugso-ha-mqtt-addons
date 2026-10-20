'use strict';
const $ = id => document.getElementById(id);
const t = (key, values) => I18n.t(key, values);
const state = {users: [], dashboards: [], views: [], draft: new Map(), csrf: '', configHash: '', usersHash: '', busy: false, generation: 0, loaded: false};
const selectionKey = 'dashboard-users-dashboards';
let dashboardSelection = null;
try { const saved = JSON.parse(localStorage.getItem(selectionKey)); if (Array.isArray(saved) && saved.every(p => typeof p === 'string')) dashboardSelection = saved; } catch { /* Invalid/unavailable preferences leave all dashboards visible. */ }
function selectedDashboards() { return state.dashboards.filter(d => dashboardSelection === null || dashboardSelection.includes(d.url_path || '')); }
function node(tag, text, cls) { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; return el; }
function status(text, type = '') { state.lastStatus = [text,type]; $('status').textContent = t(text); $('status').className = type; }
function path() { return $('dashboard').value || null; }
function editable() { return state.dashboards.find(d => d.url_path === path())?.mode === 'storage' && state.loaded; }
function changes() { return Matrix.changes(state.views, state.users, state.draft); }
function buttons() {
  const count = changes().length;
  $('save').disabled = state.busy || !editable() || !count;
  $('discard').disabled = state.busy || !count;
  $('changes').textContent = count ? t('{count} Ansichten geändert · noch nicht gespeichert', {count}) : t('Keine Änderungen');
  $('reload').disabled = state.busy; $('dashboard').disabled = state.busy || !selectedDashboards().length;
  $('choose-dashboards').disabled = state.busy;
  for (const el of $('table-wrap').querySelectorAll('input')) el.disabled = state.busy || !editable() || el.dataset.locked === 'true';
  for (const el of $('backups').querySelectorAll('button')) el.disabled = state.busy;
}
async function api(route, body) {
  const response = await fetch(`api/${route}`, {cache: 'no-store', headers: {'Accept-Language':I18n.language,...(body === undefined ? {} : {'Content-Type': 'application/json', 'X-Dashboard-CSRF': state.csrf})}, method: body === undefined ? 'GET' : 'POST', body: body === undefined ? undefined : JSON.stringify(body)});
  const text = await response.text(); let data;
  try { data = JSON.parse(text); } catch { throw new Error(t('App nicht erreichbar oder Sitzung abgelaufen. Bitte über HA neu öffnen.')); }
  if (!response.ok) throw new Error(data.error || t('Anfrage fehlgeschlagen.'));
  return data;
}
function checkbox(label, checked, listener, locked = false) {
  const el = node('input'); el.type = 'checkbox'; el.checked = checked; el.setAttribute('aria-label', label); el.dataset.locked = String(locked); el.addEventListener('change', listener); return el;
}
function syncMatrix() {
  const dirty = new Set(changes().map(row => row.index));
  for (const el of $('columns').querySelectorAll('input')) {
    const column = Matrix.column(state.views, state.draft, el.dataset.user);
    el.checked = column.checked; el.indeterminate = column.indeterminate;
  }
  for (const row of $('views').querySelectorAll('tr[data-index]')) {
    const index = Number(row.dataset.index); row.classList.toggle('changed', dirty.has(index));
    for (const el of row.querySelectorAll('input')) el.checked = state.draft.get(index).has(el.dataset.user);
  }
  buttons();
}
function renderMatrix() {
  $('columns').replaceChildren(); $('views').replaceChildren(); $('count').textContent = t('{views} Ansichten · {users} Benutzer', {views:state.views.length, users:state.users.length});
  $('table-wrap').classList.toggle('many-users', state.users.length >= 5);
  const header = node('tr'); const first = node('th', t('Ansicht / Seite')); first.scope = 'col'; header.append(first);
  for (const user of state.users) {
    const col = Matrix.column(state.views, state.draft, user.id); const cell = node('th'); cell.scope = 'col'; const label = node('label', undefined, 'column-user');
    const input = checkbox(t('Alle Ansichten für {name} auswählen oder abwählen',{name:user.name}), col.checked, event => { Matrix.setColumn(state.views, state.draft, user.id, event.target.checked); syncMatrix(); }, col.disabled);
    input.dataset.user = user.id; input.indeterminate = col.indeterminate;
    const text = node('span', user.name, 'user-name'); text.title = user.name;
    const role = node('small', user.admin ? 'A' : 'U', `user-role ${user.admin ? 'role-admin' : 'role-user'}`);
    role.setAttribute('aria-label', t(user.admin ? 'Administrator' : 'Benutzer'));
    role.title = t(user.admin ? 'Administrator' : 'Benutzer');
    label.title = `${user.name}${user.active ? '' : ' · '+t('inaktiv')}`;
    label.append(text, role, input); cell.append(label); header.append(cell);
  }
  $('columns').append(header);
  for (const view of state.views) {
    const row = node('tr'); row.dataset.index = view.index; const title = node('th'); title.scope = 'row';
    const viewTitle = view.title_generated ? t('Ansicht {number}',{number:view.index+1}) : view.title;
    title.append(node('strong', viewTitle), node('small', `${view.path}${view.subview ? ' · '+t('Unteransicht') : ''}`));
    if (view.unsupported) title.append(node('small', t(view.unsupported)));
    else if (view.users?.some(id => !state.users.some(u => u.id === id))) title.append(node('small', t('Frühere Benutzerzuordnungen bleiben erhalten.')));
    row.append(title);
    for (const user of state.users) {
      const cell = node('td'); const input = checkbox(`${viewTitle}: ${user.name}`, state.draft.get(view.index).has(user.id), event => {Matrix.setCell(state.draft, view.index, user.id, event.target.checked); syncMatrix();}, Boolean(view.unsupported));
      input.dataset.user = user.id; cell.append(input); row.append(cell);
    }
    $('views').append(row);
  }
  if (!state.views.length) { const cell = node('td', t('Keine Ansichten geladen.')); cell.colSpan = state.users.length + 1; const row = node('tr'); row.append(cell); $('views').append(row); }
  syncMatrix();
}
function discard() {state.draft = Matrix.initial(state.views, state.users); syncMatrix();}
function confirmDiscard() { return !changes().length || confirm(t('Ungespeicherte Checkbox-Auswahl verwerfen?')); }
async function loadViews() {
  const generation = ++state.generation; state.loaded = false; state.views = []; state.draft = new Map(); renderMatrix();
  const dash = selectedDashboards().find(d => d.url_path === path());
  $('dashboard-info').textContent = dash ? t(dash.mode === 'storage' && !dash.generated ? 'Manuell verwaltet · bearbeitbar' : 'YAML / automatisch erzeugt · nur lesbar') : '';
  if (!dash) { status(state.dashboards.length ? 'Keine Dashboards vorausgewählt. Bitte Dashboard-Vorauswahl öffnen.' : 'Keine Dashboards mit Ansichten verfügbar. Ladehinweise prüfen.'); return; }
  try {
    const data = await api(`views?path=${encodeURIComponent(path() || '')}`);
    if (generation !== state.generation) return;
    state.views = data.views; state.configHash = data.config_hash; state.loaded = !data.generated; state.draft = Matrix.initial(state.views, state.users); renderMatrix();
    status(editable() ? 'Bereit. Benutzer im Spaltenkopf oder je Ansicht auswählen.' : 'Dieses Dashboard wird außerhalb der App verwaltet und ist hier nur lesbar.');
  } catch (error) { if (generation === state.generation) status(error.message, 'error'); }
}
function renderBackups(backups) {
  state.backups = backups;
  $('backups').replaceChildren();
  if (!backups.length) $('backups').append(node('p', t('Noch keine Änderungen durch diese App.'), 'muted'));
  for (const backup of backups) {
    const row = node('div', undefined, 'backup'); const text = node('div', new Date(backup.created_at * 1000).toLocaleString(I18n.language));
    text.append(node('small', t('{path} · {count} Ansichten',{path:backup.path || 'lovelace',count:backup.views})));
    const actions = node('div', undefined, 'backup-actions'); const link = node('a', t('JSON sichern')); link.href = `api/backups/${encodeURIComponent(backup.id)}`; link.download = backup.id;
    const restore = node('button', t('Wiederherstellen'), 'secondary'); restore.addEventListener('click', () => restoreBackup(backup)); actions.append(link, restore); row.append(text, actions); $('backups').append(row);
  }
}
async function bootstrap(preferredPath = path()) {
  state.busy = true; state.loaded = false; buttons(); status('Dashboards und Benutzer laden …');
  try {
    const data = await api('bootstrap'); state.csrf = data.csrf; state.users = data.users; state.usersHash = data.users_hash; state.dashboards = data.dashboards; state.dashboardErrors = data.dashboard_errors || []; state.emptyDashboards = data.empty_dashboards || 0;
    $('version').textContent = data.version; $('dashboard').replaceChildren();
    renderDashboards(preferredPath);
    renderCatalogInfo();
    renderBackups(data.backups); await loadViews(); state.currentPath = path();
  } catch (error) { status(error.message, 'error'); }
  finally { state.busy = false; buttons(); }
}
async function save() {
  if (state.busy || !editable() || !changes().length) return;
  state.busy = true; buttons(); status('Dashboard prüfen, sichern und Zuordnungen speichern …');
  try {
    const prepared = await api('matrix', {path: path(), rows: changes(), config_hash: state.configHash, users_hash: state.usersHash});
    const result = await api('commit', {token: prepared.token}); await bootstrap(); status(`${result.message} ${t('{count} Ansichten geändert.',{count:result.changed})}`, 'success');
  } catch (error) { status(error.message, 'error'); }
  finally { state.busy = false; buttons(); }
}
async function restoreBackup(backup) {
  if (state.busy || !confirmDiscard() || !confirm(t('Dashboard „{path}“ aus der Sicherung vom {date} vollständig wiederherstellen? Der aktuelle Stand wird vorher erneut gesichert. Zwischenzeitliche Änderungen verhindern die Wiederherstellung.',{path:backup.path || 'lovelace',date:new Date(backup.created_at * 1000).toLocaleString(I18n.language)}))) return;
  state.busy = true; buttons();
  try { const result = await api('restore', {id: backup.id}); await bootstrap(); status(result.message, 'success'); }
  catch (error) { status(error.message, 'error'); }
  finally { state.busy = false; buttons(); }
}
$('reload').addEventListener('click', () => {if (confirmDiscard()) bootstrap();});
$('dashboard').addEventListener('change', () => {if (!confirmDiscard()) {$('dashboard').value = state.currentPath || ''; return;} state.currentPath = path(); loadViews();});
$('discard').addEventListener('click', discard); $('save').addEventListener('click', save);
window.addEventListener('beforeunload', event => { if (changes().length) {event.preventDefault(); event.returnValue = '';} });
function renderDashboards(selectedPath = path()) {
  $('dashboard').replaceChildren();
  const available = selectedDashboards();
  for (const dash of available) {const option = node('option',`${dash.title || dash.url_path || t('Übersicht')}${dash.mode !== 'storage' || dash.generated ? ' · '+t('nur lesbar') : ''}`); option.value = dash.url_path || ''; $('dashboard').append(option);}
  const selected = available.find(d => d.url_path === selectedPath) || available.find(d => d.mode === 'storage' && !d.generated) || available[0];
  if (selected) $('dashboard').value = selected.url_path || '';
}
function renderCatalogInfo() {
  $('catalog-info').textContent = t('{selected} von {total} Dashboards ausgewählt · {empty} ohne Ansichten ausgeblendet', {selected:selectedDashboards().length,total:state.dashboards.length,empty:state.emptyDashboards || 0});
  const errors = state.dashboardErrors || [];
  $('dashboard-errors').hidden = !errors.length;
  $('dashboard-errors-title').textContent = t('{count} Dashboards konnten nicht geladen werden', {count:errors.length});
  $('dashboard-errors-list').replaceChildren();
  for (const dash of errors) $('dashboard-errors-list').append(node('li',`${dash.title || dash.url_path || t('Übersicht')}: ${t(dash.load_error)}`));
}
function renderChoices() {
  const pending = new Set(Array.from($('dashboard-choices').querySelectorAll('input:checked'), el => el.value));
  $('dashboard-choices').replaceChildren();
  for (const dash of state.dashboards) {
    const label = node('label',undefined,'dashboard-choice');
    const input = checkbox(dash.title || dash.url_path || t('Übersicht'),pending.has(dash.url_path || ''),()=>{}); input.value = dash.url_path || '';
    label.append(input,node('span',dash.title || dash.url_path || t('Übersicht'))); $('dashboard-choices').append(label);
  }
}
$('choose-dashboards').addEventListener('click', () => {
  renderChoices();
  for (const input of $('dashboard-choices').querySelectorAll('input')) input.checked = dashboardSelection === null || dashboardSelection.includes(input.value);
  $('preference-error').textContent = ''; $('dashboard-dialog').showModal();
});
for (const [id,checked] of [['choose-all',true],['choose-none',false]]) $(id).addEventListener('click', () => {for (const input of $('dashboard-choices').querySelectorAll('input')) input.checked = checked;});
$('choose-cancel').addEventListener('click', () => $('dashboard-dialog').close());
$('choose-apply').addEventListener('click', async () => {
  const selected = Array.from($('dashboard-choices').querySelectorAll('input:checked'),el => el.value);
  const keepCurrent = selected.includes(path() || '');
  if (!keepCurrent && !confirmDiscard()) return;
  // Retain choices for temporarily failed/unavailable dashboards; never forget them silently.
  const unavailable = (dashboardSelection || []).filter(p => !state.dashboards.some(d => (d.url_path || '') === p));
  const next = [...new Set([...selected,...unavailable])];
  try { localStorage.setItem(selectionKey,JSON.stringify(next)); }
  catch { $('preference-error').textContent = t('Vorauswahl konnte nicht gespeichert werden. Browser-Speicher prüfen.'); return; }
  dashboardSelection = next; $('dashboard-dialog').close(); renderDashboards(); renderCatalogInfo();
  if (!keepCurrent) {await loadViews(); state.currentPath = path();} else buttons();
});
I18n.listeners.push(() => {
  renderDashboards(); renderCatalogInfo(); if ($('dashboard-dialog').open) renderChoices(); renderMatrix(); renderBackups(state.backups || []);
  $('dashboard-info').textContent = selectedDashboards().length ? t(editable() ? 'Manuell verwaltet · bearbeitbar' : 'YAML / automatisch erzeugt · nur lesbar') : '';
  if (state.lastStatus) status(...state.lastStatus);
});
I18n.init().then(() => {$('status').removeAttribute('data-i18n'); return bootstrap();}).catch(() => status('App nicht erreichbar oder Sitzung abgelaufen. Bitte über HA neu öffnen.','error'));
