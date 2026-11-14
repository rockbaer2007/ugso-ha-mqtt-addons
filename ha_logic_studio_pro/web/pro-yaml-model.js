import {parseDocument, stringify} from './vendor/pro-yaml.js';

// Home Assistant's YAML editor can interpret unquoted on/off and times as YAML 1.1 scalars.
const stringifyForHa = config => stringify(config, {version: '1.1'});

const identifier = /^[a-z0-9_]+\.[a-z0-9_]+$/;
const modes = new Set(['single', 'restart', 'queued', 'parallel']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const provided = value => typeof value === 'string' && value.trim() !== '';

function duration(value) {
  const seconds = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(seconds) || seconds <= 0) {
    throw new Error('Dauer in ganzen Sekunden größer als null eingeben.');
  }
  return {seconds};
}

function numericLimits({above, below}, invalidMessage) {
  const limits = {};
  for (const [key, value] of [['above', above], ['below', below]]) {
    if (!provided(value)) continue;
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value) || !Number.isFinite(Number(value))) {
      throw new Error(invalidMessage);
    }
    limits[key] = Number(value);
  }
  if (!Object.keys(limits).length || (limits.above !== undefined && limits.below !== undefined && limits.above >= limits.below)) {
    throw new Error('Mindestens eine gültige Zahlengrenze eingeben. „Über“ muss kleiner als „Unter“ sein.');
  }
  return limits;
}

function ruleCondition(entry) {
  const {type, entity, state, attribute} = entry;
  if (!identifier.test(entity || '')) throw new Error('Gültige Bedingungsentität eingeben.');
  const target = {entity_id: entity, ...(provided(attribute) ? {attribute} : {})};
  if (type === 'numeric') {
    return {condition: 'numeric_state', ...target, ...numericLimits(entry, 'Eine gültige Zahl für die Bedingung eingeben.')};
  }
  if (!provided(state)) throw new Error('Einen Zustand für die Bedingung eingeben.');
  return {condition: 'state', ...target, state};
}

function ruleAction({type, action, entity, data, seconds}) {
  if (type === 'delay') return {delay: duration(seconds)};
  if (!identifier.test(action || '') || (provided(entity) && !identifier.test(entity))) {
    throw new Error('Gültige HA-Aktion und gegebenenfalls Ziel-Entität eingeben.');
  }
  const result = {action};
  if (provided(entity)) result.target = {entity_id: entity};
  if (provided(data)) {
    try { result.data = JSON.parse(data); }
    catch { throw new Error('Aktionsparameter als gültiges JSON-Objekt eingeben.'); }
    if (!object(result.data)) throw new Error('Aktionsparameter als gültiges JSON-Objekt eingeben.');
  }
  return result;
}

