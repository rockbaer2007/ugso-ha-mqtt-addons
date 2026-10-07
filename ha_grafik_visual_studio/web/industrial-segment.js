import { finite } from "./gauges.js";
import { housingSpace } from "./housing-snap.js";
import { lcdPower } from "./industrial-lcd.js";

export const isIndustrialSegment = widget => ["ugso.industrial/segment-7-led","ugso.industrial/segment-16-led","ugso.industrial/segment-16-lcd"].includes(widget?.type);
export const segmentAnchors = [["value-input","E",0,.5],["display-power","Ein/Aus",.5,0]];
export const segmentPortActive = (widget,anchor,side="") => side!=="start" && (anchor==="value-input" && widget.dataInputEnabled===true || anchor==="display-power" && widget.displayInputEnabled===true);
export function segmentSize(widget,changed="height") {
  const span=Number(widget.segmentSpan)===3?3:4,extra=2*housingSpace(widget)*(span-1);
  const height=Math.max(64,Math.min(Math.floor((4096-extra)/span),Math.round(changed==="width"?(Number(widget.width)-extra)/span:Number(widget.height)||64)));
  return {width:height*span+extra,height,segmentSpan:String(span)};
}
const countOf=widget=>Math.max(1,Math.min(10,Math.trunc(Number(widget.segmentDigits)||6)));
export function segmentModel(widget,states={},input={},powerInput) {
  const seven=widget.type==="ugso.industrial/segment-7-led",count=countOf(widget),entity=states[widget.entityId];
  const raw=widget.dataInputEnabled===true?(input.error?null:input.value):widget.entityId?entity?.state:widget.segmentText;
  const missing=raw==null || /^(unknown|unavailable)$/i.test(String(raw)),value=finite(raw);
  const decimals=Math.max(0,Math.min(count-1,Math.trunc(Number(widget.segmentDecimals)||0)));
  const text=missing?"-".repeat(count):seven?(value==null?"-".repeat(count):value.toFixed(decimals)):String(raw).replace(/[\r\n\t]/g," ").normalize("NFC").toUpperCase();
  const cells=[];
  for(const char of Array.from(text)) {
    if(char==="." && cells.length && !cells.at(-1).point)cells.at(-1).point=true;
    else cells.push({char,point:false});
  }
  const overflow=seven && !missing && value!=null && (cells.length>count || !/^-?\d+(\.\d+)?$/.test(text));
  const visible=overflow?Array.from({length:count},()=>({char:"-",point:false})):cells.slice(0,count);
  while(visible.length<count)visible[seven?"unshift":"push"]({char:seven && widget.segmentLeadingZeros===true && !text.startsWith("-")?"0":" ",point:false});
  const unsupported=seven?false:visible.some(cell=>!Object.hasOwn(SIXTEEN,cell.char) && cell.char!==" ");
  const unit=["W","A","V"].includes(widget.segmentUnit)?widget.segmentUnit:"off";
  const power=lcdPower(widget,states,powerInput),error=missing || seven && value==null?"Kein Eingangswert":overflow?"Zahlenbereich überschritten":unsupported?"Nicht unterstützte Zeichen":"";
  return {seven,count,cells:visible,text,unit,power,error,truncated:!seven && cells.length>count};
}
// Original segment geometry; no third-party font or outlines are embedded.
const SEVEN={"0":"abcdef","1":"bc","2":"abdeg","3":"abcdg","4":"bcfg","5":"acdfg","6":"acdefg","7":"abc","8":"abcdefg","9":"abcdfg","-":"g"," ":""};
// Sixteen independent segments: split top/bottom/middle (6), sides (4),
// four diagonals and two center verticals. Original geometry and alphabet.
const SIXTEEN={
  "0":"abcdefgh","1":"cd","2":"abcijgef","3":"abcdijef","4":"hijcd","5":"abhijdef","6":"abhgijdef","7":"abcd","8":"abcdefghij","9":"abcdhijef",
  A:"abchgdij",B:"abefcdijop",C:"abhgef",D:"abefcdop",E:"abhgefij",F:"abhgij",G:"abhgefdj",H:"hgcdij",I:"abefop",J:"cdgef",K:"hglm",L:"hgef",M:"hgcdkl",N:"hgcdkn",O:"abcdefgh",P:"abchgij",Q:"abcdefghn",R:"abchgijn",S:"abhijdef",T:"abop",U:"hgcdef",V:"hglm",W:"hgcdmn",X:"klmn",Y:"klp",Z:"ablmef",
  "-":"ij","_":"ef"," ":"","?":"abcjp","+":"ijop","/":"lm","\\":"kn",":":"op","=":"ijef","°":"abhcij"
};
const POLYGONS7={a:"3,1 21,1 24,4 21,7 3,7 0,4",b:"25,5 28,8 28,24 25,27 22,24 22,8",c:"25,29 28,32 28,48 25,51 22,48 22,32",d:"3,49 21,49 24,52 21,55 3,55 0,52",e:"-1,29 2,32 2,48 -1,51 -4,48 -4,32",f:"-1,5 2,8 2,24 -1,27 -4,24 -4,8",g:"3,25 21,25 24,28 21,31 3,31 0,28"};
const LINES16={a:[1,3,12,3],b:[14,3,25,3],c:[27,6,27,25],d:[27,31,27,50],e:[14,53,25,53],f:[1,53,12,53],g:[-1,31,-1,50],h:[-1,6,-1,25],i:[2,28,12,28],j:[14,28,24,28],k:[3,7,11,24],l:[23,7,15,24],m:[3,49,11,32],n:[23,49,15,32],o:[13,6,13,24],p:[13,32,13,50]};
const safeColor=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(value||"")?value:fallback;
export function renderIndustrialSegment(widget,doc,{states={},input={},powerInput}={}) {
  const model=segmentModel(widget,states,input,powerInput),root=doc.createElement("div"),style=widget.industrialStyle!==false,lcd=widget.type==="ugso.industrial/segment-16-lcd";
  root.className="industrial-segment";root.classList.toggle("industrial-housing",style);root.dataset.mode=lcd?"lcd":"led";root.dataset.power=model.power===null?"unknown":model.power?"on":"off";root.dataset.error=model.error;root.dataset.text=model.text;
  root.title=model.error || model.text;root.style.borderRadius=`${Math.max(0,Math.min(200,Number(widget.radius??4)||0))}px`;
  root.style.borderWidth=`${style?widget.industrialFrameWidthEnabled===true?Math.max(1,Math.min(16,Number(widget.industrialFrameWidth)||2)):2:0}px`;root.style.borderColor=safeColor(widget.industrialFrameColor,"#879097");
  root.style.setProperty("--segment-color",safeColor(widget.segmentColor,lcd?"#182a15":"#ff3b30"));root.style.setProperty("--segment-background",safeColor(widget.segmentBackground,lcd?"#8a9b61":"#080b0d"));
  if(style && widget.industrialScrewsEnabled!==false)for(const corner of ["tl","tr","bl","br"]){const screw=doc.createElement("span");screw.className=`industrial-screw ${corner}`;screw.textContent="×";root.append(screw);}
  const screen=doc.createElement("div");screen.className="industrial-segment-screen";
  const svg=doc.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox",`-7 -2 ${model.count*39+29} 63`);svg.setAttribute("preserveAspectRatio","none");svg.setAttribute("role","img");svg.setAttribute("aria-label",model.power===true?model.error || `${model.text}${model.unit!=="off"?` ${model.unit}`:""}`:"OFF");
  const element=(tag,attrs)=>{const el=doc.createElementNS(svg.namespaceURI,tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));return el;};
  model.cells.forEach((cell,index)=>{
    const group=element("g",{transform:`translate(${index*39} 0)`});group.dataset.character=cell.char;const active=(model.seven?SEVEN[cell.char]:SIXTEEN[cell.char]) ?? (model.seven?"g":SIXTEEN["?"]);
    for(const [key,shape] of Object.entries(model.seven?POLYGONS7:LINES16)){
      const seg=model.seven?element("polygon",{points:shape}):element("line",{x1:shape[0],y1:shape[1],x2:shape[2],y2:shape[3],"stroke-width":3.5,"stroke-linecap":"butt"});
      seg.setAttribute("class",`segment-element${model.power===true && active.includes(key)?" lit":""}`);group.append(seg);
    }
    const point=element("circle",{cx:32,cy:53,r:2.2,class:`segment-element${model.power===true && cell.point?" lit":""}`});group.append(point);svg.append(group);
  });
  ["W","A","V"].forEach((unit,index)=>{const label=element("text",{x:model.count*39+3,y:14+index*19,class:`segment-unit${model.power===true && model.unit===unit?" lit":""}`});label.textContent=unit;label.dataset.unit=unit;svg.append(label);});
  screen.append(svg);root.append(screen);return root;
}
