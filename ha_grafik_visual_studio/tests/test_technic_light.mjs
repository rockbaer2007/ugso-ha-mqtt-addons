import test from "node:test";
import assert from "node:assert/strict";
import { technicLightBindings, technicLightState, technicLightPercent, renderTechnicLight } from "../web/technic-light.js";
const widget = {id:"w",heading:"Light",showName:true,powerEntityId:"light.demo",brightnessEntityId:"light.demo",linkPowerDimmer:true};
const states = {"light.demo":{state:"on",attributes:{brightness:128,supported_color_modes:["brightness"]}}};
test("HA brightness converts 0–255 to percent and off means zero", () => {
  assert.equal(technicLightState(widget,states,true).brightness,50);
  assert.equal(technicLightState(widget,{"light.demo":{...states["light.demo"],state:"off"}},true).brightness,0);
  assert.equal(technicLightState(widget,states,true).powerWritable,true);
  assert.deepEqual(technicLightBindings(widget),["light.demo","light.demo"]);
});
test("unknown, unsupported, readonly and editor states never write; previews stay editor-only", () => {
  for (const entry of [{state:"unavailable"},{state:"on",attributes:{brightness:128,supported_color_modes:["onoff"]}},{state:"on",attributes:{supported_color_modes:["brightness"]}}]) assert.equal(technicLightState(widget,{"light.demo":entry},true).brightnessWritable,false);
  assert.equal(technicLightState({...widget,readOnly:true},states,true).powerWritable,false);
  assert.equal(technicLightState(widget,states).powerWritable,false);
  const preview = {powerPreview:true,brightnessPreview:75};
  assert.equal(technicLightState(preview).brightness,75); assert.equal(technicLightState(preview,{},true).brightness,null);
  assert.equal(technicLightState({...widget,...preview},{},true).brightness,null);
});
test("separate helper contract and unlinked binding enable only their own action", () => {
  const w = {...widget,brightnessEntityId:"input_number.demo"}, s = {...states,"input_number.demo":{state:"25",attributes:{min:0,max:100,step:1}}};
  assert.equal(technicLightState(w,s,true).brightness,25);
  assert.equal(technicLightState(w,s,true).brightnessWritable,true);
  assert.equal(technicLightState({...w,powerEntityId:"",linkPowerDimmer:false},s,true).brightnessWritable,true);
  assert.equal(technicLightState({...w,powerEntityId:""},s,true).brightnessWritable,false);
  assert.equal(technicLightState(w,{...s,"input_number.demo":{state:"25",attributes:{min:10,max:90,step:1}}},true).brightnessWritable,false);
});
test("radial mapping covers endpoints and midpoint", () => { assert.equal(technicLightPercent(22,78),0); assert.equal(technicLightPercent(50,10),50); assert.equal(technicLightPercent(78,78),100); });
class Element {
  constructor(tag){this.tag=tag;this.children=[];this.style={};this.dataset={};this.attributes={};this.listeners={};}
  append(...nodes){this.children.push(...nodes);} setAttribute(key,value){this.attributes[key]=String(value);} addEventListener(event,fn){this.listeners[event]=fn;}
  getBoundingClientRect(){return {left:0,top:0,width:100,height:100};} setPointerCapture(){}
}
const document=()=>({createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag)});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test("radial drag previews locally, commits once and keeps caption through live changes", async () => {
  let live=states, resolve; const writes=[], doc=document();
  const root=renderTechnicLight(widget,doc,{runtime:true,getStates:()=>live,write:request=>{writes.push(request);return new Promise(done=>{resolve=done;});}});
  const svg=root.children[0].children[0], event={pointerId:1,button:0,clientX:50,clientY:10,preventDefault(){},stopPropagation(){}};
  svg.listeners.pointerdown(event); svg.listeners.pointermove({...event,clientX:90,clientY:50}); assert.equal(writes.length,0); assert.equal(root.dataset.dragging,"true");
  svg.listeners.pointerup({...event,clientX:90,clientY:50}); assert.equal(writes.length,1); assert.equal(writes[0].value,83);
  root.children[0].children[1].listeners.click({stopPropagation(){}}); assert.equal(writes.length,1); assert.equal(root.children[2].textContent,"Light");
  resolve(); await flush(); live={}; root.children[1].value="25"; root.children[1].listeners.change(); assert.equal(writes.length,1);
});
test("power linking payload, cancel without write, and error retry survive rerender", async () => {
  const writes=[], root=renderTechnicLight(widget,document(),{runtime:true,getStates:()=>states,write:async request=>{writes.push(request);throw Error("secret");}});
  const svg=root.children[0].children[0], event={pointerId:2,button:0,clientX:50,clientY:10,preventDefault(){},stopPropagation(){}};
  svg.listeners.pointerdown(event); svg.listeners.pointercancel(event); assert.equal(writes.length,0);
  root.children[0].children[1].listeners.click({stopPropagation(){}}); await flush();
  assert.deepEqual(writes[0],{power_entity:"light.demo",brightness_entity:"light.demo",linked:true,action:"power",value:false});
  assert.equal(root.children[2].textContent,"Light"); assert.match(root.children[3].textContent,/fehlgeschlagen/); assert.doesNotMatch(root.children[3].textContent,/secret/);
  const fresh=renderTechnicLight(widget,document(),{runtime:true,getStates:()=>states}); assert.equal(fresh.children[0].children[1].disabled,false); assert.match(fresh.children[3].textContent,/fehlgeschlagen/);
});
