import ts from 'typescript';
import {readFile, writeFile} from 'node:fs/promises';
const path = process.argv[2] ?? 'web/vendor/pro-blocks.js';
const source = await readFile(path, 'utf8');
if (source.includes('registerStateBranches')) throw Error('State branches already installed');
const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const nodes = [];
function walk(node) { nodes.push(node); ts.forEachChild(node, walk); }
walk(tree);
const unique = rows => { if (rows.length !== 1) throw Error('Ambiguous branch extension anchor: ' + rows.length); return rows[0]; };
const registration = unique(nodes.filter(n => ts.isCallExpression(n) && n.expression.getText(tree) === 'registerSensorStateBlocks'));
const toolbox = unique(nodes.filter(n => ts.isCallExpression(n) && n.expression.getText(tree) === 'addSensorStateToolbox'));
const pause = unique(nodes.filter(n => ts.isBinaryExpression(n) && n.right.getText(tree) === '"ha_js_pause"' && n.left.getText(tree).endsWith('.type')));
const exportNode = unique(tree.statements.filter(ts.isExportDeclaration));
const [B, generator, lang] = registration.arguments.map(n => n.getText(tree));
const args = registration.arguments.map(n => n.getText(tree)).join(',');
const edits = [
  [0, 0, 'import {registerStateBranches,addStateBranchToolbox,extendBooleanStates} from "../state-branches.js";\n'],
  [pause.getStart(tree), pause.end, `["ha_js_pause","ha_js_sensor_state","ha_js_sensor_state_decimal"].includes(${pause.left.getText(tree)})`],
  [toolbox.end, toolbox.end, `;addStateBranchToolbox(${toolbox.arguments.map(n => n.getText(tree)).join(',')})`],
  [exportNode.getStart(tree), exportNode.getStart(tree), `registerStateBranches(${args});extendBooleanStates(${B},${generator},${lang});`],
];
let result = source;
for (const [start, end, text] of edits.sort((a,b) => b[0]-a[0])) result = result.slice(0,start)+text+result.slice(end);
await writeFile(path,result);
