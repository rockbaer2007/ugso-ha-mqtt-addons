import {guestTimeApi} from './ha-time.mjs';
// Runs inside QuickJS. Each test has its own event queue and virtual timers.
export const simulatedEvents = String.raw`
((api, report, run) => {
  const handlers = [];
  const namedSchedules = new Map();
  const timers = new Map();
  let now = 0;
  const register = (type, target, attribute, callback) => {
    if (typeof target !== 'string' || !target.trim() || typeof callback !== 'function' ||
        handlers.length >= 32) throw new Error('Invalid simulated event subscription');
    handlers.push({type, target, attribute, callback});
  };
  const timer = (name, delay, callback, repeat) => {
    if (typeof name !== 'string' || !name.trim() || !Number.isSafeInteger(delay) ||
        delay < 0 || (repeat && delay === 0) || delay > 2147483647 ||
        typeof callback !== 'function' || timers.size >= 32) throw new Error('Invalid simulated timer');
    timers.set(name, {at: now + delay, delay, callback, repeat, remaining: repeat ? 2 : 1});
  };
  const timeRequest = (op, args) => JSON.parse(api.timeRequest(op, JSON.stringify(args), String(now)));
  const ha = Object.freeze({
    ...api,
    ${guestTimeApi}
    publishMqtt: (topic, message, retain = false) => report(JSON.stringify({type: 'mqtt', topic, message, retain})),
    notify: (entity, message, title = '') => report(JSON.stringify({type: 'notify', entity, message, title})),
    fireEvent: (event, data = {}) => report(JSON.stringify({type: 'event', event, data})),
    callAction(action, entity, data) {
      return data === undefined ? api.callAction(action, entity) : api.callAction(action, entity, JSON.stringify(data));
    },
    onState: (entity, callback) => register('state', entity, null, callback),
    onAttribute: (entity, attribute, callback) => register('attribute', entity, attribute, callback),
    onEvent: (event, callback) => register('event', event, null, callback),
    schedule: (schedule, callback) => register('schedule', JSON.stringify(schedule), null, callback),
    namedSchedule(name, cron, callback) {
      if (typeof name !== 'string' || !name.trim() || name.length > 128 || typeof callback !== 'function' ||
          (!namedSchedules.has(name) && namedSchedules.size >= 32)) throw new Error('Ungültiger benannter Zeitplan.');
      api.validateCron(cron);
      namedSchedules.set(name, callback);
    },
    stopSchedule: name => namedSchedules.delete(name),
    onSun: (event, callback, offset = 0) => register('sun', event, offset, callback),
    scheduleFromDateTime: (entity, callback) => register('datetime', entity, null, callback),
    timeout: (name, delay, callback) => timer(name, delay, callback, false),
    interval: (name, delay, callback) => timer(name, delay, callback, true),
    cancelTimer: (name, repeat) => (repeat === undefined || timers.get(name)?.repeat === repeat) && timers.delete(name),
    timerReference: (name, repeat) => timers.get(name)?.repeat === repeat ? name : null,
  });
  globalThis.ha = ha;
  globalThis.getState = ha.getState;
  globalThis.setState = ha.setState;
  globalThis.log = value => ha.log(String(value));
  delete globalThis.reportSimulatedEvent;
  run();
  for (const [name, callback] of [...namedSchedules]) {
    if (namedSchedules.get(name) !== callback) continue;
    report(JSON.stringify({type: 'simulated-event', event: 'schedule', target: name}));
    callback();
  }
  for (const {type, target, attribute, callback} of handlers.slice()) {
    report(JSON.stringify({type: 'simulated-event', event: type, target, attribute}));
    if (type === 'state') {
      callback({type: 'state', entity: target, previous: {state: 'off'}, current: {state: 'on'}});
    } else if (type === 'attribute') {
      callback({type: 'state', entity: target, previous: {attributes: {[attribute]: 0}},
        current: {attributes: {[attribute]: 1}}});
    } else {
      callback();
    }
  }
  for (let steps = 0; timers.size; steps++) {
    if (steps >= 64) throw new Error('Simulated timer limit reached');
    const [name, next] = [...timers].reduce((a, b) => a[1].at <= b[1].at ? a : b);
    now = next.at;
    if (--next.remaining === 0) timers.delete(name);
    else next.at += next.delay;
    report(JSON.stringify({type: 'simulated-timer', name, elapsedMs: now}));
    next.callback();
  }
})
`;
