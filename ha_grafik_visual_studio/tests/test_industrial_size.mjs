import test from "node:test";
import assert from "node:assert/strict";
import { industrialSize, industrialResize } from "../web/industrial-size.js";
test("square lock is the legacy default; either typed dimension controls both",()=>{
  assert.deepEqual(industrialSize({width:128,height:64}),{width:128,height:128});
  assert.deepEqual(industrialSize({width:128,height:192},"width"),{width:128,height:128});
  assert.deepEqual(industrialSize({width:128,height:192},"height"),{width:192,height:192});
  assert.deepEqual(industrialSize({width:128,height:192,aspectRatio1to1:false}),{width:128,height:192});
});
test("resize locks both dimensions from every edge and preserves opposite corners",()=>{
  const origin={width:128,height:128,left:100,top:100};
  for(const direction of ["n","s","w","e","nw","ne","sw","se"]){
    const result=industrialResize(origin,direction,20,10,true);assert.equal(result.width,result.height);
    if(direction.includes("w"))assert.equal(result.x+result.width,228);
    if(direction.includes("n"))assert.equal(result.y+result.height,228);
  }
  assert.equal(industrialResize(origin,"e",40,0,false).height,128);
  assert.equal(industrialResize(origin,"s",0,40,false).width,128);
  assert.deepEqual(industrialSize({width:10,height:99999,aspectRatio1to1:false}),{width:64,height:4096});
});
