import {getQuickJS, shouldInterruptAfterDeadline} from 'quickjs-emscripten';

const maxSource = 64_000;
const maxTrace = 100;
const id = /^[a-z0-9_]+\.[a-z0-9_]+$/;
const demoStates = Object.freeze({'binary_sensor.bewegung': 'on', 'light.flur': 'off'});

export async function testRun(source, language = 'javascript') {
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
          readState(entity) {
            const target = identifier(entity);
            const state = states[target] ?? 'unknown';
            record({type: 'read', entity: target, state});
            return vm.newString(state);
          },
          callAction(action, entity) {
            record({type: 'action', action: identifier(action), entity: identifier(entity)});
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
      } finally {
        api.dispose();
      }
      const result = vm.evalCode('"use strict";\nObject.freeze(ha);\n' +
        'globalThis.getState = ha.getState; globalThis.setState = ha.setState;\n' +
        'globalThis.log = value => ha.log(String(value));\n' + source, 'projekt.js');
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
    const {source, language} = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    process.stdout.write(JSON.stringify(await testRun(source, language)));
  } catch (error) {
    process.stdout.write(JSON.stringify({ok: false, error: error.message}));
  }
}
