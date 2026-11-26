import assert from 'node:assert/strict';
import test from 'node:test';
import {runtimePermissions, permissionSet} from '../runtime/permissions.mjs';
import {connectHomeAssistant} from '../runtime/ha-connection.mjs';

const config = {token: 'unit-test-only', readable: [], writable: [], events: [], mqttTopics: []};
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
function socketType(states = () => [{entity_id: 'sensor.allowed', state: '1'}, {entity_id: 'sensor.secret', state: '2'}]) {
  return class Socket extends EventTarget {
    static instances = [];
    commands = [];
    constructor() {
      super();
      this.constructor.instances.push(this);
      queueMicrotask(() => this.receive({type: 'auth_required'}));
    }
    receive(message) { this.dispatchEvent(new MessageEvent('message', {data: JSON.stringify(message)})); }
    close() { this.dispatchEvent(new Event('close')); }
    send(raw) {
      const command = JSON.parse(raw);
      this.commands.push(command);
      const result = command.type === 'get_config' ? {time_zone: 'UTC'} : command.type === 'get_states' ? states(this.constructor.instances.length) : null;
      queueMicrotask(() => this.receive(command.type === 'auth' ? {type: 'auth_ok'} : {type: 'result', id: command.id, success: true, result}));
    }
  };
}
function fail(error) { assert.fail(error.message); }

test('missing/false flags preserve lists and all four permissions stay independent', () => {
  const scoped = runtimePermissions({...config, readable: ['sensor.a'], writable: ['light.a'], events: ['probe'], mqttTopics: ['test/a']});
  assert.equal(scoped.readable.has('sensor.a'), true);
  assert.equal(scoped.readable.has('light.a'), true);
  assert.equal(scoped.readable.has('sensor.other'), false);
  assert.equal(scoped.writable.has('light.other'), false);
  for (const [flag, scope, candidate] of [['readAll', 'readable', 'sensor.other'], ['writeAll', 'writable', 'light.other'],
    ['eventsAll', 'events', 'other_event'], ['mqttAll', 'mqttTopics', 'other/topic']]) {
    const permissions = runtimePermissions({...config, [flag]: true});
    assert.equal(permissions[scope].has(candidate), true);
    for (const [other, probe] of [['readable', 'sensor.other'], ['writable', 'light.other'], ['events', 'other_event'], ['mqttTopics', 'other/topic']]) {
      if (other !== scope) assert.equal(permissions[other].has(probe), false, flag + ' must not grant ' + other);
    }
    assert.equal(runtimePermissions({...config, [flag]: 'true'})[scope].has(candidate), false);
  }
});

test('all mode keeps ID, topic and length validation', () => {
  const all = runtimePermissions({...config, readAll: true, writeAll: true, eventsAll: true, mqttAll: true});
  for (const value of ['', '*', 'sensor.*', 'light.a,light.b', '__proto__', null]) {
    assert.equal(all.readable.has(value), false);
    assert.equal(all.writable.has(value), false);
  }
  for (const topic of ['test/+', 'test/#', 'test\0bad', 'test\nbad', 'x'.repeat(129)]) assert.equal(all.mqttTopics.has(topic), false);
  assert.equal(all.mqttTopics.has('house/garden/pv'), true);
  assert.equal(all.events.has('event_type'), true);
  assert.equal(all.events.has('bad event'), false);
  assert.equal(permissionSet(['sensor.a'], false).has('sensor.a'), true);
});

test('READ all loads unnamed and newly arriving entities but does not allow writes/events/topics', async () => {
  const Socket = socketType(), received = [];
  const ha = await connectHomeAssistant({...config, readAll: true}, event => received.push(event), fail, Socket);
  assert.equal(ha.state('sensor.secret').state, '2');
  assert.equal(ha.state('sensor.missing'), null);
  assert.throws(() => ha.call('light.turn_on', 'light.flur', {}), /nicht.*freigegeben/);
  assert.throws(() => ha.subscribe('sample_event'), /nicht freigegeben/);
  assert.throws(() => ha.sendto('publishMqtt', ['test/topic', 'value', false]), /nicht freigegeben/);
  ha.start();
  Socket.instances[0].receive({type: 'event', event: {event_type: 'state_changed', data: {
    entity_id: 'sensor.new', old_state: null, new_state: {entity_id: 'sensor.new', state: '3'},
  }}});
  assert.equal(ha.state('sensor.new').state, '3');
  assert.equal(received[0].entity, 'sensor.new');
});

