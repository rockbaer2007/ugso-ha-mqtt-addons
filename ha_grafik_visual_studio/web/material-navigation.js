import { el, image, bounded, number as n, condition } from './material-common.js';

const controllers = new Map();
export function materialViewIndex(value) { if ([false,'false','off'].includes(value)) return 0; if ([true,'true','on'].includes(value)) return 1; const index=Number(value);return value!=='' && Number.isInteger(index) && index>=0 ? index : -1; }
export function materialSelectedViews(w,value,views) {
  if(w.layoutKind!=='view')return views;
  if(w.viewSelectionMode==='name')return views.filter(view=>view.id===String(value)).slice(0,1);
  if(w.viewSelectionMode==='index')return views.filter((_,i)=>i===materialViewIndex(value));
  const mapped=typeof value==='boolean' || ['true','false','on','off'].includes(value)?String(materialViewIndex(value)):String(value);
  return views.filter(view=>String(view.value)===mapped).slice(0,1);
}
export function cleanupMaterialNavigation(surface,ids) {const live=new Set(ids);for(const [key,c] of controllers)if(c.surface!==surface || !live.has(c.id)){c.frames.clear();c.observer?.disconnect();controllers.delete(key);}}
export function renderMaterialNavigation(root,w,value,doc,context,commit) {
  if(w.materialKind!=='layout')return false;
  const key=`${context.surface || ''}/${w.id}`,c=controllers.get(key)||{surface:context.surface,id:w.id,frames:new Map(),open:false};controllers.set(key,c);
  if(c.runtime!==context.runtime){c.frames.clear();c.grid=null;c.root=null;c.signature=null;c.runtime=context.runtime;}
  const signature=JSON.stringify([Object.fromEntries(Object.entries(w).filter(([key])=>key!=='state')),context.language,context.runtime]);
  if(w.layoutKind!=='navigation' && context.runtime){if(c.root && c.signature===signature){c.root.style.cssText=root.style.cssText;root=c.root;}else{c.frames.clear();c.root=root;c.grid=null;c.signature=signature;}}
  root.dataset.materialNavigationId=w.id;
  const views=Array.from({length:bounded(w.countViews,3,1,10)},(_,i)=>({index:i,id:w[`targetPage${i}`],url:context.pageUrl?.(w[`targetPage${i}`]),label:w[`viewLabel${i}`],value:w[`viewValue${i}`],height:w[`viewHeight${i}`],icon:w[`viewIcon${i}`],parent:w[`viewParent${i}`]}));
  if(w.layoutKind==='view' && w.viewSelectionMode==='name' && !views.some(view=>view.id===String(value)) && context.pageUrl?.(String(value)))views.push({index:'dynamic',id:String(value),value:String(value),url:context.pageUrl(String(value)),label:context.pageLabel?.(String(value)) || String(value)});
  if(w.layoutKind==='navigation') {
    if(w.navigationMode!=='state'){const heading=el(doc,'h3',w.labelText),nav=el(doc,'nav');for(const view of views){const button=el(doc,'button',view.label);button.disabled=!context.runtime || !view.url;button.addEventListener('click',()=>context.navigate?.(view.url));nav.append(button);}root.append(heading,nav);return true;}
    const selected=Math.max(0,materialViewIndex(value)),bar=el(doc,'header',null,'material-top-app-bar'),drawer=el(doc,'nav',null,'material-drawer'),toggle=el(doc,'button','☰','material-drawer-toggle');toggle.type='button';toggle.setAttribute('aria-label',context.text('Menü öffnen'));toggle.disabled=!context.runtime;
    bar.style.backgroundColor=w.colorTopAppBarBackground || 'var(--material-primary)';bar.style.color=w.colorTopAppBarTitle || 'var(--material-on-primary)';bar.style.minHeight=`${bounded(w.topAppBarHeight,64,32,128)}px`;
    const chosen=views[selected],heading=el(doc,'span',w.showSelectedItemAsTitle && chosen?chosen.label:w.labelText);bar.append(toggle,heading);root.append(bar,drawer);
    drawer.style.width=`${bounded(w.drawerWidth,260,120,600)}px`;drawer.style.backgroundColor=w.colorDrawerBackground || 'var(--material-surface)';
    if(w.drawerHeader)drawer.append(el(doc,'strong',w.drawerHeader,'material-drawer-header'));
    const expanded=new Set(c.expanded||[]);
    for(const view of views){const button=el(doc,'button',null,'material-drawer-item');button.type='button';if(view.icon)button.append(image(doc,view.icon,24,null,context));button.append(el(doc,'span',view.label));button.setAttribute('aria-current',view.index===selected?'page':'false');button.disabled=!context.runtime;
      if(view.parent!==''){button.classList.add('material-drawer-subitem');button.hidden=!expanded.has(Number(view.parent));}
      const children=views.some(v=>String(v.parent)===String(view.index));if(children)button.setAttribute('aria-expanded',String(expanded.has(view.index)));
      button.addEventListener('click',async()=>{if(children){expanded.has(view.index)?expanded.delete(view.index):expanded.add(view.index);c.expanded=[...expanded];for(const [i,node] of [...drawer.querySelectorAll('.material-drawer-item')].entries())if(views[i].parent!=='')node.hidden=!expanded.has(Number(views[i].parent));button.setAttribute('aria-expanded',String(expanded.has(view.index)));}if(!children || w.selectParentItems){if(await commit(view.index)){if(w.selectedItemNameEntityId)await commit(view.label,{...w,entityId:w.selectedItemNameEntityId,entityAttribute:''});c.open=false;update();}}});drawer.append(button);
    }
    const update=()=>{const permanent=w.drawerLayout==='permanent' || w.drawerLayout==='auto' && doc.defaultView.innerWidth>=bounded(w.permanentIfResolutionHigherThan,800,200,3000);drawer.hidden=!permanent && !c.open;root.classList.toggle('material-drawer-permanent',permanent);toggle.hidden=permanent;toggle.setAttribute('aria-expanded',String(!drawer.hidden));};
    toggle.addEventListener('click',()=>{c.open=!c.open;update();});update();return true;
  }
  const grid=c.grid || el(doc,'div',null,`material-view-grid material-view-${w.layoutKind}`);c.grid=grid;if(grid.parentElement!==root)root.append(grid);
  const resize=()=>{const width=root.clientWidth || doc.defaultView.innerWidth;const columns=width<bounded(w.responsiveBreakpoint,600,100,3000)?bounded(w.mobileColumns,1,1,12):width<bounded(w.tabletBreakpoint,1000,100,3000)?bounded(w.tabletColumns,w.gridColumns || 2,1,12):bounded(w.gridColumns,2,1,12);grid.style.setProperty('--material-columns',String(columns));grid.style.gap=`${bounded(w.viewGap,12,0,100)}px`;};resize();c.observer?.disconnect();if(doc.defaultView.ResizeObserver){c.observer=new doc.defaultView.ResizeObserver(resize);c.observer.observe(root);}
  const selected=materialSelectedViews(w,value,views),persistent=w.persistent || w.renderAlways;
  const mounted=persistent && w.layoutKind==='view'?views:selected;
  for(const view of mounted){
    const width=doc.defaultView.innerWidth;if(width<n(w[`viewMinWidth${view.index}`],0) || width>n(w[`viewMaxWidth${view.index}`],Infinity))continue;
    const visibility=w[`viewVisibilityEntityId${view.index}`];if(visibility && !condition(context.states?.[visibility]?.state,w[`viewVisibilityCondition${view.index}`] || '==',w[`viewVisibilityValue${view.index}`]))continue;
    let card=c.frames.get(view.index);if(!card || card.dataset.url!==String(view.url)){card=el(doc,'section',null,'material-view-section');card.dataset.url=String(view.url);const heading=el(doc,'h4',view.label);card.append(heading);if(view.url && context.runtime){const frame=el(doc,'iframe');frame.title=view.label || context.text('Studio-Seite');frame.src=view.url;frame.style.height=`${bounded(view.height,n(w.childHeight,240),100,3000)}px`;card.append(frame);}else card.append(el(doc,'p',context.text(view.url?'Ansicht in der Runtime':'Andere Studio-Seite auswählen.')));c.frames.set(view.index,card);}
    card.hidden=w.layoutKind==='view' && !selected.includes(view);if(w.showViewTitle===false)card.querySelector('h4').hidden=true;
    if(w.fadeInDuration)card.style.animation=`material-view-in ${bounded(w.fadeInDuration,200,0,3000)}ms ease`;if(card.parentElement!==grid)grid.append(card);
  }
  if(!persistent)for(const index of [...c.frames.keys()])if(!mounted.some(view=>view.index===index)){c.frames.get(index).remove();c.frames.delete(index);}
  root.querySelectorAll('.material-widget-message').forEach(node=>node.remove());if(!selected.length && w.hideErrorMessage!==true)root.append(el(doc,'p',context.text('Keine Ansicht für diesen Zustand.'),'material-widget-message'));return root;
}
