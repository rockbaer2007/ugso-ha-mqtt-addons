import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {Blockly,modelWorkspace,workspaceModel} from '../src/blocks.js';
import {examples,fromYaml,toYaml} from '../src/model.js';
import {parseExpression,parseTemplate,generateTemplate} from '../src/jinja-parser.js';
import {createJinjaBlock,composedJinja,jinjaBlockExpression} from '../src/jinja-blocks.js';

const supported=[
  "Wasser: {{ states('sensor.water') | float(0) | round(1) }} °C",
  "{{ state_attr('sensor.water', 'unit_of_measurement') }}",
  "{{ is_state_attr('sensor.water', 'ready', true) }}",
  "{{ 'ON' if is_state('sensor.water','on') else 'OFF' }}",
  "{% if temperature > 20 %}warm{% else %}kalt{% endif %}",
  "{% for item in items %}[{% if item > 1 %}{{ item + 2 }}{% else %}klein{% endif %}]{% else %}leer{% endfor %}",
  "{{ '}} %} \\' quoted' | replace('quoted', 'text') }}",
  "{{ not ready or temperature >= 30 and ready }}",
  "{{ -2 | abs + 2 * 3 }}",
  "{{ 2 + '3' ~ '4' | int }}",
  "{% if ready %}\n {{ now() | string }}\n{% endif %}\n",
  "{{ 'a\nb' }}",
];
const unsupported=[
  "{{ states.sensor.water.state }}", "{{ x[0] }}", "{{ x is defined }}", "{{ 0 < x < 10 }}",
  "{% set x = 1 %}{{ x }}", "{% if ready %}yes{% elif x %}x{% endif %}",
  "{{ x | custom_filter }}", "{{ custom() }}", "{{ [1,2] }}", "{{ {'a':1} }}",
  "{%- if ready -%}yes{% endif %}", "{{ x -}}", "{# comment #}{{ x }}",
  "{% for true in items %}{{ true }}{% endfor %}", "{{ x | round(precision=1) }}", "{{ 'unterminated }}",
  'a'.repeat(9700)+Array(50).fill('{{x}}').join(' '),
];

test('Supported Jinja decomposes into nested blocks and retains exact originals on project reload',()=>{
  for(const source of supported){const ws=new Blockly.Workspace(),copy=new Blockly.Workspace();try{
    const block=createJinjaBlock(ws,source);assert.equal(block.type,'ugso_jinja_composed_value',source);assert.equal(composedJinja(block),source);
    assert.ok(block.getDescendants().length>2);
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws),copy);
    assert.equal(composedJinja(copy.getTopBlocks(false)[0]),source,source);
  }finally{ws.dispose();copy.dispose();}}
});

test('Unsupported syntax stays entirely in original blocks, including mixed known/unknown parts',()=>{
  for(const source of [...unsupported,"{{ states('sensor.water') }} {{ x[0] }}"]){const ws=new Blockly.Workspace();try{
    for(const condition of [false,true]){const b=createJinjaBlock(ws,source,condition);assert.equal(b.type,condition?'ugso_jinja_condition':'ugso_jinja_value',source);assert.equal(b.getFieldValue('TEXT'),source);assert.equal(b.getDescendants().length,1);b.dispose();}
  }finally{ws.dispose();}}
});

test('Entity, filter and literal edits regenerate code; restoring fields restores the original',()=>{
  const ws=new Blockly.Workspace(),copy=new Blockly.Workspace(),source="{{states('sensor.water')|float(0)|round(1)}}";
  try{const b=createJinjaBlock(ws,source),entity=ws.getBlocksByType('ugso_jinja_entity')[0];entity.setFieldValue('sensor.air','ENTITY');
    assert.match(composedJinja(b),/states\("sensor.air"\)/);assert.notEqual(composedJinja(b),source);
    const round=ws.getBlocksByType('ugso_jinja_filter').find(x=>x.getFieldValue('FILTER')==='round');round.getInputTargetBlock('ARG0').setFieldValue('2','TEXT');
    assert.match(composedJinja(b),/round\(2\)/);
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws),copy);assert.equal(composedJinja(copy.getTopBlocks(false)[0]),composedJinja(b));
    entity.setFieldValue('sensor.water','ENTITY');round.getInputTargetBlock('ARG0').setFieldValue('1','TEXT');assert.equal(composedJinja(b),source);
  }finally{ws.dispose();copy.dispose();}
});

test('Structured conditions and values preserve YAML imports and edits through saved Blockly',()=>{
  const source=supported[0],condition=supported[4],model={...examples.light,conditions:[{condition:'template',value_template:condition}],actions:[{variables:{result:source}}]};
  const ws=new Blockly.Workspace(),copy=new Blockly.Workspace();try{
    modelWorkspace(ws,fromYaml(toYaml(model)));assert.deepEqual(workspaceModel(ws,model),model);
    assert.equal(ws.getBlocksByType('ugso_jinja_composed_condition').length,1);assert.equal(ws.getBlocksByType('ugso_jinja_composed_value').length,1);
    ws.getBlocksByType('ugso_jinja_entity')[0].setFieldValue('sensor.air','ENTITY');const edited=workspaceModel(ws,model);
    assert.match(edited.actions[0].variables.result,/sensor.air/);
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws),copy);assert.deepEqual(workspaceModel(copy,model),edited);
    modelWorkspace(copy,fromYaml(toYaml(edited)));assert.deepEqual(workspaceModel(copy,model),edited);
  }finally{ws.dispose();copy.dispose();}
});

