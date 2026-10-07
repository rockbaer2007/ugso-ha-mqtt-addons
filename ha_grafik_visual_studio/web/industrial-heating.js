import { housingSpace } from "./housing-snap.js";

export const isIndustrialHeating = widget => widget?.type === "ugso.industrial/heating";
export const heatingTemperatureKeys = ["heating", "boiler", "hot", "cold"];
export const heatingStatusKeys = ["pump", "circulation", "burner", "alert"];
export const heatingBindings = widget => [...heatingTemperatureKeys, ...heatingStatusKeys, "tank"].map(key => widget[`${key}EntityId`]).filter(Boolean);
export function heatingSize(widget, changed = "height") {
  const space = housingSpace(widget), gapX = 10 * space, gapY = 6 * space;
  // Preserve the cell size when opening the first, portrait version of the widget.
  const portrait = widget.heatingLayout !== "landscape" && Number(widget.height) > Number(widget.width) && Math.abs((Number(widget.height)-10*space)/6-(Number(widget.width)-6*space)/4)<.6;
  const cell = Math.max(64, Math.min(Math.floor((4096-gapY)/4), Math.floor((4096-gapX)/6), Math.round(portrait ? (Number(widget.width)-6*space)/4 : changed === "width" ? (Number(widget.width)-gapX)/6 : (Number(widget.height || 518)-gapY)/4)));
  return { width: 6*cell+gapX, height: 4*cell+gapY };
}
export function heatingBoolean(value) {
  if (value === true || value === 1 || /^(on|true|1)$/i.test(String(value))) return true;
  if (value === false || value === 0 || /^(off|false|0)$/i.test(String(value))) return false;
  return null;
}
export function heatingModel(widget, states = {}) {
  const result = {}, demo = widget.heatingDemo === true;
  const examples = { heating:55, boiler:65, hot:60, cold:20, tank:65, pump:true, circulation:true, burner:true, alert:false };
  for (const key of [...heatingTemperatureKeys, ...heatingStatusKeys, "tank"]) {
    const id = widget[`${key}EntityId`], record = states[id], raw = id ? record?.state : demo ? examples[key] : undefined;
    const valid = raw !== undefined && raw !== null && String(raw).trim() !== "" && !/^(unknown|unavailable)$/i.test(String(raw));
    const value = heatingStatusKeys.includes(key) ? valid ? heatingBoolean(raw) : null : valid && Number.isFinite(Number(raw)) ? Number(raw) : null;
    result[key] = { value, unit:record?.attributes?.unit_of_measurement || (key === "tank" ? "%" : "°C"), bound:!!id };
  }
  result.tank.level = result.tank.value === null ? null : Math.max(0, Math.min(100, result.tank.value));
  return result;
}
const color = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value || "") ? value : fallback;
export function renderIndustrialHeating(widget, doc, {states = {}, locale = "de"} = {}) {
  const model = heatingModel(widget, states), english = locale.startsWith("en"), root = doc.createElement("div"), style = widget.industrialStyle !== false;
  root.className = "industrial-heating"; root.classList.toggle("industrial-housing", style);
  Object.assign(root.style, {width:"100%",height:"100%",boxSizing:"border-box",position:"relative",overflow:"hidden",background:style?"linear-gradient(135deg,#303d44,#171f24)":"transparent",borderStyle:"solid",borderRadius:`${Math.max(0,Math.min(200,Number(widget.radius??4)||0))}px`,borderColor:color(widget.industrialFrameColor,"#879097"),borderWidth:`${style?widget.industrialFrameWidthEnabled===true?Math.max(1,Math.min(16,Number(widget.industrialFrameWidth)||2)):2:0}px`});
  if(style && widget.industrialScrewsEnabled!==false)for(const corner of ["tl","tr","bl","br"]){const screw=doc.createElement("span");screw.className=`industrial-screw ${corner}`;screw.textContent="×";root.append(screw);}
  const ns = "http://www.w3.org/2000/svg", svg = doc.createElementNS(ns,"svg");
  svg.setAttribute("viewBox","0 0 600 400"); svg.setAttribute("role","img"); svg.style.cssText="width:100%;height:100%;display:block";
  const el = (tag, attrs = {}, parent = svg) => { const node=doc.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));parent.append(node);return node; };
  const text=(value,x,y,size=12,fill="#fff",parent=svg)=>{const node=el("text",{x,y,"font-size":size,"font-family":"system-ui, sans-serif","font-weight":600,fill,"text-anchor":"middle"},parent);node.textContent=value;return node;};
  // All illustration geometry is local SVG; live labels never come from a bitmap.
  const defs=el("defs"), prefix=`heating-${String(widget.id||"preview").replace(/[^a-z0-9_-]/gi,"-")}`;
  for(const [name,stops] of Object.entries({red:["#eb5148","#b82222","#761714"],copper:["#794225","#e1a36b","#a55f32"],metal:["#bdc3c6","#81898e","#d6dadd"],green:["#bbff9b","#56c761","#2d7437"],blue:["#6195ff","#284bdf","#14258a"]})){
    const grad=el("linearGradient",{id:`${prefix}-${name}`,x1:"0",x2:"1",y1:"0",y2:"0"},defs);stops.forEach((fill,index)=>el("stop",{offset:`${index*50}%`,"stop-color":fill},grad));
  }
  const paint=name=>`url(#${prefix}-${name})`, shape=(tag,attrs)=>el(tag,{stroke:"#101416","stroke-width":2,...attrs});
  const pipe=(path,fill,width=9)=>{el("path",{d:path,fill:"none",stroke:"#101416","stroke-width":width+4,"stroke-linejoin":"round","stroke-linecap":"round"});el("path",{d:path,fill:"none",stroke:fill,"stroke-width":width,"stroke-linejoin":"round","stroke-linecap":"round"});};
  const fitting=(x,y)=>shape("rect",{x:x-7,y:y-5,width:14,height:10,rx:2,fill:"#d3b22b"});
  const arrow=(key,x,y,direction,fill)=>{if(widget[`${key}Arrow`]===false)return;const group=el("g",{"data-arrow":key,transform:`translate(${x} ${y}) rotate(${direction})`});el("path",{d:"M-8 -5L2 -5V-9L12 0L2 9V5H-8Z",fill,stroke:"#101416","stroke-width":1},group);};
  // Tank and boiler sit side by side; water pipes end before the tank.
  shape("rect",{x:465,y:75,width:110,height:280,rx:32,fill:paint("copper")});
  shape("ellipse",{cx:520,cy:94,rx:55,ry:20,fill:paint("copper")});
  shape("path",{d:"M465 333Q520 361 575 333",fill:"none",stroke:"#6d3f29"});
  for(const x of [477,550])shape("path",{d:`M${x} 348v21h15v-20`,fill:paint("copper")});
  // Oil pickup originates at tank top and terminates at the burner right side.
  pipe("M520 76V53Q520 43 510 43H460Q450 43 450 53V332Q450 342 440 342H328",paint("copper"),4);
  arrow("oil",385,342,180,"#df9b5c");
  // Left heating circuit: one pump and an elbow to the expansion vessel.
  pipe("M140 179V139Q140 130 131 130H25","#ef342e");
  pipe("M140 195V333Q140 341 151 341H180","#ef342e");
  pipe("M140 267H69Q60 267 60 278V287","#ef342e");
  for(const y of [153,212,267,329])fitting(140,y);
  shape("rect",{x:30,y:287,width:60,height:76,rx:18,fill:paint("red")});
  shape("ellipse",{cx:60,cy:287,rx:30,ry:11,fill:"#ee3e38"});
  el("path",{d:"M30 314Q60 324 90 314M30 327Q60 337 90 327",fill:"none",stroke:"#121619","stroke-width":3});
  // Boiler housing, gray doors, chimney and blue burner.
  shape("path",{d:"M170 153L282 140L310 157V354L273 375L170 353Z",fill:paint("red")});
  shape("path",{d:"M170 153L213 167L310 157M213 167V362",fill:"none",stroke:"#521815"});
  shape("rect",{x:215,y:185,width:91,height:94,rx:5,fill:paint("metal")});
  shape("rect",{x:217,y:286,width:85,height:70,rx:4,fill:paint("metal")});
  for(const y of [197,256])shape("rect",{x:213,y,width:5,height:10,rx:1,fill:"#444b4f"});
  shape("path",{d:"M225 152V100Q225 79 203 79H173V52H208Q251 52 251 99V150Z",fill:paint("metal")});
  shape("ellipse",{cx:173,cy:66,rx:10,ry:20,fill:paint("metal")});
  shape("circle",{cx:258,cy:318,r:22,fill:paint("metal")});
  shape("path",{d:"M256 309L301 315L328 335V367L283 378L254 360Z",fill:paint("blue")});
  shape("path",{d:"M256 309L283 326L328 335M283 326V378",fill:"none",stroke:"#162155"});
  shape("path",{d:"M295 331L314 336L320 346L301 341Z",fill:"#a3b0b9"});
  // Separate hot/cold water connections; no pump or branch on either pipe.
  pipe("M310 175H430","#ef342e"); pipe("M310 285H430","#167dec");
  arrow("hot",430,175,0,"#ef342e"); arrow("cold",430,285,180,"#167dec"); arrow("heating",25,130,180,"#ef342e");
  // Straight vertical circulation pipe and second green pump.
  pipe("M282 142V27","#ef342e");arrow("circulation",282,27,-90,"#ef342e");
  const pump=(x,y)=>{for(const dy of [-22,22])fitting(x,y+dy);shape("ellipse",{cx:x,cy:y,rx:17,ry:20,fill:paint("green")});shape("rect",{x:x-2,y:y-16,width:22,height:32,rx:4,fill:paint("green")});shape("ellipse",{cx:x+20,cy:y,rx:12,ry:16,fill:paint("green")});shape("circle",{cx:x+20,cy:y,r:4,fill:"#23312b"});for(const dy of [-9,-3,3,9])el("path",{d:`M${x} ${y+dy}h13`,stroke:"#3b7043",fill:"none"});};
  pump(140,184);pump(282,80);
  const labels={heating:english?"Heating":"Heizkreis",boiler:english?"Boiler":"Kessel",hot:english?"Hot water":"Warmwasser",cold:english?"Cold water":"Kaltwasser",pump:english?"Pump":"Pumpe",circulation:english?"Circulation":"Zirkulation",burner:english?"Burner":"Brenner",tank:english?"Level":"Füllstand"};
  const panel=(key,x,y,width,height,label,value,fill,status)=>{const group=el("g",{"data-display":key,"data-state":status===null?"unknown":status===true?"on":status===false?"off":"value"});shapePanel(group,x,y,width,height);text(label,x+width/2,y+13,9,"#eef2f4",group);const available=width-(typeof status==="boolean"?28:12),reading=text(value,x+width/2-(typeof status==="boolean"?6:0),y+height-8,13,fill,group);if(String(value).length*8>available){reading.setAttribute("textLength",String(available));reading.setAttribute("lengthAdjust","spacingAndGlyphs");}if(typeof status==="boolean")el("circle",{cx:x+width-9,cy:y+height-13,r:4,fill:status?color(widget.statusOnColor,"#39ed1b"):color(widget.statusOffColor,"#39433d")},group);};
  const shapePanel=(parent,x,y,width,height)=>{el("rect",{x,y,width,height,rx:4,fill:"#15191b",stroke:"#6e7579","stroke-width":2},parent);};
  const temperature=(key,x,y,width)=>{if(widget[`${key}Visible`]===false)return;const entry=model[key],value=entry.value===null?"—":`${entry.value.toLocaleString(english?"en":"de",{maximumFractionDigits:1})} ${entry.unit}`;panel(key,x,y,width,40,labels[key],value,color(widget[`${key}Color`],key==="cold"?"#229dff":"#ff3932"));};
  temperature("heating",25,77,92);temperature("boiler",222,207,57);temperature("hot",335,124,94);temperature("cold",335,233,94);
  const status=(key,x,y,width)=>{if(widget[`${key}Visible`]===false)return;const value=model[key].value,legends={"ein-aus":["EIN","AUS"],"on-off":["ON","OFF"],"one-zero":["1","0"]},pair=legends[widget.statusLegend]||legends["ein-aus"];panel(key,x,y,width,40,labels[key],value===null?"—":pair[value?0:1],value?color(widget.statusOnColor,"#39ed1b"):color(widget.statusOffTextColor,"#a4b1ad"),value);};
  status("pump",26,164,85);status("circulation",327,60,107);status("burner",337,350,94);
  if(widget.alertVisible!==false){const group=el("g",{"data-display":"alert","data-state":model.alert.value===null?"unknown":model.alert.value?"on":"off"});el("path",{d:"M292 218L282 239H302Z",fill:model.alert.value===true?color(widget.alertColor,"#ffcf28"):"#4b5256",stroke:"#15191b","stroke-width":2},group);text(model.alert.value===null?"?":"!",292,237,14,"#15191b",group);const title=el("title",{},group);title.textContent=english?"Fault status":"Störungsstatus";}
  // Live tank gauge: blank when unbound/unavailable, never a fake demo level.
  const gauge=el("g",{"data-display":"tank","data-level":model.tank.level??"unknown"});
  el("rect",{x:500,y:147,width:18,height:145,rx:7,fill:"#171b1d",stroke:"#b9c0c4","stroke-width":3},gauge);
  if(model.tank.level!==null)el("rect",{x:503,y:289-model.tank.level*1.4,width:12,height:model.tank.level*1.4,rx:4,fill:color(widget.tankColor,"#ed9829")},gauge);
  for(const percentage of [0,25,50,75,100]){const y=289-percentage*1.4;el("path",{d:`M520 ${y}h5`,stroke:"#392719","stroke-width":1},gauge);text(`${percentage}%`,548,y+4,9,"#251c16",gauge);}
  panel("tank-value",477,303,86,40,labels.tank,model.tank.value===null?"—":`${model.tank.value.toLocaleString(english?"en":"de",{maximumFractionDigits:1})} %`,color(widget.tankColor,"#ed9829"));
  if(model.tank.bound && model.tank.value!==null && (model.tank.value<0 || model.tank.value>100))root.dataset.levelWarning="out-of-range";
  if(widget.heatingDemo===true && !heatingBindings(widget).length)text("DEMO",70,386,11,"#a7b4ba");
  svg.setAttribute("aria-label",english?"Heating system with temperatures, pump and burner status, fault and tank level":"Heizung mit Temperaturen, Pumpen- und Brennerstatus, Störung und Tankfüllstand");
  root.append(svg);return root;
}
