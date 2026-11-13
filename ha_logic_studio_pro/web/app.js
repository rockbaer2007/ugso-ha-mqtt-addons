import {adapt,categories,pins,resolved,createBlock,description,supported} from './catalog.js?v=0.1.12';
import {emptyPlan,loadPlan,analyze,compile,simulate,scan,simulationSteps,VERSION} from './core.js?v=0.1.65';
import {connectHA} from './ha-client.js?v=0.1.12';
import {entityParameters} from './entity-values.js?v=0.1.12';
import {connectImport} from './import-ui.js?v=0.1.12';
import {flowTypes,flowPins} from './flow-catalog.js?v=0.1.12';
import {connectExport} from './export-ui.js?v=0.1.12';
import {connectionCandidate} from './connections.js?v=0.1.12';
import {mountFlow} from './vendor/flow-editor.js?v=0.1.12';
import {boundedPosition,arrangeBlocks} from './flow-model.js?v=0.1.65';
import {connectLanguage,translate,locales} from './i18n.js?v=0.1.12';
const $=s=>document.querySelector(s),KEY='ha-logic-studio-pro-flow-v1',PREF='ha-logic-studio-pro-preferences-v1';
const defaultPlanName = emptyPlan().name;
const proLocale = new URLSearchParams(location.search).get('pro');
const embeddedInPro = window.parent !== window && locales.includes(proLocale);
const defs=adapt(await (await fetch('./reference-blocks.json',{cache:'no-store'})).json()),byType=new Map(defs.map(d=>[d.type,d]));
let plan=emptyPlan(),selected=null,pending=null,zoom=1,tab='all',docs=false,history=[],future=[],values=new Map(),prefs={favorites:[],recent:[],collapsed:[]};
let haConnection=null,flowCanvas=null;
let simulationMemory={},simulationNow=Date.now();
let simulationSignals=new Map();
const breakpoints = new Set();
let debugScan, debugPlan;
function debugSimulation(single) {
 try {
  const current = JSON.stringify(plan);
  let result;
  if (!debugScan || debugPlan !== current) {
   debugPlan = current;
   debugScan = simulationSteps(plan, byType, {memory: simulationMemory, now: simulationNow});
   result = debugScan.next();
   if (!result.done && (single || !breakpoints.has(result.value.block.id))) result = debugScan.next();
  } else {
   result = debugScan.next();
  }
  while (!single && !result.done && !breakpoints.has(result.value.block.id)) {
   result = debugScan.next();
  }
  if (result.done) {
   simulationMemory = result.value.memory;
   debugScan = undefined;
   status('Simulationsschritt – nur Demowerte, keine HA-Aktionen.');
  } else {
   selected = result.value.block.id;
   status('Simulation pausiert');
  }
  values = result.value.values;
  simulationSignals = result.value.signals;
  renderNodes();
 } catch (error) {
  debugScan = undefined;
  status(error.message);
 }
}
let liveDiagnosis, liveNodes = new Map();
const diagnosisText = {
 de: ['Letzte Auswertung', 'Live-Auswertung pausiert', 'Eingang', 'Ausgang'],
 en: ['Last evaluation', 'Live evaluation paused', 'Input', 'Output'],
 fr: ['Dernière évaluation', 'Évaluation en direct suspendue', 'Entrée', 'Sortie'],
};
const signalText = value => value == null ? '—' : typeof value === 'string' ? value || '""' : String(value);
function paintDiagnosis() {
 const [last, paused, input, output] = diagnosisText[prefs.language] ?? diagnosisText.de;
 const issue = $('#fbd-live-issue');
 if (issue) {
  issue.hidden = !liveDiagnosis?.error;
  issue.textContent = liveDiagnosis?.error ? paused + ': ' + liveDiagnosis.error : '';
 }
 for (const [id, node] of liveNodes) {
  const block = liveDiagnosis?.blocks.get(id);
  node.classList.toggle('has-live-signals', Boolean(block));
  node.classList.toggle('live-diagnosis-active', Boolean(liveDiagnosis));
  for (const badge of node.querySelectorAll('[data-live-pin]')) {
   const {livePin, liveSide} = badge.dataset;
   const pins = block?.[liveSide];
   badge.hidden = !pins || !Object.hasOwn(pins, livePin);
   badge.textContent = badge.hidden ? '' : signalText(pins[livePin]);
   badge.title = (liveSide === 'inputs' ? input : output) + ' ' + livePin + ': ' + badge.textContent;
  }
  const time = node.querySelector('.live-evaluated');
  time.hidden = !block;
  const stamp = block ? new Date(block.evaluatedAt).toLocaleTimeString(prefs.language ?? 'de', {hour12:false}) : '';
  time.textContent = block ? last + ': ' + stamp : '';
 }
}
const safeRead=(key)=>{try{return JSON.parse(localStorage.getItem(key));}catch{return null;}},write=(key,data)=>{try{localStorage.setItem(key,JSON.stringify(data));if(key===KEY||key===PREF)haConnection?.saveSoon();return true;}catch{return false;}};
try{const saved=safeRead(KEY);if(saved){plan=loadPlan(saved,byType);write(KEY,plan);}}catch(e){$('#status').textContent='Gespeichertes Projekt unverändert belassen: '+e.message;}
const pref=safeRead(PREF)||safeRead('ugso-logic-preferences-v1');if(pref){for(const k of Object.keys(prefs))if(Array.isArray(pref[k]))prefs[k]=pref[k].filter(v=>typeof v==='string').slice(0,100);if(locales.includes(pref.language))prefs.language=pref.language;write(PREF,prefs);}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function status(text){$('#status').textContent=text;}
function renderShortcuts(root){const section=el('details','shortcut-help');section.open=true;section.append(el('summary',null,'Tastenkürzel'));const table=el('table');for(const [key,label]of [['Ctrl+Z / Ctrl+Y','Rückgängig / wiederholen'],['Del','Ausgewähltes löschen'],['Esc','Verbindung abbrechen / Menü schließen'],['Enter / Space','Anschluss wählen / verbinden'],['Maus ziehen','Vom Ausgang zum passenden Eingang verbinden']]){const row=el('tr');row.append(el('th',null,key),el('td',null,label));table.append(row);}section.append(table,el('p',null,'Baustein auswählen: darunter erscheinen seine Beschreibung und Anschlüsse. Die Simulation führt keine HA-Aktionen aus.'));root.append(section);}
function checkpoint(){history.push(JSON.stringify(plan));if(history.length>50)history.shift();future=[];values.clear();}
function persist(){if(!document.documentElement.hasAttribute('data-embedded-pro')&&!write(KEY,plan))status('Browserspeicher nicht verfügbar – Projekt bitte als Datei sichern.');}
function change(fn){checkpoint();fn();persist();render();}
function color(type){return ({BOOL:'#38d984',REAL:'#22c9ec',INT:'#578cff',TIME:'#ffbf27',STRING:'#b7db68',ANY:'#adb6c3',FLOW:'#ffa632',REFERENCE:'#e8d266'})[type]||'#b7b0fc';}
function accent(d){return categories.find(c=>c[0]===d.category)?.[2]||'#888';}
function field(type,value,onchange,options){let n;if(options){n=el('select');for(const option of options){const o=el('option',null,option);o.value=option;n.append(o);}n.value=String(value);}else if(type==='BOOL'){n=el('select');for(const v of ['false','true']){const o=el('option',null,v.toUpperCase());o.value=v;n.append(o);}if(['unknown','unavailable'].includes(value)){const o=el('option',null,value.toUpperCase());o.value=value;n.append(o);n.value=value;}else n.value=String(value===true||value==='true');}else{n=el(type==='CODE'?'textarea':'input');n.value=String(value??'');if(['REAL','INT'].includes(type)){n.type='number';n.step=type==='INT'?'1':'any';}}n.onchange=()=>{const raw=n.value;const v=type==='BOOL'?raw==='true':['REAL','INT'].includes(type)?Number(raw):raw;if(typeof v==='number'&&!Number.isFinite(v)){status('Ungültige Zahl.');return;}try{if(type==='CODE')JSON.parse(v);onchange(v);}catch(e){status('Eingabe nicht übernommen: '+e.message);}};return n;}
function renderPalette(){const root=$('#palette');root.replaceChildren();const search=$('#search').value.trim().toLowerCase();for(const [cat,name,c]of categories){const ds=defs.filter(d=>d.category===cat&&(!search||(d.type+' '+description(d)+' '+translate(description(d),prefs.language)).toLowerCase().includes(search))&&(tab!=='fav'||prefs.favorites.includes(d.type))&&(tab!=='recent'||prefs.recent.includes(d.type)));if(tab==='recent')ds.sort((a,b)=>prefs.recent.indexOf(a.type)-prefs.recent.indexOf(b.type));if(!ds.length&&cat!=='interface')continue;const group=el('details');group.open=search||!prefs.collapsed.includes(cat);const title=el('summary',null,name);title.append(el('small',null,String(ds.length)));group.append(title);group.ontoggle=()=>{if(search)return;prefs.collapsed=prefs.collapsed.filter(x=>x!==cat);if(!group.open)prefs.collapsed.push(cat);write(PREF,prefs);};for(const d of ds){const b=el('button','choice');b.style.setProperty('--accent',c);b.dataset.type=d.type;b.title=description(d);b.setAttribute('aria-label','Baustein '+d.type);b.append(el('span','glyph',({logic:'&',memory:'↥',timers:'◷',arithmetic:'±',ha:'⇥',control:'⌁',calendar:'▦',messages:'≡'})[cat]||'◇'),el('span',null,d.type));const star=el('em',null,prefs.favorites.includes(d.type)?'★':'☆');star.title='Favorit umschalten';star.onclick=e=>{e.stopPropagation();prefs.favorites=prefs.favorites.includes(d.type)?prefs.favorites.filter(t=>t!==d.type):[...prefs.favorites,d.type];write(PREF,prefs);renderPalette();};b.append(star);b.onclick=()=>add(d.type);b.draggable=true;b.ondragstart=e=>e.dataTransfer.setData('text/plain',d.type);group.append(b);}if(!ds.length)group.append(el('small',null,'FB_IN / FB_OUT definieren die Schnittstelle; Unterpläne folgen später.'));root.append(group);}}
function add(type,x,y){if(plan.blocks.length>=200){status('Maximal 200 Bausteine.');return;}const d=byType.get(type),origin=flowCanvas?.center()||{x:80,y:70};change(()=>{const b=createBlock(d,x??origin.x+plan.blocks.length%3*240,y??origin.y+Math.floor(plan.blocks.length%9/3)*190);b.x=Math.min(12000,b.x);b.y=Math.min(60000,b.y);b.name=type+'_'+(plan.blocks.filter(n=>n.type===type).length+1);plan.blocks.push(b);selected=b.id;prefs.recent=[type,...prefs.recent.filter(t=>t!==type)].slice(0,12);write(PREF,prefs);});}
function finishConnection(link){change(()=>{plan.links.push(link);pending=null;});status('Verbunden. Am Zieleingang ziehen, um die Verbindung umzuhängen.');}
function pinButton(b,p,side){const n=el('button','pin '+(side==='outputs'?'out':''),p.id);n.style.setProperty('--pin',color(p.type));n.dataset.block=b.id;n.dataset.pin=p.id;n.dataset.side=side;n.title=p.type+' · Maustaste halten und Verbindung ziehen';n.setAttribute('aria-label',b.name+' '+p.id+' '+(side==='outputs'?'Ausgang':'Eingang'));if(pending&&pending[0]===b.id&&pending[1]===p.id&&side==='outputs')n.classList.add('pending');n.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();n.click();}};n.onclick=e=>{e.stopPropagation();if(e.detail!==0)return;if(side==='outputs'){pending=[b.id,p.id];status('Tastatur: passenden Eingang mit Enter verbinden.');renderNodes();}else if(pending){try{finishConnection(connectionCandidate(plan,byType,{block:pending[0],pin:pending[1],side:'outputs'},{block:b.id,pin:p.id,side}));}catch(error){status(error.message);}}};return n;}
function createNodeElement(b){const d=byType.get(b.type),node=el('article','block'+(selected===b.id?' selected':''));node.dataset.id=b.id;node.style.setProperty('--accent',accent(d));const head=el('header');head.append(el('strong',null,b.name));const cog=el('button',null,'⚙');cog.title='Eigenschaften '+b.name;cog.onclick=()=>{selected=b.id;render();};head.append(cog);head.append(blockMenu(b));node.append(head,el('div','typename',b.type));if(['STATE_IN','STATE_OUT'].includes(b.type))node.append(el('div','entity',(b.params.oid||'Keine HA-Entität gewählt')+(b.params.attribute?' · '+b.params.attribute:'')));if(b.type==='CONST'){const row=el('div','pinrow');row.append(field(b.params.type,b.params.value,v=>change(()=>b.params.value=v)));node.append(row);}if(b.type==='COMMENT')node.append(el('div','entity',b.params.text));
 const ins=pins(d,b,'inputs'),outs=pins(d,b,'outputs');for(let i=0;i<Math.max(ins.length,outs.length);i++){const row=el('div','pinrow');if(ins[i]){const p=ins[i];row.append(pinButton(b,p,'inputs'));if(!['FLOW','REFERENCE'].includes(p.type)&&!plan.links.some(l=>l.to[0]===b.id&&l.to[1]===p.id))row.append(field(p.type,b.params[p.id]??p.default,v=>change(()=>b.params[p.id]=v)));}if(outs[i])row.append(pinButton(b,outs[i],'outputs'));node.append(row);}if(values.has(b.id))node.append(el('div','result','Demo: '+String(values.get(b.id))));if(!supported.has(b.type)&&!flowTypes.has(b.type)&&b.type!=='COMMENT')node.append(el('div','limited','Vorlage · Export folgt'));for(const control of node.querySelectorAll('button,input,select,textarea,.block-menu')){control.classList.add('nodrag','nopan');control.addEventListener('keydown',e=>e.stopPropagation());}return node;}
