// One promise per renderer, shared by all visible widgets. No executable package URLs.
export function createRendererLoader(importer,onReady){
  let module=null,pending=null,error=null;
  return {get:()=>module,error:()=>error,load(){if(module)return Promise.resolve(module);if(!pending)pending=importer().then(value=>{module=value;error=null;onReady();return value;}).catch(reason=>{error=reason;pending=null;return null;});return pending;}};
}
