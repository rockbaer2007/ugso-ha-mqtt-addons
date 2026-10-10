import { stringify } from 'yaml';
import { validatePackage, packageZip, readPackageZip, blockDefinition, customExpression, customNative, installedPackages, canonical, packageStoreKey, blockType } from './custom-packages.js';
import { customExample } from './custom-example.js';
import { validateAutomation } from './model.js';
import { localizedToolbox } from './locales.js';
import { uiText } from './ui-locales.js';

export function refreshCustomToolbox(workspace, toolbox) {
  let category = toolbox.contents.find(item => item.name === 'Benutzerdefiniert');
  if (!category) {
    category = { kind: 'category', name: 'Benutzerdefiniert', categorystyle: 'ugso_template_category', contents: [] };
    const search = toolbox.contents.findIndex(item => item.kind === 'ugso_search');
    toolbox.contents.splice(search < 0 ? toolbox.contents.length : search, 0, category);
  }
  category.contents = installedPackages().flatMap(pkg => [{ kind: 'label', text: `${pkg.name} · ${pkg.version}` }, ...pkg.blocks.map(block => ({ kind: 'block', type: blockType(pkg, block) }))]);
  if (!category.contents.length) category.contents = [{ kind: 'label', text: 'Pakete im Block-/Template-Editor erstellen oder importieren.' }];
  workspace.updateToolbox(localizedToolbox(toolbox));
}

