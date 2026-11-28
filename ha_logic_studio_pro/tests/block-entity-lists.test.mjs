import assert from 'node:assert/strict';
import test, {after} from 'node:test';
import {readFile, writeFile, unlink} from 'node:fs/promises';
import ts from 'typescript';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {entityList, validEntityList, toggleEntityList} from '../web/block-entity-list.js';
import {createEntityPicker} from '../web/entity-picker.js';
import {compactTriggerTypes, compactTriggerDefinition} from '../web/compact-trigger-layout.js';

const bundleUrl = new URL('../web/vendor/pro-blocks.js', import.meta.url);
const source = await readFile(bundleUrl, 'utf8');
const tree = ts.createSourceFile('bundle.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const nodes = [];
function visit(node) { nodes.push(node); ts.forEachChild(node, visit); }
visit(tree);
const registration = nodes.find(n => ts.isCallExpression(n) && n.expression.getText(tree) === 'registerSensorStateBlocks');
const choice = nodes.find(n => ts.isFunctionDeclaration(n) && n.body.getText(tree).includes('choiceSpec_') && n.body.getText(tree).includes('getSourceBlock'));
const validation = nodes.find(n => ts.isFunctionDeclaration(n) && n.body.getText(tree).includes('validEntityList'));
const mount = tree.statements.find(n => ts.isFunctionDeclaration(n) && n.body.getText(tree).includes('.inject('));
const localeSetter = mount.body.statements[0].expression.expression.getText(tree);
const temp = new URL('../web/vendor/.entity-audit-' + process.pid + '.mjs', import.meta.url);
const auditDOM = new JSDOM('<body></body>');
globalThis.window = auditDOM.window;
globalThis.document = auditDOM.window.document;
globalThis.HTMLElement = auditDOM.window.HTMLElement;
globalThis.Element = auditDOM.window.Element;
globalThis.DOMParser = auditDOM.window.DOMParser;
globalThis.XMLSerializer = auditDOM.window.XMLSerializer;
after(() => auditDOM.window.close());
let shipped;
try {
  await writeFile(temp, source + `\nexport {${registration.arguments[0].getText(tree)} as B, ${choice.name.text} as fieldChoice, ${validation.name.text} as validChoice, ${localeSetter} as setLocale};`);
  shipped = await import(temp.href);
  shipped.setLocale('de');
} finally { await unlink(temp); }

test('all shipped direct entity fields in Blocks A and JS have a picker', context => {
  const workspace = new shipped.B.Workspace();
  const EntityField = shipped.B.fieldRegistry.fromJson({type: 'ugso_field_entity', text: ''}).constructor;
  let blocks = 0, fields = 0;
  try {
    for (const type of Object.keys(shipped.B.Blocks).filter(type => /^(ha_js_|ugso_)/.test(type))) {
      let block;
      try { block = workspace.newBlock(type); } catch (error) { throw Error(type + ': ' + error.message); }
      blocks++;
      for (const input of block.inputList) for (const field of input.fieldRow) {
        if (!['ENTITY', 'ENTITIES', 'SCENE'].includes(field.name)) continue;
        const spec = shipped.fieldChoice(field);
        assert.equal(spec?.kind, 'entity_id', type + '.' + field.name);
        assert.ok(field instanceof EntityField, type + '.' + field.name);
        fields++;
      }
      block.dispose();
    }
    assert.ok(blocks >= 270); assert.ok(fields >= 48);
    context.diagnostic(`${blocks} registered blocks audited; ${fields} direct entity fields have pickers.`);
  } finally { workspace.dispose(); }
});

test('multiple-state trigger retains saved lists and uses HA multi-selection in DE EN FR', () => {
  for (const language of ['de', 'en', 'fr']) {
    shipped.setLocale(language);
    const workspace = new shipped.B.Workspace(), restored = new shipped.B.Workspace();
    try {
      const block = workspace.newBlock('ha_js_on_states');
      const field = block.getField('ENTITIES');
      assert.equal(shipped.fieldChoice(field).commaList, true);
      const old = 'switch.fan_og,  switch.fan_eg\nsensor.power';
      block.setFieldValue(old, 'ENTITIES');
      const saved = shipped.B.serialization.workspaces.save(workspace);
      shipped.B.serialization.workspaces.load(saved, restored);
      assert.equal(restored.getTopBlocks()[0].getFieldValue('ENTITIES'), old, language);
      assert.equal(shipped.validChoice(old, shipped.fieldChoice(field)), true);
    } finally { workspace.dispose(); restored.dispose(); }
  }
});

test('entity lists reject invalid IDs and retain legacy comma/whitespace format', () => {
  assert.deepEqual(entityList('switch.a, sensor.b switch.a'), ['switch.a', 'sensor.b']);
  assert.equal(toggleEntityList('switch.a, sensor.b', 'switch.a'), 'sensor.b');
  assert.equal(toggleEntityList('switch.a', 'sensor.b'), 'switch.a, sensor.b');
  for (const invalid of ['', ' ', 'switch.a\'', '["switch.a"]', '{{ states() }}', 'switch.*']) assert.equal(validEntityList(invalid), false);
  assert.equal(validEntityList(Array.from({length: 101}, (_, i) => 'sensor.n' + i).join(',')), false);
});

test('related entity triggers use compact vertical rows in DE EN FR without changing fields', () => {
  for (const language of ['de', 'en', 'fr']) {
    shipped.setLocale(language);
    const workspace = new shipped.B.Workspace();
    try {
      for (const type of compactTriggerTypes) {
        const block = workspace.newBlock(type);
        assert.equal(block.getInputsInline(), false, type);
        assert.ok(block.getInput('TRIGGER_TITLE_ROW'));
        assert.ok(block.getInput('TRIGGER_ENTITY_ROW'));
        const entityInput = block.inputList.find(input => input.fieldRow.some(f => ['ENTITY', 'ENTITIES'].includes(f.name)));
        assert.ok(entityInput);
        assert.equal(entityInput.fieldRow.some(f => f.name === 'CHANGE'), false);
        assert.ok(block.getInput('BODY'));
        const entityField = block.getField(type === 'ha_js_on_states' ? 'ENTITIES' : 'ENTITY');
        const longId = 'sensor.' + 'very_long_entity_name_'.repeat(4);
        entityField.setValue(longId);
        assert.ok(entityField.getText().length <= 50);
        assert.equal(entityField.getValue(), longId);
        const saved = shipped.B.serialization.workspaces.save(workspace);
        const copy = new shipped.B.Workspace();
        try { shipped.B.serialization.workspaces.load(saved, copy); assert.equal(copy.getTopBlocks()[0].type, type); }
        finally { copy.dispose(); }
        block.dispose();
      }
    } finally { workspace.dispose(); }
  }
  const untouched = {message0: 'Other', args0: []};
  assert.equal(compactTriggerDefinition('ha_js_set_state', untouched), untouched);
});

test('multiple-state trigger still generates subscriptions for every selected entity', () => {
  const snapshot = {blocks: {blocks: [{type: 'ha_js_on_states', fields: {
    ENTITIES: 'switch.fan_og, switch.fan_eg', CHANGE: 'changed'}, inputs: {
      BODY: {block: {type: 'ha_js_log', inputs: {VALUE: {block: {type: 'text', fields: {TEXT: 'changed'}}}}}},
    }}]}};
  const code = shipped.generateBlocks(snapshot, 'Changes');
  assert.ok(code.includes('switch.fan_og') && code.includes('switch.fan_eg'));
  assert.match(code, /ha\.onState\(entity,/);
});

const ui = await readFile(new URL('../web/pro.js', import.meta.url), 'utf8');
const uiTree = ts.createSourceFile('pro.js', ui, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const functions = ['element', 'button', 'editorDialog', 'openBlockEntity'].map(name =>
  uiTree.statements.find(n => ts.isFunctionDeclaration(n) && n.name.text === name).getText(uiTree)).join('\n');
for (const locale of ['de', 'en', 'fr']) {
  test('HA multi-picker searches, toggles, applies and cancels without losing IDs: ' + locale, async () => {
    const window = new JSDOM('<body></body>').window;
    globalThis.document = window.document;
    window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    window.HTMLDialogElement.prototype.close = function () { this.dispatchEvent(new window.Event('close')); };
    const queries = [], applied = [];
    const context = vm.createContext({document, locale, createEntityPicker, entityList, toggleEntityList,
      loadEntityPage: async search => { queries.push(search); return [
        {entity_id: 'switch.fan_og', name: 'Fan OG', state: 'off'},
        {entity_id: 'switch.fan_eg', name: 'Fan EG', state: 'on'}]; }});
    vm.runInContext(functions + '\nglobalThis.openPicker = openBlockEntity;', context);
    context.openPicker({kind: 'entity_id', commaList: true, multiline: true}, 'switch.fan_og', value => applied.push(value), validEntityList);
    await new Promise(resolve => setTimeout(resolve, 0));
    const dialog = document.querySelector('dialog');
    const rows = dialog.querySelectorAll('[role=option]');
    assert.equal(rows.length, 2);
    rows[1].click();
    assert.equal(applied.length, 0);
    assert.equal(dialog.querySelector('textarea').value, 'switch.fan_og, switch.fan_eg');
    assert.equal(rows[1].getAttribute('aria-selected'), 'true');
    const search = dialog.querySelector('input[type=search]');
    search.value = 'fan'; search.dispatchEvent(new window.Event('input'));
    await new Promise(resolve => setTimeout(resolve, 170));
    assert.ok(queries.includes('fan'));
    dialog.querySelectorAll('[role=option]')[0].click();
    // Apply is outside the manual-input disclosure and does not require typing.
    [...dialog.querySelectorAll('button')].find(b => b.dataset.userText !== undefined && !b.closest('details')).click();
    assert.deepEqual(applied, ['switch.fan_eg']);
    context.openPicker({kind: 'entity_id', commaList: true}, 'switch.fan_og', value => applied.push(value), validEntityList);
    document.querySelector('dialog').close();
    assert.deepEqual(applied, ['switch.fan_eg']);
    window.close();
  });
}
