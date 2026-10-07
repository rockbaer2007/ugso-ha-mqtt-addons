import test from "node:test";
import assert from "node:assert/strict";
import {segmentSize,segmentModel,segmentPortActive} from "../web/industrial-segment.js";
import {hasSimpleOutput} from "../web/dock-points.js";
const led={type:"ugso.industrial/segment-7-led",segmentDigits:6,segmentText:"123.45",segmentDecimals:2,height:64};
test("segment sizing aligns with separate cells including their housing spacing",()=>{
  assert.deepEqual(segmentSize(led),{width:262,height:64,segmentSpan:"4"});
  assert.equal(segmentSize({...led,segmentSpan:3}).width,196);
  assert.equal(segmentSize({...led,width:530},"width").height,131);
  assert.equal(segmentSize({...led,housingSpace:3}).width,274);
});
test("numeric digits reserve sign, attach decimal point and reject overflow or missing inputs",()=>{
  const model=segmentModel({...led,segmentText:"-12.34",segmentUnit:"W"});
  assert.equal(model.cells.length,6);assert.equal(model.cells.filter(c=>c.point).length,1);assert.equal(model.error,"");assert.equal(model.unit,"W");
  assert.equal(segmentModel({...led,segmentDigits:2}).error,"Zahlenbereich überschritten");
  assert.equal(segmentModel({...led,entityId:"sensor.no"}).error,"Kein Eingangswert");
  assert.equal(segmentModel({...led,entityId:"sensor.n",dataInputEnabled:true},{"sensor.n":{state:12}},{value:98}).text,"98.00");
  assert.equal(segmentModel({...led,segmentUnit:"kWh"}).unit,"off");
});
test("sixteen-segment text, independent power and input-only ports",()=>{
  const text={...led,type:"ugso.industrial/segment-16-led",segmentText:"Solar 12.3",segmentDigits:10};
  assert.equal(segmentModel(text).text,"SOLAR 12.3");assert.equal(segmentModel({...text,segmentDigits:4}).truncated,true);
  assert.equal(segmentModel({...text,displayEntityId:"switch.lamp"},{"switch.lamp":{state:"off"}}).power,false);
  assert.equal(segmentModel({...text,displayInputEnabled:true,displayEntityId:"switch.lamp"},{"switch.lamp":{state:"on"}},{},false).power,false);
  assert.equal(segmentModel({...text,displayInputEnabled:true}).power,null);
  assert.equal(segmentPortActive({...text,dataInputEnabled:true},"value-input","end"),true);
  assert.equal(segmentPortActive({...text,dataInputEnabled:true},"value-input","start"),false);
  assert.equal(hasSimpleOutput(text),false);
});
