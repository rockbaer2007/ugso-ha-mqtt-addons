import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { Blockly, workspaceModel, modelWorkspace, toolbox } from '../src/blocks.js';
import { systemTypes, templateTypes } from '../src/system-template.js';
import { examples, toYaml, fromYaml } from '../src/model.js';
function base() { const ws = new Blockly.Workspace(); modelWorkspace(ws, { ...examples.light, actions: [] }); return ws; }
function make(ws, type, fields = {}) { const b = ws.newBlock(type); for (const [k,v] of Object.entries(fields)) b.setFieldValue(v,k); return b; }
function plug(parent, input, child) { parent.getInput(input).connection.connect(child.outputConnection || child.previousConnection); return child; }
function model(ws) { return workspaceModel(ws, examples.light); }
function message(ws, value) { const b = make(ws,'ugso_log_action'); plug(b,'MESSAGE',value); plug(ws.getBlocksByType('ugso_automation')[0],'ACTIONS',b); return b; }

test('Purpose templates export Boolean conditions, preserve types and evaluate time and trigger boundaries',()=>{
  const ws=base(),copy=new Blockly.Workspace();try{
    const root=ws.getBlocksByType('ugso_automation')[0];message(ws,make(ws,'ugso_text',{TEXT:'test'}));
    const time=make(ws,'ugso_template_time_window');plug(root,'CONDITIONS',time);
    const daytime=model(ws).conditions[0].value_template;
    time.setFieldValue('22:00','START');time.setFieldValue('06:00','END');const overnight=model(ws).conditions[0].value_template;
    time.setFieldValue('06:00','START');const equal=model(ws).conditions[0].value_template;
    time.setFieldValue('24:00','START');assert.throws(()=>model(ws),/HH:MM/);time.dispose(false);
    const change=make(ws,'ugso_template_change');plug(root,'CONDITIONS',change);const delta=model(ws).conditions[0].value_template;
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws),copy);assert.deepEqual(model(copy),model(ws));
    assert.deepEqual(fromYaml(toYaml(model(ws))),model(ws));
    change.getInputTargetBlock('RISE').setFieldValue(-1,'NUM');assert.throws(()=>model(ws),/mindestens 0|at least 0/);change.getInputTargetBlock('RISE').setFieldValue(10,'NUM');
    plug(change,'OLD',make(ws,'ugso_number',{NUM:100}));plug(change,'NEW',make(ws,'ugso_number',{NUM:111}));const explicit=model(ws).conditions[0].value_template;
    if(process.env.BLOCKS_JINJA_TEST){
      const result=spawnSync('python',['-c',`import sys,json,datetime,types
from jinja2.sandbox import ImmutableSandboxedEnvironment
day,night,equal,delta,explicit=json.load(sys.stdin);e=ImmutableSandboxedEnvironment()
def evaluate(source,**context): return e.from_string(source).render(**context).strip().lower()=='true'
for time,wanted in [('09:59:59',False),('10:00:00',True),('12:59:59',True),('13:00:00',False)]:
 e.globals['now']=lambda:datetime.datetime.fromisoformat('2026-10-11T'+time)
 assert evaluate(day)==wanted
for time,wanted in [('21:59:59',False),('22:00:00',True),('00:00:00',True),('05:59:59',True),('06:00:00',False)]:
 e.globals['now']=lambda:datetime.datetime.fromisoformat('2026-10-11T'+time)
 assert evaluate(night)==wanted
 assert not evaluate(equal)
assert not evaluate(delta)
assert not evaluate(delta,trigger=types.SimpleNamespace())
for old,new,wanted in [(None,'100',False),('unknown','100',False),('unavailable','100',False),('none','100',False),('100','111',True),('100','79',True),('100','110',False),('100','80',False),('100','not numeric',True)]:
 trigger=types.SimpleNamespace(from_state=None if old is None else types.SimpleNamespace(state=old),to_state=types.SimpleNamespace(state=new))
 assert evaluate(delta,trigger=trigger)==wanted
assert evaluate(explicit)
print('ok')`],{input:JSON.stringify([daytime,overnight,equal,delta,explicit]),encoding:'utf8'});
      assert.equal(result.status,0,result.stderr);assert.equal(result.stdout.trim(),'ok');
    }
  }finally{ws.dispose();copy.dispose();}
});

