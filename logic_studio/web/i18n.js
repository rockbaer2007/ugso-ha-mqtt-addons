import {messages} from './locales.js?v=0.1.12';
export const locales=['de','en','fr'];
const patterns=[
 [/^(\d+) Bausteine · (\d+) Verbindungen$/,['$1 blocks · $2 connections','$1 blocs · $2 connexions']],
 [/^(\d+) Definitionen · Werte und HA-Abläufe · keine Live-Ausführung\.$/,['$1 definitions · dataflow and HA flows · no live execution.','$1 définitions · valeurs et flux HA · aucune exécution directe.']],
 [/^Baustein (.+)$/,['Block $1','Bloc $1']],
 [/^Baustein-Menü (.+)$/,['Block menu $1','Menu du bloc $1']],
 [/^Eigenschaften (.+)$/,['Properties $1','Propriétés $1']],
 [/^HA-Entität auswählen für (.+)$/,['Select HA entity for $1','Choisir une entité HA pour $1']],
 [/^Entität (.+) auswählen$/,['Select entity $1','Choisir l’entité $1']],
 [/^Quelle für (.+)$/,['Source for $1','Source pour $1']],
 [/^(.+) (Q|OUT|VALUE|NEXT|ET|CV|TOD|HOUR|MIN|WDAY|DAY|MONTH|YEAR) Ausgang$/,['$1 $2 output','$1 $2 sortie']],
 [/^(.+) (IN\d*|DO|S|R\d*|PT|CU|CD|PV|CLK|G) Eingang$/,['$1 $2 input','$1 $2 entrée']],
 [/^Eingang (.+)$/,['Input $1','Entrée $1']],
 [/^Eingänge: (.*)$/,['Inputs: $1','Entrées : $1']],
 [/^Ausgänge: (.*)$/,['Outputs: $1','Sorties : $1']],
 [/^(.+) · Projekt gespeichert$/,['$1 · project saved','$1 · projet sauvegardé']],
 [/^App-Projekt geladen · Revision (\d+)$/,['App project loaded · revision $1','Projet enregistré chargé · révision $1']],
 [/^(DEMO-DATEN · )?(\d+) passende Entitäten · (.+) · keine Geräteaktion$/,['$1$2 matching entities · $3 · no device action','$1$2 entités correspondantes · $3 · aucune commande d’appareil']],
 [/^HA-Entität übernommen: (.+) · nur gelesen, keine Geräteaktion\.$/,['HA entity selected: $1 · read-only, no device action.','Entité HA sélectionnée : $1 · lecture seule, aucune commande d’appareil.']],
 [/^HA-Auslöser (.+)\. Kein Dauerwert; startet einen Ablauf\.$/,['HA trigger $1. Not a continuous value; starts a flow.','Déclencheur HA $1. Pas une valeur continue ; démarre un flux.']],
 [/^(.+) → (.+): (.+) passt nicht zu (.+)\.$/,['$1 → $2: $3 is incompatible with $4.','$1 → $2 : $3 n’est pas compatible avec $4.']],
 [/^(.+): nur eine Verbindung erlaubt\.$/,['$1: only one connection allowed.','$1 : une seule connexion autorisée.']],
 [/^(.+) · (\d+) Bausteine · (\d+) Verbindungen · (\d+) Originalabschnitte\. Nur Vorschau; noch nicht übernommen\.$/,['$1 · $2 blocks · $3 connections · $4 original sections. Preview only; not applied.','$1 · $2 blocs · $3 connexions · $4 sections originales. Aperçu uniquement ; non appliqué.']],
];
const fragments=Object.keys(messages).filter(k=>k.length>12).sort((a,b)=>b.length-a.length);
export function translate(text,locale='de'){
 if(!text||locale==='de'||!locales.includes(locale))return text;
 const index=locale==='en'?0:1,match=/^(\s*)([\s\S]*?)(\s*)$/.exec(text),source=match[2];
 if(source.includes('\n'))return match[1]+source.split('\n').map(line=>translate(line,locale)).join('\n')+match[3];
 const generic=/^([A-Z_0-9]+): ([^.]+)\. (.*)$/.exec(source);
 if(generic&&messages[generic[2]])return match[1]+generic[1]+': '+translate(generic[2],locale)+'. '+translate(generic[3],locale)+match[3];
 let result=messages[source]?.[index];
 if(result===undefined){for(const [pattern,values]of patterns){if(pattern.test(source)){result=source.replace(pattern,values[index]);break;}}}
 if(result===undefined){result=source;for(const key of fragments)result=result.replaceAll(key,messages[key][index]);}
 result=result.replaceAll('DEMO-DATEN',messages['DEMO-DATEN'][index]);
 return match[1]+result+match[3];
}

// Localize only presentation nodes. Keep source strings so switching back is lossless.
// No innerHTML, control values, option values, project data or generated code is changed.
export function connectLanguage({getLanguage,setLanguage}){
 const originals=new WeakMap(),attributes=new WeakMap();
 let locale=locales.includes(getLanguage())?getLanguage():'de';
 const label=document.createElement('label');label.className='language-choice';
 label.append(document.createTextNode('Sprache'));
 const select=document.createElement('select');select.setAttribute('aria-label','Sprache');
 for(const [value,name]of [['de','Deutsch'],['en','English'],['fr','Français']]){const option=document.createElement('option');option.value=value;option.textContent=name;select.append(option);}
 label.append(select);document.querySelector('.brand').after(label);
 const excluded=node=>node.parentElement?.closest('script,style,textarea,code,.entity-pick,.block header strong,.block .result,.block .typename')||node.parentElement?.closest('.block .entity')&&!messages[node.nodeValue];
 function text(node){if(excluded(node))return;const current=node.nodeValue;let entry=originals.get(node);if(!entry||current!==entry.last)entry={source:current,last:current};const next=translate(entry.source,locale);if(next!==current)node.nodeValue=next;entry.last=next;originals.set(node,entry);}
 function attrs(node){if(!(node instanceof Element))return;let entries=attributes.get(node);if(!entries){entries={};attributes.set(node,entries);}for(const key of ['title','placeholder','aria-label']){const current=node.getAttribute(key);if(current===null)continue;let entry=entries[key];if(!entry||entry.last!==current)entry={source:current,last:current};const next=translate(entry.source,locale);if(next!==current)node.setAttribute(key,next);entry.last=next;entries[key]=entry;}}
 function localize(root){if(root.nodeType===3){text(root);return;}attrs(root);const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);while(walker.nextNode()){const node=walker.currentNode;if(node.nodeType===3)text(node);else attrs(node);}}
 const observer=new MutationObserver(records=>{observer.disconnect();const saved=getLanguage();if(locales.includes(saved)&&saved!==locale){locale=saved;localize(document.body);}else{const roots=new Set();for(const record of records){if(record.type==='childList')for(const n of record.addedNodes)roots.add(n);else roots.add(record.target);}for(const root of roots)if(root.isConnected)localize(root);}document.documentElement.lang=locale;select.value=locale;observe();});
 const observe=()=>observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','placeholder','aria-label']});
 select.onchange=()=>{locale=select.value;setLanguage(locale);observer.disconnect();localize(document.body);document.documentElement.lang=locale;observe();};
 localize(document.body);document.documentElement.lang=locale;select.value=locale;observe();
 return {locale:()=>locale};
}
