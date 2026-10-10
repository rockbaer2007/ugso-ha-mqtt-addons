import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { Blockly, modelWorkspace, workspaceModel } from '../src/blocks.js';
import { functionToolbox } from '../src/functions.js';
import { examples, toYaml, fromYaml } from '../src/model.js';
globalThis.document=Blockly.utils.xml.createElement('div').ownerDocument;
globalThis.HTMLElement=document.defaultView.HTMLElement;
function base(){const ws=new Blockly.Workspace();modelWorkspace(ws,{...examples.light,actions:[]});return ws;}
function def(ws,name,params,type='procedures_defnoreturn'){const b=ws.newBlock(type);b.setFieldValue(name,'NAME');b.loadExtraState({params:params.map(name=>({name})),...(type==='procedures_defreturn'?{hasStatements:false}:{})});return b;}
function value(ws,parent,input,type,fields={}){const b=ws.newBlock(type);for(const [k,v] of Object.entries(fields))b.setFieldValue(v,k);parent.getInput(input).connection.connect(b.outputConnection);return b;}
function param(ws,parent,input,name){return value(ws,parent,input,'variables_get',{VAR:ws.getVariableMap().getVariable(name).getId()});}
function call(ws,name){return Blockly.serialization.blocks.append(functionToolbox(ws).find(b=>b.type==='procedures_callnoreturn'&&b.extraState.name===name),ws);}
function connect(parent,input,child){parent.getInput(input).connection.connect(child.previousConnection);}
function fixture(){
  const ws=base(),inner=def(ws,'inner',['x']),outer=def(ws,'outer',['x']);
  const log=ws.newBlock('ugso_log_action');param(ws,log,'MESSAGE','x');connect(inner,'STACK',log);
  const nested=call(ws,'inner');param(ws,nested,'ARG0','x');connect(outer,'STACK',nested);
  const first=call(ws,'outer');value(ws,first,'ARG0','ugso_text',{TEXT:'first'});
  const second=call(ws,'outer');value(ws,second,'ARG0','ugso_text',{TEXT:'second'});first.nextConnection.connect(second.previousConnection);
  connect(ws.getBlocksByType('ugso_automation')[0],'ACTIONS',first);
  return ws;
}
test('Action functions isolate repeated and nested parameters and survive project/YAML reload',()=>{
  const ws=fixture(),copy=new Blockly.Workspace();
  try{
    const meta={...examples.light,variables:{x:'untouched',ugso_fn_1_x:'also untouched'}};
    const model=workspaceModel(ws,meta);
    const first=model.actions[0].sequence,second=model.actions[1].sequence;
    assert.deepEqual(first[0].variables,{ugso_fn_2_x:'first'});
    assert.deepEqual(first[1].sequence[0].variables,{ugso_fn_3_x:'{{ ugso_fn_2_x }}'});
    assert.equal(first[1].sequence[1].data.message,'{{ ugso_fn_3_x }}');
    assert.deepEqual(second[0].variables,{ugso_fn_4_x:'second'});
    assert.equal(model.variables.x,'untouched');
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws),copy);
    assert.deepEqual(workspaceModel(copy,meta),model);
    modelWorkspace(copy,fromYaml(toYaml(model)));assert.deepEqual(workspaceModel(copy,meta),model);
  }finally{ws.dispose();copy.dispose();}
});
test('Action functions reject missing arguments, empty bodies, duplicate names and recursion',()=>{
  const ws=base();
  try{
    const a=def(ws,'task',['x']);assert.throws(()=>workspaceModel(ws,examples.light),/Aktionsablauf/);
    const log=ws.newBlock('ugso_log_action');param(ws,log,'MESSAGE','x');connect(a,'STACK',log);
    const c=call(ws,'task');connect(ws.getBlocksByType('ugso_automation')[0],'ACTIONS',c);
    assert.throws(()=>workspaceModel(ws,examples.light),/ARG0/);
    value(ws,c,'ARG0','ugso_text',{TEXT:'ok'});assert.doesNotThrow(()=>workspaceModel(ws,examples.light));
    const duplicate=def(ws,'task',[],'procedures_defreturn');value(ws,duplicate,'RETURN','ugso_number',{NUM:1});
    duplicate.getField('NAME').setValidator(null);duplicate.setFieldValue('task','NAME');
    assert.throws(()=>workspaceModel(ws,examples.light),/Namen müssen eindeutig/);duplicate.dispose();
    log.dispose();const self=call(ws,'task');param(ws,self,'ARG0','x');connect(a,'STACK',self);
    assert.throws(()=>workspaceModel(ws,examples.light),/Rekursion/);
  }finally{ws.dispose();}
});
test('Conditional return block connects directly to HA conditions and requires both branches',()=>{
  const ws=base();
  try{
    const root=ws.getBlocksByType('ugso_automation')[0],condition=value(ws,root,'CONDITIONS','ugso_function_result');
    value(ws,condition,'TEST','ugso_boolean',{BOOL:'false'});value(ws,condition,'TRUE','ugso_boolean',{BOOL:'true'});
    assert.throws(()=>workspaceModel(ws,examples.light),/Wert oder Bedingung fehlt/);
    value(ws,condition,'FALSE','ugso_boolean',{BOOL:'false'});
    assert.deepEqual(workspaceModel(ws,examples.light).conditions,[{condition:'template',value_template:'{{ (true if false else false) }}'}]);
  }finally{ws.dispose();}
});
test('Conditional function results generate lazy Jinja branches with parameter bindings',()=>{
  const ws=base(),copy=new Blockly.Workspace();
  try{
    const d=def(ws,'choose_value',['x'],'procedures_defreturn');
    const result=value(ws,d,'RETURN','ugso_function_result');
    value(ws,result,'TEST','ugso_boolean',{BOOL:'true'});param(ws,result,'TRUE','x');
    const bad=value(ws,result,'FALSE','ugso_math_arithmetic');value(ws,bad,'A','ugso_number',{NUM:1});value(ws,bad,'B','ugso_number',{NUM:0});bad.setFieldValue('/','OP');
    const write=ws.newBlock('ugso_variable_set');connect(ws.getBlocksByType('ugso_automation')[0],'ACTIONS',write);
    const c=value(ws,write,'VALUE','procedures_callreturn');c.loadExtraState({name:'choose_value',params:['x']});value(ws,c,'ARG0','ugso_number',{NUM:42});
    const model=workspaceModel(ws,examples.light),template=Object.values(model.actions[0].variables)[0];
    assert.match(template,/if true else/);
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws),copy);assert.deepEqual(workspaceModel(copy,examples.light),model);
    if(process.env.BLOCKS_JINJA_TEST){const executed=spawnSync('python',['-c','import sys; from jinja2.sandbox import ImmutableSandboxedEnvironment; print(ImmutableSandboxedEnvironment().from_string(sys.stdin.read()).render())'],{input:template,encoding:'utf8'});assert.equal(executed.status,0,executed.stderr);assert.equal(executed.stdout.trim(),'42');}
  }finally{ws.dispose();copy.dispose();}
});
