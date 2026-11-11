// Runs inside QuickJS. Each test has its own event queue and virtual timers.
export const simulatedEvents = String.raw`
((api, report, run) => {
  const handlers = [];
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
    timers.set(name, {at: now + delay, delay, callback, remaining: repeat ? 2 : 1});
  };
  const ha = Object.freeze({
    ...api,
    callAction(action, entity, data) {
      return data === undefined ? api.callAction(action, entity) : api.callAction(action, entity, JSON.stringify(data));
    },
    onState: (entity, callback) => register('state', entity, null, callback),
    onAttribute: (entity, attribute, callback) => register('attribute', entity, attribute, callback),
    onEvent: (event, callback) => register('event', event, null, callback),
    schedule: (schedule, callback) => register('schedule', JSON.stringify(schedule), null, callback),
    onSun: (event, callback) => register('sun', event, null, callback),
    timeout: (name, delay, callback) => timer(name, delay, callback, false),
    interval: (name, delay, callback) => timer(name, delay, callback, true),
    cancelTimer: name => timers.delete(name),
  });
  globalThis.ha = ha;
  globalThis.getState = ha.getState;
  globalThis.setState = ha.setState;
  globalThis.log = value => ha.log(String(value));
  delete globalThis.reportSimulatedEvent;
  run();
  for (const {type, target, attribute, callback} of handlers.slice()) {
    report(JSON.stringify({type: 'simulated-event', event: type, target, attribute}));
    callback();
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
