import test from 'node:test';import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {statefulStep,statefulTemplate} from '../web/stateful.js';
import {readFileSync} from 'node:fs';
import {adapt,createBlock} from '../web/catalog.js';import {emptyPlan,compile,scan} from '../web/core.js';
const defs=new Map(adapt(JSON.parse(readFileSync(new URL('../web/reference-blocks.json',import.meta.url)))).map(d=>[d.type,d]));

test('all 11 stateful blocks match generated Jinja over edges, delays, reset/load and restart',()=>{
 const requests=[],expected=[];
 for(const type of ['RS','SR','R_TRIG','F_TRIG','TON','TOF','TP','BLINK','CTU','CTD','CTUD']){
  let state={};
  for(let i=0;i<16;i++){
   const input={S:i%3===1,R1:i===7,S1:i%3===1,R:i===7,CLK:i%2===1,IN:i>1&&i<8||i>10,EN:i<10,PT:1500,TH:1000,TL:2000,CU:i%2===1,CD:i%3===1,LD:i===11,PV:3};
   const previous=structuredClone(state),now=i*750,boot=i===5,result=statefulStep(type,input,state,now,boot);state=JSON.parse(JSON.stringify(result.state));
   requests.push({template:statefulTemplate(type,Object.fromEntries(Object.entries(input).map(([k,v])=>[k,JSON.stringify(v)])),'mem0'),previous,now,boot});expected.push({type,i,outputs:result.outputs});
  }
 }
 const p=spawnSync('python',[new URL('./render_state.py',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')],{input:JSON.stringify(requests),encoding:'utf8'});
 assert.equal(p.status,0,p.stderr);const actual=JSON.parse(p.stdout);actual.forEach((r,i)=>assert.deepEqual(r.outputs,expected[i].outputs,expected[i].type+' step '+expected[i].i));
});

test('counter and latch survive serialized restart; edge seed and timer deadline are explicit',()=>{
 let r=statefulStep('CTU',{CU:false,R:false,PV:2},{},0);r=statefulStep('CTU',{CU:true,R:false,PV:2},r.state,1);assert.equal(r.outputs.CV,1);
 r=statefulStep('CTU',{CU:true,R:false,PV:2},JSON.parse(JSON.stringify(r.state)),5000,true);assert.equal(r.outputs.CV,1);
 assert.equal(statefulStep('RS',{S:true,R1:true},{},0).outputs.Q1,false);assert.equal(statefulStep('SR',{S1:true,R:true},{},0).outputs.Q1,true);
 let timer=statefulStep('TON',{IN:true,PT:2000},{},1000);assert.equal(timer.outputs.Q,false);timer=statefulStep('TON',{IN:true,PT:2000},JSON.parse(JSON.stringify(timer.state)),4000,true);assert.equal(timer.outputs.Q,true);
 assert.throws(()=>statefulStep('CTU',{CU:true,R:false,PV:1},{version:1,kind:'TON'},1));assert.throws(()=>statefulStep('BLINK',{EN:true,TH:0,TL:1},{},1));
});

test('multi-output counter pins, memory host and native package exports work',async()=>{
 const p=emptyPlan(),counter=createBlock(defs.get('CTU')),input=createBlock(defs.get('STATE_IN')),out=createBlock(defs.get('STATE_OUT'));input.params.oid='input_boolean.test';input.params.demo=false;out.params.oid='input_number.test';out.params.mode='NUMBER';p.blocks=[input,counter,out];p.links=[{from:[input.id,'Q'],to:[counter.id,'CU']},{from:[counter.id,'CV'],to:[out.id,'IN']}];
 let r=scan(p,defs,{now:0});input.params.demo=true;r=scan(p,defs,{memory:r.memory,now:1});assert.equal(r.values.get(out.id),1);
 p.target='javascript';const module=await import('data:text/javascript;base64,'+Buffer.from(compile(p,defs)).toString('base64'));let stored={},commands=[];
 const host={readState:async()=>'off',readAttribute:async(_,a)=>a==='min'?0:100,callAction:async(...a)=>commands.push(a),loadMemory:async id=>stored[id],saveMemory:async(id,v)=>{stored[id]=JSON.parse(JSON.stringify(v));}};
 await module.run({...host,now:0});await module.run({...host,readState:async()=>'on',now:1});assert.equal(commands.at(-1)[0],'input_number.set_value');assert.equal(commands.at(-1)[1].value,1);
 p.target='automation';p.exportOptions={format:'package'};const text=compile(p,defs);assert.match(text,/input_text:/);assert.match(text,/logic_tick/);assert.match(text,/mode: "queued"/);assert.match(text,/v1:/);assert.doesNotMatch(text,/initial:/);
});
