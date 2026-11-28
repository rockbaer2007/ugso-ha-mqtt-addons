// Offline integration fixture: no real sockets or HTTP requests.
const entities = new Map([
  ['switch.wecker_relay', {entity_id: 'switch.wecker_relay', state: 'off', attributes: {}}],
  ['sensor.fake_wecker', {entity_id: 'sensor.fake_wecker', state: '0', attributes: {unit_of_measurement: 'W'}}],
]);
globalThis.WebSocket = class extends EventTarget {
  constructor() { super(); queueMicrotask(() => this.receive({type: 'auth_required'})); }
  receive(data) { this.dispatchEvent(new MessageEvent('message', {data: JSON.stringify(data)})); }
  send(text) {
    const command = JSON.parse(text);
    if (command.type === 'call_service') {
      setTimeout(() => {
        const id = command.target.entity_id, old_state = entities.get(id);
        const new_state = {...old_state, state: command.service === 'turn_on' ? 'on' : 'off'};
        entities.set(id, new_state);
        this.receive({type: 'event', event: {event_type: 'state_changed', data: {entity_id: id, old_state, new_state}}});
        this.receive({type: 'result', id: command.id, success: true, result: null});
      }, 35);
      return;
    }
    let result = null;
    if (command.type === 'get_config') result = {time_zone: 'Europe/Berlin'};
    if (command.type === 'get_states') result = [...entities.values()];
    queueMicrotask(() => this.receive(command.type === 'auth' ? {type: 'auth_ok'} : {type: 'result', id: command.id, success: true, result}));
    if (command.type === 'subscribe_events' && command.event_type === 'state_changed') {
      for (const [delay, state] of [[120, 'on'], [400, 'off'], [700, 'on']]) setTimeout(() => {
        const old_state = entities.get('switch.wecker_relay');
        const new_state = {...old_state, state}; entities.set(new_state.entity_id, new_state);
        this.receive({type: 'event', event: {event_type: 'state_changed', data: {entity_id: new_state.entity_id, old_state, new_state}}});
      }, delay);
    }
  }
  close() {}
};
globalThis.fetch = async (url, options) => {
  const entity = url.slice(url.lastIndexOf('/') + 1);
  if (!entities.has(entity)) throw Error('Unexpected mocked entity');
  if (options.method === 'POST') {
    await new Promise(resolve => setTimeout(resolve, 35));
    if (process.env.UGSO_TEST_WRITE_FAILURE === '1') return {ok: false, status: 403};
    const confirmed = {entity_id: entity, ...JSON.parse(options.body)};
    entities.set(entity, confirmed);
  }
  return {ok: true, json: async () => entities.get(entity)};
};
