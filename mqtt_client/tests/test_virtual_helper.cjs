'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const {createVirtualMapper, initialize, publishCommand} = require('../app/iobroker/ugso-mqtt-role-mapper.js');

function fixture(mode = 'apply') {
    const settings = {mqttRoot: 'mqtt.0.ha_external', aliasRoot: 'alias.0.ugso_mqtt_roles', backupId: '0_userdata.0.ugso_mqtt_roles.backup', virtualRoot: '0_userdata.0.ugso_mqtt', virtualBackupId: '0_userdata.0.ugso_mqtt_helper.backup', mode, excludeIds: []};
    const objects = {}, states = {}, writes = [], sends = [], catalog = {};
    let clock = 1000;
    const clone = value => JSON.parse(JSON.stringify(value));
    const api = {
        getObject: id => objects[id] && clone(objects[id]), getState: id => states[id] && clone(states[id]), now: () => clock,
        ensureFolders: async id => {
            const parts = id.split('.');
            for (let size = 3; size <= parts.length; size++) {
                const path = parts.slice(0, size).join('.');
                if (objects[path] && !['folder', 'channel', 'device'].includes(objects[path].type)) throw new Error('Folder conflict');
                if (!objects[path]) objects[path] = {type: 'folder'};
            }
        },
        listSources: () => Object.keys(objects).filter(id => id.startsWith(settings.mqttRoot + '.') && id.endsWith('.state')),
        writeJournal: async (id, value) => { writes.push(['backup', id]); objects[id] = {type: 'state'}; states[id] = {val: value, ack: true}; },
        createVirtual: async (id, object) => { writes.push(['create', id]); objects[id] = clone(object); },
        setVirtual: async (id, state) => { writes.push(['value', id]); states[id] = {...clone(state), ts: clock}; },
        disableVirtual: async id => { writes.push(['disable', id]); objects[id].common.write = false; },
        sendCommand: async (id, payload) => sends.push([id, payload]), log: () => {},
    };
    function state(id, value, common = {}, native = {}) {
        objects[id] = {type: 'state', common: {type: typeof value, read: true, write: true, ...common}, native};
        states[id] = {val: value, ack: true, q: 0, ts: 100};
    }
    function updateCatalog() { state(settings.mqttRoot + '.selected_entities', 'v1:' + JSON.stringify(catalog)); }
    function add(entity, name, value, attrs = {}, command = true, features = []) {
        const base = settings.mqttRoot + '.' + name, source = base + '.state';
        const topic = 'ha_external/' + name.replaceAll('.', '/') + '/state';
        state(source, value, {}, {topic});
        if (command) state(base + '.set', '', {}, {topic: topic.slice(0, -6) + '/set'});
        for (const [key, val] of Object.entries({ha_entity_id: entity, command_enabled: command, ...attrs})) state(base + '.attribute.' + key, val);
        catalog[entity] = {state_topic: topic, command, features}; updateCatalog();
        return source;
    }
    function feature(root, name, value) {
        const source = root.slice(0, -6) + '.' + name + '.state', topic = objects[root].native.topic.slice(0, -6) + '/' + name + '/state';
        state(source, value, {}, {topic}); state(source.slice(0, -6) + '.set', '', {}, {topic: topic.slice(0, -6) + '/set'});
        return source;
    }
    state(settings.mqttRoot + '.availability', 'online');
    return {settings, api, objects, states, writes, sends, catalog, state, add, feature, updateCatalog,
        target: id => settings.virtualRoot + id.slice(settings.mqttRoot.length), tick: (ms = 1) => clock += ms,
        event: (id, val, ack = false) => ({id, state: {val, ack, q: 0, ts: ++clock}}),
        mapper: () => createVirtualMapper(api, settings)};
}

