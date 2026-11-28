// Patch only AST-identified anchors; retain the released frontend and imports.
import ts from 'typescript';
import {readFile, writeFile} from 'node:fs/promises';
const path = process.argv[2] ?? 'web/vendor/pro-blocks.js';
const source = await readFile(path, 'utf8');
if (source.includes('validEntityList')) throw Error('Entity-list picker already installed');
const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const nodes = [];
function visit(node) { nodes.push(node); ts.forEachChild(node, visit); }
visit(tree);
const unique = rows => { if (rows.length !== 1) throw Error('Ambiguous entity-list anchor: ' + rows.length); return rows[0]; };
const definition = unique(nodes.filter(node => ts.isArrayLiteralExpression(node) &&
  node.elements.length > 0 && ts.isStringLiteral(node.elements[0]) && node.elements[0].text === 'on_states'));
const field = definition.elements[2].elements[0];
if (!ts.isCallExpression(field) || field.arguments[0]?.text !== 'ENTITIES') throw Error('Unexpected entity-list field');
const validator = unique(nodes.filter(node => ts.isFunctionDeclaration(node) &&
  node.body.getText(tree).includes('.listOnly') && node.body.getText(tree).includes('Number.isFinite')));
const [value, spec] = validator.parameters.map(node => node.name.getText(tree));
const edits = [
  [0, 0, 'import {validEntityList} from "../block-entity-list.js";\n'],
  [field.getStart(tree), field.end, `{type:"ugso_field_ha_choice",name:"ENTITIES",text:${field.arguments[1].getText(tree)},choice:{kind:"entity_id",commaList:true,multiline:true}}`],
  [validator.body.getStart(tree) + 1, validator.body.getStart(tree) + 1,
    `if(${spec}.commaList)return validEntityList(${value});`],
];
let result = source;
for (const [start, end, text] of edits.sort((a, b) => b[0] - a[0])) result = result.slice(0, start) + text + result.slice(end);
await writeFile(path, result);
console.log('Multiple-state trigger now uses the HA entity picker; saved list format preserved.');
