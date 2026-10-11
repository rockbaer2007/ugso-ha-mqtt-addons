import { language, labels, blockTranslations } from './locales.js';

let defining = true;
const text = (de, en, fr) => { labels[de] = [en, fr]; return defining ? de : ({ de, en, fr })[language]; };
const field = (name, value = '') => ({ type: 'field_input', name, text: value });
const entity = { type: 'ugso_field_entity', name: 'ENTITY', text: 'sensor.test' };
const input = (name, check = null) => ({ type: 'input_value', name, ...(check ? { check } : {}) });
const body = name => ({ type: 'input_statement', name, check: 'TemplatePart' });
const value = { output: ['Value', 'String'], colour: '#2682a5' };
const action = { previousStatement: 'Action', nextStatement: 'Action', colour: '#2682a5' };
const part = { previousStatement: 'TemplatePart', nextStatement: 'TemplatePart', colour: '#8a6635' };
const property = { type: 'field_dropdown', name: 'PROPERTY', options: [
  [text('Wert', 'Value', 'Valeur'), 'state'], [text('Name', 'Name', 'Nom'), 'name'],
  [text('Einheit', 'Unit', 'Unité'), 'unit'], [text('Attribut', 'Attribute', 'Attribut'), 'attribute'],
  [text('Zuletzt geändert', 'Last changed', 'Dernière modification'), 'last_changed'],
  [text('Zuletzt aktualisiert', 'Last updated', 'Dernière actualisation'), 'last_updated']
] };
export const systemTemplateDefinitions = [
  { type: 'ugso_entity_id', message0: text('Entitäts-ID %1', 'Entity ID %1', 'ID de l’entité %1'), args0: [entity], ...value },
  { type: 'ugso_entity_value', message0: text('%1 von Entität %2', '%1 of entity %2', '%1 de l’entité %2'), args0: [property, entity], ...value },
  { type: 'ugso_entity_value_dynamic', message0: text('%1 von Entitäts-ID %2', '%1 of entity ID %2', '%1 de l’ID d’entité %2'), args0: [property, input('ENTITY_ID')], ...value, inputsInline: true },
  { type: 'ugso_entity_snapshot', message0: text('%1 von Entität %2 einmal lesen in %3', 'Read %1 of entity %2 once into %3', 'Lire %1 de l’entité %2 une fois dans %3'), args0: [property, entity, { type: 'field_variable', name: 'VAR', variable: 'entity_value' }], message1: text('mache %1', 'do %1', 'faire %1'), args1: [{ type: 'input_statement', name: 'DO', check: 'Action' }], ...action, tooltip: text('Momentaufnahme in einer HA-Variable; kein Auslöser. Die folgenden Aktionen verwenden denselben gespeicherten Wert.', 'Snapshot in an HA variable, not a trigger. Following actions use the same saved value.', 'Instantané dans une variable HA, pas un déclencheur. Les actions suivantes utilisent la même valeur enregistrée.') },
  { type: 'ugso_automation_control', message0: text('Automation steuern %1 Aktion %2', 'Control automation %1 action %2', 'Contrôler l’automatisation %1 action %2'), args0: [{ ...entity, text: 'automation.test' }, { type: 'field_dropdown', name: 'MODE', options: [[text('aktivieren', 'enable', 'activer'), 'turn_on'], [text('deaktivieren', 'disable', 'désactiver'), 'turn_off'], [text('umschalten', 'toggle', 'basculer'), 'toggle'], [text('jetzt ausführen', 'run now', 'exécuter maintenant'), 'trigger']] }], ...action },
  { type: 'ugso_app_control', message0: text('App steuern %1 Aktion %2', 'Control app %1 action %2', 'Contrôler l’application %1 action %2'), args0: [{ type: 'ugso_field_ha_choice', name: 'APP', text: 'core_mosquitto', choice: { kind: 'app' } }, { type: 'field_dropdown', name: 'MODE', options: [[text('starten', 'start', 'démarrer'), 'start'], [text('stoppen', 'stop', 'arrêter'), 'stop'], [text('neustarten', 'restart', 'redémarrer'), 'restart']] }], ...action, tooltip: text('Benötigt HA Supervisor. App-Kennung aus der HA-Auswahl oder manuell eingeben.', 'Requires HA Supervisor. Choose an app slug from HA or enter it manually.', 'Nécessite HA Supervisor. Choisir l’identifiant de l’application dans HA ou le saisir.') },
  { type: 'ugso_template_builder', message0: 'Template', output: ['Value', 'String'], colour: '#8a6635', inputsInline: false, tooltip: text('Text, Entitätswerte und weitere Werte direkt an Teil 1, Teil 2 usw. anschließen. Ein weiterer Andockpunkt erscheint automatisch. Ausgabe von oben nach unten.', 'Connect text, entity values and other values directly to Part 1, Part 2, etc. A further socket appears automatically. Output is top to bottom.', 'Brancher texte, valeurs d’entités et autres valeurs sur Partie 1, Partie 2, etc. Une entrée supplémentaire apparaît automatiquement. Sortie de haut en bas.') },
  { type: 'ugso_template_output', message0: text('Ausgeben %1', 'Output %1', 'Afficher %1'), args0: [input('VALUE')], ...part },
  { type: 'ugso_template_newline', message0: text('Zeilenumbruch', 'New line', 'Nouvelle ligne'), ...part },
  { type: 'ugso_template_if', message0: text('falls %1', 'if %1', 'si %1'), args0: [input('TEST', 'Boolean')], message1: text('ausgeben %1', 'output %1', 'afficher %1'), args1: [body('THEN')], ...part },
  { type: 'ugso_number_format', message0: text('Zahlenformat %1 Nachkommastellen %2', 'Number format %1 decimal places %2', 'Format du nombre %1 décimales %2'), args0: [input('VALUE'), input('DECIMALS', 'Number')], output: ['Value', 'String'], colour: '#8a6635', inputsInline: true, tooltip: text('0 bis 10 Nachkommastellen. Ungültige Zahlen ergeben ohne Ersatzwert einen leeren Text.', '0 to 10 decimal places. Invalid numbers produce empty text unless a fallback is supplied.', '0 à 10 décimales. Un nombre invalide donne un texte vide sauf si une valeur de remplacement est fournie.') },
  { type: 'ugso_value_fallback', message0: text('Wert %1 sonst %2', 'Value %1 otherwise %2', 'Valeur %1 sinon %2'), args0: [input('VALUE'), input('FALLBACK')], output: ['Value', 'String'], colour: '#8a6635', inputsInline: true, tooltip: text('Ersatz für unknown, unavailable, null und leeren Text. 0 und falsch bleiben erhalten.', 'Fallback for unknown, unavailable, null and empty text. Keeps 0 and false.', 'Remplacement pour unknown, unavailable, null et texte vide. Conserve 0 et faux.') },
  { type: 'ugso_template_linebreak', message0: text('Zeilenumbruch', 'New line', 'Nouvelle ligne'), output: ['Value','String'], colour: '#8a6635' },
  { type: 'ugso_template_conditional', message0: text('falls %1', 'if %1', 'si %1'), args0: [input('TEST','Boolean')], message1: text('dann %1', 'then %1', 'alors %1'), args1: [input('THEN')], message2: text('sonst %1', 'else %1', 'sinon %1'), args2: [input('ELSE')], output: ['Value','String'], colour: '#8a6635', inputsInline: false }
];
export const systemTypes = ['ugso_entity_id', 'ugso_entity_value', 'ugso_entity_value_dynamic', 'ugso_entity_snapshot', 'ugso_app_control', 'ugso_automation_control'];
for (const [type, title] of [
  ['ugso_app_control', text('App steuern %1', 'Control app %1', 'Contrôler l’application %1')],
  ['ugso_automation_control', text('Automation steuern %1', 'Control automation %1', 'Contrôler l’automatisation %1')]
]) {
  const definition = systemTemplateDefinitions.find(d => d.type === type);
  definition.message0 = title;
  definition.args1 = [definition.args0.pop()];
  definition.message1 = text('Aktion %1', 'Action %1', 'Action %1');
  definition.inputsInline = false;
  definition.colour = '#6860b5'; // System controls use the familiar ioBroker blue.
}
systemTemplateDefinitions.find(d=>d.type==='ugso_template_builder').message0=text('Text zusammenstellen','Compose text','Composer du texte');
const selectedValue=systemTemplateDefinitions.find(d=>d.type==='ugso_template_conditional');
selectedValue.message3=selectedValue.message2;selectedValue.args3=selectedValue.args2;
selectedValue.message2=selectedValue.message1;selectedValue.args2=selectedValue.args1;
selectedValue.message1=selectedValue.message0;selectedValue.args1=selectedValue.args0;
selectedValue.message0=text('Wert auswählen – falls/sonst %1','Select value – if/else %1','Choisir une valeur – si/sinon %1');
selectedValue.args0=[{type:'field_dropdown',name:'KIND',options:[[text('Wert','Value','Valeur'),'value'],[text('Text','Text','Texte'),'text'],[text('Zahl','Number','Nombre'),'number'],[text('Logikwert','Boolean','Booléen'),'boolean']]}];
selectedValue.tooltip=text('Ergebnistyp wählen. Falls benötigt einen Logikwert; dann/sonst erhalten passende Anschlüsse. Zahl und Logikwert benötigen beide Zweige.','Choose the result type. If requires a Boolean; then/else receive matching sockets. Number and Boolean require both branches.','Choisir le type du résultat. Si exige un booléen ; alors/sinon ont des entrées adaptées. Nombre et booléen exigent les deux branches.');
systemTemplateDefinitions.push(
  {type:'ugso_template_time_window',message0:text('Uhrzeit im Zeitraum','Time within period','Heure dans la plage'),message1:text('ab (einschließlich) %1','from (inclusive) %1','de (inclus) %1'),args1:[field('START','10:00:00')],message2:text('bis (ausschließlich) %1','until (exclusive) %1','à (exclu) %1'),args2:[field('END','13:00:00')],output:['Boolean','Value'],colour:'#8a6635',inputsInline:false,tooltip:text('Aktuelle HA-Ortszeit. Beginn inklusive, Ende exklusiv. Unterstützt Mitternacht; gleiche Grenzen ergeben falsch. Format HH:MM oder HH:MM:SS.','Current HA local time. Start inclusive, end exclusive. Supports midnight; equal boundaries are false. Format HH:MM or HH:MM:SS.','Heure locale HA actuelle. Début inclus, fin exclue. Gère minuit ; bornes égales donnent faux. Format HH:MM ou HH:MM:SS.')},
  {type:'ugso_template_change',message0:text('Wertänderung prüfen','Check value change','Vérifier la variation'),message1:text('Anstieg über %1','rise above %1','hausse supérieure à %1'),args1:[input('RISE',['Number','RuntimeNumber'])],message2:text('Abfall über %1','fall above %1','baisse supérieure à %1'),args2:[input('FALL',['Number','RuntimeNumber'])],message3:text('Alter Wert (leer: Auslöser) %1','Old value (empty: trigger) %1','Ancienne valeur (vide : déclencheur) %1'),args3:[input('OLD','Value')],message4:text('Neuer Wert (leer: Auslöser) %1','New value (empty: trigger) %1','Nouvelle valeur (vide : déclencheur) %1'),args4:[input('NEW','Value')],output:['Boolean','Value'],colour:'#8a6635',inputsInline:false,tooltip:text('Neuer minus alter Wert. Wahr bei Anstieg oder Abfall über der jeweiligen positiven Schwelle. Leere Werteingänge lesen die Auslöserwerte. Fehlender, unknown, unavailable oder none alter Wert ergibt falsch. Zahlenumwandlung mit float(0).','New minus old value. True for a rise or fall above its positive threshold. Empty value inputs use trigger values. Missing, unknown, unavailable or none old value gives false. Number conversion uses float(0).','Nouvelle moins ancienne valeur. Vrai si la hausse ou la baisse dépasse son seuil positif. Entrées vides : valeurs du déclencheur. Ancienne valeur absente, unknown, unavailable ou none : faux. Conversion par float(0).')}
);
export const templateTypes = ['ugso_template_builder','ugso_template_time_window','ugso_template_change','ugso_template_conditional','ugso_number_format','ugso_value_fallback','ugso_template_linebreak'];
for (const d of systemTemplateDefinitions) blockTranslations[d.type] = [...(labels[d.message0] || [d.message0, d.message0]), ...(d.tooltip ? labels[d.tooltip] : [])];
defining = false;