test('commands use the MQTT adapter topic API with retain false and preserve raw set values', async () => {
    const f = fixture(), source = f.add('switch.plug', 'plug.switch', 'on'), id = source.slice(0, -6) + '.set';
    const calls = [], before = structuredClone(f.states);
    f.api.sendMqtt = async (...args) => { calls.push(args); return {result: true}; };
    await publishCommand(f.api, f.settings, id, 'ON');
    assert.deepEqual(calls, [['mqtt.0', 'sendMessage2Client', {topic: f.objects[id].native.topic, message: 'ON', retain: false}, {timeout: 5000}]]);
    assert.deepEqual(f.states, before);
    f.objects[id].native.topic = 'unrelated/device/set';
    await assert.rejects(publishCommand(f.api, f.settings, id, 'OFF'), /does not match/);
    assert.equal(calls.length, 1);
    f.objects[id].native.topic = f.objects[source].native.topic.slice(0, -6) + '/set';
    f.api.sendMqtt = async () => ({error: 'MQTT server stopped'});
    await assert.rejects(publishCommand(f.api, f.settings, id, 'OFF'), /stopped/);
});

test('all modes initialize missing helper infrastructure once without changing existing values or source objects', async () => {
    for (const mode of ['preview', 'apply', 'restore']) {
        const f = fixture(mode), source = f.add('switch.plug', 'plug.switch', 'on');
        const sourceBefore = structuredClone(f.objects[source]);
        await initialize(f.api, f.settings);
        assert.equal(f.objects[f.settings.virtualRoot].type, 'folder');
        assert.equal(f.objects[f.settings.aliasRoot].type, 'folder');
        assert.equal(JSON.parse(f.states[f.settings.virtualBackupId].val).format, 'ugso-mqtt-vis2');
        assert.equal(JSON.parse(f.states[f.settings.backupId].val).format, 'ugso-mqtt-roles');
        assert.equal(f.objects[f.target(source)], undefined);
        assert.deepEqual(f.objects[source], sourceBefore);
        const before = structuredClone(f.states), writeCount = f.writes.length;
        await initialize(f.api, f.settings);
        assert.deepEqual(f.states, before); assert.equal(f.writes.length, writeCount);
        assert.deepEqual(f.sends, []);
    }
});

test('initialization preserves existing backups and refuses colliding paths', async () => {
    const f = fixture('preview');
    f.state(f.settings.backupId, 'existing backup');
    await initialize(f.api, f.settings);
    assert.equal(f.states[f.settings.backupId].val, 'existing backup');
    const g = fixture('preview'); g.settings.backupId = g.settings.virtualBackupId;
    await assert.rejects(initialize(g.api, g.settings), /Conflicting/); assert.deepEqual(g.writes, []);
});

test('preview mapping writes nothing; apply creates backup before points and sends no startup command', async () => {
    const f = fixture('preview'), id = f.add('switch.plug', 'plug.switch', 'on');
    const before = structuredClone(f.objects);
    await f.mapper().run(); assert.deepEqual(f.writes, []); assert.deepEqual(f.objects, before);
    f.settings.mode = 'apply'; const mapper = f.mapper(); await mapper.run();
    const target = f.target(id);
    assert.deepEqual(f.writes.slice(0, 2).map(x => x[0]), ['backup', 'create']);
    assert.equal(f.states[target].val, true); assert.equal(f.states[target].ack, true);
    assert.equal(f.objects[target].common.role, 'switch'); assert.equal(f.objects[target].common.write, true);
    assert.equal(f.states[id].val, 'on'); assert.equal(f.objects[id].common.role, undefined); assert.deepEqual(f.sends, []);
});

test('ack false sends OFF; only a fresh source update confirms, without an echo loop', async () => {
    const f = fixture(), id = f.add('switch.plug', 'plug.switch', 'on'), mapper = f.mapper();
    await mapper.run(); const target = f.target(id), event = f.event(target, false);
    f.states[target] = event.state; await mapper.command(event);
    assert.deepEqual(f.sends, [[id.slice(0, -6) + '.set', 'OFF']]);
    await mapper.run(); assert.equal(f.states[target].ack, false);
    f.states[id] = {val: 'off', ack: true, q: 0, ts: f.tick(100)};
    await mapper.run(); assert.equal(f.states[target].val, false); assert.equal(f.states[target].ack, true);
    await mapper.command(f.event(target, false, true)); assert.equal(f.sends.length, 1);
});

