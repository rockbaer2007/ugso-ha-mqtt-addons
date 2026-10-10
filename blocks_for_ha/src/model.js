import { parseDocument, stringify } from 'yaml';

const identifier = /^[a-z][a-z0-9_]*\.[a-z0-9_]+$/;
const allowedModes = ['single', 'restart', 'queued', 'parallel'];
const ownKeys = (obj, keys, path) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error(`${path}: Objekt erwartet.`);
  const extra = Object.keys(obj).filter(key => !keys.includes(key));
  if (extra.length) throw new Error(`${path}: Noch nicht unterstützt: ${extra.join(', ')}. Die Datei bleibt unverändert.`);
};
const text = (value, path) => { if (typeof value !== 'string' || !value.trim()) throw new Error(`${path}: Text fehlt.`); return value; };
const entity = (value, path) => { if (!identifier.test(value)) throw new Error(`${path}: Entität im Format domain.name erwartet.`); return value; };
const numeric = (value, path) => { if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${path}: Gültige Zahl erwartet.`); return value; };
const time = (value, path) => { if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) throw new Error(`${path}: Uhrzeit HH:MM oder HH:MM:SS erwartet.`); return value; };
const oneOrList = (value, path, check) => Array.isArray(value) ? checkList(value, path, check, 1) : check(value, path);

function checkList(items, path, check, min = 0) {
  if (!Array.isArray(items) || items.length < min) throw new Error(`${path}: Mindestens ${min} Eintrag erforderlich.`);
  if (items.length > 100) throw new Error(`${path}: Höchstens 100 Einträge erlaubt.`);
  items.forEach((item, i) => check(item, `${path} ${i + 1}`));
}
function checkTrigger(item, path) {
  if (item.id !== undefined) text(item.id, path + ' ID');
  if (item.trigger === 'state') {
    ownKeys(item, ['trigger', 'entity_id', 'to', 'id'], path); entity(item.entity_id, path); oneOrList(item.to, path, text);
  } else if (item.trigger === 'numeric_state') {
    ownKeys(item, ['trigger', 'entity_id', 'above', 'below', 'id'], path); entity(item.entity_id, path); checkRange(item, path);
  } else if (item.trigger === 'time') {
    ownKeys(item, ['trigger', 'at', 'id'], path); time(item.at, path);
  } else if (item.trigger === 'sun') {
    ownKeys(item, ['trigger', 'event', 'id'], path); if (!['sunrise', 'sunset'].includes(item.event)) throw new Error(`${path}: Sonnenereignis ungültig.`);
  } else if (item.trigger === 'homeassistant') {
    ownKeys(item, ['trigger', 'event', 'id'], path); if (item.event !== 'start') throw new Error(`${path}: Nur HA-Start unterstützt.`);
  } else throw new Error(`${path}: Auslöser wird noch nicht unterstützt.`);
}
function checkRange(item, path) {
  const keys = ['above', 'below'].filter(key => Object.hasOwn(item, key));
  if (keys.length !== 1) throw new Error(`${path}: Genau eine Grenze (above oder below) wird unterstützt.`);
  numeric(item[keys[0]], path);
}
function checkCondition(item, path, depth = 0) {
  if (depth > 10) throw new Error('Bedingungen sind zu tief verschachtelt.');
  if (item.condition === 'trigger') {
    ownKeys(item, ['condition', 'id'], path); oneOrList(item.id, path, text);
  } else if (item.condition === 'template') {
    ownKeys(item, ['condition', 'value_template'], path); text(item.value_template, path);
  } else if (item.condition === 'state') {
    ownKeys(item, ['condition', 'entity_id', 'state'], path); entity(item.entity_id, path); text(item.state, path);
  } else if (item.condition === 'numeric_state') {
    ownKeys(item, ['condition', 'entity_id', 'above', 'below'], path); entity(item.entity_id, path); checkRange(item, path);
  } else if (['and', 'or', 'not'].includes(item.condition)) {
    ownKeys(item, ['condition', 'conditions'], path); checkList(item.conditions, path, (child, p) => checkCondition(child, p, depth + 1), 1);
  } else throw new Error(`${path}: Bedingung wird noch nicht unterstützt.`);
}
function checkAction(item, path, depth = 0) {
  if (depth > 10) throw new Error('Aktionen sind zu tief verschachtelt.');
  if (item.variables) {
    ownKeys(item, ['variables'], path);
    ownKeys(item.variables, Object.keys(item.variables), path);
    if (Object.keys(item.variables).length !== 1) throw new Error(`${path}: Pro Variablen-Aktion wird genau eine Variable unterstützt.`);
    for (const [name, value] of Object.entries(item.variables)) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) throw new Error(`${path}: Variablenname ungültig.`);
      if (value !== null && !['string', 'boolean'].includes(typeof value) && !(typeof value === 'number' && Number.isFinite(value))) throw new Error(`${path}: Variablenwert muss Text, Template, Zahl, Boolean oder null sein.`);
    }
  } else if (item.action) {
    ownKeys(item, ['action', 'target', 'data', 'metadata'], path); entity(item.action, path);
    if (Object.hasOwn(item, 'target')) { ownKeys(item.target, ['entity_id'], path); oneOrList(item.target.entity_id, path, entity); }
    if (Object.hasOwn(item, 'metadata')) { ownKeys(item.metadata, Object.keys(item.metadata || {}), path); if (JSON.stringify(item.metadata).length > 10000) throw new Error(`${path}: Metadaten zu groß.`); }
    if (Object.hasOwn(item, 'data')) { ownKeys(item.data, item.data && typeof item.data === 'object' ? Object.keys(item.data) : [], path); if (JSON.stringify(item.data).length > 10000) throw new Error(`${path}: Aktionsdaten zu groß.`); }
  } else if (Object.hasOwn(item, 'delay')) {
    ownKeys(item, ['delay'], path);
    if (typeof item.delay === 'number') { numeric(item.delay, path); if (!Number.isInteger(item.delay) || item.delay < 0 || item.delay > 86400) throw new Error(`${path}: Wartezeit 0–86400 ganze Sekunden.`); }
    else checkDuration(item.delay, path);
  } else if (Object.hasOwn(item, 'stop')) {
    ownKeys(item, ['stop', 'error'], path); text(item.stop, path); if (typeof item.error !== 'boolean') throw new Error(`${path}: error muss Boolean sein.`);
  } else if (Object.hasOwn(item, 'wait_template')) {
    ownKeys(item, ['wait_template', 'timeout', 'continue_on_timeout'], path); text(item.wait_template, path); checkDuration(item.timeout, path);
    if (typeof item.continue_on_timeout !== 'boolean') throw new Error(`${path}: Timeout-Verhalten fehlt.`);
  } else if (Object.hasOwn(item, 'repeat')) {
    ownKeys(item, ['repeat'], path); ownKeys(item.repeat, ['count', 'while', 'until', 'for_each', 'sequence'], path);
    const r = item.repeat, modes = ['count', 'while', 'until', 'for_each'].filter(k => Object.hasOwn(r, k));
    if (modes.length !== 1) throw new Error(`${path}: Genau eine Wiederholungsart erforderlich.`);
    if (modes[0] === 'count') {
      if (typeof r.count === 'number') { if (!Number.isInteger(r.count) || r.count < 1 || r.count > 10000) throw new Error(`${path}: 1–10000 ganze Durchläufe.`); }
      else checkTemplate(r.count, path);
    } else if (modes[0] === 'for_each') checkTemplate(r.for_each, path);
    else checkList(r[modes[0]], path, (child, p) => checkCondition(child, p, depth + 1), 1);
    checkList(r.sequence, path, (child, p) => checkAction(child, p, depth + 1), 1);
  } else if (item.choose) {
    ownKeys(item, ['choose', 'default'], path);
    checkList(item.choose, path, (branch, p) => {
      ownKeys(branch, ['conditions', 'sequence'], p);
      checkList(branch.conditions, p, checkCondition, 1);
      checkList(branch.sequence, p, (child, cp) => checkAction(child, cp, depth + 1), 1);
    }, 1);
    if (Object.hasOwn(item, 'default')) checkList(item.default, path, (child, p) => checkAction(child, p, depth + 1));
  } else if (item.if) {
    ownKeys(item, ['if', 'then', 'else'], path);
    checkList(item.if, path, checkCondition, 1);
    checkList(item.then, path, (child, p) => checkAction(child, p, depth + 1), 1);
    if (item.else) checkList(item.else, path, (child, p) => checkAction(child, p, depth + 1));
  } else throw new Error(`${path}: Aktion wird noch nicht unterstützt.`);
}
function checkTemplate(value, path) {
  if (typeof value !== 'string' || !/^\s*\{\{[\s\S]+\}\}\s*$/.test(value)) throw new Error(`${path}: Einzelnes HA-Ausgabetemplate erforderlich.`);
}
function checkDuration(value, path) {
  ownKeys(value, ['milliseconds', 'seconds', 'minutes', 'hours'], path);
  const entries = Object.entries(value);
  if (entries.length !== 1) throw new Error(`${path}: Genau eine Dauereinheit erforderlich.`);
  const [unit, amount] = entries[0];
  if (typeof amount === 'number') {
    numeric(amount, path);
    if (amount < 0 || amount * ({ milliseconds: .001, seconds: 1, minutes: 60, hours: 3600 }[unit]) > 86400) throw new Error(`${path}: Dauer 0–86400 Sekunden.`);
  } else checkTemplate(amount, path);
}
export function validateAutomation(model) {
  ownKeys(model, ['id', 'alias', 'description', 'triggers', 'conditions', 'actions', 'mode', 'max'], 'Automation');
  text(model.alias, 'Name');
  if (model.id !== undefined) text(model.id, 'ID');
  if (model.description !== undefined && typeof model.description !== 'string') throw new Error('Beschreibung: Text erwartet.');
  if (!allowedModes.includes(model.mode)) throw new Error('Ungültiger Ausführungsmodus.');
  if (model.max !== undefined && (!['queued', 'parallel'].includes(model.mode) || !Number.isInteger(model.max) || model.max < 1 || model.max > 100)) throw new Error('Maximalzahl nur für queued/parallel (1–100).');
  checkList(model.triggers, 'Auslöser', checkTrigger, 1);
  checkList(model.conditions, 'Bedingung', checkCondition);
  checkList(model.actions, 'Aktion', checkAction, 1);
  return model;
}
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
export function filename(alias) {
  return (alias.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'automation') + '.yaml';
}
export const examples = {
  light: { id: 'ugso_motion_light', alias: 'Licht bei Bewegung', description: 'Bei Bewegung das Flurlicht einschalten.', triggers: [{ trigger: 'state', entity_id: 'binary_sensor.flur_bewegung', to: 'on' }], conditions: [], actions: [{ action: 'light.turn_on', target: { entity_id: 'light.flur' } }], mode: 'restart' },
  battery: { id: 'ugso_battery_charge', alias: 'Batterie laden', description: 'Unter 20 % die Ladefreigabe einschalten.', triggers: [{ trigger: 'numeric_state', entity_id: 'sensor.batterie_ladezustand', below: 20 }], conditions: [{ condition: 'state', entity_id: 'input_boolean.laden_erlaubt', state: 'on' }], actions: [{ action: 'switch.turn_on', target: { entity_id: 'switch.ladefreigabe' } }], mode: 'single' },
  evening: { id: 'ugso_evening_light', alias: 'Abendlicht', description: 'Nach Sonnenuntergang einschalten, nach fünf Minuten ausschalten.', triggers: [{ trigger: 'sun', event: 'sunset' }], conditions: [], actions: [{ action: 'light.turn_on', target: { entity_id: 'light.wohnzimmer' } }, { delay: 300 }, { action: 'light.turn_off', target: { entity_id: 'light.wohnzimmer' } }], mode: 'restart' }
};
