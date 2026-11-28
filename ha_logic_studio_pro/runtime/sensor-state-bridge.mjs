import {connectHomeAssistant} from './ha-connection.mjs';
import {createSensorStateWriter, sensorStateEvent} from './sensor-state.mjs';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const config = JSON.parse(input);
const write = createSensorStateWriter(config);
const report = error => console.error('Sensorzustand-Brücke: ' + error.message);
const ha = await connectHomeAssistant({...config, startupRetry: true, events: [sensorStateEvent], eventsAll: false}, event => {
  if (event.type !== 'event' || event.name !== sensorStateEvent) return;
  const data = event.data;
  if (!data || Object.keys(data).some(key => !['entity_id', 'state'].includes(key))) return;
  write(data.entity_id, data.state).catch(report);
}, report);
ha.subscribe(sensorStateEvent);
ha.start();
