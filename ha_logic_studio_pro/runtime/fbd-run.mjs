import {readFileSync} from 'node:fs';
import {adapt} from '../web/catalog.js';
import {analyze, loadPlan, scan} from '../web/core.js';
import {outputAction, outputMode, validateOutput} from '../web/output.js';
import {timedTypes} from '../web/stateful.js';
import {isFlow} from '../web/flow.js';
import {connectHomeAssistant} from './ha-connection.mjs';

const report = (type, text) => process.stdout.write(JSON.stringify({type, text}) + '\n');
const fail = error => {
  report('error', error.message);
  process.exitCode = 1;
  process.stdout.write('', () => process.exit(1));
};

try {
  const {source, homeAssistant: config} = JSON.parse(readFileSync(0, 'utf8'));
  if (!config?.token) throw Error('FBD benötigt eine Live-Verbindung zu Home Assistant.');
  const {plan: raw, mode, interval} = JSON.parse(source);
  if (!raw || !Array.isArray(raw.blocks)) throw Error('Kein gespeicherter FBD-Plan vorhanden.');
  if (isFlow(raw)) throw Error('Importierte HA-Abläufe als HA-YAML ausführen.');
  if (!['auto', 'cycle'].includes(mode) || !Number.isInteger(interval) || interval < 100 || interval > 60000) {
    throw Error('FBD-Zyklus: 100 bis 60000 ms.');
  }
  const defs = new Map(adapt(JSON.parse(readFileSync(new URL('../web/reference-blocks.json', import.meta.url)))).map(d => [d.type, d]));
  const plan = loadPlan(raw, defs);
  plan.target = 'javascript';
  const issues = analyze(plan, defs).errors;
  if (issues.length) throw Error(issues.join('\n'));
  const inputs = plan.blocks.filter(b => b.type === 'STATE_IN');
  const outputs = plan.blocks.filter(b => b.type === 'STATE_OUT');
  const readable = new Set([...config.readable, ...config.writable]);
  const writable = new Set(config.writable);
  for (const b of inputs) if (!readable.has(b.params.oid)) throw Error('HA-Eingang nicht freigegeben: ' + b.params.oid);
  const targets = new Set();
  for (const b of outputs) {
    if (!writable.has(b.params.oid)) throw Error('HA-Ausgang nicht freigegeben: ' + b.params.oid);
    if (targets.has(b.params.oid)) throw Error('Mehrere Ausgänge für ' + b.params.oid);
    targets.add(b.params.oid);
  }
  let memory = {}, boot = true, previousError, failed = false;
  const last = new Map();
  const inputValue = (b, state) => b.params.attribute ? state?.attributes?.[b.params.attribute] : state?.state;
  const stop = error => { failed = true; fail(error); };
  const ha = await connectHomeAssistant(config, event => {
    if (mode === 'auto' && event.type === 'state' && inputs.some(b => b.params.oid === event.entity &&
      !Object.is(inputValue(b, event.previous), inputValue(b, event.current)))) run();
  }, stop);
  function run() {
    if (failed) return;
    try {
      const result = scan(plan, defs, {memory, boot, readInput: b => inputValue(b, ha.state(b.params.oid))});
      const writes = outputs.map(b => {
        const entity = b.params.oid, mode = outputMode(b);
        const meta = ha.state(entity)?.attributes ?? {};
        const value = validateOutput(mode, result.values.get(b.id), meta);
        return {entity, value, command: outputAction(entity, mode, value)};
      });
      memory = result.memory;
      boot = false;
      if (previousError) report('log', 'FBD-Eingänge wieder gültig.');
      previousError = undefined;
      for (const {entity, value, command} of writes) {
        if (last.has(entity) && Object.is(last.get(entity), value)) continue;
        const {entity_id, ...data} = command.data;
        ha.call(command.action, entity, data);
        last.set(entity, value);
      }
    } catch (error) {
      if (error.message !== previousError) report('log', 'FBD-Auswertung angehalten: ' + error.message);
      previousError = error.message;
    }
  }
  ha.start();
  report('running', mode === 'cycle' ? 'FBD läuft im Zyklus (' + interval + ' ms).' : 'FBD reagiert auf HA-Eingangsänderungen.');
  run();
  if (mode === 'cycle' || plan.blocks.some(b => timedTypes.has(b.type))) {
    setInterval(run, mode === 'cycle' ? interval : 100);
  }
} catch (error) { fail(error); }
