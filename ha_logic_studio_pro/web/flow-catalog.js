// Original HA-native schemas. Flow wires carry execution order, not sensor values.
const defs=[];
function def(type,category,config,description,slots={}){defs.push({type,category,flow:true,description,config,slots,inputs:[{id:'DO',type:'FLOW'}],outputs:[{id:'NEXT',type:'FLOW'}],params:[{id:'config',type:'CODE',default:JSON.stringify(config,null,2)},{id:'slots',type:'CODE',default:JSON.stringify(slots)}]});}
def('FLOW_ROOT','structure',{alias:'Neuer HA-Ablauf',mode:'single'},'Start des HA-Plans. Auslöser, Bedingungen, Aktionen und Parameter sind getrennte Äste.',{TRIGGERS:'triggers',CONDITIONS:'conditions',ACTIONS:'actions'});
for(const [name,platform,extra]of [['STATE','state',{entity_id:'input_boolean.demo',to:'on'}],['NUMERIC','numeric_state',{entity_id:'sensor.demo',above:20}],['TIME','time',{at:'12:00:00'}],['INTERVAL','time_pattern',{minutes:'/5'}],['SUN','sun',{event:'sunset'}],['EVENT','event',{event_type:'demo_event'}],['DEVICE','device',{}],['HA','homeassistant',{event:'start'}],['MQTT','mqtt',{topic:'demo/state'}],['TEMPLATE','template',{value_template:'{{ false }}'}],['ZONE','zone',{entity_id:'person.demo',zone:'zone.home',event:'enter'}],['WEBHOOK','webhook',{webhook_id:'REPLACE_ME',local_only:true}],['TAG','tag',{tag_id:'REPLACE_ME'}],['SENTENCE','conversation',{command:'Demo'}]])def('TRIGGER_'+name,'triggers',{trigger:platform,...extra},'HA-Auslöser '+platform+'. Kein Dauerwert; startet einen Ablauf.');
def('ACTION','ha',{action:'input_boolean.turn_on',target:{entity_id:'input_boolean.demo'}},'Native HA-Aktion mit Ziel, Daten und optionaler Antwortvariable.');
def('SCRIPT_CALL','ha',{action:'script.demo',data:{}},'HA-Skript als Aktion aufrufen.');
def('EVENT_FIRE','ha',{event:'demo_event',event_data:{}},'Eigenes HA-Ereignis auslösen.');
def('SEQUENCE','flow',{},'Untergeordneten Ablauf der Reihe nach ausführen.',{DO:'sequence'});
def('CONDITION','flow',{condition:'state',entity_id:'input_boolean.demo',state:'on'},'HA-Bedingung. In einer Aktionsfolge beendet FALSE den aktuellen Ablauf.');
def('IF_ELSE','flow',{},'Bedingungen, Dann- und Sonst-Ablauf.',{IF:'if',THEN:'then',ELSE:'else'});
def('CHOOSE','flow',{choose:[{}]},'Bedingte Zweige mit Standardzweig. Weitere Zweige über Zweigpfade ergänzen.',{WHEN_1:'choose.0.conditions',CASE_1:'choose.0.sequence',DEFAULT:'default'});
def('PARALLEL','flow',{},'Parallele Aktionen; keine garantierte Reihenfolge zwischen Zweigen.',{DO:'parallel'});
def('STOP','flow',{stop:'Ablauf beendet',error:false},'Ablauf beenden, optional Fehler oder response_variable.');
for(const [type,cfg]of [['REPEAT_COUNT',{count:3}],['REPEAT_WHILE',{}],['REPEAT_UNTIL',{}],['FOR_EACH',{for_each:['Beispiel']}]] )def(type,'loops',{repeat:cfg},'HA-Wiederholung mit eigenem Ablauf und repeat-Kontext.',{...(type==='REPEAT_WHILE'?{WHILE:'repeat.while'}:type==='REPEAT_UNTIL'?{UNTIL:'repeat.until'}:{}),DO:'repeat.sequence'});
def('DELAY','timers',{delay:{seconds:1}},'Diesen HA-Durchlauf pausieren; getrennt von den persistenten TON/TOF-Bausteinen.');
def('WAIT_TEMPLATE','timers',{wait_template:'{{ false }}',timeout:{seconds:30},continue_on_timeout:false},'Auf ein Template warten, mit Zeitlimit und wait-Kontext.');
def('WAIT_TRIGGER','timers',{timeout:{seconds:30},continue_on_timeout:false},'Auf einen der untergeordneten Auslöser warten.',{TRIGGERS:'wait_for_trigger'});
def('VARIABLES','variables',{variables:{demo:0}},'Benannte HA-Laufzeitvariablen setzen.');
def('TEMPLATE','expert',{variables:{demo:'{{ 1 + 1 }}'}},'Jinja-Template als native HA-Variable. Keine Ausführung im Editor.');
def('YAML_ORIGINAL','expert',{},'Unbekannter HA-Abschnitt bleibt als strukturierte Originalkonfiguration erhalten. Export nach manueller Prüfung.');
for(const type of ['CONTEXT','TRIGGER_CONTEXT','RESPONSE'])def(type,'variables',{expression:type==='TRIGGER_CONTEXT'?'trigger':type==='RESPONSE'?'response':'repeat'},'Lesender Kontextverweis. Im Import als Hinweis, nicht als eigenständige HA-Aktion.');
def('SCRIPT_INPUT','variables',{name:'Eingabe',selector:{text:{}}},'HA-Skriptfeld. Über Feldschlüssel und FIELDS am Plan verbinden.');
for(const [type,selector]of [['ENTITY','entity'],['DEVICE','device'],['TARGET','target'],['NUMBER','number'],['BOOLEAN','boolean'],['TEXT','text'],['SELECT','select'],['DURATION','duration'],['TIME','time'],['ACTION','action'],['TRIGGER','trigger'],['CONDITION','condition'],['OBJECT','object']])def('BP_INPUT_'+type,'blueprints',{name:'Eingabe',selector:{[selector]:selector==='select'?{options:['Beispiel']}: {}}},'Blueprint-Parameter mit Name, Vorgabe, Beschreibung und HA-Selektor.');
def('BP_INPUT_REF','blueprints',{input:'eingabe'},'Verweis auf einen Blueprint-Parameter. VALUE-Leitungen zeigen seine Verwendung.');
def('GROUP','structure',{text:'Gruppe'},'Optische Gruppierung; wird nicht als HA-Aktion ausgegeben.');
for(const d of defs){if(d.type==='FLOW_ROOT')d.params.push({id:'kind',type:'STRING',default:'automation',options:['automation','script','blueprint']});if(d.type.startsWith('BP_INPUT_')||d.type==='SCRIPT_INPUT')d.params.push({id:'key',type:'STRING',default:'eingabe'});if(d.type.startsWith('BP_INPUT_')&&d.type!=='BP_INPUT_REF')d.params.push({id:'path',type:'STRING',default:''});}
export const flowDefinitions=defs;
export const flowTypes=new Set(defs.map(d=>d.type));
export const noteTypes=new Set(['GROUP','CONTEXT','TRIGGER_CONTEXT','RESPONSE','BP_INPUT_REF']);
export const bpTypes=new Set(defs.filter(d=>d.category==='blueprints').map(d=>d.type));
export const baseConfig=type=>structuredClone(defs.find(d=>d.type===type)?.config||{});
export function slotPaths(b){let s;try{s=JSON.parse(b.params.slots||'{}');}catch{throw Error(b.name+': ungültige Zweigpfade.');}if(!s||Array.isArray(s)||typeof s!=='object'||Object.keys(s).length>80)throw Error('Ungültige Zweigpfade.');for(const [k,v]of Object.entries(s))if(!/^[A-Z][A-Z0-9_]*$/.test(k)||typeof v!=='string'||!/^(__inputs|__fields|[a-z_]+(?:\.(?:[a-z_]+|\d+))*)$/.test(v)||/(__proto__|constructor|prototype)/.test(v))throw Error('Ungültiger Zweigpfad.');return s;}
export function flowPins(b,side){const names=new Set();function scan(x,depth=0){if(depth>35)throw Error('Konfiguration zu tief.');if(x&&typeof x==='object'){if(x.$haTag==='input')names.add(x.value);else Object.values(x).forEach(v=>scan(v,depth+1));}}scan(JSON.parse(b.params.config||'{}'));if(names.size>80||[...names].some(k=>typeof k!=='string'||!/^\w+$/.test(k)))throw Error('Ungültige Parameterverweise.');if(side==='inputs')return [...(b.type==='FLOW_ROOT'?[]:[{id:'DO',type:'FLOW'}]),...[...names].map(key=>({id:'REF_'+key,type:'REFERENCE'}))];return [...(b.type==='FLOW_ROOT'?[]:[{id:'NEXT',type:'FLOW'}]),...Object.keys(slotPaths(b)).map(id=>({id,type:'FLOW'})),...(bpTypes.has(b.type)?[{id:'VALUE',type:'REFERENCE'}]:[])];}