export function setupCustomEditor({ Blockly, workspace, install, download, notice }) {
  const button = document.createElement('button'); button.id = 'custom-editor-open'; button.textContent = 'Block-/Template-Editor';
  document.querySelector('.project-bar .name-field').after(button);
  const dialog = document.createElement('dialog'); dialog.id = 'custom-editor'; dialog.setAttribute('aria-labelledby', 'custom-editor-title');
  dialog.innerHTML = `<div class="custom-header"><div><h2 id="custom-editor-title">Block-/Template-Editor</h2><p>Eigene Blocks · HA-YAML und Jinja · keine JavaScript-Generatoren</p></div><button id="custom-close" aria-label="Blockeditor schließen">✕</button></div>
<div class="custom-body"><section class="custom-settings"><h3>Blockpaket</h3><div class="custom-meta">
<label>Paket-ID<input id="custom-id" maxlength="40"></label><label>Version<input id="custom-version" maxlength="20"></label><label>Name<input id="custom-name" maxlength="120"></label><label>Autor<input id="custom-author" maxlength="120"></label><label>Lizenz<input id="custom-license" maxlength="120"></label></div><label>Beschreibung<textarea id="custom-description" rows="2"></textarea></label>
<div class="custom-library"><label>Geladenes Paket<select id="custom-installed"><option value="">Paket wählen …</option></select></label><button id="custom-example">Beispiel laden</button></div>
<h3>Blocks im Paket</h3><div class="custom-library"><select id="custom-block" aria-label="Block im Paket"></select><button id="custom-add">＋ Block</button><button id="custom-remove">Entfernen</button></div>
<div class="custom-meta"><label>Block-ID<input id="custom-block-id" maxlength="40"></label><label>Blockname<input id="custom-label" maxlength="120"></label><label>Art<select id="custom-kind"><option value="value">Wert / Jinja</option><option value="condition">Bedingung / Jinja</option><option value="action">Aktion / HA-YAML</option><option value="trigger">Auslöser / HA-YAML</option></select></label><label id="custom-output-label">Output<select id="custom-output"><option>Number</option><option>String</option><option>Boolean</option><option>Value</option></select></label></div>
<label>Funktionshinweis<textarea id="custom-tooltip" rows="2"></textarea></label>
<h3>Felder <button id="custom-field-add">＋ Feld</button></h3><div id="custom-fields"></div>
<h3>Werteingänge <button id="custom-input-add">＋ Eingang</button></h3><div id="custom-inputs"></div>
<label id="custom-mapping-label">HA-Zuordnung<textarea id="custom-mapping" rows="5" spellcheck="false"></textarea></label><p class="custom-help">Jinja ohne äußere Klammern: <code>states(\$\{ENTITY\}) | float(0)</code>. Felder werden typgerecht eingesetzt, Werteingänge als Ausdrücke. HA-JSON verwendet <code>{"$field":"ENTITY"}</code> oder <code>{"$input":"VALUE"}</code> als ganze Werte.</p>
<details><summary>JSON-Code oder ZIP importieren</summary><label>Paket-JSON einfügen<textarea id="custom-import-code" rows="6" spellcheck="false"></textarea></label><div class="custom-library"><button id="custom-import">JSON prüfen</button><button id="custom-zip-open">ZIP einlesen</button></div><input id="custom-zip-file" type="file" accept=".zip,application/zip" hidden><p>Prüfen lädt den Entwurf. Erst Übernehmen installiert das Paket.</p></details>
</section><section class="custom-preview"><h3>Blockly-Vorschau</h3><div id="custom-workspace"></div><h3>HA-Ausgabe · Beispielwerte</h3><pre id="custom-ha-output"></pre><p class="custom-help">Strukturvorschau; Jinja wird erst in Home Assistant ausgewertet. Aktionen werden hier nicht ausgeführt.</p>
<details><summary>Blockly-JSON des aktuellen Blocks</summary><pre id="custom-definition"></pre></details><h3>Paket-JSON <button id="custom-copy">Code kopieren</button></h3><textarea id="custom-code" readonly rows="8" aria-label="Kopierbares Paket-JSON" spellcheck="false"></textarea>
<div class="custom-library"><button id="custom-export-json">JSON herunterladen</button><button id="custom-export-zip">Katalog-ZIP herunterladen</button></div><p><a href="https://opensource.ugso-software.de/projects/blocks-for-ha/catalog/" target="_blank" rel="noopener noreferrer">Katalog und Veröffentlichung ↗</a></p></section></div>
<div class="custom-footer"><p id="custom-status" role="status"></p><div><button id="custom-cancel">Abbrechen</button><button id="custom-apply" class="primary">Übernehmen</button></div></div>`;
  document.body.append(dialog);
  dialog.querySelector('#custom-installed option').textContent=uiText('Paket wählen …');
  const el = id => dialog.querySelector(`#${id}`);
  let draft, active = 0, baseline, preview, previewTimer, valid, mappingText;
  const emptyBlock = id => ({ id, label: uiText('Mein Template'), tooltip: '', kind: 'value', output: 'String', fields: [], inputs: [], expression: JSON.stringify(uiText('Beispiel')) });
  const fresh = () => ({ format: 'ugso-ha-block-package', schemaVersion: 1, id: 'meine_blocks', version: '1.0.0', name: uiText('Meine Blockbausteine'), author: 'rockbaer2007', license: 'Apache-2.0', description: uiText('Eigene Blockbausteine für Home Assistant.'), dependencies: [], blocks: [emptyBlock('mein_template')] });
  function status(text, error = false) { el('custom-status').textContent = uiText(text); el('custom-status').classList.toggle('error', error); }
  function current() { return draft.blocks[active]; }
  function updateBlockList() {
    el('custom-block').replaceChildren(...draft.blocks.map((block, i) => new Option(`${i + 1}. ${block.label}`, String(i)))); el('custom-block').value = String(active);
  }
  function entries(which) {
    const container = el(`custom-${which}`); container.replaceChildren();
    current()[which].forEach((item, index) => {
      const row = document.createElement('div'); row.className = 'custom-row';
      const name = document.createElement('input'), label = document.createElement('input'), type = document.createElement('select');
      name.value = item.name; name.maxLength = 32; name.setAttribute('aria-label', `${which === 'fields' ? 'Feld' : 'Eingang'} ${index + 1} Name`);
      label.value = item.label; label.maxLength = 80; label.setAttribute('aria-label', `${index + 1} Beschriftung`);
      for (const option of which === 'fields' ? ['text', 'number', 'boolean', 'entity'] : ['Number', 'String', 'Boolean', 'Value']) type.add(new Option(option, option));
      type.value = item.type || item.check; type.setAttribute('aria-label', `${index + 1} Typ`);
      const controls = [name, label, type];
      if (which === 'fields') { const value = document.createElement('input'); value.value = String(item.default); value.setAttribute('aria-label', `${index + 1} Standardwert`); controls.push(value); }
      const remove = document.createElement('button'); remove.textContent = '×'; remove.setAttribute('aria-label', `${which === 'fields' ? 'Feld' : 'Eingang'} ${index + 1} entfernen`);
      remove.addEventListener('click', () => { readForm(); current()[which].splice(index, 1); entries(which); schedule(); });
      row.append(...controls, remove); container.append(row);
      for (const control of controls) control.addEventListener('input', schedule);
    });
  }
  function readForm() {
    for (const name of ['id', 'version', 'name', 'author', 'license', 'description']) draft[name] = el(`custom-${name}`).value;
    const block = current(); block.id = el('custom-block-id').value; block.label = el('custom-label').value; block.tooltip = el('custom-tooltip').value; block.kind = el('custom-kind').value;
    for (const which of ['fields', 'inputs']) block[which] = [...el(`custom-${which}`).children].map(row => {
      const [name, label, type, value] = row.querySelectorAll('input,select');
      return which === 'inputs' ? { name: name.value, label: label.value, check: type.value } : { name: name.value, label: label.value, type: type.value, default: type.value === 'number' ? (value.value.trim() ? Number(value.value) : null) : type.value === 'boolean' ? (value.value === 'true' ? true : value.value === 'false' ? false : null) : value.value };
    });
    mappingText = el('custom-mapping').value;
    if (['value', 'condition'].includes(block.kind)) { block.output = block.kind === 'condition' ? 'Boolean' : el('custom-output').value; block.expression = mappingText; delete block.ha; }
    else { delete block.output; delete block.expression; block.ha = JSON.parse(mappingText); }
  }
  function selectBlock() {
    const block = current(); updateBlockList(); el('custom-block-id').value = block.id; el('custom-label').value = block.label; el('custom-tooltip').value = block.tooltip; el('custom-kind').value = block.kind; el('custom-output').value = block.output || 'String';
    el('custom-output-label').hidden = ['action', 'trigger', 'condition'].includes(block.kind);
    el('custom-mapping').value = block.expression ?? JSON.stringify(block.ha, null, 2); mappingText = el('custom-mapping').value;
    entries('fields'); entries('inputs'); schedule();
  }
  function load(source, clean = false) {
    draft = structuredClone(source); active = 0;
    for (const name of ['id', 'version', 'name', 'author', 'license', 'description']) el(`custom-${name}`).value = draft[name];
    selectBlock(); if (clean) baseline = canonical(draft);
  }
  function changed() { try { readForm(); return canonical(draft) !== baseline || !!el('custom-import-code').value; } catch { return true; } }
  function close() { if (!changed() || confirm(uiText('Ungespeicherte Änderungen am Blockpaket verwerfen?'))) dialog.close(); }
  function renderPreview() {
    try {
      if (el('custom-import-code').value.trim()) throw new Error('Eingefügten Code zuerst mit JSON prüfen laden.');
      readForm(); const pkg = validatePackage(draft), block = pkg.blocks[active]; valid = pkg;
      const definition = blockDefinition(pkg, block, 'ugso_custom_editor_preview');
      preview.clear(); Blockly.Blocks.ugso_custom_editor_preview = { init() { this.jsonInit(definition); } };
      const visual = preview.newBlock('ugso_custom_editor_preview'); visual.initSvg(); visual.render(); visual.moveBy(24, 24);
      const defaults = new Map();
      for (const input of block.inputs) {
        const type = input.check === 'Number' ? 'ugso_number' : input.check === 'Boolean' ? 'ugso_boolean' : 'ugso_text';
        const child = preview.newBlock(type);
        if (type === 'ugso_number') child.setFieldValue(1, 'NUM'); else if (type === 'ugso_boolean') child.setFieldValue('true', 'BOOL'); else child.setFieldValue('Beispiel', 'TEXT');
        child.initSvg(); child.render(); visual.getInput(input.name).connection.connect(child.outputConnection);
        defaults.set(input.name, type === 'ugso_number' ? 1 : type === 'ugso_boolean' ? true : 'Beispiel');
      }
      Blockly.svgResize(preview); preview.zoomToFit(); if (preview.scale > 1) preview.setScale(1); preview.scrollCenter();
      const value = ['value', 'condition'].includes(block.kind) ? `{{ ${customExpression(block, visual, name => JSON.stringify(defaults.get(name)))} }}` : customNative(block, visual, name => defaults.get(name));
      const sample = { alias: 'Paketvorschau', mode: 'single', triggers: block.kind === 'trigger' ? [value] : [{ trigger: 'homeassistant', event: 'start' }], conditions: block.kind === 'condition' ? [{ condition: 'template', value_template: value }] : [], actions: block.kind === 'action' ? [value] : block.kind === 'value' ? [{ variables: { beispiel: value } }] : [{ delay: 0 }] };
      validateAutomation(sample);
      el('custom-ha-output').textContent = stringify(block.kind === 'value' ? { value_template: value } : block.kind === 'condition' ? sample.conditions[0] : value);
      el('custom-definition').textContent = JSON.stringify(blockDefinition(pkg, block), null, 2); el('custom-code').value = JSON.stringify(pkg, null, 2);
      for (const name of ['custom-apply', 'custom-copy', 'custom-export-json', 'custom-export-zip']) el(name).disabled = false;
      status(`${pkg.blocks.length} Blocks · Format geprüft · Jinja nicht ausgeführt. Bestehende Paket-IDs werden nicht überschrieben.`);
    } catch (error) {
      valid = undefined; el('custom-ha-output').textContent = ''; el('custom-code').value = ''; el('custom-definition').textContent = '';
      for (const name of ['custom-apply', 'custom-copy', 'custom-export-json', 'custom-export-zip']) el(name).disabled = true;
      status(error.message, true);
    }
  }
  function schedule() {
    clearTimeout(previewTimer); valid = undefined;
    for (const name of ['custom-apply', 'custom-copy', 'custom-export-json', 'custom-export-zip']) el(name).disabled = true;
    status('Vorschau wird geprüft …'); previewTimer = setTimeout(renderPreview, 180);
  }
  button.addEventListener('click', () => {
    el('custom-import-code').value = ''; const packages = installedPackages(); el('custom-installed').replaceChildren(new Option(uiText('Paket wählen …'), ''), ...packages.map(pkg => new Option(`${pkg.name} · ${pkg.version}`, pkg.id)));
    dialog.showModal();
    if (!preview) { preview = Blockly.inject('custom-workspace', { readOnly: true, theme: workspace.getTheme(), renderer: 'geras', media: './media/', scrollbars: true, zoom: { startScale: .9, maxScale: 1, minScale: .35 } }); new ResizeObserver(() => { if (dialog.open) Blockly.svgResize(preview); }).observe(el('custom-workspace')); }
    preview.setTheme(workspace.getTheme()); load(fresh(), true); el('custom-name').focus();
  });
  el('custom-close').addEventListener('click', close); el('custom-cancel').addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  el('custom-installed').addEventListener('change', () => { const pkg = installedPackages().find(pkg => pkg.id === el('custom-installed').value); if (pkg && (!changed() || confirm(uiText('Entwurf durch das geladene Paket ersetzen?')))) load(pkg, true); });
  el('custom-example').addEventListener('click', () => { if (!changed() || confirm(uiText('Entwurf durch das Beispiel ersetzen?'))) load(customExample); });
  el('custom-block').addEventListener('change', () => { try { readForm(); active = Number(el('custom-block').value); selectBlock(); } catch (error) { el('custom-block').value = String(active); status(error.message, true); } });
  el('custom-kind').addEventListener('change', () => {
    const kind = el('custom-kind').value; el('custom-output-label').hidden = ['action', 'trigger', 'condition'].includes(kind);
    el('custom-mapping').value = kind === 'action' ? '{"delay":1}' : kind === 'trigger' ? '{"trigger":"homeassistant","event":"start"}' : kind === 'condition' ? 'true' : "'Beispiel'"; schedule();
  });
  for (const control of dialog.querySelectorAll('.custom-settings > label input,.custom-settings > label textarea,.custom-meta input,.custom-meta select')) control.addEventListener('input', schedule);
  el('custom-add').addEventListener('click', () => { try { readForm(); if (draft.blocks.length >= 32) throw new Error('Höchstens 32 Blocks.'); let id = 1; while (draft.blocks.some(b => b.id === `block_${id}`)) id++; draft.blocks.push(emptyBlock(`block_${id}`)); active = draft.blocks.length - 1; selectBlock(); } catch (error) { status(error.message, true); } });
  el('custom-remove').addEventListener('click', () => { try { readForm(); if (draft.blocks.length === 1) throw new Error('Mindestens einen Block behalten.'); draft.blocks.splice(active, 1); active = Math.min(active, draft.blocks.length - 1); selectBlock(); } catch (error) { status(error.message, true); } });
  for (const which of ['field', 'input']) el(`custom-${which}-add`).addEventListener('click', () => {
    try { readForm(); const list = current()[`${which}s`], limit = which === 'field' ? 12 : 8; if (list.length >= limit) throw new Error(`Höchstens ${limit} ${which === 'field' ? 'Felder' : 'Eingänge'}.`); let index = 1; while ([...current().fields, ...current().inputs].some(item => item.name === `VALUE${index}`)) index++;
      list.push(which === 'field' ? { name: `VALUE${index}`, label: 'Wert', type: 'text', default: 'Beispiel' } : { name: `VALUE${index}`, label: 'Wert', check: 'Number' }); entries(`${which}s`); schedule();
    } catch (error) { status(error.message, true); }
  });
  el('custom-import').addEventListener('click', () => { try { const pkg = validatePackage(el('custom-import-code').value); load(pkg); el('custom-import-code').value = ''; } catch (error) { status(error.message, true); } });
  el('custom-import-code').addEventListener('input', schedule);
  el('custom-zip-open').addEventListener('click', () => el('custom-zip-file').click());
  el('custom-zip-file').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try { if (file.size > 1000000) throw new Error('ZIP: höchstens 1 MB.'); const pkg = await readPackageZip(new Uint8Array(await file.arrayBuffer())); load(pkg); el('custom-import-code').value = ''; } catch (error) { status(error.message, true); } finally { event.target.value = ''; }
  });
  el('custom-copy').addEventListener('click', async () => { renderPreview(); if (!valid) return; try { await navigator.clipboard.writeText(el('custom-code').value); status('Paket-JSON kopiert.'); } catch { el('custom-code').focus(); el('custom-code').select(); status('Code markieren und mit Strg+C kopieren.'); } });
  for (const format of ['json', 'zip']) el(`custom-export-${format}`).addEventListener('click', () => { renderPreview(); if (!valid) return; download(format === 'json' ? JSON.stringify(valid, null, 2) : packageZip(valid), `${valid.id}-${valid.version}.${format}`, format === 'json' ? 'application/json' : 'application/zip'); status('Paket heruntergeladen. Veröffentlichung erfolgt erst nach Prüfung im Katalog.'); });
  el('custom-apply').addEventListener('click', () => {
    renderPreview(); if (!valid) return;
    try { const warning = install(valid); baseline = canonical(draft); dialog.close(); notice(warning || 'Blockpaket übernommen. Blocks stehen unter Benutzerdefiniert.'); } catch (error) { status(error.message, true); }
  });
  return dialog;
}
