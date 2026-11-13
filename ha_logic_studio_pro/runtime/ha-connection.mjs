import {historyRange, historyRows} from './history.mjs';

const endpoint = 'ws://supervisor/core/websocket';
const entityPattern = /^[a-z][a-z0-9_]*\.[a-z0-9_]+$/;
const eventPattern = /^[a-z][a-z0-9_]{0,127}$/;
const switches = ['input_boolean', 'switch', 'light', 'fan'];
const actions = new Map([
  ...switches.map(domain => [domain, ['turn_on', 'turn_off', 'toggle']]),
  ['input_number', ['set_value']], ['input_text', ['set_value']],
  ['input_select', ['select_option']], ['button', ['press']], ['input_button', ['press']],
  ['script', ['turn_on', 'turn_off']],
  ['automation', ['turn_on', 'turn_off', 'trigger']],
]);
export const supportedActions = [...actions].flatMap(([domain, services]) => services.map(service => domain + '.' + service));

export function actionCommand(action, entity, data, writable) {
  if (!entityPattern.test(entity) || !writable.has(entity)) throw new Error('HA-Ziel nicht für Aktionen freigegeben: ' + entity);
  const [domain, service, extra] = action.split('.');
  if (extra !== undefined || domain !== entity.split('.')[0] || !actions.get(domain)?.includes(service)) {
    throw new Error('HA-Aktion nicht unterstützt: ' + action);
  }
  const forbidden = ['entity_id', 'device_id', 'area_id', 'floor_id', 'label_id', 'target'];
  if (!data || typeof data !== 'object' || Array.isArray(data) || forbidden.some(key => Object.hasOwn(data, key))) {
    throw new Error('Aktionsdaten dürfen keine zusätzlichen Ziele enthalten.');
  }
  return {type: 'call_service', domain, service, target: {entity_id: entity}, service_data: data};
}

export function sendtoCommand(operation, args, {mqttTopics, writeTargets, permittedEvents}) {
  const [target, message, option] = args;
  if (operation === 'publishMqtt') {
    if (typeof target !== 'string' || !mqttTopics.has(target) || /[+#\0]/.test(target)) throw new Error('MQTT-Topic nicht freigegeben.');
    if (typeof message !== 'string' || typeof option !== 'boolean') throw new Error('MQTT-Nachricht oder Retain ungültig.');
    return {type: 'call_service', domain: 'mqtt', service: 'publish', service_data: {topic: target, payload: message, retain: option}};
  }
  if (operation === 'notify') {
    if (typeof target !== 'string' || !target.startsWith('notify.') || !writeTargets.has(target)) throw new Error('HA-Benachrichtigungsempfänger nicht freigegeben.');
    if (typeof message !== 'string' || typeof option !== 'string') throw new Error('HA-Benachrichtigung ungültig.');
    return {type: 'call_service', domain: 'notify', service: 'send_message', target: {entity_id: target},
      service_data: {message, ...(option ? {title: option} : {})}};
  }
  if (operation !== 'fireEvent' || typeof target !== 'string' || !target.startsWith('logic_studio_') ||
      !eventPattern.test(target) || !permittedEvents.has(target)) throw new Error('HA-Ereignis nicht zum Senden freigegeben.');
  if (!message || typeof message !== 'object' || Array.isArray(message)) throw new Error('Ereignisdaten müssen ein Objekt sein.');
  return {type: 'fire_event', event_type: target, event_data: message};
}

async function openHomeAssistant({token, readable, writable, events, mqttTopics = []}, dispatch, fail, disconnected, Socket) {
  const socket = new Socket(endpoint);
  const allowed = new Set([...readable, ...writable]);
  const permittedEvents = new Set(events);
  const writeTargets = new Set(writable);
  const sendtoPermissions = {mqttTopics: new Set(mqttTopics), writeTargets, permittedEvents};
  const states = new Map();
  const pending = new Map();
  const subscriptions = new Map();
  const initialChanges = new Map();
  let serial = 0, closed = false, live = false, ready = false;
  const abort = error => {
    if (closed) return;
    closed = true;
    for (const request of pending.values()) {
      clearTimeout(request.timeout);
      request.reject(error);
    }
    pending.clear();
    if (ready) disconnected(error);
    socket.close();
  };
  const authenticated = new Promise((resolve, reject) => {
    const rejectConnection = () => reject(new Error('HA-WebSocket nicht verfügbar.'));
    socket.addEventListener('error', rejectConnection, {once: true});
    socket.addEventListener('close', rejectConnection, {once: true});
    socket.addEventListener('message', message => {
      try {
        const reply = JSON.parse(message.data);
        if (reply.type === 'auth_required') socket.send(JSON.stringify({type: 'auth', access_token: token}));
        else if (reply.type === 'auth_ok') resolve();
        else if (reply.type === 'auth_invalid') reject(new Error('HA-WebSocket-Anmeldung abgelehnt.'));
      } catch { rejectConnection(); }
    });
  });
  function send(command) {
    if (closed || pending.size >= 32) throw new Error('HA-Verbindung getrennt oder zu viele offene Anfragen.');
    const id = ++serial;
    const promise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        abort(new Error('Zeitlimit für HA-Anfrage.'));
      }, 8000);
      pending.set(id, {resolve, reject, timeout});
      try { socket.send(JSON.stringify({...command, id})); }
      catch (error) { abort(error); }
    });
    return promise;
  }
  socket.addEventListener('close', () => abort(new Error('HA-WebSocket wurde getrennt.')));
  socket.addEventListener('error', () => abort(new Error('Fehler am HA-WebSocket.')));
  socket.addEventListener('message', message => {
    try {
      const reply = JSON.parse(message.data);
      if (reply.type === 'result' && pending.has(reply.id)) {
        const request = pending.get(reply.id);
        pending.delete(reply.id);
        clearTimeout(request.timeout);
        if (reply.success) request.resolve(reply.result);
        else request.reject(new Error(reply.error?.message || 'HA-Anfrage fehlgeschlagen.'));
      }
      if (reply.type !== 'event') return;
      const {event_type: type, data} = reply.event;
      if (type === 'state_changed' && allowed.has(data?.entity_id)) {
        const change = {entity: data.entity_id, previous: data.old_state ?? null, current: data.new_state ?? null};
        if (change.current) states.set(change.entity, change.current);
        else states.delete(change.entity);
        if (!live) initialChanges.set(change.entity, change.current);
        else dispatch({type: 'state', ...change});
      } else if (live && permittedEvents.has(type)) dispatch({type: 'event', name: type, data});
    } catch (error) { abort(error); }
  });
  let authTimeout;
  try {
    await Promise.race([authenticated, new Promise((_, reject) => {
      authTimeout = setTimeout(() => reject(new Error('Zeitlimit für HA-WebSocket-Anmeldung.')), 8000);
    })]);
    const config = await send({type: 'get_config'});
    if (allowed.size) {
      await send({type: 'subscribe_events', event_type: 'state_changed'});
      for (const state of await send({type: 'get_states'})) {
        if (allowed.has(state.entity_id) && !initialChanges.has(state.entity_id)) states.set(state.entity_id, state);
      }
    }
    initialChanges.clear();
    if (closed) throw new Error('HA-WebSocket wurde getrennt.');
    ready = true;
    return {
      timezone: config.time_zone,
      connected: () => !closed,
      close: abort,
      start: () => { live = true; },
      state(entity) {
        if (!allowed.has(entity)) throw new Error('HA-Entität nicht freigegeben: ' + entity);
        return states.get(entity) ?? null;
      },
      async history(entity, start, end, mode, step, count) {
        if (typeof entity !== 'string' || !allowed.has(entity)) throw new Error('HA-Entität nicht freigegeben: ' + entity);
        const range = historyRange(start, end, mode, step, count);
        const result = await send({type: 'history/history_during_period', entity_ids: [entity],
          start_time: new Date(start).toISOString(), end_time: new Date(end).toISOString(),
          include_start_time_state: false, significant_changes_only: false, no_attributes: true});
        return historyRows(result?.[entity] ?? [], range);
      },
      subscribe(type) {
        if (!eventPattern.test(type) || type === 'state_changed' || !permittedEvents.has(type)) {
          throw new Error('HA-Ereignis nicht freigegeben: ' + type);
        }
        if (!subscriptions.has(type)) {
          const request = send({type: 'subscribe_events', event_type: type});
          subscriptions.set(type, request);
          return request.catch(error => { if (!closed) throw error; });
        }
      },
      call(action, entity, data) { send(actionCommand(action, entity, data, writeTargets)).catch(error => { if (!closed) fail(error); }); },
      sendto(operation, args) { send(sendtoCommand(operation, args, sendtoPermissions)).catch(error => { if (!closed) fail(error); }); },
    };
  } catch (error) {
    abort(error);
    throw error;
  } finally { clearTimeout(authTimeout); }
}

