import { zipSync, strToU8, strFromU8, Unzip, UnzipInflate } from 'fflate';
import { validateAutomation } from './model.js';

export const packageFormat = 'ugso-ha-block-package';
export const packageStoreKey = 'ugso-ha-block-packages-v1';
const idPattern = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const namePattern = /^[A-Z][A-Z0-9_]{0,31}$/;
const outputTypes = ['Number', 'String', 'Boolean', 'Value'];
const fieldTypes = ['text', 'number', 'boolean', 'entity'];
const installed = new Map(), recipes = new Map();
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
const fail = message => { throw new Error(`Blockpaket: ${message}`); };
function keys(value, allowed, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label}: Objekt erwartet.`);
  if (Object.keys(value).some(key => !allowed.includes(key) || forbidden.has(key))) fail(`${label}: unbekannte oder unzulässige Eigenschaften.`);
}
function text(value, max, label, empty = false) {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim())) fail(`${label}: gültiger Text bis ${max} Zeichen erforderlich.`);
}
function list(value, max, label) { if (!Array.isArray(value) || value.length > max) fail(`${label}: höchstens ${max} Einträge.`); }
export function blockType(pkg, block) { return `ugso_custom_${pkg.id}__${block.id}`; }
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
function checkTree(value, fields, inputs, depth = 0) {
  if (depth > 12) fail('HA-Zuordnung ist zu tief verschachtelt.');
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return;
  if (Array.isArray(value)) { list(value, 100, 'HA-Liste'); value.forEach(v => checkTree(v, fields, inputs, depth + 1)); return; }
  if (!value || typeof value !== 'object') fail('HA-Zuordnung: JSON-Wert erwartet.');
  const names = Object.keys(value);
  if (names.length > 100 || names.some(k => forbidden.has(k))) fail('HA-Zuordnung enthält unzulässige Schlüssel.');
  for (const token of ['$field', '$input']) {
    if (Object.hasOwn(value, token)) {
      if (names.length !== 1 || !(token === '$field' ? fields : inputs).has(value[token])) fail(`${token}: Feld/Eingang fehlt.`);
      return;
    }
  }
  if (names.some(k => k.startsWith('$'))) fail('Unbekannter Platzhalter in der HA-Zuordnung.');
  Object.values(value).forEach(v => checkTree(v, fields, inputs, depth + 1));
}
export function validatePackage(source) {
  if (typeof source === 'string') {
    if (source.length > 500000) fail('JSON ist größer als 500 KB.');
    try { source = JSON.parse(source); } catch { fail('Ungültiges JSON.'); }
  }
  keys(source, ['format', 'schemaVersion', 'id', 'version', 'name', 'description', 'author', 'license', 'dependencies', 'blocks'], 'Paket');
  if (source.format !== packageFormat || source.schemaVersion !== 1) fail('Paketformat oder Schema-Version wird nicht unterstützt.');
  text(source.id, 40, 'Paket-ID'); if (!idPattern.test(source.id)) fail('Paket-ID: kleine ASCII-Buchstaben, Ziffern und einzelne Unterstriche.');
  if (!/^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(source.version)) fail('Version im Format 1.0.0 erwartet.');
  for (const key of ['name', 'author', 'license']) text(source[key], 120, key);
  text(source.description, 4000, 'Beschreibung');
  list(source.dependencies, 8, 'Abhängigkeiten');
  const deps = new Set();
  for (const dep of source.dependencies) {
    keys(dep, ['id', 'version'], 'Abhängigkeit');
    if (!idPattern.test(dep.id) || dep.id.length > 40 || dep.id === source.id || deps.has(dep.id) || !/^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(dep.version)) fail('Abhängigkeit ungültig oder doppelt.');
    deps.add(dep.id);
  }
  list(source.blocks, 32, 'Blocks'); if (!source.blocks.length) fail('Mindestens ein Block erforderlich.');
  const ids = new Set();
  for (const block of source.blocks) {
    keys(block, ['id', 'label', 'tooltip', 'kind', 'output', 'fields', 'inputs', 'expression', 'ha'], 'Block');
    text(block.id, 40, 'Block-ID'); if (!idPattern.test(block.id) || ids.has(block.id)) fail('Block-ID ungültig oder doppelt.'); ids.add(block.id);
    text(block.label, 120, 'Blockname'); text(block.tooltip, 1000, 'Hinweis', true);
    if (!['value', 'condition', 'action', 'trigger'].includes(block.kind)) fail('Blockart wird nicht unterstützt.');
    list(block.fields, 12, 'Felder'); list(block.inputs, 8, 'Eingänge');
    const fields = new Set(), inputs = new Set();
    for (const field of block.fields) {
      keys(field, ['name', 'label', 'type', 'default'], 'Feld');
      if (!namePattern.test(field.name) || fields.has(field.name)) fail('Feldname ungültig oder doppelt.'); fields.add(field.name);
      text(field.label, 80, 'Feldbeschriftung'); if (!fieldTypes.includes(field.type)) fail('Feldtyp wird nicht unterstützt.');
      if (field.type === 'number') { if (typeof field.default !== 'number' || !Number.isFinite(field.default)) fail('Zahlenfeld braucht eine endliche Zahl.'); }
      else if (field.type === 'boolean') { if (typeof field.default !== 'boolean') fail('Boolean-Feld braucht true oder false.'); }
      else { text(field.default, 4096, 'Feld-Standardwert', true); if (field.type === 'entity' && !/^[a-z][a-z0-9_]*\.[a-z0-9_]+$/.test(field.default)) fail('Entitätsfeld braucht eine domain.name-ID.'); }
    }
    for (const input of block.inputs) {
      keys(input, ['name', 'label', 'check'], 'Eingang');
      if (!namePattern.test(input.name) || inputs.has(input.name) || fields.has(input.name)) fail('Eingangsname ungültig oder doppelt.'); inputs.add(input.name);
      text(input.label, 80, 'Eingangsbeschriftung'); if (!outputTypes.includes(input.check)) fail('Anschlusstyp wird nicht unterstützt.');
    }
    if (['value', 'condition'].includes(block.kind)) {
      if (block.kind === 'value' && !outputTypes.includes(block.output)) fail('Output-Typ fehlt.');
      if (block.kind === 'condition' && block.output !== 'Boolean') fail('Bedingung braucht Boolean-Output.');
      if (Object.hasOwn(block, 'ha')) fail('Wert-/Bedingungsblock verwendet expression, keine HA-Aktion.');
      text(block.expression, 8192, 'Jinja-Ausdruck');
      if (/\{[{%]|[%}]\}/.test(block.expression)) fail('Jinja-Ausdruck ohne {{ }} oder {% %} eingeben.');
      for (const match of block.expression.matchAll(/\$\{([^}]+)\}/g)) if (!fields.has(match[1]) && !inputs.has(match[1])) fail(`Platzhalter ${match[1]} fehlt.`);
      if (block.expression.replace(/\$\{[^}]+\}/g, '').includes('${')) fail('Unvollständiger Platzhalter.');
    } else {
      if (Object.hasOwn(block, 'expression') || Object.hasOwn(block, 'output')) fail('Aktions-/Auslöserblock braucht nur ha.');
      keys(block.ha, Object.keys(block.ha || {}), 'HA-Zuordnung'); checkTree(block.ha, fields, inputs);
    }
    if (['action', 'trigger'].includes(block.kind)) {
      const defaults = { getFieldValue: name => { const field = block.fields.find(f => f.name === name); return field.type === 'boolean' ? (field.default ? 'TRUE' : 'FALSE') : String(field.default); } };
      const native = customNative(block, defaults, name => { const input = block.inputs.find(i => i.name === name); return input.check === 'Number' ? 1 : input.check === 'Boolean' ? true : 'Beispiel'; });
      try { validateAutomation({ alias: 'Paketprüfung', mode: 'single', triggers: block.kind === 'trigger' ? [native] : [{ trigger: 'homeassistant', event: 'start' }], conditions: [], actions: block.kind === 'action' ? [native] : [{ delay: 0 }] }); }
      catch (error) { fail(`${block.id}: HA-Zuordnung mit Standardwerten ungültig: ${error.message}`); }
    }
  }
  const encoded = JSON.stringify(source); if (encoded.length > 500000) fail('Paket ist größer als 500 KB.');
  return JSON.parse(encoded);
}
export function blockDefinition(pkg, block, type = blockType(pkg, block)) {
  const escaped = text => text.replaceAll('%', '%%');
  const args = [], messages = [escaped(block.label)];
  for (const field of block.fields) {
    const config = field.type === 'number' ? { type: 'field_number', value: field.default } : field.type === 'boolean' ? { type: 'field_checkbox', checked: field.default } : { type: field.type === 'entity' ? 'ugso_field_entity' : 'field_input', text: field.default };
    args.push({ ...config, name: field.name }); messages.push(`${escaped(field.label)} %${args.length}`);
  }
  for (const input of block.inputs) { args.push({ type: 'input_value', name: input.name, check: input.check === 'Value' ? null : input.check }); messages.push(`${escaped(input.label)} %${args.length}`); }
  const connection = block.kind === 'action' ? { previousStatement: 'Action', nextStatement: 'Action' } : block.kind === 'trigger' ? { previousStatement: 'Trigger', nextStatement: 'Trigger' } : { output: block.output === 'Value' ? 'Value' : [block.output, 'Value'] };
  return { type, message0: messages.join(' '), args0: args, inputsInline: false, tooltip: block.tooltip, style: block.kind === 'action' ? 'ugso_action' : block.kind === 'trigger' ? 'ugso_trigger' : block.kind === 'condition' ? 'ugso_logic' : 'ugso_template', ...connection };
}
export function customDefinition(type) { return recipes.get(type); }
export function installedPackages() { return [...installed.values()].map(p => structuredClone(p)); }
export function withPackages(Blockly, sources, operation = () => {}) {
  list(sources, 16, 'Pakete');
  const validated = sources.map(validatePackage), candidates = new Map(installed);
  if (new Set(validated.map(pkg => pkg.id)).size !== validated.length) fail('Doppelte Paket-IDs im Import.');
  for (const pkg of validated) {
    if (candidates.has(pkg.id) && canonical(candidates.get(pkg.id)) !== canonical(pkg)) fail(`Paket-ID ${pkg.id} ist bereits mit anderem Inhalt geladen. Neue Paket-ID verwenden.`);
    candidates.set(pkg.id, pkg);
  }
  if (candidates.size > 16) fail('Höchstens 16 installierte Pakete.');
  for (const pkg of candidates.values()) for (const dep of pkg.dependencies) if (candidates.get(dep.id)?.version !== dep.version) fail(`Abhängigkeit ${dep.id} ${dep.version} fehlt.`);
  const visiting = new Set(), visited = new Set();
  function visit(pkg) { if (visiting.has(pkg.id)) fail('Zyklische Paketabhängigkeit.'); if (visited.has(pkg.id)) return; visiting.add(pkg.id); pkg.dependencies.forEach(dep => visit(candidates.get(dep.id))); visiting.delete(pkg.id); visited.add(pkg.id); }
  candidates.forEach(visit);
  const added = [];
  try {
    for (const pkg of validated) {
      if (installed.has(pkg.id)) continue;
      for (const block of pkg.blocks) {
        const type = blockType(pkg, block);
        if (Blockly.Blocks[type]) fail(`Block-ID ${type} existiert bereits.`);
        Blockly.Blocks[type] = { init() { this.jsonInit(blockDefinition(pkg, block)); } };
        recipes.set(type, block); added.push(type);
      }
    }
    const result = operation();
    for (const pkg of validated) installed.set(pkg.id, pkg);
    return result;
  } catch (error) { for (const type of added) { delete Blockly.Blocks[type]; recipes.delete(type); } throw error; }
}
export function usedPackages(workspace) {
  const types = new Set(workspace.getAllBlocks(false).map(block => block.type)), ids = new Set();
  function add(pkg) { if (ids.has(pkg.id)) return; ids.add(pkg.id); pkg.dependencies.forEach(dep => add(installed.get(dep.id))); }
  for (const pkg of installed.values()) if (pkg.blocks.some(block => types.has(blockType(pkg, block)))) add(pkg);
  return installedPackages().filter(pkg => ids.has(pkg.id));
}
export function customExpression(definition, block, inputExpression) {
  return '(' + definition.expression.replace(/\$\{([^}]+)\}/g, (_, name) => {
    const field = definition.fields.find(f => f.name === name);
    if (!field) return '(' + inputExpression(name) + ')';
    const value = fieldValue(field, block);
    return value === true ? 'true' : value === false ? 'false' : JSON.stringify(value);
  }) + ')';
}
function fieldValue(field, block) {
  const raw = block.getFieldValue(field.name);
  if (field.type === 'number') { const value = Number(raw); if (!Number.isFinite(value)) fail('Ungültiges Zahlenfeld.'); return value; }
  if (field.type === 'boolean') return raw === 'TRUE';
  const value = String(raw);
  if (field.type === 'entity' && !/^[a-z][a-z0-9_]*\.[a-z0-9_]+$/.test(value)) fail('Ungültige Entitäts-ID.');
  return value;
}
export function customNative(definition, block, inputValue) {
  function resolve(value) {
    if (Array.isArray(value)) return value.map(resolve);
    if (!value || typeof value !== 'object') return value;
    if (Object.hasOwn(value, '$field')) return fieldValue(definition.fields.find(f => f.name === value.$field), block);
    if (Object.hasOwn(value, '$input')) return inputValue(value.$input);
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, resolve(val)]));
  }
  return resolve(definition.ha);
}
export function packageZip(source) {
  const pkg = validatePackage(source);
  return zipSync({ 'block-package.json': strToU8(JSON.stringify(pkg, null, 2)), 'README.md': strToU8(`# ${pkg.name}\n\n${pkg.description}\n\nVersion: ${pkg.version}\nAutor: ${pkg.author}\nLizenz: ${pkg.license}\n\nIn UGSo Blocks for HA ab 0.1.18: Block-/Template-Editor > ZIP einlesen > Prüfen > Übernehmen.\nJinja wird erst in Home Assistant ausgewertet.\n`) }, { level: 6 });
}
export async function readPackageZip(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length > 1000000) fail('ZIP: höchstens 1 MB.');
  const files = new Map(); let total = 0, error, pending = 0;
  const unzip = new Unzip(file => {
    if (!['block-package.json', 'README.md'].includes(file.name) || files.has(file.name)) { error = new Error('Blockpaket: ZIP enthält doppelte oder unbekannte Dateien.'); return; }
    if (file.originalSize > 1000000) { error = new Error('Blockpaket: Entpacktes ZIP ist zu groß.'); return; }
    pending++; const chunks = []; files.set(file.name, chunks);
    file.ondata = (err, chunk, final) => {
      if (err) { error = err; return; }
      total += chunk.length;
      if (total > 1000000) { file.terminate(); error = new Error('Blockpaket: Entpacktes ZIP ist zu groß.'); return; }
      chunks.push(chunk); if (final) pending--;
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  try {
    for (let offset = 0; offset < bytes.length && !error; offset += 1024) unzip.push(bytes.subarray(offset, offset + 1024), offset + 1024 >= bytes.length);
  } catch { fail('ZIP ist beschädigt oder nicht unterstützt.'); }
  if (error) throw error;
  if (pending || !files.has('block-package.json')) fail('ZIP ist unvollständig; block-package.json fehlt.');
  const chunks = files.get('block-package.json'), data = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0)); let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  return validatePackage(strFromU8(data));
}
