import ts from 'typescript';
import {readFile, writeFile} from 'node:fs/promises';
const path = process.argv[2] ?? 'web/vendor/pro-blocks.js';
const source = await readFile(path, 'utf8');
if (source.includes('installBlocklyCommit')) throw Error('Blockly commit already installed');
const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const nodes = [];
function walk(n) { nodes.push(n); ts.forEachChild(n, walk); }
walk(tree);
const unique = rows => { if (rows.length !== 1) throw Error('Ambiguous commit anchor'); return rows[0]; };
const mount = unique(tree.statements.filter(n => ts.isFunctionDeclaration(n) && n.body.getText(tree).includes('.inject(')));
const inject = unique(nodes.filter(n => ts.isVariableDeclaration(n) && n.initializer && ts.isCallExpression(n.initializer) && n.initializer.expression.getText(tree).endsWith('.inject') && n.pos > mount.pos && n.end < mount.end));
const dispose = unique(nodes.filter(n => ts.isMethodDeclaration(n) && n.name.getText(tree) === 'dispose' && n.pos > mount.pos && n.end < mount.end));
const B = inject.initializer.expression.expression.getText(tree), workspace = inject.name.getText(tree), changed = mount.parameters[2].name.getText(tree);
const returnNode = unique(mount.body.statements.filter(ts.isReturnStatement));
const edits = [[0, 'import {installBlocklyCommit} from "../blockly-commit.js";\n'],
  [returnNode.getStart(tree), `const releaseFieldCommit=installBlocklyCommit(${B},${workspace},${changed});`],
  [dispose.body.getStart(tree)+1, 'releaseFieldCommit();']];
let output=source;
for(const [pos,text] of edits.sort((a,b)=>b[0]-a[0])) output=output.slice(0,pos)+text+output.slice(pos);
await writeFile(path,output);
