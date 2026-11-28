// Preserve the released Blockly bundle; widen only the existing sensor YAML hook.
import ts from 'typescript';
import {readFile, writeFile} from 'node:fs/promises';
const path = process.argv[2] ?? 'web/vendor/pro-blocks.js';
const source = await readFile(path, 'utf8');
if (source.includes('ugso_sensor_state_decimal')) throw new Error('Decimal hook already installed');
const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const hooks = [];
function visit(node) {
  if (ts.isIfStatement(node) && ts.isBinaryExpression(node.expression) &&
      ts.isStringLiteral(node.expression.right) && node.expression.right.text === 'ugso_sensor_state' &&
      node.thenStatement.getText(tree).includes('sensorStateYaml')) hooks.push(node.expression);
  ts.forEachChild(node, visit);
}
visit(tree);
if (hooks.length !== 1) throw new Error('Expected exactly one existing sensor YAML hook');
const hook = hooks[0];
const condition = hook.getText(tree) + '||' + hook.left.getText(tree) + '==="ugso_sensor_state_decimal"';
await writeFile(path, source.slice(0, hook.getStart(tree)) + condition + source.slice(hook.end));
console.log('Decimal YAML hook added; existing block bundle retained.');
