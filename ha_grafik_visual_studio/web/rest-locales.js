import { interactiveText } from './interactive-locales.js';
import { restVocabulary } from './rest-vocabulary.js';
const builtins=new Set(['dashboard-in-widget','svg-connection','linebox','linebox-math','value-converter','value-calculation','value-connection']);
export function isRestWidget(widget){return builtins.has(widget.dataFlowVariant||widget.type)||/^gauge-/.test(widget.type||'')||/^ugso\.(calendar-plus|energy|industrial|printer|solar|technic|weather-heating)\//.test(widget.type||'');}
export function restLocale(widget,fallback='de'){return ['de','en','fr'].includes(widget.widgetLocale)?widget.widgetLocale:/^fr/.test(fallback)?'fr':/^en/.test(fallback)?'en':'de';}
const lookup=new Map();for(const [de,en,fr] of restVocabulary)for(const source of [de,en])lookup.set(source,{de,en,fr});
export function restText(value,locale='de'){
  if(typeof value!=='string'||!value)return value;
  const entry=lookup.get(value.trim());if(entry)return value.replace(value.trim(),entry[locale]);
  if(value.includes(': '))return value.split(': ').map(part=>restText(part,locale)).join(': ');
  if(/^[A-P] · /.test(value))return value.slice(0,4)+restText(value.slice(4),locale);
  const indexed=value.match(/^(.*?)(\s*\[?\d+\]?)(.*)$/);
  if(indexed && lookup.has(indexed[1]))return restText(indexed[1],locale)+indexed[2]+restText(indexed[3],locale);
  for(const delimiter of [': ',' – ',' / '])if(value.includes(delimiter)){const parts=value.split(delimiter);if(lookup.has(parts[0]))return parts.map(part=>restText(part,locale)).join(delimiter);}
  for(const suffix of [': Optionen im Projekt speichern',' aktivieren',' vollständig aktivieren oder deaktivieren',': eigene Farbe'])if(value.endsWith(suffix))return `${restText(value.slice(0,-suffix.length),locale)}: ${restText(suffix.trim().replace(/^: /,''),locale)}`;
  return interactiveText(value,locale);
}
export const restLanguageGroup={id:'widget-language',required:true,label:'Widget-Sprache',fields:[{label:'Widget-Sprache',key:'widgetLocale',type:'select',default:'auto',refreshProperties:true,options:[{value:'auto',label:'Projektstandard'},{value:'de',label:'Deutsch'},{value:'en',label:'English'},{value:'fr',label:'Français'}]}]};
export function restGroups(groups,widget,keyFor,fallback){const locale=restLocale(widget,fallback);return groups.map((group,index)=>({...group,id:keyFor(group,index),widgetLocale:locale,label:restText(group.label,locale),hint:restText(group.hint,locale),fields:group.fields.map(field=>({...field,widgetLocale:locale,label:restText(field.label,locale),options:field.options?.map(option=>typeof option==='string'?{value:option,label:restText(option,locale)}:{...option,label:restText(option.label,locale)})}))}));}
export function localizeRestProperties(root,locale){const walker=root.ownerDocument.createTreeWalker(root,4);let node;while((node=walker.nextNode()))if(!node.parentElement.closest('input,textarea,option,code,pre,.selected-widget-heading'))node.nodeValue=restText(node.nodeValue,locale);for(const el of root.querySelectorAll('[title],[aria-label]'))for(const key of ['title','aria-label'])if(el.hasAttribute(key))el.setAttribute(key,restText(el.getAttribute(key),locale));}
const models=new WeakMap();
export function markRestRuntime(root,widget,states,locale){
  root.dataset.restWidget='';root.dataset.widgetLocale=locale;const user=new Set(Object.entries(widget).filter(([key,value])=>typeof value==='string' && value && !/(Locale|Language)$/.test(key)).map(([,value])=>value));
  for(const entry of Object.values(states||{})){if(typeof entry?.state==='string')user.add(entry.state);if(entry?.attributes?.friendly_name)user.add(entry.attributes.friendly_name);}
  models.set(root,{locale,user});localizeRestRuntime(root);
}
export function localizeRestRuntime(root){const model=models.get(root);if(!model||!root.ownerDocument?.createTreeWalker)return;const walker=root.ownerDocument.createTreeWalker(root,4);let node;while((node=walker.nextNode())){
  if(node.parentElement.closest('input,textarea,option,code,pre,.energy-heading,.technic-window-caption,.printer-title,[data-user-content]'))continue;
  if(!model.user.has(node.nodeValue.trim())){const translated=restText(node.nodeValue,model.locale);if(translated!==node.nodeValue)node.nodeValue=translated;}
}for(const el of root.querySelectorAll('[title],[aria-label]'))for(const key of ['title','aria-label'])if(el.hasAttribute(key)&&!model.user.has(el.getAttribute(key)))el.setAttribute(key,restText(el.getAttribute(key),model.locale));}
export function observeRestRuntime(doc){new MutationObserver(records=>{const roots=new Set(records.map(record=>(record.target.nodeType===1?record.target:record.target.parentElement)?.closest('[data-rest-widget]')).filter(Boolean));for(const root of roots)localizeRestRuntime(root);}).observe(doc.body,{subtree:true,childList:true,characterData:true});}
