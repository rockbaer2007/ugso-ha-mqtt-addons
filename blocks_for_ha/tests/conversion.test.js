import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { Blockly, modelWorkspace, workspaceModel, toolbox } from '../src/blocks.js';
import { examples, fromYaml, toYaml } from '../src/model.js';
import { conversionDefinitions } from '../src/conversion.js';

function fixture(type) {
  const ws = new Blockly.Workspace();
  modelWorkspace(ws, { ...examples.light, actions: [{ variables: { result: 0 } }] });
  const info = toolbox.contents.flatMap(c => c.contents || []).find(b => b.type === type);
  const block = Blockly.serialization.blocks.append(info, ws);
  ws.getBlocksByType('ugso_variable_set')[0].getInput('VALUE').connection.connect(block.outputConnection);
  return { ws, block, template: () => workspaceModel(ws, examples.light).actions[0].variables.result };
}
test('All conversion blocks preserve expressions through JSON and YAML', () => {
  for (const { type } of conversionDefinitions) {
    const { ws, block } = fixture(type), copy = new Blockly.Workspace();
    try {
      if (type === 'ugso_convert_date_format') { block.setFieldValue('custom', 'FORMAT'); block.setFieldValue('%Y/%m/%d', 'PATTERN'); }
      if (type === 'ugso_convert_to_json') block.setFieldValue('TRUE', 'PRETTY');
      const model = workspaceModel(ws, examples.light);
      Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), copy);
      assert.deepEqual(workspaceModel(copy, examples.light), model);
      modelWorkspace(copy, fromYaml(toYaml(model)));
      assert.deepEqual(workspaceModel(copy, examples.light), model);
    } finally { ws.dispose(); copy.dispose(); }
  }
});
test('Date format selection changes its type and field; runtime numbers dock only in expression consumers', () => {
  const { ws, block } = fixture('ugso_convert_date_format');
  try {
    assert.ok(block.outputConnection.getCheck().includes('Time'));
    block.setFieldValue('year', 'FORMAT'); assert.ok(block.outputConnection.getCheck().includes('RuntimeNumber'));
    block.setFieldValue('custom', 'FORMAT'); assert.ok(block.outputConnection.getCheck().includes('String'));
    block.setFieldValue('', 'PATTERN'); assert.throws(() => workspaceModel(ws, examples.light), /Datumsformat fehlt/);
    block.setFieldValue('iso', 'FORMAT'); assert.equal(block.getInput('PATTERN'), null);
    const number = ws.newBlock('ugso_convert_number'), delay = ws.newBlock('ugso_delay_action'), shift = ws.newBlock('ugso_time_shift');
    const checker = number.outputConnection.getConnectionChecker();
    assert.equal(checker.canConnect(number.outputConnection, delay.getInput('SECONDS').connection, false), false);
    assert.equal(checker.canConnect(number.outputConnection, shift.getInput('AMOUNT').connection, false), true);
    const value = Blockly.serialization.blocks.append({ type: 'ugso_convert_number', inputs: { VALUE: { shadow: { type: 'ugso_text', fields: { TEXT: '30' } } } } }, ws);
    shift.getInput('BASE').connection.setShadowState({ type: 'ugso_time_now' });
    shift.getInput('AMOUNT').connection.connect(value.outputConnection);
    ws.getBlocksByType('ugso_variable_set')[0].getInput('VALUE').connection.connect(shift.outputConnection);
    // Dispose detached test blocks, leaving a single connected automation.
    for (const orphan of ws.getTopBlocks(false)) if (orphan.type !== 'ugso_automation') orphan.dispose();
    assert.match(workspaceModel(ws, examples.light).actions[0].variables.result, /timedelta\(milliseconds=float\("30"\)\)/);
  } finally { ws.dispose(); }
});
test('Boolean conversion is accepted as an HA condition; missing/disabled operands reject export', () => {
  const { ws, block } = fixture('ugso_convert_boolean');
  try {
    const root = ws.getBlocksByType('ugso_automation')[0];
    root.getInput('CONDITIONS').connection.connect(block.outputConnection);
    assert.deepEqual(workspaceModel(ws, examples.light).conditions, [{ condition: 'template', value_template: '{{ bool("on") }}' }]);
    block.getInputTargetBlock('VALUE').setDisabledReason(true, 'MANUALLY_DISABLED');
    assert.throws(() => workspaceModel(ws, examples.light), /fehlt/);
  } finally { ws.dispose(); }
});
test('Conversion expressions execute in Jinja with strict HA helper contracts', { skip: !process.env.BLOCKS_JINJA_TEST }, () => {
  const cases = [];
  const add = (type, expected, configure = () => {}) => {
    const f = fixture(`ugso_convert_${type}`);
    try { configure(f.block, f.ws); cases.push({ template: f.template(), expected }); } finally { f.ws.dispose(); }
  };
  add('number', '21.5'); add('boolean', 'True'); add('string', '42'); add('type', 'str');
  add('datetime', '2026-10-10 12:00:00+02:00');
  for (const unit of ['seconds', 'milliseconds']) add('datetime', '2026-10-10 12:00:00+02:00', b => {
    b.setFieldValue(unit, 'UNIT');
    b.getInputTargetBlock('VALUE').setFieldValue(String(Date.parse('2026-10-10T12:00:00+02:00') / (unit === 'seconds' ? 1000 : 1)), 'TEXT');
  });
  add('boolean', 'False', b => b.getInputTargetBlock('VALUE').setFieldValue('false', 'TEXT'));
  add('boolean', 'False', b => b.getInputTargetBlock('VALUE').setFieldValue('off', 'TEXT'));
  for (const [format, expected] of [['year', '2026'], ['weekday', '6'], ['week', '41'], ['day_seconds', '43200'], ['iso', '2026-10-10T12:00:00+02:00'], ['custom', '2026/10/10']]) add('date_format', expected, b => { b.setFieldValue(format, 'FORMAT'); if (format === 'custom') b.setFieldValue('%Y/%m/%d', 'PATTERN'); });
  for (const [amount, format, expected] of [[3661000, 'hms', '01:01:01'], [-3661000, 'hms', '-01:01:01'], [90061000, 'hms', '25:01:01'], [3661000, 'ms', '61:01'], [3661000, 'hm', '01:01'], [0, 'hms', '00:00:00'], [1999, 'hms', '00:00:01']]) add('duration', expected, b => { b.getInputTargetBlock('VALUE').setFieldValue(amount, 'NUM'); b.setFieldValue(format, 'FORMAT'); });
  add('duration', '01:01:01', b => { b.setFieldValue('seconds', 'UNIT'); b.getInputTargetBlock('VALUE').setFieldValue(3661, 'NUM'); });
  add('from_json', "{'wert': 21.5}"); add('to_json', '{"wert":21.5}');
  add('to_json', '{\n  "wert": 21.5\n}', b => b.setFieldValue('TRUE', 'PRETTY'));
  add('number', null, b => b.getInputTargetBlock('VALUE').setFieldValue('21W', 'TEXT'));
  add('boolean', null, b => b.getInputTargetBlock('VALUE').setFieldValue('unknown', 'TEXT'));
  add('from_json', null, b => b.getInputTargetBlock('VALUE').setFieldValue('{broken', 'TEXT'));
  add('datetime', null, b => b.getInputTargetBlock('VALUE').setFieldValue('not-a-date', 'TEXT'));
  const result = spawnSync('python', ['-c', `
import json,sys
from datetime import datetime,timedelta
from zoneinfo import ZoneInfo
from jinja2 import Environment,StrictUndefined
zone=ZoneInfo('Europe/Berlin'); e=Environment(undefined=StrictUndefined)
def ha_bool(value):
 if value in (True,1,'true','on','yes','1'): return True
 if value in (False,0,'false','off','no','0'): return False
 raise ValueError('invalid boolean')
def ha_date(value):
 return datetime.fromtimestamp(value,zone) if isinstance(value,(int,float)) else datetime.fromisoformat(value)
e.globals.update(float=float,bool=ha_bool,typeof=lambda v:type(v).__name__,as_datetime=ha_date,as_local=lambda d:d.astimezone(zone),as_timestamp=lambda d:d.timestamp(),now=lambda:datetime(2026,10,10,12,tzinfo=zone),int=int,timedelta=timedelta)
e.filters.update(from_json=json.loads,to_json=lambda value,pretty_print=False:json.dumps(value,ensure_ascii=False,indent=2 if pretty_print else None,separators=None if pretty_print else (',',':')))
for item in json.load(sys.stdin):
 try: actual=e.from_string(item['template']).render()
 except (ValueError,TypeError,AttributeError):
  assert item['expected'] is None,item
 else: assert actual == item['expected'],(actual,item)
`], { input: JSON.stringify(cases), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
