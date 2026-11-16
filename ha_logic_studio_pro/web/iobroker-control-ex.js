export function importExtendedControl(fields, connections) {
  const mode = fields.TYPE?.toLowerCase();
  if (mode !== 'true' && mode !== 'false') return null;
  const expire = connections.find(node => node.localName === 'value' && node.getAttribute('name') === 'EXPIRE');
  if (expire) {
    const children = [...expire.children];
    const value = children.find(node => node.localName === 'block') ?? children.find(node => node.localName === 'shadow');
    const number = [...value?.children ?? []].find(node => node.localName === 'field' && node.getAttribute('name') === 'NUM');
    if (value && (value.getAttribute('type') !== 'math_number' || !number?.textContent.trim() || Number(number.textContent) !== 0)) return null;
  }
  return {type: mode === 'true' ? 'iob_control_ex_update' : 'iob_control_ex_control',
    fields: {MAPPING: '{}', CLEAR_RUNNING: fields.CLEAR_RUNNING?.toUpperCase() === 'TRUE' ? 'TRUE' : 'FALSE'}};
}

export function registerExtendedControl(Blockly, generator, order, language) {
  const labels = {
    de: ['Aktualisiere berechnete ioBroker-ID', 'auf Wert', 'Verzögerung (ms)', 'Vorherige Verzögerung für das Ziel abbrechen', 'ID-Zuordnung (JSON)', 'Berechnete ioBroker-IDs als JSON-Objekt HA-Helfern zuordnen.'],
    en: ['Update computed ioBroker ID', 'to value', 'Delay (ms)', 'Cancel previous delay for this target', 'ID mapping (JSON)', 'Map computed ioBroker IDs to HA helpers in a JSON object.'],
    fr: ['Actualiser un ID ioBroker calculé', 'avec la valeur', 'Délai (ms)', 'Annuler le délai précédent pour cette cible', 'Correspondance des ID (JSON)', 'Associez les ID ioBroker calculés à des assistants HA dans un objet JSON.'],
  };
  const captions = () => labels[language()] ?? labels.en;
  const controlLabels = {
    de: ['Steuere berechnete ioBroker-ID', 'Berechnete ioBroker-IDs als JSON-Objekt schaltbaren HA-Entitäten zuordnen.'],
    en: ['Control computed ioBroker ID', 'Map computed ioBroker IDs to switchable HA entities in a JSON object.'],
    fr: ['Commander un ID ioBroker calculé', 'Associez les ID ioBroker calculés à des entités HA commutables dans un objet JSON.'],
  };
  const controlCaptions = () => controlLabels[language()] ?? controlLabels.en;
  for (const [type, update, domain] of [
    ['iob_control_ex_update', true, /^input_(boolean|number|text)\.[a-z0-9_]+$/],
    ['iob_control_ex_control', false, /^(light|switch|input_boolean|fan)\.[a-z0-9_]+$/],
  ]) {
    Blockly.Blocks[type] = {
      init() {
        const [title, value, delay, clear, mapping] = captions();
        this.appendValueInput('OID').appendField(update ? title : controlCaptions()[0]);
        this.appendValueInput('VALUE').appendField(value);
        this.appendValueInput('DELAY_MS').appendField(delay);
        this.appendDummyInput().appendField(clear).appendField(new Blockly.FieldCheckbox('FALSE'), 'CLEAR_RUNNING');
        this.appendDummyInput().appendField(mapping).appendField(new Blockly.FieldTextInput('{}'), 'MAPPING');
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(210);
      },
    };
    generator.forBlock[type] = (block, code) => {
      const source = code.valueToCode(block, 'OID', order.NONE);
      const value = code.valueToCode(block, 'VALUE', order.NONE) || 'null';
      const delay = code.valueToCode(block, 'DELAY_MS', order.NONE) || '0';
      let mapping;
      try { mapping = JSON.parse(block.getFieldValue('MAPPING')); } catch {}
      const entries = mapping && typeof mapping === 'object' && !Array.isArray(mapping) ? Object.entries(mapping) : [];
      if (!source || !entries.length || entries.some(([id, target]) =>
        !id.trim() || typeof target !== 'string' || !domain.test(target))) {
        throw new Error(update ? captions()[5] : controlCaptions()[1]);
      }
      const clear = block.getFieldValue('CLEAR_RUNNING') === 'TRUE';
      return `ha.importedControl(ha.importedTarget((${source}), ${JSON.stringify(entries)}), (${value}), false, parseInt(String((${delay}) || 0), 10), ${clear}, ${update});\n`;
    };
  }
}
