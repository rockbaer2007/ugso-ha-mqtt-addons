import assert from 'node:assert/strict';
import test from 'node:test';
import {connectHomeAssistant} from '../runtime/ha-connection.mjs';

test('reconnect refreshes states and restores event subscriptions', async () => {
  const sockets = [], received = [];
  class Socket extends EventTarget {
    commands = [];
    constructor() {
      super();
      sockets.push(this);
      queueMicrotask(() => this.receive({type: 'auth_required'}));
    }
    receive(message) {
      this.dispatchEvent(new MessageEvent('message', {data: JSON.stringify(message)}));
    }
    close() { this.dispatchEvent(new Event('close')); }
    send(raw) {
      const command = JSON.parse(raw);
      this.commands.push(command);
      let result = null;
      if (command.type === 'get_config') result = {time_zone: 'UTC'};
      if (command.type === 'get_states') {
        result = [{entity_id: 'input_boolean.test', state: sockets.length === 1 ? 'off' : 'on'}];
      }
      queueMicrotask(() => this.receive(command.type === 'auth' ? {type: 'auth_ok'} :
        {type: 'result', id: command.id, success: true, result}));
    }
  }
  let restored;
  const recovery = new Promise(resolve => { restored = resolve; });
  const ha = await connectHomeAssistant({token: 'mock', readable: ['input_boolean.test'], writable: [],
    events: ['logic_studio_test']}, event => received.push(event), error => assert.fail(error.message),
  Socket, online => { if (online) restored(); });
  ha.subscribe('logic_studio_test');
  ha.start();
  assert.equal(ha.state('input_boolean.test').state, 'off');
  sockets[0].close();
  assert.equal(ha.connected(), false);
  assert.equal(ha.state('input_boolean.test'), null);
  await recovery;
  assert.equal(ha.state('input_boolean.test').state, 'on');
  assert.deepEqual(sockets[1].commands.filter(cmd => cmd.type === 'subscribe_events').map(cmd => cmd.event_type),
    ['state_changed', 'logic_studio_test']);
  assert.equal(received[0].previous.state, 'off');
  assert.equal(received[0].current.state, 'on');
  sockets[1].receive({type: 'event', event: {event_type: 'logic_studio_test', data: {ok: true}}});
  assert.equal(received[1].data.ok, true);
});
