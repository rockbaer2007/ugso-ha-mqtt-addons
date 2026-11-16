const fields = {
  val: ['Wert', 'Value', 'Valeur'],
  ts: ['Letzte Aktualisierung', 'Last updated', 'Dernière mise à jour'],
  lc: ['Letzte Änderung', 'Last changed', 'Dernière modification'],
  'common.name': ['Anzeigename', 'Display name', 'Nom affiché'],
  'common.unit': ['Einheit', 'Unit', 'Unité'],
};

export function isSupportedAsyncValueField(field) {
  return Object.hasOwn(fields, field);
}

export function isAsyncValueResult(element) {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    if (parent.localName !== 'statement') continue;
    const block = parent.parentElement;
    const type = block?.getAttribute('type');
    if (type?.startsWith('procedures_def')) return false;
    if (type !== 'get_value_async' || parent.getAttribute('name') !== 'STATEMENT') continue;
    const field = [...block.children].find(child => child.localName === 'field' && child.getAttribute('name') === 'ATTR');
    return isSupportedAsyncValueField(field?.textContent || 'val');
  }
  return false;
}

export function registerAsyncValue(Blockly, generator, order, language, entityField, quoteField) {
  const labels = {
    de: ['Wert asynchron lesen %1 aus %2', 'Gelesener Wert', 'Antwortzweig', 'HA-Entität zuordnen', 'Gelesener Wert gehört in den Antwortzweig.'],
    en: ['Read %1 asynchronously from %2', 'Read value', 'Response branch', 'Map an HA entity', 'The read value requires an async value block.'],
    fr: ['Lire %1 de manière asynchrone depuis %2', 'Valeur lue', 'Branche de réponse', 'Associer une entité HA', 'La valeur lue nécessite un bloc de lecture asynchrone.'],
  };
  const caption = () => labels[language()] ?? labels.en;
  Blockly.Blocks.iob_get_value_async = {
    init() {
      const localeIndex = {de: 0, en: 1, fr: 2}[language()] ?? 1;
      this.jsonInit({
        message0: caption()[0], colour: '#5a80a4',
        args0: [{type: 'field_dropdown', name: 'ATTR', options: Object.entries(fields).map(([id, titles]) => [titles[localeIndex], id])}, entityField('—')],
      });
      this.appendDummyInput().appendField('ioBroker').appendField('', 'IOB_SOURCE');
      this.appendStatementInput('BODY').appendField(caption()[2]);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    },
    saveExtraState() {
      return {source: this.ioBrokerSource};
    },
    loadExtraState(state) {
      this.ioBrokerSource = state.source;
      this.setFieldValue(state.source, 'IOB_SOURCE');
    },
  };
  Blockly.Blocks.iob_get_value_async_data = {
    init() {
      this.appendDummyInput().appendField(caption()[1]);
      this.setOutput(true);
      this.setColour('#5a80a4');
    },
  };
  generator.addReservedWords('ugsoAsyncValue');
  generator.forBlock.iob_get_value_async = (block, code) => {
    const entity = block.getFieldValue('ENTITY');
    if (!entity || entity === '—') throw new Error(caption()[3] + ' · ' + block.ioBrokerSource);
    const body = code.statementToCode(block, 'BODY');
    return `Promise.resolve(ha.importedStateValue(${quoteField(block, 'ENTITY')}, ${JSON.stringify(block.getFieldValue('ATTR'))})).then(async (ugsoAsyncValue) => {
${body}});
`;
  };
  generator.forBlock.iob_get_value_async_data = block => {
    let owner = block.getSurroundParent();
    while (owner && owner.type !== 'iob_get_value_async' && !owner.type.startsWith('procedures_def')) {
      owner = owner.getSurroundParent();
    }
    if (owner?.type !== 'iob_get_value_async') throw new Error(caption()[4]);
    return ['ugsoAsyncValue', order.ATOMIC];
  };
}
