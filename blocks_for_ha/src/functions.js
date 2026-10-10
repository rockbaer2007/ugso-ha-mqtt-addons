// Original Blockly procedure editor; pure HA expressions are expanded at export.
export const functionTypes = ['procedures_defreturn', 'procedures_callreturn', 'variables_get'];
const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/;
export function installFunctions(Blockly) {
  const callInit = Blockly.Blocks.procedures_callreturn.init;
  Blockly.Blocks.procedures_callreturn.init = function () { callInit.call(this); this.setOutput(true, ['String', 'Boolean', 'RuntimeNumber', 'Value']); };
  const getInit = Blockly.Blocks.variables_get.init;
  Blockly.Blocks.variables_get.init = function () { getInit.call(this); this.setOutput(true, ['String', 'Value']); };
  const original = Blockly.Blocks.procedures_defreturn.init;
  Blockly.Blocks.procedures_defreturn.init = function () {
    original.call(this);
    this.setStatements_(false);
    this.setTooltip('Eigene Wertfunktion. Parameter über das Zahnrad bearbeiten. Beim Export in Jinja aufgelöst; keine Aktionen oder Rekursion.');
    const load = this.loadExtraState, decompose = this.decompose, xml = this.domToMutation;
    this.domToMutation = function (element) { xml.call(this, element); this.setStatements_(false); };
    this.loadExtraState = function (state) {
      if (state.hasStatements === true) throw new Error('Funktion: Aktionen werden nicht unterstützt.');
      load.call(this, { ...state, hasStatements: false });
    };
    this.decompose = function (workspace) {
      const container = decompose.call(this, workspace);
      container.removeInput('STATEMENT_INPUT', true);
      return container;
    };
  };
}
export function functionInfo(block) {
  const [name, params] = block.getProcedureDef();
  if (!identifier.test(name) || params.length > 8 || params.some(p => !identifier.test(p)) || new Set(params).size !== params.length) throw new Error('Funktion: gültige ASCII-Namen und höchstens 8 unterschiedliche Parameter erforderlich.');
  if (block.getInput('STACK')) throw new Error('Funktion: nur Rückgabewert, keine Aktionen.');
  return { name, params };
}
export function functionToolbox(workspace) {
  return [{ kind: 'block', type: 'procedures_defreturn', extraState: { hasStatements: false } }, ...workspace.getBlocksByType('procedures_defreturn', false).filter(b => b.isEnabled()).map(block => {
    const [name, params] = block.getProcedureDef();
    return { kind: 'block', type: 'procedures_callreturn', extraState: { name, params } };
  })];
}
