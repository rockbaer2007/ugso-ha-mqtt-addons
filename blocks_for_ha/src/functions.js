// Original Blockly procedure editor; HA expressions and action sequences expand at export.
import { translateLabel, language } from './locales.js';
export const functionTypes = ['procedures_defreturn', 'procedures_callreturn', 'procedures_defnoreturn', 'procedures_callnoreturn', 'ugso_function_result', 'variables_get'];
const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/;
export function installFunctions(Blockly) {
  const texts={de:['Falls %1 gib zurück %2 sonst %3','Bedingter Rückgabewert. Nur der passende Wertzweig wird in HA ausgewertet.','Eigene Aktionsfunktion. Parameter über das Zahnrad bearbeiten und als Variablenblöcke verwenden. Beim Export in HA-Schritte aufgelöst; keine Rekursion.'],en:['If %1 return %2 otherwise %3','Conditional return value. HA evaluates only the selected value branch.','Custom action function. Edit parameters with the cog and use variable blocks to access them. Expanded into HA steps at export; no recursion.'],fr:['Si %1 renvoyer %2 sinon %3','Valeur de retour conditionnelle. HA évalue uniquement la branche sélectionnée.','Fonction d’action personnalisée. Modifier les paramètres via l’engrenage et les utiliser avec des blocs de variable. Développée en étapes HA à l’export ; sans récursion.']}[language];
  Blockly.defineBlocksWithJsonArray([{type:'ugso_function_result',message0:texts[0],args0:[{type:'input_value',name:'TEST',check:'Boolean'},{type:'input_value',name:'TRUE',check:'Value'},{type:'input_value',name:'FALSE',check:'Value'}],output:['String','Boolean','RuntimeNumber','Value'],style:'ugso_function',tooltip:texts[1]}]);
  const actionDef=Blockly.Blocks.procedures_defnoreturn.init;
  Blockly.Blocks.procedures_defnoreturn.init=function(){actionDef.call(this);this.getInput('STACK').setCheck('Action');this.setTooltip(texts[2]);};
  const actionCall=Blockly.Blocks.procedures_callnoreturn.init;
  Blockly.Blocks.procedures_callnoreturn.init=function(){actionCall.call(this);this.setPreviousStatement(true,'Action');this.setNextStatement(true,'Action');};
  const callInit = Blockly.Blocks.procedures_callreturn.init;
  Blockly.Blocks.procedures_callreturn.init = function () { callInit.call(this); this.setOutput(true, ['String', 'Boolean', 'RuntimeNumber', 'Value']); };
  const getInit = Blockly.Blocks.variables_get.init;
  Blockly.Blocks.variables_get.init = function () { getInit.call(this); this.setOutput(true, ['String', 'Value']); };
  const original = Blockly.Blocks.procedures_defreturn.init;
  Blockly.Blocks.procedures_defreturn.init = function () {
    original.call(this);
    this.setStatements_(false);
    this.setTooltip(translateLabel('Eigene Wertfunktion. Parameter über das Zahnrad bearbeiten. Beim Export in Jinja aufgelöst; keine Aktionen oder Rekursion.'));
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
  if (block.type==='procedures_defreturn' && block.getInput('STACK')) throw new Error('Funktion: nur Rückgabewert, keine Aktionen.');
  return { name, params };
}
export function functionToolbox(workspace) {
  return [{ kind: 'block', type: 'procedures_defreturn', extraState: { hasStatements: false } }, ...['procedures_defreturn','procedures_defnoreturn'].flatMap(type=>workspace.getBlocksByType(type, false)).filter(b => b.isEnabled()).map(block => {
    const [name, params] = block.getProcedureDef();
    return { kind: 'block', type: block.type==='procedures_defreturn'?'procedures_callreturn':'procedures_callnoreturn', extraState: { name, params } };
  }),{kind:'block',type:'procedures_defnoreturn'},{kind:'block',type:'ugso_function_result'}];
}
