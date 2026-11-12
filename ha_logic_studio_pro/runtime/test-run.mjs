import {getQuickJS, shouldInterruptAfterDeadline} from 'quickjs-emscripten';
import {simulatedEvents} from './simulated-events.mjs';
import {importedNamedScheduleMatcher, scheduleMatcher} from './live-schedule.mjs';
import {timeOperations} from './ha-time.mjs';

const maxSource = 64_000;
const maxTrace = 100;
const id = /^[a-z0-9_]+\.[a-z0-9_]+$/;
const demoStates = Object.freeze({'binary_sensor.bewegung': 'on', 'light.flur': 'off', 'sensor.demo_temperature': '21'});

export async function testRun(source, language = 'javascript', timeZone, start = Date.now()) {
  let elapsed = 0;
  const time = timeOperations(timeZone ?? undefined, () => start + elapsed);
  if (typeof source !== 'string' || !source.trim() || Buffer.byteLength(source) > maxSource) {
    throw new Error('JavaScript-Quelltext mit höchstens 64 KB eingeben.');
  }
  if (language === 'typescript') {
    const {default: ts} = await import('typescript');
    const result = ts.transpileModule(source, {
      fileName: 'projekt.ts', reportDiagnostics: true,
      compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None},
    });
    const error = result.diagnostics?.find(item => item.category === ts.DiagnosticCategory.Error);
    if (error) throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n'));
    source = result.outputText;
  } else if (language !== 'javascript') throw new Error('Unbekannte Skriptsprache.');
  const engine = await getQuickJS();
  const runtime = engine.newRuntime();
  runtime.setMemoryLimit(16 * 1024 * 1024);
  runtime.setMaxStackSize(256 * 1024);
  runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + 500));
  try {
    const vm = runtime.newContext();
    try {
      const trace = [];
      const states = {...demoStates};
      const attributes = {'light.flur': {brightness: 128}, 'sensor.demo_temperature': {unit_of_measurement: '°C'}};
      const record = entry => {
        if (trace.length >= maxTrace) throw new Error('Maximal 100 Protokolleinträge je Testlauf.');
        trace.push(entry);
      };
      const stringArg = (handle, limit = 512) => {
        if (!handle || vm.typeof(handle) !== 'string') throw new Error('Ein Textargument wird erwartet.');
        const value = vm.getString(handle);
        if (value.length > limit) throw new Error('Textargument zu lang.');
        return value;
      };
      const identifier = handle => {
        const value = stringArg(handle, 128);
        if (!id.test(value)) throw new Error('Ungültige HA-ID: ' + value);
        return value;
      };
      const api = vm.newObject();
      try {
        const methods = {
          validateCron(source) {
            importedNamedScheduleMatcher(stringArg(source, 4096));
            return vm.undefined;
          },
          validateSchedule(source) {
            scheduleMatcher(JSON.parse(stringArg(source, 8192)));
            return vm.undefined;
          },
          stateSnapshot(entity) {
            const target = identifier(entity);
            const snapshot = Object.hasOwn(states, target)
              ? {state: states[target], attributes: attributes[target] ?? {}} : null;
            return vm.newString(JSON.stringify(snapshot));
          },
          readState(entity) {
            const target = identifier(entity);
            const state = states[target] ?? 'unknown';
            record({type: 'read', entity: target, state});
            return vm.newString(state);
          },
          readAttribute(entity, attribute) {
            const target = identifier(entity);
            const key = stringArg(attribute, 128);
            const values = attributes[target];
            const value = values && Object.hasOwn(values, key) ? values[key] : null;
            record({type: 'attribute', entity: target, attribute: key, value});
            if (value === null) return vm.null;
            return typeof value === 'number' ? vm.newNumber(value) : vm.newString(value);
          },
          callAction(action, entity, data) {
            const entry = {type: 'action', action: identifier(action), entity: identifier(entity)};
            if (data) {
              const parsed = JSON.parse(stringArg(data, 8192));
              if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Aktionsdaten müssen ein Objekt sein.');
              entry.data = parsed;
            }
            record(entry);
          },
          setNumber(entity, value) {
            const target = identifier(entity);
            if (!target.startsWith('input_number.') || !value || vm.typeof(value) !== 'number' ||
                !Number.isFinite(vm.getNumber(value))) throw new Error('input_number und endliche Zahl erwartet.');
            const number = vm.getNumber(value);
            record({type: 'action', action: 'input_number.set_value', entity: target, data: {value: number}});
            states[target] = String(number);
          },
          setText(entity, value) {
            const target = identifier(entity);
            if (!target.startsWith('input_text.')) throw new Error('input_text erwartet.');
            const message = stringArg(value);
            record({type: 'action', action: 'input_text.set_value', entity: target, data: {value: message}});
            states[target] = message;
          },
          getState(entity) {
            const target = identifier(entity);
            if (!Object.hasOwn(states, target)) return vm.null;
            const state = states[target];
            const value = state === 'on' ? vm.true : state === 'off' ? vm.false : vm.newString(state);
            const result = vm.newObject();
            try {
              vm.setProp(result, 'val', value);
              record({type: 'read', entity: target, state});
              return result;
            } catch (error) {
              result.dispose();
              throw error;
            } finally { value.dispose(); }
          },
          setState(entity, value) {
            const target = identifier(entity);
            const domain = target.split('.')[0];
            if (!['light', 'switch', 'input_boolean', 'fan'].includes(domain) || vm.typeof(value) !== 'boolean') {
              throw new Error('setState erwartet für den Testlauf eine schaltbare HA-Entität und true oder false.');
            }
            const state = vm.eq(value, vm.true) ? 'on' : 'off';
            record({type: 'action', action: domain + '.turn_' + state, entity: target});
            states[target] = state;
          },
          timeRequest(operation, args, offset) {
            elapsed = Number(stringArg(offset));
            return vm.newString(JSON.stringify(time(stringArg(operation), JSON.parse(stringArg(args)))));
          },
          log(message) {
            record({type: 'log', message: stringArg(message)});
          },
          previewAutomation(source) {
            const plan = JSON.parse(stringArg(source, maxSource));
            if (!plan || !Array.isArray(plan.triggers) || !Array.isArray(plan.actions)) {
              throw new Error('Ungültiger Automationsplan.');
            }
            record({type: 'automation-preview', plan});
          },
        };
        for (const [name, callback] of Object.entries(methods)) {
          const handle = vm.newFunction(name, callback);
          try {
            vm.setProp(api, name, handle);
          } finally {
            handle.dispose();
          }
        }
        vm.setProp(vm.global, 'ha', api);
        const report = vm.newFunction('reportSimulatedEvent', value => record(JSON.parse(stringArg(value, 32_000))));
        try {
          vm.setProp(vm.global, 'reportSimulatedEvent', report);
        } finally { report.dispose(); }
      } finally {
        api.dispose();
      }
      const result = vm.evalCode('"use strict";\n' + simulatedEvents +
        '(ha, reportSimulatedEvent, async function () {\n' + source +
        '\n}).catch(error => { globalThis.studioTestError = String(error?.message ?? error); });', 'projekt.js');
      if (result.error) {
        try {
          const message = vm.getProp(result.error, 'message');
          try {
            throw new Error(vm.typeof(message) === 'string' ? vm.getString(message).slice(0, 1000) : 'JavaScript-Testlauf fehlgeschlagen.');
          } finally {
            message.dispose();
          }
        } finally {
          result.error.dispose();
        }
      }
      result.value.dispose();
      const jobs = runtime.executePendingJobs(2048);
      if (jobs.error) {
        try { throw new Error(vm.dump(jobs.error)?.message || 'JavaScript-Testlauf fehlgeschlagen.'); }
        finally { jobs.error.dispose(); }
      }
      if (runtime.hasPendingJob()) throw new Error('JavaScript-Testlauf hat zu viele ausstehende Jobs.');
      const error = vm.getProp(vm.global, 'studioTestError');
      try {
        if (vm.typeof(error) === 'string') throw new Error(vm.getString(error).slice(0, 1000));
      } finally { error.dispose(); }
      return {ok: true, trace};
    } finally {
      vm.dispose();
    }
  } finally {
    runtime.dispose();
  }
}

if (process.argv.includes('--stdin')) {
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of process.stdin) {
      size += chunk.length;
      if (size > 400_000) throw new Error('Anfrage zu groß.');
      chunks.push(chunk);
    }
    const {source, language, timeZone} = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    process.stdout.write(JSON.stringify(await testRun(source, language, timeZone)));
  } catch (error) {
    process.stdout.write(JSON.stringify({ok: false, error: error.message}));
  }
}