function renderNodes(){
 liveNodes = new Map();
 const incoming = new Map(plan.links.map(link => [JSON.stringify(link.to), link.from]));
 const nodes = plan.blocks.map(b => {
  const element = createNodeElement(b);
  if (embeddedInPro) {
   const pin = el('button','nodrag nopan',b.pinned ? '◆' : '◇');
   pin.title = b.pinned ? 'Baustein lösen' : 'Baustein anheften';
   pin.setAttribute('aria-label', pin.title);
   pin.setAttribute('aria-pressed', String(Boolean(b.pinned)));
   pin.onclick = () => change(() => b.pinned = !b.pinned);
   element.querySelector('header').append(pin);
   if (b.type !== 'COMMENT') {
    const stop = el('button','nodrag nopan',breakpoints.has(b.id) ? '●' : '○');
    stop.title = 'Haltepunkt';
    stop.setAttribute('aria-label', stop.title);
    stop.setAttribute('aria-pressed', String(breakpoints.has(b.id)));
    stop.onclick = () => {
     if (breakpoints.has(b.id)) breakpoints.delete(b.id);
     else breakpoints.add(b.id);
     renderNodes();
    };
    element.querySelector('header').append(stop);
   }
  }
  if (embeddedInPro) {
   liveNodes.set(b.id, element);
   for (const pin of element.querySelectorAll('.pin')) {
    const badge = el('span', 'live-pin');
    badge.dataset.livePin = pin.dataset.pin;
    badge.dataset.liveSide = pin.dataset.side;
    if (pin.dataset.side === 'outputs') pin.before(badge);
    else pin.after(badge);
   }
   element.append(el('div','live-evaluated'));
  }
  for (const pin of element.querySelectorAll('.pin[data-side="inputs"]')) {
   const source = incoming.get(JSON.stringify([b.id, pin.dataset.pin]));
   if (!source) continue;
   pin.classList.add('connected-input');
   pin.dataset.edgeId = JSON.stringify([source, [b.id, pin.dataset.pin]]);
   if (!values.size) continue;
   const value = simulationSignals.get(source.join('.'));
   if (value === undefined || typeof value === 'boolean') continue;
   const label = String(value);
   const badge = el('span', 'input-signal', label || '""');
   badge.title = label;
   pin.after(badge);
  }
  return {id:b.id,type:'logic',position:{x:b.x,y:b.y},selected:selected===b.id,dragHandle:'.block header',data:{element,accent:accent(byType.get(b.type))}};
 });
 paintDiagnosis();
 flowCanvas?.render({nodes,links:plan.links,grid:$('#grid').getAttribute('aria-pressed')==='true'});
}
function renderProperties(){const root=$('#properties');root.replaceChildren();if(docs)renderShortcuts(root);const b=plan.blocks.find(n=>n.id===selected);if(!b){if(docs)return;root.append(el('h3',null,'Funktionsplan'),el('p',null,'Baustein links anklicken oder auf die Fläche ziehen. Am Anschluss Maustaste halten, zum passenden Ziel ziehen und loslassen. BOOL verbindet nur mit BOOL; INT darf an REAL. Esc bricht ab. Die Ausgabe ist auswählbar; nicht unterstützte Bausteine sperren den Export.'),el('p',null,`${defs.length} Definitionen · Werte und HA-Abläufe · keine Live-Ausführung.`));return;}const d=byType.get(b.type);root.append(el('h3',null,b.type),el('p',null,description(d)));if(docs){for(const side of ['inputs','outputs'])root.append(el('p',null,(side==='inputs'?'Eingänge: ':'Ausgänge: ')+pins(d,b,side).map(p=>p.id+' ('+p.type+')').join(', ')));root.append(el('p',null,'Referenz: ioBroker.javascript a1dde1a · Metadaten MIT. Export- und Simulationsumfang ist gesondert ausgewiesen. 33 Werttypen exportierbar; native HA-Abläufe zusätzlich als YAML. Speicher, Flanken, Timer und Zähler benötigen einen Speicher-Host. Regler und eigene Unterpläne folgen später.'));return;}function prop(label,type,value,set,options,picker=false){const l=el('label',null,label),input=field(type,value,v=>change(()=>set(v)),options);if(picker){input.setAttribute('aria-label',label);const row=el('span','entity-field'),button=el('button','entity-picker-button');button.type='button';button.title='HA-Entität auswählen';button.setAttribute('aria-label','HA-Entität auswählen für '+b.name);const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('aria-hidden','true');icon.innerHTML='<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 12h2m4 0h2M8 17h2m4 0h2"/>';button.append(icon);button.onclick=e=>{e.preventDefault();haConnection?.show();};row.append(input,button);l.append(row);}else l.append(input);root.append(l);}prop('Instanzname','STRING',b.name,v=>b.name=v);prop('Kommentar','STRING',b.comment,v=>b.comment=v);for(const p of d.params||[]){const label=({config:'HA-Konfiguration (JSON)',slots:'Zweigpfade (JSON)',kind:'Planart',key:'Parameter-/Feldschlüssel',path:'Parameterpfad',oid:'HA-Entity-ID',mode:'Ausgangsmodus (BRIGHTNESS = 0–100 %)',attribute:'Attribut (leer = Zustand)',memory:'Speicher-Helfer input_text (leer = Export-ID)',type:'Signaltyp',demo:'Demo-Eingang (nur Simulation)',value:'Wert',text:'Kommentartext'})[p.id]||p.id;prop(label,resolved(p.type,b),b.params[p.id]??p.default,v=>{if(p.id==='mode'&&v!==b.params.mode)b.params.IN=v==='TEXT'?'':v==='BOOL'?false:0;if(d.flow&&['slots','config'].includes(p.id))flowPins({...b,params:{...b.params,[p.id]:v}},'outputs');b.params[p.id]=v;},p.options,p.id==='oid'&&['STATE_IN','STATE_OUT'].includes(b.type));}if(d.extensible)prop('Anzahl Eingänge','INT',pins(d,b,'inputs').length,v=>b.params.inputCount=Math.min(d.extensible.max,Math.max(d.extensible.min,v)));if(d.extensibleOutputs)prop('Anzahl Ausgänge','INT',pins(d,b,'outputs').length,v=>b.params.outputCount=Math.min(d.extensibleOutputs.max,Math.max(d.extensibleOutputs.min,v)));for(const p of pins(d,b,'inputs').filter(p=>!['FLOW','REFERENCE'].includes(p.type)))prop('Eingang '+p.id,p.type,b.params[p.id]??p.default,v=>b.params[p.id]=v);prop('X','INT',b.x,v=>b.x=Math.max(10,Math.min(12000,v)));prop('Y','INT',b.y,v=>b.y=Math.max(10,Math.min(60000,v)));const del=el('button','delete','Baustein entfernen');del.onclick=()=>remove();root.append(del);}
function remove(){if(!selected)return;change(()=>{plan.blocks=plan.blocks.filter(b=>b.id!==selected);plan.links=plan.links.filter(l=>l.from[0]!==selected&&l.to[0]!==selected);selected=null;pending=null;});}
function blockMenu(b){const box=el('div','block-menu'),button=el('button',null,'⋮'),menu=el('div','block-menu-items');button.title='Baustein-Menü '+b.name;button.setAttribute('aria-label',button.title);button.setAttribute('aria-expanded','false');menu.hidden=true;menu.setAttribute('role','menu');for(const [label,action]of [['Eigenschaften',()=>{selected=b.id;docs=false;render();}],['Duplizieren',()=>change(()=>{if(plan.blocks.length>=200){status('Maximal 200 Bausteine.');return;}const copy=structuredClone(b);copy.id=createBlock(byType.get(b.type)).id;copy.name=b.name+' Kopie';copy.x+=40;copy.y+=40;plan.blocks.push(copy);selected=copy.id;})],['Löschen',()=>{selected=b.id;remove();}]]){const item=el('button',null,label);item.setAttribute('role','menuitem');item.onclick=e=>{e.stopPropagation();menu.hidden=true;action();};menu.append(item);}button.onclick=e=>{e.stopPropagation();for(const other of document.querySelectorAll('.block-menu-items'))if(other!==menu)other.hidden=true;menu.hidden=!menu.hidden;button.setAttribute('aria-expanded',String(!menu.hidden));};box.append(button,menu);return box;}
document.addEventListener('click',e=>{if(!e.target.closest('.block-menu'))for(const menu of document.querySelectorAll('.block-menu-items'))menu.hidden=true;});document.addEventListener('keydown',e=>{if(e.key==='Escape')for(const menu of document.querySelectorAll('.block-menu-items'))menu.hidden=true;});
function render(){renderPalette();renderNodes();renderProperties();$('#target').value=outputPlan().target;const name=$('#name');name.placeholder=defaultPlanName;name.value=plan.name===defaultPlanName?'':plan.name;$('#count').textContent=plan.blocks.length+' Bausteine · '+plan.links.length+' Verbindungen';$('#undo').disabled=!history.length;$('#redo').disabled=!future.length;const issues=analyze(plan,byType).errors;$('#issues').textContent=issues.length?issues.join('\n'):'Grundprüfung erfolgreich. Ausgabevorschau vor Verwendung kontrollieren.';if(document.documentElement.hasAttribute('data-embedded-pro'))document.dispatchEvent(new Event('pro-fbd-render'));}
function outputPlan(){
  return document.documentElement.hasAttribute('data-embedded-pro') && plan.target==='javascript'
    ? {...plan,target:'automation'} : plan;
}
function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type})),a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function filename(){return plan.name.replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,70)||'logic-plan';}
function backup(){const backups=safeRead(KEY+'-backups')||[];write(KEY+'-backups',[{at:new Date().toISOString(),plan},...backups].slice(0,5));}
function chooseHA(entity){const current=plan.blocks.find(b=>b.id===selected);if(!current)throw Error('Baustein fehlt.');const candidate=structuredClone(plan),b=candidate.blocks.find(n=>n.id===selected);b.params=entityParameters(b.params,entity,b.type);if(b.name===b.type||b.name.startsWith(b.type+'_'))b.name=entity.name;const errors=analyze(candidate,byType,false).errors;if(errors.length)throw Error('Auswahl passt nicht zu vorhandenen Verbindungen: '+errors.join(' ')+' Verbindung zuerst lösen oder Signaltyp manuell wählen.');change(()=>plan=candidate);status('HA-Entität übernommen: '+entity.entity_id+' · nur gelesen, keine Geräteaktion.');}
haConnection=connectHA({workspace:!embeddedInPro,getPlan:()=>plan,getPreferences:()=>prefs,hasLocal:()=>!!safeRead(KEY),selected:()=>plan.blocks.find(b=>b.id===selected),choose:chooseHA,report:status,restore:data=>{const restored=loadPlan(data.plan,byType);backup();checkpoint();plan=restored;if(data.preferences)for(const k of Object.keys(prefs))if(Array.isArray(data.preferences[k]))prefs[k]=data.preferences[k].filter(v=>typeof v==='string').slice(0,100);if(locales.includes(data.preferences?.language))prefs.language=data.preferences.language;write(KEY,plan);write(PREF,prefs);selected=null;pending=null;render();status('App-Projekt geladen; vorheriger Browserstand gesichert.');}});
$('#save').onclick=()=>download(filename()+'.logic.json',JSON.stringify(plan,null,2),'application/json');$('#open').onclick=()=>$('#file').click();$('#file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1_000_000)throw Error('Maximal 1 MB.');const next=loadPlan(JSON.parse(await file.text()),byType);backup();change(()=>{plan=next;selected=null;pending=null;});status('Projekt geladen; vorheriger Stand lokal gesichert und per Rückgängig erreichbar.');}catch(error){status('Import abgebrochen: '+error.message);}e.target.value='';};
$('#new').onclick=()=>{backup();change(()=>{plan=emptyPlan();selected=null;pending=null;});};$('#example').onclick=()=>{backup();change(()=>{plan=emptyPlan();plan.name='Freigabe UND Anwesenheit';const a=createBlock(byType.get('STATE_IN'),70,90),b=createBlock(byType.get('STATE_IN'),70,330),and=createBlock(byType.get('AND'),390,180),out=createBlock(byType.get('STATE_OUT'),720,180);a.params.oid='input_boolean.demo_freigabe';a.params.demo=true;a.name='Freigabe';b.params.oid='input_boolean.demo_anwesend';b.params.demo=true;b.name='Anwesenheit';and.name='UND';out.params.oid='input_boolean.demo_licht';out.name='Licht';plan.blocks=[a,b,and,out];plan.links=[{from:[a.id,'Q'],to:[and.id,'IN1']},{from:[b.id,'Q'],to:[and.id,'IN2']},{from:[and.id,'OUT'],to:[out.id,'IN']}];selected=and.id;pending=null;});};
$('#undo').onclick=()=>{if(!history.length)return;future.push(JSON.stringify(plan));plan=JSON.parse(history.pop());selected=null;pending=null;values.clear();persist();render();};$('#redo').onclick=()=>{if(!future.length)return;history.push(JSON.stringify(plan));plan=JSON.parse(future.pop());selected=null;pending=null;values.clear();persist();render();};$('#target').onchange=e=>change(()=>plan.target=e.target.value);$('#name').onchange=e=>change(()=>plan.name=e.target.value||'Funktionsplan');$('#search').oninput=renderPalette;for(const button of document.querySelectorAll('[data-tab]'))button.onclick=()=>{tab=button.dataset.tab;document.querySelectorAll('[data-tab]').forEach(n=>n.classList.toggle('active',n===button));renderPalette();};$('#properties-tab').onclick=()=>{docs=false;$('#properties-tab').classList.add('active');$('#docs-tab').classList.remove('active');renderProperties();};$('#docs-tab').onclick=()=>{docs=true;$('#docs-tab').classList.add('active');$('#properties-tab').classList.remove('active');renderProperties();};$('#simulate').onclick=()=>{try{const result=scan(plan,byType,{memory:simulationMemory,now:simulationNow});simulationMemory=result.memory;values=result.values;simulationSignals=result.signals;renderNodes();status('Simulationsschritt – nur Demowerte, keine HA-Aktionen.');}catch(e){status('Simulation nicht möglich: '+e.message);}};
$('#export').onclick=()=>{try{$('#code').value=compile(plan,byType);$('#output-info').textContent=plan.target==='javascript'?'JavaScript-Funktion für eine serverseitige HA-Anbindung. readState/callAction müssen vom Host bereitgestellt werden. Kein ioBroker-Skript, keine automatische Ausführung.':'HA-YAML zum manuellen Prüfen und Importieren. Demo-Entity-IDs ersetzen. Studio schreibt keine Automationen in HA.';$('#output').showModal();}catch(e){status('Export gesperrt: '+e.message);}};$('#close-output').onclick=()=>$('#output').close();$('#copy').onclick=async()=>{try{await navigator.clipboard.writeText($('#code').value);status('Code kopiert.');}catch{status('Kopieren nicht erlaubt. Code markieren oder Datei speichern.');}};$('#download').onclick=()=>download(filename()+(plan.target==='javascript'?'.mjs':'.yaml'),$('#code').value,'text/plain');
$('#fit').onclick=()=>flowCanvas.fit();$('#plus').onclick=()=>flowCanvas.zoom(.1);$('#minus').onclick=()=>flowCanvas.zoom(-.1);$('#grid').onclick=()=>{const active=$('#grid').getAttribute('aria-pressed')!=='true';$('#grid').setAttribute('aria-pressed',String(active));renderNodes();};document.onkeydown=e=>{if(e.target.closest('input,textarea,select')||$('#output').open)return;if(e.key==='Escape'){pending=null;renderNodes();}if(e.key==='Delete'){e.preventDefault();remove();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();$('#undo').click();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();$('#redo').click();}};

flowCanvas=mountFlow($('#flow-root'),{
 validate:(a,b,index)=>connectionCandidate(plan,byType,a,b,plan.links[index]),connect:finishConnection,report:status,
 reconnect:(index,link)=>{
  const previous=plan.links[index];
  if(!previous || JSON.stringify(previous.to)===JSON.stringify(link.to)) return;
  change(()=>{plan.links[index]=link;pending=null;});
 },
 select:id=>{if(selected===id)return;selected=id;renderProperties();},
 properties:id=>{selected=id;docs=false;render();},
 dragStart:id=>{selected=id;checkpoint();},
 keyboardMove:(id,position)=>{const b=plan.blocks.find(n=>n.id===id);if(b)change(()=>Object.assign(b,boundedPosition(position)));},
 move:(id,position)=>{const b=plan.blocks.find(n=>n.id===id);if(b){Object.assign(b,boundedPosition(position));persist();render();}},
 removeEdge:index=>change(()=>plan.links.splice(index,1)),
 drop:(type,position)=>{if(byType.has(type))add(type,position.x,position.y);},
 zoom:value=>{zoom=value;$('#zoom').textContent=Math.round(value*100)+' %';},
});
render();

connectExport({getPlan:outputPlan,defs:byType,update:options=>change(()=>plan.exportOptions=options),report:status});
if (new URLSearchParams(location.search).has('pro')) {
  document.addEventListener('pro-export-js', event => {
    try { event.detail.success(compile({...plan, target: 'javascript'}, byType)); }
    catch (error) { event.detail.failure(error.message); }
  });
}

const advanceSimulation=el('button',null,'Simulation +1 s');advanceSimulation.id='simulation-advance';advanceSimulation.onclick=()=>{simulationNow+=1000;$('#simulate').click();};const resetSimulation=el('button',null,'Simulation zurücksetzen');resetSimulation.id='simulation-reset';resetSimulation.onclick=()=>{simulationMemory={};simulationNow=Date.now();values.clear();simulationSignals.clear();renderNodes();status('Simulationsspeicher zurückgesetzt; HA bleibt unverändert.');};const simulationGroup=el('div','simulation-controls');simulationGroup.setAttribute('role','group');simulationGroup.setAttribute('aria-label','Simulation');$('#simulate').before(simulationGroup);simulationGroup.append($('#simulate'),advanceSimulation,resetSimulation);
connectImport({apply:next=>{backup();change(()=>{plan=loadPlan(next,byType);selected=null;pending=null;simulationMemory={};});},report:status});
import {arrangeToolbar} from './toolbar.js?v=0.1.12';
arrangeToolbar();
document.documentElement.toggleAttribute('data-embedded-pro', embeddedInPro);
if (embeddedInPro) {
  $('#simulate').onclick = () => debugSimulation(false);
  document.addEventListener('pro-fbd-step', () => debugSimulation(true));
  $('#simulation-reset').addEventListener('click', () => { debugScan = undefined; });
  $('#simulation-advance').addEventListener('click', () => { debugScan = undefined; }, {capture: true});
  document.addEventListener('pro-fbd-arrange', () => {
    const next = structuredClone(plan);
    try {
      arrangeBlocks(analyze(next, byType, false).order, next.links);
      change(() => plan = next);
    } catch (error) { status(error.message); }
  });
}
if (embeddedInPro) {
  document.addEventListener('pro-fbd-read', event => event.detail({plan: structuredClone(plan)}));
  const liveIssue = el('div', 'fbd-live-issue');
  liveIssue.id = 'fbd-live-issue';
  liveIssue.hidden = true;
  liveIssue.setAttribute('role', 'status');
  $('#viewport').append(liveIssue);
  document.addEventListener('pro-fbd-diagnosis', ({detail}) => {
   liveDiagnosis = detail?.blocks ? {...detail, blocks: new Map(detail.blocks.map(block => [block.id, block]))} : undefined;
   paintDiagnosis();
  });
  document.addEventListener('pro-fbd-load', event => {
    debugScan = undefined;
    breakpoints.clear();
    plan = event.detail ? loadPlan(event.detail, byType) : emptyPlan();
    selected = null; pending = null; history = []; future = []; values.clear();
    simulationMemory = {}; simulationSignals.clear(); simulationNow = Date.now();
    render();
  });
  prefs.language = proLocale;
  render();
}
const language = connectLanguage({
  picker: !embeddedInPro,
  getLanguage: () => prefs.language || 'de',
  setLanguage: locale => {prefs.language=locale;write(PREF,prefs);renderPalette();},
});
if (embeddedInPro) document.addEventListener('pro-language', event => language.changeLanguage(event.detail));
if (embeddedInPro) window.frameElement?.dispatchEvent(new Event('pro-fbd-ready'));