test('old UI requests are not replayed on startup/restart', async () => {
    const f = fixture(), id = f.add('switch.plug', 'plug.switch', 'off'), mapper = f.mapper();
    const old = {id: f.target(id), state: {val: true, ack: false, q: 0, ts: 999}};
    await mapper.command(old); await mapper.run(); await mapper.command(old);
    assert.deepEqual(f.sends, []);
    f.states[f.target(id)] = {val: true, ack: false, ts: 1001};
    f.tick(100); await f.mapper().run(); assert.equal(f.states[f.target(id)].val, false); assert.deepEqual(f.sends, []);
});

test('unsupported/unselected/offline controls and raw MQTT writes cannot send', async () => {
    const f = fixture(), id = f.add('switch.plug', 'plug.switch', 'on'), mapper = f.mapper();
    await mapper.run(); const event = f.event(f.target(id), false);
    await mapper.command(f.event(id, 'off')); assert.deepEqual(f.sends, []);
    f.states[f.settings.mqttRoot + '.availability'].val = 'offline';
    await assert.rejects(mapper.command(event), /offline/);
    f.states[f.settings.mqttRoot + '.availability'].val = 'online';
    f.catalog['switch.plug'].command = false; f.updateCatalog();
    await assert.rejects(mapper.command(event), /disabled/);
    delete f.catalog['switch.plug']; f.updateCatalog();
    await mapper.run(); assert.equal(f.states[f.target(id)].q, 0x82); assert.deepEqual(f.sends, []);
});

test('renamed and removed topics cannot recreate stale controls from retained metadata', async () => {
    const f = fixture();
    const old = f.add('switch.plug', 'old.switch', 'on');
    const current = f.add('switch.plug', 'new.switch', 'off');
    await f.mapper().run();
    assert.equal(f.objects[f.target(old)], undefined); assert.equal(f.states[f.target(current)].val, false);
});

test('Light channels normalize brightness, Kelvin, effects and RGB for VIS 2', async () => {
    const f = fixture(), root = f.add('light.lamp', 'lamp.switch', 'on', {effect_list: ['Rainbow', 'off'], min_color_temp_kelvin: 2000, max_color_temp_kelvin: 6500}, true, ['brightness', 'rgb_color', 'effect', 'color_temp_kelvin']);
    const brightness = f.feature(root, 'brightness', 50), rgb = f.feature(root, 'rgb_color', '[1,2,255]'), effect = f.feature(root, 'effect', 'Rainbow'), kelvin = f.feature(root, 'color_temp_kelvin', 3000);
    const mapper = f.mapper(); await mapper.run();
    assert.equal(f.states[f.target(rgb)].val, '#0102FF'); assert.equal(f.objects[f.target(rgb)].common.role, 'level.color.rgb');
    for (const [source, value, payload] of [[brightness, 75, '75'], [rgb, '#FF8000', '[255,128,0]'], [effect, 'off', 'off'], [kelvin, 4000, '4000']]) {
        await mapper.command(f.event(f.target(source), value));
        assert.deepEqual(f.sends.at(-1), [source.slice(0, -6) + '.set', payload]);
    }
    for (const [source, value] of [[brightness, 101], [brightness, true], [rgb, 'red'], [effect, 'Missing'], [kelvin, 1999], [kelvin, 3000.5]]) await assert.rejects(mapper.command(f.event(f.target(source), value)));
    assert.equal(f.sends.length, 4);
    f.catalog['light.lamp'].features = []; f.updateCatalog();
    await assert.rejects(mapper.command(f.event(f.target(brightness), 50))); assert.equal(f.sends.length, 4);
});

