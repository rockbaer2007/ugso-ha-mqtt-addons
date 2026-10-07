import test from "node:test";
import assert from "node:assert/strict";
import {clockSize,clockText,clockPortActive} from "../web/industrial-clock.js";
import {hasSimpleOutput} from "../web/dock-points.js";
test("clock grid sizing retains gaps for both formats and all three modes",()=>{
  assert.deepEqual(clockSize({clockMode:"nixie",height:128}),{width:518,height:128});
  assert.deepEqual(clockSize({clockMode:"led",height:64}),{width:262,height:64});
  assert.deepEqual(clockSize({clockMode:"lcd",height:64,clockSeconds:false}),{width:196,height:64});
  assert.equal(clockSize({clockMode:"led",height:12}).height,32);
  assert.equal(clockSize({clockMode:"nixie",height:12}).height,64);
  assert.deepEqual(clockSize({clockMode:"led",width:326,housingSpace:1},"width"),{width:326,height:80});
});
test("time uses local/UTC/Berlin time, DST and midnight without inventing invalid values",()=>{
  const summer=new Date("2026-07-01T00:02:03Z"),winter=new Date("2026-01-01T00:02:03Z");
  assert.equal(clockText({clockZone:"UTC"},summer),"00:02:03");
  assert.equal(clockText({clockZone:"Europe/Berlin"},summer),"02:02:03");
  assert.equal(clockText({clockZone:"Europe/Berlin",clockSeconds:false},winter),"01:02");
  assert.equal(clockText({},new Date(NaN)),"--:--:--");
  assert.equal(clockText({},summer),[summer.getHours(),summer.getMinutes(),summer.getSeconds()].map(v=>String(v).padStart(2,"0")).join(":"));
});
test("clock exposes only one optional directional power input",()=>{
  const widget={type:"ugso.industrial/clock",displayInputEnabled:true};
  assert.equal(clockPortActive(widget,"display-power","end"),true);assert.equal(clockPortActive(widget,"display-power","start"),false);
  assert.equal(clockPortActive({...widget,displayInputEnabled:false},"display-power"),false);assert.equal(hasSimpleOutput(widget),false);
});
