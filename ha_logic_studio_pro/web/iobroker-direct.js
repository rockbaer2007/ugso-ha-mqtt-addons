import {helperDomains} from './iobroker-create-state.js';

export function importDirect(fields, connections) {
  const sources = ['OID_SRC', 'OID_DST'].map(name => {
    const input = connections.find(node => node.localName === 'value' && node.getAttribute('name') === name);
    const children = [...input?.children ?? []];
    const value = children.find(node => node.localName === 'block') ?? children.find(node => node.localName === 'shadow');
    const field = {field_oid: 'oid', text: 'TEXT'}[value?.getAttribute('type')];
    if (!field) return '';
    return [...value.children].find(node => node.localName === 'field' && node.getAttribute('name') === field)
      ?.textContent.trim() ?? '';
  });
  if (!sources.every(id => /^[\w-]+(?:\.[\w-]+)+$/u.test(id))) return null;
  return {
    type: 'iob_direct',
    fields: {ONLY_CHANGES: fields.ONLY_CHANGES?.toUpperCase() === 'FALSE' ? 'FALSE' : 'TRUE'},
    extraState: {sources},
  };
}

export function registerDirect(Blockly, generator, language, entityField, quoteField) {
  const labels = {
    de: ['Datenpunkte direkt verknüpfen', 'Quelle', 'Ziel', 'nur bei Änderung', 'Quelle und Ziel ausdrücklich zuordnen', 'Das Ziel muss ein anderer HA-Helfer sein.'],
    en: ['Link data points directly', 'Source', 'Target', 'only on change', 'Map the source and target explicitly', 'The target must be a different HA helper.'],
    fr: ['Relier directement des points de données', 'Source', 'Cible', 'uniquement en cas de changement', 'Associe explicitement la source et la cible', 'La cible doit être un autre assistant HA.'],
  };
  const captions = () => labels[language()] ?? labels.en;
  Blockly.Blocks.iob_direct = {
    init() {
      const [title, source, target, onlyChanges] = captions();
      this.appendDummyInput().appendField(title);
      for (const [index, caption] of [source, target].entries()) {
        this.appendDummyInput().appendField(caption)
          .appendField(new Blockly.FieldLabelSerializable(''), 'SOURCE' + index)
          .appendField(Blockly.fieldRegistry.fromJson(entityField('—')), 'TARGET' + index);
      }
      this.appendDummyInput().appendField(onlyChanges).appendField(new Blockly.FieldCheckbox('TRUE'), 'ONLY_CHANGES');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('#a25b7e');
    },
    saveExtraState() {
      return {sources: this.ioBrokerSources};
    },
    loadExtraState(state) {
      this.ioBrokerSources = Array.isArray(state.sources) ? state.sources.slice(0, 2) : [];
      this.ioBrokerSources.forEach((id, index) => this.setFieldValue(id, 'SOURCE' + index));
    },
  };
  generator.forBlock.iob_direct = block => {
    const source = block.getFieldValue('TARGET0');
    const target = block.getFieldValue('TARGET1');
    if (!source || !target || source === '—' || target === '—') throw new Error(captions()[4]);
    const targetDomain = target.split('.')[0];
    if (source === target || !helperDomains.includes(targetDomain)) throw new Error(captions()[5]);
    const condition = block.getFieldValue('ONLY_CHANGES') === 'TRUE' ? 'ne' : 'any';
    const value = targetDomain === 'input_text' ? 'event.current.state' : 'ha.importedEventValue(event, "current")';
    return `ha.onImportedState(${quoteField(block, 'TARGET0')}, "${condition}", event => {
  if (event.current.state === "unknown" || event.current.state === "unavailable") return;
  ha.importedControl(${quoteField(block, 'TARGET1')}, ${value}, false, 0, false, true);
});
`;
  };
}
