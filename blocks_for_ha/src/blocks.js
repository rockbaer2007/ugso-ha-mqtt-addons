import * as BlocklyModule from 'blockly/core';
import * as De from 'blockly/msg/de';
import 'blockly/blocks';
// Blockly exposes ESM in the browser and CommonJS for Node's headless tests.
const Blockly = Reflect.get(BlocklyModule, 'default') || BlocklyModule;
Blockly.setLocale(De);

const entityField = (value) => ({ type: 'field_input', name: 'ENTITY', text: value });
const number = value('LIMIT', 'Number');
const direction = { type: 'field_dropdown', name: 'OP', options: [['unter', 'below'], ['über', 'above']] };
const statement = (name, check) => ({ type: 'input_statement', name, check });
function value(name, check) { return { type: 'input_value', name, check }; }
const definitions = [
  { type: 'ugso_text', message0: 'Text %1', args0: [{ type: 'field_input', name: 'TEXT', text: 'Automation gestartet' }], output: 'String', colour: '#2e7653' },
  { type: 'ugso_log_action', message0: 'Log %1 Meldung %2', args0: [{ type: 'field_dropdown', name: 'LEVEL', options: [['Info', 'info'], ['Warnung', 'warning'], ['Fehler', 'error'], ['Debug', 'debug'], ['Kritisch', 'critical']] }, value('MESSAGE', 'String')], previousStatement: 'Action', nextStatement: 'Action', colour: '#2682a5', tooltip: 'Schreibt bei Ausführung in HA ins Systemprotokoll. Info und Debug können durch die HA-Logkonfiguration ausgefiltert werden.' },
  { type: 'ugso_script_action', message0: 'HA-Script %1 %2', args0: [entityField('script.abendlicht'), { type: 'field_dropdown', name: 'MODE', options: [['starten (ohne Warten)', 'turn_on'], ['stoppen', 'turn_off'], ['aufrufen und warten', 'wait']] }], previousStatement: 'Action', nextStatement: 'Action', colour: '#2682a5', tooltip: 'Aufrufen und warten setzt die Automation erst nach dem Script fort. Script-Parameter über die generische HA-Aktion übergeben.' },
  { type: 'ugso_update_action', message0: 'Entität %1 aktualisieren', args0: [entityField('sensor.temperatur')], previousStatement: 'Action', nextStatement: 'Action', colour: '#2682a5', tooltip: 'Fordert in HA ein Update der Entität an. Die Integration bestimmt, ob sie eine Aktualisierung unterstützt; setzt keinen Zustand.' },
  { type: 'ugso_number', message0: '%1', args0: [{ type: 'field_number', name: 'NUM', value: 20 }], output: 'Number', colour: '#2e7653' },
  { type: 'ugso_automation', message0: 'Automation %1 Wenn %2 Nur wenn %3 Dann %4', args0: [{ type: 'input_dummy' }, statement('TRIGGERS', 'Trigger'), value('CONDITIONS', 'Boolean'), statement('ACTIONS', 'Action')], colour: '#187b72', tooltip: 'Eine native Home-Assistant-Automation. Name und Modus stehen über der Arbeitsfläche.', deletable: false },
  { type: 'ugso_state_trigger', message0: 'Wenn %1 den Zustand %2 erreicht', args0: [entityField('binary_sensor.flur_bewegung'), { type: 'field_input', name: 'STATE', text: 'on' }], previousStatement: 'Trigger', nextStatement: 'Trigger', colour: '#b26c24', tooltip: 'Reagiert auf eine Zustandsänderung.' },
  { type: 'ugso_numeric_trigger', message0: 'Wenn %1 %2 %3 fällt / steigt', args0: [entityField('sensor.batterie_ladezustand'), direction, number], previousStatement: 'Trigger', nextStatement: 'Trigger', colour: '#b26c24', tooltip: 'Startet beim Überschreiten einer Grenze, nicht fortlaufend solange die Bedingung wahr ist.' },
  { type: 'ugso_time_trigger', message0: 'Wenn es %1 Uhr ist', args0: [{ type: 'field_input', name: 'TIME', text: '18:00:00' }], previousStatement: 'Trigger', nextStatement: 'Trigger', colour: '#b26c24' },
  { type: 'ugso_sun_trigger', message0: 'Bei %1', args0: [{ type: 'field_dropdown', name: 'EVENT', options: [['Sonnenuntergang', 'sunset'], ['Sonnenaufgang', 'sunrise']] }], previousStatement: 'Trigger', nextStatement: 'Trigger', colour: '#b26c24' },
  { type: 'ugso_start_trigger', message0: 'Wenn Home Assistant startet', previousStatement: 'Trigger', nextStatement: 'Trigger', colour: '#b26c24' },
  { type: 'ugso_state_condition', message0: '%1 ist %2', args0: [entityField('input_boolean.laden_erlaubt'), { type: 'field_input', name: 'STATE', text: 'on' }], output: 'Boolean', colour: '#6860b5' },
  { type: 'ugso_numeric_condition', message0: '%1 ist %2 %3', args0: [entityField('sensor.batterie_ladezustand'), direction, number], output: 'Boolean', colour: '#6860b5' },
  { type: 'ugso_logic_condition', message0: '%1', args0: [{ type: 'field_dropdown', name: 'LOGIC', options: [['UND · alle', 'and'], ['ODER · mindestens eine', 'or'], ['NICHT · keine', 'not']] }], output: 'Boolean', colour: '#6860b5', mutator: 'ugso_conditions' },
  { type: 'ugso_switch_action', message0: '%1 %2', args0: [entityField('light.flur'), { type: 'field_dropdown', name: 'SERVICE', options: [['einschalten', 'turn_on'], ['ausschalten', 'turn_off'], ['umschalten', 'toggle']] }], previousStatement: 'Action', nextStatement: 'Action', colour: '#2682a5', tooltip: 'Erzeugt eine Aktion der Domain der gewählten Entität. Prüfe die Verfügbarkeit in HA.' },
  { type: 'ugso_service_action', message0: 'HA-Aktion %1 Ziel %2 Daten (JSON) %3', args0: [{ type: 'field_input', name: 'SERVICE', text: 'notify.mobile_app_telefon' }, { type: 'field_input', name: 'ENTITY', text: '' }, { type: 'field_input', name: 'DATA', text: '{"message":"Hallo!"}' }], previousStatement: 'Action', nextStatement: 'Action', colour: '#2682a5', tooltip: 'Ziel darf leer bleiben. Daten als JSON-Objekt; Integration muss in HA vorhanden sein.' },
  { type: 'ugso_delay_action', message0: 'Warte %1 Sekunden', args0: [value('SECONDS', 'Number')], previousStatement: 'Action', nextStatement: 'Action', colour: '#2682a5' },
  { type: 'ugso_if_action', message0: 'Falls %1 mache %2', args0: [value('CONDITIONS', 'Boolean'), statement('THEN', 'Action')], previousStatement: 'Action', nextStatement: 'Action', colour: '#2682a5', mutator: 'ugso_branches' }
];
Blockly.defineBlocksWithJsonArray([
  { type: 'ugso_condition_container', message0: 'Bedingungen %1', args0: [statement('STACK', null)], colour: '#6860b5', enableContextMenu: false },
  { type: 'ugso_condition_item', message0: 'Bedingung', previousStatement: null, nextStatement: null, colour: '#6860b5', enableContextMenu: false }
]);
Blockly.Extensions.registerMutator('ugso_conditions', {
  itemCount_: 2,
  saveExtraState() { return { items: this.itemCount_, list: !!this.list_ }; },
  loadExtraState(state) {
    if (!Number.isInteger(state.items) || state.items < 1 || state.items > 100) throw new Error('1–100 Bedingungen erforderlich.');
    this.itemCount_ = state.items; this.list_ = !!state.list; this.updateConditions_();
  },
  updateConditions_() {
    for (let i = 0; i < this.itemCount_; i++) if (!this.getInput(`COND${i}`)) this.appendValueInput(`COND${i}`).setCheck('Boolean').appendField(`Bedingung ${i + 1}`);
    for (let i = this.itemCount_; this.getInput(`COND${i}`); i++) this.removeInput(`COND${i}`);
  },
  decompose(workspace) {
    const root = workspace.newBlock('ugso_condition_container'); root.initSvg(); let connection = root.getInput('STACK').connection;
    for (let i = 0; i < this.itemCount_; i++) { const item = workspace.newBlock('ugso_condition_item'); item.initSvg(); connection.connect(item.previousConnection); connection = item.nextConnection; }
    return root;
  },
  saveConnections(root) { let i = 0; for (let item = root.getInputTargetBlock('STACK'); item; item = item.getNextBlock()) { if (!item.isInsertionMarker()) item.valueConnection_ = this.getInput(`COND${i++}`)?.connection.targetConnection; } },
  compose(root) {
    const connections = [];
    for (let item = root.getInputTargetBlock('STACK'); item; item = item.getNextBlock()) if (!item.isInsertionMarker()) connections.push(item.valueConnection_);
    if (connections.length > 100) throw new Error('Höchstens 100 Bedingungen erlaubt.');
    for (let i = 0; i < this.itemCount_; i++) { const c = this.getInput(`COND${i}`).connection.targetConnection; if (c) c.disconnect(); }
    this.itemCount_ = Math.max(1, connections.length); this.updateConditions_(); connections.forEach((c, i) => c?.reconnect(this, `COND${i}`));
  }
}, function () { this.updateConditions_(); }, ['ugso_condition_item']);
Blockly.Extensions.registerMutator('ugso_branches', {
  branchCount_: 0, hasElse_: false,
  saveExtraState() { return { branches: this.branchCount_, hasElse: this.hasElse_, choose: !!this.choose_ }; },
  loadExtraState(state) {
    if (!Number.isInteger(state.branches) || state.branches < 0 || state.branches > 99 || typeof state.hasElse !== 'boolean') throw new Error('Ungültige Verzweigungen.');
    this.branchCount_ = state.branches; this.hasElse_ = state.hasElse; this.choose_ = !!state.choose; this.updateBranches_();
  },
  updateBranches_() {
    for (let i = 1; i <= this.branchCount_; i++) {
      if (!this.getInput(`C${i}`)) this.appendValueInput(`C${i}`).setCheck('Boolean').appendField('sonst falls');
      if (!this.getInput(`T${i}`)) this.appendStatementInput(`T${i}`).setCheck('Action').appendField('mache');
    }
    for (let i = this.branchCount_ + 1; this.getInput(`C${i}`); i++) { this.removeInput(`C${i}`); this.removeInput(`T${i}`); }
    if (this.hasElse_ && !this.getInput('ELSE')) this.appendStatementInput('ELSE').setCheck('Action').appendField('sonst');
    if (!this.hasElse_ && this.getInput('ELSE')) this.removeInput('ELSE');
    if (this.hasElse_) this.moveInputBefore('ELSE', null);
  },
  decompose(workspace) {
    const root = workspace.newBlock('controls_if_if'); root.initSvg(); let connection = root.nextConnection;
    for (let i = 0; i < this.branchCount_; i++) { const clause = workspace.newBlock('controls_if_elseif'); clause.initSvg(); connection.connect(clause.previousConnection); connection = clause.nextConnection; }
    if (this.hasElse_) { const clause = workspace.newBlock('controls_if_else'); clause.initSvg(); connection.connect(clause.previousConnection); }
    return root;
  },
  saveConnections(root) {
    let index = 1;
    for (let clause = root.getNextBlock(); clause; clause = clause.getNextBlock()) {
      if (clause.isInsertionMarker()) continue;
      if (clause.type === 'controls_if_elseif') { clause.conditionConnection_ = this.getInput(`C${index}`)?.connection.targetConnection; clause.actionConnection_ = this.getInput(`T${index++}`)?.connection.targetConnection; }
      else clause.actionConnection_ = this.getInput('ELSE')?.connection.targetConnection;
    }
  },
  compose(root) {
    const branches = []; let otherwise = null; let hasElse = false;
    for (let clause = root.getNextBlock(); clause; clause = clause.getNextBlock()) {
      if (clause.isInsertionMarker()) continue;
      if (clause.type === 'controls_if_elseif') branches.push(clause);
      else if (clause.type === 'controls_if_else') { hasElse = true; otherwise = clause.actionConnection_; }
    }
    if (branches.length > 99) throw new Error('Höchstens 100 Zweige erlaubt.');
    for (let i = 1; this.getInput(`C${i}`); i++) {
      for (const name of [`C${i}`, `T${i}`]) { const c = this.getInput(name).connection.targetConnection; if (c) c.disconnect(); }
    }
    const oldElse = this.getInput('ELSE')?.connection.targetConnection; if (oldElse) oldElse.disconnect();
    this.branchCount_ = branches.length; this.hasElse_ = hasElse; this.updateBranches_();
    branches.forEach((clause, i) => { clause.conditionConnection_?.reconnect(this, `C${i + 1}`); clause.actionConnection_?.reconnect(this, `T${i + 1}`); });
    otherwise?.reconnect(this, 'ELSE');
  }
}, undefined, ['controls_if_elseif', 'controls_if_else']);
Blockly.defineBlocksWithJsonArray(definitions);
definitions.forEach(definition => {
  const original = Blockly.Blocks[definition.type].init;
  Blockly.Blocks[definition.type].init = function () { original.call(this); this.setHelpUrl('https://opensource.ugso-software.de/projects/blocks-for-ha/#andocken-und-bedienung'); };
});
export { Blockly };
export const knownTypes = new Set(definitions.map(item => item.type));
export const toolbox = { kind: 'categoryToolbox', contents: [
  { kind: 'category', name: 'System', colour: '#2682a5', contents: ['log', 'script', 'update'].map(type => ({ kind: 'block', type: `ugso_${type}_action` })) },
  { kind: 'category', name: 'Werte', colour: '#2e7653', contents: ['number', 'text'].map(type => ({ kind: 'block', type: `ugso_${type}` })) },
  { kind: 'category', name: 'Auslöser', colour: '#b26c24', contents: ['state', 'numeric', 'time', 'sun', 'start'].map(type => ({ kind: 'block', type: `ugso_${type}_trigger` })) },
  { kind: 'category', name: 'Bedingungen', colour: '#6860b5', contents: ['state', 'numeric', 'logic'].map(type => ({ kind: 'block', type: `ugso_${type}_condition` })) },
  { kind: 'category', name: 'Aktionen', colour: '#2682a5', contents: ['switch', 'service', 'delay', 'if'].map(type => ({ kind: 'block', type: `ugso_${type}_action` })) }
] };
for (const category of toolbox.contents) for (const block of category.contents) {
  if (block.type.includes('numeric')) block.inputs = { LIMIT: { shadow: { type: 'ugso_number', fields: { NUM: 20 } } } };
  if (block.type === 'ugso_delay_action') block.inputs = { SECONDS: { shadow: { type: 'ugso_number', fields: { NUM: 30 } } } };
  if (block.type === 'ugso_log_action') block.inputs = { MESSAGE: { shadow: { type: 'ugso_text', fields: { TEXT: 'Automation gestartet' } } } };
}
const field = (block, name) => block.getFieldValue(name);
function chain(block, convert, depth = 0) {
  if (depth > 10) throw new Error('Blocks sind zu tief verschachtelt.');
  const items = [];
  while (block) { if (block.isEnabled()) items.push(convert(block, depth)); block = block.getNextBlock(); }
  return items;
}
function readNumber(block, input) {
  const child = block.getInputTargetBlock(input);
  if (!child || !child.isEnabled() || child.type !== 'ugso_number') throw new Error(`${input}: Zahlenblock fehlt.`);
  return Number(field(child, 'NUM'));
}
const range = (block) => ({ entity_id: field(block, 'ENTITY'), [field(block, 'OP')]: readNumber(block, 'LIMIT') });
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
  if (depth > 10) throw new Error('Bedingungen sind zu tief verschachtelt.');
  switch (block.type) {
    case 'ugso_state_condition': return { condition: 'state', entity_id: field(block, 'ENTITY'), state: field(block, 'STATE') };
    case 'ugso_numeric_condition': return { condition: 'numeric_state', ...range(block) };
    case 'ugso_logic_condition': {
      const conditions = [];
      for (let i = 0; i < block.itemCount_; i++) {
        const child = block.getInputTargetBlock(`COND${i}`);
        if (!child) throw new Error(`Logik: Bedingung ${i + 1} fehlt.`);
        if (child.isEnabled()) conditions.push(readCondition(child, depth + 1));
      }
      return { condition: field(block, 'LOGIC'), conditions };
    }
    default: throw new Error('Unbekannte Bedingung.');
  }
}
function readConditions(block, depth = 0) {
  if (!block || !block.isEnabled()) return [];
  const result = readCondition(block, depth);
  return block.type === 'ugso_logic_condition' && block.list_ && field(block, 'LOGIC') === 'and' ? result.conditions : [result];
}
function readAction(block, depth) {
  switch (block.type) {
    case 'ugso_log_action': {
      const child = block.getInputTargetBlock('MESSAGE');
      if (!child || !child.isEnabled() || child.type !== 'ugso_text') throw new Error('Log: Textblock für Meldung fehlt.');
      const message = field(child, 'TEXT');
      if (!message.trim()) throw new Error('Log: Meldung fehlt.');
      return { action: 'system_log.write', data: { message, level: field(block, 'LEVEL') } };
    }
    case 'ugso_script_action': {
      const id = field(block, 'ENTITY');
      if (!/^script\.[a-z0-9_]+$/.test(id)) throw new Error('HA-Script: Entität im Format script.name erwartet.');
      return field(block, 'MODE') === 'wait' ? { action: id } : { action: `script.${field(block, 'MODE')}`, target: { entity_id: id } };
    }
    case 'ugso_update_action': return { action: 'homeassistant.update_entity', target: { entity_id: field(block, 'ENTITY') } };
    case 'ugso_switch_action': { const id = field(block, 'ENTITY'); return { action: `${id.split('.')[0]}.${field(block, 'SERVICE')}`, target: { entity_id: id } }; }
    case 'ugso_service_action': {
      let data;
      try { data = JSON.parse(field(block, 'DATA') || '{}'); } catch { throw new Error('HA-Aktion: Aktionsdaten sind kein gültiges JSON.'); }
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('HA-Aktion: Aktionsdaten müssen ein JSON-Objekt sein.');
      return { action: field(block, 'SERVICE'), ...(field(block, 'ENTITY') ? { target: { entity_id: field(block, 'ENTITY') } } : {}), ...(Object.keys(data || {}).length ? { data } : {}) };
    }
    case 'ugso_delay_action': return { delay: readNumber(block, 'SECONDS') };
    case 'ugso_if_action': {
      const otherwise = chain(block.getInputTargetBlock('ELSE'), readAction, depth + 1);
      if (block.branchCount_ || block.choose_) {
        const choose = [{ conditions: readConditions(block.getInputTargetBlock('CONDITIONS'), depth + 1), sequence: chain(block.getInputTargetBlock('THEN'), readAction, depth + 1) }];
        for (let i = 1; i <= block.branchCount_; i++) choose.push({ conditions: readConditions(block.getInputTargetBlock(`C${i}`), depth + 1), sequence: chain(block.getInputTargetBlock(`T${i}`), readAction, depth + 1) });
        return { choose, ...(otherwise.length ? { default: otherwise } : {}) };
      }
      return { if: readConditions(block.getInputTargetBlock('CONDITIONS'), depth + 1), then: chain(block.getInputTargetBlock('THEN'), readAction, depth + 1), ...(otherwise.length ? { else: otherwise } : {}) };
    }
    default: throw new Error('Unbekannte Aktion.');
  }
}
export function workspaceModel(workspace, metadata) {
  const roots = workspace.getTopBlocks(false).filter(block => block.isEnabled());
  if (roots.length !== 1 || roots[0].type !== 'ugso_automation') throw new Error('Alle Blocks müssen mit genau einer Automation verbunden sein.');
  const root = roots[0];
  return { ...metadata, triggers: chain(root.getInputTargetBlock('TRIGGERS'), readTrigger), conditions: readConditions(root.getInputTargetBlock('CONDITIONS')), actions: chain(root.getInputTargetBlock('ACTIONS'), readAction) };
}
function create(workspace, type, fields = {}) {
  const block = workspace.newBlock(type);
  Object.entries(fields).forEach(([key, value]) => block.setFieldValue(String(value), key));
  if (workspace.rendered) { block.initSvg(); block.render(); }
  return block;
}
function attach(parent, input, children) {
  if (parent.getInput(input).type === Blockly.inputs.inputTypes.VALUE) {
    if (!children.length) return;
    let block = children[0];
    if (children.length > 1) {
      block = create(parent.workspace, 'ugso_logic_condition', { LOGIC: 'and' });
      block.loadExtraState({ items: children.length, list: true });
      children.forEach((child, i) => block.getInput(`COND${i}`).connection.connect(child.outputConnection));
    }
    parent.getInput(input).connection.connect(block.outputConnection); return;
  }
  let connection = parent.getInput(input).connection;
  children.forEach(block => { connection.connect(block.previousConnection); connection = block.nextConnection; });
}
function numberInput(block, name, num) { block.getInput(name).connection.setShadowState({ type: 'ugso_number', fields: { NUM: num } }); return block; }
const fieldsRange = (item) => ({ ENTITY: item.entity_id, OP: Object.hasOwn(item, 'above') ? 'above' : 'below' });
function triggerBlock(workspace, item) {
  switch (item.trigger) {
    case 'state': return create(workspace, 'ugso_state_trigger', { ENTITY: item.entity_id, STATE: item.to });
    case 'numeric_state': return numberInput(create(workspace, 'ugso_numeric_trigger', fieldsRange(item)), 'LIMIT', item.above ?? item.below);
    case 'time': return create(workspace, 'ugso_time_trigger', { TIME: item.at });
    case 'sun': return create(workspace, 'ugso_sun_trigger', { EVENT: item.event });
    case 'homeassistant': return create(workspace, 'ugso_start_trigger');
  }
}
function conditionBlock(workspace, item) {
  if (item.condition === 'state') return create(workspace, 'ugso_state_condition', { ENTITY: item.entity_id, STATE: item.state });
  if (item.condition === 'numeric_state') return numberInput(create(workspace, 'ugso_numeric_condition', fieldsRange(item)), 'LIMIT', item.above ?? item.below);
  const block = create(workspace, 'ugso_logic_condition', { LOGIC: item.condition });
  block.loadExtraState({ items: item.conditions.length });
  item.conditions.forEach((child, i) => attach(block, `COND${i}`, [conditionBlock(workspace, child)])); return block;
}
function actionBlock(workspace, item) {
  if (item.action) {
    const id = item.target?.entity_id;
    // Recognize only exact supported shapes. Keep extra parameters in the generic block.
    if (item.action === 'system_log.write' && !item.target && item.data && Object.keys(item.data).length === 2 && typeof item.data.message === 'string' && item.data.message.trim() && ['info', 'warning', 'error', 'debug', 'critical'].includes(item.data.level)) {
      const block = create(workspace, 'ugso_log_action', { LEVEL: item.data.level });
      block.getInput('MESSAGE').connection.setShadowState({ type: 'ugso_text', fields: { TEXT: item.data.message } }); return block;
    }
    if (!item.data && id && /^script\.[a-z0-9_]+$/.test(id) && ['script.turn_on', 'script.turn_off'].includes(item.action)) return create(workspace, 'ugso_script_action', { ENTITY: id, MODE: item.action.split('.')[1] });
    if (!item.data && !item.target && /^script\.[a-z0-9_]+$/.test(item.action) && !['script.turn_on', 'script.turn_off', 'script.toggle', 'script.reload'].includes(item.action)) return create(workspace, 'ugso_script_action', { ENTITY: item.action, MODE: 'wait' });
    if (!item.data && id && item.action === 'homeassistant.update_entity') return create(workspace, 'ugso_update_action', { ENTITY: id });
    if (!item.data && id && ['turn_on', 'turn_off', 'toggle'].some(service => item.action === `${id.split('.')[0]}.${service}`)) return create(workspace, 'ugso_switch_action', { ENTITY: id, SERVICE: item.action.split('.')[1] });
    return create(workspace, 'ugso_service_action', { SERVICE: item.action, ENTITY: id || '', DATA: JSON.stringify(item.data || {}) });
  }
  if (Object.hasOwn(item, 'delay')) return numberInput(create(workspace, 'ugso_delay_action'), 'SECONDS', item.delay);
  const block = create(workspace, 'ugso_if_action');
  if (item.choose) {
    block.loadExtraState({ branches: item.choose.length - 1, hasElse: Object.hasOwn(item, 'default'), choose: true });
    item.choose.forEach((branch, i) => { attach(block, i ? `C${i}` : 'CONDITIONS', branch.conditions.map(child => conditionBlock(workspace, child))); attach(block, i ? `T${i}` : 'THEN', branch.sequence.map(child => actionBlock(workspace, child))); });
    if (item.default) attach(block, 'ELSE', item.default.map(child => actionBlock(workspace, child)));
    return block;
  }
  block.loadExtraState({ branches: 0, hasElse: Object.hasOwn(item, 'else') });
  attach(block, 'CONDITIONS', item.if.map(child => conditionBlock(workspace, child)));
  attach(block, 'THEN', item.then.map(child => actionBlock(workspace, child)));
  if (item.else) attach(block, 'ELSE', item.else.map(child => actionBlock(workspace, child))); return block;
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