test('numeric/date/battery sources create read-only typed points; unknowns never become zero', async () => {
    const f = fixture();
    const date = f.add('sensor.date', 'date.sensor', '2026-06-01', {device_class: 'date'}, false);
    const low = f.add('binary_sensor.low', 'low.binary_sensor', 'on', {device_class: 'battery'}, false);
    const power = f.add('sensor.power', 'power.sensor', 42, {device_class: 'power', unit_of_measurement: 'W'}, false);
    const unknown = f.add('sensor.unknown', 'unknown.sensor', 'unavailable', {}, false);
    const mapper = f.mapper(); await mapper.run();
    assert.equal(f.objects[f.target(date)].common.role, 'date'); assert.equal(f.objects[f.target(date)].common.write, false);
    assert.equal(f.states[f.target(low)].val, true); assert.equal(f.objects[f.target(low)].common.role, 'indicator.lowbat');
    assert.equal(f.states[f.target(power)].val, 42); assert.equal(f.objects[f.target(power)].common.unit, 'W');
    assert.equal(f.objects[f.target(unknown)], undefined);
    f.states[power] = {val: 'unknown', ack: true, ts: f.tick()}; await mapper.run();
    assert.equal(f.states[f.target(power)].val, 42); assert.equal(f.states[f.target(power)].q, 0x82);
    await mapper.command(f.event(f.target(date), '2027-01-01')); assert.deepEqual(f.sends, []);
});

test('existing userdata and manual role changes are preserved, backup failure blocks creation', async () => {
    const f = fixture(), id = f.add('switch.plug', 'plug.switch', 'on'), target = f.target(id);
    f.objects[target] = {type: 'state', common: {role: 'text', type: 'string'}};
    await f.mapper().run(); assert.equal(f.objects[target].common.role, 'text'); assert.deepEqual(f.writes, []);
    delete f.objects[target];
    f.api.writeJournal = async () => { throw new Error('backup failed'); };
    await assert.rejects(f.mapper().run(), /backup failed/); assert.equal(f.objects[target], undefined);
    assert.deepEqual(f.sends, []);
});

test('source type changes preserve existing virtual values and mark them invalid', async () => {
    const f = fixture(), id = f.add('sensor.value', 'value.sensor', 42, {}, false), mapper = f.mapper();
    await mapper.run(); f.states[id] = {val: 'Changed to text', ack: true, q: 0, ts: f.tick()};
    await mapper.run();
    assert.equal(f.states[f.target(id)].val, 42); assert.equal(f.states[f.target(id)].q, 0x82);
    assert.equal(f.objects[f.target(id)].common.type, 'number');
});

test('an interrupted point creation can retry after permissions are fixed', async () => {
    const f = fixture(), id = f.add('switch.plug', 'plug.switch', 'on'), mapper = f.mapper();
    const create = f.api.createVirtual;
    f.api.createVirtual = async () => { throw new Error('setObject disabled'); };
    await assert.rejects(mapper.run(), /disabled/);
    assert.equal(f.objects[f.target(id)], undefined);
    f.api.createVirtual = create;
    await mapper.run();
    assert.equal(f.states[f.target(id)].val, true); assert.equal(f.states[f.target(id)].ack, true);
    assert.deepEqual(f.sends, []);
});

test('restore keeps virtual values/references and disables commands, without touching MQTT', async () => {
    const f = fixture(), id = f.add('switch.plug', 'plug.switch', 'on'); await f.mapper().run();
    const target = f.target(id); f.objects[target].common.role = 'My.manual.role';
    f.settings.mode = 'restore'; await f.mapper().run();
    assert.equal(f.states[target].val, true); assert.equal(f.objects[target].common.role, 'My.manual.role');
    assert.equal(f.objects[target].common.write, false); assert.equal(f.states[id].val, 'on');
});

test('missing source confirmation is marked unconfirmed after 30 seconds', async () => {
    const f = fixture(), id = f.add('switch.plug', 'plug.switch', 'on'), mapper = f.mapper(); await mapper.run();
    const target = f.target(id), event = f.event(target, false); f.states[target] = event.state;
    await mapper.command(event); f.tick(31000); await mapper.run();
    assert.equal(f.states[target].ack, false); assert.equal(f.states[target].q, 0x80); assert.equal(f.sends.length, 1);
    await mapper.run(); assert.equal(f.states[target].ack, false); assert.equal(f.sends.length, 1);
});

