// Native HA control flow and immutable Jinja values; no browser timer runtime.
import { localizedDefinition, translateLabel } from './locales.js';
const v = (name, check = 'Value') => ({ type: 'input_value', name, check });
const s = name => ({ type: 'input_statement', name, check: 'Action' });
const dropdown = (name, options) => ({ type: 'field_dropdown', name, options });
const text = (name, value) => ({ type: 'field_input', name, text: value });
const variable = { type: 'field_variable', name: 'VAR', variable: 'daten' };
const units = [['ms', 'milliseconds'], ['Sekunden', 'seconds'], ['Minuten', 'minutes'], ['Stunden', 'hours']];
const action = { previousStatement: 'Action', nextStatement: 'Action' };
const output = { output: 'Value' };
const bool = { output: ['Boolean', 'Value'] };
const numeric = ['Number', 'RuntimeNumber'];
const runtime = ['Number', 'RuntimeNumber', 'Value'];
export const flowDefinitions = [
  { type: 'ugso_pause', message0: 'Pause %1 %2', args0: [v('DURATION', runtime), dropdown('UNIT', units)], ...action, colour: '#7a8639', tooltip: 'Native HA-Wartezeit. Eingang muss eine Zahl liefern; HA prüft Laufzeitwerte bei Ausführung. Millisekunden sind keine Echtzeitgarantie.' },
  { type: 'ugso_wait', message0: 'Warte bis %1 höchstens %2 %3 bei Timeout weiter %4', args0: [v('CONDITION', 'Boolean'), v('DURATION', runtime), dropdown('UNIT', units), { type: 'field_checkbox', name: 'CONTINUE', checked: false }], ...action, colour: '#7a8639', tooltip: 'HA wait_template mit Timeout. Ohne Haken beendet ein Timeout diesen Lauf. Entitätsabhängige Bedingungen verwenden; Zeit allein aktualisiert das Template nicht fortlaufend.' },
  { type: 'ugso_stop', message0: 'Diesen Lauf stoppen %1 als Fehler %2', args0: [text('REASON', 'Lauf beendet'), { type: 'field_checkbox', name: 'ERROR', checked: false }], ...action, colour: '#7a8639', tooltip: 'Stoppt den aktuellen HA-Lauf einschließlich äußerer Wiederholungen. Kein Abbruch eines benannten ioBroker-Timers.' },
  { type: 'ugso_repeat', message0: 'Wiederhole %1 mal mache %2', args0: [v('COUNT', runtime), s('DO')], ...action, colour: '#3e8054', tooltip: 'Native HA repeat.count. repeat.index enthält den 1-basierten Durchlauf. Laufzeitzahl muss eine positive ganze Zahl liefern.' },
  { type: 'ugso_repeat_while', message0: 'Wiederhole %1 %2 mache %3', args0: [dropdown('MODE', [['solange', 'while'], ['bis', 'until']]), v('CONDITION', 'Boolean'), s('DO')], ...action, colour: '#3e8054', tooltip: 'Solange prüft vor jedem Durchlauf, bis danach und läuft mindestens einmal. Eine Pause im Körper verhindert eine enge Dauerschleife. Kein Hintergrundintervall.' },
  { type: 'ugso_foreach', message0: 'Für jeden Eintrag in %1 mache %2', args0: [v('ITEMS'), s('DO')], ...action, colour: '#3e8054', tooltip: 'HA repeat.for_each. Aktueller Wert: Template {{ repeat.item }}, Index: {{ repeat.index }}. Eingang muss eine Liste ergeben.' },
  { type: 'ugso_object_new', message0: 'Neues Objekt %1', args0: [{ type: 'input_dummy', name: 'HEADER' }], ...output, colour: '#967b44', mutator: 'ugso_rows', tooltip: 'Lokales Dictionary mit benannten Attributen. Zahnrad oder +/− erweitert es. Keine HA-Entität und kein ioBroker-Datenpunkt.' },
  { type: 'ugso_object_get', message0: 'Attribut %1 von Objekt %2', args0: [text('KEY', 'attribute1'), v('OBJECT')], ...output, colour: '#967b44', tooltip: 'Liest einen Dictionary-Schlüssel, auch keys/items. Fehlender Schlüssel ergibt null; ungültiger Objekttyp einen HA-Templatefehler.' },
  { type: 'ugso_object_has', message0: 'Objekt %1 hat Attribut %2', args0: [v('OBJECT'), text('KEY', 'attribute1')], ...bool, colour: '#967b44' },
  { type: 'ugso_object_keys', message0: 'Attribute des Objekts %1', args0: [v('OBJECT')], ...output, colour: '#967b44', tooltip: 'Liste der Dictionary-Schlüssel. Für Für-jeden-Eintrag oder JSON-Ausgabe.' },
  { type: 'ugso_object_set', message0: 'Setze Attribut %1 in Variable %2 auf %3', args0: [text('KEY', 'attribute1'), variable, v('VALUE')], ...action, colour: '#967b44', tooltip: 'Weist dieser HA-Variable ein neues Dictionary mit dem geänderten Schlüssel zu. Vorher als Objekt setzen; keine Mutation anderer Variablen oder HA-Attribute.' },
  { type: 'ugso_object_remove', message0: 'Entferne Attribut %1 aus Variable %2', args0: [text('KEY', 'attribute1'), variable], ...action, colour: '#967b44', tooltip: 'Weist ein neues Dictionary ohne diesen Schlüssel zu. Fehlender Schlüssel lässt den Inhalt unverändert. Variable muss vorher ein Objekt enthalten.' },
  { type: 'ugso_logic_range', message0: '%1 %2 %3 %4 %5', args0: [v('MIN', numeric), dropdown('LOW', [['≤', '<='], ['<', '<']]), v('VALUE', numeric), dropdown('HIGH', [['≤', '<='], ['<', '<']]), v('MAX', numeric)], ...bool, colour: '#6860b5', inputsInline: true },
  { type: 'ugso_logic_default', message0: 'Wenn %1 %2 dann Ersatzwert %3', args0: [v('VALUE'), dropdown('MODE', [['null / nicht gesetzt', 'null'], ['leer / falsch / 0', 'empty']]), v('DEFAULT')], ...output, colour: '#6860b5', tooltip: 'Null-Modus erhält 0, falsch und leeren Text. Leer-Modus ersetzt zusätzlich falsy Werte inklusive leerer Listen/Objekte; Python/Jinja-Regeln unterscheiden sich von JavaScript.' },
  { type: 'ugso_case', message0: 'Der Fall ist %1 %2', args0: [v('TEST'), { type: 'input_dummy', name: 'HEADER' }], ...action, colour: '#6860b5', mutator: 'ugso_rows', tooltip: 'Fallwerte vergleichen, nur die erste passende Aktionskette ausführen, sonst den Standardzweig. Native HA choose; kein JavaScript-Fallthrough.' },
  { type: 'ugso_list_new', message0: 'Liste %1', args0: [{ type: 'input_dummy', name: 'HEADER' }], ...output, colour: '#7658a0', mutator: 'ugso_rows' },
  { type: 'ugso_list_length', message0: 'Länge der Liste %1', args0: [v('LIST')], output: ['RuntimeNumber', 'Value'], colour: '#7658a0', tooltip: 'Anzahl der Elemente. Eingang muss eine Liste sein; als Laufzeitzahl verwendbar.' },
  { type: 'ugso_list_empty', message0: 'Liste %1 ist leer', args0: [v('LIST')], ...bool, colour: '#7658a0', tooltip: 'Prüft die Länge einer Liste, kein allgemeiner JavaScript-falsy-Test.' }
];

