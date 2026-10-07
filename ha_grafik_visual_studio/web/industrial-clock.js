import { housingSpace } from "./housing-snap.js";
import { lcdPower } from "./industrial-lcd.js";
import { sevenSegmentGeometry } from "./industrial-segment.js";

const clocks=new WeakMap();
export const isIndustrialClock=widget=>widget?.type==="ugso.industrial/clock";
export const clockMode=widget=>["led","lcd"].includes(widget.clockMode)?widget.clockMode:"nixie";
export const clockAnchors=[["display-power","Ein/Aus",.5,0]];
export const clockPortActive=(widget,anchor,side="")=>widget.displayInputEnabled===true && anchor==="display-power" && side!=="start";
export function clockSize(widget,changed="height") {
  const mode=clockMode(widget),span=widget.clockSeconds===false?3:4,extra=2*housingSpace(widget)*(span-1),minimum=mode==="nixie"?64:32;
  const height=Math.max(minimum,Math.min(Math.floor((4096-extra)/span),Math.round(changed==="width"?(Number(widget.width)-extra)/span:Number(widget.height)||(mode==="nixie"?128:64))));
  return {width:height*span+extra,height};
}
export function clockText(widget,now=new Date()) {
  if(!(now instanceof Date) || !Number.isFinite(now.getTime()))return widget.clockSeconds===false?"--:--":"--:--:--";
  let hour,minute,second;
  if(widget.clockZone==="UTC"){hour=now.getUTCHours();minute=now.getUTCMinutes();second=now.getUTCSeconds();}
  else if(widget.clockZone==="Europe/Berlin"){
    const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Berlin",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(now);
    const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));hour=values.hour;minute=values.minute;second=values.second;
  }else{hour=now.getHours();minute=now.getMinutes();second=now.getSeconds();}
  const pad=value=>String(value).padStart(2,"0");
  return `${pad(hour)}:${pad(minute)}${widget.clockSeconds===false?"":`:${pad(second)}`}`;
}
// Original rounded wire paths, independent from the supplied OmniGraffle stencil.
const WIRES={
  "0":"M13 13C1 13 1 48 13 48C25 48 25 13 13 13Z",
  "1":"M8 21L14 13V48M8 48H21",
  "2":"M3 21C3 9 24 10 24 21C24 29 3 35 3 48H24",
  "3":"M4 16C14 8 25 14 23 23C22 28 15 30 10 30M10 30C27 26 29 47 14 48C8 49 4 45 3 42",
  "4":"M19 48V13L3 36H25",
  "5":"M24 13H5L4 29C24 23 30 41 20 47C12 51 4 46 3 42",
  "6":"M22 14C6 7 0 34 5 44C13 55 28 44 23 34C18 24 5 29 4 36",
  "7":"M3 13H25L10 48",
  "8":"M13 30C-3 23 4 10 14 13C29 16 23 27 13 30C-4 36 3 51 15 48C28 46 28 35 13 30Z",
  "9":"M5 47C21 54 29 24 22 16C11 5 -1 20 5 28C12 37 23 29 24 23",
  "-":"M5 31H23"
};
const safeColor=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(value||"")?value:fallback;
export function updateIndustrialClocks(doc,now=new Date()) {
  for(const root of doc.querySelectorAll(".industrial-clock"))clocks.get(root)?.update(now);
}
export function renderIndustrialClock(widget,doc,{states={},powerInput,now=new Date()}={}) {
  const mode=clockMode(widget),power=lcdPower(widget,states,powerInput),style=widget.industrialStyle!==false;
  const root=doc.createElement("div");root.className="industrial-clock";root.dataset.mode=mode;root.dataset.power=power===null?"unknown":power?"on":"off";root.classList.toggle("industrial-housing",style);
  root.style.borderRadius=`${Math.max(0,Math.min(200,Number(widget.radius??4)||0))}px`;
  root.style.borderWidth=`${style?widget.industrialFrameWidthEnabled===true?Math.max(1,Math.min(16,Number(widget.industrialFrameWidth)||2)):2:0}px`;root.style.borderColor=safeColor(widget.industrialFrameColor,"#879097");
  root.style.setProperty("--clock-color",mode==="nixie"?"#ff9b36":safeColor(widget[mode==="lcd"?"clockLcdColor":"clockLedColor"],mode==="lcd"?"#182a15":"#ff3b30"));
  root.style.setProperty("--clock-background",mode==="lcd"?safeColor(widget.clockLcdBackground,"#8a9b61"):"#080b0d");
  if(style && widget.industrialScrewsEnabled!==false)for(const corner of ["tl","tr","bl","br"]){const screw=doc.createElement("span");screw.className=`industrial-screw ${corner}`;screw.textContent="×";root.append(screw);}
  const screen=doc.createElement("div");screen.className="industrial-clock-screen";
  const svg=doc.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("role","img");svg.setAttribute("preserveAspectRatio","xMidYMid meet");screen.append(svg);root.append(screen);
  const element=(tag,attrs={})=>{const el=doc.createElementNS(svg.namespaceURI,tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));return el;};
  let previous="";
  const update=date=>{
    const text=clockText(widget,date),blink=widget.clockBlink!==false && Number.isFinite(date.getTime()) && date.getSeconds()%2===1,key=`${text}:${blink}`;
    if(key===previous)return;previous=key;root.dataset.time=text;root.title=text;svg.setAttribute("aria-label",power===true?text:"OFF");svg.replaceChildren();
    const count=widget.clockSeconds===false?4:6,cols=count+(count/2-1)*.35;
    svg.setAttribute("viewBox",mode==="nixie"?`-5 -6 ${cols*42+4} 90`:`-7 -2 ${cols*39+1} 61`);
    let cursor=0;
    for(const char of text){
      if(char===":"){
        const group=element("g",{class:`clock-colon${power===true && !blink?" lit":""}`});
        for(const cy of mode==="nixie"?[29,46]:[20,38])group.append(element("circle",{cx:cursor+5,cy,r:mode==="nixie"?2:2.5}));
        svg.append(group);cursor+=(mode==="nixie"?42:39)*.35;continue;
      }
      const group=element("g",{transform:`translate(${cursor} 0)`,class:mode==="nixie"?"clock-tube":"clock-digit"});group.dataset.character=char;
      if(mode==="nixie"){
        group.append(element("rect",{x:-3,y:5,width:34,height:64,rx:14,class:"nixie-glass"}));
        group.append(element("path",{d:"M10 5L12 0H16L18 5",class:"nixie-tip"}));
        for(let y=16;y<62;y+=5)group.append(element("path",{d:`M0 ${y}H28`,class:"nixie-mesh"}));
        for(let x=2;x<29;x+=5)group.append(element("path",{d:`M${x} 14V63`,class:"nixie-mesh"}));
        for(const digit of "0123456789")group.append(element("path",{d:WIRES[digit],class:"nixie-wire inactive"}));
        group.append(element("path",{d:WIRES[char]||WIRES["-"],class:`nixie-wire${power===true?" lit":""}`}));
        group.append(element("path",{d:"M1 13C0 9 5 8 9 8M1 17V49",class:"nixie-reflection"}));
        group.append(element("rect",{x:-3,y:65,width:34,height:8,rx:2,class:"nixie-base"}));
        for(let x=2;x<=26;x+=6)group.append(element("path",{d:`M${x} 73V79`,class:"nixie-pin"}));
      }else{
        const active=sevenSegmentGeometry.patterns[char]||"g";
        for(const [id,points] of Object.entries(sevenSegmentGeometry.polygons))group.append(element("polygon",{points,class:`clock-segment${power===true && active.includes(id)?" lit":""}`}));
      }
      svg.append(group);cursor+=mode==="nixie"?42:39;
    }
  };
  clocks.set(root,{update});update(now);return root;
}