// Permanent named rows preserve fields and connections during project loading.
// A native gear selects optional rows; no additional shortcut buttons.
export function setupSystemTemplate(Blockly, block, previewSource) {
  if(block.type==='ugso_template_conditional'){
    const update=(kind=block.getFieldValue('KIND'))=>{
      const check={value:null,text:'String',number:['Number','RuntimeNumber'],boolean:'Boolean'}[kind];
      block.getInput('THEN').setCheck(check);block.getInput('ELSE').setCheck(check);
      block.setOutput(true,kind==='value'?['Value','String']:kind==='number'?['RuntimeNumber','Value']:[kind==='boolean'?'Boolean':'String','Value']);
    };
    block.getField('KIND').setValidator(kind=>{update(kind);return kind;});update();
  }
  if(block.type==='ugso_template_change')for(const [name,value] of [['RISE',10],['FALL',20]])block.getInput(name).connection.setShadowState({type:'ugso_number',fields:{NUM:value}});
  if (block.type === 'ugso_template_builder') {
    setupTemplateSockets(Blockly, block);
    block.customContextMenu = menu => menu.push({ text: text('Template-Vorschau / Jinja', 'Template preview / Jinja', 'Aperçu du template / Jinja'), enabled: true, callback: () => showPreview(previewSource) });
    return;
  }
  if (block.type === 'ugso_template_if') {
    block.appendStatementInput('ELSE').setCheck('TemplatePart').appendField(text('sonst','else','sinon'));
    block.optionEnabled_ = () => true;block.saveExtraState = () => ({});block.loadExtraState = () => {};
    return;
  }
  if (block.type === 'ugso_number_format') {
    block.getInput('DECIMALS').connection.setShadowState({ type: 'ugso_number', fields: { NUM: 1 } });
    block.appendValueInput('FALLBACK').appendField(text('Ersatzwert (optional)','Fallback (optional)','Remplacement (facultatif)'));
    block.setInputsInline(false);
    block.optionEnabled_ = () => !!block.getInputTargetBlock('FALLBACK');
    block.saveExtraState = () => ({});block.loadExtraState = () => {};
    return;
  }
  const options = [];
  const option = (key, label, create, used = () => false) => {
    const row = create(); options.push({ key, label, row, used });
  };
  if (block.getField('PROPERTY')) option('ATTRIBUTE', text('Attributname', 'Attribute name', 'Nom de l’attribut'), () => block.appendDummyInput('ATTRIBUTE').appendField(text('Attribut', 'Attribute', 'Attribut')).appendField(new Blockly.FieldTextInput(''), 'ATTRIBUTE'), () => block.getFieldValue('PROPERTY') === 'attribute');
  if (block.type === 'ugso_automation_control') {
    option('CONDITIONS', text('Bedingungen berücksichtigen', 'Check conditions', 'Vérifier les conditions'), () => block.appendDummyInput('CONDITIONS').appendField(text('Bedingungen berücksichtigen', 'Check conditions', 'Vérifier les conditions')).appendField(new Blockly.FieldCheckbox('TRUE'), 'CHECK_CONDITIONS'));
    option('STOP', text('Laufende Aktionen stoppen', 'Stop running actions', 'Arrêter les actions en cours'), () => block.appendDummyInput('STOP').appendField(text('Laufende Aktionen stoppen', 'Stop running actions', 'Arrêter les actions en cours')).appendField(new Blockly.FieldCheckbox('TRUE'), 'STOP_ACTIONS'));
    option('TARGET', text('Entitäts-ID anschließen', 'Connect entity ID', 'Brancher l’ID d’entité'), () => block.appendValueInput('TARGET').appendField(text('Entitäts-ID', 'Entity ID', 'ID de l’entité')));
  }
  if (!options.length) return;
  let selected = new Set();
  const refresh = () => {
    let changed = false;
    for (const o of options) {
      if (o.used()) selected.add(o.key);
      const visible = selected.has(o.key);
      if (block.rendered && o.row.isVisible() !== visible) {
        for (const child of o.row.setVisible(visible)) child.queueRender();
        changed = true;
      } else if (!block.rendered) o.row.visible_ = visible;
    }
    if (changed) block.queueRender();
  };
  block.optionEnabled_ = key => selected.has(key);
  block.saveExtraState = () => ({ options: [...selected] });
  block.loadExtraState = state => { selected = new Set((state?.options || []).filter(k => options.some(o => o.key === k))); refresh(); };
  block.setOnChange(event => { if (event.blockId === block.id && event.type === Blockly.Events.BLOCK_CHANGE) refresh(); });
  const rootType = `${block.type}_options`, types = options.map(o => `${rootType}_${o.key.toLowerCase()}`);
  if (!Blockly.Blocks[rootType]) Blockly.defineBlocksWithJsonArray([
    { type: rootType, message0: text('Optionen %1', 'Options %1', 'Options %1'), args0: [{ type: 'input_statement', name: 'STACK' }], colour: block.getColour(), enableContextMenu: false },
    ...options.map((o, i) => ({ type: types[i], message0: o.label, previousStatement: null, nextStatement: null, colour: block.getColour(), enableContextMenu: false }))
  ]);
  block.decompose = ws => {
    const root = ws.newBlock(rootType); root.initSvg?.(); let c = root.getInput('STACK').connection;
    options.forEach((o, i) => { if (selected.has(o.key)) { const item = ws.newBlock(types[i]); item.initSvg?.(); c.connect(item.previousConnection); c = item.nextConnection; } });
    return root;
  };
  block.compose = root => {
    const next = new Set();
    for (let item = root.getInputTargetBlock('STACK'); item; item = item.getNextBlock()) { const i = types.indexOf(item.type); if (i >= 0) next.add(options[i].key); }
    for (const o of options) if (selected.has(o.key) && !next.has(o.key)) o.row.connection?.targetConnection?.disconnect();
    selected = next; refresh();
  };
  block.saveConnections = () => {};
  refresh();
  if (block instanceof Blockly.BlockSvg) block.setMutator(new Blockly.icons.MutatorIcon(types, block));
}

