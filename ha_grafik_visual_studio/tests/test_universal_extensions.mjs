import test from 'node:test';
import assert from 'node:assert/strict';
import {universalNext} from '../web/universal-element.js';
import {linearGradient} from '../web/svg-gradient.js';
import {embeddedViewUrl,universalUrl,colorOutput,colorInput,universalBindings} from '../web/universal-runtime.js';
import {interactiveGroups,interactiveText,interactiveVocabulary} from '../web/interactive-locales.js';
test('legacy cycles, fixed values and bounded arithmetic are separate and retain source data',()=>{
  const states=[{value:0},{value:1},{value:2}],legacy={interaction:'button',trueValue:10},snapshot=JSON.stringify(legacy);
  assert.equal(universalNext(legacy,1,1,states),2);assert.equal(JSON.stringify(legacy),snapshot);
  assert.equal(universalNext({...legacy,buttonBehavior:'fixed'},1,1,states),10);
  assert.equal(universalNext({interaction:'adjust',valueDelta:.2,adjustMax:1},.9,0,[]),1);
  assert.equal(universalNext({interaction:'adjust',valueDelta:-.2,adjustMin:0},.1,0,[]),0);
  for(const actual of ['unknown','unavailable','',null])assert.equal(universalNext({interaction:'adjust'},actual,0,[]),null);
});
test('gradient tokenizer keeps color functions and interpolates unpositioned stops',()=>{
  const parsed=linearGradient('linear-gradient(90deg, rgba(1, 2, 3, .5) 10%, red, blue, #fff 100%)');
  assert.equal(parsed.angle,90);assert.equal(parsed.stops[0].color,'rgba(1, 2, 3, .5)');
  assert.deepEqual(parsed.stops.map(s=>Number(s.position.toFixed(1))),[.1,.4,.7,1]);
  assert.equal(linearGradient('linear-gradient(to top, red,blue)').angle,0);
  for(const value of ['red','linear-gradient(red)','linear-gradient(url(a),red)','linear-gradient(red, rgb(1,2)'])assert.equal(linearGradient(value),null);
});
test('embedded page chains and HTTP URLs reject recursion and non-HTTP schemes',()=>{
  for(const value of ['javascript:alert(1)','data:text/html,test','https://user:pass@example.org'])assert.equal(universalUrl(value,'https://studio.local/'),null);
  assert.equal(universalUrl('/test','https://studio.local/editor'),'https://studio.local/test');
  assert.equal(embeddedViewUrl('https://studio.local/','p','a','a'),null);
  assert.equal(embeddedViewUrl('https://studio.local/','p','a','b',['a']),null);
  const url=new URL(embeddedViewUrl('https://studio.local/?tabsWidget=x','project','child','parent'));
  assert.equal(url.searchParams.get('chain'),'parent');assert.equal(url.searchParams.get('tabsWidget'),null);assert.equal(url.searchParams.get('page'),'child');
});
test('color formats and nested bindings map deterministic HA values',()=>{
  assert.equal(colorOutput('#ff0000','rgb'),'[255,0,0]');assert.equal(colorOutput('#ff0000','hex8',.5),'#ff000080');
  assert.equal(colorOutput('#ff0000','hsl'),'[0,100,50]');assert.equal(colorOutput('#ff0000','hsv'),'[0,100,100]');
  assert.deepEqual(JSON.parse(colorOutput('#000000','cie')),[0,0]);
  for(const format of ['hex','hex8','rgb','hsv','hsl'])for(const color of ['#ff0000','#00ff00','#0000ff','#000000','#ffffff'])assert.equal(colorInput(colorOutput(color,format),format),color);
  assert.equal(colorInput('[0,0]','cie'),'#000000');assert.equal(colorInput('not JSON','rgb'),null);
  assert.deepEqual(universalBindings({entityId:'input_text.a',defaultState:{colorEntityId:'light.a'},visualStates:[{colorEntityId:'light.a'},{compareSource:'entity',entityId:'sensor.a'}]}),['input_text.a','light.a','sensor.a']);
});
test('translations are complete for new vocabulary and retain group IDs',()=>{
  for(const [de,translations]of interactiveVocabulary)for(const locale of ['en','fr'])assert.ok(translations[locale],`${de}:${locale}`);
  const group={label:'Allgemein',fields:[{label:'Haltewert',key:'holdValue'}]},key=(g,i)=>`${i}-${g.label}`;
  for(const locale of ['de','en','fr']){const result=interactiveGroups([group],{interactiveLocale:locale},key,'de');assert.equal(result[0].id,'0-Allgemein');assert.equal(result[0].fields[0].key,'holdValue');}
  assert.equal(interactiveText('Zustand [2]: aktiv','fr'),'État [2]: actif');
});