test('Conditional value type persists and requires complete numeric and Boolean branches',()=>{
  const ws=base(),copy=new Blockly.Workspace();try{
    const b=make(ws,'ugso_template_conditional',{KIND:'number'}),text=make(ws,'ugso_template_builder');message(ws,text);plug(text,'PART0',b);
    plug(b,'TEST',make(ws,'ugso_boolean',{BOOL:'true'}));
    assert.deepEqual(b.getInput('THEN').connection.getCheck(),['Number','RuntimeNumber']);
    assert.throws(()=>model(ws),/Beide Zweige|Both branches/);
    plug(b,'THEN',make(ws,'ugso_number',{NUM:10}));plug(b,'ELSE',make(ws,'ugso_number',{NUM:20}));
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws),copy);assert.deepEqual(model(copy),model(ws));
    assert.equal(copy.getBlocksByType(b.type)[0].getFieldValue('KIND'),'number');
    b.getInputTargetBlock('THEN').dispose(false);b.getInputTargetBlock('ELSE').dispose(false);b.outputConnection.disconnect();b.setFieldValue('boolean','KIND');
    plug(b,'THEN',make(ws,'ugso_boolean',{BOOL:'true'}));plug(b,'ELSE',make(ws,'ugso_boolean',{BOOL:'false'}));plug(ws.getBlocksByType('ugso_automation')[0],'CONDITIONS',b);
    assert.match(model(ws).conditions[0].value_template,/if true else/);
  }finally{ws.dispose();copy.dispose();}
});

