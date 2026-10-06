import test from "node:test";
import assert from "node:assert/strict";
import {switchCount,switchAnchors,switchChannel,switchPortActive} from "../web/industrial-switch.js";
import {widgetValuePacket,widgetInputPacket} from "../web/dataflow.js";
const bank={id:"bank",type:"ugso.industrial/switch",switchCount:4,outputDock1:true,outputDock2:true,outputDock3:true,outputDock4:true,switchState1:true,switchState2:false,switchState3:true,switchState4:false};
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
