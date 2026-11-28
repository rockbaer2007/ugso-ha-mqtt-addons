import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import * as BlocklyModule from 'blockly/core';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import vm from 'node:vm';
import {commitBlocklyField, installBlocklyCommit} from '../web/blockly-commit.js';
const B = Reflect.get(BlocklyModule, 'default') ?? BlocklyModule;
B.Blocks.ugso_commit_test = {init() {
  this.appendDummyInput().appendField(new B.FieldNumber(0.5, undefined, undefined, 0), 'STATE');
}};
test('number field commits 1.5 on pointer change and Tab/blur without Enter', () => {
  const dom = new JSDOM('<body><div class="blocklyWidgetDiv"><input class="blocklyHtmlInput" value="1.5"></div><button>Save</button></body>');
  globalThis.document = dom.window.document;
  const workspace = new B.Workspace(), foreign = new B.Workspace();
  try {
    const block = workspace.newBlock('ugso_commit_test'), field = block.getField('STATE');
    field.htmlInput_ = document.querySelector('input');
    let hidden = 0; const snapshots = [];
    const api = {...B, WidgetDiv: {hide: () => { hidden++; commitBlocklyField(api, workspace, value => snapshots.push(value), document.querySelector('input')); }}};
    const dispose = installBlocklyCommit(api, workspace, value => snapshots.push(value));
    document.querySelector('button').dispatchEvent(new dom.window.Event('pointerdown', {bubbles: true}));
    assert.equal(field.getValue(), 1.5); assert.equal(hidden, 1); assert.equal(snapshots.length, 1);
    assert.equal(snapshots[0].blocks.blocks[0].fields.STATE, 1.5);
    const input = document.querySelector('input'); input.value = '33.25';
    input.dispatchEvent(new dom.window.Event('focusout', {bubbles: true}));
    assert.equal(field.getValue(), 33.25); assert.equal(hidden, 2);
    assert.equal(commitBlocklyField(api, foreign, () => assert.fail(), input), false);
    dispose(); input.value = '9'; input.dispatchEvent(new dom.window.Event('focusout', {bubbles: true}));
    assert.equal(field.getValue(), 33.25);
  } finally { workspace.dispose(); foreign.dispose(); dom.window.close(); }
});

const source = await readFile(new URL('../web/pro.js', import.meta.url), 'utf8');
const tree = ts.createSourceFile('pro.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const nodes = [];
function visit(n) { nodes.push(n); ts.forEachChild(n, visit); }
visit(tree);
const fn = name => nodes.find(n => ts.isFunctionDeclaration(n) && n.name.text === name).getText(tree);
test('clearing the protocol discards stale polls and leaves subsequent runtime messages intact', async () => {
  const dom = new JSDOM('<body><button id="protocol-clear"></button></body>');
  const project = {protocol: [{text: 'old editor entry'}]}, applied = [];
  let releasePoll;
  const oldPoll = new Promise(resolve => { releasePoll = resolve; });
  const assignment = nodes.find(n => ts.isBinaryExpression(n) && n.left.getText(tree) === "$('protocol-clear').onclick");
  const context = vm.createContext({$: id => dom.window.document.getElementById(id), active: '42', projects: new Map([['42', project]]),
    runtimeRequest: false, protocolClearing: false, runtimePollGeneration: 0, runtimeJobs: {},
    fetch: async (url, options) => options ? {ok: true, json: async () => ({'42': {state: 'running', messages: [{text: 'new after clear'}]}})} : oldPoll,
    syncRuntime: value => applied.push(value), renderProtocol() {}, recordProtocol: () => assert.fail('Unexpected clear error')});
  vm.runInContext(fn('pollRuntime') + '\n' + assignment.getText(tree), context);
  const poll = context.pollRuntime();
  await dom.window.document.getElementById('protocol-clear').onclick();
  releasePoll({ok: true, json: async () => ({'42': {state: 'running', messages: [{text: 'old runtime entry'}]}})});
  await poll;
  assert.equal(project.protocol.length, 0);
  assert.equal(applied.length, 1); assert.equal(applied[0]['42'].messages[0].text, 'new after clear');
  assert.equal(dom.window.document.getElementById('protocol-clear').disabled, false);
  dom.window.close();
});
test('runtime status distinguishes dirty draft, saved-but-old code and up-to-date running code', () => {
  let dirty = true; const job = {outdated: false}; const status = {classList: {toggle() {}}};
  const control = {dataset: {}, setAttribute() {}, querySelector: () => ({setAttribute() {}}), parentElement: {querySelector: () => status}};
  const context = vm.createContext({runtimeState: () => 'running', runtimeActive: () => true, hasUnsavedChanges: () => dirty,
    runtimeJobs: {'42': job}, sortingProjects: false, runtimeRequest: false, editorIcons: {}, translatePro: value => value, locale: 'de'});
  vm.runInContext(fn('updateEngineControl'), context);
  context.updateEngineControl(control, '42'); assert.match(status.textContent, /Vorheriger Stand/);
  dirty = false; job.outdated = true;
  context.updateEngineControl(control, '42'); assert.match(status.textContent, /Vorheriger Stand/);
  job.outdated = false;
  context.updateEngineControl(control, '42'); assert.equal(status.textContent, 'Skript läuft');
});
