export const RECENT_WIDGETS_KEY='gvs-recent-widgets-v1';
const clean=types=>Array.isArray(types)?[...new Set(types.filter(type=>typeof type==='string'&&type.length>0&&type.length<=200))].slice(0,12):[];
// Browser-local palette preferences only; never write them into project data.
export function createRecentWidgets(storage){
  let state={types:[],collapsed:false};
  try{const saved=JSON.parse(storage.getItem(RECENT_WIDGETS_KEY));if(saved&&typeof saved==='object')state={types:clean(saved.types),collapsed:saved.collapsed===true};}catch{/* Invalid/unavailable storage leaves project and other preferences untouched. */}
  const persist=()=>{try{storage.setItem(RECENT_WIDGETS_KEY,JSON.stringify(state));}catch{/* Keep the in-memory list when storage is blocked. */}};
  return {get collapsed(){return state.collapsed;},setCollapsed(value){value=Boolean(value);if(value!==state.collapsed){state.collapsed=value;persist();}},
    record(type){if(typeof type!=='string'||!type||type.length>200)return;state.types=clean([type,...state.types]);persist();},
    entries(sets){const catalog=new Map(sets.flatMap(set=>set.widgets.map(definition=>[definition.type,{set,definition}])));return state.types.map(type=>catalog.get(type)).filter(Boolean);}
  };
}
export const recentWidgetText=(key,locale='de')=>({title:{de:'Zuletzt benutzt',en:'Recently used',fr:'Utilisés récemment'},empty:{de:'Noch keine Widgets benutzt.',en:'No widgets used yet.',fr:'Aucun widget utilisé pour le moment.'}}[key]?.[locale]||'');
