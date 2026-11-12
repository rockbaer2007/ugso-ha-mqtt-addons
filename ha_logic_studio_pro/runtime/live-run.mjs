import {getQuickJS, shouldInterruptAfterDeadline} from 'quickjs-emscripten';
import {connectHomeAssistant} from './ha-connection.mjs';
import {cronMatcher, dateTimeSchedule, scheduleClock, scheduleMatcher, sunSchedule} from './live-schedule.mjs';
import {guestTimeApi, sunTimeAttributes, timeOperations} from './ha-time.mjs';

function report(type, text = '') {
  process.stdout.write(JSON.stringify({type, text: text.slice(0, 1000)}) + '\n');
}

try {
  const {source, language, homeAssistant} = JSON.parse(await readInput());
  let code = source;
  if (language === 'typescript') {
    const {default: ts} = await import('typescript');
    const result = ts.transpileModule(source, {fileName: 'project.ts', reportDiagnostics: true,
      compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None}});
    const error = result.diagnostics?.find(item => item.category === ts.DiagnosticCategory.Error);
    if (error) throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n'));
    code = result.outputText;
  }
  const engine = await getQuickJS();
  const runtime = engine.newRuntime();
  runtime.setMemoryLimit(16 * 1024 * 1024);
  runtime.setMaxStackSize(256 * 1024);
  const vm = runtime.newContext();
  // HA event data is passed as JSON, separate from the project source.
  const scheduled = new Map();
  let ticker;
  let failed = false;
  function fail(error) {
    if (failed) return;
    failed = true;
    clearInterval(ticker);
    report('error', error.message);
    process.exitCode = 1;
    setImmediate(() => process.exit(1));
  }
  function dispatch(event) {
    if (failed) return;
    try { evaluate(`studioDispatch(JSON.parse(${JSON.stringify(JSON.stringify(event))}))`); }
    catch (error) { fail(error); }
  }
  const ha = homeAssistant ? await connectHomeAssistant(homeAssistant, dispatch, fail) : null;
  const localTime = scheduleClock(ha?.timezone);
  const time = timeOperations(ha?.timezone);
  function evaluate(code) {
    runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + 500));
    const result = vm.evalCode(code, 'project.js');
    if (result.error) {
      const message = vm.getProp(result.error, 'message');
      try { throw new Error(vm.getString(message).slice(0, 1000)); }
      finally { message.dispose(); result.error.dispose(); }
    }
    result.value.dispose();
    const jobs = runtime.executePendingJobs(2048);
    if (jobs.error) {
      try { throw new Error(vm.dump(jobs.error)?.message || 'JavaScript job failed.'); }
      finally { jobs.error.dispose(); }
    }
    if (runtime.hasPendingJob()) throw new Error('Zu viele ausstehende JavaScript-Jobs.');
  }
  let windowStart = Date.now(), messages = 0;
  const logger = vm.newFunction('report', value => {
    if (Date.now() - windowStart >= 1000) { windowStart = Date.now(); messages = 0; }
    if (++messages <= 20) report('log', vm.getString(value));
  });
  vm.setProp(vm.global, 'runtimeLog', logger);
  logger.dispose();
  const bridge = vm.newFunction('bridge', (command, payload) => {
    if (vm.typeof(command) !== 'string' || vm.typeof(payload) !== 'string') throw new Error('Ungültige HA-Anfrage.');
    const text = vm.getString(payload);
    if (Buffer.byteLength(text) > 48_000) throw new Error('HA-Anfrage zu groß.');
    const args = JSON.parse(text);
    const operation = vm.getString(command);
    if (operation === 'projectError') {
      fail(new Error(String(args[0]).slice(0, 1000)));
      return vm.undefined;
    }
    if (operation === 'astroTime') {
      const [event, offset] = args;
      const attribute = Object.hasOwn(sunTimeAttributes, event) && sunTimeAttributes[event];
      const ms = attribute && ha ? Date.parse(ha.state('sun.sun')?.attributes?.[attribute]) : NaN;
      if (!Number.isFinite(ms) || !Number.isFinite(offset) || Math.abs(offset) > 1440) {
        throw new Error('Sonnenzeit aus sun.sun nicht verfügbar / Sun time unavailable.');
      }
      return vm.newString(String(ms + offset * 60_000));
    }
    if (operation === 'time') return vm.newString(JSON.stringify(time(...args)));
    if (operation === 'schedule') {
      if (scheduled.size >= 32) throw new Error('Maximal 32 Zeitpläne pro Skript.');
      const matches = scheduleMatcher(args[1]);
      scheduled.set(args[0], (_now, _previous, local) => matches(local));
      return vm.undefined;
    }
    if (operation === 'namedSchedule') {
      const [name, cron] = args;
      if (!scheduled.has(name) && scheduled.size >= 32) throw new Error('Maximal 32 Zeitpläne pro Skript.');
      const matches = cronMatcher(cron);
      scheduled.set(name, (_now, _previous, local, date) => matches(local, date));
      return vm.undefined;
    }
    if (operation === 'stopSchedule') {
      scheduled.delete(args[0]);
      return vm.undefined;
    }
    if (!ha) throw new Error('Live-HA-Anbindung nur in der Home-Assistant-App verfügbar.');
    if (operation === 'sunSchedule' || operation === 'dateTimeSchedule') {
      if (scheduled.size >= 32) throw new Error('Maximal 32 Zeitpläne pro Skript.');
      const [index, target, offset] = args;
      const entity = operation === 'sunSchedule' ? 'sun.sun' : target;
      if (operation === 'dateTimeSchedule' && (typeof entity !== 'string' || !/^input_datetime\.[a-z0-9_]+$/.test(entity))) {
        throw new Error('input_datetime erwartet.');
      }
      ha.state(entity);
      scheduled.set(index, operation === 'sunSchedule'
        ? sunSchedule(() => ha.state(entity), target, offset, Date.now())
        : dateTimeSchedule(() => ha.state(entity), value => time('convert', [value, 'ms', 'ms'])));
      return vm.undefined;
    }
    if (operation === 'state') {
      const state = ha.state(args[0]);
      return vm.newString(JSON.stringify(state ? {state: state.state, attributes: state.attributes} : null));
    }
    if (operation === 'event') ha.subscribe(args[0]);
    else if (operation === 'action') ha.call(args[0], args[1], args[2]);
    else if (['publishMqtt', 'notify', 'fireEvent'].includes(operation)) ha.sendto(operation, args);
    else throw new Error('Unbekannte HA-Anfrage.');
    return vm.undefined;
  });
  vm.setProp(vm.global, 'runtimeBridge', bridge);
  bridge.dispose();
  evaluate(`'use strict';
    const {tick, studioDispatch} = ((report, bridge, run) => {
      const timers = new Map();
      const handlers = [];
      const namedSchedules = new Map();
      const call = (operation, ...args) => bridge(operation, JSON.stringify(args));
      const invoke = (callback, ...args) => {
        const result = callback(...args);
        if (result && typeof result.then === 'function') result.catch(error => call('projectError', String(error?.message ?? error)));
      };
      const state = entity => JSON.parse(call('state', entity));
      const register = (type, target, attribute, callback) => {
        if (handlers.length >= 32 || typeof callback !== 'function') throw new Error('Ungültiger Auslöser.');
        const index = handlers.length;
        if (type === 'schedule') call('schedule', index, target);
        else if (type === 'sun') call('sunSchedule', index, target, attribute);
        else if (type === 'datetime') call('dateTimeSchedule', index, target);
        else if (type === 'event') call('event', target);
        else call('state', target);
        handlers.push({type, target, attribute, callback});
      };
      function timer(name, delay, callback, repeat) {
        if ((typeof name !== 'symbol' && (typeof name !== 'string' || name.length > 128)) || typeof callback !== 'function' ||
            !Number.isSafeInteger(delay) || delay < 0 || delay > 2147483647 ||
            (!timers.has(name) && timers.size >= 32)) throw new Error('Invalid timer');
        const period = Math.max(50, delay);
        timers.set(name, {due: Date.now() + period, period, callback, repeat});
      }
      const log = value => report(String(value).slice(0, 1000));
      const callAction = (action, entity, data = {}) => call('action', action, entity, data);
      const timeRequest = (op, args) => JSON.parse(call('time', op, args));
      const astroTimeRequest = (event, offset) => Number(call('astroTime', event, offset));
      const ha = Object.freeze({${guestTimeApi} log, timeout: (n,d,fn) => timer(n,d,fn,false),
        pause: delay => new Promise(resolve => timer(Symbol(), delay, resolve, false)),
        publishMqtt: (topic, message, retain = false) => call('publishMqtt', topic, message, retain),
        notify: (entity, message, title = '') => call('notify', entity, message, title),
        fireEvent: (name, data = {}) => call('fireEvent', name, data),
        interval: (n,d,fn) => timer(n,d,fn,true),
        cancelTimer: (name, repeat) => (repeat === undefined || timers.get(name)?.repeat === repeat) && timers.delete(name),
        timerReference: (name, repeat) => timers.get(name)?.repeat === repeat ? name : null,
        readState: entity => state(entity)?.state ?? 'unknown',
        stateSnapshot: entity => call('state', entity),
        readAttribute: (entity, name) => state(entity)?.attributes?.[name] ?? null,
        getState: entity => {
          const value = state(entity)?.state;
          return value == null ? null : {val: value === 'on' ? true : value === 'off' ? false : value};
        },
        setState: (entity, value) => {
          if (typeof value !== 'boolean') throw new Error('setState erwartet true oder false.');
          return callAction(entity.split('.')[0] + '.turn_' + (value ? 'on' : 'off'), entity);
        },
        setNumber: (entity, value) => callAction('input_number.set_value', entity, {value}),
        setText: (entity, value) => callAction('input_text.set_value', entity, {value}), callAction,
        onState: (entity, callback) => register('state', entity, null, callback),
        onAttribute: (entity, key, callback) => register('attribute', entity, key, callback),
        onEvent: (name, callback) => register('event', name, null, callback),
        schedule: (pattern, callback) => register('schedule', pattern, null, callback),
        namedSchedule(name, cron, callback) {
          if (typeof name !== 'string' || !name.trim() || name.length > 128 || typeof callback !== 'function') throw new Error('Ungültiger benannter Zeitplan.');
          call('namedSchedule', name, cron);
          namedSchedules.set(name, callback);
        },
        stopSchedule(name) {
          call('stopSchedule', name);
          namedSchedules.delete(name);
        },
        onSun: (event, callback, offset = 0) => register('sun', event, offset, callback),
        scheduleFromDateTime: (entity, callback) => register('datetime', entity, null, callback)});
      delete globalThis.runtimeLog;
      delete globalThis.runtimeBridge;
      globalThis.getState = ha.getState;
      globalThis.setState = ha.setState;
      invoke(run, ha, log);
      const tick = now => {
        for (const [name, item] of [...timers]) {
          if (item.due > now || timers.get(name) !== item) continue;
          if (item.repeat) item.due = now + item.period;
          else timers.delete(name);
          invoke(item.callback);
        }
      };
      const studioDispatch = event => {
        if (event.type === 'schedule') {
          const callback = typeof event.index === 'string' ? namedSchedules.get(event.index) : handlers[event.index]?.callback;
          if (callback) invoke(callback, event);
          return;
        }
        for (const {type, target, attribute, callback} of handlers.slice()) {
          if (type === 'event' && event.type === 'event' && target === event.name) invoke(callback, event.data);
          if (event.type !== 'state' || target !== event.entity) continue;
          if (type === 'state' && event.previous?.state !== event.current?.state) invoke(callback, event);
          if (type === 'attribute' && JSON.stringify(event.previous?.attributes?.[attribute]) !==
              JSON.stringify(event.current?.attributes?.[attribute])) invoke(callback, event);
        }
      };
      return {tick, studioDispatch};
    })(runtimeLog, runtimeBridge, async (ha, log) => {\n${code}\n});`);
  if (!failed) {
    ha?.start();
    report('running');
  }
  // A started project stays loaded until stopped, even when it has no timers.
  let previousSecond = Math.floor(Date.now() / 1000);
  let previousScheduleCheck = Date.now();
  ticker = setInterval(() => {
    try {
      const now = Date.now();
      evaluate(`tick(${now})`);
      const second = Math.floor(now / 1000);
      if (second <= previousSecond) return;
      previousSecond = second;
      if (!scheduled.size) return;
      const local = localTime(now);
      const date = time('current', ['day']);
      for (const [index, matches] of [...scheduled]) {
        if (scheduled.get(index) !== matches) continue;
        if (matches(now, previousScheduleCheck, local, date)) dispatch({type: 'schedule', index, time: local.clock, weekday: local.weekday});
      }
      previousScheduleCheck = now;
    } catch (error) { fail(error); }
  }, 50);
} catch (error) {
  report('error', error.message);
  process.exit(1);
}

async function readInput() {
  const chunks = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > 400_000) throw new Error('Input too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}
