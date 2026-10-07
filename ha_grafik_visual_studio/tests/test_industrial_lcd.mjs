import test from "node:test";
import assert from "node:assert/strict";
import {lcdSize,lcdLine,lcdPower,lcdBindings} from "../web/industrial-lcd.js";
import {lcdGlyph,lcdCharacterSupported} from "../web/lcd-font.js";
import {dockPointActive,hasSimpleOutput} from "../web/dock-points.js";
import {widgetInputPacket,widgetValuePacket} from "../web/dataflow.js";
test("LCDs use normal two-row height and doubled four-row dimensions",()=>{
 const small={type:"ugso.industrial/lcd-16x2",height:32,width:192};
 assert.deepEqual(lcdSize(small),{height:64,width:192});assert.deepEqual(lcdSize({...small,width:384},"width"),{height:128,width:384});
 assert.deepEqual(lcdSize({...small,height:1}),{height:64,width:192});assert.deepEqual(lcdSize({type:"ugso.industrial/lcd-20x4",height:80}),{height:128,width:384});
});
test("line formatting preserves units and Unicode, clips columns and reports unavailable values",()=>{
 const w={type:"ugso.industrial/lcd-16x2",lineEntityId1:"sensor.temp",lineText1:"Temp: ",lineDecimals1:"1"},states={"sensor.temp":{state:"-20.24",attributes:{unit_of_measurement:"°C"}}};
 assert.equal(lcdLine(w,1,states).visible,"Temp: -20.2 °C");
 assert.equal(lcdLine(w,1,{}).visible,"Temp: ?");
 assert.equal(lcdLine({...w,lineEntityId1:"",lineText1:"Äöüß€µΩ→✓abcdefghijkl"},1).visible,"Äöüß€µΩ→✓abcdefg");
 assert.equal(lcdLine({...w,lineEntityId1:"",lineText1:"Äöüß€µΩ→✓abcdefghijkl"},1).truncated,true);
 assert.equal(lcdLine({...w,lineUnit1:"W"},1,states).visible,"Temp: -20.2 W");
 assert.deepEqual(lcdBindings({...w,displayEntityId:"switch.lcd"}),["switch.lcd","sensor.temp"]);
 for(const char of "ÄÖÜäöüß€°µΩ←→↑↓✓abcdefghijklmnopqrstuvwxyz")assert.ok(lcdCharacterSupported(char));
 assert.equal(lcdGlyph("🙂").length,8);assert.deepEqual(lcdGlyph("🙂"),lcdGlyph("?"));
});
test("power input overrides the entity, accepts a toggle wire and never exposes an output",()=>{
 const lcd={id:"lcd",type:"ugso.industrial/lcd-20x4",displayInputEnabled:true,displayEntityId:"switch.lcd",dataInputAnchor:"display-power"};
 const source={id:"switch",type:"ugso.industrial/switch",switchCount:1,switchState1:false,outputDock1:true};
 const line={id:"wire",type:"svg-connection",startWidgetId:"switch",startAnchor:"output-1",endWidgetId:"lcd",endAnchor:"display-power"};
 const states={"switch.lcd":{state:"on"}},widgets=[lcd,source,line];
 assert.equal(lcdPower(lcd,states,widgetInputPacket(lcd,widgets,states).value),false);
 source.switchState1=true;assert.equal(lcdPower(lcd,states,widgetInputPacket(lcd,widgets,states).value),true);
 assert.equal(lcdPower(lcd,states,undefined),null);assert.equal(lcdPower({...lcd,displayInputEnabled:false},states),true);
 assert.equal(lcdPower({}),true);assert.equal(hasSimpleOutput(lcd),false);
 assert.equal(dockPointActive(lcd,"display-power","end"),true);assert.equal(dockPointActive(lcd,"display-power","start"),false);
 assert.ok(widgetValuePacket(lcd,widgets,states).error);
});
