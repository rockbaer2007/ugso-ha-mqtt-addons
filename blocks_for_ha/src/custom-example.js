export const customExample = {
  format: 'ugso-ha-block-package', schemaVersion: 1, id: 'ugso_sensor_tools', version: '1.0.0',
  name: 'Sensor und Licht', description: 'Sensorwert als Zahl lesen, eine Grenze prüfen und Licht mit fester Helligkeit einschalten. Entitäten vor Verwendung ersetzen.',
  author: 'rockbaer2007', license: 'Apache-2.0', dependencies: [],
  blocks: [
    { id: 'sensor_number', label: 'Sensorwert als Zahl', tooltip: 'HA liest den Sensorwert; nicht numerische Werte ergeben 0.', kind: 'value', output: 'Number', fields: [{ name: 'ENTITY', label: 'Entität', type: 'entity', default: 'sensor.temperatur' }], inputs: [], expression: 'states(${ENTITY}) | float(0)' },
    { id: 'sensor_above', label: 'Sensor über Grenze', tooltip: 'Prüft den Sensorwert in HA. Ein unbekannter oder nicht numerischer Wert erfüllt die Bedingung nicht.', kind: 'condition', output: 'Boolean', fields: [{ name: 'ENTITY', label: 'Entität', type: 'entity', default: 'sensor.temperatur' }, { name: 'LIMIT', label: 'Grenze', type: 'number', default: 20 }], inputs: [], expression: 'is_number(states(${ENTITY})) and (states(${ENTITY}) | float) > ${LIMIT}' },
    { id: 'light_on', label: 'Licht mit Helligkeit', tooltip: 'Licht muss brightness_pct unterstützen; 0–100 verwenden.', kind: 'action', fields: [{ name: 'ENTITY', label: 'Licht', type: 'entity', default: 'light.wohnzimmer' }, { name: 'BRIGHTNESS', label: 'Helligkeit %', type: 'number', default: 50 }], inputs: [], ha: { action: 'light.turn_on', target: { entity_id: { $field: 'ENTITY' } }, data: { brightness_pct: { $field: 'BRIGHTNESS' } } } },
  ],
};
