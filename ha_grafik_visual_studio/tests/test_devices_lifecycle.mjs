import test from 'node:test';
import assert from 'node:assert/strict';
import {deviceModel} from '../web/devices.js';
import {headingStatus} from '../web/heading-status.js';
import {installRuntimeLifecycle} from '../web/runtime-lifecycle.js';
import {createRendererLoader} from '../web/renderer-loader.js';
import {packageCapabilities} from '../web/optional-capabilities.js';
import {localizeDeviceGroups} from '../web/device-locales.js';
import {getWidgetSets,getWidgetDefinition,replaceExternalWidgetSets} from '../web/widget-registry.js';
import '../web/widget-sets/devices.js';

test('five native devices in two presentations retain all CSS groups',()=>{
  const set=getWidgetSets().find(s=>s.id==='devices');assert.equal(set.widgets.length,10);
  for(const w of set.widgets){assert.equal(w.propertyGroups.filter(g=>g.css).length,5);assert.equal(w.defaults.entityId,'');assert.ok(w.propertyGroups.filter(g=>g.css&&g.label!=='CSS Allgemein').every(g=>g.defaultEnabled===false));}
});
test('device property IDs and technical choices remain stable across DE EN FR',()=>{
  const groups=getWidgetDefinition('device-switch-tile').propertyGroups;
  const de=localizeDeviceGroups(groups,'de'),fr=localizeDeviceGroups(groups,'fr'),en=localizeDeviceGroups(groups,'en');assert.deepEqual(fr.map(g=>g.id),de.map(g=>g.id));assert.deepEqual(en.map(g=>g.id),de.map(g=>g.id));
  assert.deepEqual(fr[0].fields.find(f=>f.key==='presentation').options.map(o=>o.value),['tile','floorplan']);
});
test('capabilities distinguish read-only sensors, switches and actual dimmable lights',()=>{
  assert.equal(deviceModel({entityId:'switch.test',deviceKind:'switch'},{state:'on'}).power,true);
  assert.equal(deviceModel({entityId:'light.test',deviceKind:'color'},{state:'on',attributes:{supported_color_modes:['onoff']}}).rgb,false);
  const rgb=deviceModel({entityId:'light.test',deviceKind:'color'},{state:'on',attributes:{supported_color_modes:['rgb']}});assert.equal(rgb.rgb,true);assert.equal(rgb.brightness,true);
  assert.equal(deviceModel({entityId:'sensor.test',deviceKind:'value'},{state:'42'}).power,false);
  assert.equal(deviceModel({entityId:'switch.test',deviceKind:'switch'},{state:'unavailable'}).power,false);
  assert.equal(deviceModel({entityId:'climate.test',deviceKind:'thermostat'},{state:'heat',attributes:{supported_features:1,min_temp:5,max_temp:30}}).temperature,true);
});
test('heading formats optional HA attributes without treating user text as code',()=>{
  const widget={headingStatusEnabled:true,headingEntityId:'sensor.a',headingDecimals:1};
  assert.equal(headingStatus(widget,{'sensor.a':{state:'21.23',attributes:{unit_of_measurement:'°C'}}},'de'),'21,2 °C');
  assert.equal(headingStatus(widget,{'sensor.a':{state:'unavailable'}}),'—');
  assert.equal(headingStatus({...widget,headingAttribute:'x'},{'sensor.a':{state:'ok',attributes:{x:{}}}}),'—');
});
test('tablet wake refreshes once; idle navigation never targets hidden pages or interrupts dialogs',async()=>{
  const doc=new EventTarget();doc.hidden=false;let blocked=false;doc.querySelector=()=>blocked?{}:null;const win=new EventTarget();let tick;win.setInterval=f=>{tick=f;return 1;};win.clearInterval=()=>{};let time=0,refreshes=0,current='detail',navigations=[];
  const settings={idleHomeSeconds:10,idleHomePageId:'home'};
  const dispose=installRuntimeLifecycle({doc,win,settings:()=>settings,pages:()=>[{id:'home',visible:true}],current:()=>current,navigate:id=>{current=id;navigations.push(id);},refresh:async()=>{refreshes++;},now:()=>time});
  doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));time=20000;blocked=true;doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));await Promise.resolve();assert.equal(refreshes,1);assert.equal(navigations.length,0);blocked=false;tick();assert.deepEqual(navigations,['home']);
  settings.refreshOnReturn=false;doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));await Promise.resolve();assert.equal(refreshes,1);dispose();
});
test('renderer loader shares concurrent requests and reports failure without executing package paths',async()=>{
  let count=0,ready=0;const loader=createRendererLoader(async()=>{count++;return {render:true};},()=>ready++);await Promise.all([loader.load(),loader.load()]);assert.equal(count,1);assert.equal(ready,1);assert.ok(loader.get().render);
  const failed=createRendererLoader(async()=>{throw Error('offline');},()=>{});assert.equal(await failed.load(),null);assert.ok(failed.error());
});
test('failed package refresh restores catalog and removed definitions survive for open projects',()=>{
  const widget={type:'test.package/first',label:'First',defaults:{},propertyGroups:[]};
  const set={id:'test.package',label:'Test',externalPackage:true,widgets:[widget]};replaceExternalWidgetSets([set]);
  assert.throws(()=>replaceExternalWidgetSets([set,set]));assert.equal(getWidgetDefinition(widget.type).label,'First');
  replaceExternalWidgetSets([]);assert.equal(getWidgetDefinition(widget.type).label,'First');
  assert.deepEqual(packageCapabilities({optionalCapabilities:['history','unsupported-feature']}),[{name:'history',supported:true},{name:'unsupported-feature',supported:false}]);
});
