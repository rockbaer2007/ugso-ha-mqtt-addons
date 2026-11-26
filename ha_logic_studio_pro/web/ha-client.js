// Ingress-relative URLs; credentials stay in the Python process.
import {createEntityPicker, loadEntityPage} from './entity-picker.js?v=0.1.131';

export function connectHA({getPlan, getPreferences, hasLocal, restore, selected, choose, report, workspace = true}) {
  const badge = document.createElement('span');
  badge.id = 'ha-connection';
  badge.textContent = 'App-Verbindung prüfen …';
  document.querySelector('.planbar').append(badge);
  const reload = document.createElement('button');
  reload.id = 'app-project';
  reload.textContent = 'App-Projekt laden';
  reload.title = 'Gespeichertes App-Projekt laden; Browserstand vorher sichern.';
  document.querySelector('.actions').append(reload);
  let revision = 0, ready = false, blocked = false, timer, busy = false, pending = false, mode = 'local';
  async function api(path, options = {}) {
    const response = await fetch('./api/' + path, {cache: 'no-store', ...options});
    let data;
    try { data = await response.json(); }
    catch { throw Error('App-Server nicht erreichbar. Für lokale Entitäten Start-Demo.cmd verwenden.'); }
    if (!response.ok) {
      const error = Error(data.error || 'App-Anfrage fehlgeschlagen.');
      error.conflict = response.status === 409;
      throw error;
    }
    return data;
  }
  function saveSoon() {
    if (!workspace || !ready || blocked) return;
    clearTimeout(timer);
    timer = setTimeout(save, 250);
  }
  async function save() {
    if (busy) { pending = true; return; }
    busy = true;
    try {
      const data = await api('workspace', {method: 'PUT', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({revision, plan: getPlan(), preferences: getPreferences()})});
      revision = data.revision;
      badge.textContent = (mode === 'homeassistant' ? 'HA-App' : mode === 'demo' ? 'Demo' : 'Lokal') + ' · Projekt gespeichert';
    } catch (error) {
      if (error.conflict) blocked = true;
      badge.textContent = error.conflict ? 'Speicherkonflikt · Datei sichern / App-Projekt laden' : 'App-Speicherung fehlgeschlagen · Projekt als Datei sichern';
      report(error.message);
    } finally {
      busy = false;
      if (pending) { pending = false; saveSoon(); }
    }
  }
  async function load() {
    clearTimeout(timer);
    try {
      const data = await api('workspace');
      if (data.plan) restore(data);
      revision = data.revision;
      blocked = false;
      badge.textContent = 'App-Projekt geladen · Revision ' + revision;
    } catch (error) { report(error.message); }
  }
  reload.onclick = () => {
    if (busy) { report('Speicherung läuft. Bitte kurz erneut versuchen.'); return; }
    void load();
  };
  function show() {
    const block = selected();
    if (!block || !['STATE_IN', 'STATE_OUT'].includes(block.type)) {
      report('Zuerst einen STATE_IN oder STATE_OUT auswählen.'); return;
    }
    const dialog = document.createElement('dialog');
    dialog.id = 'entity-dialog';
    const language = getPreferences()?.language || document.documentElement.lang || 'de';
    const labels = {
      de: ['HA-Entität auswählen', 'Schließen', 'Quelle für ', 'Zustand', 'Ein/Aus', 'Helligkeit 0–100 %', 'Zahlenwert', 'Textwert'],
      en: ['Select HA entity', 'Close', 'Source for ', 'State', 'On/off', 'Brightness 0–100 %', 'Numeric value', 'Text value'],
      fr: ['Choisir une entité HA', 'Fermer', 'Source pour ', 'État', 'Marche/arrêt', 'Luminosité 0–100 %', 'Valeur numérique', 'Valeur texte'],
    };
    const text = labels[language] ?? labels.en;
    const header = document.createElement('header');
    const title = document.createElement('strong'); title.textContent = text[0];
    const close = document.createElement('button'); close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label', text[1]);
    header.append(title, close);
    const status = document.createElement('p'); status.setAttribute('role', 'status');
    const picker = createEntityPicker({locale: language, current: block.params?.oid || '',
      load: (query, options) => loadEntityPage(query, {...options, output: block.type === 'STATE_OUT'}),
      extra: entity => {
        const source = document.createElement('select');
        source.setAttribute('aria-label', text[2] + entity.entity_id);
        const choices = block.type === 'STATE_OUT'
          ? entity.domain === 'input_number' ? [['NUMBER', text[6]]]
            : entity.domain === 'input_text' ? [['TEXT', text[7]]]
              : entity.domain === 'light' ? [['BOOL', text[4]], ['BRIGHTNESS', text[5]]] : [['BOOL', text[4]]]
          : [['', text[3]], ...Object.keys(entity.attributes || {}).map(key => [key, key + ' · ' + String(entity.attributes[key])])];
        for (const [value, label] of choices) {
          const option = document.createElement('option'); option.value = value; option.textContent = label; source.append(option);
        }
        const saved = block.type === 'STATE_IN' ? block.params?.attribute : block.params?.mode;
        if (choices.some(([value]) => value === saved)) source.value = saved;
        return source;
      },
      onSelect: (entity, source) => {
        if (selected()?.id !== block.id) { report('Bausteinauswahl hat sich geändert. Dialog erneut öffnen.'); return; }
        try {
          choose({...entity, selected_attribute: block.type === 'STATE_IN' ? source.value : '',
            output_mode: block.type === 'STATE_OUT' ? source.value : undefined});
          dialog.close();
        } catch (error) { status.textContent = error.message; }
      },
    });
    dialog.append(header, picker.root, status);
    close.onclick = () => dialog.close();
    dialog.addEventListener('close', () => { picker.destroy(); dialog.remove(); }, {once: true});
    document.body.append(dialog);
    dialog.showModal();
    picker.focus();
    void picker.refresh();
  }
  async function init() {
    try {
      const meta = await api('info'); mode = meta.mode;
      badge.title = meta.entities_available ? 'Entitäten vom HA-App-Server lesen.' : 'Lokal ohne HA. Für Beispielentitäten Start-Demo.cmd verwenden.';
      const data = await api('workspace'); revision = data.revision;
      if (data.plan && !hasLocal()) restore(data);
      else if (data.plan && hasLocal() && (JSON.stringify(data.plan) !== JSON.stringify(getPlan()) || JSON.stringify(data.preferences) !== JSON.stringify(getPreferences()))) {
        blocked = true; badge.textContent = 'Browserstand erhalten · App-Projekt laden oder als Datei sichern';
      }
      ready = true;
      if (!blocked) {
        badge.textContent = mode === 'homeassistant' ? 'HA-App · Entitätsauswahl bereit' : mode === 'demo' ? 'Lokaler Demo-Modus' : 'Lokal · keine HA-Verbindung';
        if (!data.plan && hasLocal()) saveSoon();
      }
    } catch { badge.textContent = 'Statischer Modus · kein App-Speicher'; reload.disabled = true; }
  }
  if (workspace) void init(); else { badge.textContent = 'HA-Entitätsauswahl'; reload.hidden = true; }
  return {saveSoon, show};
}
