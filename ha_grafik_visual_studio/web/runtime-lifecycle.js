// No page reload on tablet wake: drafts/projects and active writes are preserved.
export function installRuntimeLifecycle({doc=document,win=window,settings,pages,current,navigate,refresh,now=()=>Date.now()}){
  let lastActivity=now(),lastTick=now(),hiddenAt=null,refreshing=false;
  const sync=async()=>{if(refreshing||doc.hidden)return;refreshing=true;try{await refresh();}catch{/* The normal runtime status exposes connection errors. */}finally{refreshing=false;}};
  const home=()=>{const s=settings(),seconds=Number(s.idleHomeSeconds)||0,target=pages().find(p=>p.id===s.idleHomePageId&&p.visible!==false);if(seconds>0&&now()-lastActivity>=seconds*1000&&target&&current()!==target.id&&!doc.querySelector('dialog[open], [data-writing="true"], [data-dragging="true"]'))navigate(target.id);};
  const activity=()=>{home();lastActivity=now();};
  const wake=()=>{if(doc.hidden){hiddenAt=now();return;}const elapsed=hiddenAt===null?0:now()-hiddenAt;hiddenAt=null;lastTick=now();if(settings().refreshOnReturn!==false&&elapsed>0)void sync();home();};
  const resume=()=>{home();if(settings().refreshOnReturn!==false)void sync();};
  for(const event of ['pointerdown','keydown','touchstart'])doc.addEventListener(event,activity,{passive:true});doc.addEventListener('visibilitychange',wake);win.addEventListener('pageshow',resume);win.addEventListener('online',resume);
  const timer=win.setInterval(()=>{const time=now();if(!doc.hidden){if(time-lastTick>15000&&settings().refreshOnReturn!==false)void sync();home();}lastTick=time;},1000);
  return ()=>{win.clearInterval(timer);for(const event of ['pointerdown','keydown','touchstart'])doc.removeEventListener(event,activity);doc.removeEventListener('visibilitychange',wake);win.removeEventListener('pageshow',resume);win.removeEventListener('online',resume);};
}
