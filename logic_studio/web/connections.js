import {analyze} from './core.js?v=0.1.7';

// Both pointer gestures and keyboard/click connections use this gate.
export function connectionCandidate(plan,defs,start,end){
 if(!start||!end||start.side===end.side)throw Error('Ausgang mit Eingang verbinden.');
 const source=start.side==='outputs'?start:end,target=start.side==='inputs'?start:end;
 if(source.block===target.block)throw Error('Keine Verbindung zum selben Baustein.');
 if(plan.links.length>=500)throw Error('Maximal 500 Verbindungen.');
 const link={from:[source.block,source.pin],to:[target.block,target.pin]};
 const candidate={...plan,links:[...plan.links,link]},errors=analyze(candidate,defs,false).errors;
 if(errors.length)throw Error(errors.join(' '));
 return link;
}

export function pinPoint(node,canvas,zoom){
 const r=node.getBoundingClientRect(),c=canvas.getBoundingClientRect();
 return {x:((node.dataset.side==='outputs'?r.right+11*zoom:r.left-11*zoom)-c.left)/zoom,y:(r.top+9*zoom-c.top)/zoom};
}

export function wireDragging({root,canvas,svg,getZoom,validate,commit,report}){
 let drag=null;
 const endpoint=n=>({block:n.dataset.block,pin:n.dataset.pin,side:n.dataset.side});
 const point=n=>pinPoint(n,canvas,getZoom());
 const clear=()=>{drag=null;document.body.classList.remove('wire-dragging');root.querySelectorAll('.pin').forEach(n=>n.classList.remove('wire-source','wire-valid','wire-invalid'));svg.querySelector('.wire-preview')?.remove();};
 const draw=e=>{if(!drag)return;const c=canvas.getBoundingClientRect(),z=getZoom(),a=point(drag.node),b={x:(e.clientX-c.left)/z,y:(e.clientY-c.top)/z};let path=svg.querySelector('.wire-preview');if(!path){path=document.createElementNS('http://www.w3.org/2000/svg','path');path.classList.add('wire-preview');svg.append(path);}const mid=(a.x+b.x)/2;path.setAttribute('d',`M${a.x},${a.y} C${mid},${a.y} ${mid},${b.y} ${b.x},${b.y}`);};
 root.addEventListener('pointerdown',e=>{
  const node=e.target.closest('.pin');if(!node||e.button!==0)return;
  e.preventDefault();e.stopPropagation();clear();drag={node,start:endpoint(node),id:e.pointerId};
  node.setPointerCapture(e.pointerId);node.classList.add('wire-source');document.body.classList.add('wire-dragging');
  for(const other of root.querySelectorAll('.pin')){if(other===node||other.dataset.side===node.dataset.side)continue;try{validate(drag.start,endpoint(other));other.classList.add('wire-valid');}catch{other.classList.add('wire-invalid');}}
  report('Maustaste halten, zum passenden Anschluss ziehen und loslassen. Esc bricht ab.');draw(e);
 });
 root.addEventListener('pointermove',e=>{if(drag?.id===e.pointerId)draw(e);});
 root.addEventListener('pointerup',e=>{
  if(drag?.id!==e.pointerId)return;
  const current=drag,node=document.elementFromPoint(e.clientX,e.clientY)?.closest('.pin');
  if(current.node.hasPointerCapture(e.pointerId))current.node.releasePointerCapture(e.pointerId);
  clear();if(!node||node===current.node){report('Verbindung abgebrochen; kein Zielanschluss.');return;}
  try{commit(validate(current.start,endpoint(node)));}catch(error){report(error.message);}
 });
 root.addEventListener('pointercancel',()=>{if(drag){clear();report('Verbindung abgebrochen.');}});
 root.addEventListener('lostpointercapture',()=>{if(drag)clear();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drag){clear();report('Verbindung abgebrochen.');}});
 return clear;
}
