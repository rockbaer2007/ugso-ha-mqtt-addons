import test from "node:test";
import assert from "node:assert/strict";
import {linearSize} from "../web/industrial-linear.js";
import {renderIndustrialGauge} from "../web/industrial-gauge.js";
test("normal and slim linear sizes preserve every selected span and minimum height",()=>{
 for(const [type,minHeight,factor] of [["ugso.industrial/linear",64,1],["ugso.industrial/linear-slim",32,2]])for(const span of [2,3,4]){
  const w={type,linearSpan:span,height:1},extra=(span-1)*2;assert.deepEqual(linearSize(w),{height:minHeight,width:64*span+extra,linearSpan:span});
  assert.equal(linearSize({...w,width:128*span+extra},"width").height,minHeight*2);
  assert.equal(linearSize({...w,height:99999}).width<=4096,true);
  assert.equal(linearSize({...w,housingSpace:3}).width,64*span+(span-1)*6);
  assert.equal(linearSize({...w,housingSpace:0}).width,64*span);
 }
});
class Element {
 constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.dataset={};this.style={};this.listeners={};this.classList={toggle(){}};}
 append(...nodes){this.children.push(...nodes);}setAttribute(k,v){this.attributes[k]=String(v);}removeAttribute(k){delete this.attributes[k];}addEventListener(k,fn){this.listeners[k]=fn;}
 focus(){}setPointerCapture(id){this.capture=id;}hasPointerCapture(id){return this.capture===id;}releasePointerCapture(){this.capture=null;}
 getBoundingClientRect(){return {left:0,top:0,width:128,height:64};}
}
const doc={createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag)};
const config={width:128,height:64,state:0,minValue:-20,maxValue:30,step:1,scaleDivision:5,showValue:true,scaleMode:"ring",bandCount:2,bandEnd1:0,bandColor1:"#00ff00",bandColor2:"#ff0000"};
test("a slider ignores saved color-bar mode; a gauge renders its triangle and colored ranges",()=>{
 const slider=renderIndustrialGauge(config,doc,{linear:true,runtime:true});assert.equal(slider.attributes.role,"slider");
 const shapes=slider.children[0].children;assert.equal(shapes.some(n=>n.attributes["data-linear-indicator"]==="handle"),true);
 assert.equal(shapes.some(n=>n.attributes.stroke==="#00ff00"),false);
 const gauge=renderIndustrialGauge({...config,entityId:"sensor.temp"},doc,{linear:true,runtime:true,states:{"sensor.temp":{state:"15"}}});
 assert.equal(gauge.attributes.role,"img");assert.equal(gauge.children[0].children.some(n=>n.attributes["data-linear-indicator"]==="triangle"),true);
 assert.equal(gauge.children[0].children.some(n=>n.attributes.stroke==="#00ff00"),true);
 const missing=renderIndustrialGauge({...config,entityId:"sensor.no"},doc,{linear:true,runtime:true});assert.equal(missing.dataset.value,"");
});
test("pointer endpoints clamp, release commits once, cancellation restores and editor stays passive",()=>{
 const values=[],commits=[],slider=renderIndustrialGauge(config,doc,{linear:true,runtime:true,onInput:v=>values.push(v),onCommit:v=>commits.push(v)});
 const event=(x)=>({button:0,pointerId:1,clientX:x,clientY:25,preventDefault(){}});
 slider.listeners.pointerdown(event(-30));slider.listeners.pointermove(event(300));assert.deepEqual(commits,[]);
 slider.listeners.pointerup(event(300));assert.deepEqual(commits,[30]);assert.equal(slider.dataset.value,"30");
 slider.listeners.pointerdown(event(10));slider.listeners.pointercancel();assert.equal(slider.dataset.value,"30");assert.deepEqual(commits,[30]);
 const editor=renderIndustrialGauge(config,doc,{linear:true,onCommit:v=>commits.push(v)});editor.listeners.pointerdown(event(300));assert.equal(editor.dataset.value,"0");
});
