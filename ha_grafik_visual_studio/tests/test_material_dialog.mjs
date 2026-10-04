import assert from 'node:assert/strict';
import { materialDialogGroups, materialDialogLayout, dialogStateOpen, renderMaterialDialog, syncMaterialDialogs, materialIframeUrl } from '../web/material-dialog.js';

const groups = ['Allgemein', 'Button Layout', 'Layout Dialog', 'Layout Kopfzeile', 'Layout der Schaltflächen in der Dialogfußzeile'].map(label => ({ label, fields: [{ key: 'targetPage', type: 'text' }] }));
const key = (group, index) => `stable-${index}`;
const widget = { showAdvanced: false, dialogTitle: 'Keep this title', buttonText: 'Keep this button' };
const compact = materialDialogGroups(groups, widget, key);
assert.deepEqual(compact.map(g => g.label), ['Allgemein', 'Layout Dialog']);
assert.equal(compact[1].id, 'stable-2');
assert.equal(compact[0].fields[0].type, 'page');
assert.deepEqual(materialDialogGroups([{ label: 'Datenfluss', fields: [{ type: 'select', options: [{ value: 'left', label: 'Links' }] }] }], widget, key)[0].fields[0].options, [{ value: 'left', label: 'Links' }]);
assert.equal(materialDialogGroups(groups, { ...widget, showAdvanced: true }, key).length, 5);
assert.equal(widget.dialogTitle, 'Keep this title');
assert.equal(widget.buttonText, 'Keep this button');
assert.equal(materialDialogLayout({}, 360).fullscreen, true);
assert.equal(materialDialogLayout({}, 361).fullscreen, false);
assert.equal(materialDialogLayout({ overlayOpacity: 9, viewHeight: -2 }, 1200).opacity, 1);
assert.equal(materialDialogLayout({ overlayOpacity: 9, viewHeight: -2 }, 1200).height, 100);
assert.equal(materialDialogLayout({ viewHeight: '' }, 1200).height, 400);
for (const value of ['unavailable', 'unknown', 'off', false, 'false', 0]) assert.equal(dialogStateOpen(value), false);
for (const value of ['on', true, 'true', 1]) assert.equal(dialogStateOpen(value), true);
console.log('Advanced visibility, stable group IDs, preserved values, responsive layout and boolean triggers verified.');

class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.events = {}; this.style = { setProperty() {} }; this.isConnected = true; }
  append(...children) { this.children.push(...children); }
  setAttribute(key, value) { (this.attributes ||= {})[key] = value; }
  addEventListener(event, handler) { this.events[event] = handler; }
  focus() {}
  showModal() { this.open = true; }
  close() { this.open = false; this.events.close?.(); }
  remove() { this.isConnected = false; }
  getBoundingClientRect() { return { left: 10, top: 10, right: 200, bottom: 200 }; }
}
const doc = { createElement: tag => new Element(tag), body: new Element('body'), defaultView: { innerWidth: 1200, navigator: {} } };
const click = { stopPropagation() {} };
const buttonWidget = { id: 'button-test', labelText: '<safe>', designStyle: 'material3' };
const runtime = { runtime: true, surface: 'test', popupUrl: 'http://127.0.0.1/page' };
renderMaterialDialog(buttonWidget, doc, {}).children[0].events.click?.(click);
assert.equal(doc.body.children.length, 0, 'editor must never open');
const trigger = renderMaterialDialog(buttonWidget, doc, runtime).children[0];
trigger.events.click(click);
const modal = doc.body.children.at(-1);
assert.equal(modal.open, true);
assert.equal(modal.children[1].src, runtime.popupUrl);
modal.events.click({ target: modal, clientX: 0, clientY: 0 });
assert.equal(modal.open, false, 'outside click closes');
trigger.events.click(click);
assert.equal(doc.body.children.at(-1).open, true, 'can reopen');
syncMaterialDialogs('other-surface', []);
assert.equal(doc.body.children.at(-1).open, false, 'page change cleans up');
let resets = 0;
const stateWidget = { id: 'state-test', showDialogMethod: 'datapoint', entityId: 'input_boolean.test' };
const stateContext = { ...runtime, states: { 'input_boolean.test': { state: 'on' } }, resetState: async () => { resets++; } };
renderMaterialDialog(stateWidget, doc, stateContext);
await Promise.resolve();
const stateModal = doc.body.children.at(-1);
stateModal.children[2].children[0].events.click();
assert.equal(resets, 1, 'closing resets writable boolean');
const countAfterClose = doc.body.children.length;
renderMaterialDialog(stateWidget, doc, stateContext);
await Promise.resolve();
assert.equal(doc.body.children.length, countAfterClose, 'stale on state must not reopen');
renderMaterialDialog(stateWidget, doc, { ...stateContext, states: {} });
renderMaterialDialog(stateWidget, doc, stateContext);
await Promise.resolve();
assert.equal(doc.body.children.length, countAfterClose + 1, 'new rising edge opens');
syncMaterialDialogs('', []);
console.log('Editor/runtime separation, local page embedding, outside close, cleanup and boolean reopening verified.');

for (const source of ['', 'javascript:alert(1)', 'data:text/html,test', 'file:///tmp/test']) assert.equal(materialIframeUrl(source, 'https://studio.example/'), null);
assert.equal(materialIframeUrl('/dashboard', 'https://studio.example/'), 'https://studio.example/dashboard');
assert.equal(materialIframeUrl('https://example.com/page', 'https://studio.example/'), 'https://example.com/page');
assert.deepEqual(materialDialogGroups([...groups, { label: 'iFrame Einstellungen', fields: [{ key: 'src', type: 'text' }] }], widget, key).map(g=>g.label), ['Allgemein', 'Layout Dialog', 'iFrame Einstellungen']);
const iframeContext = { ...runtime, iframe: true, popupUrl: 'https://example.com/page' };
renderMaterialDialog({ id: 'frame-test', scrollY: true }, doc, iframeContext).children[0].events.click(click);
const sandboxed = doc.body.children.at(-1).children[1];
assert.equal(sandboxed.src, iframeContext.popupUrl);
assert.equal(sandboxed.attributes.sandbox, 'allow-scripts allow-forms');
assert.equal(sandboxed.attributes.scrolling, 'yes');
assert.equal(sandboxed.style.border, '1px solid currentColor');
syncMaterialDialogs('', []);
renderMaterialDialog({ id: 'frame-unsandboxed', noSandbox: true, seamless: true }, doc, iframeContext).children[0].events.click(click);
const unsandboxed = doc.body.children.at(-1).children[1];
assert.equal(unsandboxed.attributes.sandbox, undefined);
assert.equal(unsandboxed.attributes.scrolling, 'no');
assert.equal(unsandboxed.style.border, '0');
syncMaterialDialogs('', []);
console.log('iFrame URL validation, compact groups, sandbox, scrolling and seamless options verified.');
