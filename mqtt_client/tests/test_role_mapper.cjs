'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createMapper, propose, validDate, validTimestamp, numeric} = require('../app/iobroker/ugso-mqtt-role-mapper.js');

function fixture(mode = 'apply') {
    const settings = {mqttRoot: 'mqtt.0.ha_external', aliasRoot: 'alias.0.ugso_mqtt_roles', backupId: '0_userdata.0.ugso_mqtt_roles.backup', mode, excludeIds: []};
    const objects = {}, states = {}, writes = [], clone = x => JSON.parse(JSON.stringify(x));
    const api = {
        getObject: id => objects[id] && clone(objects[id]), getState: id => states[id] && clone(states[id]),
        listMetadata: () => Object.keys(states).filter(id => id.endsWith('.attribute.device_class')),
        writeJournal: async (id, value) => { writes.push(['backup', id]); objects[id] = {type: 'state'}; states[id] = {val: value}; },
        writeRole: async (id, role) => { writes.push(['role', id]); objects[id].common.role = role; },
        restoreObject: async (id, object) => { writes.push(['restore', id]); objects[id] = clone(object); },
        createAlias: async (id, object) => { writes.push(['alias', id]); objects[id] = clone(object); },
        deleteAlias: async id => { writes.push(['delete', id]); delete objects[id]; },
        log: () => {},
    };
    function add(name, dc, value, common = {}, unit) {
        const base = settings.mqttRoot + '.' + name, id = base + '.state';
        objects[id] = {type: 'state', common: {name, role: 'state', type: typeof value, read: true, write: false, ...common}, native: {topic: name}};
        states[id] = {val: value, ack: true, ts: 123, lc: 100};
        states[base + '.attribute.device_class'] = {val: dc};
        if (unit !== undefined) states[base + '.attribute.unit_of_measurement'] = {val: unit};
        return id;
    }
    return {settings, objects, states, writes, api, add, mapper: () => createMapper(api, settings)};
}

test('preview is read-only and dates do not change values/types/permissions', async () => {
    const f = fixture('preview');
    const id = f.add('billing.sensor', 'date', '2026-06-01', {write: true});
    const before = structuredClone(f.states), beforeObjects = structuredClone(f.objects);
    assert.equal(await f.mapper().run(), 1);
    assert.deepEqual(f.writes, []); assert.deepEqual(f.objects, beforeObjects);
    f.settings.mode = 'apply'; await f.mapper().run();
    assert.deepEqual(f.writes.map(x => x[0]), ['backup', 'role']);
    assert.equal(f.objects[id].common.role, 'date'); assert.equal(f.objects[id].common.write, true);
    assert.deepEqual(f.states[id], before[id]);
    await f.mapper().run(); assert.equal(f.writes.length, 2);
});

test('strict dates and timestamps reject invalid and unavailable values', () => {
    for (const value of ['2025-02-29', '2026-13-01', '2026-06-31', 'unknown', 'unavailable', 123]) assert.equal(validDate(value), false);
    assert.equal(validDate('2024-02-29'), true);
    assert.equal(validTimestamp('2026-06-01T10:30:00+02:00'), true);
    for (const value of ['2026-06-01', '2026-02-30T10:00:00Z', '2026-06-01T25:00:00Z', '2026-06-01T10:00:00']) assert.equal(validTimestamp(value), false);
});

test('special and excluded manually assigned roles are preserved', async () => {
    const f = fixture();
    const special = f.add('special', 'date', '2026-06-01', {role: 'text'});
    const excluded = f.add('manualGeneric', 'date', '2026-06-01'); f.settings.excludeIds.push(excluded);
    const other = f.add('other', 'date', '2026-06-01');
    f.states['mqtt.1.foreign.attribute.device_class'] = {val: 'date'};
    await f.mapper().run();
    assert.equal(f.objects[special].common.role, 'text'); assert.equal(f.objects[excluded].common.role, 'state');
    assert.equal(f.objects[other].common.role, 'date');
});

test('all numeric rules require compatible units and actual numeric values', () => {
    for (const [dc, [role, units]] of Object.entries(numeric)) {
        const object = {type: 'state', common: {type: 'number', read: true, write: false}};
        assert.equal(propose('sensor', dc, units[0], object, {val: 42}), role);
        assert.equal(propose('sensor', dc, 'unsupported', object, {val: 42}), null);
        assert.equal(propose('sensor', dc, units[0], object, {val: '42'}), null);
        assert.equal(propose('sensor', dc, units[0], object, {val: NaN}), null);
        assert.equal(propose('sensor', dc, units[0], {...object, common: {...object.common, unit: 'wrong'}}, {val: 42}), null);
    }
});

