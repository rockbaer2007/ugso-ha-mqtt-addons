export const helperDomains = ['input_boolean', 'input_number', 'input_text'];

export function helperSpec(block, fallbackName) {
  const connection = key => block.inputs?.[key]?.block ?? block.inputs?.[key]?.shadow;
  const value = connection('VALUE');
  const commonBlock = connection('COMMON');
  let common = {};
  if (commonBlock?.type === 'text') {
    try { common = JSON.parse(commonBlock.fields?.TEXT ?? ''); } catch { return; }
    if (!common || typeof common !== 'object' || Array.isArray(common)) return;
  } else if (commonBlock) return;

  let initial = common.def;
  if (value?.type === 'math_number') initial = Number(value.fields?.NUM ?? 0);
  else if (value?.type === 'logic_boolean') initial = value.fields?.BOOL === 'TRUE';
  else if (value?.type === 'text') initial = value.fields?.TEXT ?? '';
  else if (value) return;
  const type = block.extraState?.valueType || common.type ||
    (initial === undefined ? undefined : typeof initial);
  if (type === 'boolean' && (initial === undefined || typeof initial === 'boolean')) {
    return {domain: 'input_boolean', name: fallbackName, initial, config: {}};
  }
  if (type === 'string' && (initial === undefined || typeof initial === 'string' && initial.length <= 255)) {
    return {domain: 'input_text', name: fallbackName, initial, config: {min: 0, max: 255}};
  }
  if (type !== 'number' || (initial !== undefined && !Number.isFinite(initial))) return;
  const min = Number.isFinite(common.min) ? common.min : Math.min(-1e9, initial ?? 0);
  const max = Number.isFinite(common.max) ? common.max : Math.max(1e9, initial ?? 0);
  const step = Number.isFinite(common.step) && common.step >= 0.001 ? common.step :
    Number.isInteger(initial ?? 0) ? 1 : 0.001;
  if (min >= max || initial !== undefined && (initial < min || initial > max)) return;
  const config = {min, max, step, mode: 'box'};
  if (typeof common.unit === 'string' && common.unit.length <= 32) config.unit_of_measurement = common.unit;
  return {domain: 'input_number', name: fallbackName, initial, config};
}

export async function provisionHelper(callWS, spec) {
  const {domain, name, initial, config} = spec;
  if (!helperDomains.includes(domain)) throw new Error('Unsupported helper type');
  const created = await callWS({type: domain + '/create', name, ...config});
  if (typeof created?.id !== 'string' || !/^[a-z0-9_]+$/.test(created.id)) {
    throw new Error('Home Assistant returned no helper ID');
  }
  const entity = domain + '.' + created.id;
  if (initial === undefined) return {entity, initialized: true};

  try {
    await callWS({
      type: 'call_service', domain,
      service: domain === 'input_boolean' ? (initial ? 'turn_on' : 'turn_off') : 'set_value',
      target: {entity_id: entity},
      service_data: domain === 'input_boolean' ? {} : {value: initial},
    });
    return {entity, initialized: true};
  } catch {
    return {entity, initialized: false};
  }
}

export function registerCreateState(Blockly, generator, language, entityField, quoteField) {
  const labels = {
    de: ['Datenpunkt · HA-Helfer %1', 'Startwert beim Import', 'ioBroker-Metadaten', 'Nach der Zuordnung', 'HA-Helfer zuordnen'],
    en: ['Data point · HA helper %1', 'Initial value on import', 'ioBroker metadata', 'After mapping', 'Map an HA helper'],
    fr: ['Point de données · assistant HA %1', 'Valeur initiale à l’import', 'Métadonnées ioBroker', 'Après association', 'Associer un assistant HA'],
  };
  const label = () => labels[language()] ?? labels.en;
  Blockly.Blocks.iob_create_state = {
    init() {
      this.jsonInit({message0: label()[0], args0: [entityField('—')], colour: '#5a80a4'});
      this.appendDummyInput().appendField('ioBroker').appendField('', 'IOB_SOURCE');
      this.appendValueInput('VALUE').appendField(label()[1]);
      this.appendValueInput('COMMON').appendField(label()[2]);
      this.appendStatementInput('BODY').appendField(label()[3]);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    },
    saveExtraState() {
      return {source: this.ioBrokerSource, valueType: this.ioBrokerValueType};
    },
    loadExtraState(state) {
      this.ioBrokerSource = state.source;
      this.ioBrokerValueType = state.valueType;
      this.setFieldValue(state.source, 'IOB_SOURCE');
    },
  };
  generator.forBlock.iob_create_state = (block, code) => {
    const entity = block.getFieldValue('ENTITY');
    if (!helperDomains.includes(entity?.split('.')[0])) throw new Error(label()[4] + ' · ' + block.ioBrokerSource);
    const body = code.statementToCode(block, 'BODY');
    return `Promise.resolve().then(async () => {
  ha.readState(${quoteField(block, 'ENTITY')});
${body}});
`;
  };
}
