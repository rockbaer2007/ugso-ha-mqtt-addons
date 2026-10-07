import { housingSpace } from "./housing-snap.js";

export const isIndustrialHeating = widget => widget?.type === "ugso.industrial/heating";
export const heatingTemperatureKeys = ["heating", "boiler", "hot", "cold"];
export const heatingStatusKeys = ["pump", "circulation", "burner", "alert"];
export const heatingBindings = widget => [...heatingTemperatureKeys, ...heatingStatusKeys, "tank"].map(key => widget[`${key}EntityId`]).filter(Boolean);
export function heatingSize(widget, changed = "height") {
  const space=housingSpace(widget), width=Number(widget.width), height=Number(widget.height), gapX=12*space, gapY=6*space;
  const portrait=widget.heatingLayout!=="reference" && height>width && Math.abs((height-10*space)/6-(width-6*space)/4)<.6;
  const landscape=widget.heatingLayout!=="reference" && Math.abs((width-10*space)/6-(height-6*space)/4)<.6;
  const previousCell=portrait?(width-6*space)/4:landscape?(height-6*space)/4:null;
  const cell=Math.max(64,Math.min(Math.floor((4096-gapX)/7),Math.floor((4096-gapY)/4),Math.round(previousCell??(changed==="width"?(width-gapX)/7:((height||518)-gapY)/4))));
  return {width:7*cell+gapX,height:4*cell+gapY};
}
export function heatingBoolean(value) {
  if(value===true || value===1 || /^(on|true|1)$/i.test(String(value)))return true;
  if(value===false || value===0 || /^(off|false|0)$/i.test(String(value)))return false;
  return null;
}
export function heatingModel(widget,states={}) {
  const result={},demo=widget.heatingDemo===true,examples={heating:55,boiler:65,hot:60,cold:20,tank:65,pump:true,circulation:true,burner:true,alert:false};
  for(const key of [...heatingTemperatureKeys,...heatingStatusKeys,"tank"]){
    const id=widget[`${key}EntityId`],record=states[id],raw=id?record?.state:demo?examples[key]:undefined;
    const valid=raw!==undefined && raw!==null && String(raw).trim()!=="" && !/^(unknown|unavailable)$/i.test(String(raw));
    result[key]={value:heatingStatusKeys.includes(key)?valid?heatingBoolean(raw):null:valid && Number.isFinite(Number(raw))?Number(raw):null,unit:record?.attributes?.unit_of_measurement || (key==="tank"?"%":"°C"),bound:!!id};
  }
  result.tank.level=result.tank.value===null?null:Math.max(0,Math.min(100,result.tank.value));return result;
}
const color=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(value||"")?value:fallback;
export const HEATING_ART={width:1683,height:935,url:new URL("./assets/industrial/heating-system.png",import.meta.url).href};
export function renderIndustrialHeating(widget,doc,{states={},locale="de"}={}) {
  const model=heatingModel(widget,states),english=locale.startsWith("en"),root=doc.createElement("div"),style=widget.industrialStyle!==false;
  root.className="industrial-heating";root.classList.toggle("industrial-housing",style);
  Object.assign(root.style,{width:"100%",height:"100%",boxSizing:"border-box",position:"relative",overflow:"hidden",background:style?"linear-gradient(135deg,#303d44,#171f24)":"transparent",borderStyle:"solid",borderRadius:`${Math.max(0,Math.min(200,Number(widget.radius??4)||0))}px`,borderColor:color(widget.industrialFrameColor,"#879097"),borderWidth:`${style?widget.industrialFrameWidthEnabled===true?Math.max(1,Math.min(16,Number(widget.industrialFrameWidth)||2)):2:0}px`});
  if(style && widget.industrialScrewsEnabled!==false)for(const corner of ["tl","tr","bl","br"]){const screw=doc.createElement("span");screw.className=`industrial-screw ${corner}`;screw.textContent="×";root.append(screw);}
  const ns="http://www.w3.org/2000/svg",svg=doc.createElementNS(ns,"svg");
  svg.setAttribute("viewBox",`0 0 ${HEATING_ART.width} ${HEATING_ART.height}`);svg.setAttribute("preserveAspectRatio","xMidYMid meet");svg.setAttribute("role","img");svg.style.cssText="width:100%;height:100%;display:block";
  const el=(tag,attrs={},parent=svg)=>{const node=doc.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));parent.append(node);return node;};
  const text=(value,x,y,size,fill,parent=svg)=>{const node=el("text",{x,y,"font-size":size,"font-family":"system-ui,sans-serif","font-weight":600,fill,"text-anchor":"middle"},parent);node.textContent=value;return node;};
  // Background and every overlay share this exact source-pixel coordinate space.
  el("image",{href:HEATING_ART.url,x:0,y:0,width:HEATING_ART.width,height:HEATING_ART.height,preserveAspectRatio:"none","data-heating-art":"reference"});
  const defs=el("defs"),prefix=`heating-${String(widget.id||"preview").replace(/[^a-z0-9_-]/gi,"-")}`;
  const metal=el("linearGradient",{id:`${prefix}-metal`,x1:0,y1:0,x2:1,y2:0},defs);
  for(const [offset,fill] of [[0,"#868b8d"],[.35,"#d0d4d5"],[1,"#92999c"]])el("stop",{offset,"stop-color":fill},metal);
  const labels={heating:english?"Heating":"Heizkreis",boiler:english?"Boiler":"Kessel",hot:english?"Hot water":"Warmwasser",cold:english?"Cold water":"Kaltwasser",pump:english?"Pump":"Pumpe",circulation:english?"Circulation":"Zirkulation",burner:english?"Burner":"Brenner",tank:english?"Level":"Füllstand"};
  const panel=(key,x,y,width,height,label,value,fill,status)=>{
    const group=el("g",{"data-display":key,"data-state":status===null?"unknown":status===true?"on":status===false?"off":"value"});
    el("rect",{x,y,width,height,rx:12,fill:"#121719",stroke:"#15191b","stroke-width":7},group);
    el("rect",{x:x+5,y:y+5,width:width-10,height:height-10,rx:9,fill:"#1b2022",stroke:"#717779","stroke-width":4},group);
    text(label,x+width/2,y+29,22,"#eff3f4",group);
    const boolean=typeof status==="boolean",available=width-(boolean?55:20),reading=text(value,x+width/2-(boolean?12:0),y+height-16,34,fill,group);
    if(String(value).length*21>available){reading.setAttribute("textLength",available);reading.setAttribute("lengthAdjust","spacingAndGlyphs");}
    if(boolean)el("circle",{cx:x+width-23,cy:y+height-29,r:14,fill:status?color(widget.statusOnColor,"#39ed1b"):color(widget.statusOffColor,"#39433d"),stroke:"#101618","stroke-width":2},group);
  };
  const temperature=(key,x,y,width)=>{if(widget[`${key}Visible`]===false)return;const entry=model[key];panel(key,x,y,width,84,labels[key],entry.value===null?"—":`${entry.value.toLocaleString(english?"en":"de",{maximumFractionDigits:1})} ${entry.unit}`,color(widget[`${key}Color`],key==="cold"?"#229dff":"#ff3932"));};
  temperature("heating",120,187,172);temperature("boiler",626,486,142);temperature("hot",960,299,170);temperature("cold",960,558,170);
  const status=(key,x,y,width)=>{if(widget[`${key}Visible`]===false)return;const value=model[key].value,pair={"ein-aus":["EIN","AUS"],"on-off":["ON","OFF"],"one-zero":["1","0"]}[widget.statusLegend]||["EIN","AUS"];panel(key,x,y,width,84,labels[key],value===null?"—":pair[value?0:1],value?color(widget.statusOnColor,"#39ed1b"):color(widget.statusOffTextColor,"#a4b1ad"),value);};
  status("pump",143,391,153);status("circulation",811,171,176);status("burner",944,803,177);
  if(widget.alertVisible!==false){const group=el("g",{"data-display":"alert","data-state":model.alert.value===null?"unknown":model.alert.value?"on":"off"});el("path",{d:"M807 493L772 555H842Z",fill:model.alert.value===true?color(widget.alertColor,"#ffcf28"):"#596165",stroke:"#15191b","stroke-width":5},group);text(model.alert.value===null?"?":"!",807,547,47,"#15191b",group);const title=el("title",{},group);title.textContent=english?"Fault status":"Störungsstatus";}
  const arrow=(key,x,y,rotation,fill)=>{if(widget[`${key}Arrow`]===false)return;const group=el("g",{"data-arrow":key,transform:`translate(${x} ${y}) rotate(${rotation})`});el("path",{d:"M-22 -8H7V-17L29 0L7 17V8H-22Z",fill,stroke:"#1d2325","stroke-width":2},group);};
  arrow("heating",90,293,180,"#fff0ed");arrow("hot",1104,410,0,"#fff0ed");arrow("cold",1104,666,180,"#dfedff");arrow("circulation",733,75,90,"#fff0ed");arrow("oil",1075,782,180,"#ffd2a0");
  const gauge=el("g",{"data-display":"tank","data-level":model.tank.level??"unknown"});
  panel("tank-label",1385,215,161,52,"",labels.tank,"#eef3f5");
  el("rect",{x:1404,y:266,width:122,height:467,rx:19,fill:`url(#${prefix}-metal)`,stroke:"#15191b","stroke-width":5},gauge);
  for(const y of [280,719]){el("circle",{cx:1465,cy:y,r:8,fill:"#858d90",stroke:"#22292c","stroke-width":2},gauge);el("path",{d:`M1460 ${y-4}l10 8m-10 0l10-8`,stroke:"#30383b","stroke-width":2},gauge);}
  el("rect",{x:1437,y:294,width:36,height:406,rx:17,fill:"#111719",stroke:"#e1e4e5","stroke-width":5},gauge);
  if(model.tank.level!==null)el("rect",{x:1443,y:688-model.tank.level*3.73,width:24,height:model.tank.level*3.73,rx:7,fill:color(widget.tankColor,"#ed9829")},gauge);
  for(const percent of [0,25,50,75,100]){const y=688-percent*3.73;el("path",{d:`M1500 ${y}h18`,stroke:"#191c1c","stroke-width":4},gauge);text(`${percent} %`,1570,y+9,24,"#171a1a",gauge);}
  const level=model.tank.level,levelY=level===null?425:Math.max(303,Math.min(660,688-level*3.73-29));
  panel("tank-value",1531,levelY,108,61,"",model.tank.value===null?"—":`${model.tank.value.toLocaleString(english?"en":"de",{maximumFractionDigits:1})} %`,color(widget.tankColor,"#ed9829"));
  if(model.tank.bound && model.tank.value!==null && (model.tank.value<0 || model.tank.value>100))root.dataset.levelWarning="out-of-range";
  if(widget.heatingDemo===true && !heatingBindings(widget).length)text("DEMO",86,908,20,"#a7b4ba");
  svg.setAttribute("aria-label",english?"Heating system with temperatures, pump and burner status, fault and tank level":"Heizung mit Temperaturen, Pumpen- und Brennerstatus, Störung und Tankfüllstand");root.append(svg);return root;
}
