export const stateBranchType = 'ha_js_state_branches';
export function branchValue(text, kind) {
  if (kind === 'number') {
    if (!String(text).trim() || !Number.isFinite(Number(text))) throw Error('Ungültiger Zahlenwert / Invalid number / Nombre invalide');
    return Number(text);
  }
  if (typeof text !== 'string' || text.length > 255) throw Error('Invalid state text');
  return text;
}
export function registerStateBranches(B, generator, language, entityField, jsTypes, catalog, known) {
  const tr = (de, en, fr) => ({de, en, fr})[language()] ?? en;
  const container = 'ugso_state_branch_container', item = 'ugso_state_branch_item', other = 'ugso_state_branch_else';
  B.Blocks[container] = {init() {
    this.appendDummyInput().appendField(tr('Zustandszweige', 'State branches', 'Branches d’état'));
    this.appendStatementInput('STACK').setCheck('StateBranch');
    this.setColour('#a25b7e'); this.contextMenu = false;
  }};
  for (const [type, fallback] of [[item, false], [other, true]]) B.Blocks[type] = {init() {
    this.appendDummyInput().appendField(fallback ? tr('sonst', 'else', 'sinon') : tr('weiterer Zustand', 'another state', 'autre état'));
    this.setPreviousStatement(true, 'StateBranch'); this.setNextStatement(true, 'StateBranch');
    this.setColour('#a25b7e'); this.contextMenu = false;
  }};
  B.Extensions.registerMutator('ugso_state_branches_mutator', {
    branchCount_: 2, hasElse_: false,
    saveExtraState() { return {count: this.branchCount_, hasElse: this.hasElse_}; },
    loadExtraState(state) {
      if (!Number.isInteger(state.count) || state.count < 1 || state.count > 20 || typeof state.hasElse !== 'boolean') throw Error('Invalid state branches');
      this.branchCount_ = state.count; this.hasElse_ = state.hasElse; this.updateBranches_();
    },
    updateBranches_() {
      for (let i = 0; i < this.branchCount_; i++) if (!this.getInput('DO' + i)) {
        this.appendStatementInput('DO' + i).appendField(tr('bei', 'when', 'si'))
          .appendField(new B.FieldDropdown([[tr('Text', 'Text', 'Texte'), 'text'], [tr('Zahl', 'Number', 'Nombre'), 'number']]), 'TYPE' + i)
          .appendField(new B.FieldTextInput(i === 0 ? 'on' : i === 1 ? 'off' : 'state' + (i + 1)), 'CASE' + i);
      }
      for (let i = this.branchCount_; this.getInput('DO' + i); i++) this.removeInput('DO' + i);
      if (this.hasElse_ && !this.getInput('ELSE')) this.appendStatementInput('ELSE').appendField(tr('sonst', 'else', 'sinon'));
      if (!this.hasElse_ && this.getInput('ELSE')) this.removeInput('ELSE');
      if (this.hasElse_) this.moveInputBefore('ELSE', null);
    },
    decompose(workspace) {
      const root = workspace.newBlock(container); root.initSvg();
      let connection = root.getInput('STACK').connection;
      for (let i = 0; i < this.branchCount_ + Number(this.hasElse_); i++) {
        const part = workspace.newBlock(i < this.branchCount_ ? item : other); part.initSvg();
        connection.connect(part.previousConnection); connection = part.nextConnection;
      }
      return root;
    },
    saveConnections(root) {
      let i = 0;
      for (let part = root.getInputTargetBlock('STACK'); part; part = part.getNextBlock()) {
        if (part.isInsertionMarker()) continue;
        part.savedBranch_ = part.type === other ? {fallback: true, connection: this.getInput('ELSE')?.connection.targetConnection} :
          {value: this.getFieldValue('CASE' + i), kind: this.getFieldValue('TYPE' + i), connection: this.getInput('DO' + i++)?.connection.targetConnection};
      }
    },
    compose(root) {
      const rows = []; let fallback;
      for (let part = root.getInputTargetBlock('STACK'); part; part = part.getNextBlock()) {
        if (part.isInsertionMarker()) continue;
        if (part.type === other) { if (fallback) return; fallback = part.savedBranch_ ?? {fallback: true}; }
        else rows.push(part.savedBranch_ ?? {});
      }
      if (!rows.length || rows.length > 20) return;
      for (let i = 0; i < this.branchCount_; i++) this.getInput('DO' + i).connection.targetConnection?.disconnect();
      this.getInput('ELSE')?.connection.targetConnection?.disconnect();
      this.branchCount_ = rows.length; this.hasElse_ = Boolean(fallback); this.updateBranches_();
      rows.forEach((row, i) => {
        this.setFieldValue(row.value ?? 'state' + (i + 1), 'CASE' + i);
        this.setFieldValue(row.kind ?? 'text', 'TYPE' + i);
        row.connection?.reconnect(this, 'DO' + i);
      });
      fallback?.connection?.reconnect(this, 'ELSE');
    },
  }, undefined, [item, other]);
  B.Blocks[stateBranchType] = {init() {
    this.jsonInit({message0: tr('Wenn Entität ihren Wert ändert %1 %2', 'When entity value changes %1 %2', 'Si la valeur de l’entité change %1 %2'),
      args0: [{type: 'input_dummy', name: 'HEADER_ROW'}, entityField('switch.demo')], colour: '#a25b7e', inputsInline: false,
      mutator: 'ugso_state_branches_mutator'});
    const attributeField = B.fieldRegistry.fromJson(entityField('current_position'));
    attributeField.choiceSpec_ = {kind: 'attribute'};
    this.appendDummyInput('MODE_ROW').appendField(new B.FieldDropdown([
      [tr('Zustand', 'State', 'État'), 'state'], [tr('Attribut', 'Attribute', 'Attribut'), 'attribute']], value => {
        this.getField('ATTRIBUTE')?.setVisible(value === 'attribute'); return value;
      }), 'MODE').appendField(attributeField, 'ATTRIBUTE');
    this.getField('ATTRIBUTE').setVisible(false);
    this.updateBranches_();
  }};
  generator.forBlock[stateBranchType] = (block, code) => {
    const entity = block.getFieldValue('ENTITY'), mode = block.getFieldValue('MODE'), attribute = block.getFieldValue('ATTRIBUTE');
    if (!/^[a-z][a-z0-9_]*\.[a-z0-9_]+$/.test(entity)) throw Error('Invalid entity ID');
    if (!['state', 'attribute'].includes(mode) || mode === 'attribute' && (!attribute || attribute.length > 128)) throw Error('Invalid attribute');
    const seen = new Set(), branches = [];
    for (let i = 0; i < block.branchCount_; i++) {
      const kind = block.getFieldValue('TYPE' + i), value = branchValue(block.getFieldValue('CASE' + i), kind);
      // Numeric 50 and text "50" would both match an HA state: do not allow ambiguity.
      const key = String(value);
      if (seen.has(key)) throw Error(tr('Doppelter Zustandswert: ', 'Duplicate state value: ', 'Valeur d’état en double : ') + key);
      seen.add(key);
      const match = kind === 'number' ? `((typeof value === "number" || typeof value === "string" && value.trim() !== "") && Number(value) === ${value})` : `value === ${JSON.stringify(value)}`;
      branches.push(`${i ? 'else ' : ''}if (${match}) {\n${code.statementToCode(block, 'DO' + i)}}`);
    }
    if (block.hasElse_) branches.push(`else {\n${code.statementToCode(block, 'ELSE')}}`);
    const read = mode === 'state' ? 'ugsoTriggerEvent.current?.state' : `ugsoTriggerEvent.current?.attributes?.[${JSON.stringify(attribute)}]`;
    const subscription = mode === 'state' ? `ha.onState(${JSON.stringify(entity)},` : `ha.onAttribute(${JSON.stringify(entity)}, ${JSON.stringify(attribute)},`;
    return `${subscription} async (ugsoTriggerEvent) => {\nconst value = ${read};\n${branches.join(' ')}\n});\n`;
  };
  jsTypes.push(stateBranchType); catalog.add(stateBranchType); known.add(stateBranchType);
}
export function addStateBranchToolbox(toolbox, mode) {
  if (mode !== 'js') return;
  const trigger = toolbox.contents?.find(category => category.contents?.some(item => item.type === 'ha_js_on_state'));
  if (trigger && !trigger.contents.some(item => item.type === stateBranchType)) trigger.contents.unshift({kind: 'block', type: stateBranchType});
}
export function extendBooleanStates(B, generator, language) {
  const original = B.Blocks.logic_boolean.init;
  B.Blocks.logic_boolean.init = function () {
    original.call(this);
    // Blocks A retains its native boolean/template semantics.
    if (!this.workspace.ugsoJs) return;
    this.getField('BOOL').setOptions([
      [({de: 'wahr', en: 'true', fr: 'vrai'})[language()] ?? 'true', 'TRUE'],
      [({de: 'falsch', en: 'false', fr: 'faux'})[language()] ?? 'false', 'FALSE'], ['on', 'ON'], ['off', 'OFF']]);
    this.getField('BOOL').setValidator(value => {
      this.setOutput(true, ['ON', 'OFF'].includes(value) ? 'String' : 'Boolean'); return value;
    });
  };
  generator.forBlock.logic_boolean = block => {
    const value = block.getFieldValue('BOOL');
    return [value === 'ON' ? '"on"' : value === 'OFF' ? '"off"' : value === 'TRUE' ? 'true' : 'false', 0];
  };
}
