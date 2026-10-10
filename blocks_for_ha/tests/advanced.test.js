import test from 'node:test';
import assert from 'node:assert/strict';
import { Blockly, modelWorkspace, workspaceModel } from '../src/blocks.js';
import { examples, fromYaml, toYaml } from '../src/model.js';
import { analyseJinja } from '../src/jinja.js';
import { replaceAutomationOptions } from '../src/automation-options.js';

function roundtrip(model) {
  const ws=new Blockly.Workspace(),copy=new Blockly.Workspace();
  try {
    modelWorkspace(ws,fromYaml(toYaml(model)));
    assert.deepEqual(workspaceModel(ws,model),model);
    assert.equal(ws.getTopBlocks(false).length,1,'No orphan blocks after a failed simple mapping');
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws),copy);
    assert.deepEqual(fromYaml(toYaml(workspaceModel(copy,model))),model);
  } finally { ws.dispose();copy.dispose(); }
}
const triggers=[
  {trigger:'state',entity_id:['sensor.a','sensor.b'],not_from:['unknown','unavailable'],to:null,attribute:'status',for:{seconds:2},alias:'Sensor',enabled:false,variables:{x:[1,2]}},
  {trigger:'numeric_state',entity_id:['sensor.a','sensor.b'],above:'input_number.minimum',below:30,attribute:'temperature',value_template:'{{ state.state | float(0) }}',for:1.5},
  {trigger:'time',at:['07:00','input_datetime.alarm',{entity_id:'sensor.alarm',offset:'-00:10:00'}],weekday:['mon','fri']},
  {trigger:'sun',event:'sunset',offset:{minutes:-15}},
  {trigger:'homeassistant',event:'shutdown'},
  {trigger:'event',event_type:['timer.finished','custom_event'],event_data:{x:true},context:{user_id:['user']}},
  {trigger:'mqtt',topic:'room/+',payload:'on',value_template:'{{ value_json.status }}',encoding:null,qos:2},
  {trigger:'template',value_template:"{{ states('sensor.a') | float(0) > 10 }}",for:5},
  {trigger:'webhook',webhook_id:['secret-a','secret-b'],local_only:true,allowed_methods:['POST','PUT']},
  {trigger:'zone',entity_id:['person.a','person.b'],zone:'zone.home',event:'leave'},
  {trigger:'tag',tag_id:['a','b'],device_id:['phone']},
  {trigger:'conversation',command:['Turn on {room} lights']},
  {trigger:'geo_location',source:'geo_json_events',zone:'zone.home',event:'enter'},
  {trigger:'calendar',entity_id:'calendar.test',event:'end',offset:'-00:15:00'},
  {trigger:'device',device_id:'123',domain:'binary_sensor',type:'motion',entity_id:'binary_sensor.test',for:3},
  {trigger:'motion.detected',target:{area_id:['living_room'],floor_id:'ground'},options:{behavior:'all',for:'00:00:10'}},
  {trigger:'timer.finished',target:{label_id:'timers'},options:{behavior:'first'}},
  {trigger:'power.changed',target:{entity_id:'sensor.power'},options:{threshold:{type:'above',value:{number:2,unit_of_measurement:'kW'}}}},
];
for(const trigger of triggers)test(`Extended trigger ${trigger.trigger} roundtrips through Blockly/YAML/reload`,()=>roundtrip({...examples.light,triggers:[trigger]}));
const conditions=[
  {condition:'time',weekday:['mon','fri'],before:'input_datetime.alarm'},
  {condition:'state',entity_id:['sensor.a','sensor.b'],state:['ready','on'],attribute:'status',for:{minutes:1},match:'any',enabled:'{{ enable }}'},
  {condition:'numeric_state',entity_id:['sensor.a'],above:0,below:'input_number.limit',value_template:'{{ state.state | float(0) }}'},
  {condition:'sun',after:'sunset',after_offset:'-00:20:00'},
  {condition:'zone',entity_id:['person.a'],zone:['zone.home']},
  {condition:'device',device_id:'123',domain:'binary_sensor',type:'is_on'},
  "{{ is_state('input_boolean.ready', 'on') }}",
];
for(const condition of conditions)test(`Extended condition ${condition.condition||'shorthand'} preserves exact fields`,()=>roundtrip({...examples.light,conditions:[condition]}));
const stop={stop:'Done'};
const actions=[
  {action:'light.turn_on',target:{area_id:'living',device_id:['device'],floor_id:'ground',label_id:['evening'],entity_id:'all'},data:'{{ lamp_data }}',alias:'Lamp',enabled:'{{ enabled }}',continue_on_error:true},
  {variables:{list:[1,'{{ value }}'],object:{items:[true,null]},x:null}},
  {delay:{minutes:1,seconds:1.5}},
  {wait_for_trigger:triggers.slice(0,3),timeout:{seconds:10},continue_on_timeout:false},
  {parallel:[{sequence:[stop,{delay:1}]},{sequence:[{action:'switch.turn_off'}]},{sequence:[{event:'custom',event_data:{x:true}}]}]},
  {parallel:[[stop],{action:'switch.turn_off',alias:'Direct branch'}]},
  {sequence:[{condition:'state',entity_id:'sensor.a',state:'on'},stop]},
  {condition:'numeric_state',entity_id:'sensor.a',above:0,alias:'Gate'},
  {repeat:{for_each:[{name:'one',value:1},{name:'two',value:2}],sequence:[stop]}},
  {if:"{{ enable }}",then:[{set_conversation_response:'{{ response }}'}],else:[]},
  {choose:[{alias:'A',conditions:{condition:'trigger',id:'one'},sequence:[stop]}]},
  {event:'custom',event_data_template:{x:'{{ value }}'}},
  {set_conversation_response:null},
  {scene:'scene.evening'},
  stop,
];
actions.forEach((action,i)=>test(`Extended action variant ${i} preserves common options and nested values`,()=>roundtrip({...examples.light,actions:[action]})));
test('Root options and optional alias survive YAML/Blockly/project reload',()=>{
  const model={...examples.light,variables:{items:[1,2]},trigger_variables:{topic:'room'},initial_state:false,trace:{stored_traces:20},max_exceeded:'silent'};
  delete model.alias;roundtrip(model);
  assert.deepEqual(replaceAutomationOptions(model,{}),Object.fromEntries(Object.entries(model).filter(([k])=>!['variables','trigger_variables','initial_state','trace','max_exceeded'].includes(k))));
  assert.throws(()=>replaceAutomationOptions(model,{actions:[]}),/nicht unterstützt/);
});
test('Parallel shape retains surviving branches and validates branch limits',()=>{
  const ws=new Blockly.Workspace();try{
    const block=ws.newBlock('ugso_parallel');block.loadExtraState({branches:3});const child=ws.newBlock('ugso_stop');block.getInput('BRANCH0').connection.connect(child.previousConnection);
    block.loadExtraState({branches:2});assert.equal(block.getInputTargetBlock('BRANCH0'),child);assert.equal(block.getInput('BRANCH2'),null);
    for(const n of [0,101,1.5])assert.throws(()=>block.loadExtraState({branches:n}));
  }finally{ws.dispose();}
});
test('Unsupported and malformed extended options fail before export',()=>{
  for(const trigger of [
    {trigger:'state',entity_id:'sensor.a',from:'off',not_from:'unknown'},
    {trigger:'numeric_state',entity_id:'sensor.a',above:20,below:10},
    {trigger:'time',at:'25:00'},
    {trigger:'webhook',webhook_id:'test',allowed_methods:['DELETE']},
    {trigger:'motion.detected',target:{area_id:'room'},options:{behavior:'never'}},
    {trigger:'power.changed',target:{entity_id:'sensor.a'},options:{threshold:{type:'above',value:{number:1,unit_of_measurement:'°C'}}}},
    {trigger:'not.a.real.trigger',target:{entity_id:'sensor.a'}},
  ])assert.throws(()=>toYaml({...examples.light,triggers:[trigger]}));
  for(const action of [{action:'light.turn_on',target:{unknown:'room'}},{delay:{seconds:'text'}},{sequence:'text'},{action:'light.turn_on',continue_on_error:'yes'}])assert.throws(()=>toYaml({...examples.light,actions:[action]}));
});
test('Jinja recognizes entities/filters/control structures without rewriting source',()=>{
  for(const source of ["{{ states('sensor.a') | float(0) | round(1) }}",'{% if enabled %}on{% else %}off{% endif %}','{% for item in items %}{{ item }}{% endfor %}']){
    const result=analyseJinja(source);assert.equal(result.source,source);assert.equal(result.recognized,true);assert.equal(result.malformed,false);
  }
  assert.deepEqual(analyseJinja("literal states('sensor.fake') {# states('sensor.comment') #} {{ states('sensor.real') | float }}").entities,['sensor.real']);
  assert.equal(analyseJinja('{{ "}}" }}').malformed,false);
  assert.equal(analyseJinja('{% if enabled %}unfinished').malformed,true);
  assert.equal(analyseJinja('{{ custom_function() }}').recognized,false);
  assert.deepEqual(analyseJinja(`{{ "states('sensor.fake') | fake_filter" }}`).entities,[]);
  assert.deepEqual(analyseJinja(`{{ "states('sensor.fake') | fake_filter" }}`).filters,[]);
  assert.deepEqual(analyseJinja(`{% raw %}{{ states('sensor.fake') | fake_filter }}{% endraw %}`).entities,[]);
  assert.throws(()=>analyseJinja('x'.repeat(10001)));
});
test('Jinja value and condition blocks export complete originals and compose single expressions',()=>{
  const source="{% if is_state('sensor.a', 'on') %}ON{% else %}OFF{% endif %}";
  const model={...examples.light,actions:[{variables:{result:source}}]};roundtrip(model);
  const ws=new Blockly.Workspace();try{
    modelWorkspace(ws,model);assert.equal(ws.getBlocksByType('ugso_jinja_value').length,1);
    const condition=ws.newBlock('ugso_jinja_condition');condition.setFieldValue("{{ is_state('sensor.a','on') }}",'TEXT');
    const root=ws.getBlocksByType('ugso_automation')[0];root.getInputTargetBlock('CONDITIONS')?.dispose();root.getInput('CONDITIONS').connection.connect(condition.outputConnection);
    assert.deepEqual(workspaceModel(ws,model).conditions,[{condition:'template',value_template:"{{ is_state('sensor.a','on') }}"}]);
  }finally{ws.dispose();}
});