test('WRITE all permits supported actions without granting READ all or bypassing action validation', async () => {
  const Socket = socketType();
  const ha = await connectHomeAssistant({...config, writeAll: true}, () => {}, fail, Socket);
  ha.call('light.turn_on', 'light.flur', {});
  await tick();
  assert.equal(Socket.instances[0].commands.at(-1).target.entity_id, 'light.flur');
  assert.throws(() => ha.state('sensor.secret'), /nicht freigegeben/);
  assert.throws(() => ha.call('light.reload', 'light.flur', {}), /nicht unterstützt/);
  assert.throws(() => ha.call('light.turn_on', 'light.flur', {area_id: 'house'}), /zusätzlichen Ziele/);
});

test('EVENT all subscribes by name and never leaks unrelated state_changed data', async () => {
  const Socket = socketType(), received = [];
  const ha = await connectHomeAssistant({...config, readable: ['sensor.allowed'], eventsAll: true}, event => received.push(event), fail, Socket);
  ha.subscribe('sample_event');
  ha.start();
  await tick();
  const socket = Socket.instances[0];
  socket.receive({type: 'event', event: {event_type: 'state_changed', data: {entity_id: 'sensor.secret', new_state: {state: 'secret'}}}});
  assert.deepEqual(received, []);
  socket.receive({type: 'event', event: {event_type: 'not_subscribed', data: {secret: true}}});
  assert.deepEqual(received, []);
  socket.receive({type: 'event', event: {event_type: 'sample_event', data: {ok: true}}});
  assert.equal(received[0].data.ok, true);
  assert.throws(() => ha.subscribe('state_changed'), /nicht freigegeben/);
  assert.throws(() => ha.state('sensor.secret'), /nicht freigegeben/);
  ha.sendto('fireEvent', ['logic_studio_probe', {ok: true}]);
  assert.throws(() => ha.sendto('fireEvent', ['homeassistant_stop', {}]), /nicht zum Senden freigegeben/);
});

test('TOPICS all permits concrete topics only and grants no other permissions', async () => {
  const Socket = socketType();
  const ha = await connectHomeAssistant({...config, mqttAll: true}, () => {}, fail, Socket);
  ha.sendto('publishMqtt', ['house/garden', '42', false]);
  await tick();
  assert.equal(Socket.instances[0].commands.at(-1).service_data.topic, 'house/garden');
  assert.throws(() => ha.sendto('publishMqtt', ['house/#', '42', false]), /nicht freigegeben/);
  assert.throws(() => ha.call('switch.turn_on', 'switch.x', {}), /nicht.*freigegeben/);
  assert.throws(() => ha.state('sensor.secret'), /nicht freigegeben/);
});

test('READ all restores unnamed, added and removed entities after reconnect', async () => {
  const Socket = socketType(index => index === 1 ? [{entity_id: 'sensor.old', state: '1'}] : [{entity_id: 'sensor.new', state: '2'}]);
  const received = [];
  let restored;
  const recovery = new Promise(resolve => { restored = resolve; });
  const ha = await connectHomeAssistant({...config, readAll: true}, event => received.push(event), fail, Socket,
    online => { if (online) restored(); });
  ha.start();
  Socket.instances[0].close();
  await recovery;
  assert.equal(ha.state('sensor.old'), null);
  assert.equal(ha.state('sensor.new').state, '2');
  assert.equal(received.find(event => event.entity === 'sensor.old').current, null);
  assert.equal(received.find(event => event.entity === 'sensor.new').previous, null);
});
