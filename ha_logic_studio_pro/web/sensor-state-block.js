const text = {
  de: ['Sensorzustand setzen %1 auf %2', 'Vorhandenen Sensorzustand setzen; Attribute bleiben erhalten. WRITE-Freigabe nötig. Blocks A benötigt die laufende Studio-App. Eine Integration kann den Wert überschreiben.'],
  en: ['Set sensor state %1 to %2', 'Set an existing sensor state, retaining attributes. Requires WRITE permission. Blocks A requires the running Studio app. An integration may overwrite the value.'],
  fr: ['Définir l’état du capteur %1 à %2', 'Définir l’état d’un capteur existant en conservant ses attributs. Autorisation WRITE requise. Blocks A nécessite l’application Studio active. Une intégration peut remplacer la valeur.'],
};
export const yamlSensorBlock = 'ugso_sensor_state';
export const jsSensorBlock = 'ha_js_sensor_state';

function sensorId(block) {
  const entity = block.getFieldValue('ENTITY');
  if (!/^sensor\.[a-z0-9_]+$/.test(entity ?? '')) throw new Error('sensor.name erwartet / Expected sensor.name / sensor.name attendu');
  return entity;
}

export function sensorStateYaml(block, readValue) {
  if (!block.getInputTargetBlock('VALUE')) throw new Error('Sensorzustand fehlt / Missing sensor state / État du capteur manquant');
  return {event: 'logic_studio_set_sensor_state', event_data: {entity_id: sensorId(block), state: readValue(block, 'VALUE')}};
}

export function registerSensorStateBlocks(Blockly, generator, language, entityField, jsTypes, catalogTypes, knownTypes) {
  for (const [type, js] of [[jsSensorBlock, true], [yamlSensorBlock, false]]) {
    Blockly.Blocks[type] = {init() {
      const [message, tooltip] = text[language()] ?? text.en;
      this.jsonInit({message0: message, tooltip, colour: '#5a80a4', inputsInline: true,
        args0: [entityField('sensor.demo_temperature'), {type: 'input_value', name: 'VALUE'}],
        previousStatement: js ? null : 'Action', nextStatement: js ? null : 'Action'});
      this.getField('ENTITY').choiceSpec_ = {kind: 'entity_id', domains: ['sensor']};
    }};
  }
  generator.forBlock[jsSensorBlock] = (block, code) => {
    const value = code.valueToCode(block, 'VALUE', 99);
    if (!value) throw new Error('Sensorzustand fehlt / Missing sensor state / État du capteur manquant');
    return 'ha.setSensorState(' + JSON.stringify(sensorId(block)) + ', ' + value + ');\n';
  };
  jsTypes.push(jsSensorBlock);
  catalogTypes.add(yamlSensorBlock);
  knownTypes.add(yamlSensorBlock);
}

export function addSensorStateToolbox(categories, target) {
  const js = target === 'js';
  const category = categories.contents.find(item => item.contents?.some(block =>
    ['ugso_automation', 'ha_js_script_name', 'ha_js_set_state'].includes(block.type))) ??
    categories.contents.find(item => item.kind === 'category' && Array.isArray(item.contents));
  category.contents.push({kind: 'block', type: js ? jsSensorBlock : yamlSensorBlock,
    inputs: {VALUE: {shadow: {type: js ? 'math_number' : 'ugso_number', fields: {NUM: 0}}}}});
}
