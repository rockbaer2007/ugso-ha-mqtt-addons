import ts from 'typescript';
import {readFile, writeFile} from 'node:fs/promises';
const path = process.argv[2] ?? 'web/vendor/pro-blocks.js';
const source = await readFile(path, 'utf8');
if (source.includes('registerCompactTriggerLayouts')) throw Error('Compact trigger layouts already installed');
const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const exports = tree.statements.filter(ts.isExportDeclaration);
const calls = [];
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(tree) === 'registerSensorStateBlocks') calls.push(node);
  ts.forEachChild(node, visit);
}
visit(tree);
if (exports.length !== 1 || calls.length !== 1) throw Error('Ambiguous trigger-layout anchor');
const position = exports[0].getStart(tree);
const call = `registerCompactTriggerLayouts(${calls[0].arguments[0].getText(tree)});`;
await writeFile(path, 'import {registerCompactTriggerLayouts} from "../compact-trigger-layout.js";\n' + source.slice(0, position) + call + source.slice(position));
