// Extend the released bundle without rebuilding the older internal frontend sources.
// AST anchors fail closed when the bundle structure changes; all existing blocks stay intact.
import ts from 'typescript';
import {readFile, writeFile} from 'node:fs/promises';
const path = process.argv[2] ?? 'web/vendor/pro-blocks.js';
const source = await readFile(path, 'utf8');
if (source.includes('registerSensorStateBlocks')) throw new Error('Bundle already extended');
const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const nodes = [];
function walk(node) { nodes.push(node); ts.forEachChild(node, walk); }
walk(tree);
const unique = rows => { if (rows.length !== 1) throw new Error('Ambiguous bundle anchor: ' + rows.length); return rows[0]; };
const string = (node, value) => ts.isStringLiteral(node) && node.text === value;
const registration = unique(nodes.filter(node => ts.isCallExpression(node) && node.expression.getText(tree) === 'registerCreateState'));
const [Blockly, generator, language, entityField] = registration.arguments.map(node => node.getText(tree));
const catalog = unique(nodes.filter(node => ts.isVariableDeclaration(node) && node.initializer &&
  ts.isNewExpression(node.initializer) && node.initializer.expression.getText(tree) === 'Set' &&
  node.initializer.arguments?.[0]?.elements?.some(item => string(item, 'ugso_parallel_item'))));
const known = catalog.initializer.arguments[0].elements.find(ts.isSpreadElement).expression.getText(tree);
const jsTypes = unique(nodes.filter(node => ts.isVariableDeclaration(node) && node.initializer &&
  ts.isArrayLiteralExpression(node.initializer) && node.initializer.elements.some(item => string(item, 'ha_js_set_state'))));
const eventRead = unique(nodes.filter(node => ts.isIfStatement(node) && node.expression.getText(tree).endsWith('==="ugso_fire_event"')));
let reader = eventRead.parent;
while (!ts.isFunctionDeclaration(reader)) reader = reader.parent;
const block = reader.parameters[0].name.getText(tree);
const readValue = unique(nodes.filter(node => ts.isCallExpression(node) && node.arguments.length === 2 &&
  node.arguments[0].getText(tree) === block && string(node.arguments[1], 'TOPIC'))).expression.getText(tree);
const mount = unique(nodes.filter(node => ts.isFunctionDeclaration(node) && node.body?.statements.some(statement =>
  statement.getText(tree).includes('Blockly-Arbeitsbereich')) === false && node.parameters.length === 7 &&
  node.body?.getText(tree).includes('.inject(')));
const inject = unique(nodes.filter(node => ts.isCallExpression(node) && node.expression.getText(tree) === Blockly + '.inject' &&
  node.pos >= mount.pos && node.end <= mount.end));
const categories = inject.arguments[1].properties.find(property => property.name?.getText(tree) === 'toolbox').initializer.getText(tree);
let injectStatement = inject;
while (!ts.isVariableStatement(injectStatement)) injectStatement = injectStatement.parent;
const exportStatement = unique(tree.statements.filter(ts.isExportDeclaration));
const edits = [
  [0, 'import {registerSensorStateBlocks, sensorStateYaml, addSensorStateToolbox} from "../sensor-state-block.js";\n'],
  [reader.body.getStart(tree) + 1, `if(${block}.type==="ugso_sensor_state")return sensorStateYaml(${block},${readValue});`],
  [injectStatement.getStart(tree), `addSensorStateToolbox(${categories},${mount.parameters[4].name.getText(tree)});`],
  [exportStatement.getStart(tree), `registerSensorStateBlocks(${Blockly},${generator},${language},${entityField},${jsTypes.name.getText(tree)},${catalog.name.getText(tree)},${known});`],
];
let output = source;
for (const [position, content] of edits.sort((a, b) => b[0] - a[0])) output = output.slice(0, position) + content + output.slice(position);
await writeFile(path, output);
console.log('Sensor blocks added; released Blockly bundle preserved.');
