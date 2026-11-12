// Shared by the live and simulated QuickJS environments.
export const importedSystem = `
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
  function importedControl(entity, value, toggle, delay, clearRunning) {
    const domain = entity.split('.')[0];
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
