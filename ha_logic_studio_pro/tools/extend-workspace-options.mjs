import ts from 'typescript';
import {readFile, writeFile} from 'node:fs/promises';
const path = process.argv[2] ?? 'web/vendor/pro-blocks.js';
const source = await readFile(path, 'utf8');
if (source.includes('blockWorkspaceOptions')) throw Error('Workspace options already installed');
const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const anchors = [];
function walk(node) {
  if (ts.isCallExpression(node) && node.expression.getText(tree).endsWith('.inject') && node.arguments.length === 2 && ts.isObjectLiteralExpression(node.arguments[1])) anchors.push(node.arguments[1]);
  ts.forEachChild(node, walk);
}
walk(tree);
if (anchors.length !== 1) throw Error('Ambiguous workspace inject anchor');
const position = anchors[0].getStart(tree) + 1;
const output = 'import {blockWorkspaceOptions} from "../blockly-workspace-options.js";\n' + source.slice(0, position) + '...blockWorkspaceOptions(),' + source.slice(position);
await writeFile(path, output);
