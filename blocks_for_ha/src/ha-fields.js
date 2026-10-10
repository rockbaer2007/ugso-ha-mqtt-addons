import { translateLabel as t } from './locales.js';

// Keep the original JSON field for older projects. Visible fields overlay only
// edited values, preserving absent keys, scalar/list types and template text.
const commonTrigger = ['id', 'alias', 'enabled', 'variables'];
const triggerKeys = {
  state: ['entity_id', 'from', 'to', 'not_from', 'not_to', 'attribute', 'for'],
  numeric_state: ['entity_id', 'above', 'below', 'attribute', 'value_template', 'for'],
  time: ['at', 'weekday'], time_pattern: ['hours', 'minutes', 'seconds'],
  sun: ['event', 'offset'], homeassistant: ['event'],
  mqtt: ['topic', 'payload', 'value_template', 'qos', 'encoding'],
  template: ['value_template', 'for'], webhook: ['webhook_id', 'allowed_methods', 'local_only'],
  zone: ['entity_id', 'zone', 'event'], device: ['device_id', 'domain', 'entity_id', 'type', 'subtype', 'for'],
  tag: ['tag_id', 'device_id'], conversation: ['command'],
  geo_location: ['source', 'zone', 'event'], calendar: ['entity_id', 'event', 'offset'],
  event: ['event_type', 'event_data', 'event_context'],
};
const conditionKeys = {
  state: ['entity_id', 'state', 'attribute', 'for', 'match'],
  numeric_state: ['entity_id', 'above', 'below', 'attribute', 'value_template'],
  time: ['after', 'before', 'weekday'], sun: ['after', 'before', 'after_offset', 'before_offset'],
  zone: ['entity_id', 'zone'], device: ['device_id', 'domain', 'entity_id', 'type'],
  template: ['value_template'], trigger: ['id'], and: ['conditions'], or: ['conditions'], not: ['conditions'],
};
const targetKeys = ['entity_id', 'device_id', 'area_id', 'floor_id', 'label_id'];
const captions = {
  entity_id: 'Entität', above: 'Über', below: 'Unter', attribute: 'Attribut', for: 'Dauer',
  id: 'ID (optional)', alias: 'Name (optional)', enabled: 'Aktiv', variables: 'Variablen',
  from: 'Von', to: 'Nach', not_from: 'Nicht von', not_to: 'Nicht nach', at: 'Uhrzeit',
  weekday: 'Wochentage', hours: 'Stunden', minutes: 'Minuten', seconds: 'Sekunden',
  event: 'Ereignis', offset: 'Versatz', topic: 'Topic', payload: 'Payload', encoding: 'Kodierung',
  value_template: 'Template', webhook_id: 'Webhook-ID', allowed_methods: 'Methoden',
  local_only: 'Nur lokal', zone: 'Zone', device_id: 'Gerät', domain: 'Bereich', type: 'Typ',
  subtype: 'Untertyp', tag_id: 'Tag-ID', command: 'Sätze', source: 'Quelle',
  event_type: 'Ereignistyp', event_data: 'Ereignisdaten', event_context: 'Ereigniskontext',
  state: 'Zustand', match: 'Übereinstimmung', after: 'Nach', before: 'Vor',
  after_offset: 'Versatz nach', before_offset: 'Versatz vor', conditions: 'Bedingungen',
  action: 'HA-Aktion', service: 'HA-Aktion', area_id: 'Bereich-ID', floor_id: 'Etage', label_id: 'Label',
  data: 'Daten', data_template: 'Daten-Template', response_variable: 'Antwortvariable',
  continue_on_error: 'Bei Fehler fortfahren', metadata: 'Metadaten', timeout: 'Zeitlimit',
  continue_on_timeout: 'Bei Zeitlimit fortfahren', sequence: 'Aktionsgruppe', parallel: 'Parallelzweige',
  choose: 'Auswahlzweige', default: 'Sonst', if: 'Falls', then: 'Dann', else: 'Sonst',
  repeat: 'Wiederholung', delay: 'Pause', wait_template: 'Warte-Template', wait_for_trigger: 'Warte-Auslöser',
  stop: 'Beenden', error: 'Fehler', set_conversation_response: 'Assist-Antwort', scene: 'Szene',
};
const jsonKeys = new Set(['variables', 'event_data', 'event_context', 'conditions', 'data', 'data_template', 'metadata', 'sequence', 'parallel', 'choose', 'default', 'if', 'then', 'else', 'repeat', 'wait_for_trigger']);
const scalarKeys = new Set(['above', 'below', 'for', 'offset', 'after_offset', 'before_offset', 'qos', 'timeout', 'delay', 'number']);
const boolKeys = new Set(['enabled', 'local_only', 'continue_on_error', 'continue_on_timeout', 'error']);
function choices(key, original, source) {
  if (key === 'event') return {sun:['sunrise','sunset'],homeassistant:['start','shutdown'],calendar:['start','end'],zone:['enter','leave'],geo_location:['enter','leave']}[original.trigger];
  if (key === 'match') return ['all','any'];
  if (key === 'type' && source === 'THRESHOLD') return ['any','above','below','between','outside'];
}
const display = value => value === undefined ? '' : typeof value === 'string' ? value : JSON.stringify(value);
const fieldName = path => 'HA_' + path.replaceAll('.', '_').toUpperCase();
function leaves(value, prefix = '') {
  return Object.entries(value).flatMap(([key, item]) => {
    const path = prefix ? prefix + '.' + key : key;
    return item && typeof item === 'object' && !Array.isArray(item) && Object.keys(item).length ? leaves(item, path) : [path];
  });
}
const get = (obj, path) => path.split('.').reduce((value, key) => value?.[key], obj);
function put(obj, path, value) {
  const keys = path.split('.'), key = keys.pop();
  let parent = obj;
  for (const part of keys) {
    if (value === undefined && !Object.hasOwn(parent, part)) return;
    parent = parent[part] ||= {};
  }
  if (value === undefined) delete parent[key]; else parent[key] = value;
}
function parse(text, key) {
  if (text === '') return undefined;
  // Ordinary state/payload text (on, off, numeric strings) remains text.
  if (jsonKeys.has(key) || scalarKeys.has(key) || boolKeys.has(key) || /^[\[{\"]/.test(text.trim()) || text.trim() === 'null') {
    try { return JSON.parse(text); } catch {
      if (jsonKeys.has(key) && !text.includes('{{') && !text.includes('{%')) throw Error(`${captions[key] || key}: Gültiges JSON oder HA-Template erwartet.`);
      if (/^[\[{\"]/.test(text.trim()) && !text.includes('{{') && !text.includes('{%')) throw Error(`${captions[key] || key}: Gültiges JSON erwartet.`);
    }
  }
  return text;
}
function paths(block, original, source) {
  if (source === 'PATTERN') return ['hours', 'minutes', 'seconds'];
  if (source === 'TARGET') return targetKeys;
  if (source === 'OPTIONS') return block.type === 'ugso_wait_trigger' ? ['timeout', 'continue_on_timeout', 'alias', 'enabled', 'continue_on_error'] : block.type === 'ugso_target_action' ? ['alias','enabled','continue_on_error','response_variable','metadata'] : leaves(original);
  if (source === 'THRESHOLD') return leaves(original);
  if (source === 'VARIABLES') return Object.keys(original);
  if (block.type.endsWith('trigger')) return [...(block.type === 'ugso_ha_trigger' ? ['trigger'] : []), ...(triggerKeys[original.trigger] || []), ...commonTrigger];
  if (block.type === 'ugso_ha_condition') return ['condition', ...(conditionKeys[original.condition] || []), 'alias', 'enabled'];
  if (block.type === 'ugso_ha_action') {
    const fields = Object.keys(original).filter(key => !['target', 'alias', 'enabled', 'continue_on_error', 'metadata', 'response_variable'].includes(key));
    if (original.action || original.service) fields.push(...targetKeys.map(key => 'target.' + key), 'data', 'response_variable');
    return [...new Set([...fields, 'alias', 'enabled', 'continue_on_error', 'metadata'])];
  }
  return [];
}
export function setupHAFields(Blockly, block, Multiline) {
  const sources = block.type.startsWith('ugso_ha_') ? ['JSON']
    : block.type === 'ugso_temperature_trigger' ? ['TARGET', 'THRESHOLD']
    : block.type === 'ugso_calendar_trigger' ? ['TARGET', 'OPTIONS']
    : block.type === 'ugso_integration_trigger' ? ['TARGET', 'OPTIONS']
    : block.type === 'ugso_target_action' ? ['OPTIONS']
    : block.type === 'ugso_wait_trigger' ? ['OPTIONS']
    : block.type === 'ugso_time_pattern_trigger' ? ['PATTERN']
    : block.type === 'ugso_variables_action' ? ['VARIABLES'] : [];
  if (!sources.length) return;
  block.haSources_ = {};
  for (const source of sources) {
    const rawField = block.getField(source);
    const hydrate = text => {
      const previous = block.haSources_[source];
      for (const name of previous?.inputs || []) block.removeInput(name);
      delete block.haSources_[source]; rawField.setVisible(true);
      let original;
      try { original = JSON.parse(text); } catch { return; }
      if (!original || typeof original !== 'object' || Array.isArray(original)) return;
      const selected = paths(block, original, source), inputNames = [], fields = [];
      let row, rowSize = 0;
      const remainder = structuredClone(original);
      // The typed trigger already supplies its discriminator in its heading.
      if (source === 'JSON' && block.type !== 'ugso_ha_trigger' && block.type.endsWith('trigger')) delete remainder.trigger;
      for (let i = 0; i < selected.length; i++) {
        const path = selected[i], key = path.split('.').at(-1), name = source === 'VARIABLES' ? 'HA_VARIABLES_' + path : fieldName(source + '.' + path);
        const value = get(original, path), initial = display(value);
        const wide = jsonKeys.has(key) || initial.includes('\n') || typeof value === 'object';
        if (!row || rowSize >= 3 || wide) {
          const inputName = `HA_ROW_${source}_${i}`; row = block.appendDummyInput(inputName); inputNames.push(inputName); rowSize = 0;
        }
        const input = row.appendField(source === 'VARIABLES' ? key : t(captions[key] || key)); rowSize++;
        let field;
        const options = choices(key, original, source);
        if (source === 'VARIABLES') { field = new Multiline(initial); field.setMaxLines(2); }
        else if (options && typeof value !== 'object') field = new Blockly.FieldDropdown([[t('Nicht gesetzt'), ''], ...options.map(option => [option, option]), ...(initial && !options.includes(initial) ? [[initial,initial]] : [])]);
        else if (boolKeys.has(key) && key !== 'enabled') field = new Blockly.FieldDropdown([[t('Nicht gesetzt'), ''], [t('wahr'), 'true'], [t('falsch'), 'false'], ...(initial && !['true', 'false'].includes(initial) ? [[initial, initial]] : [])]);
        else if (key === 'entity_id') field = Blockly.fieldRegistry.fromJson({type:'ugso_field_entity',text:initial});
        else if (jsonKeys.has(key) || initial.includes('\n') || typeof value === 'object') { field = new Multiline(initial); field.setMaxLines(2); field.maxDisplayLength = 45; }
        else field = new Blockly.FieldTextInput(initial);
        input.appendField(field, name); field.setValue(initial);
        if (key === 'entity_id') field.haStructured_ = true;
        fields.push({path, key, name, initial});
        put(remainder, path, undefined);
        if (wide) row = undefined;
      }
      if (remainder.target && !Object.keys(remainder.target).length) delete remainder.target;
      const extraName = `HA_EXTRA_${source}`, extraInput = `HA_ROW_${source}_EXTRA`;
      block.appendDummyInput(extraInput).appendField(t('Weitere Optionen (JSON)')).appendField(new Multiline(JSON.stringify(remainder)), extraName); inputNames.push(extraInput);
      block.haSources_[source] = { original, fields, extraName, remainder, inputs: inputNames };
      // Hide only the legacy field, retaining its heading and serialization.
      rawField.setVisible(false);
      block.setInputsInline(false);
    };
    hydrate(rawField.getValue());
    rawField.setValidator(value => { hydrate(value); return value; });
  }
}
export function structuredHAJSON(block, source) {
  const state = block.haSources_?.[source];
  if (!state) return undefined;
  const result = structuredClone(state.original);
  const extraText = block.getFieldValue(state.extraName);
  let extra;
  try { extra = JSON.parse(extraText); } catch { throw Error('Weitere Optionen: Gültiges JSON-Objekt erwartet.'); }
  if (!extra || typeof extra !== 'object' || Array.isArray(extra)) throw Error('Weitere Optionen: JSON-Objekt erwartet.');
  // Additional options are editable, but cannot overwrite visible fields.
  for (const key of Object.keys(state.remainder)) delete result[key];
  for (const [key, value] of Object.entries(extra)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') throw Error('Weitere Optionen: Ungültiger Schlüssel.');
    if (key === 'target' && state.fields.some(field => field.path.startsWith('target.'))) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Ziel: JSON-Objekt erwartet.');
      result.target = {...result.target, ...value};
    } else result[key] = value;
  }
  for (const field of state.fields) {
    const text = block.getFieldValue(field.name);
    if (text !== field.initial) {
      let value;
      if (source === 'VARIABLES') { try { value = JSON.parse(text); } catch { value = text; } }
      else {
        const original = get(state.original, field.path);
        if (text && ['number', 'boolean'].includes(typeof original)) { try { value = JSON.parse(text); } catch { value = text; } }
        else value = parse(text, field.key);
      }
      put(result, field.path, value);
    }
    else if (get(state.original, field.path) !== undefined) put(result, field.path, structuredClone(get(state.original, field.path)));
    else if (get(result, field.path) !== undefined) throw Error(`${field.key}: Im beschrifteten Feld bearbeiten.`);
  }
  if (result.target && !Object.keys(result.target).length && (!Object.hasOwn(state.original, 'target') || Object.keys(state.original.target).length)) delete result.target;
  return result;
}