test('changed MQTT sources update selectively without enumerating or invalidating other points', async () => {
    const f = fixture(), first = f.add('sensor.first', 'first.sensor', 10, {}, false);
    const second = f.add('sensor.second', 'second.sensor', 20, {}, false), mapper = f.mapper();
    await mapper.run();
    f.api.listSources = () => { throw new Error('A full scan is not allowed'); };
    f.states[first] = {val: 11, ack: true, ts: f.tick()};
    await mapper.run([first]);
    assert.equal(f.states[f.target(first)].val, 11);
    assert.equal(f.states[f.target(second)].val, 20);
    assert.equal(f.states[f.target(second)].q, 0);
});

test('adapter-style runtime does not read missing backup/optional metadata or need TextEncoder', async () => {
    const f = fixture('preview'); f.add('sensor.date', 'date.sensor', '2026-06-01', {device_class: 'date'}, false);
    const source = readFileSync(require.resolve('../app/iobroker/ugso-mqtt-role-mapper.js'), 'utf8');
    for (const outputMode of ['virtual', 'roles']) {
        const warnings = [], logs = [];
        const context = {getObject: id => { if (!f.objects[id]) warnings.push('getObject: ' + id); return f.api.getObject(id); },
            existsObject: id => Boolean(f.objects[id]), existsState: id => Boolean(f.states[id]),
            getState: id => { if (!f.states[id]) warnings.push('getState: ' + id); return f.api.getState(id); },
            getStateAsync: async id => f.api.getState(id),
            createStateAsync: async (id, val, force, common) => { f.objects[id] = {type: 'state', common}; f.states[id] = {val, ack: true}; },
            setStateAsync: async (id, state) => { f.states[id] = {...state}; },
            setObject: (id, object, cb) => { f.objects[id] = structuredClone(object); cb(); },
            $: selector => ({each: cb => (selector.includes('device_class') ? Object.keys(f.states).filter(id => id.endsWith('.attribute.device_class')) : f.api.listSources()).forEach(cb)}),
            log: message => logs.push(message), on: () => {}, onStop: () => {}, setTimeout: () => 1, clearTimeout: () => {}};
        vm.runInNewContext(source.replace("outputMode: 'virtual'", "outputMode: '" + outputMode + "'"), context);
        await new Promise(resolve => setImmediate(resolve));
        assert.deepEqual(warnings, []); assert.ok(logs.some(line => line.includes('Preview')), logs.join('\n'));
    }
});

test('adapter 10.4.10 API-style apply automatically creates folders, journal and ack-true values', async () => {
    const f = fixture('apply'), id = f.add('switch.plug', 'plug.switch', 'on');
    const warnings = [], commands = [], logs = [], source = readFileSync(require.resolve('../app/iobroker/ugso-mqtt-role-mapper.js'), 'utf8');
    const context = {getObject: id => { if (!f.objects[id]) warnings.push('getObject: ' + id); return f.api.getObject(id); },
        existsObject: id => Boolean(f.objects[id]), existsState: id => Boolean(f.states[id]),
        getState: id => { if (!f.objects[id] || !f.states[id]) warnings.push(id); return f.api.getState(id); },
        getStateAsync: async id => f.api.getState(id),
        createStateAsync: async (id, val, force, common) => { f.objects[id] = {type: 'state', common}; f.states[id] = {val, ack: true}; },
        setStateAsync: async (id, state) => { if (id.endsWith('.set')) commands.push(id); f.states[id] = {...state}; },
        setObject: (id, object, cb) => { f.objects[id] = JSON.parse(JSON.stringify(object)); cb(); },
        $: () => ({each: cb => f.api.listSources().forEach(cb)}),
        log: message => logs.push(message), on: () => {}, onStop: () => {}, setTimeout: () => 1, clearTimeout: () => {}};
    vm.runInNewContext(source.replace("mode: 'preview'", "mode: 'apply'"), context);
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(warnings, [], logs.join('\n'));
    assert.deepEqual(commands, []);
    assert.equal(f.objects[f.settings.virtualRoot].type, 'folder');
    assert.equal(f.states[f.target(id)].val, true); assert.equal(f.states[f.target(id)].ack, true);
    assert.equal(JSON.parse(f.states[f.settings.virtualBackupId].val).format, 'ugso-mqtt-vis2');
});
