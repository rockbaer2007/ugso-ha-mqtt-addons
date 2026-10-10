import { parseDocument, stringify } from 'yaml';

import { checkAutomation } from './ha-schema.js';

export function validateAutomation(model) { return checkAutomation(model); }
export function toYaml(model, format = 'single', { omitId = false } = {}) {
  validateAutomation(model);
  const { id, ...editorModel } = model;
  const output = omitId ? editorModel : model;
  return stringify(format === 'list' ? [output] : output, { lineWidth: 0, aliasDuplicateObjects: false });
}
export function fromYaml(source) {
  if (source.length > 1000000) throw new Error('Datei ist größer als 1 MB.');
  const doc = parseDocument(source, { uniqueKeys: true, schema: 'core' });
  if (doc.errors.length || doc.warnings.length) throw new Error('YAML ist ungültig oder enthält nicht unterstützte Tags.');
  let model = doc.toJS({ maxAliasCount: 50 });
  if (Array.isArray(model)) { if (model.length !== 1) throw new Error('Bitte eine Datei mit genau einer Automation öffnen.'); model = model[0]; }
  // Omitted optional fields receive Home Assistant defaults.
  model = { conditions: [], mode: 'single', ...model };
  return validateAutomation(model);
}
export function filename(alias = 'automation') {
  return (alias.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'automation') + '.yaml';
}
export const examples = {
  light: { id: 'ugso_motion_light', alias: 'Licht bei Bewegung', description: 'Bei Bewegung das Flurlicht einschalten.', triggers: [{ trigger: 'state', entity_id: 'binary_sensor.flur_bewegung', to: 'on' }], conditions: [], actions: [{ action: 'light.turn_on', target: { entity_id: 'light.flur' } }], mode: 'restart' },
  battery: { id: 'ugso_battery_charge', alias: 'Batterie laden', description: 'Unter 20 % die Ladefreigabe einschalten.', triggers: [{ trigger: 'numeric_state', entity_id: 'sensor.batterie_ladezustand', below: 20 }], conditions: [{ condition: 'state', entity_id: 'input_boolean.laden_erlaubt', state: 'on' }], actions: [{ action: 'switch.turn_on', target: { entity_id: 'switch.ladefreigabe' } }], mode: 'single' },
  evening: { id: 'ugso_evening_light', alias: 'Abendlicht', description: 'Nach Sonnenuntergang einschalten, nach fünf Minuten ausschalten.', triggers: [{ trigger: 'sun', event: 'sunset' }], conditions: [], actions: [{ action: 'light.turn_on', target: { entity_id: 'light.wohnzimmer' } }, { delay: 300 }, { action: 'light.turn_off', target: { entity_id: 'light.wohnzimmer' } }], mode: 'restart' }
};
