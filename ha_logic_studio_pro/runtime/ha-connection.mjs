const endpoint = 'ws://supervisor/core/websocket';
const entityPattern = /^[a-z][a-z0-9_]*\.[a-z0-9_]+$/;
const eventPattern = /^[a-z][a-z0-9_]{0,127}$/;
const switches = ['input_boolean', 'switch', 'light', 'fan'];
const actions = new Map([
  ...switches.map(domain => [domain, ['turn_on', 'turn_off', 'toggle']]),
  ['input_number', ['set_value']], ['input_text', ['set_value']],
  ['input_select', ['select_option']], ['button', ['press']], ['input_button', ['press']],
]);

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

export async function connectHomeAssistant({token, readable, writable, events}, dispatch, fail, Socket = WebSocket) {
  const socket = new Socket(endpoint);
  const allowed = new Set([...readable, ...writable]);
  const permittedEvents = new Set(events);
  const writeTargets = new Set(writable);
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
    if (ready) fail(error);
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
        pending.delete(id);
        reject(new Error('Zeitlimit für HA-Anfrage.'));
      }, 8000);
      pending.set(id, {resolve, reject, timeout});
      try { socket.send(JSON.stringify({...command, id})); }
      catch (error) { clearTimeout(timeout); pending.delete(id); reject(error); }
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
    ready = true;
    return {
      timezone: config.time_zone,
      start: () => { live = true; },
      state(entity) {
        if (!allowed.has(entity)) throw new Error('HA-Entität nicht freigegeben: ' + entity);
        return states.get(entity) ?? null;
      },
      subscribe(type) {
        if (!eventPattern.test(type) || type === 'state_changed' || !permittedEvents.has(type)) {
          throw new Error('HA-Ereignis nicht freigegeben: ' + type);
        }
        if (!subscriptions.has(type)) {
          const request = send({type: 'subscribe_events', event_type: type});
          subscriptions.set(type, request);
          request.catch(fail);
        }
      },
      call(action, entity, data) { send(actionCommand(action, entity, data, writeTargets)).catch(fail); },
    };
  } catch (error) {
    abort(error);
    throw error;
  } finally { clearTimeout(authTimeout); }
}
