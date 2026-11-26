import assert from 'node:assert/strict';
import test from 'node:test';
import {JSDOM} from 'jsdom';
import {createEntityPicker, loadEntityPage} from '../web/entity-picker.js';
import {connectHA} from '../web/ha-client.js';

function dom() {
  const window = new JSDOM('<html lang="de"><body><div class="planbar"></div><div class="actions"></div></body></html>').window;
  globalThis.document = window.document;
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new window.Event('close')); };
  return window;
}
const entity = (id, rest = {}) => ({entity_id: 'sensor.' + id, name: 'Name ' + id, ...rest});
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

test('HA rows show name, area/device, ID, icon and state without interpreting markup', async () => {
  dom();
  const item = entity('pv', {name: '<img src=x onerror=alert(1)>', area: 'Garten', device: 'Hyper 2000', state: '123', unit: 'W'});
  const picker = createEntityPicker({load: async () => [item]});
  await picker.refresh();
  assert.equal(picker.root.querySelector('.ha-entity-body strong').textContent, item.name);
  assert.equal(picker.root.querySelector('.ha-entity-context').textContent, 'Garten › Hyper 2000');
  assert.equal(picker.root.querySelector('.ha-entity-id').textContent, 'sensor.pv');
  assert.equal(picker.root.querySelector('.ha-entity-state').textContent, '123 W');
  assert.ok(picker.root.querySelector('.ha-entity-row svg'));
  assert.equal(picker.root.querySelector('img'), null);
  picker.destroy();
});

test('keyboard selects the active row and Escape collapses the dropdown', async () => {
  const window = dom();
  let chosen;
  const picker = createEntityPicker({load: async () => [entity('a'), entity('b')], onSelect: value => { chosen = value.entity_id; }});
  document.body.append(picker.root);
  await picker.refresh();
  for (const key of ['ArrowDown', 'ArrowDown', 'Enter']) picker.search.dispatchEvent(new window.KeyboardEvent('keydown', {key, bubbles: true}));
  assert.equal(chosen, 'sensor.b');
  assert.equal(picker.root.querySelector('[role=option][aria-selected=true]').id, picker.search.getAttribute('aria-activedescendant'));
  picker.search.dispatchEvent(new window.KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
  assert.equal(picker.root.querySelector('.ha-entity-panel').hidden, true);
  picker.destroy();
});

test('typing searches automatically and ignores an older response', async () => {
  const window = dom();
  const calls = [];
  let old;
  const picker = createEntityPicker({load: (query, options) => {
    calls.push({query, ...options});
    if (!query) return new Promise(resolve => { old = resolve; });
    return Promise.resolve([entity('weihnacht')]);
  }});
  const initial = picker.refresh();
  picker.search.value = 'weihnacht';
  picker.search.dispatchEvent(new window.Event('input'));
  await new Promise(resolve => setTimeout(resolve, 180));
  assert.equal(calls[1].query, 'weihnacht');
  assert.equal(calls[0].signal.aborted, true);
  old([entity('old')]);
  await initial;
  assert.equal(picker.root.querySelector('.ha-entity-id').textContent, 'sensor.weihnacht');
  picker.destroy();
});

test('pagination keeps earlier results and uses the next offset', async () => {
  dom();
  const offsets = [];
  const picker = createEntityPicker({load: async (_, {offset}) => {
    offsets.push(offset);
    return {items: offset ? [entity('c')] : [entity('a'), entity('b')], total: 3};
  }});
  await picker.refresh();
  assert.equal(picker.root.querySelector('.ha-entity-more').hidden, false);
  await picker.refresh(true);
  assert.deepEqual(offsets, [0, 2]);
  assert.equal(picker.root.querySelectorAll('[role=option]').length, 3);
  assert.equal(picker.root.querySelector('.ha-entity-more').hidden, true);
  picker.destroy();
});

test('an unavailable saved ID remains visible, and cancelling never changes it', async () => {
  dom();
  let changes = 0;
  const picker = createEntityPicker({current: 'sensor.saved', load: async () => [], onSelect: () => changes++});
  await picker.refresh();
  assert.match(picker.root.querySelector('.ha-entity-caption').textContent, /sensor.saved/);
  picker.destroy();
  assert.equal(changes, 0);
});

test('DE EN FR labels and explicit clear are supported', async () => {
  for (const [locale, search] of [['de', 'Durchsuchen'], ['en', 'Search'], ['fr', 'Rechercher']]) {
    dom();
    let cleared = false;
    const picker = createEntityPicker({locale, current: 'sensor.saved', load: async () => [], onClear: () => { cleared = true; }});
    assert.equal(picker.search.getAttribute('aria-label'), search);
    picker.root.querySelector('.ha-entity-clear').click();
    assert.equal(cleared, true);
    assert.equal(picker.root.querySelector('.ha-entity-clear').hidden, true);
    picker.destroy();
  }
});

test('catalog loader only reads, preserving domain/output filters and pagination', async () => {
  const savedFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = {url, options};
    return {ok: true, json: async () => ({items: [], total: 0})};
  };
  try {
    await loadEntityPage('PV Garten', {domains: ['light', 'switch'], output: true, offset: 100});
    const query = new URL(request.url, 'http://unit.test/').searchParams;
    assert.equal(query.get('q'), 'PV Garten');
    assert.equal(query.get('domain'), 'light,switch');
    assert.equal(query.get('output'), '1');
    assert.equal(query.get('offset'), '100');
    assert.equal(request.options.method, undefined);
    assert.equal(request.options.body, undefined);
  } finally { globalThis.fetch = savedFetch; }
});

