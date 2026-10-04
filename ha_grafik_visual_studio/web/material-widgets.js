// Original UGSo renderers, using the public ioBroker catalog as a functional reference.
import { materialAppearance } from './material-color-schemes.js';
import { materialIframeUrl } from './material-dialog.js';
import { renderEventCalendar } from './event-calendar.js';

const count = (v, max = 20) => Math.max(0, Math.min(max, Math.trunc(Number(v) || 0)));
const num = (v, fallback = 0) => v !== '' && v != null && Number.isFinite(Number(v)) ? Number(v) : fallback;
const on = v => [true,1,'1','true','on'].includes(v);
const known = v => v != null && !['unknown','unavailable'].includes(v);
export function materialBindings(w) {
  const ids=Object.entries(w).filter(([k,v]) => /EntityId\d*$/.test(k) && typeof v === 'string' && v).map(([,v]) => v);
  if(['list','icon-list'].includes(w.materialKind))try{const rows=JSON.parse(w.dataJson || '[]');if(Array.isArray(rows))for(const row of rows.slice(0,500))if(row && typeof (row.entityId || row.objectId)==='string')ids.push(row.entityId || row.objectId);}catch { /* Malformed data gets a visible renderer error. */ }
  return [...new Set(ids)];
}
export function materialValue(w, states = {}) {
  const entry = states[w.entityId];
  return w.entityId ? w.entityAttribute ? entry?.attributes?.[w.entityAttribute] : entry?.state : w.state;
}
export function materialItems(w, entry) {
  let items;
  if (w.listDataMethod === 'jsonStringObject') {
    try { items = JSON.parse(w.jsonStringObject || '[]'); } catch { throw new Error('Ungültiger JSON-String für das Menü.'); }
    if (!Array.isArray(items)) throw new Error('Menüdaten müssen eine JSON-Liste sein.');
  } else if (w.listDataMethod === 'valueList') {
    const labels = String(w.valueListLabels || '').split(';'), icons = String(w.valueListIcons || '').split(';');
    items = String(w.valueList || '').split(';').filter(Boolean).map((value,i) => ({value,text:labels[i] || value,icon:icons[i]}));
  } else if (w.listDataMethod === 'multistatesObject') {
    items = (entry?.attributes?.options || []).map(value => ({value,text:String(value)}));
  } else items = Array.from({length:count(w.countSelectItems)},(_,i) => ({value:w[`value${i}`] || w[`label${i}`] || '',text:w[`label${i}`],subText:w[`subLabel${i}`],icon:w[`listIcon${i}`],iconColor:w[`listIconColor${i}`],iconColorSelectedTextField:w[`imageColorSelectedTextField${i}`]}));
  return items.slice(0,200).filter(item => item && typeof item === 'object' && item.value != null && ['string','number','boolean'].includes(typeof item.value)).map(item => ({...item,value:String(item.value),text:String(item.text ?? item.value),subText:String(item.subText || '')}));
}
export function materialWritable(w, states, value) {
  if (w.readOnly || w.entityAttribute || on(states[w.lockEntityId]?.state)) return false;
  if (!w.entityId) return true;
  const entry = states[w.entityId];
  if (!known(entry?.state)) return false;
  if (/^(switch|input_boolean)\./.test(w.entityId)) return ['on','off','true','false','1','0'].includes(String(value));
  if (/^input_number\./.test(w.entityId)) return String(value).trim() !== '' && Number.isFinite(Number(value));
  if (/^input_text\./.test(w.entityId)) return String(value).length <= Math.min(255,num(entry.attributes?.max,255));
  return /^(select|input_select)\./.test(w.entityId) && entry.attributes?.options?.includes(String(value));
}
export function materialGroups(groups,w,key) {
  const labels={material3:'Material 3',legacy:'Klassisch',project:'Projektstandard',light:'Hell',dark:'Dunkel',write:'Schreiben',select:'Auswählen',inputPerEditor:'Über den Editor',jsonStringObject:'JSON-String',multistatesObject:'Entitätsoptionen',valueList:'Werteliste'};
  return groups.map((g,i)=>({...g,id:key(g,i)})).filter(g => (w.showAdvanced || !g.label.endsWith('(erweitert)')) && (!/^Menüpunkt \[/.test(g.label) || w.listDataMethod==='inputPerEditor' && Number(g.label.match(/\d+/)[0]) < count(w.countSelectItems)) && (!/^Zeile \[/.test(g.label) || w.dataMethod==='editor' && Number(g.label.match(/\d+/)[0]) < count(w.rowCount,10)) && (!/^Datenreihe \[/.test(g.label) || Number(g.label.match(/\d+/)[0]) < count(w.dataCount,10)) && (!/^Ansicht \[/.test(g.label) || Number(g.label.match(/\d+/)[0]) < count(w.countViews,10))).map(g=>({...g,fields:g.fields.map(f=>/^targetPage\d*$/.test(f.key)?{...f,type:'page'}:f.type==='color'?{...f,optionalColor:true}:f.type==='select'?{...f,options:f.options.map(v=>({value:v,label:labels[v]||v}))}:f)}));
}
function element(doc,tag,text,className) { const e=doc.createElement(tag); if(text!=null)e.textContent=String(text); if(className)e.className=className; return e; }
function icon(doc,value,size,color,context) {
  const e=element(doc,'img',null,'material-widget-icon'); e.alt=''; e.width=e.height=num(size,20);
  context.icon?.(e,value && !value.includes(':') && !value.includes('/') ? `mdi:${value}` : value,color);
  return e;
}
function message(root,text) { const p=element(root.ownerDocument,'p',text,'material-widget-message');p.setAttribute('role','status');root.append(p);return p; }
export function renderMaterialWidget(w,doc,context={}) {
  const states=context.states || {}, appearance=materialAppearance(w,context), root=element(doc,'div',null,'material-widget');
  root.dataset.materialKind=w.materialKind;
  Object.assign(root.style,{backgroundColor:w.backgroundColor || appearance.background,color:w.textColor || appearance.text,fontFamily:w.fontFamily || 'inherit',fontSize:`${num(w.fontSize,16)}px`,borderRadius:`${num(w.cornerRadius,12)}px`});
  root.style.setProperty('--material-primary',w.primaryColor || appearance.primary);
  root.style.setProperty('--material-hover',w.hoverColor || '#8883');root.style.setProperty('--material-selected',w.selectedColor || '#8885');
  const value=materialValue(w,states), runtime=context.runtime===true;
  const commit=async (next,target=w) => {
    if(!runtime || !materialWritable(target,states,next)) return false;
    try {const accepted=await context.write?.(target.entityId,next);if(accepted===false)throw new Error('Wert konnte nicht geschrieben werden.'); if(!target.entityId) {target.state=next;context.localChange?.();}return true;} catch(error){message(root,error.message);return false;}
  };
  const kind=w.materialKind;
  if(['input','select','autocomplete'].includes(kind)) {
    renderInput(root,w,value,states,doc,context,commit);return root;
  }
  if(kind==='button') {
    const button=element(doc,'button',null,'material-action-button');button.type='button';button.setAttribute('aria-label',w.labelText || 'Button');
    if(w.icon)button.append(icon(doc,w.icon,24,w.buttonTextColor,context));
    if(w.buttonLayout!=='icon')button.append(element(doc,'span',w.labelText));
    if(w.buttonLayout==='vertical')button.style.flexDirection='column';
    button.style.color=w.buttonTextColor || appearance.text;button.style.backgroundColor=w.buttonStyle==='text'?'transparent':w.buttonBackgroundColor || appearance.primary;
    button.classList.toggle('material-outlined',w.buttonStyle==='outlined');
    if(w.actionKind==='toggle'){button.setAttribute('aria-pressed',String(String(value)===String(w.onValue)));if(String(value)===String(w.onValue))button.style.backgroundColor=w.selectedColor || appearance.primary;}
    const destination=w.actionKind==='navigation'?context.pageUrl?.(w.targetPage):materialIframeUrl(w.linkUrl,context.baseUrl);
    const next=()=>w.actionKind==='addition'?num(value)+num(w.addition,1):w.actionKind==='toggle'?String(value)===String(w.onValue)?w.offValue:w.onValue:w.actionKind==='multi-state'?(()=>{const values=String(w.stateValues||'').split(';');return values[(values.indexOf(String(value))+1)%values.length];})():w.writeValue;
    button.disabled=!runtime || w.readOnly || on(states[w.lockEntityId]?.state) || (['navigation','link'].includes(w.actionKind)?!destination:!materialWritable(w,states,next()));
    button.addEventListener('click',async event=>{event.stopPropagation(); if(destination && ['navigation','link'].includes(w.actionKind))context.navigate?.(destination); else if(w.actionKind==='slider') {const existing=root.querySelector('input[type=range]');if(existing){existing.remove();return;}const input=element(doc,'input');input.type='range';input.min='0';input.max='100';input.value=String(num(value));input.setAttribute('aria-label',w.labelText);input.addEventListener('change',()=>void commit(Number(input.value)));root.append(input);}else await commit(next());});
    root.append(button);return root;
  }
  if(['switch','checkbox'].includes(kind)) {
    const label=element(doc,'label',null,'material-toggle'),input=element(doc,'input');input.type='checkbox';input.checked=String(value)===String(w.onValue);input.setAttribute('role',kind==='switch'?'switch':'checkbox');input.setAttribute('aria-label',w.labelText);
    input.disabled=!runtime || !materialWritable(w,states,input.checked?w.offValue:w.onValue);input.addEventListener('change',async()=>{if(!await commit(input.checked?w.onValue:w.offValue))input.checked=!input.checked;});label.append(input,element(doc,'span',w.labelText));root.append(label);return root;
  }
  if(['slider','slider-round'].includes(kind)) {
    const input=element(doc,'input'), output=element(doc,'output');input.type='range';input.min=String(num(w.minValue));input.max=String(Math.max(num(w.minValue)+.001,num(w.maxValue,100)));input.step=String(Math.max(.001,num(w.step,1)));input.value=String(num(value));input.setAttribute('aria-label',w.labelText);input.disabled=!runtime || !materialWritable(w,states,input.value);
    const update=()=>{output.textContent=`${w.labelText}: ${input.value} ${w.unit || ''}`;if(kind==='slider-round')root.style.setProperty('--material-angle',`${(Number(input.value)-Number(input.min))/(Number(input.max)-Number(input.min))*360}deg`);};update();input.addEventListener('input',update);input.addEventListener('change',()=>void commit(Number(input.value)));if(w.orientation==='vertical')input.style.writingMode='vertical-lr';
    if(kind==='slider-round'){
      const dial=element(doc,'div',null,'material-round-dial');dial.setAttribute('aria-hidden','true');root.prepend(dial);
      const move=event=>{if(input.disabled)return;const box=dial.getBoundingClientRect(),angle=(Math.atan2(event.clientY-box.top-box.height/2,event.clientX-box.left-box.width/2)*180/Math.PI+450)%360,min=Number(input.min),step=Number(input.step);input.value=String(Math.min(Number(input.max),min+Math.round((Number(input.max)-min)*angle/360/step)*step));update();};
      dial.addEventListener('pointerdown',event=>{if(input.disabled)return;event.preventDefault();dial.setPointerCapture(event.pointerId);move(event);});dial.addEventListener('pointermove',event=>{if(dial.hasPointerCapture(event.pointerId))move(event);});dial.addEventListener('pointerup',event=>{if(dial.hasPointerCapture(event.pointerId)){dial.releasePointerCapture(event.pointerId);void commit(Number(input.value));}});
    }
    if(w.showTicks){const ticks=element(doc,'datalist');ticks.id=`material-ticks-${w.id}`;for(let i=0;i<count(w.tickCount);i++){const option=element(doc,'option');option.value=String(Number(input.min)+i*(Number(input.max)-Number(input.min))/Math.max(1,count(w.tickCount)-1));ticks.append(option);}input.setAttribute('list',ticks.id);root.append(ticks);}
    root.append(input);if(w.showValue!==false)root.append(output);return root;
  }
  if(['progress','progress-circular'].includes(kind)) {
    const low=num(w.minValue),high=Math.max(low+.001,num(w.maxValue,100)),percent=Math.max(0,Math.min(100,(num(value)-low)/(high-low)*100));
    const progress=element(doc,'div',null,kind==='progress'?'material-linear-progress':'material-circular-progress');progress.setAttribute('role','progressbar');progress.setAttribute('aria-label',w.labelText);progress.setAttribute('aria-valuemin',String(low));progress.setAttribute('aria-valuemax',String(high));if(!w.indeterminate)progress.setAttribute('aria-valuenow',String(num(value)));progress.style.setProperty('--material-progress',`${percent}%`);progress.classList.toggle('is-indeterminate',w.indeterminate);progress.classList.toggle('is-striped',w.striped);progress.style.setProperty('--material-track',`${Math.max(1,num(w.trackWidth,8))}px`);root.append(progress);if(w.showValue!==false)root.append(element(doc,'output',known(value)?`${num(value)} ${w.unit || ''}`:'—'));return root;
  }
  if(kind==='value') {
    let display=known(value)?String(value):'—';
    if(known(value) && (w.valueType==='boolean' || w.valueType==='auto' && ['on','off','true','false'].includes(String(value))))display=on(value)?w.trueText:w.falseText;
    else if(known(value) && ['auto','number'].includes(w.valueType) && String(value).trim()!=='' && Number.isFinite(Number(value)))display=(num(value)*num(w.factor,1)+num(w.offset)).toLocaleString(context.language||'de',{minimumFractionDigits:count(w.decimals,6),maximumFractionDigits:count(w.decimals,6)});
    else if(w.valueType==='date'){const date=new Date(value);display=Number.isNaN(date.getTime())?'—':w.dateFormat==='time'?date.toLocaleTimeString(context.language):w.dateFormat==='date'?date.toLocaleDateString(context.language):date.toLocaleString(context.language);}
    root.append(element(doc,'span',w.labelText),element(doc,'output',`${w.prefix || ''}${display}${w.unit?' '+w.unit:''}${w.suffix || ''}`));return root;
  }
  if(kind==='icon') {root.append(icon(doc,known(value)?on(value)?w.onIcon:w.offIcon:w.icon,w.iconSize,w.iconColor,context));return root;}
  if(kind==='version') {root.append(element(doc,'output',`MaterialDesign ${context.packageVersion || '1.0.0'}`));return root;}
  if(kind==='card') {
    root.append(element(doc,'h3',w.cardTitle));if(w.image){const url=materialIframeUrl(w.image,context.baseUrl);if(url){const image=element(doc,'img');image.src=url;image.alt=w.cardTitle || '';image.className='material-card-image';root.append(image);}}
    if(w.contentIsHtml){const frame=element(doc,'iframe');frame.setAttribute('sandbox','');frame.title=w.cardTitle || w.labelText;frame.srcdoc=String(w.entityId ? value ?? '' : w.cardText || '');root.append(frame);}else root.append(element(doc,'p',w.entityId?value:w.cardText));
    const url=context.pageUrl?.(w.targetPage) || materialIframeUrl(w.linkUrl,context.baseUrl);if(url && runtime){const link=element(doc,'button','Öffnen');link.addEventListener('click',()=>context.navigate?.(url));root.append(link);}return root;
  }
  if(kind==='calendar') {root.append(renderEventCalendar(w,doc,{...context,key:`material-${w.id}`,widgets:[],text:v=>v,language:context.language||'de'}));return root;}
  if(kind==='layout') {renderLayout(root,w,value,doc,context);return root;}
  if(kind==='chart') {renderChart(root,w,value,doc,context);return root;}
  renderRows(root,w,value,states,doc,context,commit);return root;
}

function renderInput(root,w,value,states,doc,context,commit) {
  const isSelect=w.materialKind==='select',entry=states[w.entityId],label=element(doc,'label',w.inputLabelText || w.labelText,'material-input-label'),input=element(doc,'input');
  input.type=['text','number','date','time','password'].includes(w.inputType)?w.inputType:'text';input.value=known(value)?String(value):'';input.id=`material-input-${w.id}`;label.htmlFor=input.id;input.maxLength=Math.max(1,count(w.maxLength,255));input.readOnly=isSelect || w.readOnly || Boolean(w.entityAttribute);
  input.disabled=!context.runtime || w.entityId && (!known(entry?.state) || !/^(input_text|input_number|select|input_select)\./.test(w.entityId)) || on(states[w.lockEntityId]?.state);
  input.setAttribute('aria-label',w.inputLabelText || w.labelText);label.style.color=w.inputLabelColor || 'inherit';label.style.fontSize=`${num(w.inputLabelFontSize,16)}px`;label.style.fontFamily=w.inputLabelFontFamily || 'inherit';label.style.transform=`translate(${num(w.inputTranslateX)}px,${num(w.inputTranslateY)}px)`;
  const line=element(doc,'div',null,'material-input-line');root.classList.add(`material-input-${w.inputLayout || 'regular'}`);line.style.backgroundColor=w.inputLayoutBackgroundColor || 'transparent';line.style.borderColor=w.inputLayoutBorderColor || '#8888';input.style.color=w.inputTextColor || 'inherit';input.style.fontSize=`${num(w.inputTextFontSize,16)}px`;input.style.fontFamily=w.inputTextFontFamily || 'inherit';input.style.textAlign=w.inputAlignment || 'left';
  const prefix=element(doc,'span',w.inputPrefix),suffix=element(doc,'span',w.inputSuffix);for(const e of [prefix,suffix]){e.style.color=w.inputAppendixColor || 'inherit';e.style.fontSize=`${num(w.inputAppendixFontSize,14)}px`;e.style.fontFamily=w.inputAppendixFontFamily || 'inherit';}
  const fixed={};for(const slot of ['prepandIcon','prepandInnerIcon','appendOuterIcon'])if(w[slot])fixed[slot]=icon(doc,w[slot],w[slot+'Size'],w[slot+'Color'],context);
  root.append(label);if(fixed.prepandIcon)root.append(fixed.prepandIcon);line.append(prefix);if(fixed.prepandInnerIcon)line.append(fixed.prepandInnerIcon);line.append(input,suffix);if(fixed.appendOuterIcon)line.append(fixed.appendOuterIcon);root.append(line);
  let counter;if(w.showInputCounter){counter=element(doc,'small',null,'material-input-counter');counter.style.color=w.inputCounterColor || 'inherit';counter.style.fontSize=`${num(w.inputCounterFontSize,14)}px`;counter.style.fontFamily=w.inputCounterFontFamily || 'inherit';root.append(counter);}
  const updateCounter=()=>{if(counter)counter.textContent=`${input.value.length} / ${input.maxLength}`;};updateCounter();
  if(w.inputMessage){const hint=element(doc,'small',w.inputMessage,'material-input-hint');hint.hidden=!w.showInputMessageAlways;hint.style.color=w.inputMessageColor || 'inherit';hint.style.fontSize=`${num(w.inputMessageFontSize,14)}px`;hint.style.fontFamily=w.inputMessageFontFamily || 'inherit';root.append(hint);input.addEventListener('focus',()=>{hint.hidden=false;});input.addEventListener('blur',()=>{hint.hidden=!w.showInputMessageAlways;});}
  input.addEventListener('focus',()=>{line.style.borderColor=w.inputLayoutBorderColorSelected || '#888';line.style.backgroundColor=w.inputLayoutBackgroundColorSelected || w.inputLayoutBackgroundColor || 'transparent';label.style.color=w.inputLabelColorSelected || w.inputLabelColor || 'inherit';});input.addEventListener('blur',()=>{line.style.borderColor=w.inputLayoutBorderColor || '#8888';line.style.backgroundColor=w.inputLayoutBackgroundColor || 'transparent';label.style.color=w.inputLabelColor || 'inherit';});
  line.addEventListener('mouseenter',()=>{if(doc.activeElement!==input){line.style.borderColor=w.inputLayoutBorderColorHover || w.inputLayoutBorderColor || '#8888';line.style.backgroundColor=w.inputLayoutBackgroundColorHover || w.inputLayoutBackgroundColor || 'transparent';}});line.addEventListener('mouseleave',()=>{if(doc.activeElement!==input){line.style.borderColor=w.inputLayoutBorderColor || '#8888';line.style.backgroundColor=w.inputLayoutBackgroundColor || 'transparent';}});
  let menu,items=[],active=-1,shown=[];
  const hide=()=>{if(menu){if(menu.matches(':popover-open'))menu.hidePopover();menu.hidden=true;}input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');};
  const choose=async item=>{if(await commit(item.value)){input.value=item.text;updateCounter();hide();input.focus();}};
  const show=()=>{if(!menu || input.disabled || w.readOnly)return;menu.replaceChildren();shown=items.filter(item=>isSelect || `${item.text} ${item.subText} ${item.value}`.toLocaleLowerCase().includes(input.value.toLocaleLowerCase()));active=-1;
    for(const [i,item] of shown.entries()){const row=element(doc,'button',null,'material-menu-item');row.type='button';row.id=`material-option-${w.id}-${i}`;row.setAttribute('role','option');row.setAttribute('aria-selected',String(item.value===String(value)));row.disabled=!materialWritable(w,states,item.value);row.style.minHeight=`${Math.max(24,num(w.listItemHeight,48))}px`;row.style.backgroundColor=item.value===String(value)?w.listItemBackgroundSelectedColor || 'var(--material-selected)':w.listItemBackgroundColor || 'transparent';
      if(item.icon)row.append(icon(doc,item.icon,w.listIconSize,item.iconColor || (item.value===String(value)?w.listIconSelectedColor:w.listIconColor),context));const text=element(doc,'span',null,'material-menu-text'),primary=element(doc,'span',item.text),secondary=item.subText?element(doc,'small',item.subText):null,valueText=w.showValue?element(doc,'small',item.value):null;text.append(primary);if(secondary)text.append(secondary);row.append(text);if(valueText)row.append(valueText);
      const parts=[primary,secondary,valueText];for(const [n,p] of ['listItem','listItemSub','listItemValue'].entries()){if(!parts[n])continue;parts[n].style.fontSize=`${num(w[p+'FontSize'],n?14:16)}px`;parts[n].style.fontFamily=w[p+'Font'] || 'inherit';parts[n].style.color=(item.value===String(value)?w[p+'FontSelectedColor']:w[p+'FontColor']) || 'inherit';}
      row.addEventListener('mouseenter',()=>{row.style.backgroundColor=w.listItemBackgroundHoverColor || 'var(--material-hover)';parts.forEach((part,n)=>{if(part)part.style.color=w[['listItem','listItemSub','listItemValue'][n]+'FontHoverColor'] || 'inherit';});});row.addEventListener('mouseleave',()=>{row.style.backgroundColor=item.value===String(value)?w.listItemBackgroundSelectedColor || 'var(--material-selected)':w.listItemBackgroundColor || 'transparent';});row.addEventListener('pointerdown',event=>event.preventDefault());row.addEventListener('click',()=>void choose(item));menu.append(row);}
    menu.hidden=false;if(menu.hasAttribute('popover')){const box=line.getBoundingClientRect(),height=Math.min(240,shown.length*Math.max(24,num(w.listItemHeight,48)));menu.style.width=`${box.width}px`;menu.style.left=`${box.left}px`;menu.style.top=`${w.listPosition==='top' || w.listPosition==='auto' && doc.defaultView.innerHeight-box.bottom<height ? Math.max(0,box.top-height) : box.bottom+(w.listPositionOffset?4:0)}px`;if(!menu.matches(':popover-open'))menu.showPopover();}input.setAttribute('aria-expanded','true');};
  if(w.materialKind!=='input'){
    try{items=materialItems(w,entry);}catch(error){message(root,error.message);}
    const selected=items.find(item=>item.value===String(value));if(selected){input.value=selected.text;if(selected.icon && w.showSelectedIcon!=='no'){const slot=w.showSelectedIcon==='prepend'?'prepandIcon':w.showSelectedIcon==='append-outer'?'appendOuterIcon':'prepandInnerIcon';if(fixed[slot])fixed[slot].remove();const selectedIcon=icon(doc,selected.icon,w[slot+'Size'],selected.iconColorSelectedTextField || w[slot+'Color'],context);slot==='prepandIcon'?root.prepend(selectedIcon):slot==='appendOuterIcon'?line.append(selectedIcon):input.before(selectedIcon);}}
    menu=element(doc,'div',null,'material-input-menu');menu.id=`material-menu-${w.id}`;menu.setAttribute('role','listbox');menu.setAttribute('aria-label',w.labelText);if(typeof menu.showPopover==='function')menu.setAttribute('popover','manual');menu.hidden=true;menu.classList.toggle('opens-top',w.listPosition==='top');root.append(menu);input.setAttribute('role','combobox');input.setAttribute('aria-controls',menu.id);input.setAttribute('aria-expanded','false');input.setAttribute('aria-autocomplete',isSelect?'none':'list');
    const toggle=element(doc,'button',null,'material-menu-toggle');toggle.type='button';toggle.setAttribute('aria-label','Menü öffnen');toggle.disabled=input.disabled || w.readOnly;toggle.append(icon(doc,w.collapseIcon,w.collapseIconSize,w.collapseIconColor,context));toggle.addEventListener('click',()=>menu.hidden?show():hide());line.append(toggle);input.addEventListener('click',show);input.addEventListener('input',show);
    root.addEventListener('focusout',event=>{if(!root.contains(event.relatedTarget))hide();});
  }
  input.addEventListener('input',updateCounter);input.addEventListener('change',()=>{if(w.materialKind==='input' || w.materialKind==='autocomplete' && w.inputMode==='write'){const match=items.find(item=>item.text===input.value || item.value===input.value);void commit(match?match.value:input.type==='number'?Number(input.value):input.value);}else if(!items.some(item=>item.text===input.value || item.value===input.value))input.value=items.find(item=>item.value===String(value))?.text || '';});
  input.addEventListener('keydown',event=>{if(menu && ['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();if(menu.hidden)show();active=(active+(event.key==='ArrowDown'?1:-1)+shown.length)%shown.length;const rows=[...menu.children];rows.forEach((row,i)=>row.classList.toggle('is-active',i===active));if(rows[active]){input.setAttribute('aria-activedescendant',rows[active].id);rows[active].scrollIntoView({block:'nearest'});}}else if(event.key==='Enter' && menu && !menu.hidden && shown[active]){event.preventDefault();void choose(shown[active]);}else if(event.key==='Escape')hide();else if(event.key==='Enter' && w.materialKind==='input')void commit(input.type==='number'?Number(input.value):input.value);});
  if(w.clearIconShow){const clear=element(doc,'button',null,'material-input-clear');clear.type='button';clear.setAttribute('aria-label','Text löschen');clear.disabled=input.disabled || w.readOnly || !materialWritable(w,states,'');clear.append(icon(doc,w.clearIcon,w.clearIconSize,w.clearIconColor,context));clear.addEventListener('click',async()=>{if(await commit('')){input.value='';updateCounter();if(w.openOnClear)show();else hide();}});line.append(clear);}
  if(w.autofocus && context.runtime)queueMicrotask(()=>{if(input.isConnected && doc.activeElement===doc.body)input.focus();});
}

export function materialRows(w,value,states={}) {
  if(w.dataMethod==='editor')return Array.from({length:count(w.rowCount,10)},(_,i)=>({label:w[`rowLabel${i}`],value:w[`rowEntityId${i}`]?states[w[`rowEntityId${i}`]]?.state:w[`rowValue${i}`],icon:w[`rowIcon${i}`],entityId:w[`rowEntityId${i}`],control:w[`rowControl${i}`],writeValue:w[`rowWriteValue${i}`]}));
  const source=w.dataMethod==='entity' || w.entityId?value:w.dataJson;let rows;try{rows=typeof source==='string'?JSON.parse(source || '[]'):source;}catch{throw new Error('Ungültige JSON-Daten.');}if(!Array.isArray(rows))throw new Error('Die Daten müssen eine JSON-Liste enthalten.');return rows.slice(0,500).filter(row=>row && typeof row==='object').map(row=>{const normalized={...row,entityId:row.entityId || row.objectId || '',label:row.label ?? row.text ?? row.headline,value:row.entityId || row.objectId?states[row.entityId || row.objectId]?.state:row.value,icon:row.icon || row.image};Object.defineProperty(normalized,'source',{value:row});return normalized;});
}
function renderRows(root,w,value,states,doc,context,commit) {
  let rows;try{rows=materialRows(w,value,states);}catch(error){message(root,error.message);return;}
  if(w.showHeader)root.append(element(doc,'h3',w.labelText));
  if(w.materialKind==='table'){
    const columns=String(w.columns || '').split(';').map(v=>{const [key,...label]=v.split(':');return {key,label:label.join(':') || key};}).filter(v=>v.key).slice(0,30),table=element(doc,'table'),body=element(doc,'tbody');let sortKey='',ascending=true;const draw=()=>{body.replaceChildren();for(const row of rows){const tr=element(doc,'tr');for(const column of columns)tr.append(element(doc,'td',row[column.key] ?? ''));body.append(tr);}};if(w.showHeader){const head=element(doc,'thead'),row=element(doc,'tr');for(const column of columns){const th=element(doc,'th'),button=element(doc,'button',column.label);button.disabled=!context.runtime;button.addEventListener('click',()=>{ascending=sortKey===column.key?!ascending:true;sortKey=column.key;rows.sort((a,b)=>String(a[sortKey]??'').localeCompare(String(b[sortKey]??''),context.language||'de',{numeric:true})*(ascending?1:-1));draw();th.setAttribute('aria-sort',ascending?'ascending':'descending');});th.append(button);row.append(th);}head.append(row);table.append(head);}draw();table.append(body);root.append(table);return;
  }
  const list=element(doc,'div',null,'material-row-list');if(w.materialKind==='icon-list'){list.style.display='grid';list.style.gridTemplateColumns=`repeat(${Math.max(1,count(w.gridColumns,12))},minmax(0,1fr))`;}list.style.gap=`${num(w.rowGap,8)}px`;
  for(const row of rows){const item=element(doc,'div',null,'material-data-row');item.style.minHeight=`${Math.max(24,num(w.rowHeight,48))}px`;item.style.backgroundColor=row.backgroundColor || row.background || '';item.style.color=row.fontColor || '';if(row.borderColor)item.style.borderLeft=`6px solid ${row.borderColor}`;if(row.icon)item.append(icon(doc,on(row.value)?row.imageActive || row.icon:row.icon,24,on(row.value)?row.imageActiveColor || row.color:row.imageColor || row.color,context));item.append(element(doc,'span',row.label ?? row.title ?? row.message ?? row.text ?? ''),element(doc,'span',row.value ?? ''));
    const target={...w,entityId:row.entityId || '',entityAttribute:'',readOnly:w.readOnly || row.readOnly};if(['switch','checkbox'].includes(row.control)){const input=element(doc,'input');input.type='checkbox';input.setAttribute('role',row.control==='switch'?'switch':'checkbox');input.checked=on(row.entityId?states[row.entityId]?.state:row.value);input.disabled=!context.runtime || !row.entityId || !materialWritable(target,states,input.checked?'off':'on');input.setAttribute('aria-label',row.label || 'Schalten');input.addEventListener('change',()=>void commit(input.checked?'on':'off',target));item.append(input);}else if(row.control==='button' || w.materialKind==='alerts'){const button=element(doc,'button',w.materialKind==='alerts'?'Quittieren':'Ausführen');const ack=w.materialKind==='alerts'?{...w,entityId:w.acknowledgeEntityId || w.entityId,entityAttribute:''}:target;const next=()=>w.materialKind==='alerts'?w.acknowledgeEntityId?w.acknowledgeValue:JSON.stringify(rows.filter(other=>other!==row).map(other=>other.source || other)):row.writeValue;button.disabled=!context.runtime || w.readOnly || (!ack.entityId && w.materialKind!=='alerts') || !materialWritable(ack,states,next());button.addEventListener('click',async()=>{if(w.materialKind==='alerts' && !ack.entityId){w.dataJson=next();context.localChange?.();}else await commit(next(),ack);});item.append(button);}list.append(item);
  }root.append(list);if(!rows.length)message(root,'Keine Einträge.');
}

export function materialChartData(w,value,history,states={}) {
  if(w.chartKind==='history')return history || {labels:[],datasets:[]};
  const configured=Array.from({length:Math.max(1,count(w.dataCount,10))},(_,i)=>({id:w[`seriesEntityId${i}`],name:w[`seriesName${i}`],source:w[`seriesData${i}`],color:w[`seriesColor${i}`]}));
  if(configured.some(s=>s.id || s.source && s.source!=='[]')){const labels=[],datasets=configured.map(s=>{let points;if(s.id)points=[states[s.id]?.state];else try{points=JSON.parse(s.source || '[]');}catch{throw new Error('Ungültige Datenreihe.');}if(!Array.isArray(points))throw new Error('Datenreihe muss eine Liste sein.');return {label:s.name,color:s.color,borderColor:s.color,data:points.map((p,i)=>{if(labels[i]==null)labels[i]=p && typeof p==='object'?p.x ?? i:i;return p && typeof p==='object'?p.y ?? p.value:p;})};});return {labels,datasets};}
  if(w.entityId || w.chartKind==='json' || w.dataJson){let data;try{data=typeof value==='object' && w.entityId?value:JSON.parse(w.entityId?value || '{}':w.dataJson || '{}');}catch{throw new Error('Ungültige Diagramm-JSON-Daten.');}if(Array.isArray(data))return {labels:data.map((p,i)=>p.x ?? i),datasets:[{label:w.labelText,data:data.map(p=>p.y ?? p.value),color:w.primaryColor}]};if(data && Array.isArray(data.axisLabels) && Array.isArray(data.graphs))return {labels:data.axisLabels,datasets:data.graphs.map(g=>({...g,label:g.legendText,borderColor:g.color}))};if(data?.data && Array.isArray(data.data.labels))return {...data.data,type:data.type};if(!data || !Array.isArray(data.labels) || !Array.isArray(data.datasets))throw new Error('Diagramm benötigt labels/datasets oder axisLabels/graphs.');return data;}
  return {labels:[],datasets:[]};
}
function renderChart(root,w,value,doc,context) {
  const host=element(doc,'div',null,'material-chart-host');root.append(element(doc,'h3',w.chartTitle),host);
  const draw=data=>{host.replaceChildren();const series=data.datasets.slice(0,10).map((s,i)=>({...s,label:String(s.label || w[`seriesName${i}`] || `Serie ${i+1}`),color:w[`seriesColor${i}`] || (typeof s.borderColor==='string'?s.borderColor:typeof s.backgroundColor==='string'?s.backgroundColor:null) || ['#42a5f5','#ef5350','#66bb6a','#ffa726'][i%4],data:(Array.isArray(s.data)?s.data:[]).slice(0,720).map(v=>v==null?null:num(typeof v==='object'?v.y:v,NaN))}));
    if(!series.some(s=>s.data.some(v=>Number.isFinite(v)))){message(host,'Keine Diagrammdaten.');return;}
    const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 600 300');svg.setAttribute('role','img');svg.setAttribute('aria-label',w.chartTitle || w.labelText);const node=(tag,attrs)=>{const e=doc.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));svg.append(e);return e;};const text=(x,y,content)=>{const e=node('text',{x,y,fill:w.textColor || 'currentColor','font-size':12});e.textContent=String(content);};
    if(w.chartKind==='pie'){const values=series[0].data.map(v=>Math.max(0,num(v))),sum=values.reduce((a,b)=>a+b,0);if(!sum){message(host,'Keine positiven Kreisdiagrammwerte.');return;}let angle=-Math.PI/2;for(const [i,v] of values.entries()){const next=angle+v/sum*Math.PI*2,r=100;if(v===sum)node('circle',{cx:300,cy:145,r,fill:series[0].color});else if(v>0)node('path',{d:`M 300 145 L ${300+r*Math.cos(angle)} ${145+r*Math.sin(angle)} A ${r} ${r} 0 ${next-angle>Math.PI?1:0} 1 ${300+r*Math.cos(next)} ${145+r*Math.sin(next)} Z`,fill:['#42a5f5','#ef5350','#66bb6a','#ffa726','#ab47bc'][i%5]});angle=next;}text(5,290,data.labels.slice(0,20).join(' · '));}
    else{const values=series.flatMap(s=>s.data).filter(Number.isFinite),min=w.yMin!==''?num(w.yMin):Math.min(0,...values),max=Math.max(min+.001,w.yMax!==''?num(w.yMax):Math.max(...values)),length=Math.max(1,...series.map(s=>s.data.length)),x=i=>45+(i+.5)/length*540,y=v=>260-(v-min)/(max-min)*230;
      for(let i=0;i<=5;i++){const val=min+(max-min)*i/5;node('line',{x1:45,y1:y(val),x2:585,y2:y(val),stroke:w.gridColor || '#8885'});text(2,y(val),Number(val.toFixed(1)));}
      for(const [j,s] of series.entries()){if(w.chartKind==='bar' || s.type==='bar')s.data.forEach((v,i)=>{if(Number.isFinite(v)){const base=y(0),py=y(v);node('rect',{x:x(i)-18+j*36/series.length,y:Math.min(base,py),width:Math.max(1,34/series.length),height:Math.abs(base-py),fill:s.color});}});else{let path='';s.data.forEach((v,i)=>{if(!Number.isFinite(v)){path+=' ';return;}const prev=s.data[i-1];path+=`${i===0 || !Number.isFinite(prev)?'M':'L'} ${x(i)} ${y(v)} `;if(w.showPoints)node('circle',{cx:x(i),cy:y(v),r:2,fill:s.color});});node('path',{d:path,fill:'none',stroke:s.color,'stroke-width':num(w.lineWidth,2)});}}
      data.labels.slice(0,720).forEach((label,i)=>{if(i%Math.max(1,Math.ceil(length/6))===0)text(x(i)-12,285,String(label).slice(0,16));});}
    host.append(svg);if(w.showLegend)host.append(element(doc,'small',series.map(s=>s.label).join(' · ')));
  };
  if(w.chartKind==='history'){
    if(!w.entityId && !materialBindings(w).length && w.seriesData0 && w.seriesData0!=='[]')try{draw(materialChartData({...w,chartKind:'json'},null,null,context.states));}catch(error){message(host,error.message);}
    else queueMicrotask(async()=>{if(!root.isConnected)return;try{draw(await context.history?.(w));}catch(error){message(host,error.message || 'Verlauf nicht verfügbar.');}});
  }
  else try{draw(materialChartData(w,value,null,context.states));}catch(error){message(host,error.message);}
}
function renderLayout(root,w,value,doc,context) {
  const views=Array.from({length:count(w.countViews,10)},(_,i)=>({url:context.pageUrl?.(w[`targetPage${i}`]),label:w[`viewLabel${i}`],value:w[`viewValue${i}`],height:w[`viewHeight${i}`]}));
  if(w.layoutKind==='navigation'){const heading=element(doc,'h3',w.labelText),nav=element(doc,'nav');for(const view of views){const button=element(doc,'button',view.label);button.disabled=!context.runtime || !view.url;button.addEventListener('click',()=>context.navigate?.(view.url));nav.append(button);}root.append(heading,nav);return;}
  const selected=w.layoutKind==='view'?views.filter(v=>String(v.value)===String(value)).slice(0,1):views;
  const grid=element(doc,'div',null,`material-view-grid material-view-${w.layoutKind}`);grid.style.setProperty('--material-columns',String(Math.max(1,count(w.gridColumns,12))));grid.style.gap=`${num(w.viewGap,12)}px`;
  for(const view of selected){const card=element(doc,'section');card.append(element(doc,'h4',view.label));if(view.url && context.runtime){const frame=element(doc,'iframe');frame.title=view.label || 'Studio-Seite';frame.src=view.url;frame.style.height=`${Math.max(100,num(view.height,num(w.childHeight,240)))}px`;card.append(frame);}else card.append(element(doc,'p',view.url?'Ansicht in der Runtime':'Andere Studio-Seite auswählen.'));grid.append(card);}root.append(grid);if(!selected.length)message(root,'Keine Ansicht für diesen Zustand.');
}
