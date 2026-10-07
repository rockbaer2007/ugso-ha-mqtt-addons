import { housingSpace } from "./housing-snap.js";

export const isIndustrialHeating = widget => widget?.type === "ugso.industrial/heating";
export const heatingTemperatureKeys = ["heating", "boiler", "hot", "cold"];
export const heatingStatusKeys = ["pump", "circulation", "burner", "alert"];
export const heatingBindings = widget => [...heatingTemperatureKeys, ...heatingStatusKeys, "tank"].map(key => widget[`${key}EntityId`]).filter(Boolean);
export function heatingSize(widget, changed = "height") {
  const space = housingSpace(widget), gapX = 6 * space, gapY = 10 * space;
  const cell = Math.max(64, Math.min(Math.floor((4096-gapY)/6), Math.floor((4096-gapX)/4), Math.round(changed === "width" ? (Number(widget.width)-gapX)/4 : (Number(widget.height || 778)-gapY)/6)));
  return { width: 4*cell+gapX, height: 6*cell+gapY };
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
  svg.setAttribute("viewBox","0 0 400 600"); svg.setAttribute("role","img"); svg.style.cssText="width:100%;height:100%;display:block";
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
  // Copper tank sits behind the independent water pipes; feet remain visible.
  shape("rect",{x:280,y:130,width:106,height:345,rx:34,fill:paint("copper")});
  shape("ellipse",{cx:333,cy:153,rx:53,ry:22,fill:paint("copper")});
  shape("path",{d:"M280 445Q333 477 386 445",fill:"none",stroke:"#6d3f29"});
  for(const x of [290,365])shape("path",{d:`M${x} 463v21h15v-20`,fill:paint("copper")});
  // Oil pickup originates at tank top and terminates at the burner right side.
  pipe("M333 132V105Q333 96 344 96H383Q392 96 392 106V560Q392 568 383 568H278Q268 568 268 557V539",paint("copper"),4);
  arrow("oil",330,568,180,"#df9b5c");
  // Left heating circuit: one pump and an elbow to the expansion vessel.
  pipe("M125 294V214Q125 205 116 205H22","#ef342e");
  pipe("M125 308V493Q125 501 136 501H159","#ef342e");
  pipe("M125 405H60Q51 405 51 416V445","#ef342e");
  for(const y of [266,325,405,489])fitting(125,y);
  shape("rect",{x:23,y:444,width:58,height:92,rx:18,fill:paint("red")});
  shape("ellipse",{cx:52,cy:445,rx:29,ry:11,fill:"#ee3e38"});
  el("path",{d:"M23 475Q52 485 81 475M23 488Q52 498 81 488",fill:"none",stroke:"#121619","stroke-width":3});
  // Boiler housing, gray doors, chimney and blue burner.
  shape("path",{d:"M146 280L241 266L259 285V540L225 558L146 537Z",fill:paint("red")});
  shape("path",{d:"M146 280L176 293L259 285M176 293V550",fill:"none",stroke:"#521815"});
  shape("rect",{x:179,y:319,width:78,height:110,rx:5,fill:paint("metal")});
  shape("rect",{x:181,y:438,width:72,height:89,rx:4,fill:paint("metal")});
  for(const y of [330,401])shape("rect",{x:177,y,width:5,height:10,rx:1,fill:"#444b4f"});
  shape("path",{d:"M183 279V217Q183 194 161 194H131V166H166Q209 166 209 216V277Z",fill:paint("metal")});
  shape("ellipse",{cx:131,cy:180,rx:10,ry:21,fill:paint("metal")});
  shape("circle",{cx:215,cy:485,r:23,fill:paint("metal")});
  shape("path",{d:"M213 477L248 483L268 505V548L231 556L211 539Z",fill:paint("blue")});
  shape("path",{d:"M213 477L231 495L268 505M231 495V556",fill:"none",stroke:"#162155"});
  shape("path",{d:"M240 500L255 505L261 517L246 511Z",fill:"#a3b0b9"});
  // Separate hot/cold water connections; no pump or branch on either pipe.
  pipe("M259 301H376","#ef342e"); pipe("M259 441H376","#167dec");
  arrow("hot",373,301,0,"#ef342e"); arrow("cold",373,441,180,"#167dec"); arrow("heating",24,205,180,"#ef342e");
  // Straight vertical circulation pipe and second green pump.
  pipe("M239 269V135","#ef342e");arrow("circulation",239,131,-90,"#ef342e");
  const pump=(x,y)=>{for(const dy of [-22,22])fitting(x,y+dy);shape("ellipse",{cx:x,cy:y,rx:17,ry:20,fill:paint("green")});shape("rect",{x:x-2,y:y-16,width:22,height:32,rx:4,fill:paint("green")});shape("ellipse",{cx:x+20,cy:y,rx:12,ry:16,fill:paint("green")});shape("circle",{cx:x+20,cy:y,r:4,fill:"#23312b"});for(const dy of [-9,-3,3,9])el("path",{d:`M${x} ${y+dy}h13`,stroke:"#3b7043",fill:"none"});};
  pump(125,298,"pump");pump(239,195,"circulation");
  const labels={heating:english?"Heating":"Heizkreis",boiler:english?"Boiler":"Kessel",hot:english?"Hot water":"Warmwasser",cold:english?"Cold water":"Kaltwasser",pump:english?"Pump":"Pumpe",circulation:english?"Circulation":"Zirkulation",burner:english?"Burner":"Brenner",tank:english?"Level":"Füllstand"};
  const panel=(key,x,y,width,height,label,value,fill,status)=>{const group=el("g",{"data-display":key,"data-state":status===null?"unknown":status===true?"on":status===false?"off":"value"});shapePanel(group,x,y,width,height);text(label,x+width/2,y+13,9,"#eef2f4",group);const available=width-(typeof status==="boolean"?28:12),reading=text(value,x+width/2-(typeof status==="boolean"?6:0),y+height-8,13,fill,group);if(String(value).length*8>available){reading.setAttribute("textLength",String(available));reading.setAttribute("lengthAdjust","spacingAndGlyphs");}if(typeof status==="boolean")el("circle",{cx:x+width-9,cy:y+height-13,r:4,fill:status?color(widget.statusOnColor,"#39ed1b"):color(widget.statusOffColor,"#39433d")},group);};
  const shapePanel=(parent,x,y,width,height)=>{el("rect",{x,y,width,height,rx:4,fill:"#15191b",stroke:"#6e7579","stroke-width":2},parent);};
  const temperature=(key,x,y,width)=>{if(widget[`${key}Visible`]===false)return;const entry=model[key],value=entry.value===null?"—":`${entry.value.toLocaleString(english?"en":"de",{maximumFractionDigits:1})} ${entry.unit}`;panel(key,x,y,width,40,labels[key],value,color(widget[`${key}Color`],key==="cold"?"#229dff":"#ff3932"));};
  temperature("heating",20,151,87);temperature("boiler",182,345,53);temperature("hot",284,247,91);temperature("cold",284,390,91);
  const status=(key,x,y,width)=>{if(widget[`${key}Visible`]===false)return;const value=model[key].value,legends={"ein-aus":["EIN","AUS"],"on-off":["ON","OFF"],"one-zero":["1","0"]},pair=legends[widget.statusLegend]||legends["ein-aus"];panel(key,x,y,width,40,labels[key],value===null?"—":pair[value?0:1],value?color(widget.statusOnColor,"#39ed1b"):color(widget.statusOffTextColor,"#a4b1ad"),value);};
  status("pump",22,280,77);status("circulation",281,176,100);status("burner",280,520,92);
  if(widget.alertVisible!==false){const group=el("g",{"data-display":"alert","data-state":model.alert.value===null?"unknown":model.alert.value?"on":"off"});el("path",{d:"M245 356L236 375H254Z",fill:model.alert.value===true?color(widget.alertColor,"#ffcf28"):"#4b5256",stroke:"#15191b","stroke-width":2},group);text(model.alert.value===null?"?":"!",245,373,14,"#15191b",group);const title=el("title",{},group);title.textContent=english?"Fault status":"Störungsstatus";}
  // Live tank gauge: blank when unbound/unavailable, never a fake demo level.
  const gauge=el("g",{"data-display":"tank","data-level":model.tank.level??"unknown"});
  el("rect",{x:304,y:315,width:15,height:65,rx:6,fill:"#171b1d",stroke:"#b9c0c4","stroke-width":3},gauge);
  if(model.tank.level!==null)el("rect",{x:307,y:378-model.tank.level*.6,width:9,height:model.tank.level*.6,rx:3,fill:color(widget.tankColor,"#ed9829")},gauge);
  for(const percentage of [0,25,50,75,100]){const y=378-percentage*.6;el("path",{d:`M321 ${y}h5`,stroke:"#392719","stroke-width":1},gauge);text(`${percentage}%`,348,y+4,9,"#251c16",gauge);}
  panel("tank-value",289,466,89,40,labels.tank,model.tank.value===null?"—":`${model.tank.value.toLocaleString(english?"en":"de",{maximumFractionDigits:1})} %`,color(widget.tankColor,"#ed9829"));
  if(model.tank.bound && model.tank.value!==null && (model.tank.value<0 || model.tank.value>100))root.dataset.levelWarning="out-of-range";
  if(widget.heatingDemo===true && !heatingBindings(widget).length)text("DEMO",200,580,11,"#a7b4ba");
  svg.setAttribute("aria-label",english?"Heating system with temperatures, pump and burner status, fault and tank level":"Heizung mit Temperaturen, Pumpen- und Brennerstatus, Störung und Tankfüllstand");
  root.append(svg);return root;
}
