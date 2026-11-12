import {guestTimeApi} from './ha-time.mjs';
import {importedSystem} from './imported-system.mjs';
// Runs inside QuickJS. Each test has its own event queue and virtual timers.
export const simulatedEvents = String.raw`
(async (api, report, run) => {
  const handlers = [];
  const namedSchedules = new Map();
  const timers = new Map();
  const scriptMessages = [];
  let now = 0;
  const invoke = (callback, ...args) => {
    const result = callback(...args);
    if (result && typeof result.then === 'function') result.catch(error => {
      globalThis.studioTestError = String(error?.message ?? error);
    });
  };
  const register = (type, target, attribute, callback) => {
    if (typeof target !== 'string' || !target.trim() || typeof callback !== 'function' ||
        handlers.length >= 32) throw new Error('Invalid simulated event subscription');
    handlers.push({type, target, attribute, callback});
  };
  const timer = (name, delay, callback, repeat) => {
    if ((typeof name !== 'symbol' && (typeof name !== 'string' || !name.trim())) || !Number.isSafeInteger(delay) ||
        delay < 0 || (repeat && delay === 0) || delay > 2147483647 ||
        typeof callback !== 'function' || timers.size >= 32) throw new Error('Invalid simulated timer');
    timers.set(name, {at: now + delay, delay, callback, repeat, remaining: repeat ? 2 : 1});
  };
  const timeRequest = (op, args) => JSON.parse(api.timeRequest(op, JSON.stringify(args), String(now)));
  const astroTimeRequest = (event, offset) => {
    const hours = {sunrise: 6, sunset: 18, dawn: 5, dusk: 19, solarNoon: 12, nadir: 0};
    if (!Object.hasOwn(hours, event) || !Number.isFinite(offset) || Math.abs(offset) > 1440) throw new Error('Invalid sun time.');
    const day = timeRequest('current', ['day']);
    const base = timeRequest('convert', [day + 'T' + String(hours[event]).padStart(2, '0') + ':00', 'ms', 'ms']);
    const next = base > timeRequest('current', ['unix']) ? base : timeRequest('shift', [base, 1, 'd']);
    return next + offset * 60_000;
  };
  ${importedSystem}
  const ha = Object.freeze({
    ...api,
    importedControl, importedStateValue, importedEventValue, importedTarget, importedAttribute,
    ${guestTimeApi}
    publishMqtt: (topic, message, retain = false) => report(JSON.stringify({type: 'mqtt', topic, message, retain})),
    notify: (entity, message, title = '') => report(JSON.stringify({type: 'notify', entity, message, title})),
    fireEvent(event, data = {}) {
      const encoded = JSON.stringify({type: 'event', event, data});
      report(encoded);
      if (event === 'logic_studio_script_message') {
        if (scriptMessages.length >= 32) throw new Error('Simulated script message limit reached');
        scriptMessages.push(JSON.parse(encoded).data);
      }
    },
    callAction(action, entity, data) {
      return data === undefined ? api.callAction(action, entity) : api.callAction(action, entity, JSON.stringify(data));
    },
    onState: (entity, callback) => register('state', entity, null, callback),
    onImportedState: (entity, condition, callback) => register('importedState', entity, condition, callback),
    onAttribute: (entity, attribute, callback) => register('attribute', entity, attribute, callback),
    onEvent: (event, callback) => register('event', event, null, callback),
    history(entity, start, end, mode, step, count, callback) {
      const rows = api.sampleHistory(entity, JSON.stringify([Number(start), Number(end), mode, step, count]));
      invoke(callback, JSON.parse(rows));
    },
    schedule(schedule, callback) {
      const source = JSON.stringify(schedule);
      api.validateSchedule(source);
      register('schedule', source, null, callback);
    },
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
    pause: delay => new Promise(resolve => timer(Symbol(), delay, resolve, false)),
    interval: (name, delay, callback) => timer(name, delay, callback, true),
    cancelTimer: (name, repeat) => (repeat === undefined || timers.get(name)?.repeat === repeat) && timers.delete(name),
    timerReference: (name, repeat) => timers.get(name)?.repeat === repeat ? name : null,
  });
  globalThis.ha = ha;
  globalThis.getState = ha.getState;
  globalThis.setState = ha.setState;
  globalThis.log = value => ha.log(String(value));
  delete globalThis.reportSimulatedEvent;
  invoke(run);
  for (const [name, callback] of [...namedSchedules]) {
    if (namedSchedules.get(name) !== callback) continue;
    report(JSON.stringify({type: 'simulated-event', event: 'schedule', target: name}));
    invoke(callback);
  }
  for (const {type, target, attribute, callback} of handlers.slice()) {
    if (type === 'event' && target === 'logic_studio_script_message') continue;
    report(JSON.stringify({type: 'simulated-event', event: type, target, attribute}));
    if (type === 'state') {
      invoke(callback, {type: 'state', entity: target, previous: {state: 'off'}, current: {state: 'on'}});
    } else if (type === 'importedState') {
      const samples = [['off', 'on'], ['on', 'off'], ['on', 'on'], ['20', '21'], ['21', '20'], ['21', '21']];
      for (const [previous, current] of samples) {
        const event = {type: 'state', entity: target, previous: {state: previous}, current: {state: current}};
        if (importedTriggerMatches(event, attribute)) invoke(callback, event);
      }
    } else if (type === 'attribute') {
      invoke(callback, {type: 'state', entity: target, previous: {attributes: {[attribute]: 0}},
        current: {attributes: {[attribute]: 1}}});
    } else {
      invoke(callback);
    }
  }
  for (const data of scriptMessages) {
    for (const {type, target, callback} of handlers.slice()) {
      if (type === 'event' && target === 'logic_studio_script_message') invoke(callback, data);
    }
    await Promise.resolve();
  }
  for (let steps = 0; timers.size; steps++) {
    if (steps >= 64) throw new Error('Simulated timer limit reached');
    const [name, next] = [...timers].reduce((a, b) => a[1].at <= b[1].at ? a : b);
    now = next.at;
    if (--next.remaining === 0) timers.delete(name);
    else next.at += next.delay;
    if (typeof name === 'string') report(JSON.stringify({type: 'simulated-timer', name, elapsedMs: now}));
    invoke(next.callback);
    await Promise.resolve();
  }
})
`;
