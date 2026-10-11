import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleTrigger } from '../src/schedule.js';
import { Blockly, toolbox, modelWorkspace, workspaceModel } from '../src/blocks.js';
import { examples, fromYaml, toYaml } from '../src/model.js';

test('CRON wall-clock rules compile to native patterns or times with weekdays', () => {
  assert.deepEqual(scheduleTrigger('*/5 * * * *'), { trigger: 'time_pattern', seconds: 0, minutes: '/5', hours: '*' });
  assert.deepEqual(scheduleTrigger('*/30 * * * * *'), { trigger: 'time_pattern', seconds: '/30', minutes: '*', hours: '*' });
  assert.deepEqual(scheduleTrigger('0 */60 */24 * * *'), { trigger: 'time_pattern', seconds: 0, minutes: 0, hours: 0 });
  assert.deepEqual(scheduleTrigger('30 7 * * 1-5'), { trigger: 'time', at: '07:30:00', weekday: ['mon','tue','wed','thu','fri'] });
  assert.deepEqual(scheduleTrigger('0 0,30 7,8 * * 0,7'), { trigger: 'time', at: ['07:00:00','07:30:00','08:00:00','08:30:00'], weekday: ['sun'] });
  for (const value of ['bad','60 * * * *','*/0 * * * *','0 24 * * *','0 5-3 * * *','0 7 * * 8','0 7 * * 1;alert(1)']) assert.throws(() => scheduleTrigger(value), /Ungültiger/);
  assert.throws(() => scheduleTrigger('0 7 1 * *'), /Kalenderregeln/);
  assert.throws(() => scheduleTrigger('* * * * * 1'), /Zu viele/);
});

test('Schedule project and YAML import retains rule meaning and trigger IDs', () => {
  const ws = new Blockly.Workspace(), copy = new Blockly.Workspace();
  try {
    for (const cron of ['*/5 * * * *','0 30 7 * * 1-5','*/30 * * * * *']) {
      const model = structuredClone(examples.light); model.triggers = [{ ...scheduleTrigger(cron), id: 'timer' }];
      modelWorkspace(ws, model);
      assert.equal(ws.getBlocksByType('ugso_schedule_trigger').length, 1);
      assert.equal(ws.getBlocksByType('ugso_schedule_trigger')[0].getField('CRON').constructor.name, 'ScheduleField');
      Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), copy);
      assert.deepEqual(fromYaml(toYaml(workspaceModel(copy, model))), model);
    }
    const trigger = toolbox.contents.find(c => c.name === 'Auslöser');
    for (const type of ['ugso_ha_mqtt_trigger','ugso_ha_template_trigger','ugso_ha_webhook_trigger','ugso_ha_zone_trigger','ugso_ha_tag_trigger','ugso_schedule_trigger','ugso_trigger_value']) {
      assert.ok(trigger.contents.some(b => b.type === type), type);
      assert.equal(toolbox.contents.flatMap(c => c.contents || []).filter(b => b.type === type).length, 1);
    }
  } finally { ws.dispose(); copy.dispose(); }
});

test('Astro offset and trigger-value blocks generate native HA data without ioBroker ack', () => {
  const ws = new Blockly.Workspace();
  try {
    const model = structuredClone(examples.light); model.triggers = [{ trigger:'sun',event:'sunset',offset:-900 }];
    modelWorkspace(ws, model); assert.equal(ws.getBlocksByType('ugso_sun_trigger')[0].getFieldValue('OFFSET_MINUTES'), -15);
    assert.deepEqual(workspaceModel(ws, model), model);
    const action = ws.getBlocksByType('ugso_switch_action')[0]; action.dispose();
    const variable = ws.getVariableMap().createVariable('value');
    const assign = ws.newBlock('ugso_variable_set'); assign.setFieldValue(variable.getId(), 'VAR');
    ws.getBlocksByType('ugso_automation')[0].getInput('ACTIONS').connection.connect(assign.previousConnection);
    const data = ws.newBlock('ugso_trigger_value'); assign.getInput('VALUE').connection.connect(data.outputConnection);
    for (const kind of ['value','old','entity','id','platform','payload','json','event']) {
      data.setFieldValue(kind, 'DATA'); assert.match(workspaceModel(ws, model).actions[0].variables.value, /trigger\./);
    }
  } finally { ws.dispose(); }
});