// Shared original implementation for editable dictionary/list/case rows.
export function installFlowShape(Blockly) {
  Blockly.defineBlocksWithJsonArray([
    { type: 'ugso_rows_container', message0: 'Einträge %1', args0: [{ type: 'input_statement', name: 'STACK' }], colour: '#967b44', enableContextMenu: false },
    { type: 'ugso_rows_item', message0: 'Eintrag', previousStatement: null, nextStatement: null, colour: '#967b44', enableContextMenu: false }
  ].map(definition => localizedDefinition(definition)));
  Blockly.Extensions.registerMutator('ugso_rows', {
    rowCount_: 1,
    saveExtraState() { return { rows: this.rowCount_, ...(this.type === 'ugso_object_new' ? { keys: Array.from({ length: this.rowCount_ }, (_, i) => this.getFieldValue(`KEY${i}`)) } : {}) }; },
    loadExtraState(state) {
      if (!Number.isInteger(state.rows) || state.rows < (this.type === 'ugso_case' ? 1 : 0) || state.rows > 100) throw new Error('Ungültige Anzahl Einträge (0–100, Fallauswahl mindestens 1).');
      this.rowCount_ = state.rows; this.updateRows_();
      if (this.type === 'ugso_object_new' && state.keys !== undefined) {
        if (!Array.isArray(state.keys) || state.keys.length !== state.rows || state.keys.some(k => typeof k !== 'string')) throw new Error('Ungültige Objektschlüssel.');
        state.keys.forEach((key, i) => this.setFieldValue(key, `KEY${i}`));
      }
    },
    updateRows_() {
      for (let i = 0; i < this.rowCount_; i++) if (!this.getInput(`V${i}`)) {
        const input = this.appendValueInput(`V${i}`).setCheck('Value');
        if (this.type === 'ugso_object_new') input.appendField(translateLabel('Attribut')).appendField(new Blockly.FieldTextInput(`attribute${i + 1}`), `KEY${i}`);
        else input.appendField(translateLabel(this.type === 'ugso_case' ? 'im Falle von' : `Eintrag ${i + 1}`));
        if (this.type === 'ugso_case') this.appendStatementInput(`DO${i}`).setCheck('Action').appendField(translateLabel('mache'));
      }
      for (let i = this.rowCount_; this.getInput(`V${i}`); i++) { this.removeInput(`V${i}`); if (this.getInput(`DO${i}`)) this.removeInput(`DO${i}`); }
      if (this.type === 'ugso_case') {
        if (!this.getInput('DEFAULT')) this.appendStatementInput('DEFAULT').setCheck('Action').appendField(translateLabel('sonst'));
        this.moveInputBefore('DEFAULT', null);
      }
    },
    decompose(ws) {
      const root = ws.newBlock('ugso_rows_container'); root.initSvg(); let c = root.getInput('STACK').connection;
      for (let i = 0; i < this.rowCount_; i++) { const item = ws.newBlock('ugso_rows_item'); item.initSvg(); c.connect(item.previousConnection); c = item.nextConnection; }
      return root;
    },
    saveConnections(root) {
      let i = 0;
      for (let item = root.getInputTargetBlock('STACK'); item; item = item.getNextBlock()) if (!item.isInsertionMarker()) {
        item.valueConnection_ = this.getInput(`V${i}`)?.connection.targetConnection;
        item.actionConnection_ = this.getInput(`DO${i}`)?.connection.targetConnection;
        item.key_ = this.type === 'ugso_object_new' ? this.getFieldValue(`KEY${i}`) : null; i++;
      }
    },
    compose(root) {
      const rows = [];
      for (let item = root.getInputTargetBlock('STACK'); item; item = item.getNextBlock()) if (!item.isInsertionMarker()) rows.push(item);
      if (rows.length > 100) throw new Error('Höchstens 100 Einträge.');
      for (let i = 0; i < this.rowCount_; i++) for (const n of [`V${i}`, `DO${i}`]) this.getInput(n)?.connection.targetConnection?.disconnect();
      this.rowCount_ = Math.max(this.type === 'ugso_case' ? 1 : 0, rows.length); this.updateRows_();
      rows.forEach((row, i) => { row.valueConnection_?.reconnect(this, `V${i}`); row.actionConnection_?.reconnect(this, `DO${i}`); if (this.type === 'ugso_object_new') this.setFieldValue(row.key_ ?? `attribute${i + 1}`, `KEY${i}`); });
    }
  }, function () {
    this.updateRows_();
    const change = delta => {
      const before = JSON.stringify(this.saveExtraState());
      const count = Math.max(this.type === 'ugso_case' ? 1 : 0, Math.min(100, this.rowCount_ + delta));
      Blockly.Events.setGroup(true);
      try { this.rowCount_ = count; this.updateRows_(); Blockly.Events.fire(new Blockly.Events.BlockChange(this, 'mutation', null, before, JSON.stringify(this.saveExtraState()))); }
      finally { Blockly.Events.setGroup(false); }
    };
    for (const [label, delta] of [['+', 1], ['−', -1]]) this.getInput('HEADER').appendField(new Blockly.FieldImage(`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" rx="4" fill="#fff"/><text x="10" y="15" text-anchor="middle" font-size="18" fill="#263746">${label}</text></svg>`)}`, 20, 20, label, () => change(delta)), delta > 0 ? 'ADD' : 'REMOVE');
  }, ['ugso_rows_item']);
}

export function flowExpression(block, child) {
  const field = n => block.getFieldValue(n), key = () => JSON.stringify(field('KEY'));
  const mapping = n => `((${child(n)}) if (${child(n)}) is mapping else none)`;
  // No mutation methods: HA's immutable Jinja sandbox forbids dict.update/pop.
  switch (block.type) {
    case 'ugso_object_new': {
      const keys = Array.from({ length: block.rowCount_ }, (_, i) => field(`KEY${i}`));
      if (new Set(keys).size !== keys.length) throw new Error('Objekt: Attributnamen müssen eindeutig sein.');
      return `{${keys.map((k, i) => `${JSON.stringify(k)}: ${child(`V${i}`)}`).join(', ')}}`;
    }
    case 'ugso_object_get': return `${mapping('OBJECT')}.get(${key()})`;
    case 'ugso_object_has': return `(${key()} in dict(${mapping('OBJECT')}))`;
    case 'ugso_object_keys': return `(dict(${mapping('OBJECT')}).keys() | list)`;
    case 'ugso_logic_range': return `(${child('MIN')} ${field('LOW')} ${child('VALUE')} ${field('HIGH')} ${child('MAX')})`;
    case 'ugso_logic_default': return field('MODE') === 'empty' ? `(${child('VALUE')} | default(${child('DEFAULT')}, true))` : `(${child('DEFAULT')} if (${child('VALUE')}) is undefined or (${child('VALUE')}) is none else ${child('VALUE')})`;
    case 'ugso_list_new': return `[${Array.from({ length: block.rowCount_ }, (_, i) => child(`V${i}`)).join(', ')}]`;
    case 'ugso_list_length': case 'ugso_list_empty': {
      const list = `((${child('LIST')}) if (${child('LIST')}) is sequence and (${child('LIST')}) is not string and (${child('LIST')}) is not mapping else none)`;
      return block.type === 'ugso_list_empty' ? `((${list} | list | length) == 0)` : `(${list} | list | length)`;
    }
    default: throw new Error('Unbekannter Objekt-/Listen-/Logikausdruck.');
  }
}

export function flowAction(block, { child, actions, conditions, variableName, number }) {
  const f = n => block.getFieldValue(n), template = n => {
    const expr = child(n), input = block.getInputTargetBlock(n);
    return ['ugso_template', 'ugso_template_condition'].includes(input?.type) ? input.getFieldValue('TEXT') : `{{ ${expr} }}`;
  };
  const duration = () => {
    const input = block.getInputTargetBlock('DURATION');
    const val = ['ugso_number', 'ugso_percent'].includes(input?.type) ? number('DURATION') : template('DURATION');
    if (typeof val === 'number' && (!Number.isFinite(val) || val < 0 || val * ({ milliseconds: .001, seconds: 1, minutes: 60, hours: 3600 }[f('UNIT')]) > 86400)) throw new Error('Pause/Timeout: 0–86400 Sekunden erforderlich.');
    return { [f('UNIT')]: val };
  };
  switch (block.type) {
    case 'ugso_pause': return { delay: duration() };
    case 'ugso_wait': return { wait_template: template('CONDITION'), timeout: duration(), continue_on_timeout: f('CONTINUE') === 'TRUE' };
    case 'ugso_stop': return { stop: f('REASON'), error: f('ERROR') === 'TRUE' };
    case 'ugso_repeat': {
      const count = ['ugso_number', 'ugso_percent'].includes(block.getInputTargetBlock('COUNT')?.type) ? number('COUNT') : template('COUNT');
      if (typeof count === 'number' && (!Number.isInteger(count) || count < 1 || count > 10000)) throw new Error('Wiederholung: 1–10000 ganze Durchläufe.');
      return { repeat: { count, sequence: actions('DO') } };
    }
    case 'ugso_repeat_while': return { repeat: { [f('MODE')]: conditions('CONDITION'), sequence: actions('DO') } };
    case 'ugso_foreach': return { repeat: { for_each: template('ITEMS'), sequence: actions('DO') } };
    case 'ugso_case': {
      const choose = Array.from({ length: block.rowCount_ }, (_, i) => ({ conditions: [{ condition: 'template', value_template: `{{ (${child('TEST')}) == (${child(`V${i}`)}) }}` }], sequence: actions(`DO${i}`) }));
      const other = actions('DEFAULT'); return { choose, ...(other.length ? { default: other } : {}) };
    }
    case 'ugso_object_set': case 'ugso_object_remove': {
      const name = variableName(), obj = `(${name} if ${name} is mapping else none)`, k = JSON.stringify(f('KEY'));
      const expr = block.type === 'ugso_object_set' ? `dict(${obj}, **{${k}: ${child('VALUE')}})` : `dict(dict(${obj}).items() | rejectattr('0', 'equalto', ${k}))`;
      return { variables: { [name]: `{{ ${expr} }}` } };
    }
    default: return null;
  }
}

const shadow = (type, fields = {}) => ({ shadow: { type, fields } });
const num = n => shadow('ugso_number', { NUM: n });
const txt = t => shadow('ugso_text', { TEXT: t });
const obj = () => ({ shadow: { type: 'ugso_object_new', inputs: { V0: txt('value') } } });
export function flowToolbox(category) {
  return flowDefinitions.filter(d => ({ Timeouts: ['ugso_pause', 'ugso_wait', 'ugso_stop'], Schleifen: ['ugso_repeat', 'ugso_repeat_while', 'ugso_foreach'], Objekt: ['ugso_object_new', 'ugso_object_get', 'ugso_object_has', 'ugso_object_keys', 'ugso_object_set', 'ugso_object_remove'], Logik: ['ugso_logic_range', 'ugso_logic_default', 'ugso_case'], Listen: ['ugso_list_new', 'ugso_list_length', 'ugso_list_empty'] }[category]).includes(d.type)).map(({ type }) => {
    const inputs = {};
    if (['ugso_pause', 'ugso_wait'].includes(type)) inputs.DURATION = num(1000);
    if (['ugso_wait', 'ugso_repeat_while'].includes(type)) inputs.CONDITION = shadow('ugso_state_condition', { ENTITY: 'input_boolean.test', STATE: 'on' });
    if (type === 'ugso_repeat') inputs.COUNT = num(3);
    if (type === 'ugso_foreach') inputs.ITEMS = { shadow: { type: 'ugso_list_new', inputs: { V0: txt('Eintrag') } } };
    if (type === 'ugso_object_new') inputs.V0 = txt('value');
    if (['ugso_object_get', 'ugso_object_has', 'ugso_object_keys'].includes(type)) inputs.OBJECT = obj();
    if (type === 'ugso_object_set') inputs.VALUE = txt('value');
    if (type === 'ugso_logic_range') Object.assign(inputs, { MIN: num(0), VALUE: num(42), MAX: num(100) });
    if (type === 'ugso_logic_default') Object.assign(inputs, { VALUE: shadow('ugso_null'), DEFAULT: txt('Ersatz') });
    if (type === 'ugso_case') Object.assign(inputs, { TEST: num(1), V0: num(1) });
    if (type === 'ugso_list_new') inputs.V0 = txt('Eintrag');
    if (['ugso_list_length', 'ugso_list_empty'].includes(type)) inputs.LIST = { shadow: { type: 'ugso_list_new', extraState: { rows: 0 } } };
    return { kind: 'block', type, inputs };
  });
}
