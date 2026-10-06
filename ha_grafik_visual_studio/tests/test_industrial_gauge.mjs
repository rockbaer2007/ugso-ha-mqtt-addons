import test from "node:test";
import assert from "node:assert/strict";
import { industrialDomain, industrialModel, industrialTicks, industrialBands, industrialQuantize, industrialPointerValue, renderIndustrialGauge } from "../web/industrial-gauge.js";
import { widgetInputPacket, widgetValuePacket } from "../web/dataflow.js";
const config = { minValue:-20, maxValue:30, step:1, scaleDivision:5, state:0, scaleMode:"ticks", bandCount:4, bandEnd1:0, bandEnd2:20, bandEnd3:25, bandColor1:"#42a5f5", bandColor2:"#4caf50", bandColor3:"#ffca28", bandColor4:"#ef5350" };
test("negative scale and independent control step preserve zero and endpoints", () => {
  assert.deepEqual(industrialTicks(config), [-20,-15,-10,-5,0,5,10,15,20,25,30]);
  assert.equal(industrialQuantize(config,-14.2),-14);
  assert.equal(industrialQuantize(config,100),30);
  assert.equal(industrialTicks({...config,scaleDivision:1e-9}).length,0);
  assert.ok(industrialTicks({...config,minValue:-19,scaleDivision:7}).includes(0));
  assert.equal(industrialDomain({...config,maxValue:-20}).valid,false);
  assert.equal(industrialDomain({...config,step:0}).valid,false);
});
test("bound unavailable input never falls back or becomes a rotary control", () => {
  for (const state of [undefined,null,"",true,"unknown","unavailable"]) {
    const model = industrialModel({...config,entityId:"sensor.temp"},{"sensor.temp":{state}});
    assert.equal(model.gauge,true); assert.equal(model.value,null);
  }
  assert.equal(industrialModel({...config,entityId:"sensor.temp",dataInputEnabled:true},{"sensor.temp":{state:20}},-5).value,-5);
  assert.equal(industrialModel({...config,dataInputEnabled:true}).gauge,true);
});
test("gap keeps the reached endpoint rather than wrapping", () => {
  assert.equal(industrialPointerValue(config,225),-20);
  assert.equal(industrialPointerValue(config,135),30);
  assert.equal(industrialPointerValue(config,180,-20),-20);
  assert.equal(industrialPointerValue(config,180,30),30);
});
test("bands cover exact range and invalid boundaries never paint misleading colors", () => {
  assert.deepEqual(industrialBands(config).map(b=>[b.from,b.to]),[[-20,0],[0,20],[20,25],[25,30]]);
  assert.deepEqual(industrialBands({...config,bandEnd2:-5}),[]);
  assert.deepEqual(industrialBands({...config,bandEnd1:100}),[]);
  assert.deepEqual(industrialBands({...config,bandColor1:"url(http://example.org)"}),[]);
});
class Element {
  constructor(tag) { this.tag=tag; this.children=[]; this.attributes={}; this.style={}; this.dataset={}; this.listeners={}; this.classList={toggle(){}}; }
  append(...nodes){this.children.push(...nodes);} setAttribute(k,v){this.attributes[k]=String(v);} removeAttribute(k){delete this.attributes[k];}
  addEventListener(name,fn){this.listeners[name]=fn;} focus(){} setPointerCapture(id){this.capture=id;} hasPointerCapture(id){return this.capture===id;} releasePointerCapture(){this.capture=null;}
  getBoundingClientRect(){return {left:0,top:0,width:128,height:128};}
}
const doc={createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag)};
const nodes=root=>[root,...root.children.flatMap(nodes)];
test("housing and triangle render at unavailable values without unsafe markup", () => {
  const root=renderIndustrialGauge({...config,heading:"<script>text</script>",entityId:"sensor.no"},doc,{runtime:true});
  assert.equal(root.attributes.role,"img"); assert.equal(root.dataset.value,"");
  assert.equal(nodes(root).filter(n=>n.tag==="circle").length,4);
  assert.equal(nodes(root).find(n=>n.tag==="polygon").style.display,"none");
  assert.equal(nodes(root).some(n=>/NaN|Infinity/.test(JSON.stringify(n.attributes))),false);
  assert.equal(nodes(root).some(n=>n.tag==="script"),false);
  assert.equal(renderIndustrialGauge({...config,radius:12},doc).style.borderRadius,"12px");
  assert.equal(renderIndustrialGauge({...config,radius:0},doc).style.borderRadius,"0px");
});
test("solar reading and unit remain visible despite invalid color thresholds", () => {
  const widget={...config,entityId:"sensor.solar",minValue:0,maxValue:1000,scaleMode:"ring",showValue:true,unit:"W"};
  const states={"sensor.solar":{state:"423.125",attributes:{unit_of_measurement:"kW"}}};
  for (const runtime of [false,true]) {
    const root=renderIndustrialGauge(widget,doc,{states,runtime});
    assert.equal(nodes(root).find(n=>n.tag==="text").textContent,"423.125 W");
    assert.match(root.title,/Farbbereiche prüfen/);
    assert.equal(root.dataset.value,"423.125");
  }
  const automatic=renderIndustrialGauge({...widget,unit:""},doc,{states});
  assert.equal(nodes(automatic).find(n=>n.tag==="text").textContent,"423.125 kW");
  const hidden=renderIndustrialGauge({...widget,showValue:false},doc,{states});
  assert.equal(nodes(hidden).find(n=>n.tag==="text").textContent,"");
  const missing=renderIndustrialGauge(widget,doc,{});
  assert.equal(nodes(missing).find(n=>n.tag==="text").textContent,"—");
});

