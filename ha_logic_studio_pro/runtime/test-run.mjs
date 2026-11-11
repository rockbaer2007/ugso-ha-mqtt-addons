import {getQuickJS, shouldInterruptAfterDeadline} from 'quickjs-emscripten';

const maxSource = 64_000;
const maxTrace = 100;
const id = /^[a-z0-9_]+\.[a-z0-9_]+$/;
const demoStates = Object.freeze({'binary_sensor.bewegung': 'on', 'light.flur': 'off'});

export async function testRun(source) {
  if (typeof source !== 'string' || !source.trim() || Buffer.byteLength(source) > maxSource) {
    throw new Error('JavaScript-Quelltext mit höchstens 64 KB eingeben.');
  }
  const engine = await getQuickJS();
  const runtime = engine.newRuntime();
  runtime.setMemoryLimit(16 * 1024 * 1024);
  runtime.setMaxStackSize(256 * 1024);
  runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + 500));
  try {
    const vm = runtime.newContext();
    try {
      const trace = [];
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
            const state = demoStates[target] ?? 'unknown';
            record({type: 'read', entity: target, state});
            return vm.newString(state);
          },
          callAction(action, entity) {
            record({type: 'action', action: identifier(action), entity: identifier(entity)});
          },
          log(message) {
            record({type: 'log', message: stringArg(message)});
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
      const result = vm.evalCode('"use strict";\nObject.freeze(ha);\n' + source, 'projekt.js');
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
    const {source} = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    process.stdout.write(JSON.stringify(await testRun(source)));
  } catch (error) {
    process.stdout.write(JSON.stringify({ok: false, error: error.message}));
  }
}