test('writable MQTT values receive read-only aliases, without changing source', async () => {
    const f = fixture();
    const id = f.add('power', 'power', 42, {write: true}, 'W'), before = structuredClone(f.objects[id]);
    await f.mapper().run();
    const alias = f.settings.aliasRoot + '.power.state';
    assert.deepEqual(f.objects[id], before); assert.equal(f.states[id].val, 42);
    assert.equal(f.objects[alias].common.role, 'value.power');
    assert.equal(f.objects[alias].common.write, false); assert.equal(f.objects[alias].common.alias.id, id);
    assert.equal(f.objects[alias].common.unit, 'W');
    assert.deepEqual(f.writes.map(x => x[0]), ['backup', 'alias']);
    f.settings.mode = 'restore'; await f.mapper().run();
    assert.equal(f.objects[alias], undefined); assert.deepEqual(f.objects[id], before);
});

test('boolean classes are type-checked; on/off strings are untouched', async () => {
    const f = fixture();
    const low = f.add('low', 'battery', true);
    const raw = f.add('raw', 'battery', 'on');
    const level = f.add('level', 'battery', 20, {}, '%');
    await f.mapper().run();
    assert.equal(f.objects[low].common.role, 'indicator.lowbat');
    assert.equal(f.objects[raw].common.role, 'state');
    assert.equal(f.objects[level].common.role, 'value.battery');
});

test('failed backup prevents writes and malformed journals are rejected', async () => {
    const f = fixture(); const id = f.add('date', 'date', '2026-06-01');
    f.api.writeJournal = async () => { throw new Error('disk full'); };
    await assert.rejects(f.mapper().run(), /disk full/); assert.equal(f.objects[id].common.role, 'state');
    f.states[f.settings.backupId] = {val: '{invalid'};
    await assert.rejects(f.mapper().run());
    assert.equal(f.objects[id].common.role, 'state');
});

test('restore preserves later manual changes and removes originally missing role', async () => {
    const f = fixture();
    const id = f.add('date', 'date', '2026-06-01'); delete f.objects[id].common.role;
    const manual = f.add('manual', 'timestamp', '2026-06-01T00:00:00Z');
    await f.mapper().run(); f.objects[manual].common.role = 'text';
    f.objects[id].common.desc = 'Added later';
    f.settings.mode = 'restore'; await f.mapper().run();
    assert.equal(Object.hasOwn(f.objects[id].common, 'role'), false);
    assert.equal(f.objects[id].common.desc, 'Added later'); assert.equal(f.objects[manual].common.role, 'text');
    assert.equal(f.states[id].val, '2026-06-01');
});

test('pre-existing and subsequently edited aliases are never overwritten or deleted', async () => {
    const f = fixture(); f.add('a', 'power', 1, {write: true}, 'W'); f.add('b', 'power', 2, {write: true}, 'W');
    const aliasA = f.settings.aliasRoot + '.a.state', aliasB = f.settings.aliasRoot + '.b.state';
    f.objects[aliasA] = {type: 'state', common: {role: 'text'}};
    await f.mapper().run(); f.objects[aliasB].common.name = 'My edit';
    f.settings.mode = 'restore'; await f.mapper().run();
    assert.equal(f.objects[aliasA].common.role, 'text'); assert.equal(f.objects[aliasB].common.name, 'My edit');
});

test('unit/role changes while backing up are rechecked before application', async () => {
    const f = fixture(); const id = f.add('date', 'date', '2026-06-01');
    const save = f.api.writeJournal;
    f.api.writeJournal = async (...args) => { await save(...args); f.objects[id].common.role = 'text'; };
    await f.mapper().run(); assert.equal(f.objects[id].common.role, 'text');
    assert.equal(f.writes.some(x => x[0] === 'role'), false);
});

test('invalid configuration cannot expand the MQTT/alias/backup scope', () => {
    const f = fixture();
    for (const bad of [{mqttRoot: 'system.adapter'}, {mqttRoot: 'mqtt.0.*'}, {backupId: 'system.config'}, {aliasRoot: 'mqtt.0.other'}, {mode: 'delete'}]) {
        assert.throws(() => createMapper(f.api, {...f.settings, ...bad}));
    }
});

test('unknown or inherited class names never become role rules', () => {
    for (const type of ['number', 'boolean']) {
        for (const dc of ['constructor', '__proto__', 'toString', 'missing', null]) {
            assert.equal(propose(type === 'number' ? 'sensor' : 'binary_sensor', dc, '', {type: 'state', common: {type, read: true, write: false}}, {val: type === 'number' ? 1 : true}), null);
        }
    }
});
