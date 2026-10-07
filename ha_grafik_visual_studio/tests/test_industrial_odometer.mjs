import test from "node:test";
import assert from "node:assert/strict";
import {odometerSize,odometerModel} from "../web/industrial-odometer.js";
import {dockPointActive,hasSimpleOutput} from "../web/dock-points.js";
test("four formats retain single-widget spacing and slim half-height",()=>{
 for(const slim of [false,true])for(const span of [3,4]){
  const w={type:slim?"ugso.industrial/odometer-slim":"ugso.industrial/odometer",odometerSpan:span};
  assert.deepEqual(odometerSize(w),{width:64*span+2*(span-1),height:slim?32:64,odometerSpan:span});
  assert.equal(odometerSize({...w,width:128*span+2*(span-1)},"width").height,slim?64:128);
 }
});
test("fixed positions handle rounding, optional zeros/signs, units, overflow and unavailable input",()=>{
 const w={state:123.45,odometerDigits:5,odometerDecimals:2};
 assert.equal(odometerModel(w).digits,"0012345");assert.equal(odometerModel({...w,odometerLeadingZeros:false}).digits,"  12345");
 assert.equal(odometerModel({...w,state:-123.45,odometerSignEnabled:true}).sign,"−");assert.equal(odometerModel({...w,state:-1}).overflow,true);
 assert.equal(odometerModel({...w,state:99999.999}).overflow,true);assert.equal(odometerModel({...w,state:1e25}).overflow,true);
 assert.equal(odometerModel({...w,entityId:"sensor.missing"}).digits,"———————");
 assert.equal(odometerModel({...w,entityId:"sensor.good",dataInputEnabled:true},{"sensor.good":{state:"12"}},{}).value,null);
 assert.equal(odometerModel({...w,dataInputEnabled:true},{},{value:9.996,unit:"kWh"}).digits,"0001000");
 assert.equal(odometerModel({...w,dataInputEnabled:true},{},{value:2,unit:"kWh"}).unit,"kWh");
 assert.equal(odometerModel({...w,dataInputEnabled:true},{},{value:true}).value,null);
});
test("odometer exposes exactly one directional input and no output",()=>{
 const w={type:"ugso.industrial/odometer",dataInputEnabled:true,dataOutputEnabled:true};
 assert.equal(hasSimpleOutput(w),false);assert.equal(dockPointActive(w,"value-input","end"),true);assert.equal(dockPointActive(w,"value-input","start"),false);
 assert.equal(dockPointActive(w,"right-center"),false);
});
