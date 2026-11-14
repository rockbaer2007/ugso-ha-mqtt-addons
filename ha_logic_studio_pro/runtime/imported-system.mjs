// Shared by the live and simulated QuickJS environments.
export const importedSystem = String.raw`
  const importedEventValue = (event, part) => {
    const value = event?.[part]?.state;
    return value === 'on' ? true : value === 'off' ? false : value ?? null;
  };
  function importedTriggerMatches(event, condition) {
    if (!event.current) return false;
    const current = importedEventValue(event, 'current');
    const previous = importedEventValue(event, 'previous');
    if (condition === 'any') return true;
    if (condition === 'ne') return current !== previous;
    if (condition === 'true' || condition === 'false') return current === (condition === 'true');
    const number = value => typeof value === 'string' && value.trim() ? Number(value) : NaN;
    const a = number(current);
    const b = number(previous);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    switch (condition) {
      case 'gt': return a > b;
      case 'ge': return a >= b;
      case 'lt': return a < b;
      case 'le': return a <= b;
      default: return false;
    }
  }
  const pendingImportedControls = new Map();
  function importedTarget(source, entries) {
    const target = typeof source === 'string' && entries.find(([id]) => id === source);
    if (!target) throw new Error('Keine HA-Zuordnung für ioBroker-ID: ' + String(source));
    return target[1];
  }
  function importedAttribute(object, path) {
    let keys = Array.isArray(path) ? path : null;
    if (!keys) {
      if (typeof path !== 'string' || !path || path.length > 4096) return null;
      if (object != null && Object.hasOwn(object, path)) keys = [path];
      else {
        keys = [];
        const segment = /(?:^|\.)([^.\[\]]+)|\[(?:(\d+)|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\]/gy;
        let match;
        let end = 0;
        while ((match = segment.exec(path))) {
          keys.push(match[1] ?? match[2] ?? (match[3] ?? match[4]).replace(/\\(.)/g, '$1'));
          end = segment.lastIndex;
        }
        if (end !== path.length) return null;
      }
    }
    if (!keys.length || keys.length > 128) return null;
    for (const key of keys) {
      if ((typeof key !== 'string' && typeof key !== 'number') ||
          ['__proto__', 'prototype', 'constructor'].includes(key) ||
          object == null || !Object.hasOwn(object, key)) return null;
      object = object[key];
    }
    return object ?? null;
  }
  function importedControl(entity, value, toggle, delay, clearRunning, update = false) {
    const domain = entity.split('.')[0];
    if (update && !['input_boolean', 'input_number', 'input_text'].includes(domain)) {
      throw new Error('Aktualisiere benötigt einen HA-Helfer: ' + entity);
    }
    // HA sensor states are strings, including the numeric readings used by ioBroker.
    if (update && domain === 'input_number' && typeof value === 'string' &&
        /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) {
      value = Number(value);
    }
    let execute;
    if (['light', 'switch', 'input_boolean', 'fan'].includes(domain)) {
      if (toggle) {
        const current = ha.getState(entity)?.val;
        if (typeof current !== 'boolean') throw new Error('HA-Schaltzustand nicht verfügbar: ' + entity);
        value = !current;
      }
      if (typeof value !== 'boolean') throw new Error('Boolescher Schaltwert erwartet: ' + entity);
      execute = () => ha.setState(entity, value);
    } else if (!toggle && domain === 'input_number' && Number.isFinite(value)) {
      execute = () => ha.setNumber(entity, value);
    } else if (!toggle && domain === 'input_text' && typeof value === 'string') {
      execute = () => ha.setText(entity, value);
    } else {
      throw new Error('Wert oder Aktion passt nicht zur HA-Entität: ' + entity);
    }
    const pending = pendingImportedControls.get(entity);
    if (clearRunning && pending) {
      for (const id of pending) ha.cancelTimer(id, false);
      pendingImportedControls.delete(entity);
    }
    if (!delay) return execute();
    const queue = pendingImportedControls.get(entity) ?? new Set();
    const id = Symbol();
    ha.timeout(id, delay, () => {
      queue.delete(id);
      if (!queue.size) pendingImportedControls.delete(entity);
      execute();
    });
    queue.add(id);
    pendingImportedControls.set(entity, queue);
  }
  function importedStateValue(entity, field) {
    if (field === 'val') return ha.getState(entity)?.val ?? null;
    const snapshot = JSON.parse(ha.stateSnapshot(entity));
    if (!snapshot) return null;
    if (field === 'common.name') return snapshot.attributes?.friendly_name ?? null;
    if (field === 'common.unit') return snapshot.attributes?.unit_of_measurement ?? null;
    const timestamp = field === 'ts' ? snapshot.last_updated : field === 'lc' ? snapshot.last_changed : null;
    const milliseconds = Date.parse(timestamp);
    return Number.isFinite(milliseconds) ? milliseconds : null;
  }
`;
