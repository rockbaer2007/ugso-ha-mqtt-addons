import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {adapt,createBlock} from '../web/catalog.js';import {emptyPlan,compile} from '../web/core.js';import {entityParameters} from '../web/entity-values.js';
const defs=new Map(adapt(JSON.parse(readFileSync(new URL('../web/reference-blocks.json',import.meta.url)))).map(d=>[d.type,d]));
test('attribute selection retains typed values and output modes',()=>{
 const e={entity_id:'light.test',state:'on',attributes:{brightness:128},selected_attribute:'brightness'};
 assert.equal(entityParameters({},e,'STATE_IN').demo,128);
 assert.equal(entityParameters({},e,'STATE_IN').attribute,'brightness');
 assert.equal(entityParameters({}, {...e,output_mode:'BRIGHTNESS'},'STATE_OUT').IN,0);
});
test('number, text and brightness exports validate limits before calling HA',async()=>{
 for(const [mode,entity,value,action] of [['NUMBER','input_number.test',42,'input_number.set_value'],['TEXT','input_text.test','001','input_text.set_value'],['BRIGHTNESS','light.test',75,'light.turn_on'],['BRIGHTNESS','light.test',0,'light.turn_off']]){
  const p=emptyPlan();p.target='javascript';const c=createBlock(defs.get('CONST')),o=createBlock(defs.get('STATE_OUT'));c.params.type=mode==='TEXT'?'STRING':'REAL';c.params.value=value;o.params.mode=mode;o.params.oid=entity;p.blocks=[c,o];p.links=[{from:[c.id,'Q'],to:[o.id,'IN']}];
  const m=await import('data:text/javascript;base64,'+Buffer.from(compile(p,defs)).toString('base64')),calls=[];
  await m.run({readState:async()=>0,readAttribute:async(_,a)=>a==='min'?0:100,callAction:async(...a)=>calls.push(a)});
  assert.equal(calls[0][0],action);if(mode==='TEXT')assert.equal(calls[0][1].value,'001');
  if(mode==='NUMBER'){calls.length=0;await assert.rejects(m.run({readState:async()=>0,readAttribute:async()=>1,callAction:async()=>calls.push(1)}));assert.equal(calls.length,0);}
 }
});
