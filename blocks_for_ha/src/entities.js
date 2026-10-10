import * as BlocklyModule from 'blockly/core';
import { validActionEntity } from './action-targets.js';
const Blockly = Reflect.get(BlocklyModule, 'default') || BlocklyModule;
let openPicker;
export const entityIdPattern = /^[a-z][a-z0-9_]*\.[a-z0-9_]+$/;

export function entityDomain(block) {
  if (!block) return '';
  if (block.type === 'ugso_colour_action') return 'light';
  if (block.type === 'ugso_script_action') return 'script';
  if (block.type === 'ugso_helper_action') return block.getFieldValue('DOMAIN');
  return '';
}

export function matchingEntities(rows, search, domain = '') {
  const words = search.trim().toLocaleLowerCase('de').split(/\s+/).filter(Boolean);
  return rows.filter(row => (!domain || row.domain === domain) && words.every(word => `${row.name} ${row.entity_id}`.toLocaleLowerCase('de').includes(word)));
}

class EntityField extends Blockly.FieldTextInput {
  static fromJson(options) { return new EntityField(options.text || ''); }
  showEditor_() {
    if (openPicker && this.getSourceBlock()?.workspace?.rendered) openPicker(this);
    else super.showEditor_();
  }
}
Blockly.fieldRegistry.register('ugso_field_entity', EntityField);

