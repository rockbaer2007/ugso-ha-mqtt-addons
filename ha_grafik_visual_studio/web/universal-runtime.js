import { hsvHex, hexHsv } from './color-picker.js';
export function universalBindings(widget){return [...new Set([widget.entityId,...[widget.defaultState,...(widget.visualStates||[])].flatMap(model=>[model?.colorEntityId,model?.compareSource==='entity'?model.entityId:null])].filter(Boolean))];}
export function universalUrl(value,base) {
  try {const url=new URL(String(value||''),base);return value && ['http:','https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;}catch{return null;}
}
export function embeddedViewUrl(base,project,page,parent,chain=[]) {
  if(!page || page===parent || chain.includes(page) || chain.length>=8) return null;
  const url=new URL(base);for(const key of ['tabsWidget','tabsIndex'])url.searchParams.delete(key);
  for(const [key,value] of Object.entries({mode:'runtime',project,page,embedded:'1',chain:[...chain,parent].join(',')}))url.searchParams.set(key,value);
  return url.href;
}
export function renderUniversalView(doc,model,context) {
  const root=doc.createElement('div');root.className='universal-view';
  const page=context.pages.find(p=>p.id===model.contentPage),url=page && embeddedViewUrl(context.url,context.project, page.id,context.parent,context.chain);
  if(!url){root.textContent=context.text(page?'Rekursive Einbettung verhindert':'Seite auswählen');return root;}
  const frame=doc.createElement('iframe');frame.title=page.name || context.text('Eingebettete Ansicht');frame.src=url;
  if(!context.runtime){frame.inert=true;frame.style.pointerEvents='none';}
  root.append(frame);
  if(model.viewScaleToFit){
    const resize=()=>{const width=Number(page.page?.width)||800,height=Number(page.page?.height)||600,scale=Math.min(root.clientWidth/width,root.clientHeight/height);if(scale>0){frame.style.width=`${width}px`;frame.style.height=`${height}px`;frame.style.transform=`scale(${scale})`;}};
    const observer=new ResizeObserver(()=>{if(!root.isConnected){observer.disconnect();return;}resize();});observer.observe(root);requestAnimationFrame(resize);
  }
  return root;
}
export function openUniversalDialog(doc,widget,context) {
  const dialog=doc.createElement('dialog');dialog.className='studio-dialog universal-dialog';
  const bounded=(v,d,min,max)=>Math.max(min,Math.min(max,Number(v)||d));
  Object.assign(dialog.style,{width:widget.dialogFullscreen?'calc(100vw - 16px)':`${bounded(widget.dialogWidth,800,100,4096)}px`,height:widget.dialogFullscreen?'calc(100dvh - 16px)':`${bounded(widget.dialogHeight,600,100,4096)}px`,padding:`${bounded(widget.dialogPadding,0,0,100)}px`,borderRadius:`${bounded(widget.dialogRadius,0,0,100)}px`});
  if(widget.dialogPosition==='top'){dialog.style.marginTop='8px';dialog.style.marginBottom='auto';}if(widget.dialogPosition==='bottom'){dialog.style.marginBottom='8px';dialog.style.marginTop='auto';}
  const header=doc.createElement('header'),title=doc.createElement('strong'),close=doc.createElement('button');
  title.textContent=widget.dialogTitle||widget.title||context.text('Ansicht im Dialog');close.textContent=context.text('Schließen');close.type='button';close.onclick=()=>dialog.close();header.append(title,close);
  const view=renderUniversalView(doc,{contentPage:widget.targetPage,viewScaleToFit:true},context);dialog.append(header,view);doc.body.append(dialog);
  let timer;
  dialog.addEventListener('close',()=>{clearTimeout(timer);dialog.remove();});
  if(widget.dialogOutsideClose)dialog.addEventListener('click',event=>{const b=dialog.getBoundingClientRect();if(event.target===dialog && (event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom))dialog.close();});
  dialog.showModal();if(Number(widget.dialogAutoClose)>0)timer=setTimeout(()=>{if(dialog.isConnected)dialog.close();},Math.min(86400,Number(widget.dialogAutoClose))*1000);
  return dialog;
}
// Register release on the window before a write can redraw/remove the tile.
export function bindUniversalHold(tile,widget,context) {
  let down=false,release;
  const start=event=>{
    const held=widget.holdValue ?? widget.trueValue,previous=context.actual;
    if(down || !context.ready(held) || !context.ready(previous) || event.type==='pointerdown' && event.button!==0 || event.type==='keydown' && (!['Enter',' '].includes(event.key)||event.repeat))return;
    event.preventDefault();event.stopPropagation();down=true;
    const win=tile.ownerDocument.defaultView;
    release=()=>{if(!down)return;down=false;for(const name of ['pointerup','pointercancel','keyup','blur','pagehide'])win.removeEventListener(name,finish);tile.ownerDocument.removeEventListener('visibilitychange',hidden);context.write(previous);};
    const finish=e=>{if(e.type==='keyup' && !['Enter',' '].includes(e.key))return;release();};
    const hidden=()=>{if(tile.ownerDocument.hidden)release();};
    for(const name of ['pointerup','pointercancel','keyup','blur','pagehide'])win.addEventListener(name,finish);
    tile.ownerDocument.addEventListener('visibilitychange',hidden);context.write(held);
  };
  tile.addEventListener('pointerdown',start);tile.addEventListener('keydown',start);
  tile.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();});
}
export function colorOutput(hex,format='hex',alpha=1) {
  const hsv=hexHsv(hex),rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const saturation=hsv.saturation*hsv.value,lightness=hsv.value-saturation/2,hslS=lightness===0||lightness===1?0:(hsv.value-lightness)/Math.min(lightness,1-lightness);
  const round=n=>Number(n.toFixed(4));
  if(format==='hex8')return hex+Math.round(alpha*255).toString(16).padStart(2,'0');
  if(format==='rgb')return JSON.stringify(rgb);
  if(format==='hsl')return JSON.stringify([round(hsv.hue),round(hslS*100),round(lightness*100)]);
  if(format==='hsv')return JSON.stringify([round(hsv.hue),round(hsv.saturation*100),round(hsv.value*100)]);
  if(format==='cie'){
    const [r,g,b]=rgb.map(v=>v/255).map(v=>v>.04045?((v+.055)/1.055)**2.4:v/12.92),x=.664511*r+.154324*g+.162028*b,y=.283881*r+.668433*g+.047685*b,z=.000088*r+.072310*g+.986039*b,sum=x+y+z;
    return JSON.stringify(sum?[round(x/sum),round(y/sum)]:[0,0]);
  }
  return hex;
}
export function colorInput(value,format='hex') {
  if(/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(String(value)))return String(value).slice(0,7);
  try{
    const values=Array.isArray(value)?value:JSON.parse(String(value));
    if(!Array.isArray(values)||values.length<2||values.some(n=>!Number.isFinite(Number(n))))return null;
    let rgb;
    if(format==='rgb' && values.length>=3)rgb=values.slice(0,3);
    else if(format==='hsv' && values.length>=3)return hsvHex(Number(values[0]),Math.max(0,Math.min(1,values[1]/100)),Math.max(0,Math.min(1,values[2]/100)));
    else if(format==='hsl' && values.length>=3){const s=Math.max(0,Math.min(1,values[1]/100)),l=Math.max(0,Math.min(1,values[2]/100)),v=l+s*Math.min(l,1-l);return hsvHex(Number(values[0]),v?2*(1-l/v):0,v);}
    else if(format==='cie'){
      const [x,y]=values.map(Number);if(x===0&&y===0)return '#000000';if(x<0||y<=0||x+y>1)return null;
      const X=x/y,Z=(1-x-y)/y;
      const linear=[1.656492*X-.354851-.255038*Z,-.707196*X+1.655397+.036152*Z,.051713*X-.121364+1.011530*Z];
      const maximum=Math.max(1,...linear);rgb=linear.map(v=>Math.max(0,v/maximum)).map(v=>255*(v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055));
    }
    return rgb?'#'+rgb.map(n=>Math.max(0,Math.min(255,Math.round(Number(n)))).toString(16).padStart(2,'0')).join(''):null;
  }catch{return null;}
}
export function renderUniversalColor(doc,model,context) {
  const root=doc.createElement('div');root.className='universal-color';
  const entity=model.colorEntityId||context.entityId,entry=context.states[entity];
  let hex=colorInput(entry?.state,model.colorFormat)||'#ff0000';
  if(Array.isArray(entry?.attributes?.rgb_color))hex='#'+entry.attributes.rgb_color.slice(0,3).map(n=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,'0')).join('');
  let alpha=/^#[\da-f]{8}$/i.test(String(entry?.state))?parseInt(entry.state.slice(7,9),16)/255:1;
  const input=doc.createElement('input');input.type='color';input.value=hex;input.setAttribute('aria-label',context.text('Farbe wählen'));root.append(input);
  const enabled=context.runtime && (!entity || /^light\./.test(entity) && entry && !['unknown','unavailable'].includes(entry.state) || /^input_text\./.test(entity) && entry && !['unknown','unavailable'].includes(entry.state));
  input.disabled=!enabled;
  const output=doc.createElement('output');root.append(output);
  const sync=[];let box;const paint=()=>{input.value=hex;output.textContent=colorOutput(hex,model.colorFormat,alpha);if(box)box.style.background=`linear-gradient(to top,black,transparent),linear-gradient(to right,white,hsl(${hexHsv(hex).hue},100%,50%))`;for(const update of sync)update();};
  const write=()=>{if(enabled)context.writeColor(entity,hex,colorOutput(hex,model.colorFormat,alpha));};
  input.addEventListener('input',()=>{hex=input.value;paint();});input.addEventListener('change',write);
  const range=(label,min,max,value,update,commit=write)=>{const row=doc.createElement('label');row.textContent=context.text(label);const field=doc.createElement('input');field.type='range';field.min=min;field.max=max;field.step='1';field.value=value;field.disabled=!enabled;field.addEventListener('input',()=>{update(Number(field.value));paint();});field.addEventListener('change',commit);row.append(field);root.append(row);return field;};
  if(model.colorControl==='wheel'){
    const wheel=doc.createElement('div');wheel.className='universal-color-wheel';wheel.setAttribute('aria-hidden','true');root.prepend(wheel);
    wheel.style.background='radial-gradient(white,transparent 70%),conic-gradient(from 90deg,red,yellow,lime,cyan,blue,magenta,red)';
    bindColorSurface(wheel,event=>{const b=wheel.getBoundingClientRect(),x=event.clientX-b.left-b.width/2,y=event.clientY-b.top-b.height/2,hue=(Math.atan2(y,x)*180/Math.PI+360)%360;hex=hsvHex(hue,Math.min(1,Math.hypot(x,y)/(b.width/2)),hexHsv(hex).value);});
  }else{
    box=doc.createElement('div');box.className='universal-color-box';box.setAttribute('aria-hidden','true');root.prepend(box);
    bindColorSurface(box,event=>{const b=box.getBoundingClientRect();hex=hsvHex(hexHsv(hex).hue,Math.max(0,Math.min(1,(event.clientX-b.left)/b.width)),1-Math.max(0,Math.min(1,(event.clientY-b.top)/b.height)));});
  }
  function bindColorSurface(surface,update){let dragging=false,original;
    surface.addEventListener('pointerdown',event=>{if(!enabled||event.button!==0)return;event.preventDefault();original=hex;dragging=true;surface.setPointerCapture(event.pointerId);update(event);paint();});
    surface.addEventListener('pointermove',event=>{if(dragging){update(event);paint();}});
    surface.addEventListener('pointerup',event=>{if(!dragging)return;dragging=false;update(event);paint();surface.releasePointerCapture(event.pointerId);write();});
    surface.addEventListener('pointercancel',()=>{if(dragging){dragging=false;hex=original;paint();}});
  }
  if(model.colorSliders){
    for(const [label,key,max] of [['Farbton','hue',360],['Sättigung','saturation',100],['Helligkeit','value',100]]){
      const hsv=hexHsv(hex),field=range(label,0,max,key==='hue'?hsv[key]:hsv[key]*100,n=>{const next=hexHsv(hex);next[key]=key==='hue'?n:n/100;hex=hsvHex(next.hue,next.saturation,next.value);});
      sync.push(()=>{const value=hexHsv(hex)[key];field.value=key==='hue'?value:value*100;});
    }
    for(const [i,label] of ['Rot','Grün','Blau'].entries()){
      const field=range(label,0,255,parseInt(hex.slice(i*2+1,i*2+3),16),n=>{const rgb=[1,3,5].map(j=>hex.slice(j,j+2));rgb[i]=n.toString(16).padStart(2,'0');hex='#'+rgb.join('');});
      sync.push(()=>{field.value=parseInt(hex.slice(i*2+1,i*2+3),16);});
    }
  }
  if(model.colorAlpha)range('Alpha',0,100,100,n=>{alpha=n/100;});
  if(model.colorKelvin){let kelvin=4000;const field=range('Kelvin',Number(entry?.attributes?.min_color_temp_kelvin)||2000,Number(entry?.attributes?.max_color_temp_kelvin)||6500,kelvin,n=>{kelvin=n;},()=>{if(enabled && /^light\./.test(entity))context.writeKelvin(entity,kelvin);});field.disabled=!enabled||!/^light\./.test(entity);}
  for(const name of ['click','pointerdown','keydown'])root.addEventListener(name,event=>event.stopPropagation());paint();return root;
}
const clocks=new WeakMap();
export function updateUniversalClocks(doc){for(const node of doc.querySelectorAll('.universal-clock'))clocks.get(node)?.();}
export function renderUniversalClock(doc,model) {
  const ns='http://www.w3.org/2000/svg',root=doc.createElementNS(ns,'svg');root.setAttribute('viewBox','0 0 100 100');root.classList.add('universal-clock');
  const shape=(tag,attrs)=>{const node=doc.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);root.append(node);return node;};
  shape('circle',{cx:50,cy:50,r:48,fill:model.clockFace||'transparent',stroke:model.clockHands||'currentColor'});
  for(let i=0;i<60;i++){const a=i*Math.PI/30,r=i%5?45:42;shape('line',{x1:50+Math.sin(a)*r,y1:50-Math.cos(a)*r,x2:50+Math.sin(a)*47,y2:50-Math.cos(a)*47,stroke:model.clockHands||'currentColor','stroke-width':i%5?.5:1.5});}
  if(model.clockNumbers!==false)for(let i=1;i<=12;i++){const a=i*Math.PI/6,node=shape('text',{x:50+Math.sin(a)*35,y:53-Math.cos(a)*35,'text-anchor':'middle','font-size':8,fill:model.clockHands||'currentColor'});node.textContent=i;}
  const hand=(length,width,color)=>shape('line',{x1:50,y1:50,x2:50,y2:50-length,stroke:color,'stroke-width':width,'stroke-linecap':'round'});
  const hour=hand(23,3,model.clockHands||'currentColor'),minute=hand(32,2,model.clockHands||'currentColor'),second=model.clockSeconds===false?null:hand(38,1,'#e5484d');
  const tick=()=>{const now=new Date(),s=now.getSeconds(),m=now.getMinutes()+s/60,h=now.getHours()%12+m/60;for(const [node,angle] of [[hour,h*30],[minute,m*6],[second,s*6]])node?.setAttribute('transform',`rotate(${angle} 50 50)`);};
  tick();clocks.set(root,tick);return root;
}
