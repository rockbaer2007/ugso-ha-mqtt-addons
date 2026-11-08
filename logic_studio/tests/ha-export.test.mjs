import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adapt,createBlock} from '../web/catalog.js';
import {compile,loadPlan,emptyPlan} from '../web/core.js';
import {haConfig,exportOptions} from '../web/ha-export.js';
const defs=new Map(adapt(JSON.parse(readFileSync(new URL('../web/reference-blocks.json',import.meta.url)))).map(d=>[d.type,d]));
function sample(){const p=emptyPlan(),input=createBlock(defs.get('STATE_IN')),out=createBlock(defs.get('STATE_OUT'));input.params.oid='input_boolean.logic_test_in';out.params.oid='input_boolean.logic_test_out';p.blocks=[input,out];p.links=[{from:[input.id,'Q'],to:[out.id,'IN']}];return p;}

test('HA editor and file shapes, script key, trace id and bounded execution options',()=>{
 const p=sample();p.name='Licht Küche';p.exportOptions={mode:'queued',max:3,format:'file',objectId:'licht_kueche',description:'Test',onStart:true};
 const graph={reads:[{entity:p.blocks[0].params.oid,type:'BOOL',raw:'raw0'}],steps:[],outs:[{entity:p.blocks[1].params.oid,value:'v0',label:'Licht'}]};
 const automation=haConfig(p,graph);assert.equal(automation[0].id,'logic_licht_kueche');assert.equal(automation[0].triggers[1].event,'start');assert.equal(automation[0].max,3);
 p.target='script';const script=haConfig(p,graph);assert.ok(script.licht_kueche.sequence);assert.equal(script.licht_kueche.triggers,undefined);
 p.exportOptions.format='editor';assert.ok(haConfig(p,graph).sequence);assert.deepEqual(loadPlan(p,defs).exportOptions,exportOptions(p));
 assert.throws(()=>exportOptions({...p,exportOptions:{mode:'invalid'}}));assert.throws(()=>exportOptions({...p,exportOptions:{max:101}}));assert.throws(()=>exportOptions({...p,exportOptions:{objectId:'bad: id'}}));
});

test('all inputs and math guards precede any output; duplicate targets rejected',()=>{
 const p=sample();p.blocks[0].params.type='REAL';const div=createBlock(defs.get('DIV')),gt=createBlock(defs.get('GT'));p.blocks.splice(1,0,div,gt);p.links=[{from:[p.blocks[0].id,'Q'],to:[div.id,'IN1']},{from:[div.id,'OUT'],to:[gt.id,'IN1']},{from:[gt.id,'OUT'],to:[p.blocks[3].id,'IN']}];
 const result=compile(p,defs);assert.ok(result.indexOf('Eingang prüfen')<result.indexOf('Division durch null'));assert.ok(result.indexOf('Division durch null')<result.indexOf('input_boolean.turn_on'));assert.match(result,/is not boolean and is_number/);assert.match(result,/Zahlenergebnis prüfen/);assert.match(result,/Logikergebnis prüfen/);assert.match(result,/nur bei Abweichung/);
 p.blocks.push({...p.blocks[3],id:'bduplicate'});assert.throws(()=>compile(p,defs),/Mehrere Ausgänge/);
});