export function setupEntities(workspace) {
  const status = document.querySelector('.local-badge');
  status.setAttribute('role', 'status');
  const loadButton = document.createElement('button'); loadButton.id = 'entities-refresh'; loadButton.textContent = 'Entitäten laden';
  document.querySelector('.canvas-actions').append(loadButton);
  const dialog = document.createElement('dialog'); dialog.id = 'entity-dialog'; dialog.setAttribute('aria-labelledby', 'entity-title');
  dialog.innerHTML = `<h2 id="entity-title">Entität auswählen</h2><p id="entity-status" role="status"></p><label>Suche nach Name oder ID<input id="entity-search" type="search" autocomplete="off"></label><div id="entity-results" aria-label="Gefundene Entitäten"></div><p id="entity-count"></p><form id="entity-form"><label>Entitäts-ID<input id="entity-id" autocomplete="off" spellcheck="false"></label><p id="entity-error" role="alert"></p><div class="entity-actions"><button type="button" id="entity-refresh">Neu laden</button><button type="button" id="entity-cancel">Abbrechen</button><button type="submit" class="primary">Übernehmen</button></div></form>`;
  document.body.append(dialog);
  const el = id => dialog.querySelector(`#${id}`);
  let rows = [], field, loading = false, message = 'Entitäts-ID kann auch manuell eingegeben werden.';
  function render() {
    el('entity-status').textContent = message;
    const domain = field ? entityDomain(field.getSourceBlock()) : '';
    const matches = matchingEntities(rows, el('entity-search').value, domain);
    el('entity-results').replaceChildren();
    for (const row of matches.slice(0, 150)) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'entity-result';
      const name = document.createElement('strong'), id = document.createElement('span'), state = document.createElement('small');
      name.textContent = row.name; id.textContent = row.entity_id; state.textContent = [row.state, row.unit].filter(Boolean).join(' ');
      button.append(name, id, state); button.dataset.entity = row.entity_id;
      button.setAttribute('aria-pressed', String(el('entity-id').value === row.entity_id));
      button.addEventListener('click', () => { el('entity-id').value = row.entity_id; el('entity-error').textContent = ''; render(); });
      el('entity-results').append(button);
    }
    el('entity-count').textContent = `${matches.length} Treffer${domain ? ` · ${domain}` : ''}${matches.length > 150 ? ' · erste 150 angezeigt, Suche eingrenzen' : ''}`;
  }
  async function refresh() {
    if (loading) return;
    loading = true; loadButton.disabled = el('entity-refresh').disabled = true;
    message = 'Entitäten werden aus Home Assistant geladen …'; render();
    try {
      const response = await fetch(new URL('./api/ha/entities', document.baseURI), { cache: 'no-store', signal: AbortSignal.timeout(12000) });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'HA-Verbindung nicht verfügbar.');
      if (!Array.isArray(data.entities)) throw new Error('Keine gültige Entitätsliste.');
      rows = data.entities.filter(row => row && entityIdPattern.test(row.entity_id) && ['name', 'domain', 'state', 'unit'].every(key => typeof row[key] === 'string'));
      message = `${rows.length} Entitäten aus HA geladen. Zustände sind eine Momentaufnahme.`;
      status.textContent = `HA verbunden · ${rows.length} Entitäten`;
      status.classList.add('connected');
    } catch (error) {
      rows = []; message = error.name === 'TimeoutError' ? 'HA-Abfrage dauert zu lange. Entitäts-ID manuell eingeben.' : (error.message.startsWith('Unexpected') ? 'Keine HA-Verbindung. Entitäts-ID manuell eingeben.' : error.message);
      status.textContent = 'Lokal · manuelle Entitäts-IDs'; status.classList.remove('connected');
    } finally { loading = false; loadButton.disabled = el('entity-refresh').disabled = false; render(); }
  }
  openPicker = selected => {
    if (selected.getSourceBlock()?.workspace !== workspace) return;
    field = selected;
    const input = document.createElement(field.haStructured_ || blockAllowsTemplate(field.getSourceBlock()) ? 'textarea' : 'input');
    input.id = 'entity-id'; input.autocomplete = 'off'; input.spellcheck = false;
    if (input.tagName === 'TEXTAREA') input.rows = 3;
    input.addEventListener('input', () => { el('entity-error').textContent = ''; });
    el('entity-id').replaceWith(input);
    input.parentNode.firstChild.textContent = blockAllowsTemplate(field.getSourceBlock()) ? 'Entitäts-ID oder HA-Template' : 'Entitäts-ID';
    input.value = String(field.getValue()); el('entity-search').value = ''; el('entity-error').textContent = '';
    render(); dialog.showModal(); el('entity-search').focus();
    if (field.haStructured_) input.parentNode.firstChild.textContent = 'Entitäts-ID, JSON-Liste oder HA-Template';
  };
  el('entity-search').addEventListener('input', render);
  el('entity-id').addEventListener('input', () => { el('entity-error').textContent = ''; });
  el('entity-cancel').addEventListener('click', () => dialog.close());
  el('entity-refresh').addEventListener('click', refresh); loadButton.addEventListener('click', refresh);
  el('entity-form').addEventListener('submit', event => {
    event.preventDefault();
    const raw = el('entity-id').value, block = field?.getSourceBlock();
    const id = (field?.haStructured_ || blockAllowsTemplate(block)) && raw.trim() && !entityIdPattern.test(raw.trim()) ? raw : raw.trim();
    if (!block || block.isDisposed()) { dialog.close(); return; }
    let structuredValid = false;
    if (field.haStructured_) {
      structuredValid = !id.trim() || validActionEntity(id);
      if (!structuredValid) try { const list = JSON.parse(id); structuredValid = Array.isArray(list) && list.length > 0 && list.length <= 100 && list.every(item => typeof item === 'string' && entityIdPattern.test(item)); } catch {}
    }
    if (!(field.haStructured_ ? structuredValid : blockAllowsTemplate(block) ? !id.trim() || validActionEntity(id) : entityIdPattern.test(id))) { el('entity-error').textContent = field.haStructured_ ? 'Entitäts-ID, JSON-Liste oder HA-Template erwartet.' : blockAllowsTemplate(block) ? 'Eine Entitäts-ID wie light.wohnzimmer oder ein HA-Template eingeben.' : 'Eine Entitäts-ID wie light.wohnzimmer eingeben.'; return; }
    const domain = entityDomain(block);
    if (id && domain && !id.startsWith(domain + '.')) { el('entity-error').textContent = `Dieser Block benötigt eine ${domain}-Entität.`; return; }
    field.setValue(id); dialog.close();
  });
  dialog.addEventListener('close', () => { field = undefined; });
  refresh();
}
const blockAllowsTemplate = block => block?.type === 'ugso_service_action';
