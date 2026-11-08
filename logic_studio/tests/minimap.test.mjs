import test from 'node:test';
import assert from 'node:assert/strict';
import {overviewPoint} from '../web/minimap.js';
test('overview navigation respects aspect ratio, letterboxing and canvas bounds',()=>{
 const r={left:10,top:20,width:200,height:100};
 assert.deepEqual(overviewPoint(r,3200,1600,110,70),{x:1600,y:800});
 assert.deepEqual(overviewPoint(r,1000,1000,60,20),{x:0,y:0});
 assert.deepEqual(overviewPoint(r,1000,1000,160,120),{x:1000,y:1000});
 assert.deepEqual(overviewPoint(r,1000,1000,-100,500),{x:0,y:1000});
});
