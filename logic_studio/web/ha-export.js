// Native Home Assistant configuration. No write-back or execution in the editor.
import {statefulTypes,memoryId} from './stateful.js?v=0.1.7';
export function exportOptions(plan) {
 const o=plan.exportOptions||{};
 const mode=o.mode??'restart',format=o.format??'editor';
 if(!['single','restart','queued','parallel'].includes(mode))throw Error('Ungültige HA-Ausführungsart.');
 if(!['editor','file','package'].includes(format))throw Error('Ungültiges HA-Ausgabeformat.');
 let objectId=o.objectId||plan.name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9_]+/g,'_').replace(/^_+|_+$/g,'').slice(0,70)||'logic_plan';
 if(!o.objectId&&!/^[a-z]/.test(objectId))objectId='logic_'+objectId;
 if(!/^[a-z][a-z0-9_]{0,79}$/.test(objectId))throw Error('Export-ID muss mit einem Buchstaben beginnen und nur a–z, 0–9 oder _ enthalten.');
 const max=o.max??10;
 if(!Number.isInteger(max)||max<1||max>100)throw Error('Maximale Durchläufe: 1 bis 100.');
 if(o.description!==undefined&&(typeof o.description!=='string'||o.description.length>2000))throw Error('Ungültige Exportbeschreibung.');
 for(const key of ['onStart','onlyChanges'])if(o[key]!==undefined&&typeof o[key]!=='boolean')throw Error('Ungültige Exportoption '+key+'.');
 return {mode,format,objectId,max,description:o.description??'',onStart:o.onStart??false,onlyChanges:o.onlyChanges??true};
}

const quote=JSON.stringify;
const condition=(alias,expression)=>({alias,condition:'template',value_template:`{{ ${expression} }}`});

export function memoryHelpers(plan){
 const o=exportOptions(plan),helpers={};
 for(const b of plan.blocks)if(statefulTypes.has(b.type)){const id=memoryId(plan,b,o.objectId);helpers[id.slice(11)]={name:plan.name+' · '+b.name,min:0,max:255,mode:'text'};}
 return helpers;
}

