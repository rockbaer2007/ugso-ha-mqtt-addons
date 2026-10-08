// Independent Studio implementation inspired by xBourner/calendar-card-plus (MIT).
import {calendarDate, calendarIso} from './calendar-widget.js';
export const isCalendarPlus = widget => widget.type === 'ugso.calendar-plus/calendar';
export function calendarPlusTileLayout(widget) {
  const [width,height,defaultTop,defaultBottom]={tiny:[36,44,12,24],small:[44,52,12,24],medium:[58,64,13,30],large:[76,82,15,40]}[widget.calendarIconSize]||[58,64,13,30];
  const requested=(value,fallback,max)=>Number.isFinite(Number(value))&&Number(value)>0?Math.max(8,Math.min(max,Number(value))):fallback;
  const top=Math.min(requested(widget.calendarTileTopFontSize,defaultTop,72),(height/3-2)/1.05);
  const headerHeight=Math.min(height/3,top*1.05+2);
  const bodyHeight=height-headerHeight;
  // Leave glyph overhang space for larger digits while retaining readable 24px tiny defaults.
  const bottom=Math.min(requested(widget.calendarTileBottomFontSize,defaultBottom,120),bodyHeight/1.2,Math.max(24,(bodyHeight-3)/1.2),(width-4)/1.3);
  return {width,height,top,bottom,headerHeight};
}
export function calendarPlusInk(color) {
  const hex=/^#([0-9a-f]{6})$/i.exec(color||'');
  if(!hex)return '#fff';
  const channels=[0,2,4].map(index=>{const c=parseInt(hex[1].slice(index,index+2),16)/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});
  return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722>.179?'#18212b':'#fff';
}
export const calendarPlusKey = (id,field) => `cp${field}_${id.replace('.', '_')}`;
let catalog=[], catalogTime=0, catalogPending=null;
export const calendarPlusCatalog = () => catalog;
export function calendarPlusSources(widget, entities=catalog, includeHidden=false) {
  return entities.map((entity,index)=>({entityId:entity.entity_id,label:entity.name||entity.entity_id,
    enabled:widget[calendarPlusKey(entity.entity_id,'Enabled')]!==false,
    color:widget[calendarPlusKey(entity.entity_id,'Color')]||['#e85b64','#ff9f24','#36a7e8','#73bc50','#b689ed'][index%5],
    background:widget[calendarPlusKey(entity.entity_id,'Background')]||''})).filter(source=>includeHidden||source.enabled);
}
export function calendarPlusDiscover(data) {
  const states=new Map((data.states||[]).map(entity=>[entity.entity_id,entity]));
  const found=new Map();
  for(const entity of [...(data.states||[]),...(data.entities||[])]) {
    if(!/^calendar\.[a-z0-9_]+$/.test(entity.entity_id))continue;
    if(entity.disabled_by){found.delete(entity.entity_id);continue;}
    found.set(entity.entity_id,{entity_id:entity.entity_id,name:states.get(entity.entity_id)?.attributes?.friendly_name||entity.name_by_user||entity.name||entity.attributes?.friendly_name||entity.entity_id});
  }
  return [...found.values()].sort((a,b)=>a.entity_id.localeCompare(b.entity_id));
}
async function discoverCalendars(force=false,onChange=()=>{}) {
  if(!force&&catalogTime&&Date.now()-catalogTime<60000)return catalog;
  if(catalogPending)return catalogPending;
  catalogPending=(async()=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try {
      const response=await fetch('api/entities',{cache:'no-store',signal:controller.signal}),data=await response.json();
      if(!response.ok||!Array.isArray(data.entities)||!Array.isArray(data.states))throw new Error('calendar discovery failed');
      const next=calendarPlusDiscover(data),changed=JSON.stringify(next)!==JSON.stringify(catalog);
      catalog=next;catalogTime=Date.now();if(changed)queueMicrotask(onChange);return catalog;
    } finally {clearTimeout(timer);catalogPending=null;}
  })();
  return catalogPending;
}
export function calendarPlusRange(widget, now=new Date()) {
  const start=new Date(now);start.setHours(0,0,0,0);
  const end=new Date(start);end.setDate(end.getDate()+Math.max(1,Math.min(90,Math.trunc(Number(widget.lookaheadDays)||14))));
  return {start:start.toISOString(),end:end.toISOString()};
}
function eventDate(value) {
  if(typeof value!=='string')return null;
  if(/^\d{4}-\d{2}-\d{2}$/.test(value))return calendarDate(value,'iso');
  if(!/^\d{4}-\d{2}-\d{2}T/.test(value)||!calendarDate(value.slice(0,10),'iso'))return null;
  const date=new Date(value);return Number.isNaN(date.getTime())?null:date;
}
export function calendarPlusEvents(calendars,sources,now=new Date(),rangeEnd=Infinity) {
  const events=[];
  for(const source of sources)for(const item of Array.isArray(calendars[source.entityId])?calendars[source.entityId]:[]) {
    if(!item||typeof item!=='object')continue;
    const start=eventDate(item.start),end=eventDate(item.end);
    if(!start||!end||end<=start||end<=now||start>=rangeEnd||typeof item.summary!=='string')continue;
    events.push({title:item.summary,start,end,allDay:/^\d{4}-\d{2}-\d{2}$/.test(item.start),source,
      location:typeof item.location==='string'?item.location:'',description:typeof item.description==='string'?item.description:''});
  }
  return events.sort((a,b)=>a.start-b.start||a.title.localeCompare(b.title));
}
const words={de:{loading:'Termine werden geladen …',empty:'Keine kommenden Termine',choose:'Kalender auswählen',error:'Kalender konnten nicht geladen werden.',invalid:'Bitte calendar.*-Entitäten auswählen.',allDay:'Ganztägig',today:'Heute',tomorrow:'Morgen',active:'Läuft',all:'Alle Termine',close:'Schließen',refresh:'Aktualisieren',more:'Weitere Termine',days:'In {n} Tagen',minute:'In {n} Min.',hour:'In {n} Std.'},
en:{loading:'Loading events …',empty:'No upcoming events',choose:'Select a calendar',error:'Could not load calendars.',invalid:'Please select calendar.* entities.',allDay:'All day',today:'Today',tomorrow:'Tomorrow',active:'In progress',all:'All events',close:'Close',refresh:'Refresh',more:'More events',days:'In {n} days',minute:'In {n} min',hour:'In {n} h'}};
export function calendarPlusWhen(event,locale='de',now=new Date()) {
  const lang=words[locale.startsWith('de')?'de':'en'];
  if(event.start<=now&&event.end>now)return lang.active;
  if(calendarIso(event.start)===calendarIso(now)) {
    if(event.allDay)return lang.today;
    const minutes=Math.max(1,Math.ceil((event.start-now)/60000));
    return (minutes<60?lang.minute:lang.hour).replace('{n}',minutes<60?minutes:Math.floor(minutes/60));
  }
  const tomorrow=new Date(now);tomorrow.setDate(tomorrow.getDate()+1);
  if(calendarIso(event.start)===calendarIso(tomorrow))return lang.tomorrow;
  const dayStamp=d=>Date.UTC(d.getFullYear(),d.getMonth(),d.getDate());
  return lang.days.replace('{n}',Math.round((dayStamp(event.start)-dayStamp(now))/86400000));
}
const cache=new Map(),controllers=new Map(),openViews=new Set();
export function cleanupCalendarPlus() {
  for(const [root,timer] of controllers)if(!root.isConnected){clearInterval(timer);controllers.delete(root);}
}
async function loadEvents(ids,range,force=false) {
  const key=JSON.stringify([ids,range.start,range.end]),previous=cache.get(key);
  if(!force&&previous&&Date.now()-previous.time<60000)return previous.promise;
  const query=new URLSearchParams(range);ids.forEach(id=>query.append('entity_id',id));
  const promise=(async()=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try {
      const response=await fetch(`api/calendar-events?${query}`,{cache:'no-store',signal:controller.signal});
      const data=await response.json();if(!response.ok||!data.calendars||typeof data.calendars!=='object')throw new Error('calendar request failed');
      for(const id of ids)if(!Array.isArray(data.calendars[id]))throw new Error('calendar source missing');
      return data.calendars;
    } finally {clearTimeout(timer);}
  })();
  const entry={time:Date.now(),promise};cache.set(key,entry);if(cache.size>30)cache.delete(cache.keys().next().value);
  try{return await promise;}catch(error){if(cache.get(key)===entry)cache.delete(key);throw error;}
}
export function renderCalendarPlus(widget,doc,{locale='de',runtime=false,key=widget.id,onCatalogChange=()=>{}}={}) {
  locale=locale.startsWith('de')?'de':'en';const lang=words[locale];
  const root=doc.createElement('section');root.className='calendar-plus';root.dataset.theme=['dark','light'].includes(widget.calendarTheme)?widget.calendarTheme:'auto';
  root.style.setProperty('--cp-accent',widget.calendarAccent||'#e85b64');
  root.style.setProperty('--cp-font-size',`${Math.min(24,Math.max(10,Number(widget.calendarFontSize)||14))}px`);
  root.style.setProperty('--cp-tile-radius',`${Number.isFinite(Number(widget.calendarTileRadius))?Math.max(0,Math.min(100,Number(widget.calendarTileRadius))):10}px`);
  const tile=calendarPlusTileLayout(widget);
  for(const [name,value] of Object.entries({width:tile.width,height:tile.height,month:tile.top,day:tile.bottom,header:tile.headerHeight}))root.style.setProperty(`--cp-icon-${name}`,`${value}px`);
  if(widget.showDivider===false)root.classList.add('no-dividers');
  const node=(tag,cls,text)=>{const el=doc.createElement(tag);el.className=cls;if(text!=null)el.textContent=text;return el;};
  const header=node('header','cp-header'),title=node('strong','cp-title',widget.heading||'UGSo Calendar +');title.title=title.textContent;
  const refresh=node('button','cp-control','↻');refresh.type='button';refresh.title=lang.refresh;refresh.setAttribute('aria-label',lang.refresh);
  header.append(title);if(runtime)header.append(refresh);root.append(header);
  const list=node('div','cp-list'),notice=node('div','cp-notice',lang.loading),footer=node('button','cp-footer',lang.all);footer.type='button';footer.hidden=true;
  notice.setAttribute('role','status');root.append(list,notice,footer);
  const dialog=node('dialog','cp-dialog');dialog.setAttribute('aria-label',widget.heading||'UGSo Calendar +');
  dialog.dataset.theme=root.dataset.theme;dialog.style.setProperty('--cp-accent',widget.calendarAccent||'#e85b64');
  const dialogHeader=node('header','cp-header'),close=node('button','cp-control',lang.close);close.type='button';dialogHeader.append(node('strong','cp-title',widget.heading||'UGSo Calendar +'),close);
  const details=node('div','cp-details');dialog.append(dialogHeader,details);root.append(dialog);
  close.onclick=()=>dialog.close();dialog.addEventListener('close',()=>openViews.delete(key));
  dialog.addEventListener('click',event=>{event.stopPropagation();if(event.target===dialog)dialog.close();});
  const open=()=>{if(runtime&&widget.popupEnabled!==false&&!dialog.open){openViews.add(key);dialog.showModal();}};
  footer.onclick=event=>{event.stopPropagation();open();};
  const row=(event,full=false)=>{
    const item=node(full?'article':'button','cp-event');if(!full)item.type='button';item.style.setProperty('--cp-event-color',event.source.color);item.style.setProperty('--cp-event-ink',calendarPlusInk(event.source.color));
    if(event.source.background)item.style.backgroundColor=event.source.background;
    const weekday=widget.longWeekday? 'long':'short';
    const date=node('div','cp-date');date.title=new Intl.DateTimeFormat(locale,{dateStyle:'full'}).format(event.start);date.append(node('span','cp-month',new Intl.DateTimeFormat(locale,widget.swapMonthWeekday?{weekday}:{month:'short'}).format(event.start)),node('strong','cp-day',String(event.start.getDate())));
    const body=node('div','cp-event-body'),name=node('strong','cp-event-title',event.title);name.title=event.title;body.append(name);
    const time=event.allDay?lang.allDay:new Intl.DateTimeFormat(locale,{hour:'2-digit',minute:'2-digit',hour12:false}).format(event.start)+'–'+new Intl.DateTimeFormat(locale,{hour:'2-digit',minute:'2-digit',hour12:false}).format(event.end);
    const dateText=new Intl.DateTimeFormat(locale,{...(widget.showWeekday!==false?{weekday}:{}),day:'2-digit',month:'2-digit'}).format(event.start);
    const duration=event.allDay?`${Math.round((Date.UTC(event.end.getFullYear(),event.end.getMonth(),event.end.getDate())-Date.UTC(event.start.getFullYear(),event.start.getMonth(),event.start.getDate()))/86400000)} ${locale==='de'?'Tage':'days'}`:`${Math.round((event.end-event.start)/60000)} min`;
    body.append(node('div','cp-time',[widget.showDate!==false?dateText:widget.showWeekday!==false?new Intl.DateTimeFormat(locale,{weekday}).format(event.start):'',widget.showTime!==false?time:'',widget.showDuration?duration:''].filter(Boolean).join(' · ')));
    if(widget.showCalendarName!==false)body.append(node('div','cp-source',event.source.label||event.source.entityId));
    if(widget.showLocation!==false&&event.location)body.append(node('div','cp-location',event.location));
    const displayEnd=new Date(event.end);if(event.allDay)displayEnd.setDate(displayEnd.getDate()-1);
    if(full){body.append(node('div','cp-full-date',new Intl.DateTimeFormat(locale,{dateStyle:'medium',...(event.allDay?{}:{timeStyle:'short'})}).format(event.start)+' – '+new Intl.DateTimeFormat(locale,{dateStyle:'medium',...(event.allDay?{}:{timeStyle:'short'})}).format(displayEnd)));if(event.description)body.append(node('p','cp-description',event.description));}
    item.append(date,body);if(widget.showUpcoming!==false)item.append(node('span','cp-relative',calendarPlusWhen(event,locale)));
    if(!full){item.disabled=!runtime||widget.popupEnabled===false;item.onclick=event=>{event.stopPropagation();open();};}
    return item;
  };
  let loading=false;
  const update=async(force=false)=>{
    if(loading||!root.isConnected)return;loading=true;refresh.disabled=true;
    try {
      const entities=await discoverCalendars(force,onCatalogChange),sources=calendarPlusSources(widget,entities),ids=sources.map(source=>source.entityId);
      if(!ids.length){notice.textContent=entities.length?(locale==='de'?'Alle Kalender ausgeblendet':'All calendars hidden'):(locale==='de'?'Keine Kalender gefunden':'No calendars found');list.replaceChildren();footer.hidden=true;details.replaceChildren();return;}
      const range=calendarPlusRange(widget),batches=[];
      // The Studio endpoint accepts twenty sources per read; discover all calendars.
      for(let index=0;index<ids.length;index+=20)batches.push(await loadEvents(ids.slice(index,index+20),range,force));
      const data=Object.assign({},...batches);
      if(!root.isConnected)return;
      const events=calendarPlusEvents(data,sources,new Date(),new Date(range.end));
      const limit=widget.unfoldEvents===false?1:Math.max(1,Math.min(20,Math.trunc(Number(widget.maxEvents)||5)));
      const populate=(target,items,full)=>{
        target.replaceChildren();let lastDay='',lastSource='';const entries=items.map(event=>({date:event.start,event})),grouped=widget.groupByDay||widget.groupByCalendar;
        if(widget.showEmptyDays&&grouped){for(const date=new Date(range.start);date<new Date(range.end);date.setDate(date.getDate()+1)){if(!events.some(event=>event.start<new Date(date.getFullYear(),date.getMonth(),date.getDate()+1)&&event.end>date))entries.push({date:new Date(date)});}entries.sort((a,b)=>calendarIso(a.date).localeCompare(calendarIso(b.date)));}
        for(const {date,event} of entries){const day=calendarIso(date);if(grouped&&day!==lastDay){target.append(node('h4','cp-group',new Intl.DateTimeFormat(locale,{dateStyle:'full'}).format(date)));lastSource='';}if(event){if(grouped&&widget.groupByCalendar&&event.source.entityId!==lastSource)target.append(node('div','cp-group-source',event.source.label));target.append(row(event,full));lastSource=event.source.entityId;}else target.append(node('div','cp-empty-day',lang.empty));lastDay=day;}
      };
      if(widget.groupByCalendar)events.sort((a,b)=>calendarIso(a.start).localeCompare(calendarIso(b.start))||a.source.label.localeCompare(b.source.label)||a.start-b.start);
      const listScroll=list.scrollTop,detailScroll=details.scrollTop;
      populate(list,events.slice(0,limit),false);populate(details,events.slice(0,100),true);
      list.scrollTop=listScroll;details.scrollTop=detailScroll;
      notice.textContent=events.length?'':lang.empty;
      footer.hidden=!runtime||widget.popupEnabled===false||!events.length;footer.textContent=`${lang.all} (${Math.min(events.length,100)})`;
      if(openViews.has(key)&&!dialog.open&&runtime)dialog.showModal();
    } catch {
      if(root.isConnected){notice.textContent=lang.error;list.replaceChildren();footer.hidden=true;details.replaceChildren(node('p','cp-notice',lang.error));}
    } finally {loading=false;refresh.disabled=false;}
  };
  refresh.onclick=event=>{event.stopPropagation();void update(true);};
  queueMicrotask(()=>{if(root.isConnected){void update(runtime);if(widget.calendarAutoRefresh!==false){const timer=setInterval(()=>{if(!doc.hidden&&root.isConnected)void update(true);},60000);controllers.set(root,timer);}}});
  return root;
}
