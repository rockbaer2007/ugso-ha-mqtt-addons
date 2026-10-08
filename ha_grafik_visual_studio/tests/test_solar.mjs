import test from 'node:test';
import assert from 'node:assert/strict';
import {solarSize,solarAnchors,solarPortKey,solarReading,solarBindings} from '../web/solar.js';
import {dockPointActive} from '../web/dock-points.js';
import {housingPoints,snapHousing} from '../web/housing-snap.js';
import {widgetValuePacket} from '../web/dataflow.js';
const battery=(id,x,y)=>({id,type:'ugso.solar/battery',x,y,width:256,height:169,housingSnapEnabled:true,housingTopCenter:true,housingBottomCenter:true,housingSpace:0});

test('Solar shapes keep proportions and expose only the intended signal and housing sides',()=>{
  for(const [kind,count,housing] of [['head',3,1],['battery',2,2],['solo',4,0]]) {
    const widget={type:'ugso.solar/'+kind,width:256,height:64};
    assert.equal(solarAnchors(widget).length,count);
    assert.equal(housingPoints(widget).length,housing);
    const size=solarSize(widget);assert.equal(size.width,256);
    if(kind==='battery')assert.equal(size.height,169);
    if(kind==='head')assert.equal(size.height,64);
    if(kind!=='head')assert.ok(Math.abs(solarSize({...widget,height:size.height},'height').width-256)<.2);
  }
});

test('six independent batteries snap flush on center points with no corner coupling',()=>{
  const head={...battery('head',40,20),type:'ugso.solar/head',height:64,housingTopCenter:false};
  const widgets=[head];
  for(let index=0;index<6;index++) {
    const previous=widgets.at(-1), next=battery('battery'+index,42,previous.y+previous.height+2);
    const snapped=snapHousing(next,widgets);assert.ok(snapped);
    assert.equal(snapped.x,40);assert.equal(snapped.y,previous.y+previous.height);
    Object.assign(next,snapped);widgets.push(next);
  }
  assert.equal(snapHousing({...widgets[1],housingTopCenter:false,housingBottomCenter:false},[head]),null);
});

test('Solar input and output roles carry selected values even with display disabled',()=>{
  const widget={...battery('battery',0,0),powerEntityId:'sensor.power',showPower:false};
  const states={'sensor.power':{state:'1.5',attributes:{unit_of_measurement:'kW'}}};
  widget[solarPortKey('right-center','role')]='output';widget[solarPortKey('right-center','value')]='power';
  assert.equal(dockPointActive(widget,'right-center','start'),true);
  assert.equal(dockPointActive(widget,'right-center','end'),false);
  assert.equal(widgetValuePacket(widget,[widget],states,new Set(),'right-center').value,1500);
  assert.deepEqual(solarBindings(widget),['sensor.power']);
  widget[solarPortKey('left-center','role')]='input';widget[solarPortKey('left-center','value')]='power';
  assert.equal(solarReading(widget,'power',states,()=>({value:12,unit:'W'})).value,12);
  const source={id:'source',type:'sensor',state:32,dataOutputEnabled:true};
  const line={id:'line',type:'svg-connection',startWidgetId:'source',endWidgetId:'battery',endAnchor:'left-center'};
  assert.equal(widgetValuePacket(widget,[widget,source,line],{},new Set(),'right-center').value,32);
  line.startWidgetId='battery';line.startAnchor='right-center';
  assert.match(widgetValuePacket(widget,[widget,line],{},new Set(),'right-center').error,/Rückkopplung/);
});

test('missing values never become zero and multiple inputs per channel are rejected',()=>{
  const widget=battery('battery',0,0);
  assert.ok(solarReading({...widget,powerEntityId:'sensor.missing',powerPreview:123},'power',{}).error);
  assert.equal(solarReading({...widget,powerPreview:0},'power',{}).value,0);
  widget[solarPortKey('left-center','role')]='input';widget[solarPortKey('left-center','value')]='soc';
  widget[solarPortKey('right-center','role')]='input';widget[solarPortKey('right-center','value')]='soc';
  assert.match(solarReading(widget,'soc',{}).error,/ein Eingang/);
});
