import test from "node:test";
import assert from "node:assert/strict";
import { housingActive, housingSpace, snapHousing, housingPoints, housingSnapGroupFor } from "../web/housing-snap.js";
const widget=(id,x,y,extra={})=>({id,type:"ugso.industrial/gauge-poti",x,y,width:64,height:64,housingSnapEnabled:true,housing_top_left:true,housing_top_right:true,housing_bottom_left:true,housing_bottom_right:true,...extra});
test("housing corners are opt-in and isolated from signal docks",()=>{
  assert.equal(housingActive(widget("a",0,0),"top-left"),true);
  assert.equal(housingActive(widget("a",0,0,{housingSnapEnabled:false}),"top-left"),false);
  assert.equal(housingActive(widget("a",0,0,{housing_top_left:false}),"top-left"),false);
  assert.equal(housingSpace(widget("a",0,0)),1);
});
test("switch side centers snap independently without changing gauge corners",()=>{
 const a={id:"a",type:"ugso.industrial/switch",x:20,y:20,width:128,height:128,housingSnapEnabled:true,housing_right_center:true};
 const b={...a,id:"b",x:152,y:20,housing_right_center:false,housing_left_center:true};
 const snap=snapHousing(b,[a,b]);assert.equal(snap.x,150);assert.equal(snap.y,20);
 assert.equal(housingPoints(a).length,6);assert.equal(housingPoints(widget("g",0,0)).length,4);
 assert.ok(housingSnapGroupFor(a).fields.some(field=>field.key==="housing_left_center"));
 assert.equal(housingActive({...a,type:"ugso.industrial/gauge"},"right-center"),false);
 assert.equal(snapHousing({...b,housing_left_center:false},[a]),null);
});
test("horizontal and vertical neighbors add spacing and avoid overlap",()=>{
  const a=widget("a",20,20),b=widget("b",88,22);
  const snap=snapHousing(b,[a,b]); assert.equal(snap.x,86);assert.equal(snap.y,20);
  const c=widget("c",20,88);assert.equal(snapHousing(c,[a,c]).y,86);
  const zero=widget("z",86,20,{housingSpace:0});assert.equal(snapHousing(zero,[{...a,housingSpace:0},zero]).x,84);
  assert.equal(snapHousing(widget("far",300,300),[a]),null);
});
test("only active corner pairs snap, with mixed sizes and no accidental same-corner overlay",()=>{
  const a=widget("a",20,20,{height:128,housing_top_right:false,housing_bottom_right:true});
  const b=widget("b",88,84,{housing_top_left:false,housing_bottom_left:true});
  const snap=snapHousing(b,[a,b]);assert.equal(snap.x,86);assert.equal(snap.y,84);
  assert.equal(snapHousing({...b,housing_bottom_left:false},[a]),null);
  assert.equal(snapHousing(widget("same",21,21),[widget("a",20,20)]),null);
});
