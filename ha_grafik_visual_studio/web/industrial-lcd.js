import { switchBoolean } from "./industrial-switch.js";
import { lcdGlyph } from "./lcd-font.js";

export const isIndustrialLcd = widget => ["ugso.industrial/lcd-20x4","ugso.industrial/lcd-16x2"].includes(widget?.type);
export const lcdDimensions = widget => widget.type === "ugso.industrial/lcd-16x2" ? {columns:16,rows:2,ratio:3,minHeight:64} : {columns:20,rows:4,ratio:3,minHeight:128};
export function lcdSize(widget, changed="height") {
  const {ratio,minHeight}=lcdDimensions(widget);
  const height=Math.max(minHeight,Math.min(Math.floor(4096/ratio),Math.round(changed==="width" ? Number(widget.width)/ratio : Number(widget.height)||minHeight)));
  return {height,width:height*ratio};
}
export const lcdAnchors = [["display-power","E",.5,0]];
export const lcdPortActive = (widget,anchor,side="") => widget.displayInputEnabled===true && anchor==="display-power" && side!=="start";
export const lcdBindings = widget => [widget.displayEntityId,...Array.from({length:lcdDimensions(widget).rows},(_,i)=>widget[`lineEntityId${i+1}`])].filter(Boolean);
export function lcdPower(widget, states={}, input) {
  return widget.displayInputEnabled===true ? switchBoolean(input) : widget.displayEntityId ? switchBoolean(states[widget.displayEntityId]?.state) : widget.displayOn!==false;
}
export function lcdLine(widget, row, states={}) {
  const entity=widget[`lineEntityId${row}`],record=states[entity];
  const raw=entity ? record?.state : widget[`lineText${row}`] || "";
  const missing=raw==null || /^(unknown|unavailable)$/i.test(String(raw));
  let value=missing ? "?" : String(raw);
  const decimals=widget[`lineDecimals${row}`];
  if (!missing && entity && String(raw).trim()!=="" && Number.isFinite(Number(raw)) && decimals!=null && decimals!=="auto")
    value=Number(raw).toFixed(Math.max(0,Math.min(6,Math.trunc(Number(decimals)||0))));
  const unit=widget[`lineUnit${row}`] || (widget[`lineAutoUnit${row}`]!==false ? record?.attributes?.unit_of_measurement : "") || "";
  const text=`${entity ? widget[`lineText${row}`] || "" : ""}${value}${!missing && unit ? ` ${unit}` : ""}`.replace(/[\r\n\t]/g," ").normalize("NFC");
  const {columns}=lcdDimensions(widget),characters=Array.from(text);
  return {text,visible:characters.slice(0,columns).join(""),truncated:characters.length>columns,missing};
}
const safeColor=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(value || "") ? value : fallback;
export function renderIndustrialLcd(widget,doc,{states={},input}={}) {
  const {columns,rows}=lcdDimensions(widget),on=lcdPower(widget,states,input),style=widget.industrialStyle!==false;
  const root=doc.createElement("div");root.className="industrial-lcd";
  root.classList.toggle("industrial-housing",style);root.dataset.power=on===null?"unknown":on?"on":"off";
  root.style.borderRadius=`${Math.max(0,Math.min(200,Number(widget.radius??4)||0))}px`;
  root.style.borderWidth=`${style ? widget.industrialFrameWidthEnabled===true ? Math.max(1,Math.min(16,Number(widget.industrialFrameWidth)||2)) : 2 : 0}px`;
  root.style.borderColor=safeColor(widget.industrialFrameColor,"#879097");
  if(style && widget.industrialScrewsEnabled!==false)for(const corner of ["tl","tr","bl","br"]){const screw=doc.createElement("span");screw.className=`industrial-screw ${corner}`;screw.textContent="×";root.append(screw);}
  const screen=doc.createElement("div");screen.className="industrial-lcd-screen";screen.dataset.mode=widget.lcdColor==="yellow"?"yellow":"blue";
  const svg=doc.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox",`0 0 ${columns*6+2} ${rows*10+2}`);svg.setAttribute("preserveAspectRatio","none");svg.setAttribute("role","img");
  const lines=Array.from({length:rows},(_,i)=>lcdLine(widget,i+1,states));
  svg.setAttribute("aria-label",on===null?"?":on?lines.map(line=>line.visible).join(" / "):"OFF");
  screen.title=on===null?"?":on?lines.map(line=>line.text).join("\n"):"OFF";
  if(on===true)for(let row=0;row<rows;row++){
    const group=doc.createElementNS(svg.namespaceURI,"g");group.dataset.row=String(row+1);group.dataset.text=lines[row].visible;group.dataset.truncated=String(lines[row].truncated);
    Array.from(lines[row].visible).forEach((character,col)=>lcdGlyph(character).forEach((bits,y)=>{for(let x=0;x<5;x++)if(bits & (1<<(4-x))){const dot=doc.createElementNS(svg.namespaceURI,"rect");dot.setAttribute("x",String(1+col*6+x));dot.setAttribute("y",String(1+row*10+y));dot.setAttribute("width",".9");dot.setAttribute("height",".9");group.append(dot);}}));svg.append(group);
  }
  screen.append(svg);root.append(screen);return root;
}
