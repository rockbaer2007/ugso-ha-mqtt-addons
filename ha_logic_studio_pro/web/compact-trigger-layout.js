// Keep field names, generators and mutations; only split the existing visual rows.
export const compactTriggerTypes = ['ha_js_on_states', 'ha_js_on_state', 'ha_js_on_attribute'];
export function compactTriggerCaption(text) {
  return text.length <= 50 ? text : text.slice(0, 44) + '… ▾';
}
export function compactTriggerDefinition(type, definition) {
  if (!compactTriggerTypes.includes(type) || !definition.args0 || definition.args0.some(arg => arg.name === 'TRIGGER_TITLE_ROW')) return definition;
  const row = name => ({type: 'input_dummy', name});
  const args = definition.args0;
  if (type === 'ha_js_on_attribute') {
    if (args.length !== 3 || args[0].name !== 'ATTRIBUTE' || args[1].name !== 'ENTITY') throw Error('Unexpected attribute trigger layout');
    const labels = definition.message0.startsWith('Falls') ? ['Falls Attribut', 'von Entität', 'geändert wurde'] :
      definition.message0.startsWith('If') ? ['If attribute', 'of entity', 'changed'] : ['Si l’attribut', 'de l’entité', 'change'];
    return {...definition, inputsInline: false,
      message0: `${labels[0]} %1 %2 %3 ${labels[1]} %4 %5 ${labels[2]} %6`,
      args0: [row('TRIGGER_TITLE_ROW'), args[0], row('TRIGGER_ATTRIBUTE_ROW'), args[1], row('TRIGGER_ENTITY_ROW'), args[2]]};
  }
  if (args.length !== 3 || !['ENTITY', 'ENTITIES'].includes(args[0].name)) throw Error('Unexpected state trigger layout');
  const heading = definition.message0.slice(0, definition.message0.indexOf('%1')).trim();
  return {...definition, inputsInline: false, message0: `${heading} %1 %2 %3 %4 %5`,
    args0: [row('TRIGGER_TITLE_ROW'), args[0], row('TRIGGER_ENTITY_ROW'), args[1], args[2]]};
}
export function registerCompactTriggerLayouts(Blockly) {
  for (const type of compactTriggerTypes) {
    const block = Blockly.Blocks[type];
    if (!block || block.compactTriggerLayout_) continue;
    const original = block.init;
    block.init = function () {
      const jsonInit = this.jsonInit;
      this.jsonInit = function (definition) { return jsonInit.call(this, compactTriggerDefinition(type, definition)); };
      try {
        const result = original.call(this);
        const field = this.getField(type === 'ha_js_on_states' ? 'ENTITIES' : 'ENTITY');
        const getText = field.getText;
        field.getText = function () { return compactTriggerCaption(getText.call(this)); };
        return result;
      }
      finally { this.jsonInit = jsonInit; }
    };
    block.compactTriggerLayout_ = true;
  }
}