test('System controls remain visible and raw Jinja palette has no equivalent duplicate entries',()=>{
  const system=toolbox.contents.find(c=>c.name==='System').contents.map(e=>e.type);
  assert.ok(system.includes('ugso_app_control'));assert.ok(system.includes('ugso_automation_control'));
  const jinja=toolbox.contents.find(c=>c.name==='Jinja (experimentell)').contents.map(e=>e.type);
  assert.ok(!jinja.includes('ugso_jinja_value'));assert.ok(!jinja.includes('ugso_jinja_condition'));
  const templates=toolbox.contents.find(c=>c.name==='Templates').contents.map(e=>e.type);
  assert.ok(templates.includes('ugso_template'));assert.ok(templates.includes('ugso_template_condition'));
});
test('System and template palette entries are unique and typed separately from actions', () => {
  const entries = toolbox.contents.flatMap(c=>c.contents || []);
  for (const type of [...systemTypes,...templateTypes]) assert.equal(entries.filter(e=>e.type===type).length,1,type);
  const ws=base(); try { assert.equal(make(ws,'ugso_template_output').previousConnection.getCheck()[0],'TemplatePart'); } finally {ws.dispose();}
});
test('Shared fixed and dynamic entity values generate safe HA state reads', () => {
  const ws=base(); try {
    const v=make(ws,'ugso_entity_value_dynamic'); plug(v,'ENTITY_ID',make(ws,'ugso_entity_id',{ENTITY:'sensor.temperature'})); message(ws,v);
    assert.equal(model(ws).actions[0].data.message,'{{ states("sensor.temperature") }}');
    v.setFieldValue('attribute','PROPERTY');v.setFieldValue('a\"b','ATTRIBUTE');
    assert.equal(model(ws).actions[0].data.message,'{{ state_attr("sensor.temperature", "a\\\"b") }}');
    v.setFieldValue('last_changed','PROPERTY'); assert.match(model(ws).actions[0].data.message,/selectattr.*first \| default\(none\)/);
  } finally {ws.dispose();}
});
test('Automation controls preserve exact false options, app slugs and YAML import', () => {
  const ws=base(),copy=new Blockly.Workspace(); try {
    const b=make(ws,'ugso_automation_control',{ENTITY:'automation.test',MODE:'trigger'});b.loadExtraState({options:['CONDITIONS']});
    plug(ws.getBlocksByType('ugso_automation')[0],'ACTIONS',b);
    const off=make(ws,'ugso_automation_control',{ENTITY:'automation.test',MODE:'turn_off',STOP_ACTIONS:'FALSE'});off.loadExtraState({options:['STOP']});b.nextConnection.connect(off.previousConnection);
    const app=make(ws,'ugso_app_control',{APP:'core_mosquitto',MODE:'restart'});off.nextConnection.connect(app.previousConnection);
    assert.deepEqual(model(ws).actions,[{action:'automation.trigger',target:{entity_id:'automation.test'},data:{skip_condition:false}},{action:'automation.turn_off',target:{entity_id:'automation.test'},data:{stop_actions:false}},{action:'hassio.app_restart',data:{app:'core_mosquitto'}}]);
    modelWorkspace(copy,fromYaml(toYaml(model(ws))));assert.deepEqual(model(copy).actions,model(ws).actions);assert.equal(copy.getBlocksByType('ugso_automation_control').length,2);
    b.loadExtraState({options:['TARGET']});plug(b,'TARGET',make(ws,'ugso_entity_id',{ENTITY:'automation.dynamic'}));
    assert.equal(model(ws).actions[0].target.entity_id,'{{ "automation.dynamic" }}');
  } finally {ws.dispose();copy.dispose();}
});
test('Snapshot reads once before its nested actions and preserves project serialization', () => {
  const ws=base(),copy=new Blockly.Workspace();try {
    const b=make(ws,'ugso_entity_snapshot',{ENTITY:'sensor.test'}),log=make(ws,'ugso_log_action');
    plug(log,'MESSAGE',make(ws,'ugso_variable_get',{VAR:b.getFieldValue('VAR')}));plug(b,'DO',log);plug(ws.getBlocksByType('ugso_automation')[0],'ACTIONS',b);
    const sequence=model(ws).actions[0].sequence;assert.deepEqual(sequence[0],{variables:{entity_value:'{{ states("sensor.test") }}'}});assert.equal(sequence[1].data.message,'{{ entity_value }}');
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws),copy);assert.deepEqual(model(copy),model(ws));
  } finally {ws.dispose();copy.dispose();}
});
test('Template keeps output order, literal Jinja text, conditional branches and format options on reload', () => {
  const ws=base(),copy=new Blockly.Workspace();try {
    const template=make(ws,'ugso_template_builder');message(ws,template);
    const out=make(ws,'ugso_template_output');plug(out,'VALUE',make(ws,'ugso_text',{TEXT:'Temperature {{ literal }}: '}));plug(template,'PARTS',out);
    const numeric=make(ws,'ugso_template_output');out.nextConnection.connect(numeric.previousConnection);
    const format=make(ws,'ugso_number_format');plug(numeric,'VALUE',format);plug(format,'VALUE',make(ws,'ugso_entity_value',{ENTITY:'sensor.temperature'}));format.loadExtraState({options:['FALLBACK']});plug(format,'FALLBACK',make(ws,'ugso_text',{TEXT:'n/a'}));
    const newline=make(ws,'ugso_template_newline');numeric.nextConnection.connect(newline.previousConnection);
    const condition=make(ws,'ugso_template_if');newline.nextConnection.connect(condition.previousConnection);condition.loadExtraState({options:['ELSE']});plug(condition,'TEST',make(ws,'ugso_boolean',{BOOL:'false'}));
    for (const [input,label] of [['THEN','yes'],['ELSE','no']]) {const b=make(ws,'ugso_template_output');plug(b,'VALUE',make(ws,'ugso_text',{TEXT:label}));plug(condition,input,b);}
    const source=model(ws).actions[0].data.message;assert.match(source,/Temperature \{\{ literal \}\}/);assert.match(source,/is_number\(states\("sensor.temperature"\)\)/);assert.match(source,/else \("n\/a"\)/);assert.match(source,/if false else/);
    if (process.env.BLOCKS_JINJA_TEST) {
    const result=spawnSync('python',['-c',`import sys,json
from jinja2.sandbox import ImmutableSandboxedEnvironment
e=ImmutableSandboxedEnvironment()
e.globals['states']=lambda entity:'21.56'
e.globals['is_number']=lambda value: str(value).replace('.','',1).isdigit()
print(json.dumps(e.from_string(sys.stdin.read()).render()))`],{input:source,encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout),'Temperature {{ literal }}: 21.6\nno');
    }
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws),copy);assert.deepEqual(model(copy),model(ws));
    assert.deepEqual(copy.getBlocksByType('ugso_number_format')[0].saveExtraState(),{});
    format.getInputTargetBlock('FALLBACK').dispose(false);assert.doesNotMatch(model(ws).actions[0].data.message,/n\/a/);
  } finally {ws.dispose();copy.dispose();}
});
test('Fallback retains zero and false rather than using truthiness', () => {
  const ws=base();try {const b=make(ws,'ugso_value_fallback');plug(b,'VALUE',make(ws,'ugso_number',{NUM:0}));plug(b,'FALLBACK',make(ws,'ugso_text',{TEXT:'missing'}));message(ws,b);assert.match(model(ws).actions[0].data.message,/in \[none, 'unknown', 'unavailable', ''\]/);} finally {ws.dispose();}
});
test('Direct template sockets retain types, stable order, empty positions and project reload without gears',()=>{
  const ws=base(),copy=new Blockly.Workspace();try{
    const b=make(ws,'ugso_template_builder');message(ws,b);
    plug(b,'PART0',make(ws,'ugso_text',{TEXT:'Temperature: '}));
    plug(b,'PART1',make(ws,'ugso_number',{NUM:21.5}));b.refreshTemplateInputs_();
    plug(b,'PART2',make(ws,'ugso_template_linebreak'));b.refreshTemplateInputs_();
    assert.equal(b.getInput('PART0').connection.type,Blockly.ConnectionType.INPUT_VALUE);
    assert.ok(b.getInput('PART3'));assert.equal(b.decompose,undefined);
    const source=model(ws).actions[0].data.message;
    assert.match(source,/Temperature: .*21.5.*\\n/);
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws),copy);assert.deepEqual(model(copy),model(ws));
    const last=b.getInputTargetBlock('PART2');last.dispose(false);b.refreshTemplateInputs_();assert.ok(b.getInput('PART3'),'empty sockets retain stable IDs for undo');
  }finally{ws.dispose();copy.dispose();}
});
test('Legacy output chains migrate to direct values without losing branches, fallback or disabled outputs',()=>{
  const ws=base();try{
    const b=make(ws,'ugso_template_builder');message(ws,b);
    const out=make(ws,'ugso_template_output');plug(out,'VALUE',make(ws,'ugso_text',{TEXT:'literal {{ text }}'}));plug(b,'PARTS',out);
    const conditional=make(ws,'ugso_template_if');out.nextConnection.connect(conditional.previousConnection);plug(conditional,'TEST',make(ws,'ugso_boolean',{BOOL:'false'}));
    const no=make(ws,'ugso_template_output');plug(no,'VALUE',make(ws,'ugso_text',{TEXT:'no'}));plug(conditional,'ELSE',no);
    const newline=make(ws,'ugso_template_newline');conditional.nextConnection.connect(newline.previousConnection);newline.setDisabledReason(true,'MANUALLY_DISABLED');
    b.migrateTemplate_();assert.equal(b.getInputTargetBlock('PARTS'),null);assert.equal(ws.getBlocksByType('ugso_template_output').length,0);
    assert.equal(b.getInputTargetBlock('PART1').type,'ugso_template_conditional');assert.equal(b.getInputTargetBlock('PART2').isEnabled(),false);
    assert.match(model(ws).actions[0].data.message,/literal \{\{ text \}\}.*if false.*no/);
  }finally{ws.dispose();}
});
test('User time-window and guarded solar-difference templates retain exact source through YAML and projects',()=>{
  const templates=["{{ '10:00:00' <= now().strftime('%H:%M:%S') < '13:00:00' }}",`{% if trigger.from_state is none or trigger.from_state.state in ['unavailable', 'unknown', 'none'] %}
  false
{% else %}
  {% set diff = (trigger.to_state.state | float(0)) - (trigger.from_state.state | float(0)) %}
  {{ diff > 10 or diff < -20 }}
{% endif %}`];
  for(const source of templates){
    const ws=new Blockly.Workspace(),copy=new Blockly.Workspace();try{
      const input={...examples.light,conditions:[{condition:'template',value_template:source}]};modelWorkspace(ws,input);
      assert.equal(model(ws).conditions[0].value_template,source);
      assert.equal(fromYaml(toYaml(model(ws))).conditions[0].value_template,source);
      Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws),copy);assert.equal(model(copy).conditions[0].value_template,source);
    }finally{ws.dispose();copy.dispose();}
  }
  if(process.env.BLOCKS_JINJA_TEST){
    const result=spawnSync('python',['-c',`import sys,json,datetime,types
from jinja2.sandbox import ImmutableSandboxedEnvironment
sources=json.load(sys.stdin);e=ImmutableSandboxedEnvironment()
for time,wanted in [('09:59:59',False),('10:00:00',True),('12:59:59',True),('13:00:00',False)]:
 e.globals['now']=lambda:datetime.datetime.fromisoformat('2026-10-11T'+time)
 assert (e.from_string(sources[0]).render().strip().lower()=='true')==wanted
for old,new,wanted in [(None,'100',False),('unknown','100',False),('unavailable','100',False),('none','100',False),('100','111',True),('100','79',True),('100','110',False),('100','80',False),('100','not numeric',True)]:
 trigger=types.SimpleNamespace(from_state=None if old is None else types.SimpleNamespace(state=old),to_state=types.SimpleNamespace(state=new))
 assert (e.from_string(sources[1]).render(trigger=trigger).strip().lower()=='true')==wanted
print('ok')`],{input:JSON.stringify(templates),encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);assert.equal(result.stdout.trim(),'ok');
  }
});