function setupTemplateSockets(Blockly, block) {
  // Retain the old statement input for loading 0.1.62 project JSON. It is
  // migrated to ordinary value inputs once Blockly has loaded its children.
  const legacy=block.appendStatementInput('PARTS').setCheck('TemplatePart');
  if(block.workspace.rendered)legacy.setVisible(false);else legacy.visible_=false;
  let count=0, migrating=false;
  const resize = size => {
    while(count<size)block.appendValueInput(`PART${count++}`).setCheck(['Value','String','Number','Boolean','Colour','Array','Object','DateTime','RuntimeNumber']).appendField(text('Teil','Part','Partie')+' '+count);
    while(count>size)block.removeInput(`PART${--count}`);
  };
  block.refreshTemplateInputs_ = () => {
    let last=-1;for(let i=0;i<count;i++)if(block.getInputTargetBlock(`PART${i}`))last=i;
    // Keep empty sockets stable so undo/redo can reconnect to the same name.
    resize(Math.min(1000,Math.max(count,2,last+2)));
  };
  block.saveExtraState = () => ({ parts: count });
  block.loadExtraState = state => { const n=state?.parts;resize(Number.isInteger(n)&&n>=2&&n<=1000?n:2); };
  resize(2);
  block.migrateTemplate_ = () => {
    if(migrating||!block.getInputTargetBlock('PARTS'))return;
    const old=[];for(let b=block.getInputTargetBlock('PARTS');b;b=b.getNextBlock())old.push(b);
    if(old.some(b=>!['ugso_template_output','ugso_template_newline','ugso_template_if'].includes(b.type)))return;
    migrating=true;
    try {
      let index=0;while(index<count&&block.getInputTargetBlock(`PART${index}`))index++;
      resize(Math.max(count,index+old.length+1));
      for(const b of old){if(b.previousConnection?.isConnected())b.previousConnection.disconnect();if(b.nextConnection?.isConnected())b.nextConnection.disconnect();}
      const make = type => {const b=block.workspace.newBlock(type);if(block.workspace.rendered){b.initSvg();b.render();}return b;};
      const detach = (b,name) => {const value=b.getInputTargetBlock(name);value?.outputConnection?.disconnect();return value;};
      for(const b of old){
        let value;
        if(b.type==='ugso_template_output')value=detach(b,'VALUE');
        else if(b.type==='ugso_template_newline')value=make('ugso_template_linebreak');
        else {
          value=make('ugso_template_conditional');const test=detach(b,'TEST');if(test)value.getInput('TEST').connection.connect(test.outputConnection);
          for(const name of ['THEN','ELSE']){
            const first=b.getInputTargetBlock(name);if(!first)continue;
            first.previousConnection.disconnect();const nested=make('ugso_template_builder');nested.getInput('PARTS').connection.connect(first.previousConnection);nested.migrateTemplate_();value.getInput(name).connection.connect(nested.outputConnection);
          }
        }
        if(value){if(!b.isEnabled())value.setDisabledReason(true,'MANUALLY_DISABLED');block.getInput(`PART${index}`).connection.connect(value.outputConnection);}
        index++;b.dispose(false);
      }
      block.refreshTemplateInputs_();
    }finally{migrating=false;}
  };
  block.setOnChange(event=>{
    if(block.isDisposed())return;
    if(event.type===Blockly.Events.BLOCK_CREATE||event.type===Blockly.Events.BLOCK_MOVE){block.migrateTemplate_();block.refreshTemplateInputs_();}
  });
}