export function haConfig(plan,{reads,steps,outs,memories=[]}) {
 const options=exportOptions(plan),actions=[];
 if(reads.length)actions.push({alias:'Eingänge als Momentaufnahme lesen',variables:Object.fromEntries(reads.map(r=>[r.raw,`{{ {'value':${r.attribute?`state_attr(${quote(r.entity)},${quote(r.attribute)})`:`states(${quote(r.entity)})`}} }}`]))});
 for(const r of reads){
  const value=r.raw+'.value',valid=r.type==='BOOL'?`(${value} is boolean) or (${value} in ['on','off','true','false',0,1])`:
   ['REAL','INT'].includes(r.type)?`${value} is not boolean and is_number(${value})`:`${value} is not none and ${value} not in ['unknown','unavailable']`;
  actions.push(condition('Eingang prüfen: '+r.entity+(r.attribute?'.'+r.attribute:''),`has_value(${quote(r.entity)}) and (${valid})`));
 }
 if(memories.length){
  actions.push({variables:{logic_now:'{{ (as_timestamp(now()) * 1000)|int }}',logic_boot:"{{ (trigger is defined and trigger.id == 'logic_start') or (logic_seed|default(false)) }}"}});
  for(const m of memories){
   const raw=`states(${quote(m.id)})`;
   actions.push(condition('Speicher-Helfer bereit: '+m.id,`${raw} != 'unavailable' and (state_attr(${quote(m.id)},'max')|int(0)) >= 255 and (${raw} in ['', 'unknown'] or ${raw}.startswith('v1:'))`));
   actions.push({variables:{[m.name]:`{{ {} if ${raw} in ['', 'unknown'] else (${raw}[3:]|from_json(default=none)) }}`}});
   const v=m.name;
   actions.push(condition('Speicherformat prüfen: '+m.id,`${v} is mapping and (not ${v} or (${v}.get('version') == 1 and ${v}.get('kind') == ${quote(m.kind)} and ${v}.get('q',false) is boolean and ${v}.get('p',false) is boolean and ${v}.get('u',false) is boolean and ${v}.get('d',false) is boolean and is_number(${v}.get('cv',0)) and ${v}.get('cv',0) >= 0 and ${v}.get('cv',0) <= 2147483647 and (${v}.get('t') is none or (is_number(${v}.get('t')) and ${v}.get('t') >= 0))))`));
  }
 }
 for(const step of steps){
  if(step.stateful){
   const args=step.args,keys=step.stateful==='BLINK'?['TH','TL']:['TON','TOF','TP'].includes(step.stateful)?['PT']:['CTU','CTD','CTUD'].includes(step.stateful)?['PV']:[];
   for(const key of keys){const value=args[key];actions.push(condition('Parameter prüfen: '+step.label+'.'+key,`is_number(${value}) and ${value} >= ${step.stateful==='BLINK'?1:0} and ${value} <= 2147483647`));}
   actions.push({alias:step.label,variables:{[step.name]:step.template}});
  }else{
   if(step.divisor)actions.push(condition('Division durch null verhindern',`${step.divisor} != 0`));
   actions.push({alias:step.label,variables:{[step.name]:`{{ {'value':${step.expression}} }}`}});
   if(['REAL','INT','TIME'].includes(step.type))actions.push(condition('Zahlenergebnis prüfen: '+step.label,`${step.name}.value is number and is_number(${step.name}.value)`));
   if(step.type==='BOOL')actions.push(condition('Logikergebnis prüfen: '+step.label,`${step.name}.value is boolean`));
  }
 }
 // Validate ALL destinations before persisting memory or calling the first action.
 for(const out of outs){
  const value=out.value,id=quote(out.entity),mode=out.mode||'BOOL';
  if(mode==='NUMBER')actions.push(condition('Zielgrenzen prüfen: '+out.label,`is_number(${value}) and is_number(state_attr(${id},'min')) and is_number(state_attr(${id},'max')) and state_attr(${id},'min') <= ${value} <= state_attr(${id},'max')`));
  if(mode==='TEXT')actions.push(condition('Textlänge prüfen: '+out.label,`${value} is string and (state_attr(${id},'min')|int(0)) <= (${value}|length) <= (state_attr(${id},'max')|int(255))`));
  if(mode==='BRIGHTNESS')actions.push(condition('Helligkeit prüfen: '+out.label,`is_number(${value}) and 0 <= ${value} <= 100`));
 }
 for(const [i,m] of memories.entries()){
  const step=steps.find(s=>s.stateful&&s.template.includes(m.name+'.get('));if(!step)throw Error('Speicherzuordnung fehlt.');
  const value=`{{ 'v1:' ~ (${step.name}.state|to_json) }}`,temp='save_memory'+i;
  actions.push({variables:{[temp]:value}});
  actions.push(condition('Speichergröße prüfen',`(${temp}|length) <= 255`));
 }
 for(const [i,m] of memories.entries())actions.push({if:[condition('Nur geänderten Speicher sichern',`states(${quote(m.id)}) != save_memory${i}`)],then:[{action:'input_text.set_value',target:{entity_id:m.id},data:{value:`{{ save_memory${i} }}`}}]});
 for(const out of outs){
  const domain=out.entity.split('.')[0],mode=out.mode||'BOOL',value=out.value,id=quote(out.entity);
  if(mode==='BOOL'){
   const choose={alias:out.label,choose:[{conditions:[condition('Ausgang EIN',value)],sequence:[{action:domain+'.turn_on',target:{entity_id:out.entity}}]}],default:[{action:domain+'.turn_off',target:{entity_id:out.entity}}]};
   actions.push(options.onlyChanges?{alias:out.label+' nur bei Abweichung',if:[condition('Zielzustand abweichend',`not is_state(${id}, 'on' if ${value} else 'off')`)],then:[choose]}:choose);
  }else if(mode==='BRIGHTNESS'){
   actions.push({alias:out.label,choose:[{conditions:[condition('Helligkeit null',`${value} == 0`)],sequence:[{action:'light.turn_off',target:{entity_id:out.entity}}]}],default:[{action:'light.turn_on',target:{entity_id:out.entity},data:{brightness_pct:`{{ ${value} }}`}}]});
  }else{
   // Render the whole mapping so text such as "[1,2]" is not retyped by HA.
   const command={alias:out.label,action:domain+'.set_value',target:{entity_id:out.entity},data:mode==='TEXT'?`{{ {'value':${value}} }}`:{value:`{{ ${value} }}`}};
   const same=mode==='NUMBER'?`states(${id})|float(none) == ${value}`:`states(${id}) == ${value}`;
   actions.push(options.onlyChanges?{if:[condition('Zielwert abweichend',`not (${same})`)],then:[command]}:command);
  }
 }
 const config={alias:plan.name,description:options.description||'Erstellt mit UGSo Logic Studio. Vor Verwendung Ziele und Speicher-Helfer prüfen.'};
 if(plan.target==='automation'){
  config.triggers=reads.map((r,i)=>({trigger:'state',entity_id:r.entity,...(r.attribute?{attribute:r.attribute}:{}),id:'input_'+i}));
  if(options.onStart||memories.length)config.triggers.push({trigger:'homeassistant',event:'start',id:'logic_start'});
  if(memories.length)config.triggers.push({trigger:'time_pattern',seconds:'/1',id:'logic_tick'});
  config.conditions=[];config.actions=actions;config.trace={stored_traces:5};
 }else{
  config.sequence=actions;
  if(memories.length)config.fields={logic_seed:{name:'Nach Host-/HA-Neustart Flanken initialisieren',default:false,selector:{boolean:{}}}};
 }
 config.mode=memories.length?'queued':options.mode;
 if(['queued','parallel'].includes(config.mode))config.max=options.max;
 if(options.format==='package')return {...(memories.length?{input_text:memoryHelpers(plan)}:{}),...(plan.target==='automation'?{automation:[{id:'logic_'+options.objectId,...config}]}:{script:{[options.objectId]:config}})};
 return options.format==='file'?(plan.target==='automation'?[{id:'logic_'+options.objectId,...config}]:{[options.objectId]:config}):config;
}
