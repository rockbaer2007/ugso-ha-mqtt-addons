/* MQTT-Client 0.1.23: paste this entire file into an ioBroker JavaScript script.
 * Preview first. Settings and documentation: mqtt_client/iobroker/README*.md.
 * No MQTT state values, types, units, permissions or commands are changed.
 */
'use strict';

const UGSO_MQTT_ROLE_SETTINGS = {
    mqttRoot: 'mqtt.0.ha_external',
    mode: 'preview', // preview | apply | restore
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
    return {createMapper, propose, validDate, validTimestamp, numeric, binary};
})();

if (typeof module !== 'undefined' && module.exports) module.exports = UgsoMqttRoles;

if (typeof on === 'function' && typeof getObject === 'function') {
    const settings = UGSO_MQTT_ROLE_SETTINGS;
    const api = {
        getObject: id => getObject(id),
        getState: id => getState(id),
        listMetadata: () => {
            const ids = [];
            $('state[id=' + settings.mqttRoot + '.*.attribute.device_class]').each(id => ids.push(id));
            return ids;
        },
        writeRole: (id, role) => new Promise((resolve, reject) => extendObject(id, {common: {role}}, error => error ? reject(new Error(String(error))) : resolve())),
        restoreObject: (id, object) => new Promise((resolve, reject) => setObject(id, object, error => error ? reject(new Error(String(error))) : resolve())),
        createAlias: (id, object) => new Promise((resolve, reject) => setObject(id, object, error => error ? reject(new Error(String(error))) : resolve())),
        deleteAlias: id => new Promise((resolve, reject) => deleteObject(id, false, error => error ? reject(new Error(String(error))) : resolve())),
        writeJournal: async (id, value) => {
            if (!getObject(id)) await createStateAsync(id, '', false, {name: 'UGSo MQTT role backup', type: 'string', role: 'json', read: true, write: false});
            await setStateAsync(id, {val: value, ack: true});
            if ((await getStateAsync(id))?.val !== value) throw new Error('Backup could not be verified');
        },
        log: message => log('[UGSo MQTT roles] ' + message, 'info'),
    };
    try {
        const mapper = UgsoMqttRoles.createMapper(api, settings);
        let running = false, pending = false, timer;
        const scan = async () => {
            if (running) { pending = true; return; }
            running = true;
            try { await mapper.run(); }
            catch (error) { log('[UGSo MQTT roles] ' + error.message, 'error'); }
            finally {
                running = false;
                if (pending && !timer) { pending = false; timer = setTimeout(() => { timer = undefined; scan(); }, 1000); }
            }
        };
        if (settings.mode !== 'restore') {
            const escaped = settings.mqttRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            on({id: new RegExp('^' + escaped + '\\..+\\.(?:state|attribute\\.(?:device_class|unit_of_measurement))$'), change: 'any'}, () => {
                if (!timer) timer = setTimeout(() => { timer = undefined; scan(); }, 1000);
            });
        }
        scan();
    } catch (error) { log('[UGSo MQTT roles] ' + error.message, 'error'); }
}