async function showPreview(source) {
  const dialog = document.createElement('dialog');
  const title = document.createElement('h2'); title.textContent = text('Template-Vorschau', 'Template preview', 'Aperçu du template');
  const code = document.createElement('pre'), result = document.createElement('pre'), close = document.createElement('button');
  code.style.whiteSpace = result.style.whiteSpace = 'pre-wrap';
  code.style.overflowWrap = result.style.overflowWrap = 'anywhere';
  dialog.style.maxWidth = 'min(720px, 90vw)';
  close.textContent = text('Schließen', 'Close', 'Fermer'); close.addEventListener('click', () => dialog.close());
  dialog.append(title, code, result, close);document.body.append(dialog);
  dialog.addEventListener('close', () => dialog.remove());dialog.showModal();
  try {
    const template = source();code.textContent = template;
    result.textContent = text('Liest aktuelle Werte aus Home Assistant …', 'Reading current values from Home Assistant …', 'Lecture des valeurs actuelles de Home Assistant …');
    const response = await fetch(new URL('./api/ha/template', document.baseURI), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ template }), signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw Error();
    const data = await response.json();if(typeof data.result !== 'string')throw Error();
    result.textContent = text('HA-Momentaufnahme:\n', 'HA snapshot:\n', 'Instantané HA :\n') + data.result;
  } catch {
    result.textContent = text('Vorschau nicht verfügbar. HA-Verbindung und vollständige Eingaben prüfen. Oben steht der erzeugte Jinja-Code.', 'Preview unavailable. Check HA connection and complete inputs. Generated Jinja code is shown above.', 'Aperçu indisponible. Vérifier la connexion HA et les entrées. Le code Jinja généré figure ci-dessus.');
  }
}

