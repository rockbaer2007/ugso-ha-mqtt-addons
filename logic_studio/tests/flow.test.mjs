import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {importFlow,exportFlow,newFlow,validateFlow} from '../web/flow.js';
import {adapt,createBlock} from '../web/catalog.js';
import {compile,loadPlan} from '../web/core.js';
const defs=new Map(adapt(JSON.parse(readFileSync(new URL('../web/reference-blocks.json',import.meta.url)))).map(d=>[d.type,d]));
const tag=value=>({$haTag:'input',value});
const roundtrip=(config,kind)=>{const p=loadPlan(importFlow(config,kind),defs);assert.deepEqual(exportFlow(p),config);const code=compile(p,defs);const parsed=spawnSync('python',['-c','import sys,json;from ha_import import parse_documents;print(json.dumps(parse_documents(sys.stdin.read())[0]["config"]))'],{input:code,encoding:'utf8'});assert.equal(parsed.status,0,parsed.stderr);assert.deepEqual(JSON.parse(parsed.stdout),config);return p;};
test('native automation preserves nested conditions, choose, parallel, repeats, unknown actions and legacy keys',()=>{
 roundtrip({id:'demo',alias:'Nested',trigger:{platform:'state',entity_id:'input_boolean.demo'},condition:[],action:[{if:[{condition:'and',conditions:[{condition:'state',entity_id:'input_boolean.demo',state:'on'}]}],then:[{choose:[{conditions:[{condition:'template',value_template:'{{ true }}'}],sequence:[{repeat:{for_each:[1,2],sequence:[{action:'logbook.log',data:{name:'Demo',message:'{{ repeat.item }}'}}]}}]}],default:[{delay:1}]}],else:[{parallel:[{sequence:[{event:'test_event'}]},{delay:{seconds:1}}]}]},{wait_for_trigger:[{platform:'event',event_type:'test'}],timeout:10},{unrecognized:{keep:['x',null,true]} }],mode:'single'},'automation');
});
test('script fields and scalar data retain types and the full source structure',()=>roundtrip({alias:'Text',fields:{value:{name:'Value',selector:{text:{}}}},sequence:[{variables:{v:'001',on:'on',off:'off',date:'2026-11-08'}},{stop:'Done',response_variable:'v'}],mode:'queued'},'script'));
test('blueprint selectors, sections, defaults and !input references round-trip',()=>{
 const config={blueprint:{name:'BP',domain:'automation',input:{settings:{name:'Settings',input:{entity:{selector:{entity:{domain:'input_boolean'}},default:'input_boolean.demo'},enabled:{selector:{boolean:{}},default:true}}}}},triggers:[{trigger:'state',entity_id:tag('entity')}],conditions:[{condition:'template',value_template:tag('enabled')}],actions:[{action:'input_boolean.turn_on',target:{entity_id:tag('entity')}}]};const p=roundtrip(config,'blueprint');assert.ok(p.links.some(l=>l.to[1]==='REF_entity'));p.links=p.links.filter(l=>l.to[1]!=='REF_entity');assert.throws(()=>exportFlow(p),/Parameterverbindung fehlt/);
});
test('graph edit changes actual native output; unconnected blocks, mismatched target and invalid connections block export',()=>{
 const p=newFlow('script'),root=p.blocks[0],a=createBlock(defs.get('DELAY'));p.blocks.push(a);assert.throws(()=>exportFlow(p),/Nicht verbunden/);p.links.push({from:[root.id,'SEQUENCE'],to:[a.id,'DO']});assert.deepEqual(exportFlow(p).sequence,[{delay:{seconds:1}}]);a.params.config='{"delay":2}';assert.deepEqual(exportFlow(p).sequence,[{delay:2}]);p.target='automation';assert.throws(()=>exportFlow(p),/Ausgabe muss/);p.target='script';p.links.push({from:[a.id,'BAD'],to:[root.id,'DO']});assert.throws(()=>validateFlow(p),/anschluss/i);
});
test('unsafe keys, malformed slots and JS export are rejected',()=>{
 assert.throws(()=>importFlow(JSON.parse('{"constructor":{}}')),/Unzulässiger/);const p=newFlow();p.blocks[0].params.slots='{"A":"__proto__.x"}';assert.throws(()=>exportFlow(p),/Zweigpfad/);p.blocks[0].params.slots='{}';p.target='javascript';assert.throws(()=>exportFlow(p),/JavaScript/);
});
test('new blueprint and script expose input branches without inventing empty source fields',()=>{
 const bp=newFlow('blueprint'),r=bp.blocks[0],input=createBlock(defs.get('BP_INPUT_TEXT'));input.params.key='name';bp.blocks.push(input);bp.links.push({from:[r.id,'PARAMETERS'],to:[input.id,'DO']});assert.ok(exportFlow(bp).blueprint.input.name);
 const script=newFlow('script');assert.ok(!Object.hasOwn(exportFlow(script),'fields'));const field=createBlock(defs.get('SCRIPT_INPUT'));script.blocks.push(field);script.links.push({from:[script.blocks[0].id,'FIELDS'],to:[field.id,'DO']});assert.ok(exportFlow(script).fields.eingabe);
 const raw={blueprint:{name:'Empty',domain:'automation'},triggers:[],actions:[]};assert.deepEqual(exportFlow(importFlow(raw,'blueprint')),raw);
});
test('imported project metadata cannot traverse object prototypes',()=>{
 const p=newFlow('blueprint');p.blocks[0].params.inputPaths='["__proto__.toString"]';assert.throws(()=>exportFlow(p),/Konfigurationspfad/);assert.equal(typeof Object.prototype.toString,'function');
});
