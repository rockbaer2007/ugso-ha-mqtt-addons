export function importCustomMessage(fields, mutation) {
  if (!mutation?.hasAttribute('items') || fields.WITH_STATEMENT?.toUpperCase() !== 'TRUE') return null;
  let names;
  try {
    names = mutation.getAttribute('items').split(',').map(name => decodeURIComponent(name));
  } catch {
    return null;
  }
  if (names.length > 32 || new Set(names).size !== names.length ||
      names.some(name => !name.trim() || /^(entity_id|device_id|area_id|floor_id|label_id|target|__proto__|constructor|prototype)$/.test(name))) return null;
  return {
    type: 'iob_sendto_custom',
    fields: {ACTION: ''},
    extraState: {names, originalAction: [fields.INSTANCE, fields.COMMAND].filter(Boolean).join(' · ')},
  };
}

export function isCustomMessageResult(element) {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    if (parent.localName !== 'statement') continue;
    const owner = parent.parentElement;
    const type = owner?.getAttribute('type');
    if (type?.startsWith('procedures_def') || /^(sendto_otherscript|http_get|http_post|request|file_read)$/.test(type)) return false;
    if (type === 'sendto_custom' && parent.getAttribute('name') === 'STATEMENT') {
      const children = [...owner.children];
      const checkbox = children.find(node => node.localName === 'field' && node.getAttribute('name') === 'WITH_STATEMENT');
      return Boolean(importCustomMessage({WITH_STATEMENT: checkbox?.textContent}, children.find(node => node.localName === 'mutation')));
    }
  }
  return false;
}

export function registerCustomMessage(Blockly, generator, order, language) {
  const labels = {
    de: ['Nachricht an HA-Skript', 'HA-Aktion', 'Antwortzweig', 'Antwortdaten', 'Eine script.*-Aktion mit Rückgabedaten zuordnen.'],
    en: ['Message to HA script', 'HA action', 'Response branch', 'Response data', 'Map a script.* action that returns data.'],
    fr: ['Message à un script HA', 'Action HA', 'Branche de réponse', 'Données de réponse', 'Associez une action script.* qui renvoie des données.'],
  };
  const captions = () => labels[language()] ?? labels.en;
  Blockly.Blocks.iob_sendto_custom = {
    init() {
      const [title, action, response] = captions();
      this.appendDummyInput().appendField(title).appendField(new Blockly.FieldLabelSerializable(''), 'SOURCE');
      this.appendDummyInput().appendField(action).appendField(new Blockly.FieldTextInput(''), 'ACTION');
      this.appendStatementInput('BODY').appendField(response);
      this.parameterNames = [];
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('#a25b7e');
    },
    saveExtraState() {
      return {names: this.parameterNames, originalAction: this.getFieldValue('SOURCE')};
    },
    loadExtraState(state) {
      this.parameterNames = state.names ?? [];
      this.setFieldValue(state.originalAction ?? '', 'SOURCE');
      this.parameterNames.forEach((name, index) => {
        this.appendValueInput('ARG' + index).appendField(name);
        this.moveInputBefore('ARG' + index, 'BODY');
      });
    },
  };
  Blockly.Blocks.iob_sendto_custom_result = {
    init() {
      this.appendDummyInput().appendField(captions()[3]);
      this.setOutput(true);
      this.setColour('#a25b7e');
    },
  };
  generator.addReservedWords('ugsoCustomResult');
  generator.forBlock.iob_sendto_custom = (block, code) => {
    const action = block.getFieldValue('ACTION').trim();
    if (!/^script\.[a-z0-9_]+$/.test(action)) throw new Error(captions()[4]);
    const args = block.parameterNames.map((name, index) =>
      `[${JSON.stringify(name)}]: ${code.valueToCode(block, 'ARG' + index, order.ASSIGNMENT) || 'null'}`);
    return `ha.importedScriptResponse(${JSON.stringify(action)}, {${args.join(', ')}}, async (ugsoCustomResult) => {\n${code.statementToCode(block, 'BODY')}});\n`;
  };
  generator.forBlock.iob_sendto_custom_result = block => {
    let parent = block.getSurroundParent();
    while (parent && parent.type !== 'iob_sendto_custom' && !parent.type.startsWith('procedures_def')) parent = parent.getSurroundParent();
    if (parent?.type !== 'iob_sendto_custom') throw new Error(captions()[2]);
    return ['ugsoCustomResult', order.ATOMIC];
  };
}
