import test from "node:test";
import assert from "node:assert/strict";
import {switchCount,switchSize,switchGap,switchAnchors,switchChannel,switchPortActive,isIndustrialSwitch,ROCKER_COLORS,rockerColor} from "../web/industrial-switch.js";
import {widgetValuePacket,widgetInputPacket} from "../web/dataflow.js";
import {housingPoints} from "../web/housing-snap.js";
const bank={id:"bank",type:"ugso.industrial/switch",switchCount:4,housingSpace:0,outputDock1:true,outputDock2:true,outputDock3:true,outputDock4:true,switchState1:true,switchState2:false,switchState3:true,switchState4:false};
test("toggle banks align with spaced single widgets; rocker sizing is unchanged",()=>{
 for(let count=1;count<=4;count++){
  const toggle={...bank,height:64,switchCount:count,housingSpace:1};
  const size=switchSize(toggle);
  assert.equal(size.width,64*count+2*(count-1));
  assert.deepEqual(switchSize({...toggle,...size},"width"),size);
  for(let n=1;n<=count;n++)assert.ok(Math.abs(switchAnchors(toggle).find(([id])=>id===`input-${n}`)[2]*size.width-(32+(n-1)*66))<1e-9);
  assert.equal(switchSize({...toggle,type:"ugso.industrial/rocker-switch"}).width,64*count);
 }
 assert.equal(switchSize({...bank,height:128,housingSpace:3}).width,530);
 assert.equal(switchGap({...bank,housingSpace:-1}),0);
 assert.deepEqual(switchSize({...bank,width:65,housingSpace:1},"width"),{height:64,width:262});
});
test("all rocker variants share directional routing and housing points with toggle switches",()=>{
 for(const color of ROCKER_COLORS){
  const rocker={...bank,type:"ugso.industrial/rocker-switch",rockerColor1:color};
  assert.equal(rockerColor(rocker,1),color);
  assert.equal(rockerColor(rocker,2),"white");
  assert.equal(isIndustrialSwitch(rocker),true);
  assert.deepEqual(housingPoints(rocker),housingPoints(bank));
  assert.deepEqual(switchAnchors(rocker),switchAnchors(bank));
  for(let n=1;n<=4;n++)assert.equal(widgetValuePacket(rocker,[rocker],{},new Set(),`output-${n}`).value,n%2===1);
 }
 assert.equal(isIndustrialSwitch({type:"ugso.industrial/rocker-unknown"}),false);
});
test("1 to 4 switches expose 8/10/12/14 distinct housing and named signal points",()=>{
 for(let count=1;count<=4;count++){
  const widget={...bank,switchCount:count},signals=switchAnchors(widget),housing=housingPoints(widget);
  assert.equal(signals.length+housing.length,6+2*count);
  for(let n=1;n<=count;n++){
   assert.deepEqual(signals.find(([id])=>id===`input-${n}`),[`input-${n}`,`E${n}`,(n-.5)/count,0]);
   assert.deepEqual(signals.find(([id])=>id===`output-${n}`),[`output-${n}`,`A${n}`,(n-.5)/count,1]);
  }
  assert.equal(new Set([...signals,...housing].map(([, ,x,y])=>`${x}:${y}`)).size,6+2*count);
 }
});
test("four channels have separate directional ports and boolean outputs",()=>{
  assert.equal(switchCount({switchCount:9}),4);assert.equal(switchAnchors(bank).length,8);
  for(let n=1;n<=4;n++)assert.equal(widgetValuePacket(bank,[bank],{},new Set(),`output-${n}`).value,n%2===1);
  assert.equal(switchPortActive({...bank,inputDock1:true},"input-1","start"),false);
  assert.equal(switchPortActive(bank,"output-1","end"),false);
  assert.equal(switchPortActive({...bank,switchCount:1},"output-4"),false);
});
test("signal input overrides entity and flows without crossing channels",()=>{
 const receiver={...bank,id:"receiver",inputDock2:true,inputEntityId2:"switch.readback"};
 const wire={id:"wire",type:"svg-connection",startWidgetId:"bank",startAnchor:"output-1",endWidgetId:"receiver",endAnchor:"input-2"};
 const widgets=[bank,receiver,wire],states={"switch.readback":{state:"off"}};
 assert.equal(widgetInputPacket({...receiver,dataInputAnchor:"input-2"},widgets,states).value,true);
 assert.equal(widgetValuePacket(receiver,widgets,states,new Set(),"output-2").value,true);
 assert.equal(widgetValuePacket(receiver,widgets,states,new Set(),"output-4").value,false);
 assert.equal(widgetValuePacket({...receiver,switchCommand2:false},widgets,states,new Set(),"output-2").value,false);
 const loop={...wire,startWidgetId:"receiver",startAnchor:"output-2"};
 assert.ok(widgetValuePacket(receiver,[receiver,loop],states,new Set(),"output-2").error);
});
test("missing feedback never becomes off and unsupported targets stay unwritable",()=>{
 assert.equal(switchChannel({inputEntityId1:"sensor.missing"},1).on,null);
 assert.equal(switchChannel({outputEntityId1:"sensor.reading"},1,{"sensor.reading":{state:"on"}}).writable,false);
 assert.equal(switchChannel({outputEntityId1:"switch.test"},1,{"switch.test":{state:"on"}}).on,true);
});
