import {parseDocument, stringify} from './vendor/pro-yaml.js';

const identifier = /^[a-z0-9_]+\.[a-z0-9_]+$/;
const modes = new Set(['single', 'restart', 'queued', 'parallel']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function readRuleFields(fields) {
  if (!object(fields)) throw new Error('Ungültige Rules-Datei.');
  if (Object.hasOwn(fields, 'triggers')) {
    const lists = {triggers: ['type', 'entity', 'state', 'time', 'event'],
      conditions: ['entity', 'state'], actions: ['action', 'entity'], elseActions: ['action', 'entity']};
    const rule = {conditionMode: fields.conditionMode};
    if (!['and', 'or', 'not'].includes(rule.conditionMode)) throw new Error('Ungültige Rules-Datei.');
    for (const [key, names] of Object.entries(lists)) {
      if (!Array.isArray(fields[key])) throw new Error('Ungültige Rules-Datei.');
      rule[key] = fields[key].map(entry => {
        if (!object(entry) || Object.values(entry).some(value => typeof value !== 'string') ||
            (key === 'triggers' && !['state', 'time', 'event'].includes(entry.type))) {
          throw new Error('Ungültige Rules-Datei.');
        }
        return Object.fromEntries(names.filter(name => Object.hasOwn(entry, name)).map(name => [name, entry[name]]));
      });
    }
    return rule;
  }
  if (Object.values(fields).some(value => typeof value !== 'string')) throw new Error('Ungültige Rules-Datei.');
  const state = key => ({entity: fields[key + 'Entity'] || '', state: fields[key + 'State'] || ''});
  const action = key => ({entity: fields[key + 'Entity'] || '', action: fields[key + 'Action'] || ''});
  const triggers = [];
  if (fields.triggerType === 'time') triggers.push({type: 'time', time: fields.triggerTime || ''});
  else if (fields.triggerType === 'event') triggers.push({type: 'event', event: fields.triggerEvent || ''});
  else if (fields.triggerEntity || fields.triggerState) triggers.push({type: 'state', ...state('trigger')});
  return {
    triggers,
    conditionMode: 'and',
    conditions: fields.conditionEntity || fields.conditionState ? [state('condition')] : [],
    actions: fields.thenEntity || fields.thenAction ? [action('then')] : [],
    elseActions: fields.elseEntity || fields.elseAction ? [action('else')] : [],
  };
}

export function makeRulesJavaScript(name, rule) {
  makeYaml({name, kind: 'automation', ...rule});
  const literal = JSON.stringify;
  const matches = ({entity, state}) => 'ha.readState(' + literal(entity) + ') === ' + literal(state);
  const calls = (actions, indent) => actions.map(({action, entity}) =>
    indent + 'ha.callAction(' + literal(action) + ', ' + literal(entity) + ');');
  const lines = ['function runRule() {'];
  if (rule.conditions.length) {
    let check = rule.conditions.map(matches).join(rule.conditionMode === 'and' ? ' && ' : ' || ');
    if (rule.conditionMode === 'not') check = '!(' + check + ')';
    lines.push('  if (' + check + ') {', ...calls(rule.actions, '    '));
    if (rule.elseActions.length) lines.push('  } else {', ...calls(rule.elseActions, '    '));
    lines.push('  }');
  } else {
    lines.push(...calls(rule.actions, '  '));
  }
  lines.push('}', '');
  for (const trigger of rule.triggers) {
    if (trigger.type === 'time') {
      lines.push('ha.schedule(' + literal({trigger: 'time', at: trigger.time + ':00'}) + ', runRule);');
    } else if (trigger.type === 'event') {
      lines.push('ha.onEvent(' + literal(trigger.event) + ', runRule);');
    } else {
      lines.push('ha.onState(' + literal(trigger.entity) + ', () => {',
        '  if (' + matches(trigger) + ') runRule();', '});');
    }
  }
  return lines.join('\n') + '\n';
}

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

export function makeYaml({name, kind, triggers = [], condition, conditions = condition ? [condition] : [],
  conditionMode = 'and', actions, otherwise, elseActions = otherwise ? [otherwise] : []}) {
  if (!actions.length) throw new Error('Mindestens eine HA-Aktion hinzufügen.');
  const actionList = list => list.map(({action, entity}) => {
    if (!identifier.test(action || '') || !identifier.test(entity || '')) throw new Error('Gültige Aktion und Ziel-Entität eingeben.');
    return {action, target: {entity_id: entity}};
  });
  if (elseActions.length && !conditions.length) throw new Error('Der SONST-Zweig benötigt eine Bedingung.');
  if (!['and', 'or', 'not'].includes(conditionMode)) throw new Error('Ungültige Bedingungsverknüpfung.');
  const states = conditions.map(({entity, state}) => {
    if (!identifier.test(entity || '') || !state?.trim()) throw new Error('Gültige Bedingungsentität und Zustand eingeben.');
    return {condition: 'state', entity_id: entity, state};
  });
  const checks = conditionMode === 'and' || !states.length ? states : [{condition: conditionMode, conditions: states}];
  let sequence = actionList(actions);
  if (elseActions.length) sequence = [{if: checks, then: sequence, else: actionList(elseActions)}];
  else if (kind === 'script') sequence = [...checks, ...sequence];
  const config = {alias: name, mode: 'single'};
  if (kind === 'script') return stringify({...config, sequence});
  if (!triggers.length) throw new Error('Für eine HA-Automation einen Auslöser hinzufügen.');
  return stringify({
    ...config,
    triggers: triggers.map(({entity, state, type, time, event}) => {
      if (type === 'time') {
        if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Uhrzeit im Format HH:MM eingeben.');
        return {trigger: 'time', at: time + ':00'};
      }
      if (type === 'event') {
        if (!/^[a-zA-Z0-9_]+$/.test(event || '')) throw new Error('Gültigen HA-Ereignistyp eingeben.');
        return {trigger: 'event', event_type: event};
      }
      if (!identifier.test(entity || '') || !state?.trim()) throw new Error('Gültige Auslöserentität und Zustand eingeben.');
      return {trigger: 'state', entity_id: entity, to: state};
    }),
    conditions: elseActions.length ? [] : checks,
    actions: sequence,
  });
}
