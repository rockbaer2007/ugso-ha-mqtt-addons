import test from 'node:test';
import assert from 'node:assert/strict';
import {solarSize,solarAnchors,solarPortKey,solarReading,solarBindings} from '../web/solar.js';
import {dockPointActive} from '../web/dock-points.js';
import {housingPoints,snapHousing} from '../web/housing-snap.js';
import {widgetValuePacket} from '../web/dataflow.js';
const battery=(id,x,y)=>({id,type:'ugso.solar/battery',x,y,width:256,height:169,housingSnapEnabled:true,housingTopCenter:true,housingBottomCenter:true,housingSpace:0});

test('Solar shapes keep proportions and expose only the intended signal and housing sides',()=>{
  for(const [kind,count,housing] of [['head',6,1],['battery',2,2],['solo',10,0],['panel',1,0]]) {
    const widget={type:'ugso.solar/'+kind,width:256,height:64};
    assert.equal(solarAnchors(widget).length,count);
    assert.equal(housingPoints(widget).length,housing);
    const size=solarSize(widget);assert.equal(size.width,256);
    if(kind==='battery')assert.equal(size.height,169);
    if(kind==='head')assert.equal(size.height,64);
    if(kind!=='head')assert.ok(Math.abs(solarSize({...widget,height:size.height},'height').width-256)<.2);
  }
});

test('solo has seven distinct bottom ports including corners, with independent roles and values',()=>{
  const widget={id:'solo',type:'ugso.solar/solo',powerEntityId:'sensor.power',socEntityId:'sensor.soc'};
  const bottom=solarAnchors(widget).filter(([, , ,y])=>y===1).sort((a,b)=>a[2]-b[2]);
  assert.deepEqual(bottom.map(p=>p[2]),[0,1/6,2/6,.5,4/6,5/6,1]);
  const states={'sensor.power':{state:'320'},'sensor.soc':{state:'74'}};
  for(const [index,[id]] of bottom.entries()) {
    assert.equal(dockPointActive(widget,id),false);
    widget[solarPortKey(id,'role')]=index%2?'input':'output';
    widget[solarPortKey(id,'value')]=index===6?'soc':'power';
    assert.equal(dockPointActive(widget,id,'start'),index%2===0);
    assert.equal(dockPointActive(widget,id,'end'),index%2===1);
  }
  // The input ports use a different channel so that each output reads its own entity.
  for(const [id] of bottom.filter((_,index)=>index%2))widget[solarPortKey(id,'value')]='temperature';
  assert.equal(widgetValuePacket(widget,[widget],states,new Set(),'bottom-left').value,320);
  assert.equal(widgetValuePacket(widget,[widget],states,new Set(),'bottom-right').value,74);
  assert.equal(solarReading({type:'ugso.solar/solo',solarBottomLeftOuterRole:'input'},'power',{},()=>({value:12,unit:'W'})).value,12,'a newly enabled input uses its displayed default power channel');
});

test('battery ports move independently to the lower enclosure seam without changing roles',()=>{
  const widget={...battery('battery',0,0),solarLeftCenterRole:'input',solarRightCenterRole:'output',solarLeftCenterPosition:'housing'};
  assert.deepEqual(solarAnchors(widget).map(p=>p.slice(2)),[[.09,190/264],[1,.5]]);
  widget.solarRightCenterPosition='housing';
  assert.deepEqual(solarAnchors(widget).map(p=>p.slice(2)),[[.09,190/264],[.91,190/264]]);
  assert.equal(dockPointActive(widget,'left-center','end'),true);
  assert.equal(dockPointActive(widget,'right-center','start'),true);
});

test('head PV ports are four independent inputs aligned to the bottom-aligned graphic',()=>{
  const head={type:'ugso.solar/head',width:400,height:120};
  assert.equal(solarAnchors(head).some(([id])=>id==='top-center'),false);
  const ports=solarAnchors(head).filter(([id])=>id.startsWith('pv-'));
  assert.equal(ports.length,4);
  for(const [id,,x,y] of ports) {
    assert.ok([.0925,.9075].includes(x));
    assert.ok(Math.abs(y*120-(id.endsWith('upper')?66:99))<.001);
    assert.equal(dockPointActive(head,id,'end'),true);
    assert.equal(dockPointActive(head,id,'start'),false);
  }
  head.solarPvLeftUpperEnabled=false;
  assert.equal(dockPointActive(head,'pv-left-upper','end'),false);
  assert.equal(dockPointActive(head,'pv-left-lower','end'),true);
});

test('panel has one entity-powered output whose stable anchor moves between pipe and widget edges',()=>{
  const panel={id:'panel',type:'ugso.solar/panel',width:320,height:288,powerEntityId:'sensor.pv',showPower:false};
  const states={'sensor.pv':{state:'2.4',attributes:{unit_of_measurement:'kW'}}};
  for(const [position,x] of [['pipe',.5],['left',0],['right',1]]) {
    panel.solarOutputPosition=position;
    assert.deepEqual(solarAnchors(panel),[['right-center','Ausgang',x,.89]]);
    assert.equal(dockPointActive(panel,'right-center','start'),true);
    assert.equal(dockPointActive(panel,'right-center','end'),false);
    assert.equal(widgetValuePacket(panel,[panel],states,new Set(),'right-center').value,2400);
  }
  assert.equal(solarSize(panel).height,288);
  panel.solarOutputEnabled=false;
  assert.equal(dockPointActive(panel,'right-center','start'),false);
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
