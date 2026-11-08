import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adapt,createBlock} from '../web/catalog.js';
import {emptyPlan} from '../web/core.js';
import {connectionCandidate,pinPoint} from '../web/connections.js';
const defs=new Map(adapt(JSON.parse(readFileSync(new URL('../web/reference-blocks.json',import.meta.url)))).map(d=>[d.type,d]));
const port=(b,pin,side)=>({block:b.id,pin,side});
test('wire endpoints stay on the colored pin centers at every editor zoom',()=>{
 for(const zoom of [.5,1,1.5]){
  const canvas={getBoundingClientRect:()=>({left:100,top:200})};
  for(const side of ['inputs','outputs']){
   const node={dataset:{side},getBoundingClientRect:()=>({left:100+40*zoom,right:100+75*zoom,top:200+60*zoom})};
   assert.deepEqual(pinPoint(node,canvas,zoom),{x:side==='inputs'?29:86,y:69});
  }
 }
});
test('BOOL connects only to BOOL; numbers and text cannot feed logic',()=>{
 const p=emptyPlan(),input=createBlock(defs.get('STATE_IN')),gate=createBlock(defs.get('AND'));p.blocks=[input,gate];
 const from=port(input,'Q','outputs'),to=port(gate,'IN1','inputs');
 const link=connectionCandidate(p,defs,from,to);assert.deepEqual(link,connectionCandidate(p,defs,to,from));
 for(const type of ['REAL','INT','STRING']){input.params.type=type;assert.throws(()=>connectionCandidate(p,defs,from,to),/passt nicht/);}
 input.params.type='BOOL';p.links.push(link);assert.throws(()=>connectionCandidate(p,defs,from,to),/nur eine/);
});
test('numeric widening, pin direction, missing ports and cycles are checked without mutating plan',()=>{
 const p=emptyPlan(),input=createBlock(defs.get('STATE_IN')),add=createBlock(defs.get('ADD')),sub=createBlock(defs.get('SUB'));input.params.type='INT';p.blocks=[input,add,sub];
 assert.doesNotThrow(()=>connectionCandidate(p,defs,port(input,'Q','outputs'),port(add,'IN1','inputs')));
 assert.throws(()=>connectionCandidate(p,defs,port(input,'Q','outputs'),port(add,'OUT','outputs')),/Ausgang/);
 assert.throws(()=>connectionCandidate(p,defs,port(input,'bad','outputs'),port(add,'IN1','inputs')),/Anschluss/);
 assert.throws(()=>connectionCandidate(p,defs,port(add,'OUT','outputs'),port(add,'IN1','inputs')),/selben/);
 p.links=[{from:[add.id,'OUT'],to:[sub.id,'IN1']}];const before=JSON.stringify(p);
 assert.throws(()=>connectionCandidate(p,defs,port(sub,'OUT','outputs'),port(add,'IN1','inputs')),/Rückkopplung/);assert.equal(JSON.stringify(p),before);
});
