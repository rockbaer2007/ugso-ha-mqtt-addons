import {parseDocument, stringify} from './vendor/pro-yaml.js';

// Home Assistant's YAML editor can interpret unquoted on/off and times as YAML 1.1 scalars.
const stringifyForHa = config => stringify(config, {version: '1.1'});

const identifier = /^[a-z0-9_]+\.[a-z0-9_]+$/;
const modes = new Set(['single', 'restart', 'queued', 'parallel']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const provided = value => typeof value === 'string' && value.trim() !== '';
export const ruleWeekdays = Object.freeze(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
const conditionModes = ['and', 'or', 'not'];
export const maxRuleGroupDepth = 8;

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

function ruleCondition(entry, triggerIds, kind, depth = 0) {
  const {type, entity, state, attribute} = entry;
  if (type === 'template') {
    if (!provided(entry.template)) throw new Error('Eine HA-Template-Bedingung eingeben.');
    return {condition: 'template', value_template: entry.template};
  }
  if (type === 'group') {
    if (depth >= maxRuleGroupDepth || !conditionModes.includes(entry.conditionMode) || !entry.conditions?.length) {
      throw new Error('Bedingungsgruppe braucht mindestens eine Bedingung und eine gültige Verknüpfung.');
    }
    return {condition: entry.conditionMode,
      conditions: entry.conditions.map(child => ruleCondition(child, triggerIds, kind, depth + 1))};
  }
  if (type === 'trigger') {
    if (kind !== 'automation' || !provided(entry.triggerId) || !triggerIds.has(entry.triggerId)) {
      throw new Error('Für „Ausgelöst durch“ eine vorhandene Trigger-ID auswählen.');
    }
    return {condition: 'trigger', id: entry.triggerId};
  }
  if (type === 'time') {
    const result = {condition: 'time'};
    for (const key of ['after', 'before']) {
      const value = entry[key];
      if (!provided(value)) continue;
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) {
        throw new Error('Eine gültige Uhrzeit für das Zeitfenster eingeben.');
      }
      result[key] = value.length === 5 ? value + ':00' : value;
    }
    if (provided(entry.weekday)) {
      const days = entry.weekday.split(',');
      if (days.some(day => !ruleWeekdays.includes(day))) throw new Error('Ungültiger Wochentag.');
      result.weekday = ruleWeekdays.filter(day => days.includes(day));
    }
    if (!result.after && !result.before && !result.weekday) {
      throw new Error('Mindestens eine Uhrzeit oder einen Wochentag auswählen.');
    }
    return result;
  }
  if (!identifier.test(entity || '')) throw new Error('Gültige Bedingungsentität eingeben.');
  const target = {entity_id: entity, ...(provided(attribute) ? {attribute} : {})};
  if (type === 'numeric') {
    return {condition: 'numeric_state', ...target, ...numericLimits(entry, 'Eine gültige Zahl für die Bedingung eingeben.')};
  }
  if (!provided(state)) throw new Error('Einen Zustand für die Bedingung eingeben.');
  return {condition: 'state', ...target, state};
}

function ruleAction({type, action, entity, data, seconds, state, event}) {
  if (type === 'delay') return {delay: duration(seconds)};
  if (type === 'wait_state') {
    if (!identifier.test(entity || '') || !provided(state)) throw new Error('Entität und Zielzustand zum Warten eingeben.');
    return {wait_template: '{{ is_state(' + JSON.stringify(entity) + ', ' + JSON.stringify(state) + ') }}',
      ...(provided(seconds) ? {timeout: duration(seconds), continue_on_timeout: false} : {})};
  }
  if (type === 'script') {
    if (!/^script\.[a-z0-9_]+$/.test(entity || '')) throw new Error('Ein HA-Skript auswählen.');
    action = entity;
    entity = '';
  } else if (type === 'notification') {
    action = 'persistent_notification.create';
    entity = '';
  } else if (type === 'event') {
    if (!/^[a-zA-Z0-9_]+$/.test(event || '')) throw new Error('Gültigen HA-Ereignistyp eingeben.');
  }
  if (type !== 'event' && (!identifier.test(action || '') || (provided(entity) && !identifier.test(entity)))) {
    throw new Error('Gültige HA-Aktion und gegebenenfalls Ziel-Entität eingeben.');
  }
  const result = type === 'event' ? {event} : {action};
  if (type !== 'event' && provided(entity)) result.target = {entity_id: entity};
  if (provided(data)) {
    const field = type === 'event' ? 'event_data' : 'data';
    try { result[field] = JSON.parse(data); }
    catch { throw new Error('Aktionsparameter als gültiges JSON-Objekt eingeben.'); }
    if (!object(result[field])) throw new Error('Aktionsparameter als gültiges JSON-Objekt eingeben.');
  }
  if (type === 'notification' && !provided(result.data?.message)) {
    throw new Error('Für die Benachrichtigung eine Nachricht im Feld „message“ eingeben.');
  }
  return result;
}

export function readRuleFields(fields) {
  if (!object(fields)) throw new Error('Ungültige Rules-Datei.');
  if (Object.hasOwn(fields, 'triggers')) {
    const actionFields = ['type', 'action', 'entity', 'data', 'seconds', 'state', 'event'];
    const lists = {triggers: ['type', 'id', 'entity', 'state', 'from', 'attribute', 'seconds', 'time', 'event', 'above', 'below', 'offsetMinutes', 'topic', 'payload', 'scopeId', 'scopeEntities'],
      conditions: ['type', 'triggerId', 'entity', 'state', 'attribute', 'above', 'below', 'after', 'before', 'weekday', 'template'],
      actions: actionFields, elseActions: actionFields};
    const types = {triggers: ['state', 'area', 'label', 'time', 'helper_time', 'event', 'numeric', 'sun', 'mqtt', 'ha_start'], conditions: ['state', 'numeric', 'time', 'trigger', 'template'],
      actions: ['action', 'delay', 'wait_state', 'script', 'notification', 'event']};
    types.elseActions = types.actions;
    const rule = {conditionMode: fields.conditionMode};
    if (!conditionModes.includes(rule.conditionMode)) throw new Error('Ungültige Rules-Datei.');
    function readEntries(key, entries, depth = 0) {
      if (!Array.isArray(entries)) throw new Error('Ungültige Rules-Datei.');
      return entries.map(entry => {
        if (key === 'conditions' && entry?.type === 'group') {
          if (depth >= maxRuleGroupDepth || !conditionModes.includes(entry.conditionMode)) throw new Error('Ungültige Rules-Bedingungsgruppe.');
          return {type: 'group', conditionMode: entry.conditionMode,
            conditions: readEntries(key, entry.conditions, depth + 1)};
        }
        if (!object(entry) || Object.values(entry).some(value => typeof value !== 'string') ||
            (entry.type !== undefined && !types[key].includes(entry.type))) throw new Error('Ungültige Rules-Datei.');
        return Object.fromEntries(lists[key].filter(name => Object.hasOwn(entry, name)).map(name => [name, entry[name]]));
      });
    }
    for (const key of Object.keys(lists)) rule[key] = readEntries(key, fields[key]);
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
  if (rule.triggers.some(t => ['area', 'label'].includes(t.type))) {
    throw new Error('Rules → JS: Bereichs- und Label-Auslöser benötigen HA-YAML.');
  }
  if (rule.triggers.some(t => t.type === 'ha_start')) {
    throw new Error('Rules → JS: Der Home-Assistant-Startauslöser benötigt HA-YAML.');
  }
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
  const leaves = list => list.flatMap(entry => entry.type === 'group' ? leaves(entry.conditions) : [entry]);
  const conditions = leaves(rule.conditions);
  if (conditions.some(c => c.type === 'template')) {
    throw new Error('Rules → JS: HA-Template-Bedingungen benötigen HA-YAML.');
  }
  if (conditions.some(c => c.type === 'time')) {
    throw new Error('Rules → JS: Zeitbedingungen benötigen HA-YAML.');
  }
  if (conditions.some(c => c.type === 'numeric' || provided(c.attribute))) {
    throw new Error('Rules → JS: Zahlen- und Attributbedingungen benötigen HA-YAML.');
  }
  if ([...rule.actions, ...rule.elseActions].some(a => (a.type && a.type !== 'action') || provided(a.data) || !provided(a.entity))) {
    throw new Error('Rules → JS: Verzögerungen und Aktionen mit Parametern oder ohne Ziel benötigen HA-YAML.');
  }
  const literal = JSON.stringify;
  const matches = ({entity, state}) => 'ha.readState(' + literal(entity) + ') === ' + literal(state);
  const calls = (actions, indent) => actions.map(({action, entity}) =>
    indent + 'ha.callAction(' + literal(action) + ', ' + literal(entity) + ');');
  const usesTrigger = conditions.some(c => c.type === 'trigger');
  const expression = (list, mode) => {
    const check = list.map(condition => condition.type === 'group' ?
      '(' + expression(condition.conditions, condition.conditionMode) + ')' :
      condition.type === 'trigger' ? 'triggerId === ' + literal(condition.triggerId) : matches(condition))
      .join(mode === 'and' ? ' && ' : ' || ');
    return mode === 'not' ? '!(' + check + ')' : check;
  };
  const lines = [usesTrigger ? 'function runRule(triggerId) {' : 'function runRule() {'];
  if (rule.conditions.length) {
    const check = expression(rule.conditions, rule.conditionMode);
    lines.push('  if (' + check + ') {', ...calls(rule.actions, '    '));
    if (rule.elseActions.length) lines.push('  } else {', ...calls(rule.elseActions, '    '));
    lines.push('  }');
  } else {
    lines.push(...calls(rule.actions, '  '));
  }
  lines.push('}', '');
  for (const [index, trigger] of rule.triggers.entries()) {
    const argument = usesTrigger ? literal(provided(trigger.id) ? trigger.id : String(index)) : '';
    const callback = usesTrigger ? '() => runRule(' + argument + ')' : 'runRule';
    if (trigger.type === 'time') {
      lines.push('ha.schedule(' + literal({trigger: 'time', at: trigger.time + ':00'}) + ', ' + callback + ');');
    } else if (trigger.type === 'helper_time') {
      lines.push('ha.scheduleFromDateTime(' + literal(trigger.entity) + ', ' + callback + ');');
    } else if (trigger.type === 'event') {
      lines.push('ha.onEvent(' + literal(trigger.event) + ', ' + callback + ');');
    } else {
      lines.push('ha.onState(' + literal(trigger.entity) + ', () => {',
        '  if (' + matches(trigger) + ') runRule(' + argument + ');', '});');
    }
  }
  return lines.join('\n') + '\n';
}

export function importHaJson(source, kind, messages) {
  if (!source.trim() || new TextEncoder().encode(source).length > 1_000_000) {
    throw new Error(messages.size);
  }
  let data = JSON.parse(source);
  if (object(data) && (Object.hasOwn(data, 'nodes') || Object.hasOwn(data, 'edges'))) {
    // An imported HA automation can be represented by triggers feeding one raw action.
    // Other FLODE graphs require interpreting their edges and node types.
    const {nodes, edges, name, description, metadata} = data;
    if (kind !== 'automation' || data.version !== 1 || !Array.isArray(nodes) || !Array.isArray(edges)) {
      throw new Error(messages.graph);
    }
    const triggers = nodes.filter(node => node?.type === 'trigger');
    const action = nodes.find(node => node?.type === 'action');
    const raw = action?.data?._raw;
    const ids = new Set(triggers.map(node => node.id));
    if (!triggers.length || nodes.length !== triggers.length + 1 || !object(raw) ||
        ids.has(action.id) || ids.size !== triggers.length || edges.length !== triggers.length ||
        new Set(edges.map(edge => edge?.source)).size !== triggers.length ||
        !edges.every(edge => ids.has(edge?.source) && edge.target === action.id)) {
      throw new Error(messages.graph);
    }
    data = {...metadata, alias: name, description, triggers: triggers.map(node => node.data), actions: [raw]};
  }
  const yaml = stringifyForHa(data);
  validateYaml(yaml, kind);
  return yaml;
}

export function validateYaml(source, kind) {
  if (!['script', 'automation'].includes(kind)) throw new Error('HA-YAML-Typ ist ungültig.');
  if (!source.trim() || new TextEncoder().encode(source).length > 1_000_000) {
    throw new Error('Eine YAML-Konfiguration mit höchstens 1 MB eingeben.');
  }
  const doc = parseDocument(source, {uniqueKeys: true});
  // These tags are resolved by Home Assistant. YAML export retains the original source.
  const problem = doc.errors[0] || doc.warnings.find(warning =>
    warning.code !== 'TAG_RESOLVE_FAILED' ||
    !/^Unresolved tag: !(?:input|secret|include(?:_dir_(?:list|named|merge_list|merge_named))?)(?:\s|$)/.test(warning.message));
  if (problem) throw problem;
  const data = doc.toJS({maxAliasCount: 30});
  const at = (message, path) => {
    let location = path;
    let node = doc.getIn(location, true);
    while (!node?.range && location.length) {
      location = location.slice(0, -1);
      node = location.length ? doc.getIn(location, true) : doc.contents;
    }
    const range = node?.range ?? doc.contents?.range;
    throw Object.assign(new Error(message), {pos: range?.slice(0, 2)});
  };
  const deferred = path => {
    const node = doc.getIn(path, true);
    return node?.constructor.name === 'Alias' || /^!(?:input|include(?:_dir_[a-z_]+)?)$/.test(node?.tag ?? '');
  };
  function validateItems(value, path, validateItem) {
    if (value === null || deferred(path)) return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => validateItem(item, [...path, index]));
    } else {
      validateItem(value, path);
    }
  }
  function validateCondition(value, path) {
    if (deferred(path) || (typeof value === 'string' && /\{[{%]/.test(value))) return;
    if (!object(value)) {
      at('Eine Bedingung benötigt condition oder ein Template.', path);
    }
    const shorthand = conditionModes.find(mode => Object.hasOwn(value, mode));
    if (shorthand) {
      validateItems(value[shorthand], [...path, shorthand], validateCondition);
    } else if (!provided(value.condition) && !deferred([...path, 'condition'])) {
      at('Eine Bedingung benötigt condition oder ein Template.', path);
    } else if (conditionModes.includes(value.condition)) {
      validateItems(value.conditions, [...path, 'conditions'], validateCondition);
    }
  }
  function validateAction(action, path) {
    if (deferred(path)) return;
    if (!object(action)) at('Eine Aktion muss eine YAML-Zuordnung sein.', path);
    if (Object.hasOwn(action, 'choose')) {
      validateItems(action.choose, [...path, 'choose'], (branch, branchPath) => {
        if (deferred(branchPath)) return;
        if (!object(branch) || !Object.hasOwn(branch, 'conditions') || !Object.hasOwn(branch, 'sequence')) {
          at('Ein choose-Zweig benötigt conditions und sequence.', branchPath);
        }
        validateItems(branch.conditions, [...branchPath, 'conditions'], validateCondition);
        validateItems(branch.sequence, [...branchPath, 'sequence'], validateAction);
      });
    }
    for (const field of ['default', 'then', 'else', 'sequence']) {
      if (Object.hasOwn(action, field)) validateItems(action[field], [...path, field], validateAction);
    }
    if (Object.hasOwn(action, 'parallel')) {
      validateItems(action.parallel, [...path, 'parallel'], (branch, branchPath) =>
        validateItems(branch, branchPath, validateAction));
    }
    if (Object.hasOwn(action, 'if')) {
      if (!Object.hasOwn(action, 'then')) at('Eine if-Aktion benötigt then.', [...path, 'if']);
      validateItems(action.if, [...path, 'if'], validateCondition);
    }
    if (Object.hasOwn(action, 'repeat') && !deferred([...path, 'repeat'])) {
      if (!object(action.repeat) || !Object.hasOwn(action.repeat, 'sequence')) {
        at('Eine repeat-Aktion benötigt sequence.', [...path, 'repeat']);
      }
      validateItems(action.repeat.sequence, [...path, 'repeat', 'sequence'], validateAction);
    }
  }
  let entries;
  if (kind === 'script') {
    if (!object(data)) throw new Error('Ein Skript oder eine Zuordnung benannter Skripte wird erwartet.');
    entries = Object.hasOwn(data, 'sequence') || Object.hasOwn(data, 'use_blueprint') ? [data] : Object.entries(data).map(([key, entry]) => {
      if (!/^[a-z0-9_]+$/.test(key) || ['reload', 'turn_on', 'turn_off', 'toggle'].includes(key)) {
        throw new Error('Ungültiger Skriptschlüssel: ' + key);
      }
      return entry;
    });
  } else {
    entries = Array.isArray(data) ? data : [data];
  }
  if (!entries.length) throw new Error('Mindestens einen HA-Eintrag eingeben.');
  for (const [index, entry] of entries.entries()) {
    const path = Array.isArray(data) ? [index] :
      kind === 'script' && !Object.hasOwn(data, 'sequence') && !Object.hasOwn(data, 'use_blueprint') ?
        [Object.keys(data)[index]] : [];
    if (!object(entry)) at('Jeder HA-Eintrag muss ein YAML-Objekt sein.', path);
    if (entry.mode !== undefined && !modes.has(entry.mode)) at('Ungültiger HA-Ausführungsmodus.', [...path, 'mode']);
    if (Object.hasOwn(entry, 'use_blueprint')) {
      const reference = entry.use_blueprint;
      const location = [...path, 'use_blueprint'];
      if (!object(reference) || !provided(reference.path)) {
        at('Eine Blueprint-Instanz benötigt einen Pfad unter use_blueprint.path.', location);
      }
      if (Object.hasOwn(reference, 'input') && !object(reference.input)) {
        at('Blueprint-Eingaben müssen eine YAML-Zuordnung sein.', [...location, 'input']);
      }
      continue;
    }
    const actions = kind === 'script' ? entry.sequence : entry.actions ?? entry.action;
    const actionPath = [...path, kind === 'script' ? 'sequence' : Object.hasOwn(entry, 'actions') ? 'actions' : 'action'];
    if (!deferred(actionPath) && (!Array.isArray(actions) || !actions.length)) {
      at(kind === 'script' ? 'Ein Skript benötigt eine nicht leere sequence mit Aktionen.' :
        'Eine Automation benötigt eine nicht leere actions-Liste.',
      actions === undefined ? path : actionPath);
    }
    validateItems(actions, actionPath, validateAction);
    if (kind === 'automation') {
      const triggers = entry.triggers ?? entry.trigger;
      if (!Array.isArray(triggers) || !triggers.length || !triggers.every(object)) {
        at('Eine Automation benötigt mindestens einen Auslöser in triggers.',
          triggers === undefined ? path : [...path, entry.triggers != null ? 'triggers' : 'trigger']);
      }
      if (entry.conditions !== undefined && !Array.isArray(entry.conditions)) {
        at('conditions muss eine Liste sein.', [...path, 'conditions']);
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
  const triggerIds = new Set(triggers.map(entry => entry.id).filter(provided));
  const states = conditions.map(entry => ruleCondition(entry, triggerIds, kind));
  const checks = conditionMode === 'and' || !states.length ? states : [{condition: conditionMode, conditions: states}];
  let sequence = actionList(actions);
  if (elseActions.length) sequence = [{if: checks, then: sequence, else: actionList(elseActions)}];
  else if (kind === 'script') sequence = [...checks, ...sequence];
  const config = {alias: name, mode: 'single'};
  if (kind === 'script') return stringifyForHa({...config, sequence});
  if (!triggers.length) throw new Error('Für eine HA-Automation einen Auslöser hinzufügen.');
  return stringifyForHa({
    ...config,
    triggers: triggers.map(entry => ({
      ...ruleTrigger(entry),
      ...(provided(entry.id) ? {id: entry.id} : {}),
    })),
    conditions: elseActions.length ? [] : checks,
    actions: sequence,
  });
}

function ruleTrigger(entry) {
  const {entity, state, from, attribute, seconds, type, time, event} = entry;
  if (type === 'ha_start') return {trigger: 'homeassistant', event: 'start'};
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
  let target = entity;
  if (['area', 'label'].includes(type)) {
    let members;
    try { members = JSON.parse(entry.scopeEntities); } catch {}
    if (!provided(entry.scopeId) || !Array.isArray(members) || !members.length ||
        !members.every(id => typeof id === 'string' && identifier.test(id))) {
      throw new Error('Einen Bereich oder ein Label mit HA-Entitäten auswählen.');
    }
    target = [...new Set(members)];
  } else if (!identifier.test(entity || '')) throw new Error('Gültige Auslöserentität eingeben.');
  if (type === 'numeric') {
    const limits = numericLimits(entry, 'Eine gültige Zahl für den Auslöser eingeben.');
    const trigger = {trigger: 'numeric_state', entity_id: entity, ...limits};
    if (provided(attribute)) trigger.attribute = attribute;
    if (provided(seconds)) trigger.for = duration(seconds);
    return trigger;
  }
  const trigger = {trigger: 'state', entity_id: target};
  if (provided(attribute)) trigger.attribute = attribute;
  if (provided(from)) trigger.from = from;
  if (provided(state)) trigger.to = state;
  if (!provided(from) && !provided(state)) trigger.to = null;
  if (provided(seconds)) trigger.for = duration(seconds);
  return trigger;
}
