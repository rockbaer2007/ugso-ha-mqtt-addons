import test from "node:test";
import assert from "node:assert/strict";
import { sectionSize } from "../web/industrial-section.js";
import { dockPointActive, hasSimpleOutput } from "../web/dock-points.js";

test("blank panel aligns with banks of separate 64 px widgets including their gaps", () => {
  for (let count=1; count<=12; count++) assert.deepEqual(sectionSize({sectionCount:count,height:64,housingSpace:1}),{height:64,width:64*count+2*(count-1)});
  assert.deepEqual(sectionSize({sectionCount:4,width:406,housingSpace:1},"width"),{height:100,width:406});
  assert.deepEqual(sectionSize({sectionCount:3,height:64,housingSpace:3}),{height:64,width:204});
  assert.deepEqual(sectionSize({sectionCount:4,sectionRows:2,height:130,housingSpace:1}),{height:130,width:262});
  assert.deepEqual(sectionSize({sectionCount:2,sectionRows:4,height:262,housingSpace:1}),{height:262,width:130});
  assert.deepEqual(sectionSize({sectionCount:12,sectionRows:12,height:790,housingSpace:1}),{height:790,width:790});
  assert.deepEqual(sectionSize({sectionCount:99,sectionRows:99,height:790,housingSpace:1}),{height:790,width:790});
});
test("blank panel cannot become a data connection endpoint even with imported port flags", () => {
  const widget={type:"ugso.industrial/section",dataOutputEnabled:true,dockPointsEnabled:true,dock_left_center:true};
  assert.equal(hasSimpleOutput(widget),false);assert.equal(dockPointActive(widget,"left-center"),false);
});
