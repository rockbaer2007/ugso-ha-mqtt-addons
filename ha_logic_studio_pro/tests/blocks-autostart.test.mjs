import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import {JSDOM} from 'jsdom';
const source = await readFile(new URL('../web/pro.js', import.meta.url), 'utf8');
const tree = ts.createSourceFile('pro.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const toolbar = tree.statements.find(n => ts.isFunctionDeclaration(n) && n.name.text === 'toolbar').getText(tree);

test('Blocks JS toolbar exposes saved opt-in autostart and keeps native YAML excluded', () => {
  const dom = new JSDOM('<body></body>');
  try {
    let dirty = 0;
    const context = vm.createContext({active: '42', openTabs: new Map(), hasUnsavedChanges: () => false,
      refreshRuntimeControls: () => dirty++, refreshTabSaveState() {},
      element: (tag, text = '') => { const e = dom.window.document.createElement(tag); e.textContent = text; return e; },
      button: (text, action) => { const e = dom.window.document.createElement('button'); e.textContent = text; e.onclick = action; return e; }});
    vm.runInContext(toolbar, context);
    for (const enabled of [false, true]) {
      const project = {type: 'blocks-js', name: 'Example', autostart: enabled};
      const panel = dom.window.document.createElement('section');
      context.toolbar(panel, project);
      const checkbox = panel.querySelector('input[type=checkbox]');
      assert.ok(checkbox);
      assert.equal(checkbox.checked, enabled);
      checkbox.checked = !enabled;
      checkbox.dispatchEvent(new dom.window.Event('change'));
      assert.equal(project.autostart, !enabled);
    }
    assert.equal(dirty, 2);
    const panel = dom.window.document.createElement('section');
    context.toolbar(panel, {type: 'blocks', name: 'Native YAML'});
    assert.equal(panel.querySelector('input[type=checkbox]'), null);
  } finally { dom.window.close(); }
});
