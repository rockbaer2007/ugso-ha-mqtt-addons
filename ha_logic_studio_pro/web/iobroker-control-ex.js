export function importExtendedUpdate(fields, connections) {
  if (fields.TYPE?.toLowerCase() !== 'true') return null;
  const expire = connections.find(node => node.localName === 'value' && node.getAttribute('name') === 'EXPIRE');
  if (expire) {
    const children = [...expire.children];
    const value = children.find(node => node.localName === 'block') ?? children.find(node => node.localName === 'shadow');
    const number = [...value?.children ?? []].find(node => node.localName === 'field' && node.getAttribute('name') === 'NUM');
    if (value && (value.getAttribute('type') !== 'math_number' || !number?.textContent.trim() || Number(number.textContent) !== 0)) return null;
  }
  return {type: 'iob_control_ex_update', fields: {MAPPING: '{}', CLEAR_RUNNING: fields.CLEAR_RUNNING?.toUpperCase() === 'TRUE' ? 'TRUE' : 'FALSE'}};
}

export function registerExtendedUpdate(Blockly, generator, order, language) {
  const labels = {
    de: ['Aktualisiere berechnete ioBroker-ID', 'auf Wert', 'Verzögerung (ms)', 'Vorherige Verzögerung für das Ziel abbrechen', 'ID-Zuordnung (JSON)', 'Berechnete ioBroker-IDs als JSON-Objekt HA-Helfern zuordnen.'],
    en: ['Update computed ioBroker ID', 'to value', 'Delay (ms)', 'Cancel previous delay for this target', 'ID mapping (JSON)', 'Map computed ioBroker IDs to HA helpers in a JSON object.'],
    fr: ['Actualiser un ID ioBroker calculé', 'avec la valeur', 'Délai (ms)', 'Annuler le délai précédent pour cette cible', 'Correspondance des ID (JSON)', 'Associez les ID ioBroker calculés à des assistants HA dans un objet JSON.'],
  };
  const captions = () => labels[language()] ?? labels.en;
  Blockly.Blocks.iob_control_ex_update = {
    init() {
      const [title, value, delay, clear, mapping] = captions();
      this.appendValueInput('OID').appendField(title);
      this.appendValueInput('VALUE').appendField(value);
      this.appendValueInput('DELAY_MS').appendField(delay);
      this.appendDummyInput().appendField(clear).appendField(new Blockly.FieldCheckbox('FALSE'), 'CLEAR_RUNNING');
      this.appendDummyInput().appendField(mapping).appendField(new Blockly.FieldTextInput('{}'), 'MAPPING');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(210);
    },
  };
  generator.forBlock.iob_control_ex_update = (block, code) => {
    const source = code.valueToCode(block, 'OID', order.NONE);
    const value = code.valueToCode(block, 'VALUE', order.NONE) || 'null';
    const delay = code.valueToCode(block, 'DELAY_MS', order.NONE) || '0';
    let mapping;
    try { mapping = JSON.parse(block.getFieldValue('MAPPING')); } catch {}
    const entries = mapping && typeof mapping === 'object' && !Array.isArray(mapping) ? Object.entries(mapping) : [];
    if (!source || !entries.length || entries.some(([id, target]) =>
      !id.trim() || typeof target !== 'string' || !/^input_(boolean|number|text)\.[a-z0-9_]+$/.test(target))) {
      throw new Error(captions()[5]);
    }
    const clear = block.getFieldValue('CLEAR_RUNNING') === 'TRUE';
    return `ha.importedControl(ha.importedTarget((${source}), ${JSON.stringify(entries)}), (${value}), false, parseInt(String((${delay}) || 0), 10), ${clear}, true);\n`;
  };
}