test('destroyed picker cannot render a late response', async () => {
  dom();
  let resolve;
  const picker = createEntityPicker({load: () => new Promise(done => { resolve = done; })});
  const loading = picker.refresh();
  picker.destroy();
  resolve([entity('late')]);
  await loading;
  assert.equal(picker.root.querySelectorAll('[role=option]').length, 0);
});

test('multiple selections toggle checks without replacing stored IDs', async () => {
  dom();
  const ids = new Set(['sensor.offline']);
  const picker = createEntityPicker({load: async () => [entity('a')], selected: item => ids.has(item.entity_id),
    onSelect: item => ids.has(item.entity_id) ? ids.delete(item.entity_id) : ids.add(item.entity_id)});
  await picker.refresh();
  const row = picker.root.querySelector('.ha-entity-row');
  row.click();
  assert.deepEqual([...ids], ['sensor.offline', 'sensor.a']);
  assert.equal(row.querySelector('.ha-entity-check').textContent, '✓');
  row.click();
  assert.deepEqual([...ids], ['sensor.offline']);
  assert.equal(row.getAttribute('aria-selected'), 'false');
  assert.equal(row.querySelector('.ha-entity-check').textContent, '');
  picker.destroy();
});

test('Funktionsplan retains attribute and output-mode selection without workspace writes', async () => {
  for (const [type, params] of [['STATE_IN', {attribute: 'brightness'}], ['STATE_OUT', {mode: 'BRIGHTNESS'}]]) {
    dom();
    const savedFetch = globalThis.fetch;
    const requests = [], selections = [];
    globalThis.fetch = async (url, options) => {
      requests.push({url, options});
      return {ok: true, json: async () => ({items: [{entity_id: 'light.flur', name: 'Flur', domain: 'light', attributes: {brightness: 77}}], total: 1})};
    };
    const block = {id: 'block', type, params: {oid: 'light.flur', ...params}};
    try {
      const connection = connectHA({workspace: false, selected: () => block, getPreferences: () => ({language: 'en'}),
        choose: value => selections.push(value), report: assert.fail});
      connection.show();
      await tick(); await tick();
      const dialog = document.querySelector('#entity-dialog');
      assert.equal(dialog.querySelector('select').value, type === 'STATE_IN' ? 'brightness' : 'BRIGHTNESS');
      dialog.querySelector('.ha-entity-row').click();
      assert.equal(selections.length, 1);
      assert.equal(selections[0][type === 'STATE_IN' ? 'selected_attribute' : 'output_mode'], type === 'STATE_IN' ? 'brightness' : 'BRIGHTNESS');
      assert.equal(document.querySelector('#entity-dialog'), null);
      assert.equal(requests.length, 1);
      assert.ok(requests[0].url.startsWith('./api/entities?'));
    } finally { globalThis.fetch = savedFetch; }
  }
});
