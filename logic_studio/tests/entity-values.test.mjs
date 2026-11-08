import test from 'node:test';
import assert from 'node:assert/strict';
import {entityParameters} from '../web/entity-values.js';
test('entity selection preserves unavailable values and unrelated parameters',()=>{
 const p={demo:true,oid:'switch.old',extra:'keep'};
 const unknown=entityParameters(p,{entity_id:'binary_sensor.test',signal_type:'BOOL',state:'unavailable'},'STATE_IN');
 assert.equal(unknown.demo,'unavailable');assert.equal(unknown.extra,'keep');assert.equal(p.oid,'switch.old');
 assert.equal(entityParameters(p,{entity_id:'switch.test',signal_type:'BOOL',state:'off'},'STATE_IN').demo,false);
 assert.equal(entityParameters(p,{entity_id:'sensor.test',signal_type:'REAL',state:'21.5'},'STATE_IN').demo,21.5);
 assert.deepEqual(entityParameters(p,{entity_id:'light.test',signal_type:'BOOL',state:'on'},'STATE_OUT'),{...p,oid:'light.test',mode:'BOOL'});
});