export async function connectHomeAssistant(config, dispatch, fail, Socket = WebSocket, connectionChanged = () => {}) {
  const subscriptions = new Set();
  const entities = new Set([...config.readable, ...config.writable]);
  const permittedEvents = new Set(config.events);
  let current, previous, started = false, reconnecting = false;
  const open = () => openHomeAssistant(config, dispatch, fail, lost, Socket);
  async function lost(error) {
    if (current) previous = new Map([...entities].map(entity => [entity, current.state(entity)]));
    current = undefined;
    if (reconnecting) return;
    reconnecting = true;
    connectionChanged(false, error);
    for (let delay = 1000; ; delay = Math.min(delay * 2, 30000)) {
      await new Promise(resolve => setTimeout(resolve, delay));
      let candidate;
      try {
        candidate = await open();
        for (const type of subscriptions) await candidate.subscribe(type);
        if (!candidate.connected()) continue;
      } catch (error) {
        candidate?.close(error);
        continue;
      }
      current = candidate;
      reconnecting = false;
      if (started) current.start();
      const before = previous;
      previous = undefined;
      connectionChanged(true);
      for (const entity of entities) {
        const oldState = before?.get(entity) ?? null;
        const newState = current?.state(entity) ?? null;
        if (started && current && JSON.stringify(oldState) !== JSON.stringify(newState)) {
          dispatch({type: 'state', entity, previous: oldState, current: newState});
        }
      }
      return;
    }
  }
  current = await open();
  return {
    timezone: current.timezone,
    connected: () => Boolean(current?.connected()),
    start() { started = true; current?.start(); },
    state(entity) {
      if (!entities.has(entity)) throw new Error('HA-Entität nicht freigegeben: ' + entity);
      return current?.state(entity) ?? null;
    },
    subscribe(type) {
      if (!eventPattern.test(type) || type === 'state_changed' || !permittedEvents.has(type)) {
        throw new Error('HA-Ereignis nicht freigegeben: ' + type);
      }
      subscriptions.add(type);
      current?.subscribe(type)?.catch(fail);
    },
    call(...args) { current?.call(...args); },
    sendto(...args) { current?.sendto(...args); },
    async history(...args) {
      const connection = current;
      if (!connection) return [];
      try { return await connection.history(...args); }
      catch (error) { if (current !== connection) return []; throw error; }
    },
  };
}
