// Native HA schema subset with lossless values. Runtime integration checks belong to HA.
const object = (v, p) => { if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error(`${p}: Objekt erwartet.`); };
const keys = (v, allowed, p) => { object(v, p); const extra = Object.keys(v).filter(k => !allowed.includes(k)); if (extra.length) throw Error(`${p}: Noch nicht unterstützt: ${extra.join(', ')}.`); };
const str = (v, p) => { if (typeof v !== 'string' || !v.trim()) throw Error(`${p}: Text fehlt.`); };
const bool = (v, p) => { if (typeof v !== 'boolean') throw Error(`${p}: Boolean erwartet.`); };
const has = (v, k) => Object.hasOwn(v, k);
export const isTemplate = v => typeof v === 'string' && /\{\{[\s\S]*?\S[\s\S]*?\}\}|\{%[\s\S]*?\S[\s\S]*?%\}/.test(v);
const template = (v, p) => { if (!isTemplate(v)) throw Error(`${p}: HA-Template erwartet.`); };
const entity = (v, p) => { if (typeof v !== 'string' || !/^[a-z][a-z0-9_]*\.[a-z0-9_]+$/.test(v)) throw Error(`${p}: Entitäts-ID erwartet.`); };
const list = (v, fn, p, min = 0) => { if (!Array.isArray(v) || v.length < min || v.length > 100) throw Error(`${p}: ${min}–100 Einträge erwartet.`); v.forEach(x => fn(x, p)); };
const many = (v, fn, p) => Array.isArray(v) ? list(v, fn, p, 1) : fn(v, p);
const finite = (v, p) => { if (typeof v !== 'number' || !Number.isFinite(v)) throw Error(`${p}: Gültige Zahl erwartet.`); };
const json = (v, p, depth = 0) => {
  if (depth > 15) throw Error(`${p}: Daten zu tief verschachtelt.`);
  if (v === null || ['string', 'boolean'].includes(typeof v)) return;
  if (typeof v === 'number') return finite(v, p);
  if (Array.isArray(v)) return list(v, x => json(x, p, depth + 1), p);
  object(v, p); if (JSON.stringify(v).length > 10000) throw Error(`${p}: Daten zu groß.`);
  for (const [k, x] of Object.entries(v)) { if (['__proto__', 'constructor', 'prototype'].includes(k)) throw Error(`${p}: Ungültiger Schlüssel.`); json(x, p, depth + 1); }
};
const mapping = (v, p) => { object(v, p); json(v, p); };
const variables = (v, p) => { mapping(v, p); if (Object.keys(v).length > 100) throw Error(`${p}: Höchstens 100 Variablen.`); for (const k of Object.keys(v)) if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) throw Error(`${p}: Variablenname ungültig.`); };
const common = ['alias', 'enabled'];
function options(v, p, action = false) {
  if (has(v, 'alias') && typeof v.alias !== 'string') throw Error(`${p}: Alias muss Text sein.`);
  if (has(v, 'enabled') && !isTemplate(v.enabled)) bool(v.enabled, p);
  if (has(v, 'continue_on_error')) bool(v.continue_on_error, p);
  if (!action && has(v, 'variables')) variables(v.variables, p);
}
const weekday = (v, p) => many(v, x => { if (!['mon','tue','wed','thu','fri','sat','sun'].includes(x)) throw Error(`${p}: Wochentag ungültig.`); }, p);
function clock(v, p) {
  if (isTemplate(v)) return;
  if (typeof v !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(v)) throw Error(`${p}: Uhrzeit HH:MM oder HH:MM:SS erwartet.`);
}
function clockSource(v, p) { if (typeof v === 'string' && /^(input_datetime|sensor|time)\./.test(v)) entity(v, p); else clock(v, p); }
export function checkDuration(v, p, signed = false) {
  if (isTemplate(v)) return;
  if (typeof v === 'number') { finite(v, p); if (!signed && v < 0) throw Error(`${p}: Dauer muss positiv oder null sein.`); return; }
  if (typeof v === 'string') { if (!(signed ? /^-?\d+:[0-5]\d(?::[0-5]\d(?:\.\d+)?)?$/ : /^\d+:[0-5]\d(?::[0-5]\d(?:\.\d+)?)?$/).test(v)) throw Error(`${p}: Dauer ungültig.`); return; }
  keys(v, ['days','hours','minutes','seconds','milliseconds'], p);
  if (!Object.keys(v).length) throw Error(`${p}: Dauereinheit fehlt.`);
  Object.values(v).forEach(x => { if(isTemplate(x))return;finite(x,p);if(!signed&&x<0)throw Error(`${p}: Dauer muss positiv oder null sein.`); });
}
function range(v, p) {
  const bounds = ['above','below'].filter(k => has(v, k));
  if (!bounds.length) throw Error(`${p}: Zahlengrenze fehlt.`);
  for (const k of bounds) typeof v[k] === 'string' ? entity(v[k], p) : finite(v[k], p);
  if (bounds.length === 2 && typeof v.above === 'number' && typeof v.below === 'number' && v.above >= v.below) throw Error(`${p}: above muss kleiner als below sein.`);
}
function target(v, p, templates = true) {
  keys(v, ['entity_id','device_id','area_id','floor_id','label_id'], p);
  if (!Object.keys(v).length) throw Error(`${p}: Ziel fehlt.`);
  for (const [k,x] of Object.entries(v)) many(x, id => { if (templates && isTemplate(id)) return; if (k === 'entity_id' && !['all','none'].includes(id)) entity(id, p); else str(id, p); }, p);
}
const triggerFields = {
  state: ['entity_id','from','to','not_from','not_to','attribute','for'],
  numeric_state: ['entity_id','above','below','attribute','value_template','for'],
  time: ['at','weekday'], time_pattern: ['hours','minutes','seconds'],
  sun: ['event','offset'], homeassistant: ['event'], event: ['event_type','event_data','context'],
  mqtt: ['topic','payload','value_template','encoding','qos'], template: ['value_template','for'],
  webhook: ['webhook_id','allowed_methods','local_only'], zone: ['entity_id','zone','event'],
  tag: ['tag_id','device_id'], conversation: ['command'], geo_location: ['source','zone','event'],
  calendar: ['entity_id','event','offset'], device: ['device_id','domain','type','subtype','entity_id','for','above','below'],
};
export function checkTrigger(v, p = 'Auslöser') {
  object(v, p); options(v, p); if (has(v,'id')) str(v.id,p);
  const type = v.trigger;
  if (['motion.detected','timer.finished','power.changed'].includes(type)) {
    keys(v,['trigger','id',...common,'variables','target','options'],p); target(v.target,p,false);
    if (!has(v,'options')) return;
    if (type === 'power.changed') {
      keys(v.options,['threshold'],p); const t=v.options.threshold;
      const modes={any:[],above:['value'],below:['value'],between:['value_min','value_max'],outside:['value_min','value_max']};
      object(t,p); if(!has(modes,t.type))throw Error(`${p}: Leistungsschwelle ungültig.`);
      keys(t,['type',...modes[t.type]],p);
      for(const k of modes[t.type]) { keys(t[k],['entity','number','unit_of_measurement'],p); if(has(t[k],'entity')){keys(t[k],['entity'],p);entity(t[k].entity,p);if(!/^(sensor|number|input_number)\./.test(t[k].entity))throw Error(`${p}: Zahlenhelfer erwartet.`);}else{finite(t[k].number,p);if(!['mW','W','kW','MW','GW','TW','BTU/h'].includes(t[k].unit_of_measurement))throw Error(`${p}: Leistungseinheit fehlt.`);} }
    } else {
      keys(v.options,['behavior','for'],p);
      if(has(v.options,'behavior')&&!['each','first','all'].includes(v.options.behavior))throw Error(`${p}: Verhalten ungültig.`);
      if(has(v.options,'for'))checkDuration(v.options.for,p);
    }
    return;
  }
  if (['calendar.event_started','calendar.event_ended','temperature.changed'].includes(type)) {
    keys(v, ['trigger','id',...common,'variables','target','options'], p); target(v.target,p,false);
    if (type === 'temperature.changed') {
      keys(v.options,['threshold'],p); const t=v.options.threshold; keys(t,['type','value','value_min','value_max'],p);
      const modes={any:[],above:['value'],below:['value'],between:['value_min','value_max'],outside:['value_min','value_max']};
      if (!has(modes,t.type)) throw Error(`${p}: Temperaturschwelle ungültig.`);
      keys(t,['type',...modes[t.type]],p);
      for (const k of modes[t.type]) { keys(t[k],['entity','number','unit_of_measurement'],p); if (has(t[k],'entity')) { keys(t[k],['entity'],p); entity(t[k].entity,p); if (!/^(sensor|number|input_number)\./.test(t[k].entity)) throw Error(`${p}: Zahlenhelfer erwartet.`); } else { finite(t[k].number,p); if (!['°C','°F'].includes(t[k].unit_of_measurement)) throw Error(`${p}: Temperatureinheit fehlt.`); } }
    } else if (has(v,'options')) { keys(v.options,['offset','offset_type'],p); if (has(v.options,'offset')) checkDuration(v.options.offset,p); if (has(v.options,'offset_type') && !['before','after'].includes(v.options.offset_type)) throw Error(`${p}: Offset-Typ ungültig.`); }
    return;
  }
  if (!has(triggerFields,type)) throw Error(`${p}: Auslöser wird noch nicht unterstützt.`);
  keys(v,['trigger','id',...common,'variables',...triggerFields[type]],p);
  if (has(v,'for')) checkDuration(v.for,p);
  if (has(v,'attribute')) str(v.attribute,p);
  if (has(v,'value_template')) template(v.value_template,p);
  switch(type) {
    case 'state':
      many(v.entity_id,entity,p);
      for (const k of ['from','to','not_from','not_to']) if (has(v,k) && v[k] !== null) many(v[k],str,p);
      if (has(v,'from') && has(v,'not_from') || has(v,'to') && has(v,'not_to')) throw Error(`${p}: Widersprüchliche Zustandsfilter.`); break;
    case 'numeric_state': many(v.entity_id,entity,p); range(v,p); break;
    case 'time': many(v.at,x => { if (x && typeof x === 'object') { keys(x,['entity_id','offset'],p); entity(x.entity_id,p); if (has(x,'offset')) checkDuration(x.offset,p,true); } else clockSource(x,p); },p); if(has(v,'weekday')) weekday(v.weekday,p); break;
    case 'time_pattern': {
      const units=['hours','minutes','seconds'].filter(k=>has(v,k)); if (!units.length) throw Error(`${p}: Zeitmuster fehlt.`);
      for(const k of units) { const x=v[k],max=k==='hours'?23:59; if(x==='*')continue; const s=String(x),div=s.startsWith('/'),digits=div?s.slice(1):s; if(!['string','number'].includes(typeof x)||!/^(0|[1-9]\d*)$/.test(digits)||Number(digits)>max||div&&Number(digits)===0)throw Error(`${p}: Zeitmuster ungültig.`); } break;
    }
    case 'sun': if(!['sunrise','sunset'].includes(v.event))throw Error(`${p}: Sonnenereignis ungültig.`); if(has(v,'offset'))checkDuration(v.offset,p,true); break;
    case 'homeassistant': if(!['start','shutdown'].includes(v.event))throw Error(`${p}: HA-Ereignis ungültig.`); break;
    case 'event': many(v.event_type,str,p); if(has(v,'event_data'))mapping(v.event_data,p); if(has(v,'context'))mapping(v.context,p); break;
    case 'mqtt': str(v.topic,p); if(has(v,'qos') && ![0,1,2].includes(v.qos))throw Error(`${p}: MQTT QoS ungültig.`); if(has(v,'payload'))str(v.payload,p); if(has(v,'encoding') && v.encoding!==null)str(v.encoding,p); break;
    case 'template': template(v.value_template,p); break;
    case 'webhook': many(v.webhook_id,str,p); if(has(v,'local_only'))bool(v.local_only,p); if(has(v,'allowed_methods'))list(v.allowed_methods,x=>{if(!['GET','HEAD','POST','PUT'].includes(x))throw Error(`${p}: HTTP-Methode ungültig.`);},p,1); break;
    case 'zone': many(v.entity_id,entity,p); entity(v.zone,p); if(!['enter','leave'].includes(v.event))throw Error(`${p}: Zonenereignis ungültig.`); break;
    case 'geo_location': str(v.source,p); entity(v.zone,p); if(!['enter','leave'].includes(v.event))throw Error(`${p}: Zonenereignis ungültig.`); break;
    case 'tag': many(v.tag_id,str,p); if(has(v,'device_id'))many(v.device_id,str,p); break;
    case 'conversation': many(v.command,str,p); break;
    case 'calendar': entity(v.entity_id,p); if(!['start','end'].includes(v.event))throw Error(`${p}: Kalenderereignis ungültig.`); if(has(v,'offset'))checkDuration(v.offset,p,true); break;
    case 'device': str(v.device_id,p); str(v.domain,p); str(v.type,p); json(v,p); break;
  }
}
export function checkCondition(v,p='Bedingung',depth=0) {
  if(depth>10)throw Error(`${p}: Bedingungen zu tief verschachtelt.`);
  if(typeof v==='string')return template(v,p);
  object(v,p); options(v,p);
  const fields={time:['before','after','weekday'],state:['entity_id','state','attribute','for','match'],numeric_state:['entity_id','above','below','attribute','value_template'],template:['value_template'],trigger:['id'],and:['conditions'],or:['conditions'],not:['conditions'],sun:['before','after','before_offset','after_offset'],zone:['entity_id','zone'],device:['device_id','domain','type','entity_id','above','below','for']};
  if(!has(fields,v.condition))throw Error(`${p}: Bedingung wird noch nicht unterstützt.`);
  keys(v,['condition',...common,...fields[v.condition]],p);
  if(has(v,'for'))checkDuration(v.for,p);
  if(has(v,'attribute'))str(v.attribute,p);
  switch(v.condition) {
    case 'time': if(!['before','after','weekday'].some(k=>has(v,k)))throw Error(`${p}: Zeitbedingung fehlt.`); for(const k of ['before','after'])if(has(v,k))clockSource(v[k],p); if(has(v,'weekday'))weekday(v.weekday,p); break;
    case 'state': many(v.entity_id,entity,p); many(v.state,str,p); if(has(v,'match')&&!['all','any'].includes(v.match))throw Error(`${p}: match ungültig.`); break;
    case 'numeric_state': many(v.entity_id,entity,p); range(v,p); if(has(v,'value_template'))template(v.value_template,p); break;
    case 'template': str(v.value_template,p); break;
    case 'trigger': many(v.id,str,p); break;
    case 'and': case 'or': case 'not': list(v.conditions,x=>checkCondition(x,p,depth+1),p,1); break;
    case 'sun': if(!['before','after'].some(k=>has(v,k)))throw Error(`${p}: Sonnenbedingung fehlt.`); for(const k of ['before','after'])if(has(v,k)&&!['sunrise','sunset'].includes(v[k]))throw Error(`${p}: Sonnenereignis ungültig.`); for(const k of ['before_offset','after_offset'])if(has(v,k))checkDuration(v[k],p,true); break;
    case 'zone': many(v.entity_id,entity,p); many(v.zone,entity,p); break;
    case 'device': str(v.device_id,p); str(v.domain,p); str(v.type,p); break;
  }
}
export function checkAction(v,p='Aktion',depth=0) {
  if(depth>10)throw Error(`${p}: Aktionen zu tief verschachtelt.`);
  object(v,p); options(v,p,true);
  const types=['variables','action','delay','stop','wait_template','wait_for_trigger','repeat','choose','if','parallel','sequence','condition','event','set_conversation_response','scene'].filter(k=>has(v,k));
  if(types.length!==1)throw Error(`${p}: Genau ein Aktionstyp erforderlich.`);
  const type=types[0],extras={variables:[],action:['target','data','metadata','response_variable'],delay:[],stop:['error','response_variable'],wait_template:['timeout','continue_on_timeout'],wait_for_trigger:['timeout','continue_on_timeout'],repeat:[],choose:['default'],if:['then','else'],parallel:[],sequence:[],condition:['entity_id','state','attribute','for','match','above','below','value_template','id','conditions','before','after','weekday','before_offset','after_offset','zone','device_id','domain','type'],event:['event_data','event_data_template'],set_conversation_response:[],scene:[]};
  keys(v,[type,...common,'continue_on_error',...extras[type]],p);
  const actions=a=>list(a,x=>checkAction(x,p,depth+1),p);
  const conditions=c=>Array.isArray(c)?list(c,x=>checkCondition(x,p,depth+1),p):checkCondition(c,p,depth+1);
  switch(type) {
    case 'variables': variables(v.variables,p); if(!Object.keys(v.variables).length)throw Error(`${p}: Variable fehlt.`); break;
    case 'action': if(!isTemplate(v.action)&&!(typeof v.action==='string'&&/^[a-z][a-z0-9_]*\.[a-z0-9_]+$/.test(v.action)))throw Error(`${p}: Aktionsname ungültig.`); if(has(v,'target'))target(v.target,p); if(has(v,'data')&&!isTemplate(v.data))mapping(v.data,p); if(has(v,'metadata'))mapping(v.metadata,p); if(has(v,'response_variable')&&!/^[A-Za-z_][A-Za-z0-9_]*$/.test(v.response_variable))throw Error(`${p}: Antwortvariable ungültig.`); break;
    case 'delay': checkDuration(v.delay,p); break;
    case 'stop': if(typeof v.stop!=='string')throw Error(`${p}: Stop-Grund muss Text sein.`); if(has(v,'error'))bool(v.error,p); if(has(v,'response_variable')){str(v.response_variable,p);if(has(v,'error'))throw Error(`${p}: Antwort und error nicht kombinieren.`);} break;
    case 'wait_template': str(v.wait_template,p); if(has(v,'timeout'))checkDuration(v.timeout,p); if(has(v,'continue_on_timeout'))bool(v.continue_on_timeout,p); break;
    case 'wait_for_trigger': list(v.wait_for_trigger,x=>checkTrigger(x,p),p,1); if(has(v,'timeout'))checkDuration(v.timeout,p); if(has(v,'continue_on_timeout'))bool(v.continue_on_timeout,p); break;
    case 'repeat': { const r=v.repeat;keys(r,['count','while','until','for_each','sequence'],p);const modes=['count','while','until','for_each'].filter(k=>has(r,k));if(modes.length!==1)throw Error(`${p}: Wiederholungsart ungültig.`); if(has(r,'count')){if(!isTemplate(r.count)&&(!Number.isInteger(r.count)||r.count<1||r.count>10000))throw Error(`${p}: Wiederholungszahl ungültig.`);} if(has(r,'for_each')){if(Array.isArray(r.for_each))json(r.for_each,p);else template(r.for_each,p);} for(const k of ['while','until'])if(has(r,k))conditions(r[k]);actions(r.sequence);break; }
    case 'choose': list(v.choose,b=>{keys(b,['conditions','sequence','alias'],p);conditions(b.conditions);actions(b.sequence);},p,1);if(has(v,'default'))actions(v.default);break;
    case 'if': conditions(v.if);actions(v.then);if(has(v,'else'))actions(v.else);break;
    case 'parallel': list(v.parallel,b=>Array.isArray(b)?actions(b):checkAction(b,p,depth+1),p,1);break;
    case 'sequence': actions(v.sequence);break;
    case 'condition': { const {continue_on_error,...c}=v;checkCondition(c,p,depth+1);break; }
    case 'event': str(v.event,p);for(const k of ['event_data','event_data_template'])if(has(v,k))mapping(v[k],p);break;
    case 'set_conversation_response': if(v[type]!==null&&typeof v[type]!=='string')throw Error(`${p}: Antwort muss Text sein.`);break;
    case 'scene': entity(v.scene,p);break;
  }
}
export function checkAutomation(v) {
  keys(v,['id','alias','description','triggers','conditions','actions','mode','max','variables','trigger_variables','initial_state','trace','max_exceeded'],'Automation');
  if(has(v,'alias'))str(v.alias,'Name'); if(has(v,'id'))str(v.id,'ID'); if(has(v,'description')&&typeof v.description!=='string')throw Error('Beschreibung: Text erwartet.');
  if(!['single','restart','queued','parallel'].includes(v.mode))throw Error('Ausführungsmodus ungültig.');
  if(has(v,'max')&&(!['queued','parallel'].includes(v.mode)||!Number.isInteger(v.max)||v.max<1||v.max>100))throw Error('Maximalzahl ungültig.');
  for(const k of ['variables','trigger_variables'])if(has(v,k))variables(v[k],k);
  if(has(v,'initial_state'))bool(v.initial_state,'initial_state');
  if(has(v,'trace')){keys(v.trace,['stored_traces'],'trace');if(has(v.trace,'stored_traces')&&(!Number.isInteger(v.trace.stored_traces)||v.trace.stored_traces<0))throw Error('stored_traces ungültig.');}
  if(has(v,'max_exceeded')&&!['silent','debug','info','warning','error','critical'].includes(v.max_exceeded))throw Error('max_exceeded ungültig.');
  list(v.triggers,checkTrigger,'Auslöser',1);list(v.conditions,checkCondition,'Bedingung');list(v.actions,checkAction,'Aktion',1);return v;
}
