import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { Blockly, modelWorkspace, workspaceModel, toolbox } from '../src/blocks.js';
import { examples, fromYaml, toYaml } from '../src/model.js';

function fixture(type) {
  const ws = new Blockly.Workspace();
  modelWorkspace(ws, { ...examples.light, conditions: [], actions: [{ variables: { time: 0 } }] });
  const info = toolbox.contents.flatMap(c => c.contents || []).find(b => b.type === type);
  const block = Blockly.serialization.blocks.append(info, ws);
  const root = ws.getBlocksByType('ugso_automation')[0];
  if (type.includes('compare')) root.getInput('CONDITIONS').connection.connect(block.outputConnection);
  else ws.getBlocksByType('ugso_variable_set')[0].getInput('VALUE').connection.connect(block.outputConnection);
  return { ws, block };
}
test('All time blocks preserve their expressions through project and YAML reload', () => {
  for (const type of ['compare', 'compare_input', 'now', 'boundary', 'sun', 'shift', 'format']) {
    const { ws, block } = fixture(`ugso_time_${type}`), copy = new Blockly.Workspace();
    try {
      if (type.includes('compare')) block.setFieldValue('between', 'OP');
      if (type === 'compare_input') block.setFieldValue('FALSE', 'CURRENT');
      const model = workspaceModel(ws, examples.light);
      Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), copy);
      assert.deepEqual(workspaceModel(copy, examples.light), model);
      modelWorkspace(copy, fromYaml(toYaml(model)));
      assert.deepEqual(workspaceModel(copy, examples.light), model);
    } finally { ws.dispose(); copy.dispose(); }
  }
});
test('Clock fields validate; ranges and custom time sockets change dynamically with typed connectors', () => {
  const { ws, block } = fixture('ugso_time_compare');
  try {
    block.setFieldValue('25:00', 'START');
    assert.throws(() => workspaceModel(ws, examples.light), /HH:mm/);
    block.setFieldValue('22:00', 'START'); block.setFieldValue('outside', 'OP');
    assert.ok(block.getInput('END')); block.setFieldValue('06:00', 'END');
    assert.match(workspaceModel(ws, examples.light).conditions[0].value_template, /not/);
    block.setFieldValue('<', 'OP'); assert.equal(block.getInput('END'), null);
    const shift = ws.newBlock('ugso_time_shift'), text = ws.newBlock('ugso_text');
    assert.equal(shift.getInput('BASE').connection.getConnectionChecker().canConnect(shift.getInput('BASE').connection, text.outputConnection, false), false);
  } finally { ws.dispose(); }
});
test('Infinite datetime amounts and sun offsets fail before YAML generation', () => {
  for (const [type, input] of [['shift', 'AMOUNT'], ['sun', 'OFFSET']]) {
    const { ws, block } = fixture(`ugso_time_${type}`);
    try {
      block.getInputTargetBlock(input).setFieldValue(Infinity, 'NUM');
      assert.throws(() => workspaceModel(ws, examples.light), /endliche Zahl/);
    } finally { ws.dispose(); }
  }
});
// Opt-in integration check: Python/Jinja2 is not a required frontend dependency.
test('Generated Jinja handles overnight boundaries, HA timezone and spring DST calendar boundaries', { skip: !process.env.BLOCKS_JINJA_TEST }, () => {
  const { ws, block } = fixture('ugso_time_compare');
  try {
    block.setFieldValue('between', 'OP'); block.setFieldValue('22:00', 'START'); block.setFieldValue('06:00', 'END');
    const expression = workspaceModel(ws, examples.light).conditions[0].value_template;
    const values = [];
    for (const [type, expected] of [
      ['now', '2026-03-29T12:00:00+02:00'], ['boundary', '2026-03-29T00:00:00+01:00'],
      ['sun', '2026-03-30T08:30:00+02:00'], ['shift', '2026-03-29T12:00:00.001000+02:00'], ['format', '12:00']
    ]) {
      const item = fixture(`ugso_time_${type}`);
      try { values.push({ template: workspaceModel(item.ws, examples.light).actions[0].variables.time, expected }); }
      finally { item.ws.dispose(); }
    }
    const python = spawnSync('python', ['-c', `
import json,sys
from datetime import datetime,timedelta
from zoneinfo import ZoneInfo
from jinja2.nativetypes import NativeEnvironment
e=NativeEnvironment(); zone=ZoneInfo('Europe/Berlin')
for hour,expected in [(21,False),(22,True),(0,True),(5,True),(6,False)]:
 e.globals['now']=lambda:datetime(2026,3,29,hour,tzinfo=zone)
 assert e.from_string(${JSON.stringify(expression)}).render() == expected
e.globals.update(now=lambda:datetime(2026,3,29,12,tzinfo=zone),today_at=lambda t:datetime(2026,3,29,tzinfo=zone),timedelta=timedelta,as_datetime=datetime.fromisoformat,as_local=lambda d:d.astimezone(zone),state_attr=lambda entity,attr:'2026-03-30T06:30:00+00:00')
d=e.from_string("{{ today_at('00:00') + timedelta(days=1) }}").render()
assert d.isoformat() == '2026-03-30T00:00:00+02:00'
for item in json.load(sys.stdin):
 result=e.from_string(item['template']).render()
 if isinstance(result,datetime): result=result.isoformat()
 assert result == item['expected'], (result,item)
`], { input: JSON.stringify(values), encoding: 'utf8' });
    assert.equal(python.status, 0, python.stderr);
  } finally { ws.dispose(); }
});
