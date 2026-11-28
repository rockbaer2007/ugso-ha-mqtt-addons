import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import {emptyPlan, loadPlan} from '../web/core.js';

const source = await readFile(new URL('../web/pro.js', import.meta.url), 'utf8');
const tree = ts.createSourceFile('pro.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const nodes = [];
function walk(node) { nodes.push(node); ts.forEachChild(node, walk); }
walk(tree);
const flowCase = nodes.find(node => ts.isCaseClause(node) && node.expression.getText(tree) === "'flow'");

test('new function plan always requests details, independently of existing projects', () => {
  const drafts = [];
  const context = vm.createContext({emptyPlan, chooseProjectDetails: draft => drafts.push(draft)});
  const branch = 'switch ("flow") {' + flowCase.getText(tree) + '}';
  vm.runInContext(branch, context);
  drafts[0].graph.plan.blocks.push({id: 'b1', type: 'CONST'});
  vm.runInContext(branch, context);
  assert.equal(drafts.length, 2);
  assert.equal(drafts[0].type, 'flow');
  assert.deepEqual(drafts[1].graph.plan.blocks, []);
  assert.notEqual(drafts[0].graph.plan, drafts[1].graph.plan);
  assert.doesNotThrow(() => loadPlan(drafts[1].graph.plan, new Map()));
});

test('flow uses the same name/folder dialog and cancel creates no project', () => {
  const functions = ['chooseProjectDetails', 'updateProjectId'];
  const implementation = functions.map(name => nodes.find(node => ts.isFunctionDeclaration(node) && node.name.text === name).getText(tree)).join('\n');
  const closes = nodes.find(node => ts.isBinaryExpression(node) && node.left.getText(tree) === 'detailsDialog.onclose');
  const name = {value: '', setCustomValidity() {}, select() {}}, folder = {value: '', replaceChildren() {}};
  const detailsDialog = {showModal() {}, returnValue: ''}, created = [];
  const context = vm.createContext({projectName: name, projectFolder: folder, projectIdPreview: {}, detailsDialog,
    projectFolders: new Map([['', 'Hauptordner'], ['tests', 'Tests']]), projects: new Map(), locale: 'de', collapsedProjectGroups: new Set(),
    translatePro: value => value, projectSlug: value => value.toLowerCase().replace(/\s/g, '_'),
    element: () => ({}), add: project => created.push(project)});
  vm.runInContext('let projectDraft;\n' + implementation + '\n' + closes.getText(tree), context);
  for (const [title, target] of [['Plan A', 'tests'], ['Plan B', '']]) {
    context.draft = {type: 'flow', name: 'Funktionsplan', graph: {plan: emptyPlan()}};
    vm.runInContext('chooseProjectDetails(draft)', context);
    name.value = title;
    folder.value = target;
    vm.runInContext('updateProjectId()', context);
    detailsDialog.returnValue = 'create';
    detailsDialog.onclose();
  }
  assert.deepEqual(created.map(project => [project.name, project.folder, project.scriptId]),
    [['Plan A', 'tests', 'logic_studio.tests.plan_a'], ['Plan B', '', 'logic_studio.plan_b']]);
  vm.runInContext('chooseProjectDetails(draft)', context);
  detailsDialog.returnValue = 'cancel';
  detailsDialog.onclose();
  assert.equal(created.length, 2);
});
