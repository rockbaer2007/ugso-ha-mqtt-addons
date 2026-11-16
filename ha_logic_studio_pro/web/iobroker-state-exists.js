export function registerDynamicStateExists(Blockly, generator, order, language) {
  const labels = {
    de: ['Existiert Zustand mit berechneter ioBroker-ID?', 'ID-Zuordnung (JSON)', 'Berechnete ioBroker-IDs als JSON-Objekt ausdrücklich HA-Entitäten zuordnen.'],
    en: ['Does the state with this computed ioBroker ID exist?', 'ID mapping (JSON)', 'Explicitly map computed ioBroker IDs to HA entities in a JSON object.'],
    fr: ['L’état de cet ID ioBroker calculé existe-t-il ?', 'Correspondance des ID (JSON)', 'Associez explicitement les ID ioBroker calculés à des entités HA dans un objet JSON.'],
  };
  const captions = () => labels[language()] ?? labels.en;
  Blockly.Blocks.iob_exists_dynamic = {
    init() {
      const [title, mapping] = captions();
      this.appendValueInput('OID').appendField(title);
      this.appendDummyInput().appendField(mapping).appendField(new Blockly.FieldTextInput('{}'), 'MAPPING');
      this.setOutput(true, 'Boolean');
      this.setColour(210);
    },
  };
  generator.forBlock.iob_exists_dynamic = (block, code) => {
    const source = code.valueToCode(block, 'OID', order.NONE);
    let mapping;
    try { mapping = JSON.parse(block.getFieldValue('MAPPING')); } catch {}
    const entries = mapping && typeof mapping === 'object' && !Array.isArray(mapping) ? Object.entries(mapping) : null;
    if (!source || !entries || entries.some(([id, target]) =>
      !id.trim() || typeof target !== 'string' || !/^[a-z0-9_]+\.[a-z0-9_]+$/.test(target))) {
      throw new Error(captions()[2]);
    }
    return [`ha.getState(ha.importedTarget((${source}), ${JSON.stringify(entries)})) !== null`, order.EQUALITY];
  };
}
