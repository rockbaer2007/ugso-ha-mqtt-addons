import ts from 'typescript';
import {readFile, writeFile} from 'node:fs/promises';
const path = process.argv[2] ?? 'web/vendor/pro-blocks.js';
const source = await readFile(path, 'utf8');
if (source.includes('registerOrderedOutputs')) throw Error('Ordered outputs already installed');
const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const nodes = [];
function visit(n) { nodes.push(n); ts.forEachChild(n, visit); }
visit(tree);
const exports = tree.statements.filter(ts.isExportDeclaration);
const calls = nodes.filter(n => ts.isCallExpression(n) && n.expression.getText(tree) === 'registerSensorStateBlocks');
const waits = nodes.filter(n => ts.isCallExpression(n) && n.expression.getText(tree).endsWith('.includes') && n.expression.expression.getText(tree) === '["ha_js_pause","ha_js_sensor_state","ha_js_sensor_state_decimal"]');
if (exports.length !== 1 || calls.length !== 1 || waits.length !== 1) throw Error('Ambiguous ordered-output anchor');
const position = exports[0].getStart(tree), generator = calls[0].arguments[1].getText(tree), wait = waits[0];
const additions = [[wait.expression.expression.getStart(tree), wait.expression.expression.end, '["ha_js_pause","ha_js_sensor_state","ha_js_sensor_state_decimal",...orderedOutputTypes]'],
  [position, position, `registerOrderedOutputs(${generator});`],
  [0, 0, 'import {orderedOutputTypes,registerOrderedOutputs} from "../ordered-outputs.js";\n']];
let result = source;
for (const [start, end, text] of additions.sort((a,b) => b[0]-a[0])) result = result.slice(0,start)+text+result.slice(end);
await writeFile(path,result);
