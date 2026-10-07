import { finite } from "./gauges.js";
import { housingSpace } from "./housing-snap.js";
const previous = new WeakMap();
export const isIndustrialOdometer = widget => ["ugso.industrial/odometer","ugso.industrial/odometer-slim"].includes(widget?.type);
export const odometerAnchors = [["value-input","E",0,.5]];
export const odometerPortActive = (widget,anchor,side="") => widget.dataInputEnabled===true && anchor==="value-input" && side!=="start";
export function odometerSize(widget,changed="height") {
  const slim=widget.type==="ugso.industrial/odometer-slim",span=Number(widget.odometerSpan)===4?4:3,ratio=span*(slim?2:1),extra=2*housingSpace(widget)*(span-1);
  const height=Math.max(slim?32:64,Math.min(Math.floor((4096-extra)/ratio),Math.round(changed==="width"?(Number(widget.width)-extra)/ratio:Number(widget.height)||(slim?32:64))));
  return {width:height*ratio+extra,height,odometerSpan:span};
}
export function odometerModel(widget,states={},input={}) {
  const integers=Math.max(1,Math.min(12,Math.trunc(Number(widget.odometerDigits)||5))),decimals=Math.max(0,Math.min(6,Math.trunc(Number(widget.odometerDecimals)||0)));
  const bound=widget.dataInputEnabled===true,entity=states[widget.entityId];
  const value=finite(bound?input.error?null:input.value:widget.entityId?entity?.state:widget.state);
  const unit=String(widget.unit || (bound?input.unit:entity?.attributes?.unit_of_measurement) || "");
  const formatted=value==null?"":Math.abs(value).toFixed(decimals),[whole,fraction=""]=formatted.split(".");
  const overflow=value!=null && (!/^\d+$/.test(whole) || whole.length>integers || value<0 && widget.odometerSignEnabled!==true);
  const error=value==null?"Kein Eingangswert":overflow?"Zahlenbereich überschritten":"";
  let digits=value==null?"—".repeat(integers+decimals):overflow?"#".repeat(integers+decimals):whole.padStart(integers,widget.odometerLeadingZeros===false?" ":"0")+fraction;
  const sign=widget.odometerSignEnabled===true?(value!=null && value<0?"−":" "):"";
  const label=error || `${value<0?"−":""}${whole}${decimals?`${widget.odometerSeparator==="dot"?".":","}${fraction}`:""}${unit?` ${unit}`:""}`;
  return {digits,integers,decimals,sign,unit,value,overflow,error,label};
}
const color=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(value || "")?value:fallback;
export function renderIndustrialOdometer(widget,doc,{states={},input={},runtime=false}={}) {
  const model=odometerModel(widget,states,input),root=doc.createElement("div"),style=widget.industrialStyle!==false;
  root.className="industrial-odometer";root.classList.toggle("industrial-housing",style);root.setAttribute("role","img");root.setAttribute("aria-label",model.label);root.title=model.label;
  root.dataset.value=model.value==null?"":String(model.value);root.dataset.error=model.error;
  root.style.borderColor=color(widget.industrialFrameColor,"#879097");root.style.borderWidth=`${style?widget.industrialFrameWidthEnabled===true?Math.max(1,Math.min(16,Number(widget.industrialFrameWidth)||2)):2:0}px`;
  root.style.borderRadius=`${Math.max(0,Math.min(200,Number(widget.radius??4)||0))}px`;
  const digitHeight=Number(widget.height)*.625;
  root.style.setProperty("--digit-height",`${digitHeight}px`);root.style.setProperty("--digit-color",color(widget.valueColor,"#eef2f3"));
  if(style && widget.industrialScrewsEnabled!==false)for(const corner of ["tl","tr","bl","br"]){const screw=doc.createElement("span");screw.className=`industrial-screw ${corner}`;screw.textContent="×";root.append(screw);}
  const window=doc.createElement("div");window.className="industrial-odometer-window";window.setAttribute("aria-hidden","true");
  const characters=[...(model.sign?[model.sign]:[]),...Array.from(model.digits)];
  if(model.decimals)characters.splice((model.sign?1:0)+model.integers,0,widget.odometerSeparator==="dot"?".":",");
  const unitSize=Math.max(6,Math.min(72,Number(widget.valueFontSize)||12)),unitWidth=model.unit?Math.min(Number(widget.width)*.22,model.unit.length*unitSize*.65)+4:0;
  const cellWidth=(Number(widget.width)-36-unitWidth)/(characters.length-(model.decimals?.7:0));
  root.style.setProperty("--digit-scale",String(Math.max(.1,Math.min(1,(cellWidth-2)/(digitHeight*.48)))));
  const last=previous.get(widget);previous.set(widget,characters);
  characters.forEach((char,index)=>{
    const cell=doc.createElement("span");cell.className=/[.,]/.test(char)?"odometer-separator":"odometer-digit";cell.dataset.character=char;
    if(/[0-9]/.test(char)){
      const reel=doc.createElement("span");reel.className="odometer-reel";
      for(const number of "01234567890"){const digit=doc.createElement("span");digit.textContent=number;reel.append(digit);}
      reel.style.transform=`translateY(${-Number(char)*digitHeight}px)`;cell.append(reel);
      const old=last?.[index],motion=doc.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if(runtime && !motion && old!=null && /^[0-9]$/.test(old) && old!==char && typeof reel.animate==="function"){
        const target=old==="9" && char==="0"?10:Number(char);
        reel.animate([{transform:`translateY(${-Number(old)*digitHeight}px)`},{transform:`translateY(${-target*digitHeight}px)`}],{duration:350,easing:"ease-in-out"});
      }
    }else{cell.textContent=char;}
    window.append(cell);
  });
  const unit=doc.createElement("span");unit.className="odometer-unit";unit.textContent=model.unit;unit.style.fontSize=`${Math.max(6,Math.min(72,Number(widget.valueFontSize)||12))}px`;root.append(window,unit);return root;
}
