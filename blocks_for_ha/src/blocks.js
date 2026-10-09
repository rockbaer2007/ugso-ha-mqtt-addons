import * as BlocklyModule from 'blockly/core';
import * as De from 'blockly/msg/de';
// Blockly exposes ESM in the browser and CommonJS for Node's headless tests.
const Blockly = Reflect.get(BlocklyModule, 'default') || BlocklyModule;
Blockly.setLocale(De);

const entityField = (value) => ({ type: 'field_input', name: 'ENTITY', text: value });
const number = { type: 'field_number', name: 'LIMIT', value: 20 };
const direction = { type: 'field_dropdown', name: 'OP', options: [['unter', 'below'], ['über', 'above']] };
const statement = (name, check) => ({ type: 'input_statement', name, check });
const definitions = [
  { type: 'ugso_automation', message0: 'Automation %1 Wenn %2 Nur wenn %3 Dann %4', args0: [{ type: 'input_dummy' }, statement('TRIGGERS', 'Trigger'), statement('CONDITIONS', 'Condition'), statement('ACTIONS', 'Action')], colour: '#187b72', tooltip: 'Eine native Home-Assistant-Automation. Name und Modus stehen über der Arbeitsfläche.', deletable: false },
  { type: 'ugso_state_trigger', message0: 'Wenn %1 den Zustand %2 erreicht', args0: [entityField('binary_sensor.flur_bewegung'), { type: 'field_input', name: 'STATE', text: 'on' }], previousStatement: 'Trigger', nextStatement: 'Trigger', colour: '#b26c24', tooltip: 'Reagiert auf eine Zustandsänderung.' },
  { type: 'ugso_numeric_trigger', message0: 'Wenn %1 %2 %3 fällt / steigt', args0: [entityField('sensor.batterie_ladezustand'), direction, number], previousStatement: 'Trigger', nextStatement: 'Trigger', colour: '#b26c24', tooltip: 'Startet beim Überschreiten einer Grenze, nicht fortlaufend solange die Bedingung wahr ist.' },
  { type: 'ugso_time_trigger', message0: 'Wenn es %1 Uhr ist', args0: [{ type: 'field_input', name: 'TIME', text: '18:00:00' }], previousStatement: 'Trigger', nextStatement: 'Trigger', colour: '#b26c24' },
  { type: 'ugso_sun_trigger', message0: 'Bei %1', args0: [{ type: 'field_dropdown', name: 'EVENT', options: [['Sonnenuntergang', 'sunset'], ['Sonnenaufgang', 'sunrise']] }], previousStatement: 'Trigger', nextStatement: 'Trigger', colour: '#b26c24' },
  { type: 'ugso_start_trigger', message0: 'Wenn Home Assistant startet', previousStatement: 'Trigger', nextStatement: 'Trigger', colour: '#b26c24' },
  { type: 'ugso_state_condition', message0: '%1 ist %2', args0: [entityField('input_boolean.laden_erlaubt'), { type: 'field_input', name: 'STATE', text: 'on' }], previousStatement: 'Condition', nextStatement: 'Condition', colour: '#6860b5' },
  { type: 'ugso_numeric_condition', message0: '%1 ist %2 %3', args0: [entityField('sensor.batterie_ladezustand'), direction, number], previousStatement: 'Condition', nextStatement: 'Condition', colour: '#6860b5' },
  { type: 'ugso_logic_condition', message0: '%1 dieser Bedingungen %2', args0: [{ type: 'field_dropdown', name: 'LOGIC', options: [['Alle', 'and'], ['Mindestens eine', 'or'], ['Keine', 'not']] }, statement('CONDITIONS', 'Condition')], previousStatement: 'Condition', nextStatement: 'Condition', colour: '#6860b5' },
  { type: 'ugso_switch_action', message0: '%1 %2', args0: [entityField('light.flur'), { type: 'field_dropdown', name: 'SERVICE', options: [['einschalten', 'turn_on'], ['ausschalten', 'turn_off'], ['umschalten', 'toggle']] }], previousStatement: 'Action', nextStatement: 'Action', colour: '#2682a5', tooltip: 'Erzeugt eine Aktion der Domain der gewählten Entität. Prüfe die Verfügbarkeit in HA.' },
  { type: 'ugso_service_action', message0: 'HA-Aktion %1 Ziel %2 Daten (JSON) %3', args0: [{ type: 'field_input', name: 'SERVICE', text: 'notify.mobile_app_telefon' }, { type: 'field_input', name: 'ENTITY', text: '' }, { type: 'field_input', name: 'DATA', text: '{"message":"Hallo!"}' }], previousStatement: 'Action', nextStatement: 'Action', colour: '#2682a5', tooltip: 'Ziel darf leer bleiben. Daten als JSON-Objekt; Integration muss in HA vorhanden sein.' },
  { type: 'ugso_delay_action', message0: 'Warte %1 Sekunden', args0: [{ type: 'field_number', name: 'SECONDS', value: 30, min: 0, max: 86400, precision: 1 }], previousStatement: 'Action', nextStatement: 'Action', colour: '#2682a5' },
  { type: 'ugso_if_action', message0: 'Wenn %1 Dann %2 Sonst %3', args0: [statement('CONDITIONS', 'Condition'), statement('THEN', 'Action'), statement('ELSE', 'Action')], previousStatement: 'Action', nextStatement: 'Action', colour: '#2682a5' }
];
Blockly.defineBlocksWithJsonArray(definitions);
export { Blockly };
export const knownTypes = new Set(definitions.map(item => item.type));
export const toolbox = { kind: 'categoryToolbox', contents: [
  { kind: 'category', name: 'Auslöser', colour: '#b26c24', contents: ['state', 'numeric', 'time', 'sun', 'start'].map(type => ({ kind: 'block', type: `ugso_${type}_trigger` })) },
  { kind: 'category', name: 'Bedingungen', colour: '#6860b5', contents: ['state', 'numeric', 'logic'].map(type => ({ kind: 'block', type: `ugso_${type}_condition` })) },
  { kind: 'category', name: 'Aktionen', colour: '#2682a5', contents: ['switch', 'service', 'delay', 'if'].map(type => ({ kind: 'block', type: `ugso_${type}_action` })) }
] };
const field = (block, name) => block.getFieldValue(name);
function chain(block, convert, depth = 0) {
  if (depth > 10) throw new Error('Blocks sind zu tief verschachtelt.');
  const items = [];
  while (block) { items.push(convert(block, depth)); block = block.getNextBlock(); }
  return items;
}
const range = (block) => ({ entity_id: field(block, 'ENTITY'), [field(block, 'OP')]: Number(field(block, 'LIMIT')) });
function readTrigger(block) {
  switch (block.type) {
    case 'ugso_state_trigger': return { trigger: 'state', entity_id: field(block, 'ENTITY'), to: field(block, 'STATE') };
    case 'ugso_numeric_trigger': return { trigger: 'numeric_state', ...range(block) };
    case 'ugso_time_trigger': return { trigger: 'time', at: field(block, 'TIME') };
    case 'ugso_sun_trigger': return { trigger: 'sun', event: field(block, 'EVENT') };
    case 'ugso_start_trigger': return { trigger: 'homeassistant', event: 'start' };
    default: throw new Error('Unbekannter Auslöser.');
  }
}
function readCondition(block, depth) {
  switch (block.type) {
    case 'ugso_state_condition': return { condition: 'state', entity_id: field(block, 'ENTITY'), state: field(block, 'STATE') };
    case 'ugso_numeric_condition': return { condition: 'numeric_state', ...range(block) };
    case 'ugso_logic_condition': return { condition: field(block, 'LOGIC'), conditions: chain(block.getInputTargetBlock('CONDITIONS'), readCondition, depth + 1) };
    default: throw new Error('Unbekannte Bedingung.');
  }
}
function readAction(block, depth) {
  switch (block.type) {
    case 'ugso_switch_action': { const id = field(block, 'ENTITY'); return { action: `${id.split('.')[0]}.${field(block, 'SERVICE')}`, target: { entity_id: id } }; }
    case 'ugso_service_action': {
      let data;
      try { data = JSON.parse(field(block, 'DATA') || '{}'); } catch { throw new Error('HA-Aktion: Aktionsdaten sind kein gültiges JSON.'); }
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('HA-Aktion: Aktionsdaten müssen ein JSON-Objekt sein.');
      return { action: field(block, 'SERVICE'), ...(field(block, 'ENTITY') ? { target: { entity_id: field(block, 'ENTITY') } } : {}), ...(Object.keys(data || {}).length ? { data } : {}) };
    }
    case 'ugso_delay_action': return { delay: Number(field(block, 'SECONDS')) };
    case 'ugso_if_action': {
      const otherwise = chain(block.getInputTargetBlock('ELSE'), readAction, depth + 1);
      return { if: chain(block.getInputTargetBlock('CONDITIONS'), readCondition, depth + 1), then: chain(block.getInputTargetBlock('THEN'), readAction, depth + 1), ...(otherwise.length ? { else: otherwise } : {}) };
    }
    default: throw new Error('Unbekannte Aktion.');
  }
}
export function workspaceModel(workspace, metadata) {
  const roots = workspace.getTopBlocks(false);
  if (roots.length !== 1 || roots[0].type !== 'ugso_automation') throw new Error('Alle Blocks müssen mit genau einer Automation verbunden sein.');
  const root = roots[0];
  return { ...metadata, triggers: chain(root.getInputTargetBlock('TRIGGERS'), readTrigger), conditions: chain(root.getInputTargetBlock('CONDITIONS'), readCondition), actions: chain(root.getInputTargetBlock('ACTIONS'), readAction) };
}
function create(workspace, type, fields = {}) {
  const block = workspace.newBlock(type);
  Object.entries(fields).forEach(([key, value]) => block.setFieldValue(String(value), key));
  if (workspace.rendered) { block.initSvg(); block.render(); }
  return block;
}
function attach(parent, input, children) {
  let connection = parent.getInput(input).connection;
  children.forEach(block => { connection.connect(block.previousConnection); connection = block.nextConnection; });
}
const fieldsRange = (item) => ({ ENTITY: item.entity_id, OP: Object.hasOwn(item, 'above') ? 'above' : 'below', LIMIT: item.above ?? item.below });
function triggerBlock(workspace, item) {
  switch (item.trigger) {
    case 'state': return create(workspace, 'ugso_state_trigger', { ENTITY: item.entity_id, STATE: item.to });
    case 'numeric_state': return create(workspace, 'ugso_numeric_trigger', fieldsRange(item));
    case 'time': return create(workspace, 'ugso_time_trigger', { TIME: item.at });
    case 'sun': return create(workspace, 'ugso_sun_trigger', { EVENT: item.event });
    case 'homeassistant': return create(workspace, 'ugso_start_trigger');
  }
}
function conditionBlock(workspace, item) {
  if (item.condition === 'state') return create(workspace, 'ugso_state_condition', { ENTITY: item.entity_id, STATE: item.state });
  if (item.condition === 'numeric_state') return create(workspace, 'ugso_numeric_condition', fieldsRange(item));
  const block = create(workspace, 'ugso_logic_condition', { LOGIC: item.condition });
  attach(block, 'CONDITIONS', item.conditions.map(child => conditionBlock(workspace, child))); return block;
}
function actionBlock(workspace, item) {
  if (item.action) {
    const id = item.target?.entity_id;
    if (!item.data && id && ['turn_on', 'turn_off', 'toggle'].some(service => item.action === `${id.split('.')[0]}.${service}`)) return create(workspace, 'ugso_switch_action', { ENTITY: id, SERVICE: item.action.split('.')[1] });
    return create(workspace, 'ugso_service_action', { SERVICE: item.action, ENTITY: id || '', DATA: JSON.stringify(item.data || {}) });
  }
  if (Object.hasOwn(item, 'delay')) return create(workspace, 'ugso_delay_action', { SECONDS: item.delay });
  const block = create(workspace, 'ugso_if_action');
  attach(block, 'CONDITIONS', item.if.map(child => conditionBlock(workspace, child)));
  attach(block, 'THEN', item.then.map(child => actionBlock(workspace, child)));
  attach(block, 'ELSE', (item.else || []).map(child => actionBlock(workspace, child))); return block;
}
export function modelWorkspace(workspace, model) {
  Blockly.Events.disable();
  try {
    workspace.clear();
    const root = create(workspace, 'ugso_automation'); root.setDeletable(false);
    attach(root, 'TRIGGERS', model.triggers.map(item => triggerBlock(workspace, item)));
    attach(root, 'CONDITIONS', model.conditions.map(item => conditionBlock(workspace, item)));
    attach(root, 'ACTIONS', model.actions.map(item => actionBlock(workspace, item)));
    if (workspace.rendered) root.moveBy(38, 38);
    workspace.clearUndo();
  } finally { Blockly.Events.enable(); }
}
