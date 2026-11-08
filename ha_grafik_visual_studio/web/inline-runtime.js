// Isolated runtime: never replace the editor project or its selection/history.
export function createInlineRuntime({save,enter,leave}) {
  let active=false,pending=false;
  return {get active(){return active;},get busy(){return active||pending;},
    async start(){if(active||pending)return false;pending=true;try{if(!await save()){leave();return false;}await enter();active=true;return true;}catch(error){leave();throw error;}finally{pending=false;}},
    stop(){if(pending)return false;if(active){leave();active=false;}return true;}
  };
}
export function previewUrl(base,project,page,tabs){
  const url=new URL('runtime',base);url.search=new URLSearchParams({mode:'runtime',project,page,inlinePreview:'1',...(tabs?{tabsWidget:tabs.ownerId,tabsIndex:String(tabs.index),embedded:'1'}:{})});return url.href;
}
