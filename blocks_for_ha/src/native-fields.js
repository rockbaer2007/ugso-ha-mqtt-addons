import { translateLabel as t } from './locales.js';

export function installNativeFields(Blockly, block, FieldMultilineInput) {
  if (['ugso_state_trigger', 'ugso_numeric_trigger', 'ugso_time_trigger', 'ugso_time_pattern_trigger', 'ugso_sun_trigger', 'ugso_start_trigger', 'ugso_event_trigger', 'ugso_temperature_trigger', 'ugso_calendar_trigger'].includes(block.type)) block.appendDummyInput('TRIGGER_OPTIONS').appendField(t('Auslöser-ID (optional)')).appendField(new Blockly.FieldTextInput(''), 'TRIGGER_ID');
  if (block.type === 'ugso_time_trigger') block.appendDummyInput('TIME_OPTIONS').appendField(t('Uhrzeiten als JSON-Liste')).appendField(new Blockly.FieldCheckbox('FALSE'), 'TIME_LIST');
  if (block.type === 'ugso_state_trigger') {
    block.appendDummyInput('STATE_OPTIONS').appendField(t('Zustände als JSON-Liste')).appendField(new Blockly.FieldCheckbox('FALSE'), 'STATE_LIST').appendField(t('Jede Änderung')).appendField(new Blockly.FieldCheckbox('FALSE'), 'ANY_STATE');
    block.appendDummyInput('ENTITY_OPTIONS').appendField(t('Entitäten als JSON-Liste')).appendField(new Blockly.FieldCheckbox('FALSE'), 'ENTITY_LIST').appendField(new FieldMultilineInput('[]'), 'ENTITIES');
  }
  if (block.type === 'ugso_numeric_trigger') {
    block.appendDummyInput('ENTITY_OPTIONS').appendField(t('Entitäten als JSON-Liste')).appendField(new Blockly.FieldCheckbox('FALSE'), 'ENTITY_LIST').appendField(new FieldMultilineInput('[]'), 'ENTITIES');
    block.appendDummyInput('DURATION_OPTIONS').appendField(t('Haltezeit (JSON)')).appendField(new FieldMultilineInput('{"hours":0,"minutes":1,"seconds":0}'), 'FOR').appendField(t('verwenden')).appendField(new Blockly.FieldCheckbox('FALSE'), 'USE_FOR');
  }
  if (block.type === 'ugso_service_action') {
    block.appendDummyInput('ACTION_RESPONSE').appendField(t('Antwortvariable (optional)')).appendField(new Blockly.FieldTextInput(''), 'RESPONSE_VARIABLE');
    block.appendDummyInput('TARGET_OPTIONS').appendField(t('Ziele als JSON-Liste')).appendField(new Blockly.FieldCheckbox('FALSE'), 'ENTITY_LIST').appendField(new FieldMultilineInput('[]'), 'ENTITIES');
    block.appendDummyInput('DATA_OPTIONS').appendField(t('Leere Daten ausgeben')).appendField(new Blockly.FieldCheckbox('FALSE'), 'INCLUDE_DATA');
    block.appendDummyInput('ACTION_METADATA').appendField(t('Metadaten ausgeben')).appendField(new Blockly.FieldCheckbox('FALSE'), 'INCLUDE_METADATA').appendField(new FieldMultilineInput('{}'), 'METADATA');
  }
}
export function nativeList(block, name, listFlag) {
  const value = block.getFieldValue(name);
  if (block.getFieldValue(listFlag) !== 'TRUE') return value;
  let items;
  try { items = JSON.parse(value); } catch { throw new Error(`${name}: Gültige JSON-Liste erwartet.`); }
  if (!Array.isArray(items) || !items.length || items.length > 100 || items.some(item => typeof item !== 'string' || !item.trim())) throw new Error(`${name}: 1–100 Texte in einer JSON-Liste erforderlich.`);
  return items;
}
export function nativeObject(block, name) {
  let value;
  try { value = JSON.parse(block.getFieldValue(name) || '{}'); } catch { throw new Error(`${name}: Gültiges JSON-Objekt erwartet.`); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name}: JSON-Objekt erwartet.`);
  return value;
}
export function nativeTimeExpression(block) {
  const clock = name => {
    const value = block.getFieldValue(name);
    if (!value) return '';
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) throw new Error('HA-Uhrzeit: HH:MM oder HH:MM:SS erwartet.');
    return value.length === 5 ? value + ':00' : value;
  };
  const after = clock('AFTER'), before = clock('BEFORE');
  if (!after && !before) throw new Error('HA-Uhrzeit: Vor oder nach einer Uhrzeit erforderlich.');
  const lower = `now() >= today_at(${JSON.stringify(after)})`, upper = `now() < today_at(${JSON.stringify(before)})`;
  if (!after) return `(${upper})`;
  if (!before) return `(${lower})`;
  // Native HA time windows include after, exclude before, and equal bounds span all day.
  return `(${lower} ${after < before ? 'and' : 'or'} ${upper})`;
}
