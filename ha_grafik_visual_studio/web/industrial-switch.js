const pending=new Set(),failed=new Set();
export const ROCKER_COLORS = ["white", "red", "black", "green"];
export const rockerColor = (widget, channel) => widget?.type === "ugso.industrial/rocker-switch" ? ROCKER_COLORS.includes(widget[`rockerColor${channel}`]) ? widget[`rockerColor${channel}`] : "white" : null;
export const isIndustrialSwitch = widget => ["ugso.industrial/switch", "ugso.industrial/rocker-switch"].includes(widget?.type);
export const switchCount = widget => Math.max(1, Math.min(4, Math.trunc(Number(widget.switchCount) || 1)));
export const switchGap = widget => widget?.type === "ugso.industrial/switch" ? 2*Math.max(0,Math.min(64,Number(widget.housingSpace ?? 1)||0)) : 0;
export function switchSize(widget, changed="height") {
  const count=switchCount(widget), extra=(count-1)*switchGap(widget);
  const height=Math.max(64,Math.min(1024,Math.round(changed==="width" ? (Number(widget.width)-extra)/count : Number(widget.height)||128)));
  return {height,width:height*count+extra};
}
export function switchAnchors(widget) {
  const count=switchCount(widget),{height,width}=switchSize(widget),gap=switchGap(widget);
  return Array.from({length:switchCount(widget)},(_,i)=>[
    [`input-${i+1}`,`E${i+1}`,gap ? (height/2+i*(height+gap))/width : (i+.5)/count,0],
    [`output-${i+1}`,`A${i+1}`,gap ? (height/2+i*(height+gap))/width : (i+.5)/count,1],
  ]).flat();
}
export function switchPortActive(widget, anchor, side="") {
  const match=/^(input|output)-([1-4])$/.exec(anchor || "");
  return !!match && Number(match[2])<=switchCount(widget) && widget[`${match[1]}Dock${match[2]}`]===true && (side!=="start" || match[1]==="output") && (side!=="end" || match[1]==="input");
}
export function switchBoolean(value) {
  if ([true,1,"1","on","true"].includes(value)) return true;
  if ([false,0,"0","off","false"].includes(value)) return false;
  return null;
}
export function switchBindings(widget) {
  return Array.from({length:switchCount(widget)},(_,i)=>[widget[`inputEntityId${i+1}`],widget[`outputEntityId${i+1}`]]).flat().filter(Boolean);
}
export function switchChannel(widget,n,states={},input) {
  const entity=widget[`inputEntityId${n}`] || widget[`outputEntityId${n}`], target=widget[`outputEntityId${n}`] || entity;
  const on=switchBoolean(widget[`inputDock${n}`]===true ? input : entity ? states[entity]?.state : widget[`switchState${n}`] ?? false);
  return {on,target,writable: !target || /^(switch|light|input_boolean)\.[a-z0-9_]+$/.test(target) && switchBoolean(states[target]?.state)!==null};
}
const color=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(value || "") ? value : fallback;
export function renderIndustrialSwitch(widget,doc,{runtime=false,states={},inputs={},onCommit=async()=>{},onSettled=()=>{}}={}) {
  const root=doc.createElement("div");root.className="industrial-switch";root.setAttribute("role","group");
  root.style.gridTemplateColumns=`repeat(${switchCount(widget)},minmax(0,1fr))`;
  const style=widget.industrialStyle!==false;
  root.classList.toggle("industrial-housing",style);
  root.style.borderRadius=`${Math.max(0,Math.min(200,widget.radius==null?4:Number(widget.radius)||0))}px`;
  root.style.borderWidth=`${style ? widget.industrialFrameWidthEnabled===true ? Math.max(1,Math.min(16,Number(widget.industrialFrameWidth)||2)) : 2 : 0}px`;
  root.style.borderColor=color(widget.industrialFrameColor,"#879097");
  if(widget.type==="ugso.industrial/switch"){
    const count=switchCount(widget),{height}=switchSize(widget),inset=Number.parseFloat(root.style.borderWidth)+2;
    root.style.columnGap=`${switchGap(widget)}px`;
    root.style.gridTemplateColumns=Array.from({length:count},(_,i)=>`${height-(count===1?2*inset:i===0||i===count-1?inset:0)}px`).join(" ");
  }
  if(style && widget.industrialScrewsEnabled!==false) for(const corner of ["tl","tr","bl","br"]){const screw=doc.createElement("span");screw.className=`industrial-screw ${corner}`;screw.textContent="×";root.append(screw);}
  for(let n=1;n<=switchCount(widget);n++) {
    const channel=switchChannel(widget,n,states,inputs[n]);
    const cell=doc.createElement("div");cell.className="industrial-switch-cell";cell.dataset.channel=String(n);
    if(widget.type==="ugso.industrial/switch" && switchCount(widget)>1){const inset=Number.parseFloat(root.style.borderWidth)+2;cell.style.transform=`translateX(${n===1?-inset/2:n===switchCount(widget)?inset/2:0}px)`;}
    const led=doc.createElement("span");led.className="industrial-led";led.style.setProperty("--led-color",color(channel.on===true ? widget[`ledOnColor${n}`] : widget[`ledOffColor${n}`],channel.on===true?"#ef5350":"#30383c"));led.classList.toggle("is-on",channel.on===true);led.classList.toggle("is-unknown",channel.on===null);led.setAttribute("aria-hidden","true");
    const label=doc.createElement("span");label.className="industrial-switch-caption";label.textContent=widget[`label${n}`] || `Schalter ${n}`;label.title=label.textContent;label.style.color=color(widget.valueColor,"#dce5e9");label.style.fontSize=`${Math.max(6,Math.min(72,Number(widget.valueFontSize)||12))}px`;
    const key=`${widget.id}:${n}`;
    const button=doc.createElement("button");button.type="button";button.className="industrial-toggle";button.setAttribute("role","switch");button.setAttribute("aria-label",label.textContent);button.setAttribute("aria-checked",String(channel.on===true));button.disabled=!runtime || !channel.writable || channel.on===null || pending.has(key);button.title=failed.has(key)?"Schalten fehlgeschlagen":channel.on===null?"Kein Eingangswert":"";
    const legend={"on-off":["ON","OFF"],"one-zero":["1","0"],"ein-aus":["EIN","AUS"]}[widget[`switchLegend${n}`]] || ["ON","OFF"];
    button.dataset.onLabel=legend[0];button.dataset.offLabel=legend[1];
    const rocker=rockerColor(widget,n);
    if(rocker){
      const art=doc.createElement("img");art.className="industrial-toggle-art industrial-rocker-art";art.src=`assets/industrial/rocker-${rocker==="white"?"gray":rocker}-${channel.on===true?"on":"off"}.png`;art.alt="";art.setAttribute("aria-hidden","true");art.draggable=false;button.append(art);
    }else{
      const art=doc.createElementNS("http://www.w3.org/2000/svg","svg");art.classList.add("industrial-toggle-art");art.setAttribute("viewBox",channel.on===true?"35 75 205 280":"272 75 205 280");art.setAttribute("aria-hidden","true");
      const image=doc.createElementNS("http://www.w3.org/2000/svg","image");image.setAttribute("href","assets/industrial/switch-1.png");image.setAttribute("width","502");image.setAttribute("height","413");art.append(image);button.append(art);
    }
    button.addEventListener("click",async event=>{event.stopPropagation();if(button.disabled || pending.has(key))return;pending.add(key);failed.delete(key);button.disabled=true;try{await onCommit(n,!channel.on,channel.target);}catch{failed.add(key);button.title="Schalten fehlgeschlagen";}finally{pending.delete(key);button.disabled=!runtime || !channel.writable || channel.on===null;onSettled();}});
    cell.append(led,label,button);root.append(cell);
  }
  return root;
}
