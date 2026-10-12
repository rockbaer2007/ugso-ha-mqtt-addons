import { el, image, bounded, number as n, truth, formatNumber, condition, safeHtml } from './material-common.js';
import { borderTitleFragment } from './border-widget.js';

const previous = new Map();
export function materialDisplayValue(w,value,locale) {
  if(value==null || ['unknown','unavailable'].includes(value))return '—';
  if(w.valueType==='duration'){const seconds=Math.max(0,n(value));return `${Math.floor(seconds/3600)}:${String(Math.floor(seconds/60)%60).padStart(2,'0')}:${String(Math.floor(seconds)%60).padStart(2,'0')}`;}
  if(w.valueType==='boolean' || w.valueType==='auto' && ['on','off','true','false'].includes(String(value)))return truth(value)?w.trueText:w.falseText;
  if(['number','auto'].includes(w.valueType) && String(value).trim()!=='' && Number.isFinite(Number(value)))return formatNumber(n(value)*n(w.factor,1)+n(w.offset),w,locale);
  if(w.valueType==='date'){const date=new Date(value);if(!Number.isFinite(date.getTime()))return '—';return w.dateFormat==='time'?date.toLocaleTimeString(locale):w.dateFormat==='date'?date.toLocaleDateString(locale):date.toLocaleString(locale);}
  return String(value);
}
export function renderMaterialData(root,w,value,doc,context,helpers) {
  const { appearance, commit, writable, rows:readRows, url }=helpers,kind=w.materialKind;
  if(kind==='version'){
    const badge=el(doc,'span',null,'material-version-badge');badge.append(el(doc,'span',context.text('Installiert')),el(doc,'span',context.packageVersion || context.text('Unbekannt')));root.append(badge);return true;
  }
  if(kind==='icon'){
    const symbol=w.iconMode==='state' && value!=null?truth(value)?w.onIcon:w.offIcon:w.icon;root.append(image(doc,symbol,w.iconSize,w.iconColor || appearance.primary,context));root.classList.add('material-icon-display');return true;
  }
  if(kind==='value'){
    const display=materialDisplayValue(w,value,context.language),text=el(doc,'output',`${w.prefix || ''}${display}${w.unit?' '+w.unit:''}${w.suffix || ''}`);text.style.fontSize=`${bounded(w.valueFontSize,w.fontSize || 16,8,120)}px`;text.style.color=w.valueFontColor || 'inherit';root.style.textAlign=w.textAlign || 'left';
    if(w.valueCondition && w.valueCondition!=='always' && !condition(value,w.valueCondition,w.valueConditionValue))root.hidden=true;
    if(w.valueIcon)root.append(image(doc,w.valueIcon,w.iconSize, w.iconColor,context));root.append(el(doc,'span',w.labelText),text);
    if(w.valueLink){const destination=url(w.valueLink,context.baseUrl);if(destination){const link=el(doc,'a',display);link.href=destination;link.rel='noopener noreferrer';link.target=w.openNewWindow?'_blank':'_self';text.replaceChildren(link);}}
    const key=`${context.surface || ''}/${w.id}`;if(w.changeEffectEnabled && previous.has(key) && previous.get(key)!==String(value)){text.classList.add('material-value-changed');text.style.setProperty('--material-effect-color',w.effectFontColor || appearance.primary);text.style.animationDuration=`${bounded(w.effectDuration,1000,100,10000)}ms`;}if(previous.size>1000)previous.clear();previous.set(key,String(value));return true;
  }
  if(kind==='card'){
    const card=el(doc,'article',null,`material-card material-card-${w.cardLayout || 'Basic'}`);root.append(card);const title=el(doc,'header',null,'material-card-title'),content=el(doc,'div',null,'material-card-content');
    if(w.showTitle!==false)title.append(el(doc,'h3',w.cardTitle));if(w.cardSubtitle)title.append(el(doc,'small',w.cardSubtitle));title.style.backgroundColor=w.colorTitleSectionBackground || '';title.style.color=w.colorTitle || 'inherit';title.style.fontSize=`${bounded(w.titleFontSize,20,8,100)}px`;
    let picture;if(w.image && url(w.image,context.baseUrl)){picture=el(doc,'img',null,'material-card-image');picture.src=url(w.image,context.baseUrl);picture.alt=w.cardTitle || '';if(w.imageRefreshSeconds>0 && context.runtime){const tick=()=>{if(!picture.isConnected)return;const next=new URL(url(w.image,context.baseUrl));next.searchParams.set('_gvs',String(Date.now()));picture.src=next.href;doc.defaultView.setTimeout(tick,bounded(w.imageRefreshSeconds,60,5,3600)*1000);};doc.defaultView.setTimeout(tick,bounded(w.imageRefreshSeconds,60,5,3600)*1000);}}
    if(w.showText!==false){content.append(w.contentIsHtml?safeHtml(doc,w.entityId?value:w.cardText):el(doc,'p',w.entityId?value:w.cardText));content.style.backgroundColor=w.colorTextSectionBackground || '';content.style.color=w.colorBody || 'inherit';}
    if(w.cardLayout==='BasicHeader')card.append(title);if(picture)card.append(picture);if(w.cardLayout!=='BasicHeader')card.append(title);card.append(content);
    const destination=context.pageUrl?.(w.targetPage) || url(w.linkUrl,context.baseUrl);if(destination && context.runtime){card.tabIndex=0;card.setAttribute('role','link');card.addEventListener('click',()=>context.navigate?.(destination));card.addEventListener('keydown',event=>{if(event.key==='Enter')context.navigate?.(destination);});}return true;
  }
  if(!['table','list','icon-list','alerts'].includes(kind))return false;
  let rows;try{rows=readRows(w,value,context.states);}catch(error){root.append(el(doc,'p',context.text(error.message),'material-widget-message'));return true;}
  if(kind==='alerts')rows=rows.slice(0,bounded(w.showMaxAlerts,500,1,500));
  if(w.showHeader && kind!=='table')root.append(el(doc,'h3',w.labelText));
  if(kind==='table'){
    const columns=String(w.columns || '').split(';').map((part,i)=>{const [key,...label]=part.split(':');return {key,label:label.join(':') || key,index:i};}).filter(col=>col.key && w[`showColumn${col.index}`]!==false).slice(0,30),table=el(doc,'table',null,`material-table material-table-${w.tableLayout || 'standard'}`),body=el(doc,'tbody');
    let sortKey='',ascending=true;const draw=()=>{body.replaceChildren();for(const row of rows){const tr=el(doc,'tr');tr.style.height=`${bounded(w.rowHeight,48,20,200)}px`;for(const column of columns){const i=column.index,td=el(doc,'td');td.style.textAlign=w[`columnAlignment${i}`] || 'left';td.style.width=w[`columnWidth${i}`]?`${bounded(w[`columnWidth${i}`],120,20,1000)}px`:'';td.style.whiteSpace=w[`columnNoWrap${i}`]?'nowrap':'';td.style.color=w[`columnColor${i}`] || '';td.style.fontSize=`${bounded(w[`columnFontSize${i}`],w.fontSize || 14,8,80)}px`;const item=row.source?.[column.key] ?? row[column.key] ?? '';if(w[`columnType${i}`]==='image'){const source=url(String(item),context.baseUrl);if(source){const picture=el(doc,'img');picture.src=source;picture.alt=column.label;picture.width=bounded(w[`columnImageSize${i}`],32,8,200);td.append(picture);}}else td.textContent=`${w[`columnPrefix${i}`] || ''}${item}${w[`columnSuffix${i}`] || ''}`;tr.append(td);}body.append(tr);}};
    if(w.showHeader){const head=el(doc,'thead'),tr=el(doc,'tr');if(w.fixedHeader)head.className='material-table-fixed-header';for(const column of columns){const th=el(doc,'th'),button=el(doc,'button',column.label);button.disabled=!context.runtime;button.addEventListener('click',()=>{ascending=sortKey===column.key?!ascending:true;sortKey=column.key;rows.sort((a,b)=>String(a.source?.[sortKey] ?? a[sortKey] ?? '').localeCompare(String(b.source?.[sortKey] ?? b[sortKey] ?? ''),context.language,{numeric:true})*(ascending?1:-1));draw();for(const node of tr.children)node.removeAttribute('aria-sort');th.setAttribute('aria-sort',ascending?'ascending':'descending');});th.append(button);tr.append(th);}head.append(tr);table.append(head);}draw();table.append(body);root.append(table);return true;
  }
  const list=el(doc,'div',null,`material-row-list material-list-${w.listLayout || 'standard'}`);list.style.gap=`${bounded(w.rowGap,8,0,100)}px`;if(kind==='icon-list'){list.style.display='grid';list.style.gridTemplateColumns=`repeat(${bounded(w.gridColumns,3,1,12)},minmax(0,1fr))`;}
  rows.forEach((row,i)=>{
    const visibility=row.visibilityEntityId || row.visibilityOid;if(visibility && !condition(context.states?.[visibility]?.state,row.visibilityCondition || '==',row.visibilityConditionValue))return;
    if(row.groupHeader)list.append(el(doc,'h4',row.groupHeader));const active=truth(row.entityId?context.states?.[row.entityId]?.state:row.value),item=el(doc,'div',null,`material-data-row${kind==='alerts'?' material-alert':''}`);
    item.style.minHeight=`${bounded(w.rowHeight,48,24,300)}px`;item.style.backgroundColor=(active?row.backgroundActive:row.backgroundColor) || row.background || w.itemBackgroundColor || '';item.style.color=row.fontColor || '';
    if(kind==='alerts'){item.dataset.alertType=row.type || row.level || 'info';item.classList.toggle('material-alert-dense',!!w.alertDense);item.style.borderLeft=`4px solid ${row.borderColor || w.alertBorderColor || appearance.primary}`;}
    if(row.icon || row.image)item.append(image(doc,active?row.imageActive || row.icon || row.image:row.icon || row.image,w.listImageHeight || 24,active?row.imageActiveColor || row.color:row.imageColor || row.color,context));
    const texts=el(doc,'div',null,'material-row-text'),primary=el(doc,'span');const label=row.label ?? row.title ?? row.headline ?? row.message ?? row.text ?? '';if(w.listTextIsHtml)primary.append(borderTitleFragment(String(label).slice(0,20000),doc));else primary.textContent=String(label);texts.append(primary);const sub=row.subLabel || row.subText || w[`rowSubLabel${i}`];if(sub){const secondary=el(doc,'small');if(w.listTextIsHtml)secondary.append(borderTitleFragment(String(sub).slice(0,20000),doc));else secondary.textContent=sub;texts.append(secondary);}item.append(texts);
    const right=el(doc,'div',null,'material-row-right');right.append(el(doc,'span',row.rightLabel ?? row.value ?? ''));if(row.rightSubLabel)right.append(el(doc,'small',row.rightSubLabel));item.append(right);
    if(kind==='icon-list' && (row.statusBarText || row.statusBarTextActive)){const status=el(doc,'small',active?row.statusBarTextActive:row.statusBarText,'material-icon-status');status.style.backgroundColor=active?row.statusBarColorActive:row.statusBarColor;item.append(status);}
    const target={...w,entityId:row.entityId || '',entityAttribute:'',readOnly:w.readOnly || row.readOnly},control=row.control || w[`rowControl${i}`];
    if(['switch','checkbox'].includes(control)){const holder=el(doc,'div');helpers.control(holder,{...target,materialKind:control,labelText:'',onValue:'on',offValue:'off'},row.entityId?context.states?.[row.entityId]?.state:row.value,doc,context,{...helpers,commit});item.append(holder);}
    else if(control==='navigation' || control==='link'){const destination=control==='navigation'?context.pageUrl?.(row.targetPage || w[`rowTargetPage${i}`]):url(row.linkUrl || w[`rowLinkUrl${i}`],context.baseUrl);const button=el(doc,'button',context.text('Öffnen'));button.disabled=!context.runtime || !destination;button.addEventListener('click',()=>context.navigate?.(destination));item.append(button);}
    else if(control==='button' || kind==='alerts'){const button=el(doc,'button',context.text(kind==='alerts'?'Quittieren':'Ausführen'));const ack=kind==='alerts'?{...w,entityId:w.acknowledgeEntityId || w.entityId,entityAttribute:''}:target;const next=()=>kind==='alerts'?w.acknowledgeEntityId?w.acknowledgeValue:JSON.stringify(rows.filter(other=>other!==row).map(other=>other.source || other)):row.writeValue;button.disabled=!context.runtime || w.readOnly || (!ack.entityId && kind!=='alerts') || !writable(ack,context.states,next());button.addEventListener('click',async()=>{if(kind==='alerts' && !ack.entityId){w.dataJson=next();context.localChange?.();}else await commit(next(),ack);});item.append(button);}
    list.append(item);
  });root.append(list);if(!rows.length)root.append(el(doc,'p',context.text('Keine Einträge.')));return true;
}
