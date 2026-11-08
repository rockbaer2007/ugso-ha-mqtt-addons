// Independent overview; the React Flow link points to the reference project.
export function overviewPoint(rect,width,height,x,y){
 const scale=Math.min(rect.width/width,rect.height/height);
 const left=rect.left+(rect.width-width*scale)/2,top=rect.top+(rect.height-height*scale)/2;
 return {x:Math.max(0,Math.min(width,(x-left)/scale)),y:Math.max(0,Math.min(height,(y-top)/scale))};
}

export function attachOverview({center,viewport,canvas,nodes,getZoom}){
 const ns='http://www.w3.org/2000/svg',box=document.createElement('figure');box.className='plan-overview';
 const caption=document.createElement('figcaption');caption.textContent='Übersicht';
 const svg=document.createElementNS(ns,'svg');svg.setAttribute('role','button');svg.setAttribute('tabindex','0');
 svg.setAttribute('aria-label','Planübersicht: klicken oder Pfeiltasten zum Navigieren');
 const link=document.createElement('a');link.href='https://reactflow.dev/';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Referenz: React Flow ↗';link.title='React Flow als Referenzprojekt in neuem Tab öffnen. Diese Zeichenfläche ist eine eigene Umsetzung.';
 box.append(caption,svg,link);center.append(box);let frame=0;
 function render(){
  frame=0;const w=canvas.offsetWidth,h=canvas.offsetHeight,z=getZoom();if(!w||!h||!z)return;
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.replaceChildren();
  for(const node of nodes.children){
   const r=document.createElementNS(ns,'rect');r.setAttribute('x',node.offsetLeft);r.setAttribute('y',node.offsetTop);r.setAttribute('width',node.offsetWidth);r.setAttribute('height',node.offsetHeight);r.setAttribute('fill',getComputedStyle(node).getPropertyValue('--accent').trim()||'#398dff');
   r.classList.add('overview-block');if(node.classList.contains('selected'))r.classList.add('overview-selected');svg.append(r);
  }
  const view=document.createElementNS(ns,'rect');view.classList.add('overview-viewport');view.setAttribute('x',viewport.scrollLeft/z);view.setAttribute('y',viewport.scrollTop/z);view.setAttribute('width',Math.min(w-viewport.scrollLeft/z,viewport.clientWidth/z));view.setAttribute('height',Math.min(h-viewport.scrollTop/z,viewport.clientHeight/z));svg.append(view);
 }
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(render);};
 function navigate(e){const p=overviewPoint(svg.getBoundingClientRect(),canvas.offsetWidth,canvas.offsetHeight,e.clientX,e.clientY),z=getZoom();viewport.scrollTo({left:p.x*z-viewport.clientWidth/2,top:p.y*z-viewport.clientHeight/2});schedule();}
 svg.addEventListener('click',navigate);
 svg.addEventListener('keydown',e=>{
  const d={ArrowLeft:[-.5,0],ArrowRight:[.5,0],ArrowUp:[0,-.5],ArrowDown:[0,.5]}[e.key];
  if(d){e.preventDefault();viewport.scrollBy({left:d[0]*viewport.clientWidth,top:d[1]*viewport.clientHeight});}
  else if(e.key==='Home'){e.preventDefault();viewport.scrollTo({left:0,top:0});}
  else if(e.key==='End'){e.preventDefault();viewport.scrollTo({left:viewport.scrollWidth,top:viewport.scrollHeight});}
 });
 const observer=new MutationObserver(schedule);observer.observe(nodes,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});observer.observe(canvas,{attributes:true,attributeFilter:['style']});
 const resize=new ResizeObserver(schedule);resize.observe(viewport);viewport.addEventListener('scroll',schedule,{passive:true});schedule();
 return {refresh:schedule,destroy(){observer.disconnect();resize.disconnect();viewport.removeEventListener('scroll',schedule);cancelAnimationFrame(frame);box.remove();}};
}
