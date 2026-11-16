const conditions = new Set(['ne', 'true', 'false', 'gt', 'lt']);

export function importCategoryTrigger(fields) {
  const source = fields.OID?.trim();
  const condition = fields.CONDITION ?? 'ne';
  if (!source?.startsWith('enum.') || fields.ACK_CONDITION || !conditions.has(condition)) return null;
  return {type: 'iob_category_trigger', fields: {CONDITION: condition}, extraState: {category: source}};
}

export function categoryEntities(values) {
  return Array.isArray(values)
    ? [...new Set(values.filter(value => typeof value === 'string' && /^[a-z][a-z0-9_]*\.[a-z0-9_]+$/.test(value)))]
    : [];
}

export function registerCategoryTrigger(Blockly, generator, language) {
  const labels = {
    de: ['Falls Objekt in Kategorie', 'HA-Bereich oder Label zuordnen', 'wurde geändert', 'ist wahr', 'ist falsch', 'ist gestiegen', 'ist gefallen'],
    en: ['When an object in a category', 'Map to an HA area or label', 'changed', 'is true', 'is false', 'increased', 'decreased'],
    fr: ['Lorsqu’un objet de la catégorie', 'Associer une zone ou une étiquette HA', 'a changé', 'est vrai', 'est faux', 'a augmenté', 'a diminué'],
  };
  const captions = () => labels[language()] ?? labels.en;
  Blockly.Blocks.iob_category_trigger = {
    init() {
      const [title, , ...names] = captions();
      this.appendDummyInput().appendField(title);
      this.appendDummyInput().appendField(new Blockly.FieldLabelSerializable(''), 'CATEGORY');
      this.appendDummyInput().appendField(new Blockly.FieldDropdown([...conditions].map((value, index) => [names[index], value])), 'CONDITION');
      this.appendStatementInput('BODY');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('#a25b7e');
    },
    saveExtraState() {
      return {category: this.sourceCategory, target: this.targetCategory};
    },
    loadExtraState(state) {
      this.sourceCategory = state.category;
      this.targetCategory = state.target;
      const target = state.target?.name || captions()[1];
      this.setFieldValue(`${state.category} → ${target}`, 'CATEGORY');
    },
  };
  generator.forBlock.iob_category_trigger = (block, code) => {
    const members = categoryEntities(block.targetCategory?.entities);
    if (!members.length) throw new Error(captions()[1] + ' · ' + block.sourceCategory);
    const condition = JSON.stringify(block.getFieldValue('CONDITION'));
    const body = code.statementToCode(block, 'BODY');
    return `for (const entityId of ${JSON.stringify(members)}) {
  ha.onImportedState(entityId, ${condition}, async (ugsoTriggerEvent) => {
${body}  });
}
`;
  };
}
