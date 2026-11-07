/* MQTT-Client 0.1.27: ioBroker JavaScript adapter 10.4.10 compatible.
 * Preview first. Settings and documentation: mqtt_client/iobroker/README*.md.
 * No MQTT state values, types, units, permissions or commands are changed.
 */
'use strict';

const UGSO_MQTT_ROLE_SETTINGS = {
    mqttRoot: 'mqtt.0.ha_external',
    mode: 'preview', // preview | apply | restore
    outputMode: 'virtual', // virtual (VIS 2 state/set) | roles (previous role/alias mapper)
    virtualRoot: '0_userdata.0.ugso_mqtt',
    virtualBackupId: '0_userdata.0.ugso_mqtt_helper.backup',
    backupId: '0_userdata.0.ugso_mqtt_roles.backup',
    aliasRoot: 'alias.0.ugso_mqtt_roles', // Read-only aliases when MQTT objects are writable.
    excludeIds: [], // Exact state IDs; also protects manually assigned generic "state" roles.
};

const UgsoMqttRoles = (() => {
    const numeric = {
        temperature: ['value.temperature', ['°C', '°F', 'K']],
        humidity: ['value.humidity', ['%']],
        absolute_humidity: ['value.humidity.absolute', ['g/m³', 'mg/m³']],
        battery: ['value.battery', ['%']],
        voltage: ['value.voltage', ['V']],
        current: ['value.current', ['A']],
        power: ['value.power', ['W', 'kW']],
        energy: ['value.energy', ['Wh', 'kWh']],
        energy_storage: ['value.energy', ['Wh', 'kWh']],
        reactive_power: ['value.power.reactive', ['var', 'kvar', 'kVar']],
        reactive_energy: ['value.energy.reactive', ['varh', 'kvarh', 'kVarh']],
        frequency: ['value.frequency', ['Hz']],
        pressure: ['value.pressure', ['hPa', 'mbar']],
        atmospheric_pressure: ['value.pressure', ['hPa', 'mbar']],
        illuminance: ['value.brightness', ['lx', 'lux']],
        distance: ['value.distance', ['m', 'km', 'cm', 'mm', 'mi', 'nmi', 'yd', 'ft', 'in']],
        duration: ['value.interval', ['s', 'ms', 'h', 'd']],
        wind_speed: ['value.speed', ['m/s', 'km/h', 'mph', 'kn']],
        volume_flow_rate: ['value.flow', ['m³/h']],
        signal_strength: ['value.rssi', ['dBm']],
        aqi: ['value.airquality', ['']],
        carbon_dioxide: ['value.co2', ['ppm']],
        carbon_monoxide: ['value.co', ['ppm']],
        nitrogen_monoxide: ['value.no', ['ppm', 'µg/m³', 'μg/m³']],
        nitrogen_dioxide: ['value.no2', ['ppm', 'µg/m³', 'μg/m³']],
        ozone: ['value.o3', ['ppm', 'µg/m³', 'μg/m³']],
        sulphur_dioxide: ['value.so2', ['ppm', 'µg/m³', 'μg/m³']],
        pm1: ['value.pm1', ['µg/m³', 'μg/m³']],
        pm25: ['value.pm25', ['µg/m³', 'μg/m³']],
        pm10: ['value.pm10', ['µg/m³', 'μg/m³']],
        radon: ['value.rn', ['Bq/m³']],
        volatile_organic_compounds: ['value.tvoc', ['µg/m³', 'μg/m³']],
        volatile_organic_compounds_parts: ['value.tvoc', ['ppb']],
    };
    const binary = {
        battery: 'indicator.lowbat', connectivity: 'indicator.reachable',
        door: 'sensor.door', garage_door: 'sensor.door', window: 'sensor.window',
        opening: 'sensor.contact', lock: 'sensor.lock', motion: 'sensor.motion',
        moisture: 'sensor.alarm.flood', smoke: 'sensor.alarm.fire',
        carbon_monoxide: 'sensor.alarm.co', light: 'sensor.light', sound: 'sensor.noise',
        problem: 'indicator.error', running: 'indicator.working',
    };
    const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
    const clone = value => JSON.parse(JSON.stringify(value));
    const stable = value => JSON.stringify(value, (key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(name => [name, item[name]])) : item);
    const generic = role => role === undefined || role === '' || role === 'state';
    const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    function validDate(value) {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
        const time = Date.parse(value + 'T00:00:00Z');
        return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
    }

    function validTimestamp(value) {
        return typeof value === 'string' && validDate(value.slice(0, 10)) &&
            /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value) &&
            Number.isFinite(Date.parse(value));
    }

    function propose(domain, deviceClass, unit, object, state) {
        if (typeof deviceClass !== 'string' || !object || object.type !== 'state' || !object.common || !state || state.val === null) return null;
        const common = object.common;
        if (common.read !== true) return null;
        if (domain === 'sensor') {
            if (deviceClass === 'date' || deviceClass === 'timestamp' || deviceClass === 'uptime') {
                return common.type === 'string' && (deviceClass === 'date' ? validDate(state.val) : validTimestamp(state.val)) ? 'date' : null;
            }
            if (common.type !== 'number' || typeof state.val !== 'number' || !Number.isFinite(state.val)) return null;
            const rule = own(numeric, deviceClass) ? numeric[deviceClass] : null;
            if (!rule || !rule[1].includes(unit || '')) return null;
            // An explicitly configured different unit must not be relabelled.
            if (common.unit !== undefined && common.unit !== '' && common.unit !== unit) return null;
            return rule[0];
        }
        if (domain === 'binary_sensor' && common.type === 'boolean' && typeof state.val === 'boolean') {
            return own(binary, deviceClass) ? binary[deviceClass] : null;
        }
        return null;
    }

    function validateSettings(settings) {
        if (!/^mqtt\.\d+\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/.test(settings.mqttRoot)) throw new Error('Invalid mqttRoot');
        if (!['preview', 'apply', 'restore'].includes(settings.mode)) throw new Error('Invalid mode');
        if (!/^0_userdata\.0\.[A-Za-z0-9_.-]+$/.test(settings.backupId)) throw new Error('Invalid backupId');
        if (!/^alias\.0\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/.test(settings.aliasRoot)) throw new Error('Invalid aliasRoot');
        if (!Array.isArray(settings.excludeIds) || settings.excludeIds.some(id => typeof id !== 'string')) throw new Error('Invalid excludeIds');
    }

    function createMapper(api, settings) {
        validateSettings(settings);
        const inScope = id => typeof id === 'string' && id.startsWith(settings.mqttRoot + '.');
        const excluded = id => settings.excludeIds.includes(id);
        const metadataPattern = new RegExp('^' + escapeRegex(settings.mqttRoot) + '\\.(.+)\\.attribute\\.device_class$');
        const previewed = new Map();

        function plan(metadataId) {
            const match = metadataId.match(metadataPattern);
            if (!match) return null;
            const base = metadataId.slice(0, -'.attribute.device_class'.length);
            const id = base + '.state';
            if (!inScope(id) || excluded(id)) return null;
            const object = api.getObject(id);
            if (!object || !generic(object.common && object.common.role)) return null;
            // MQTT device/value names do not reliably contain the HA domain.
            // Disambiguate the allowlisted measurement/binary classes by their actual type.
            const domain = object.common.type === 'boolean' ? 'binary_sensor' : 'sensor';
            const deviceClass = api.getState(metadataId)?.val;
            const unit = api.getState(base + '.attribute.unit_of_measurement')?.val;
            const role = propose(domain, deviceClass, unit, object, api.getState(id));
            if (!role) return null;
            const item = {id, role, type: object.common.type, hadRole: own(object.common, 'role'), previousRole: object.common.role ?? null, metadataId, kind: 'role'};
            // Value/sensor roles are read-only. Preserve MQTT write flags by using an alias.
            if (role !== 'date' && object.common.write !== false) {
                item.kind = 'alias';
                item.aliasId = settings.aliasRoot + id.slice(settings.mqttRoot.length);
                if (api.getObject(item.aliasId)) return null;
                const common = {name: object.common.name || id, type: item.type, role, read: true, write: false, alias: {id}};
                for (const key of ['unit', 'min', 'max', 'states']) if (own(object.common, key)) common[key] = clone(object.common[key]);
                if (unit && !common.unit) common.unit = unit;
                item.aliasObject = {type: 'state', common, native: {ugsoMqttRoles: {source: id, version: 1}}};
            }
            return item;
        }

        async function loadJournal() {
            const value = api.getState(settings.backupId)?.val;
            if (value === undefined || value === null || value === '') {
                if (api.getObject(settings.backupId)) throw new Error('Existing backup object is empty; use a separate backupId');
                return {format: 'ugso-mqtt-roles', version: 1, mqttRoot: settings.mqttRoot, aliasRoot: settings.aliasRoot, entries: {}};
            }
            const data = JSON.parse(value);
            if (data.format !== 'ugso-mqtt-roles' || data.version !== 1 || data.mqttRoot !== settings.mqttRoot || data.aliasRoot !== settings.aliasRoot || !data.entries || typeof data.entries !== 'object' || Array.isArray(data.entries)) throw new Error('Backup format/root mismatch');
            for (const [id, entry] of Object.entries(data.entries)) {
                if (!inScope(id) || !entry || typeof entry.role !== 'string' || typeof entry.hadRole !== 'boolean' || !['number', 'boolean', 'string'].includes(entry.type) || !(entry.previousRole === null || typeof entry.previousRole === 'string') || !generic(entry.hadRole ? entry.previousRole : undefined)) throw new Error('Invalid backup entry');
                if (!['role', 'alias'].includes(entry.kind)) throw new Error('Invalid backup kind');
                if (entry.kind === 'alias' && (entry.aliasId !== settings.aliasRoot + id.slice(settings.mqttRoot.length) || entry.aliasObject?.common?.alias?.id !== id)) throw new Error('Invalid alias backup');
            }
            return data;
        }

        async function run() {
            const journal = await loadJournal();
            let count = 0;
            if (settings.mode === 'restore') {
                for (const [id, entry] of Object.entries(journal.entries)) {
                    if (entry.restored || excluded(id)) continue;
                    if (entry.kind === 'alias') {
                        const alias = api.getObject(entry.aliasId);
                        if (!alias || alias.type !== 'state' || stable(alias.common) !== stable(entry.aliasObject.common) || stable(alias.native) !== stable(entry.aliasObject.native)) continue;
                        await api.deleteAlias(entry.aliasId);
                        entry.restored = new Date().toISOString();
                        await api.writeJournal(settings.backupId, JSON.stringify(journal));
                        api.log('Removed own unchanged alias: ' + entry.aliasId);
                        count++;
                        continue;
                    }
                    const current = api.getObject(id);
                    if (!current || current.type !== 'state' || current.common?.type !== entry.type || current.common.role !== entry.role) continue;
                    // Only restore the role. Keep all current object properties and values.
                    const object = clone(current);
                    if (entry.hadRole) object.common.role = entry.previousRole;
                    else delete object.common.role;
                    await api.restoreObject(id, object);
                    entry.restored = new Date().toISOString();
                    await api.writeJournal(settings.backupId, JSON.stringify(journal));
                    api.log('Restored: ' + id);
                    count++;
                }
                return count;
            }
            for (const metadataId of api.listMetadata()) {
                const item = plan(metadataId);
                if (!item || own(journal.entries, item.id)) continue;
                if (settings.mode !== 'preview' || previewed.get(item.id) !== item.role) {
                    api.log((settings.mode === 'preview' ? 'Preview: ' : 'Apply: ') + item.id + ' -> ' + item.role + (item.kind === 'alias' ? ' (read-only alias: ' + item.aliasId + ')' : ''));
                    previewed.set(item.id, item.role);
                }
                if (settings.mode === 'apply') {
                    journal.entries[item.id] = {...item, savedAt: new Date().toISOString()};
                    // Persist and confirm the original role BEFORE changing the MQTT object.
                    await api.writeJournal(settings.backupId, JSON.stringify(journal));
                    const fresh = plan(metadataId);
                    if (!fresh || fresh.role !== item.role || fresh.type !== item.type || fresh.previousRole !== item.previousRole || fresh.hadRole !== item.hadRole || fresh.kind !== item.kind) continue;
                    if (item.kind === 'alias') await api.createAlias(item.aliasId, item.aliasObject);
                    else await api.writeRole(item.id, item.role);
                }
                count++;
            }
            return count;
        }
        return {run};
    }
    function createVirtualMapper(api, settings) {
        validateSettings(settings);
        if (!/^0_userdata\.0\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/.test(settings.virtualRoot) ||
            !/^0_userdata\.0\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/.test(settings.virtualBackupId) ||
            settings.virtualRoot === settings.virtualBackupId) throw new Error('Invalid virtual scope');
        const prefix = settings.mqttRoot + '.', output = settings.virtualRoot + '.';
        const pending = new Map(), started = api.now(), previewed = new Set();
        let ready = false;
        const get = id => api.getState(id)?.val;
        const list = value => {
            if (typeof value === 'string') { try { value = JSON.parse(value); } catch { return []; } }
            return Array.isArray(value) && value.every(v => typeof v === 'string') ? value : [];
        };
        const num = value => typeof value === 'number' && Number.isFinite(value);
        const bool = value => value === true || value === 'on' || value === 'ON' ? true : value === false || value === 'off' || value === 'OFF' ? false : undefined;
        const active = () => {
            const value = get(settings.mqttRoot + '.selected_entities');
            if (typeof value !== 'string' || !value.startsWith('v1:')) return {};
            try {
                const data = JSON.parse(value.slice(3));
                return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
            } catch { return {}; }
        };
        const online = () => get(settings.mqttRoot + '.availability') === 'online';
        const targetFor = id => settings.virtualRoot + id.slice(settings.mqttRoot.length);
        const excluded = id => settings.excludeIds.includes(id) || settings.excludeIds.includes(targetFor(id));
        const owned = (object, record) => object?.type === 'state' && object.common?.type === record.common.type && stable(object.native) === stable(record.native);

        function describe(id, catalog = active()) {
            if (!id.startsWith(prefix) || !id.endsWith('.state') || id.includes('.attribute.') || excluded(id)) return null;
            const source = api.getState(id);
            if (!source || source.ack !== true || source.q && source.q !== 0) return null;
            const base = id.slice(0, -6);
            let root = base, feature = '', entity = get(root + '.attribute.ha_entity_id');
            if (!entity) {
                const last = base.slice(base.lastIndexOf('.') + 1);
                if (!['brightness', 'rgb_color', 'effect', 'color_temp_kelvin'].includes(last)) return null;
                root = base.slice(0, base.lastIndexOf('.'));
                entity = get(root + '.attribute.ha_entity_id'); feature = last;
                if (typeof entity !== 'string' || !entity.startsWith('light.')) return null;
            }
            if (typeof entity !== 'string' || !/^[a-z0-9_]+\.[a-z0-9_]+$/.test(entity)) return null;
            const selected = own(catalog, entity) ? catalog[entity] : null;
            if (!selected || typeof selected !== 'object' || typeof selected.state_topic !== 'string' || !selected.state_topic.endsWith('/state') || selected.state_topic !== api.getObject(root + '.state')?.native?.topic || feature && (!Array.isArray(selected.features) || !selected.features.includes(feature))) return null;
            const expectedTopic = feature ? selected.state_topic.slice(0, -6) + '/' + feature + '/state' : selected.state_topic;
            if (api.getObject(id)?.native?.topic !== expectedTopic) return null;
            const attribute = key => selected.attributes && own(selected.attributes, key) ? selected.attributes[key] : get(root + '.attribute.' + key);
            const domain = entity.split('.')[0], dc = attribute('device_class');
            const flag = attribute('command_enabled');
            const enabled = selected.command === true && (flag === true || flag === 'true');
            const setId = base + '.set';
            let writable = enabled && api.getObject(setId)?.type === 'state';
            let value = source.val, type = typeof value, role = 'state', encode;
            const extra = {}, unit = feature === 'brightness' ? '%' : feature === 'color_temp_kelvin' ? 'K' : attribute('unit_of_measurement');
            if (feature === 'rgb_color') {
                let rgb = value;
                if (typeof rgb === 'string') { try { rgb = JSON.parse(rgb); } catch { return null; } }
                if (!Array.isArray(rgb) || rgb.length !== 3 || rgb.some(v => !Number.isInteger(v) || v < 0 || v > 255)) return null;
                value = '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
                type = 'string'; role = writable ? 'level.color.rgb' : 'text';
                encode = input => {
                    if (typeof input !== 'string' || !/^#[0-9a-f]{6}$/i.test(input)) throw new Error('Expected #RRGGBB');
                    return JSON.stringify([1, 3, 5].map(i => parseInt(input.slice(i, i + 2), 16)));
                };
            } else if (feature === 'brightness' || feature === 'color_temp_kelvin') {
                const lo = feature === 'brightness' ? 0 : attribute('min_color_temp_kelvin');
                const hi = feature === 'brightness' ? 100 : attribute('max_color_temp_kelvin');
                if (!num(value) || !num(lo) || !num(hi) || value < lo || value > hi || lo > hi) return null;
                if (feature === 'color_temp_kelvin' && !Number.isInteger(value)) return null;
                type = 'number'; role = writable ? feature === 'brightness' ? 'level.dimmer' : 'level.color.temperature' : feature === 'brightness' ? 'value.dimmer' : 'value';
                extra.min = lo; extra.max = hi;
                encode = input => {
                    if (!num(input) || input < lo || input > hi || feature === 'color_temp_kelvin' && !Number.isInteger(input)) throw new Error('Light value outside limits');
                    return String(input);
                };
            } else if (feature === 'effect' || ['select', 'input_select'].includes(domain)) {
                const options = list(attribute(feature === 'effect' ? 'effect_list' : 'options'));
                if (typeof value !== 'string' || !options.includes(value)) return null;
                type = 'string'; role = feature === 'effect' && writable ? 'level.effect' : 'state';
                extra.states = Object.fromEntries(options.map(v => [v, v]));
                encode = input => { if (!options.includes(input)) throw new Error('Option not supported'); return input; };
            } else if (domain === 'binary_sensor' || ['switch', 'light', 'input_boolean', 'fan', 'humidifier', 'automation', 'script', 'remote', 'siren'].includes(domain)) {
                value = bool(value); if (value === undefined) return null;
                type = 'boolean';
                if (domain === 'binary_sensor') writable = false;
                role = writable ? domain === 'light' ? 'switch.light' : 'switch' : own(binary, dc) ? binary[dc] : 'sensor.switch';
                encode = input => { if (typeof input !== 'boolean') throw new Error('Boolean expected'); return input ? 'ON' : 'OFF'; };
            } else if (['number', 'input_number'].includes(domain)) {
                if (!num(value)) return null;
                type = 'number'; role = writable ? 'level' : 'value';
                const lo = attribute('min'), hi = attribute('max'), step = attribute('step');
                if (num(lo)) extra.min = lo; if (num(hi)) extra.max = hi; if (num(step) && step > 0) extra.step = step;
                encode = input => { if (!num(input) || num(lo) && input < lo || num(hi) && input > hi) throw new Error('Number outside limits'); return String(input); };
            } else if (['text', 'input_text'].includes(domain)) {
                if (typeof value !== 'string') return null;
                type = 'string'; role = 'text';
                const lo = num(attribute('min')) ? attribute('min') : 0, hi = num(attribute('max')) ? Math.min(255, attribute('max')) : 255;
                encode = input => { if (typeof input !== 'string' || input.length < lo || input.length > hi) throw new Error('Text outside limits'); return input; };
            } else {
                writable = false;
                if (domain === 'sensor' && ['date', 'timestamp', 'uptime'].includes(dc)) {
                    if (!(dc === 'date' ? validDate(value) : validTimestamp(value))) return null;
                    type = 'string'; role = 'date';
                } else if (type === 'number' && num(value)) {
                    role = propose('sensor', dc, unit, {type: 'state', common: {type, read: true, write: false}}, {val: value}) || 'value';
                } else if (type === 'string' && !['unknown', 'unavailable'].includes(value)) role = 'text';
                else return null;
            }
            const common = {name: String(attribute('friendly_name') || entity) + (feature ? ' ' + feature : ''), type, role, read: true, write: Boolean(writable), ...extra};
            if (typeof unit === 'string' && type === 'number') common.unit = unit;
            return {id: targetFor(id), sourceId: id, entity, feature, setId: writable ? setId : null, value, sourceTs: source.ts || 0, common,
                native: {ugsoMqttVis2: {version: 1, sourceId: id}}, encode};
        }

        async function journal() {
            const raw = api.getState(settings.virtualBackupId)?.val;
            if (raw === undefined || raw === null || raw === '') {
                if (api.getObject(settings.virtualBackupId)) throw new Error('Existing virtual backup is empty; use a separate virtualBackupId');
                return {format: 'ugso-mqtt-vis2', version: 1, mqttRoot: settings.mqttRoot, virtualRoot: settings.virtualRoot, entries: {}};
            }
            const data = JSON.parse(raw);
            if (data.format !== 'ugso-mqtt-vis2' || data.version !== 1 || data.mqttRoot !== settings.mqttRoot || data.virtualRoot !== settings.virtualRoot || !data.entries || Array.isArray(data.entries)) throw new Error('Virtual backup mismatch');
            for (const [id, record] of Object.entries(data.entries)) {
                if (!id.startsWith(output) || typeof record.sourceId !== 'string' || !record.sourceId.startsWith(prefix) || id !== targetFor(record.sourceId) || !record.common || !['boolean', 'number', 'string'].includes(record.common.type) || record.native?.ugsoMqttVis2?.sourceId !== record.sourceId) throw new Error('Invalid virtual backup entry');
            }
            return data;
        }

        async function run(sourceIds) {
            const data = await journal();
            const changed = sourceIds ? new Set(sourceIds) : null;
            if (settings.mode === 'restore') {
                for (const [id, record] of Object.entries(data.entries)) {
                    if (!owned(api.getObject(id), record) || excluded(record.sourceId)) continue;
                    record.disabled = true;
                    await api.writeJournal(settings.virtualBackupId, JSON.stringify(data));
                    await api.disableVirtual(id); // Keep values, roles and dashboard references.
                }
                return;
            }
            const valid = new Set();
            const catalog = active();
            for (const sourceId of changed || api.listSources()) {
                const spec = describe(sourceId, catalog);
                if (!spec) continue;
                valid.add(spec.id);
                let record = data.entries[spec.id], object = api.getObject(spec.id), created = false;
                if (record?.disabled || record && object && !owned(object, record) || !record && object) continue;
                if (record && record.common.type !== spec.common.type) { valid.delete(spec.id); continue; }
                if (settings.mode === 'preview') {
                    if (!previewed.has(spec.id)) { api.log('Preview VIS 2: ' + spec.id + ' <- ' + sourceId + (spec.setId ? ' -> ' + spec.setId : ' (read-only)')); previewed.add(spec.id); }
                    continue;
                }
                if (!online()) continue;
                if (!record || !object) {
                    record = {sourceId, common: spec.common, native: spec.native, savedAt: new Date(api.now()).toISOString()};
                    data.entries[spec.id] = record;
                    await api.writeJournal(settings.virtualBackupId, JSON.stringify(data));
                    if (api.getObject(spec.id)) continue;
                    await api.createVirtual(spec.id, {type: 'state', common: spec.common, native: spec.native});
                    created = true;
                    api.log('Created VIS 2: ' + spec.id);
                }
                if (!online()) continue;
                const wait = pending.get(spec.id);
                if (wait && spec.sourceTs <= wait.sourceTs) {
                    if (!wait.timedOut && api.now() - wait.time >= 30000) {
                        wait.timedOut = true;
                        await api.setVirtual(spec.id, {val: wait.requested, ack: false, q: 0x80});
                        api.log('No new HA confirmation after 30s: ' + spec.id);
                    }
                    continue;
                }
                pending.delete(spec.id);
                const current = created ? undefined : api.getState(spec.id);
                if (!current || current.val !== spec.value || current.ack !== true || current.q) await api.setVirtual(spec.id, {val: spec.value, ack: true, q: 0});
            }
            if (settings.mode === 'apply') {
                for (const [id, record] of Object.entries(data.entries)) {
                    if (changed && !changed.has(record.sourceId)) continue;
                    if (record.disabled || excluded(record.sourceId) || !owned(api.getObject(id), record) || valid.has(id) && online()) continue;
                    const current = api.getState(id);
                    if (current && current.q !== 0x82) await api.setVirtual(id, {val: current.val, ack: current.ack, q: 0x82});
                }
                ready = true;
            }
        }

        async function command(event) {
            if (settings.mode !== 'apply' || !ready || event?.state?.ack !== false || event.state.q && event.state.q !== 0 || !num(event.state.ts) || event.state.ts <= started || api.now() - event.state.ts > 10000 || typeof event.id !== 'string' || !event.id.startsWith(output)) return;
            const data = await journal(), record = data.entries[event.id];
            if (!record || record.disabled || excluded(record.sourceId) || !owned(api.getObject(event.id), record) || api.getObject(event.id).common.write !== true) return;
            const spec = describe(record.sourceId);
            if (!online() || !spec?.setId || !spec.encode || spec.common.type !== record.common.type) throw new Error('Source offline, unselected or return channel disabled');
            const payload = spec.encode(event.state.val);
            const bytes = typeof payload === 'string' ? Array.from(payload).reduce((sum, char) => sum + (char.codePointAt(0) < 0x80 ? 1 : char.codePointAt(0) < 0x800 ? 2 : char.codePointAt(0) < 0x10000 ? 3 : 4), 0) : 257;
            if (bytes > 256) throw new Error('Command payload too large');
            pending.set(event.id, {sourceTs: spec.sourceTs, time: api.now(), requested: event.state.val, timedOut: false});
            try { await api.sendCommand(spec.setId, payload); }
            catch (error) {
                pending.get(event.id).timedOut = true;
                await api.setVirtual(event.id, {val: event.state.val, ack: false, q: 0x80});
                throw error;
            }
        }
        const pendingSources = () => [...pending.entries()].filter(([, wait]) => !wait.timedOut).map(([id]) => api.getObject(id)?.native?.ugsoMqttVis2?.sourceId).filter(Boolean);
        return {run, command, describe, pendingSources, hasPending: () => pendingSources().length > 0};
    }
    async function initialize(api, settings) {
        validateSettings(settings);
        createVirtualMapper(api, settings); // Validate all paths before any writes.
        const journals = [
            [settings.virtualBackupId, {format: 'ugso-mqtt-vis2', version: 1, mqttRoot: settings.mqttRoot, virtualRoot: settings.virtualRoot, entries: {}}],
            [settings.backupId, {format: 'ugso-mqtt-roles', version: 1, mqttRoot: settings.mqttRoot, aliasRoot: settings.aliasRoot, entries: {}}],
        ];
        if (settings.backupId === settings.virtualBackupId || journals.some(([id]) => settings.virtualRoot === id || settings.virtualRoot.startsWith(id + '.'))) throw new Error('Conflicting helper paths');
        for (const [id] of journals) {
            const object = api.getObject(id), state = api.getState(id);
            if (object && object.type !== 'state' || !object && state) throw new Error('Existing backup path conflict: ' + id);
        }
        await api.ensureFolders(settings.virtualRoot);
        await api.ensureFolders(settings.aliasRoot);
        for (const [id, value] of journals) {
            await api.ensureFolders(id.slice(0, id.lastIndexOf('.')));
            if (!api.getObject(id)) await api.writeJournal(id, JSON.stringify(value));
        }
        api.log('Helper infrastructure ready; existing backups and values preserved.');
    }
    async function publishCommand(api, settings, id, payload) {
        if (typeof id !== 'string' || !id.startsWith(settings.mqttRoot + '.') || !id.endsWith('.set')) throw new Error('Invalid command ID');
        const target = api.getObject(id), source = api.getObject(id.slice(0, -4) + '.state');
        const stateTopic = source?.native?.topic, topic = target?.native?.topic;
        if (target?.type !== 'state' || source?.type !== 'state' || typeof stateTopic !== 'string' || !stateTopic.endsWith('/state') || topic !== stateTopic.slice(0, -6) + '/set') throw new Error('Command topic does not match source');
        const instance = settings.mqttRoot.split('.').slice(0, 2).join('.');
        const result = await api.sendMqtt(instance, 'sendMessage2Client', {topic, message: payload, retain: false}, {timeout: 5000});
        if (result?.result !== true) throw new Error(result?.error || 'MQTT adapter did not accept the command');
        api.log('Command handed to MQTT adapter (retain=false): ' + id + '; waiting for HA feedback.');
    }
    return {createMapper, createVirtualMapper, initialize, publishCommand, propose, validDate, validTimestamp, numeric, binary};
})();

