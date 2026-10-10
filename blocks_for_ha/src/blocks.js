import * as BlocklyModule from 'blockly/core';
import * as De from 'blockly/msg/de';
import 'blockly/blocks';
import * as MultilineModule from '@blockly/field-multilineinput';
import * as ColourModule from '@blockly/field-colour';
import '@blockly/field-slider';
import * as DateModule from '@blockly/field-date';
import '@blockly/field-dependent-dropdown';
import { dateTemplate, parseDateTemplate, helperOptions } from './values.js';
import { timeDefinitions, installTimeShape, timeExpression } from './time.js';
// Blockly exposes ESM in the browser and CommonJS for Node's headless tests.
const Blockly = Reflect.get(BlocklyModule, 'default') || BlocklyModule;
Blockly.setLocale(De);
const Multiline = Reflect.get(MultilineModule, 'default') || MultilineModule;
const Colour = Reflect.get(ColourModule, 'default') || ColourModule;
Multiline.registerFieldMultilineInput(); Colour.registerFieldColour();
Multiline.FieldMultilineInput.enterCommits = false;
const DateFields = Reflect.get(DateModule, 'default') || DateModule;
// Keep the original date field, guarding a picker that was closed before its frame.
class SafeDateField extends DateFields.FieldDate {
  showDropdown() {
    const input = this.htmlInput_;
    if (!input) return;
    input.classList.add('blocklyDateInput');
    requestAnimationFrame(() => {
      if (input.isConnected && typeof input.showPicker === 'function') {
        try { input.showPicker(); } catch { /* Native date input remains editable in restricted browser contexts. */ }
      }
    });
  }
}
Blockly.fieldRegistry.register('ugso_field_date', SafeDateField);

