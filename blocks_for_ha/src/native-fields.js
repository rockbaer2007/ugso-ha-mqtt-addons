import { translateLabel as t } from './locales.js';

export function installNativeFields(Blockly, block, FieldMultilineInput) {
  if (['ugso_state_trigger', 'ugso_numeric_trigger', 'ugso_time_trigger', 'ugso_sun_trigger', 'ugso_start_trigger'].includes(block.type)) block.appendDummyInput('TRIGGER_OPTIONS').appendField(t('Auslöser-ID (optional)')).appendField(new Blockly.FieldTextInput(''), 'TRIGGER_ID');
  if (block.type === 'ugso_state_trigger') block.appendDummyInput('STATE_OPTIONS').appendField(t('Zustände als JSON-Liste')).appendField(new Blockly.FieldCheckbox('FALSE'), 'STATE_LIST');
  if (block.type === 'ugso_service_action') {
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
