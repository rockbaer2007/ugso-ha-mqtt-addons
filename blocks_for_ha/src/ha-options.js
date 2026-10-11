import { translateLabel as t } from './locales.js';

// Fields retain their stable names for older JSON projects. Hidden option rows
// are presentation only; removing an option explicitly clears its HA value.
const core = {
  state: ['entity_id', 'state'], numeric_state: ['entity_id'], time: ['at'],
  time_pattern: [], sun: ['event'], homeassistant: ['event'], mqtt: ['topic'],
  template: ['value_template'], webhook: ['webhook_id'], zone: ['entity_id', 'zone', 'event'],
  device: ['device_id', 'domain', 'type'], tag: ['tag_id'], conversation: ['command'],
  geo_location: ['source', 'zone', 'event'], calendar: ['entity_id', 'event'], event: ['event_type'],
  trigger: ['id'], and: ['conditions'], or: ['conditions'], not: ['conditions'],
};
const nativeRows = {
  TRIGGER_OPTIONS: ['Auslöser-ID (optional)', ['TRIGGER_ID']],
  TIME_OPTIONS: ['Uhrzeiten als JSON-Liste', ['TIME_LIST']],
  STATE_OPTIONS: ['Zustände als JSON-Liste', ['STATE_LIST']],
  ANY_STATE_OPTIONS: ['Jede Änderung', ['ANY_STATE']],
  ENTITY_OPTIONS: ['Entitäten als JSON-Liste', ['ENTITY_LIST', 'ENTITIES']],
  DURATION_OPTIONS: ['Haltezeit (JSON)', ['USE_FOR', 'FOR']],
  SUN_OFFSET: ['Versatz (Minuten)', ['USE_OFFSET', 'OFFSET_MINUTES']],
  ACTION_RESPONSE: ['Antwortvariable (optional)', ['RESPONSE_VARIABLE']],
  TARGET_OPTIONS: ['Ziele als JSON-Liste', ['ENTITY_LIST', 'ENTITIES']],
  DATA_OPTIONS: ['Leere Daten ausgeben', ['INCLUDE_DATA']],
  ACTION_METADATA: ['Metadaten ausgeben', ['INCLUDE_METADATA', 'METADATA']],
  HA_DATA_OPTIONS: ['Daten', ['DATA']],
  HA_FILTER_OPTIONS: ['Ereignisdaten', ['FILTER','EVENT_DATA']],
};
const empty = value => value === '' || value === undefined;
function candidates(block) {
  const options = [];
  for (const [source, state] of Object.entries(block.haSources_ || {})) {
    if (source === 'VARIABLES') continue; // Variable names/values are the operation itself.
    for (const field of state.fields) {
      const discriminator = state.original.trigger || state.original.condition;
      const required = field.key === 'trigger' || field.key === 'condition'
        || source === 'THRESHOLD' || (source === 'TARGET' && field.key === 'entity_id')
        || (source === 'JSON' && (core[discriminator] || []).includes(field.key))
        || (source === 'JSON' && block.type === 'ugso_ha_action' && (['action','service'].includes(field.key) || field.path === 'target.entity_id'
          || !['target','data','data_template','alias','enabled','continue_on_error','response_variable','metadata'].includes(field.path.split('.')[0])));
      if (required) continue;
      const input = block.inputList.find(input => input.fieldRow.some(f => f.name === field.name));
      if (!input) continue;
      options.push({ key: field.name, input, label: input.fieldRow[0].getText(), fields: [field.name], defaults: { [field.name]: '' }, meaningful: () => !empty(block.getFieldValue(field.name)) });
    }
    const input = block.getInput(`HA_ROW_${source}_EXTRA`);
    if (input) options.push({ key: input.name, input, label: t('Weitere Optionen (JSON)'), fields: [state.extraName], defaults: { [state.extraName]: '{}' }, meaningful: () => !['{}','',undefined].includes(block.getFieldValue(state.extraName)) });
  }
  for (const [name, [label, fields]] of Object.entries(nativeRows)) {
    const input = block.getInput(name); if (!input) continue;
    const defaults = Object.fromEntries(fields.map(name => [name, block.getFieldValue(name)]));
    const gate = fields.find(name => /^(?:USE_|INCLUDE_)/.test(name) || ['ENTITY_LIST','TIME_LIST','STATE_LIST','ANY_STATE','FILTER'].includes(name));
    if (gate) defaults[gate] = 'FALSE';
    if (name === 'HA_DATA_OPTIONS') defaults.DATA = '{}';
    options.push({ key: name, input, label: t(label), fields, defaults,
      meaningful: () => gate ? block.getFieldValue(gate) === 'TRUE' : !empty(block.getFieldValue(fields[0])) && (name !== 'HA_DATA_OPTIONS' || !['{}','{ }'].includes(block.getFieldValue('DATA'))) });
  }
  return options;
}
export function setupHAOptions(Blockly, block) {
  if (block.getIcon?.(Blockly.icons.MutatorIcon.TYPE)) return;
  // Move optional inline text fields to independent rows, retaining field IDs.
  const split = (inputName, names, label) => {
    const row = block.appendDummyInput(inputName).appendField(t(label));
    for (const name of names) {
      const field = block.getField(name), owner = block.inputList.find(input => input.fieldRow.includes(field));
      if (!field || !owner) continue;
      const index = owner.fieldRow.indexOf(field), caption = owner.fieldRow[index - 1];
      if (caption && !caption.name && !/HA-Aktion|HA action|Action HA|Wenn Ereignis|When event|Si événement/.test(caption.getText())) caption.setVisible(false);
      const value = field.getValue(), Field = field.constructor;
      owner.removeField(name); const replacement = new Field(value); row.appendField(replacement, name);
      replacement.setMaxLines?.(2);
    }
  };
  if (['ugso_target_action','ugso_service_action','ugso_fire_event'].includes(block.type)) split('HA_DATA_OPTIONS',['DATA'],'Daten');
  if (block.type === 'ugso_event_trigger') split('HA_FILTER_OPTIONS',['EVENT_DATA','FILTER'],'Ereignisdaten');
  if (!candidates(block).length) return;
  let selected = new Set(), restoring = false, composing = false;
  const automatic = new Set();
  const paletteTypes = [];
  const defaults = new Map(candidates(block).map(option => [option.key, option.defaults]));
  const oldSave = block.saveExtraState, oldLoad = block.loadExtraState;
  const refresh = () => {
    const options = candidates(block); block.haOptionRows_ = options;
    for (const option of options) {
      if (!defaults.has(option.key)) defaults.set(option.key, option.defaults);
      option.defaults = defaults.get(option.key);
      if (!restoring && !composing && automatic.has(option.key) && !option.meaningful()) { selected.delete(option.key); automatic.delete(option.key); }
      if (!restoring && !composing && option.meaningful() && !selected.has(option.key)) { selected.add(option.key); automatic.add(option.key); }
      // setVisible is a rendered-workspace operation. Retain the visibility flag
      // in headless mode for serialization and model tests.
      const visible = selected.has(option.key);
      if (block.rendered && option.input.isVisible() !== visible) option.input.setVisible(visible);
      else if (!block.rendered) option.input.visible_ = visible;
      for (const name of option.fields) {
        const field = block.getField(name); if (!field || field.haOptionWatch_) continue;
        const update = field.doValueUpdate_; field.haOptionWatch_ = true;
        field.doValueUpdate_ = function(value) { update.call(this, value); if (!composing) refresh(); };
      }
      const type = `ugso_option_${block.type}_${option.key}`.replace(/[^a-zA-Z0-9_]/g, '_'); option.type = type;
      if (!Blockly.Blocks[type]) Blockly.defineBlocksWithJsonArray([{type, message0: '%1', args0:[{type:'field_label_serializable',name:'LABEL',text:option.label}], previousStatement:null,nextStatement:null,colour:block.getColour(),enableContextMenu:false}]);
    }
    paletteTypes.splice(0, paletteTypes.length, ...options.map(option => option.type));
    for (const key of selected) {
      const option = options.find(option => option.key === key);
      if (option) block.moveInputBefore(option.input.name, null);
    }
    return options;
  };
  block.refreshHAOptions_ = refresh;
  block.hydrateHAOptions_ = source => {
    for (const key of [...automatic]) if (key.startsWith(`HA_${source}_`) || key.startsWith(`HA_ROW_${source}_`)) { selected.delete(key); automatic.delete(key); }
    refresh();
  };
  block.saveExtraState = function() { return { ...(oldSave?.call(this) || {}), haOptions: [...selected] }; };
  block.loadExtraState = function(state) {
    oldLoad?.call(this, state);
    if (Array.isArray(state.haOptions)) { selected = new Set(state.haOptions.filter(key => typeof key === 'string')); automatic.clear(); restoring = true; refresh(); restoring = false; }
  };
  const rootType = 'ugso_ha_options_container';
  if (!Blockly.Blocks[rootType]) Blockly.defineBlocksWithJsonArray([{type:rootType,message0:'%1 %2',args0:[{type:'field_label',text:t('HA-Optionen')},{type:'input_statement',name:'STACK'}],colour:'#2682a5',enableContextMenu:false}]);
  block.decompose = function(workspace) {
    const root = workspace.newBlock(rootType); root.initSvg?.(); let connection = root.getInput('STACK').connection;
    const options = refresh();
    for (const key of selected) {
      const option = options.find(option => option.key === key); if (!option) continue;
      const item = workspace.newBlock(option.type); item.initSvg?.(); connection.connect(item.previousConnection); connection = item.nextConnection;
    }
    return root;
  };
  block.compose = function(root) {
    const options = refresh(), next = new Set();
    for (let item = root.getInputTargetBlock('STACK'); item; item = item.getNextBlock()) if (!item.isInsertionMarker()) {
      const option = options.find(option => option.type === item.type); if (option) next.add(option.key);
    }
    composing = true;
    try {
      for (const option of options) if (selected.has(option.key) && !next.has(option.key)) {
        option.input.connection?.targetConnection?.disconnect();
        for (const [name, value] of Object.entries(option.defaults)) block.setFieldValue(value, name);
      }
      selected = next; automatic.clear(); refresh();
    } finally { composing = false; }
  };
  block.saveConnections = () => {};
  refresh();
  if (block instanceof Blockly.BlockSvg) block.setMutator(new Blockly.icons.MutatorIcon(paletteTypes, block));
}
