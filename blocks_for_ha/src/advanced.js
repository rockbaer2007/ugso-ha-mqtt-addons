import { jinjaSummary } from './jinja.js';
import { language } from './locales.js';
import { structuredHAJSON } from './ha-fields.js';
const jsonField = (name, value) => ({ type: 'field_multilinetext', name, text: JSON.stringify(value, null, 2), maxLines: 4 });
const action = { previousStatement: 'Action', nextStatement: 'Action', colour: '#2682a5' };
const trigger = { previousStatement: 'Trigger', nextStatement: 'Trigger', colour: '#b26c24' };
const samples = {
  state: { trigger:'state',entity_id:'binary_sensor.test',from:'off',to:'on',for:30 },
  numeric_state: { trigger:'numeric_state',entity_id:'sensor.test',above:10,below:20 },
  time: { trigger:'time',at:'input_datetime.alarm',weekday:['mon','fri'] },
  sun: { trigger:'sun',event:'sunset',offset:'-00:15:00' },
  homeassistant: { trigger:'homeassistant',event:'shutdown' },
  mqtt: { trigger:'mqtt',topic:'home/button',payload:'on' },
  template: { trigger:'template',value_template:"{{ states('sensor.test') | float(0) > 20 }}" },
  webhook: { trigger:'webhook',webhook_id:'replace_with_own_id',local_only:true,allowed_methods:['POST'] },
  zone: { trigger:'zone',entity_id:'person.test',zone:'zone.home',event:'enter' },
  device: { trigger:'device',domain:'binary_sensor',device_id:'replace_with_device_id',entity_id:'binary_sensor.test',type:'motion' },
  tag: { trigger:'tag',tag_id:'replace_with_tag_id' },
  conversation: { trigger:'conversation',command:['Licht einschalten'] },
  geo_location: { trigger:'geo_location',source:'geo_json_events',zone:'zone.home',event:'enter' },
  calendar: { trigger:'calendar',entity_id:'calendar.test',event:'start',offset:'-00:15:00' },
  event: { trigger:'event',event_type:'timer.finished',event_data:{entity_id:'timer.test'} },
};
export const advancedDefinitions = [
  ...Object.entries(samples).map(([kind,sample])=>({type:`ugso_ha_${kind}_trigger`,message0:`HA ${kind} %1`,args0:[jsonField('JSON',sample)],...trigger,tooltip:'Erweiterte native HA-Auslöserfelder als JSON. Geräte-IDs und Integration in HA prüfen.'})),
  { type:'ugso_ha_trigger',message0:'HA-Auslöser (erweitert) %1',args0:[jsonField('JSON',samples.state)],...trigger },
  { type:'ugso_ha_condition',message0:'HA-Bedingung (erweitert) %1',args0:[jsonField('JSON',{condition:'time',weekday:['mon','fri']})],output:'Boolean',colour:'#6860b5' },
  { type:'ugso_ha_action',message0:'HA-Schritt (erweitert) %1',args0:[jsonField('JSON',{action:'light.turn_on',target:{area_id:'living_room'}})],...action },
  { type:'ugso_target_action',message0:'HA-Aktion %1 Zielart %2 Ziel %3 Daten (JSON) %4 Schrittoptionen (JSON) %5',args0:[{type:'field_input',name:'SERVICE',text:'light.turn_on'},{type:'field_dropdown',name:'KIND',options:['entity_id','device_id','area_id','floor_id','label_id'].map(v=>[v,v])},{type:'field_input',name:'TARGET',text:'light.test'},jsonField('DATA',{}),jsonField('OPTIONS',{})],...action,tooltip:'Zielart wählen. Ziel als ID, JSON-Liste oder HA-Template; mehrere Zielarten über den erweiterten HA-Schritt.' },
  { type:'ugso_integration_trigger',message0:'HA-Integration %1 Ziel (JSON) %2 Optionen (JSON) %3 verwenden %4',args0:[{type:'field_dropdown',name:'TYPE',options:['power.changed','motion.detected','timer.finished'].map(v=>[v,v])},jsonField('TARGET',{entity_id:'sensor.power'}),jsonField('OPTIONS',{threshold:{type:'any'}}),{type:'field_checkbox',name:'USE_OPTIONS',checked:true}],...trigger,tooltip:'Native Integrationsauslöser. Optionen müssen zur ausgewählten Integration passen; Home Assistant prüfen.' },
  { type:'ugso_sequence',message0:'Aktionsgruppe %1',args0:[{type:'input_statement',name:'DO',check:'Action'}],...action },
  { type:'ugso_parallel',message0:'Parallel Zweig 1 %1 Zweig 2 %2',args0:[{type:'input_statement',name:'A',check:'Action'},{type:'input_statement',name:'B',check:'Action'}],...action },
  { type:'ugso_wait_trigger',message0:'Warte auf Auslöser %1 Optionen (JSON) %2',args0:[{type:'input_statement',name:'TRIGGERS',check:'Trigger'},jsonField('OPTIONS',{})],...action,colour:'#7a8639' },
  { type:'ugso_condition_step',message0:'Nur weiter wenn %1',args0:[{type:'input_value',name:'CONDITION',check:'Boolean'}],...action },
  { type:'ugso_fire_event',message0:'Ereignis auslösen %1 Daten (JSON) %2',args0:[{type:'field_input',name:'EVENT',text:'custom_event'},jsonField('DATA',{})],...action },
  { type:'ugso_assist_response',message0:'Assist antwortet %1',args0:[{type:'field_multilinetext',name:'TEXT',text:'Hallo!'}],...action },
  { type:'ugso_scene',message0:'Szene aktivieren %1',args0:[{type:'field_input',name:'SCENE',text:'scene.evening'}],...action },
  { type:'ugso_jinja_value',message0:'Jinja (experimentell) %1 %2',args0:[{type:'field_label',name:'SUMMARY',text:'Original-Jinja'},{type:'field_multilinetext',name:'TEXT',text:"{{ states('sensor.test') | float(0) | round(1) }}",maxLines:4}],output:['String','Value'],colour:'#8a6635',tooltip:'Erkennt Muster und Entitätsreferenzen. Originaltext bleibt unverändert; Ausführung nur in HA.' },
  { type:'ugso_jinja_condition',message0:'Jinja-Bedingung (experimentell) %1 %2',args0:[{type:'field_label',name:'SUMMARY',text:'Original-Jinja'},{type:'field_multilinetext',name:'TEXT',text:"{{ is_state('binary_sensor.test', 'on') }}",maxLines:4}],output:'Boolean',colour:'#6860b5',tooltip:'Erkennt Muster und Entitätsreferenzen. Originaltext bleibt unverändert; Ausführung nur in HA.' },
];
export function setupJinjaBlock(block) {
  if (!['ugso_jinja_value','ugso_jinja_condition'].includes(block.type)) return;
  const update = () => { try { let text=jinjaSummary(block.getFieldValue('TEXT')); const labels={'Unvollständig':['Incomplete','Incomplet'],'Schleife':['Loop','Boucle'],'Wenn / Sonst':['If / Else','Si / Sinon'],'Entitätswert':['Entity value','Valeur d’entité'],'Datum / Zeit':['Date / Time','Date / Heure'],'Variable':['Variable','Variable'],'Original-Jinja':['Original Jinja','Jinja original']};if(language!=='de')for(const [de,other] of Object.entries(labels))if(text.startsWith(de)){text=other[language==='fr'?1:0]+text.slice(de.length);break;} if(block.getFieldValue('SUMMARY')!==text)block.getField('SUMMARY').setValue(text); } catch { block.getField('SUMMARY').setValue('Jinja'); } };
  update(); block.setOnChange(update);
}
export function setupIntegrationBlock(Blockly, block) {
  if(block.type!=='ugso_integration_trigger')return;
  const defaults={ 'power.changed':{target:{entity_id:'sensor.power'},options:{threshold:{type:'any'}}},'motion.detected':{target:{entity_id:'binary_sensor.motion'},options:{behavior:'each',for:'00:00:00'}},'timer.finished':{target:{entity_id:'timer.test'},options:{behavior:'each'}} };
  block.setOnChange(event=>{
    if(event.type!==Blockly.Events.BLOCK_CHANGE||event.blockId!==block.id||event.name!=='TYPE'||!defaults[event.oldValue])return;
    const previous=defaults[event.oldValue],next=defaults[event.newValue];if(!next)return;
    for(const [field,key] of [['TARGET','target'],['OPTIONS','options']])try{if(equivalent(advancedJSON(block,field),previous[key]))block.setFieldValue(JSON.stringify(next[key],null,2),field);}catch{}
  });
}
export function setupParallelBlock(Blockly, block, label) {
  if (block.type !== 'ugso_parallel') return;
  block.branchCount_ = 2;
  block.saveExtraState = function () { return { branches: this.branchCount_ }; };
  block.loadExtraState = function (state) {
    if (!Number.isInteger(state.branches) || state.branches < 1 || state.branches > 100) throw Error('Parallel: 1–100 Zweige erwartet.');
    this.branchCount_ = state.branches; this.updateParallel_();
  };
  block.updateParallel_ = function () {
    for (let i = 0; i < this.branchCount_; i++) if (!this.getInput(`BRANCH${i}`)) this.appendStatementInput(`BRANCH${i}`).setCheck('Action').appendField(`${label} ${i + 1}`);
    for (const input of [...this.inputList]) if (/^BRANCH\d+$/.test(input.name) && Number(input.name.slice(6)) >= this.branchCount_) this.removeInput(input.name);
  };
  // Keep the JSON definition's two placeholders stable for localized catalogs.
  block.removeInput('A'); block.removeInput('B');
  const header = block.appendDummyInput('HEADER').appendField('Parallel');
  for (const [sign, delta] of [['+', 1], ['−', -1]]) header.appendField(new Blockly.FieldImage(`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"><rect width="18" height="18" rx="3" fill="white"/><text x="9" y="14" text-anchor="middle" fill="#20313c">${sign}</text></svg>`)}`, 18, 18, sign, () => {
    if (block.branchCount_ + delta < 1 || block.branchCount_ + delta > 100) return;
    const before = JSON.stringify(block.saveExtraState()); Blockly.Events.setGroup(true);
    try { block.branchCount_ += delta; block.updateParallel_(); Blockly.Events.fire(new Blockly.Events.BlockChange(block,'mutation',null,before,JSON.stringify(block.saveExtraState()))); }
    finally { Blockly.Events.setGroup(false); }
  }));
  block.updateParallel_();
}
export function advancedJSON(block, field='JSON') {
  const structured = structuredHAJSON(block, field); if (structured !== undefined) return structured;
  try { return JSON.parse(block.getFieldValue(field)); } catch { throw Error(`${block.type}: Gültiges JSON erwartet.`); }
}
export function equivalent(a,b) {
  const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  return JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
}
export function advancedTriggerType(item) { const type=`ugso_ha_${item.trigger}_trigger`;return advancedDefinitions.some(d=>d.type===type)?type:'ugso_ha_trigger'; }
