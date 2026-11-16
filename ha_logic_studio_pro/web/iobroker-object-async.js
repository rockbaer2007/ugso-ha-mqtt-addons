export function isAsyncObjectResult(element) {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    if (parent.localName !== 'statement') continue;
    const type = parent.parentElement?.getAttribute('type');
    if (type === 'get_object_async' && parent.getAttribute('name') === 'STATEMENT') return true;
    if (type?.startsWith('procedures_def')) return false;
  }
  return false;
}

export function registerAsyncObject(Blockly, generator, order, language, entityField, quoteField) {
  const labels = {
    de: ['Objekt asynchron lesen %1', 'Antwortobjekt', 'HA-Entität zuordnen', 'Antwortobjekt gehört in den Antwortzweig.'],
    en: ['Read object asynchronously %1', 'Response object', 'Map an HA entity', 'The response object requires an async object block.'],
    fr: ['Lire un objet de manière asynchrone %1', 'Objet de réponse', 'Associer une entité HA', 'L’objet de réponse nécessite un bloc de lecture asynchrone.'],
  };
  const caption = () => labels[language()] ?? labels.en;
  Blockly.Blocks.iob_get_object_async = {
    init() {
      this.jsonInit({message0: caption()[0], args0: [entityField('—')], colour: '#a6915f'});
      this.appendDummyInput().appendField('ioBroker').appendField('', 'IOB_SOURCE');
      this.appendStatementInput('BODY');
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
  Blockly.Blocks.iob_get_object_async_data = {
    init() {
      this.appendDummyInput().appendField(caption()[1]);
      this.setOutput(true);
      this.setColour('#a6915f');
    },
  };
  generator.addReservedWords('ugsoObjectSnapshot,ugsoAsyncObject');
  generator.forBlock.iob_get_object_async = (block, code) => {
    const entity = block.getFieldValue('ENTITY');
    if (!entity || entity === '—') throw new Error(caption()[2] + ' · ' + block.ioBrokerSource);
    const body = code.statementToCode(block, 'BODY');
    return `Promise.resolve(JSON.parse(ha.stateSnapshot(${quoteField(block, 'ENTITY')}))).then(async (ugsoObjectSnapshot) => {
  const ugsoAsyncObject = ugsoObjectSnapshot === null ? null : {
    common: {
      name: ugsoObjectSnapshot.attributes?.friendly_name ?? null,
      unit: ugsoObjectSnapshot.attributes?.unit_of_measurement ?? null,
    },
  };
${body}});
`;
  };
  generator.forBlock.iob_get_object_async_data = block => {
    let owner = block.getSurroundParent();
    while (owner && owner.type !== 'iob_get_object_async' && !owner.type.startsWith('procedures_def')) {
      owner = owner.getSurroundParent();
    }
    if (owner?.type !== 'iob_get_object_async') throw new Error(caption()[3]);
    return ['ugsoAsyncObject', order.ATOMIC];
  };
}