test('Incomplete structures, invalid literals and conflicting original metadata reject generation',()=>{
  const ws=new Blockly.Workspace();try{
    const b=createJinjaBlock(ws,"{{ states('sensor.water') | float(0) }}"),filter=ws.getBlocksByType('ugso_jinja_filter')[0];
    filter.getInputTargetBlock('ARG0').setFieldValue('evil()','TEXT');assert.throws(()=>composedJinja(b));
    filter.getInputTargetBlock('ARG0').dispose();assert.throws(()=>composedJinja(b),/fehlt/);
    assert.throws(()=>b.loadExtraState({original:'{{ 1 }}',generated:'{{ 2 }}'}),/passen/);
    assert.throws(()=>composedJinja(ws.newBlock('ugso_jinja_composed_value')),/fehlt/);
    assert.throws(()=>jinjaBlockExpression(createJinjaBlock(ws,'Text {{ x }}')),/einzelner/);
  }finally{ws.dispose();}
});

test('Parser bounds reject oversized, deep, empty and incomplete input without execution',()=>{
  for(const source of ['x'.repeat(10001),'{{ '+ '('.repeat(20)+'1'+')'.repeat(20)+' }}','{{ }}','{% if x %}x','{{ (1 +) }}'])assert.throws(()=>parseTemplate(source));
  assert.throws(()=>parseExpression('1 '.repeat(400)));
});

test('Changed entity functions and zero/three-argument filters retain their sockets on reload',()=>{
  const ws=new Blockly.Workspace(),copy=new Blockly.Workspace();try{
    const root=createJinjaBlock(ws,"{{ states('sensor.water') }}"),entity=ws.getBlocksByType('ugso_jinja_entity')[0];
    entity.setFieldValue('is_state_attr','FUNCTION');
    for(const [i,text]of ["'ready'",'true'].entries()){const b=ws.newBlock('ugso_jinja_literal');b.setFieldValue(text,'TEXT');entity.getInput(`ARG${i}`).connection.connect(b.outputConnection);}
    assert.match(composedJinja(root),/is_state_attr\("sensor.water", 'ready', true\)/);
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws),copy);assert.equal(composedJinja(copy.getTopBlocks(false)[0]),composedJinja(root));
    ws.clear();copy.clear();const filtered=createJinjaBlock(ws,"{{ 'aaaa' | replace('a', 'b', 2) | upper }}");
    assert.equal(ws.getBlocksByType('ugso_jinja_filter').find(b=>b.getFieldValue('FILTER')==='replace').getFieldValue('COUNT'),3);
    assert.equal(ws.getBlocksByType('ugso_jinja_filter').find(b=>b.getFieldValue('FILTER')==='upper').getInput('ARG0'),null);
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws),copy);assert.equal(composedJinja(copy.getTopBlocks(false)[0]),composedJinja(filtered));
  }finally{ws.dispose();copy.dispose();}
});

test('Generated supported templates render like originals in the Jinja sandbox', {skip:!process.env.BLOCKS_JINJA_TEST},()=>{
  const cases=[];
  for(const original of [...supported,"{{ 'a' ~ 'b' | upper }}","{{ -2 * 3 | abs }}","{{ 3 // 2 + 5 % 2 }}","{{ 1 if ready else 2 if other else 3 }}"]){
    const generated=generateTemplate(parseTemplate(original));
    for(const ready of [true,false])for(const items of [[1,2,3],[]])cases.push({original,generated,context:{ready,items,other:false,temperature:22}});
  }
  const result=spawnSync('python',['-c',`
import sys,json,datetime
from jinja2 import StrictUndefined
from jinja2.sandbox import ImmutableSandboxedEnvironment
e=ImmutableSandboxedEnvironment(undefined=StrictUndefined)
e.globals.update(states=lambda entity:'20.56',state_attr=lambda entity,attr:'C',is_state=lambda entity,state:state=='on',is_state_attr=lambda entity,attr,value:value,now=lambda:datetime.datetime(2026,10,10,12))
for c in json.load(sys.stdin):
 def render(source):
  try: return ('ok',e.from_string(source).render(**c['context']))
  except (TypeError,ValueError,ZeroDivisionError) as error: return ('error',type(error).__name__)
 a=render(c['original'])
 b=render(c['generated'])
 assert a==b,(c,a,b)
`],{input:JSON.stringify(cases),encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}});
  assert.equal(result.status,0,result.stderr);
});