if (typeof module !== 'undefined' && module.exports) module.exports = UgsoMqttRoles;

if (typeof on === 'function' && typeof getObject === 'function') {
    const settings = UGSO_MQTT_ROLE_SETTINGS;
    // In adapter 10.4.10 both getObject and getState warn for missing IDs.
    // existsObject/existsState perform silent checks of the adapter caches.
    const optionalObject = id => existsObject(id) ? getObject(id) : undefined;
    const optionalState = id => existsState(id) ? getState(id) : undefined;
    const api = {
        getObject: optionalObject,
        getState: optionalState,
        listMetadata: () => {
            const ids = [];
            $('state[id=' + settings.mqttRoot + '.*.attribute.device_class]').each(id => ids.push(id));
            return ids;
        },
        listSources: () => {
            const ids = [];
            $('state[id=' + settings.mqttRoot + '.*.state]').each(id => ids.push(id));
            return ids;
        },
        now: () => Date.now(),
        ensureFolders: async id => {
            const parts = id.split('.');
            for (let size = 3; size <= parts.length; size++) {
                const folderId = parts.slice(0, size).join('.'), existing = optionalObject(folderId);
                if (existing && !['folder', 'channel', 'device'].includes(existing.type)) throw new Error('Existing parent is not a folder: ' + folderId);
                if (!existing) await new Promise((resolve, reject) => setObject(folderId, {type: 'folder', common: {name: parts[size - 1]}, native: {ugsoMqttVis2Folder: true}}, error => error ? reject(new Error(String(error))) : resolve()));
            }
        },
        createVirtual: async (id, object) => {
            await api.ensureFolders(id.slice(0, id.lastIndexOf('.')));
            if (optionalObject(id)) throw new Error('Virtual target appeared during creation');
            await new Promise((resolve, reject) => setObject(id, object, error => error ? reject(new Error(String(error))) : resolve()));
        },
        disableVirtual: id => new Promise((resolve, reject) => extendObject(id, {common: {write: false}}, error => error ? reject(new Error(String(error))) : resolve())),
        setVirtual: (id, state) => setStateAsync(id, state),
        sendMqtt: (instance, command, message, options) => sendToAsync(instance, command, message, options),
        sendCommand: (id, payload) => UgsoMqttRoles.publishCommand(api, settings, id, payload),
        writeRole: (id, role) => new Promise((resolve, reject) => extendObject(id, {common: {role}}, error => error ? reject(new Error(String(error))) : resolve())),
        restoreObject: (id, object) => new Promise((resolve, reject) => setObject(id, object, error => error ? reject(new Error(String(error))) : resolve())),
        createAlias: (id, object) => new Promise((resolve, reject) => setObject(id, object, error => error ? reject(new Error(String(error))) : resolve())),
        deleteAlias: id => new Promise((resolve, reject) => deleteObject(id, false, error => error ? reject(new Error(String(error))) : resolve())),
        writeJournal: async (id, value) => {
            if (!optionalObject(id)) await createStateAsync(id, '', false, {name: 'UGSo MQTT role backup', type: 'string', role: 'json', read: true, write: false});
            await setStateAsync(id, {val: value, ack: true});
            if ((await getStateAsync(id))?.val !== value) throw new Error('Backup could not be verified');
        },
        log: message => log('[UGSo MQTT roles] ' + message, 'info'),
    };
    try {
        if (!['virtual', 'roles'].includes(settings.outputMode)) throw new Error('Invalid outputMode');
        const virtual = settings.outputMode === 'virtual';
        api.log('Helper 0.1.27; output=' + settings.outputMode + '; mode=' + settings.mode + (settings.mode === 'preview' ? ' (creates missing helper folders/backups only; source changes are previewed)' : ''));
        const mapper = virtual ? UgsoMqttRoles.createVirtualMapper(api, settings) : UgsoMqttRoles.createMapper(api, settings);
        let serial = Promise.resolve(), timer, pendingTimer, stopped = false, queued = 0, initialized = false;
        const enqueue = task => {
            if (stopped || queued >= 100) return;
            queued++;
            serial = serial.then(() => stopped ? undefined : task()).catch(error => log('[UGSo MQTT helper] ' + error.message, 'error')).finally(() => queued--);
        };
        const checkPending = () => {
            if (!stopped && virtual && mapper.hasPending() && !pendingTimer) pendingTimer = setTimeout(() => {
                pendingTimer = undefined; enqueue(async () => { await mapper.run(mapper.pendingSources()); checkPending(); });
            }, 5000);
        };
        if (settings.mode !== 'restore') {
            const escaped = settings.mqttRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            let fullScan = false;
            const dirtySources = new Set();
            on({id: new RegExp('^' + escaped + '\\.(?:availability|selected_entities|.+\\.(?:state|attribute\\.[^.]+))$'), change: 'any', q: '*'}, event => {
                if (!initialized) return;
                if (!event?.id || !event.state) return;
                const same = event.oldState && JSON.stringify(event.state.val) === JSON.stringify(event.oldState.val) && event.state.ack === event.oldState.ack && event.state.q === event.oldState.q;
                if (same && !(virtual && mapper.pendingSources().includes(event.id))) return;
                if (event.id.endsWith('.state')) dirtySources.add(event.id);
                else if (event.id.includes('.attribute.')) {
                    const [base, attribute] = event.id.split('.attribute.');
                    if (!['ha_entity_id', 'command_enabled', 'device_class', 'unit_of_measurement', 'friendly_name', 'min', 'max', 'step', 'options', 'effect_list', 'min_color_temp_kelvin', 'max_color_temp_kelvin'].includes(attribute)) return;
                    dirtySources.add(base + '.state');
                    for (const feature of ['brightness', 'rgb_color', 'effect', 'color_temp_kelvin']) dirtySources.add(base + '.' + feature + '.state');
                } else fullScan = true;
                if (!timer) timer = setTimeout(() => {
                    timer = undefined;
                    const sources = fullScan || !virtual ? undefined : [...dirtySources];
                    fullScan = false; dirtySources.clear();
                    enqueue(() => mapper.run(sources));
                }, 1000);
            });
            if (virtual) {
                const target = settings.virtualRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                on({id: new RegExp('^' + target + '\\..+\\.state$'), ack: false, change: 'any', q: '*'}, event => {
                    if (!initialized) return;
                    enqueue(async () => { await mapper.command(event); checkPending(); });
                });
            }
        }
        onStop(() => { stopped = true; if (timer) clearTimeout(timer); if (pendingTimer) clearTimeout(pendingTimer); }, 1000);
        enqueue(async () => { await UgsoMqttRoles.initialize(api, settings); initialized = true; await mapper.run(); });
    } catch (error) { log('[UGSo MQTT roles] ' + error.message, 'error'); }
}