test("value display supports center, lower position, pixel font size and safe colors", () => {
  const widget={...config,width:132,height:132,showValue:true,valueFontSize:18,valueColor:"#ffcc00"};
  const text=options=>nodes(renderIndustrialGauge({...widget,...options},doc)).find(n=>n.tag==="text");
  assert.equal(text({}).attributes.y,"110");
  assert.equal(text({valuePosition:"center"}).attributes.y,"64");
  assert.equal(text({}).attributes["font-size"],"18");
  assert.equal(text({}).attributes.fill,"#ffcc00");
  assert.equal(text({valueColor:"url(https://example.org)"}).attributes.fill,"#dce5e9");
  assert.equal(text({valueFontSize:100}).attributes["font-size"],"72");
});

test("housing frame width override falls back to the current default when disabled", () => {
  const root=renderIndustrialGauge({...config,industrialFrameColor:"#ffcc00",industrialFrameWidthEnabled:true,industrialFrameWidth:5},doc);
  assert.equal(root.style.borderColor,"#ffcc00");
  assert.equal(root.style.borderWidth,"5px");
  const standard=renderIndustrialGauge({...config,industrialFrameWidthEnabled:false,industrialFrameWidth:5},doc);
  assert.equal(standard.style.borderWidth,"2px");
  assert.equal(nodes(standard).filter(n=>n.tag==="circle").length,5);
  assert.equal(renderIndustrialGauge(config,doc).style.borderWidth,"2px");
  assert.equal(renderIndustrialGauge({...config,industrialStyle:false},doc).style.borderWidth,"0px");
  assert.equal(renderIndustrialGauge({...config,industrialFrameWidthEnabled:true,industrialFrameWidth:100},doc).style.borderWidth,"16px");
});

test("screws default on with industrial styling and can be hidden independently", () => {
  const count=widget=>nodes(renderIndustrialGauge({...config,...widget},doc)).filter(n=>n.tag==="circle"&&n.attributes.r==="4").length;
  assert.equal(count({}),4);
  assert.equal(count({industrialScrewsEnabled:false}),0);
  assert.equal(count({industrialScrewsEnabled:true}),4);
  assert.equal(count({industrialStyle:false,industrialScrewsEnabled:true}),0);
  assert.equal(renderIndustrialGauge({...config,industrialScrewsEnabled:false},doc).style.borderWidth,"2px");
});

test("editor remains passive; keyboard and release commit only runtime changes", () => {
  let commits=[]; const context={runtime:true,onCommit:v=>commits.push(v)};
  const editor=renderIndustrialGauge(config,doc,{...context,runtime:false});
  editor.listeners.keydown({key:"ArrowUp"}); assert.deepEqual(commits,[]);
  const root=renderIndustrialGauge(config,doc,context);
  root.listeners.keydown({key:"ArrowDown",preventDefault(){}}); assert.deepEqual(commits,[-1]);
  root.listeners.pointerdown({button:0,pointerId:1,clientX:64,clientY:19,preventDefault(){}});
  assert.equal(commits.length,1); assert.equal(root.dataset.dragging,"true");
  root.listeners.pointerup({pointerId:1,clientX:64,clientY:19}); assert.equal(commits.length,2); assert.equal(root.dataset.dragging,undefined);
});
test("cancel restores local value without committing in release mode", () => {
  let commits=[],values=[]; const root=renderIndustrialGauge(config,doc,{runtime:true,onCommit:v=>commits.push(v),onInput:v=>values.push(v)});
  root.listeners.pointerdown({button:0,pointerId:1,clientX:64,clientY:19,preventDefault(){}});
  root.listeners.pointercancel(); assert.equal(root.dataset.value,"0"); assert.deepEqual(commits,[]); assert.equal(values.at(-1),0);
});
test("industrial values traverse visible and visually hidden dataflow lines", () => {
  const source={...config,id:"source",type:"ugso.industrial/gauge-poti",dataOutputEnabled:true};
  const target={id:"target",dataInputEnabled:true,dockPointsEnabled:true,dock_left_center:true};
  for(const connectionStrokeWidth of [0,2]) {
    const line={id:"wire",type:"svg-connection",startWidgetId:"source",endWidgetId:"target",connectionStrokeWidth};
    assert.equal(widgetInputPacket(target,[source,target,line],{}).value,0);
  }
  assert.equal(widgetValuePacket({...source,entityId:"sensor.temp"},[],{"sensor.temp":{state:"-5"}}).value,"-5");
});
