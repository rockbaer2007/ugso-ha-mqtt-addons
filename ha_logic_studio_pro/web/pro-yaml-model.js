import {parseDocument, stringify} from './vendor/pro-yaml.js';

const identifier = /^[a-z0-9_]+\.[a-z0-9_]+$/;
const modes = new Set(['single', 'restart', 'queued', 'parallel']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function validateYaml(source, kind) {
  if (!['script', 'automation'].includes(kind)) throw new Error('HA-YAML-Typ ist ungültig.');
  if (!source.trim() || new TextEncoder().encode(source).length > 1_000_000) {
    throw new Error('Eine YAML-Konfiguration mit höchstens 1 MB eingeben.');
  }
  const doc = parseDocument(source, {uniqueKeys: true});
  const problem = doc.errors[0] || doc.warnings[0];
  if (problem) throw new Error(problem.message);
  const data = doc.toJS({maxAliasCount: 30});
  let entries;
  if (kind === 'script') {
    if (!object(data)) throw new Error('Ein Skript oder eine Zuordnung benannter Skripte wird erwartet.');
    entries = Object.hasOwn(data, 'sequence') ? [data] : Object.entries(data).map(([key, entry]) => {
      if (!/^[a-z0-9_]+$/.test(key) || ['reload', 'turn_on', 'turn_off', 'toggle'].includes(key)) {
        throw new Error('Ungültiger Skriptschlüssel: ' + key);
      }
      return entry;
    });
  } else {
    entries = Array.isArray(data) ? data : [data];
  }
  if (!entries.length) throw new Error('Mindestens einen HA-Eintrag eingeben.');
  for (const entry of entries) {
    if (!object(entry)) throw new Error('Jeder HA-Eintrag muss ein YAML-Objekt sein.');
    if (entry.mode !== undefined && !modes.has(entry.mode)) throw new Error('Ungültiger HA-Ausführungsmodus.');
    const actions = kind === 'script' ? entry.sequence : entry.actions ?? entry.action;
    if (!Array.isArray(actions) || !actions.length || !actions.every(object)) {
      throw new Error(kind === 'script' ? 'Ein Skript benötigt eine nicht leere sequence mit Aktionen.' :
        'Eine Automation benötigt eine nicht leere actions-Liste.');
    }
    if (kind === 'automation') {
      const triggers = entry.triggers ?? entry.trigger;
      if (!Array.isArray(triggers) || !triggers.length || !triggers.every(object)) {
        throw new Error('Eine Automation benötigt mindestens einen Auslöser in triggers.');
      }
      if (entry.conditions !== undefined && !Array.isArray(entry.conditions)) {
        throw new Error('conditions muss eine Liste sein.');
      }
    }
  }
  return entries.length;
}

export function makeYaml({name, kind, triggers = [], condition, actions, otherwise}) {
  if (!actions.length) throw new Error('Mindestens eine HA-Aktion hinzufügen.');
  const actionList = list => list.map(({action, entity}) => {
    if (!identifier.test(action) || !identifier.test(entity)) throw new Error('Gültige Aktion und Ziel-Entität eingeben.');
    return {action, target: {entity_id: entity}};
  });
  if (otherwise && !condition) throw new Error('Der SONST-Zweig benötigt eine Bedingung.');
  const checks = condition ? [{condition: 'state', entity_id: condition.entity, state: condition.state}] : [];
  if (condition && (!identifier.test(condition.entity) || !condition.state.trim())) {
    throw new Error('Gültige Bedingungsentität und Zustand eingeben.');
  }
  let sequence = actionList(actions);
  if (otherwise) sequence = [{if: checks, then: sequence, else: actionList([otherwise])}];
  else if (kind === 'script') sequence = [...checks, ...sequence];
  const config = {alias: name, mode: 'single'};
  if (kind === 'script') return stringify({...config, sequence});
  if (!triggers.length) throw new Error('Für eine HA-Automation einen Auslöser hinzufügen.');
  return stringify({
    ...config,
    triggers: triggers.map(({entity, state}) => {
      if (!identifier.test(entity) || !state.trim()) throw new Error('Gültige Auslöserentität und Zustand eingeben.');
      return {trigger: 'state', entity_id: entity, to: state};
    }),
    conditions: otherwise ? [] : checks,
    actions: sequence,
  });
}