const f = (block, name) => block.getFieldValue(name);
export function entityValueExpression(block, child) {
  const id = block.type === 'ugso_entity_value_dynamic' ? child('ENTITY_ID') : JSON.stringify(f(block, 'ENTITY'));
  if (block.type !== 'ugso_entity_value_dynamic' && !/^[a-z][a-z0-9_]*\.[a-z0-9_]+$/.test(f(block, 'ENTITY'))) throw Error(text('Ungültige Entitäts-ID.', 'Invalid entity ID.', 'ID d’entité invalide.'));
  switch (f(block, 'PROPERTY')) {
    case 'state': return `states(${id})`;
    case 'name': return `(state_attr(${id}, 'friendly_name') | default(${id}, true))`;
    case 'unit': return `state_attr(${id}, 'unit_of_measurement')`;
    case 'attribute': {
      if (!f(block, 'ATTRIBUTE')?.trim()) throw Error(text('Attributname fehlt.', 'Attribute name is missing.', 'Le nom de l’attribut manque.'));
      return `state_attr(${id}, ${JSON.stringify(f(block, 'ATTRIBUTE'))})`;
    }
    default: return `(states | selectattr('entity_id', 'equalto', ${id}) | map(attribute=${JSON.stringify(f(block, 'PROPERTY'))}) | first | default(none))`;
  }
}
export function systemTemplateExpression(block, child, expression) {
  if (block.type === 'ugso_entity_id') {
    if (!/^[a-z][a-z0-9_]*\.[a-z0-9_]+$/.test(f(block, 'ENTITY'))) throw Error(text('Ungültige Entitäts-ID.', 'Invalid entity ID.', 'ID d’entité invalide.'));
    return JSON.stringify(f(block, 'ENTITY'));
  }
  if (['ugso_entity_value', 'ugso_entity_value_dynamic'].includes(block.type)) return entityValueExpression(block, child);
  if (block.type === 'ugso_template_builder') {
    const parts=[];
    if(block.getInputTargetBlock('PARTS'))parts.push(templateParts(block.getInputTargetBlock('PARTS'),expression));
    for(const row of block.inputList)if(/^PART\d+$/.test(row.name)&&block.getInputTargetBlock(row.name)?.isEnabled())parts.push(`((${child(row.name)}) | string)`);
    return parts.length?`(${parts.join(' ~ ')})`:"''";
  }
  if (block.type === 'ugso_template_linebreak') return JSON.stringify('\n');
  if(block.type==='ugso_template_conditional'){
    if(['number','boolean'].includes(f(block,'KIND'))&&(!block.getInputTargetBlock('THEN')||!block.getInputTargetBlock('ELSE')))throw Error(text('Beide Zweige benötigen einen passenden Wert.','Both branches need a matching value.','Les deux branches exigent une valeur adaptée.'));
    return `((${block.getInputTargetBlock('THEN')?child('THEN'):"''"}) if ${child('TEST')} else (${block.getInputTargetBlock('ELSE')?child('ELSE'):"''"}))`;
  }
  if(block.type==='ugso_template_time_window'){
    const clock=name=>{const value=f(block,name);if(!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value))throw Error(text('Uhrzeit als HH:MM oder HH:MM:SS eingeben.','Enter time as HH:MM or HH:MM:SS.','Saisir l’heure en HH:MM ou HH:MM:SS.'));return JSON.stringify(value.length===5?value+':00':value);};
    const start=clock('START'),end=clock('END'),now="now().strftime('%H:%M:%S')";
    return `((${start} <= ${now} < ${end}) if ${start} <= ${end} else (${now} >= ${start} or ${now} < ${end}))`;
  }
  if(block.type==='ugso_template_change'){
    const old=block.getInputTargetBlock('OLD')?child('OLD'):"(trigger.from_state.state if trigger is defined and trigger.from_state is defined and trigger.from_state is not none else none)";
    const next=block.getInputTargetBlock('NEW')?child('NEW'):"(trigger.to_state.state if trigger is defined and trigger.to_state is defined and trigger.to_state is not none else none)";
    for(const name of ['RISE','FALL']){const b=block.getInputTargetBlock(name);if(b?.type==='ugso_number'&&Number(b.getFieldValue('NUM'))<0)throw Error(text('Schwellen müssen mindestens 0 sein.','Thresholds must be at least 0.','Les seuils doivent être au moins 0.'));}
    const rise=child('RISE'),fall=child('FALL'),diff=`(((${next}) | float(0)) - ((${old}) | float(0)))`;
    return `(false if (${old}) in [none, 'unavailable', 'unknown', 'none'] else ((${rise}) >= 0 and (${fall}) >= 0 and (${diff} > (${rise}) or ${diff} < -(${fall}))))`;
  }
  if (block.type === 'ugso_value_fallback') { const v = child('VALUE'); return `(${child('FALLBACK')} if (${v}) in [none, 'unknown', 'unavailable', ''] else (${v}))`; }
  if (block.type === 'ugso_number_format') {
    const v = child('VALUE'), decimals = child('DECIMALS');
    const fallback = block.optionEnabled_('FALLBACK') ? child('FALLBACK') : "''";
    return `((('%.' ~ ([0, ([(${decimals}) | int(0), 10] | min)] | max) ~ 'f') % ((${v}) | float)) if is_number(${v}) else (${fallback}))`;
  }
  return null;
}
function templateParts(first, expression, depth = 0) {
  if (depth > 10) throw Error(text('Template ist zu tief verschachtelt.', 'Template nesting is too deep.', 'Le template est trop imbriqué.'));
  const parts = [];
  for (let block = first; block; block = block.getNextBlock()) {
    if (!block.isEnabled()) continue;
    const value = name => expression(block.getInputTargetBlock(name));
    if (block.type === 'ugso_template_output') parts.push(`((${value('VALUE')}) | string)`);
    else if (block.type === 'ugso_template_newline') parts.push(JSON.stringify('\n'));
    else if (block.type === 'ugso_template_if') parts.push(`(${templateParts(block.getInputTargetBlock('THEN'), expression, depth + 1)} if ${value('TEST')} else ${templateParts(block.optionEnabled_('ELSE') ? block.getInputTargetBlock('ELSE') : null, expression, depth + 1)})`);
    else throw Error(text('Ungültiger Template-Ausgabeteil.', 'Invalid template output part.', 'Partie de template invalide.'));
  }
  return parts.length ? `(${parts.join(' ~ ')})` : "''";
}
export function systemTemplateAction(block, { child, actions, variableName }) {
  if (block.type === 'ugso_entity_snapshot') return { sequence: [{ variables: { [variableName()]: `{{ ${entityValueExpression(block, child)} }}` } }, ...actions('DO')] };
  if (block.type === 'ugso_app_control') {
    const app = f(block, 'APP'); if (!/^[a-z0-9][a-z0-9_-]*$/.test(app)) throw Error(text('Ungültige App-Kennung.', 'Invalid app slug.', 'Identifiant d’application invalide.'));
    return { action: `hassio.app_${f(block, 'MODE')}`, data: { app } };
  }
  if (block.type === 'ugso_automation_control') {
    const mode = f(block, 'MODE'), dynamic = block.optionEnabled_('TARGET');
    const entity = f(block, 'ENTITY');
    if (!dynamic && !/^automation\.[a-z0-9_]+$/.test(entity)) throw Error(text('Automation auswählen.', 'Choose an automation.', 'Choisir une automatisation.'));
    const data = mode === 'trigger' && block.optionEnabled_('CONDITIONS') ? { skip_condition: f(block, 'CHECK_CONDITIONS') !== 'TRUE' }
      : mode === 'turn_off' && block.optionEnabled_('STOP') ? { stop_actions: f(block, 'STOP_ACTIONS') === 'TRUE' } : {};
    return { action: `automation.${mode}`, target: { entity_id: dynamic ? `{{ ${child('TARGET')} }}` : entity }, ...(Object.keys(data).length ? { data } : {}) };
  }
  return null;
}
