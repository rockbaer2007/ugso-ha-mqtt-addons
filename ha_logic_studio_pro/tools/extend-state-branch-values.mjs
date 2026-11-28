import ts from 'typescript';
import {readFile, writeFile} from 'node:fs/promises';
const path = process.argv[2] ?? 'web/vendor/pro-blocks.js';
const source = await readFile(path, 'utf8');
if (source.includes('"state_branches"')) throw Error('State branch event values already installed');
const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const nodes = [];
function visit(n) { nodes.push(n); ts.forEachChild(n, visit); }
visit(tree);
const arrays = nodes.filter(n => ts.isArrayLiteralExpression(n) && ['on_state', 'on_states', 'on_attribute'].every(value => n.elements.some(e => ts.isStringLiteral(e) && e.text === value)));
const checks = nodes.filter(n => ts.isBinaryExpression(n) && n.right.getText(tree) === '"ha_js_on_attribute"' &&
  ts.isConditionalExpression(n.parent) && n.parent.whenTrue.getText(tree).includes('attributes?.['));
if (arrays.length !== 1 || checks.length !== 1) throw Error('Ambiguous event-value anchor');
const check = checks[0], owner = check.left.expression.getText(tree);
const edits = [[arrays[0].end-1, arrays[0].end-1, ',"state_branches"'],
  [check.getStart(tree), check.end, `(${check.getText(tree)}||${owner}.type==="ha_js_state_branches"&&${owner}.getFieldValue("MODE")==="attribute")`]];
let result = source;
for (const [start,end,text] of edits.sort((a,b) => b[0]-a[0])) result=result.slice(0,start)+text+result.slice(end);
await writeFile(path,result);