export function readRuleFields(fields) {
  if (!object(fields)) throw new Error('Ungültige Rules-Datei.');
  if (Object.hasOwn(fields, 'triggers')) {
    const actionFields = ['type', 'action', 'entity', 'data', 'seconds'];
    const lists = {triggers: ['type', 'entity', 'state', 'from', 'attribute', 'seconds', 'time', 'event', 'above', 'below', 'offsetMinutes', 'topic', 'payload'],
      conditions: ['type', 'entity', 'state', 'attribute', 'above', 'below'],
      actions: actionFields, elseActions: actionFields};
    const types = {triggers: ['state', 'time', 'helper_time', 'event', 'numeric', 'sun', 'mqtt'], conditions: ['state', 'numeric'],
      actions: ['action', 'delay'], elseActions: ['action', 'delay']};
    const rule = {conditionMode: fields.conditionMode};
    if (!['and', 'or', 'not'].includes(rule.conditionMode)) throw new Error('Ungültige Rules-Datei.');
    for (const [key, names] of Object.entries(lists)) {
      if (!Array.isArray(fields[key])) throw new Error('Ungültige Rules-Datei.');
      rule[key] = fields[key].map(entry => {
        if (!object(entry) || Object.values(entry).some(value => typeof value !== 'string') ||
            (entry.type !== undefined && !types[key].includes(entry.type))) {
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
  if (rule.triggers.some(t => t.type === 'mqtt')) {
    throw new Error('Rules → JS: Der MQTT-Auslöser benötigt HA-YAML.');
  }
  if (rule.triggers.some(t => t.type === 'sun')) {
    throw new Error('Rules → JS: Sonnenaufgang und Sonnenuntergang benötigen HA-YAML.');
  }
  if (rule.triggers.some(t => t.type === 'numeric')) {
    throw new Error('Rules → JS: Zahlenschwellen als Auslöser benötigen HA-YAML.');
  }
  if (rule.triggers.some(t => provided(t.from) || provided(t.attribute) || provided(t.seconds) ||
      ((!t.type || t.type === 'state') && !provided(t.state)))) {
    throw new Error('Rules → JS: Der erweiterte Zustandsauslöser benötigt HA-YAML.');
  }
  if (rule.conditions.some(c => c.type === 'numeric' || provided(c.attribute))) {
    throw new Error('Rules → JS: Zahlen- und Attributbedingungen benötigen HA-YAML.');
  }
  if ([...rule.actions, ...rule.elseActions].some(a => a.type === 'delay' || provided(a.data) || !provided(a.entity))) {
    throw new Error('Rules → JS: Verzögerungen und Aktionen mit Parametern oder ohne Ziel benötigen HA-YAML.');
  }
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
    } else if (trigger.type === 'helper_time') {
      lines.push('ha.scheduleFromDateTime(' + literal(trigger.entity) + ', runRule);');
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
  const actionList = list => list.map(ruleAction);
  if (elseActions.length && !conditions.length) throw new Error('Der SONST-Zweig benötigt eine Bedingung.');
  if (!['and', 'or', 'not'].includes(conditionMode)) throw new Error('Ungültige Bedingungsverknüpfung.');
  const states = conditions.map(ruleCondition);
  const checks = conditionMode === 'and' || !states.length ? states : [{condition: conditionMode, conditions: states}];
  let sequence = actionList(actions);
  if (elseActions.length) sequence = [{if: checks, then: sequence, else: actionList(elseActions)}];
  else if (kind === 'script') sequence = [...checks, ...sequence];
  const config = {alias: name, mode: 'single'};
  if (kind === 'script') return stringifyForHa({...config, sequence});
  if (!triggers.length) throw new Error('Für eine HA-Automation einen Auslöser hinzufügen.');
  return stringifyForHa({
    ...config,
    triggers: triggers.map(entry => {
      const {entity, state, from, attribute, seconds, type, time, event} = entry;
      if (type === 'mqtt') {
        const {topic, payload} = entry;
        if (!provided(topic) || topic.includes('\0') || new TextEncoder().encode(topic).length > 65535 ||
            !topic.split('/').every((level, index, levels) =>
              level === '+' || (level === '#' && index === levels.length - 1) || !/[+#]/.test(level))) {
          throw new Error('Ein gültiges MQTT-Topic eingeben.');
        }
        return {trigger: 'mqtt', topic, ...(payload ? {payload} : {})};
      }
      if (type === 'helper_time') {
        if (!/^input_datetime\.[a-z0-9_]+$/.test(entity || '')) {
          throw new Error('Einen Datum- und Uhrzeithelfer (input_datetime) auswählen.');
        }
        return {trigger: 'time', at: entity};
      }
      if (type === 'sun') {
        if (!['sunrise', 'sunset'].includes(event)) throw new Error('Sonnenaufgang oder Sonnenuntergang auswählen.');
        const offsetMinutes = entry.offsetMinutes ?? '';
        const offset = Number(offsetMinutes) * 60;
        if (offsetMinutes !== '' && (!/^[+-]?\d+$/.test(offsetMinutes) || !Number.isSafeInteger(offset))) {
          throw new Error('Zeitversatz in ganzen Minuten eingeben.');
        }
        return {trigger: 'sun', event, ...(offset ? {offset} : {})};
      }
      if (type === 'time') {
        if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Uhrzeit im Format HH:MM eingeben.');
        return {trigger: 'time', at: time + ':00'};
      }
      if (type === 'event') {
        if (!/^[a-zA-Z0-9_]+$/.test(event || '')) throw new Error('Gültigen HA-Ereignistyp eingeben.');
        return {trigger: 'event', event_type: event};
      }
      if (!identifier.test(entity || '')) throw new Error('Gültige Auslöserentität eingeben.');
      if (type === 'numeric') {
        const limits = numericLimits(entry, 'Eine gültige Zahl für den Auslöser eingeben.');
        const trigger = {trigger: 'numeric_state', entity_id: entity, ...limits};
        if (provided(attribute)) trigger.attribute = attribute;
        if (provided(seconds)) trigger.for = duration(seconds);
        return trigger;
      }
      const trigger = {trigger: 'state', entity_id: entity};
      if (provided(attribute)) trigger.attribute = attribute;
      if (provided(from)) trigger.from = from;
      if (provided(state)) trigger.to = state;
      if (!provided(from) && !provided(state)) trigger.to = null;
      if (provided(seconds)) trigger.for = duration(seconds);
      return trigger;
    }),
    conditions: elseActions.length ? [] : checks,
    actions: sequence,
  });
}