const entityField = (value) => ({ type: 'field_input', name: 'ENTITY', text: value });
const number = value('LIMIT', 'Number');
const direction = { type: 'field_dropdown', name: 'OP', options: [['unter', 'below'], ['über', 'above']] };
const statement = (name, check) => ({ type: 'input_statement', name, check });
function value(name, check) { return { type: 'input_value', name, check }; }
const definitions = [
  ...timeDefinitions,
  { type: 'ugso_variable_change', message0: 'Erhöhe %1 um %2', args0: [{ type: 'field_variable', name: 'VAR', variable: 'wert' }, value('STEP', 'Number')], previousStatement: 'Action', nextStatement: 'Action', colour: '#a54879', tooltip: 'Addiert eine Zahl zur zuvor gesetzten Zahlenvariable. Negative Schritte verringern. Nicht gesetzte Werte, Texte, Boolean und null werden nicht automatisch in Zahlen umgewandelt.' },
  { type: 'ugso_compare', message0: '%1 %2 %3', args0: [value('LEFT', 'Value'), { type: 'field_dropdown', name: 'OP', options: [['=', '=='], ['≠', '!='], ['<', '<'], ['≤', '<='], ['>', '>'], ['≥', '>=']] }, value('RIGHT', 'Value')], output: ['Boolean', 'Value'], colour: '#6860b5', tooltip: 'Vergleicht zwei Werte in HA. Zahlen und Texte haben unterschiedliche Typen; Sensorwerte im Template bewusst umwandeln.' },
  { type: 'ugso_boolean', message0: '%1', args0: [{ type: 'field_dropdown', name: 'BOOL', options: [['wahr', 'true'], ['falsch', 'false']] }], output: ['Boolean', 'Value'], colour: '#6860b5' },
  { type: 'ugso_not', message0: 'NICHT %1', args0: [value('BOOL', 'Boolean')], output: ['Boolean', 'Value'], colour: '#6860b5' },
  { type: 'ugso_binary_logic', message0: '%1 %2 %3', args0: [value('LEFT', 'Boolean'), { type: 'field_dropdown', name: 'OP', options: [['UND', 'and'], ['ODER', 'or']] }, value('RIGHT', 'Boolean')], output: ['Boolean', 'Value'], colour: '#6860b5' },
  { type: 'ugso_null', message0: 'kein Wert (null)', output: 'Value', colour: '#6860b5', tooltip: 'Erzeugt YAML null oder Jinja none. Weder Nullzahl noch falsch.' },
  { type: 'ugso_ternary', message0: 'Wenn %1 dann Wert %2 sonst Wert %3', args0: [value('TEST', 'Boolean'), value('TRUE', 'Value'), value('FALSE', 'Value')], output: ['String', 'Value'], colour: '#6860b5', tooltip: 'Liefert einen Wert, keine Aktionskette. HA wertet den Jinja-Ausdruck aus. Für Variablen, Log-Meldungen oder Vergleiche.' },
  { type: 'ugso_variable_set', message0: 'Setze %1 auf %2', args0: [{ type: 'field_variable', name: 'VAR', variable: 'wert' }, value('VALUE', ['String', 'Number', 'Boolean', 'Value'])], previousStatement: 'Action', nextStatement: 'Action', colour: '#a54879', tooltip: 'Definiert oder ändert eine HA-Variable für diesen Automationslauf. Vor dem Lesen setzen.' },
  { type: 'ugso_variable_get', message0: 'Variable %1', args0: [{ type: 'field_variable', name: 'VAR', variable: 'wert' }], output: 'String', colour: '#a54879', tooltip: 'Erzeugt {{ variablenname }} für ein HA-Template. Kein dauerhaft gespeicherter Helfer.' },
  { type: 'ugso_template', message0: 'Template %1', args0: [{ type: 'field_multilinetext', name: 'TEXT', text: "{{ states('sensor.temperatur') | float(0) }}", maxLines: 3 }], output: 'String', colour: '#8a6635', tooltip: 'Jinja-Vorlage einschließlich {{ ... }} oder {% ... %}. Auswertung erst in Home Assistant.' },
  { type: 'ugso_template_condition', message0: 'Template ist wahr %1', args0: [{ type: 'field_multilinetext', name: 'TEXT', text: "{{ states('sensor.temperatur') | float(0) > 20 }}", maxLines: 3 }], output: 'Boolean', colour: '#6860b5', tooltip: 'HA wertet diese Jinja-Vorlage als Bedingung aus. Löst selbst keine Automation aus.' },
  { type: 'ugso_text', message0: 'Text %1', args0: [{ type: 'field_multilinetext', name: 'TEXT', text: 'Automation gestartet', maxLines: 3 }], output: 'String', colour: '#2e7653' },
  { type: 'ugso_percent', message0: '%1 %%', args0: [{ type: 'field_slider', name: 'NUM', value: 50, min: 0, max: 100, precision: 1 }], output: 'Number', colour: '#2e7653' },
  { type: 'ugso_colour', message0: 'Farbe %1', args0: [{ type: 'field_colour', name: 'COLOUR', colour: '#ff8800' }], output: 'Colour', colour: '#2e7653' },
  { type: 'ugso_colour_action', message0: 'Licht %1 Farbe %2 Helligkeit %3 %%', args0: [entityField('light.wohnzimmer'), value('COLOUR', 'Colour'), value('BRIGHTNESS', 'Number')], previousStatement: 'Action', nextStatement: 'Action', colour: '#2682a5' },
  { type: 'ugso_date_condition', message0: 'Datum heute %1 %2', args0: [{ type: 'field_dropdown', name: 'OP', options: [['ist', '=='], ['ab einschließlich', '>='], ['bis einschließlich', '<=']] }, { type: 'ugso_field_date', name: 'DATE', date: '2026-10-09' }], output: 'Boolean', colour: '#6860b5', tooltip: 'Vergleicht das heutige Datum in der HA-Zeitzone, einschließlich Jahr. Löst selbst keine Automation aus.' },
  { type: 'ugso_helper_action', message0: 'Helfer %1 %2 %3', args0: [{ type: 'field_dropdown', name: 'DOMAIN', options: [['Schalter', 'input_boolean'], ['Zähler', 'counter'], ['Timer', 'timer']] }, entityField('input_boolean.test'), { type: 'field_dependent_dropdown', name: 'SERVICE', parentName: 'DOMAIN', optionMapping: helperOptions }], previousStatement: 'Action', nextStatement: 'Action', colour: '#2682a5', tooltip: 'Die Aktionsauswahl folgt dem Helfertyp. Entitäts-ID manuell eingeben; keine Live-HA-Auswahl.' },
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
installTimeShape(Blockly);
Blockly.defineBlocksWithJsonArray(definitions);
definitions.forEach(definition => {
  const original = Blockly.Blocks[definition.type].init;
  Blockly.Blocks[definition.type].init = function () {
    original.call(this); this.setHelpUrl(this.type.startsWith('ugso_time_') ? 'https://opensource.ugso-software.de/projects/blocks-for-ha/time' : 'https://opensource.ugso-software.de/projects/blocks-for-ha/#andocken-und-bedienung');
    if (this.type === 'ugso_variable_change') this.getInput('STEP').connection.setShadowState({ type: 'ugso_number', fields: { NUM: 1 } });
    if (this.outputConnection && ['ugso_number', 'ugso_percent', 'ugso_text', 'ugso_template', 'ugso_variable_get'].includes(this.type)) this.setOutput(true, [...this.outputConnection.getCheck(), 'Value']);
    if (['ugso_logic_condition', 'ugso_if_action'].includes(this.type)) addExpansionButtons(this);
  };
});
function expansion(block, change) {
  const before = JSON.stringify(block.saveExtraState());
  Blockly.Events.setGroup(true);
  try { change(); Blockly.Events.fire(new Blockly.Events.BlockChange(block, 'mutation', null, before, JSON.stringify(block.saveExtraState()))); }
  finally { Blockly.Events.setGroup(false); }
}
function addExpansionButtons(block) {
  const button = (label, action) => new Blockly.FieldImage(`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"><rect width="18" height="18" rx="4" fill="white"/><text x="9" y="13" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#20313c">${label}</text></svg>`)}`, 18, 18, label, () => expansion(block, action));
  const input = block.inputList[0];
  input.appendField(button('+', () => {
    if (block.type === 'ugso_logic_condition') { if (block.itemCount_ < 100) { block.itemCount_++; block.updateConditions_(); } }
    else if (block.branchCount_ < 99) { block.branchCount_++; block.updateBranches_(); }
  }), 'ADD');
  input.appendField(button('−', () => {
    if (block.type === 'ugso_logic_condition') { if (block.itemCount_ > 1) { block.itemCount_--; block.updateConditions_(); } }
    else if (block.branchCount_ > 0) { block.branchCount_--; block.updateBranches_(); }
  }), 'REMOVE');
  if (block.type === 'ugso_if_action') input.appendField(button('S', () => { block.hasElse_ = !block.hasElse_; block.updateBranches_(); }), 'ELSE_TOGGLE');
}
export { Blockly };
export const knownTypes = new Set(definitions.map(item => item.type));
export const toolbox = { kind: 'categoryToolbox', contents: [
  { kind: 'category', name: 'System', colour: '#2682a5', contents: ['log', 'script', 'update', 'helper'].map(type => ({ kind: 'block', type: `ugso_${type}_action` })) },
  { kind: 'category', name: 'Werte', colour: '#2e7653', contents: ['number', 'percent', 'text', 'colour'].map(type => ({ kind: 'block', type: `ugso_${type}` })) },
  { kind: 'category', name: 'Datum und Zeit', colour: '#8056a1', contents: [{ kind: 'block', type: 'ugso_date_condition' }, ...timeDefinitions.map(({ type }) => ({ kind: 'block', type }))] },
  { kind: 'category', name: 'Auslöser', colour: '#b26c24', contents: ['state', 'numeric', 'time', 'sun', 'start'].map(type => ({ kind: 'block', type: `ugso_${type}_trigger` })) },
  { kind: 'category', name: 'Bedingungen', colour: '#6860b5', contents: ['state', 'numeric', 'logic'].map(type => ({ kind: 'block', type: `ugso_${type}_condition` })) },
  { kind: 'category', name: 'Aktionen', colour: '#2682a5', contents: ['switch', 'service', 'delay', 'if', 'colour'].map(type => ({ kind: 'block', type: `ugso_${type}_action` })) }
] };
for (const category of toolbox.contents) for (const block of category.contents) {
  if (['ugso_time_shift', 'ugso_time_format'].includes(block.type)) block.inputs = { BASE: { shadow: { type: 'ugso_time_now' } }, ...(block.type === 'ugso_time_shift' ? { AMOUNT: { shadow: { type: 'ugso_number', fields: { NUM: 1 } } } } : {}) };
  if (block.type === 'ugso_time_sun') block.inputs = { OFFSET: { shadow: { type: 'ugso_number', fields: { NUM: 0 } } } };
  if (block.type.includes('numeric')) block.inputs = { LIMIT: { shadow: { type: 'ugso_number', fields: { NUM: 20 } } } };
  if (block.type === 'ugso_delay_action') block.inputs = { SECONDS: { shadow: { type: 'ugso_number', fields: { NUM: 30 } } } };
  if (block.type === 'ugso_log_action') block.inputs = { MESSAGE: { shadow: { type: 'ugso_text', fields: { TEXT: 'Automation gestartet' } } } };
  if (block.type === 'ugso_colour_action') block.inputs = { COLOUR: { shadow: { type: 'ugso_colour', fields: { COLOUR: '#ff8800' } } }, BRIGHTNESS: { shadow: { type: 'ugso_percent', fields: { NUM: 50 } } } };
}
toolbox.contents.push(
  { kind: 'category', name: 'Logik', colour: '#6860b5', contents: ['ugso_compare', 'ugso_binary_logic', 'ugso_not', 'ugso_boolean', 'ugso_null', 'ugso_ternary'].map(type => ({ kind: 'block', type })) },
  { kind: 'category', name: 'Variablen', colour: '#a54879', custom: 'UGSO_VARIABLES' },
  { kind: 'category', name: 'Templates', colour: '#8a6635', contents: ['ugso_template', 'ugso_template_condition'].map(type => ({ kind: 'block', type })) }
);
for (const block of toolbox.contents.find(c => c.name === 'Logik').contents) {
  const shadow = (type, fields) => ({ shadow: { type, fields } });
  if (block.type === 'ugso_compare') block.inputs = { LEFT: shadow('ugso_number', { NUM: 1 }), RIGHT: shadow('ugso_number', { NUM: 1 }) };
  if (block.type === 'ugso_binary_logic') block.inputs = { LEFT: shadow('ugso_boolean', { BOOL: 'true' }), RIGHT: shadow('ugso_boolean', { BOOL: 'false' }) };
  if (block.type === 'ugso_not') block.inputs = { BOOL: shadow('ugso_boolean', { BOOL: 'true' }) };
  if (block.type === 'ugso_ternary') block.inputs = { TEST: shadow('ugso_boolean', { BOOL: 'true' }), TRUE: shadow('ugso_text', { TEXT: 'Ja' }), FALSE: shadow('ugso_text', { TEXT: 'Nein' }) };
}
export function setupVariables(workspace) {
  workspace.registerButtonCallback('UGSO_CREATE_VARIABLE', () => Blockly.Variables.createVariableButtonHandler(workspace, () => workspace.getToolbox()?.refreshSelection()));
  workspace.registerToolboxCategoryCallback('UGSO_VARIABLES', ws => {
    const items = [{ kind: 'button', text: 'Variable erstellen …', callbackKey: 'UGSO_CREATE_VARIABLE' }];
    const variables = ws.getVariableMap().getAllVariables().filter(variable => variable.type === '');
    for (const variable of variables) {
      items.push({ kind: 'block', type: 'ugso_variable_set', fields: { VAR: { id: variable.getId() } }, inputs: { VALUE: { shadow: { type: 'ugso_number', fields: { NUM: 0 } } } } });
      items.push({ kind: 'block', type: 'ugso_variable_change', fields: { VAR: { id: variable.getId() } }, inputs: { STEP: { shadow: { type: 'ugso_number', fields: { NUM: 1 } } } } });
      items.push({ kind: 'block', type: 'ugso_variable_get', fields: { VAR: { id: variable.getId() } } });
    }
    return items;
  });
}
function variableName(block) {
  const name = block.getField('VAR').getVariable()?.name;
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name || '')) throw new Error('Variable: Name muss mit Buchstabe oder _ beginnen und darf nur Buchstaben, Ziffern und _ enthalten.');
  return name;
}
function readValue(block, input) {
  const child = block.getInputTargetBlock(input);
  if (!child?.isEnabled()) throw new Error(`${input}: Wertblock fehlt.`);
  if (['ugso_number', 'ugso_percent'].includes(child.type)) return Number(field(child, 'NUM'));
  if (child.type === 'ugso_boolean') return field(child, 'BOOL') === 'true';
  if (child.type === 'ugso_null') return null;
  if (child.type === 'ugso_variable_get') return `{{ ${variableName(child)} }}`;
  if (['ugso_text', 'ugso_template'].includes(child.type)) return field(child, 'TEXT');
  if (child.type.startsWith('ugso_time_') || child.type === 'ugso_ternary' || child.outputConnection?.getCheck()?.includes('Boolean')) return `{{ ${expression(child)} }}`;
  throw new Error(`${input}: Wertblock wird nicht unterstützt.`);
}
function expression(block, depth = 0) {
  if (!block?.isEnabled()) throw new Error('Logik: Wert oder Bedingung fehlt.');
  if (depth > 10) throw new Error('Logik ist zu tief verschachtelt.');
  const child = name => expression(block.getInputTargetBlock(name), depth + 1);
  if (block.type.startsWith('ugso_time_')) return timeExpression(block, child, name => readNumber(block, name));
  const entity = () => {
    const id = field(block, 'ENTITY');
    if (!/^[a-z][a-z0-9_]*\.[a-z0-9_]+$/.test(id)) throw new Error('Logik: Entität im Format domain.name erwartet.');
    return JSON.stringify(id);
  };
  const template = text => {
    const match = /^\s*\{\{\s*([\s\S]+?)\s*\}\}\s*$/.exec(text);
    if (!match || /\{[{%]|[%}]\}/.test(match[1])) throw new Error('Logik: Template als einzelnen {{ Ausdruck }} eingeben; Text und Jinja-Anweisungen gehören in den Template-Wertblock außerhalb eines Vergleichs.');
    return `(${match[1]})`;
  };
  switch (block.type) {
    case 'ugso_number': case 'ugso_percent': return String(Number(field(block, 'NUM')));
    case 'ugso_text': return JSON.stringify(field(block, 'TEXT'));
    case 'ugso_boolean': return field(block, 'BOOL');
    case 'ugso_null': return 'none';
    case 'ugso_variable_get': return variableName(block);
    case 'ugso_template': case 'ugso_template_condition': return template(field(block, 'TEXT'));
    case 'ugso_compare': return `(${child('LEFT')} ${field(block, 'OP')} ${child('RIGHT')})`;
    case 'ugso_not': return `(not ${child('BOOL')})`;
    case 'ugso_binary_logic': return `(${child('LEFT')} ${field(block, 'OP')} ${child('RIGHT')})`;
    case 'ugso_ternary': return `(${child('TRUE')} if ${child('TEST')} else ${child('FALSE')})`;
    case 'ugso_state_condition': return `is_state(${entity()}, ${JSON.stringify(field(block, 'STATE'))})`;
    case 'ugso_numeric_condition': {
      const state = `states(${entity()})`;
      return `(is_number(${state}) and (${state} | float) ${field(block, 'OP') === 'above' ? '>' : '<'} ${readNumber(block, 'LIMIT')})`;
    }
    case 'ugso_date_condition': return template(dateTemplate(field(block, 'DATE'), field(block, 'OP')));
    case 'ugso_logic_condition': {
      const items = [];
      for (let i = 0; i < block.itemCount_; i++) items.push(child(`COND${i}`));
      const op = field(block, 'LOGIC');
      return op === 'not' ? `(not (${items.join(' or ')}))` : `(${items.join(` ${op} `)})`;
    }
    default: throw new Error('Logik: Dieser Block liefert keinen unterstützten Ausdruck.');
  }
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
  if (!child || !child.isEnabled() || !['ugso_number', 'ugso_percent'].includes(child.type)) throw new Error(`${input}: Zahlenblock fehlt.`);
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
    case 'ugso_time_compare': case 'ugso_time_compare_input':
    case 'ugso_boolean': case 'ugso_compare': return { condition: 'template', value_template: `{{ ${expression(block)} }}` };
    case 'ugso_not': return { condition: 'not', conditions: requiredConditions(block, 'BOOL', depth) };
    case 'ugso_binary_logic': return { condition: field(block, 'OP'), conditions: [...requiredConditions(block, 'LEFT', depth), ...requiredConditions(block, 'RIGHT', depth)] };
    case 'ugso_template_condition': return { condition: 'template', value_template: field(block, 'TEXT') };
    case 'ugso_date_condition': return { condition: 'template', value_template: dateTemplate(field(block, 'DATE'), field(block, 'OP')) };
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
function requiredConditions(block, name, depth) {
  const child = block.getInputTargetBlock(name);
  if (!child?.isEnabled()) throw new Error(`Logik: ${name} fehlt oder ist deaktiviert.`);
  return [readCondition(child, depth + 1)];
}
function readConditions(block, depth = 0) {
  if (!block || !block.isEnabled()) return [];
  const result = readCondition(block, depth);
  return block.type === 'ugso_logic_condition' && block.list_ && field(block, 'LOGIC') === 'and' ? result.conditions : [result];
}
function readAction(block, depth) {
  switch (block.type) {
    case 'ugso_variable_set': return { variables: { [variableName(block)]: readValue(block, 'VALUE') } };
    case 'ugso_variable_change': {
      const name = variableName(block), step = readNumber(block, 'STEP');
      if (!Number.isFinite(step)) throw new Error('Erhöhen: Gültige Zahl erforderlich.');
      return { variables: { [name]: `{{ (${name} if ${name} is number and ${name} is not boolean else none) + (${step}) }}` } };
    }
    case 'ugso_helper_action': {
      const domain = field(block, 'DOMAIN'), id = field(block, 'ENTITY'), service = field(block, 'SERVICE');
      if (!id.startsWith(`${domain}.`) || !helperOptions[domain].some(option => option[1] === service)) throw new Error('Helfer: Entität und Aktion müssen zum gewählten Helfertyp passen.');
      return { action: `${domain}.${service}`, target: { entity_id: id } };
    }
    case 'ugso_colour_action': {
      const child = block.getInputTargetBlock('COLOUR'), brightness = readNumber(block, 'BRIGHTNESS'), id = field(block, 'ENTITY');
      if (!id.startsWith('light.')) throw new Error('Licht: Entität im Format light.name erwartet.');
      if (!child?.isEnabled() || child.type !== 'ugso_colour') throw new Error('Licht: Farbblock fehlt.');
      const hex = field(child, 'COLOUR');
      if (!/^#[0-9a-f]{6}$/i.test(hex) || brightness < 0 || brightness > 100) throw new Error('Licht: gültige Farbe und Helligkeit 0–100 erforderlich.');
      return { action: 'light.turn_on', target: { entity_id: id }, data: { rgb_color: [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)), brightness_pct: brightness } };
    }
    case 'ugso_log_action': {
      const message = readValue(block, 'MESSAGE');
      if (typeof message !== 'string' || !message.trim()) throw new Error('Log: Meldung fehlt.');
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
  if (item.condition === 'template') {
    try { const date = parseDateTemplate(item.value_template); return create(workspace, 'ugso_date_condition', { DATE: date.date, OP: date.op }); }
    catch { return create(workspace, 'ugso_template_condition', { TEXT: item.value_template }); }
  }
  if (item.condition === 'state') return create(workspace, 'ugso_state_condition', { ENTITY: item.entity_id, STATE: item.state });
  if (item.condition === 'numeric_state') return numberInput(create(workspace, 'ugso_numeric_condition', fieldsRange(item)), 'LIMIT', item.above ?? item.below);
  const block = create(workspace, 'ugso_logic_condition', { LOGIC: item.condition });
  block.loadExtraState({ items: item.conditions.length });
  item.conditions.forEach((child, i) => attach(block, `COND${i}`, [conditionBlock(workspace, child)])); return block;
}
function actionBlock(workspace, item) {
  if (item.variables) {
    const [name, val] = Object.entries(item.variables)[0];
    const variable = workspace.getVariableMap().createVariable(name);
    const change = typeof val === 'string' && /^\{\{ \(([a-zA-Z_]\w*) if \1 is number and \1 is not boolean else none\) \+ \(([-+\w.]+)\) \}\}$/.exec(val);
    if (change && change[1] === name && Number.isFinite(Number(change[2])) && String(Number(change[2])) === change[2]) {
      return numberInput(create(workspace, 'ugso_variable_change', { VAR: variable.getId() }), 'STEP', Number(change[2]));
    }
    const block = create(workspace, 'ugso_variable_set', { VAR: variable.getId() });
    valueInput(block, 'VALUE', val); return block;
  }
  if (item.action) {
    const id = item.target?.entity_id;
    const domain = id?.split('.')[0], service = item.action.split('.')[1];
    if (!item.data && helperOptions[domain]?.some(option => option[1] === service) && item.action === `${domain}.${service}`) return create(workspace, 'ugso_helper_action', { DOMAIN: domain, ENTITY: id, SERVICE: service });
    if (id?.startsWith('light.') && item.action === 'light.turn_on' && item.data && Object.keys(item.data).length === 2 && Array.isArray(item.data.rgb_color) && item.data.rgb_color.length === 3 && item.data.rgb_color.every(n => Number.isInteger(n) && n >= 0 && n <= 255) && Number.isInteger(item.data.brightness_pct) && item.data.brightness_pct >= 0 && item.data.brightness_pct <= 100) {
      const block = create(workspace, 'ugso_colour_action', { ENTITY: id });
      block.getInput('COLOUR').connection.setShadowState({ type: 'ugso_colour', fields: { COLOUR: '#' + item.data.rgb_color.map(n => n.toString(16).padStart(2, '0')).join('') } });
      block.getInput('BRIGHTNESS').connection.setShadowState({ type: 'ugso_percent', fields: { NUM: item.data.brightness_pct } }); return block;
    }
    // Recognize only exact supported shapes. Keep extra parameters in the generic block.
    if (item.action === 'system_log.write' && !item.target && item.data && Object.keys(item.data).length === 2 && typeof item.data.message === 'string' && item.data.message.trim() && ['info', 'warning', 'error', 'debug', 'critical'].includes(item.data.level)) {
      const block = create(workspace, 'ugso_log_action', { LEVEL: item.data.level });
      valueInput(block, 'MESSAGE', item.data.message); return block;
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
function valueInput(block, input, val) {
  if (val === null || typeof val === 'boolean') {
    block.getInput(input).connection.setShadowState({ type: val === null ? 'ugso_null' : 'ugso_boolean', ...(val === null ? {} : { fields: { BOOL: String(val) } }) }); return;
  }
  if (typeof val === 'number') { numberInput(block, input, val); return; }
  const match = /^\{\{ ([a-zA-Z_][a-zA-Z0-9_]*) \}\}$/.exec(val);
  if (match) {
    const variable = block.workspace.getVariableMap().createVariable(match[1]);
    const child = create(block.workspace, 'ugso_variable_get', { VAR: variable.getId() });
    block.getInput(input).connection.connect(child.outputConnection);
  } else block.getInput(input).connection.setShadowState({ type: /\{[{%]/.test(val) ? 'ugso_template' : 'ugso_text', fields: { TEXT: val } });
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
