import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adapt, createBlock, pins} from '../web/catalog.js';
import {emptyPlan, loadPlan, compile} from '../web/core.js';
import {connectionCandidate} from '../web/connections.js';
import {handleId, endpoint, connectionEndpoints, graphEdges, boundedPosition} from '../web/flow-model.js';
const defs = new Map(adapt(JSON.parse(readFileSync(new URL('../web/reference-blocks.json', import.meta.url)))).map(d => [d.type,d]));

test('React Flow handles preserve all catalog pins, including native branches and escaped names', () => {
  for (const d of defs.values()) {
    const b = createBlock(d);
    for (const side of ['inputs','outputs']) for (const pin of pins(d,b,side)) {
      assert.deepEqual(endpoint(b.id,handleId(side,pin.id)),{block:b.id,side,pin:pin.id});
    }
  }
  assert.equal(endpoint('node',handleId('inputs','a/b:c')).pin,'a/b:c');
  for (const invalid of [undefined,'IN','foo/Q','inputs/']) assert.throws(()=>endpoint('node',invalid));
});

test('React Flow graph mapping keeps legacy projects and generated exports unchanged', () => {
  const plan = emptyPlan(), a=createBlock(defs.get('STATE_IN')), b=createBlock(defs.get('STATE_OUT'));
  a.params.oid='input_boolean.demo_in'; b.params.oid='input_boolean.demo_out';
  plan.blocks=[a,b]; plan.links=[{from:[a.id,'Q'],to:[b.id,'IN']}];
  const original=JSON.stringify(plan), before=compile(plan,defs), edges=graphEdges(plan.links);
  const e=edges[0];
  const [out,input]=connectionEndpoints(e);
  assert.deepEqual(connectionCandidate({...plan,links:[]},defs,out,input),plan.links[0]);
  assert.deepEqual(connectionCandidate({...plan,links:[]},defs,input,out),plan.links[0]);
  assert.throws(()=>connectionCandidate(plan,defs,out,input),/nur eine|doppelt/i);
  assert.equal(JSON.stringify(plan),original);
  assert.equal(compile(loadPlan(JSON.parse(original),defs),defs),before);
});

test('React Flow positions cannot corrupt saved coordinates', () => {
  assert.deepEqual(boundedPosition({x:-50,y:100000}),{x:10,y:60000});
  assert.deepEqual(boundedPosition({x:24.5,y:88}),{x:24.5,y:88});
  assert.throws(()=>boundedPosition({x:NaN,y:1}));
});
