import {runtimePermissions} from './permissions.mjs';

export const sensorStateEvent = 'logic_studio_set_sensor_state';

export function sensorStateValue(entity, value) {
  if (typeof entity !== 'string' || !/^sensor\.[a-z0-9_]+$/.test(entity)) {
    throw new Error('Sensorzustand: sensor.name erwartet.');
  }
  if (!['string', 'number'].includes(typeof value) || typeof value === 'number' && !Number.isFinite(value) ||
      String(value).length > 255) throw new Error('Sensorzustand: Zahl oder Text mit höchstens 255 Zeichen erwartet.');
  return String(value);
}

// Only the fixed Supervisor endpoint is used. Credentials never enter generated code.
export function createSensorStateWriter(config, request = fetch) {
  const {writable} = runtimePermissions(config);
  const pending = new Set();
  return async (entity, value) => {
    const state = sensorStateValue(entity, value);
    if (!writable.has(entity)) throw new Error('HA-Sensor nicht zum Schreiben freigegeben: ' + entity);
    if (pending.has(entity) || pending.size >= 4) throw new Error('Sensorzustand: Schreibanfrage läuft bereits.');
    pending.add(entity);
    try {
      const url = 'http://supervisor/core/api/states/' + entity;
      const headers = {Authorization: 'Bearer ' + config.token, 'Content-Type': 'application/json'};
      const original = await request(url, {headers, redirect: 'error', signal: AbortSignal.timeout(8000)});
      if (!original.ok) throw new Error('Sensorzustand: Vorhandener Sensor nicht lesbar (HTTP ' + original.status + ').');
      const current = await original.json();
      if (current.entity_id !== entity || !current.attributes || typeof current.attributes !== 'object' || Array.isArray(current.attributes)) {
        throw new Error('Sensorzustand: Ungültige HA-Antwort.');
      }
      const response = await request(url, {method: 'POST', headers, redirect: 'error', signal: AbortSignal.timeout(8000),
        body: JSON.stringify({state, attributes: current.attributes})});
      if (!response.ok) throw new Error('Sensorzustand: Schreiben fehlgeschlagen (HTTP ' + response.status + ').');
    } finally { pending.delete(entity); }
  };
}
