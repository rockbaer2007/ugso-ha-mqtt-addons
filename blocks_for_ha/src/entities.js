import * as BlocklyModule from 'blockly/core';
import { validActionEntity } from './action-targets.js';
import { language } from './locales.js';
const Blockly = Reflect.get(BlocklyModule, 'default') || BlocklyModule;
let openPicker;
const profileNames = {whatsapp:new Map(),signal:new Map()};
const profileKind = spec => ['callmebot_profile','callmebot_signal_profile'].includes(spec?.kind);
const profileChannel = field => fieldChoice(field)?.kind === 'callmebot_signal_profile' ? 'signal' : 'whatsapp';
const defaultRecipient = () => ({de:'Standardempfänger',en:'Default recipient',fr:'Destinataire par défaut'})[language];
export const entityIdPattern = /^[a-z][a-z0-9_]*\.[a-z0-9_]+$/;
const targetKinds = ['entity_id','device_id','area_id','floor_id','label_id'];
const fallbackActions = ['homeassistant.turn_on','homeassistant.turn_off','homeassistant.toggle','homeassistant.update_entity','light.turn_on','light.turn_off','light.toggle','switch.turn_on','switch.turn_off','switch.toggle','script.turn_on','script.turn_off','scene.turn_on','mqtt.publish','input_boolean.turn_on','input_boolean.turn_off','input_boolean.toggle','input_number.set_value','input_text.set_value','input_datetime.set_datetime','timer.start','timer.cancel','timer.pause','timer.finish','counter.increment','counter.decrement','counter.reset','persistent_notification.create','persistent_notification.dismiss'].map(id=>({id,name:id,domain:id.split('.')[0],domains:[]}));

export function entityDomain(block) {
  if (!block) return '';
  return {ugso_colour_action:'light',ugso_script_action:'script',ugso_scene:'scene'}[block.type] || (block.type === 'ugso_helper_action' ? block.getFieldValue('DOMAIN') : '');
}
export function matchingEntities(rows, search, domain = '') {
  const words = search.trim().toLocaleLowerCase('de').split(/\s+/).filter(Boolean);
  return rows.filter(row => (!domain || row.domain === domain) && words.every(word => (row.name+' '+row.entity_id).toLocaleLowerCase('de').includes(word)));
}
export function choiceForPath(key, path, source) {
  if (source === 'VARIABLES') return null;
  if (['action','service'].includes(key) && source === 'JSON') return {kind:'action'};
  if (targetKinds.includes(key)) return {kind:key,structured:true};
  if (key === 'zone') return {kind:'entity_id',structured:true,domains:['zone']};
  if (key === 'scene') return {kind:'entity_id',structured:true,domains:['scene']};
  if (key === 'entity' && ['THRESHOLD','OPTIONS'].includes(source)) return {kind:'entity_id',structured:true,numeric:true};
  if (['above','below'].includes(key)) return {kind:'entity_id',structured:true,numeric:true,allowNumber:true};
  if (key === 'at') return {kind:'entity_id',structured:true,allowTime:true,domains:['input_datetime','sensor']};
  return null;
}
export function fieldChoice(field) {
  const block = field?.getSourceBlock(), name = field?.name;
  if (field?.choiceSpec_) return field.choiceSpec_;
  if (!block) return null;
  if (['ugso_callmebot_action','ugso_callmebot_signal_action'].includes(block.type) && name === 'PROFILE') return {kind:block.type === 'ugso_callmebot_signal_action' ? 'callmebot_signal_profile' : 'callmebot_profile'};
  if (['ugso_service_action','ugso_target_action'].includes(block.type) && name === 'SERVICE') return {kind:'action'};
  if (block.type === 'ugso_target_action' && name === 'TARGET') return {kind:block.getFieldValue('KIND'),structured:true};
  if (block.type === 'ugso_scene' && name === 'SCENE') return {kind:'entity_id',domains:['scene']};
  if (block.type === 'ugso_time_trigger' && name === 'TIME') return {kind:'entity_id',structured:true,allowTime:true,domains:['input_datetime','sensor']};
  if (name === 'ENTITIES' && ['ugso_state_trigger','ugso_numeric_trigger','ugso_service_action'].includes(block.type)) return {kind:'entity_id',structured:true,listOnly:true};
  if (field instanceof EntityField) return {kind:'entity_id',structured:field.haStructured_ || block.type === 'ugso_service_action',domains:entityDomain(block) ? [entityDomain(block)] : []};
  return null;
}
export function validChoice(text, spec) {
  const value = text.trim();
  if (profileKind(spec)) return !value || /^[a-z][a-z0-9_]{0,39}$/.test(value);
  if (spec.kind === 'action') return validActionEntity(text);
  if (spec.allowTime) return !!value; // Native HA validation handles clocks, helpers, lists and offsets.
  if (spec.allowNumber && value && Number.isFinite(Number(value))) return true;
  if (spec.structured && (!value || /\{\{|\{%/.test(value))) return true;
  let ids = [value];
  if (spec.structured && value.startsWith('[')) {
    try { ids = JSON.parse(value); } catch { return false; }
    if (!Array.isArray(ids) || ids.length > 100 || ids.some(id=>typeof id!=='string')) return false;
  } else if (spec.listOnly) return false;
  return ids.every(id=>spec.kind === 'entity_id' ? (id === 'all' && spec.structured) || entityIdPattern.test(id) : !!id.trim() && id.length <= 256);
}
export function matchingChoices(catalog, field, search) {
  const spec = fieldChoice(field); if (!spec) return [];
  const block = field.getSourceBlock();
  let domains = spec.domains || [];
  const action = block.getFieldValue('SERVICE') || block.getFieldValue('HA_JSON_ACTION') || block.getFieldValue('HA_JSON_SERVICE');
  const selected = catalog.actions.find(row=>row.id===action);
  if (!domains.length && !spec.numeric && spec.kind === 'entity_id') {
    if (selected?.domains?.length) domains = selected.domains;
    else if (action && !['homeassistant','script','notify'].includes(action.split('.')[0]) && catalog.entities.some(row=>row.domain===action.split('.')[0])) domains = [action.split('.')[0]];
  }
  let rows = profileKind(spec) ? [{id:'',name:profileNames[profileChannel(field)].get('') || defaultRecipient()},...(catalog[profileChannel(field)==='signal'?'signalProfiles':'profiles'] || [])] : spec.kind === 'action' ? catalog.actions : spec.kind === 'entity_id' ? catalog.entities.map(row=>({...row,id:row.entity_id})) : catalog.targets[spec.kind] || [];
  if (spec.kind === 'entity_id') rows = rows.filter(row=>(!domains.length || domains.includes(row.domain)) && (!spec.numeric || ['sensor','input_number','number'].includes(row.domain)));
  const words = search.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return rows.filter(row=>words.every(word=>(row.name+' '+row.id).toLocaleLowerCase().includes(word)));
}

class EntityField extends Blockly.FieldTextInput {
  static fromJson(options) { return new EntityField(options.text || ''); }
  getText() { return (profileKind(fieldChoice(this)) ? profileNames[profileChannel(this)].get(this.getValue()) || this.getValue() || defaultRecipient() : super.getText()) + ' ▾'; }
  showEditor_() {
    if (openPicker && this.getSourceBlock()?.workspace?.rendered) openPicker(this);
    else super.showEditor_();
  }
}
class HAChoiceField extends EntityField {
  static fromJson(options) {
    const field = new HAChoiceField(options.text || '');
    if (options.choice) field.choiceSpec_ = options.choice;
    return field;
  }
}
Blockly.fieldRegistry.register('ugso_field_entity', EntityField);
Blockly.fieldRegistry.register('ugso_field_ha_choice', HAChoiceField);
export function installHAChoices(block) {
  for (const input of block.inputList) for (const field of [...input.fieldRow]) {
    if (!field.name || field instanceof EntityField || field instanceof Blockly.FieldDropdown || !(field instanceof Blockly.FieldTextInput)) continue;
    const spec = fieldChoice(field); if (!spec) continue;
    const index = input.fieldRow.indexOf(field), value = field.getValue(), name = field.name;
    const replacement = new HAChoiceField(value); replacement.setValidator(field.getValidator());
    input.removeField(name); input.insertFieldAt(index, replacement, name);
  }
}
export function setupEntities(workspace) {
  const status = document.querySelector('.local-badge'); status.setAttribute('role','status');
  const loadButton = document.createElement('button'); loadButton.id='entities-refresh'; loadButton.textContent='HA-Auswahl laden';
  document.querySelector('.canvas-actions').append(loadButton);
  const dialog = document.createElement('dialog'); dialog.id='entity-dialog'; dialog.setAttribute('aria-labelledby','entity-title');
  dialog.innerHTML='<h2 id="entity-title">HA-Auswahl</h2><p id="entity-status" role="status"></p><label>Suche nach Name oder ID<input id="entity-search" type="search" autocomplete="off"></label><div id="entity-results" aria-label="Gefundene Einträge"></div><p id="entity-count"></p><form id="entity-form"><label>ID, Liste oder HA-Template<textarea id="entity-id" rows="3" autocomplete="off" spellcheck="false"></textarea></label><label><input id="entity-multiple" type="checkbox">Mehrere Ziele auswählen</label><p id="entity-error" role="alert"></p><div class="entity-actions"><button type="button" id="entity-refresh">Neu laden</button><button type="button" id="entity-cancel">Abbrechen</button><button type="submit" class="primary">Übernehmen</button></div></form>';
  document.body.append(dialog);
  const el=id=>dialog.querySelector('#'+id);
  const catalog={entities:[],actions:fallbackActions,targets:{},profiles:[],signalProfiles:[]};
  const messages={entities:'Entitäts-ID kann auch manuell eingegeben werden.',actions:'Gängige Beispielaktionen; HA-Verfügbarkeit prüfen.',targets:'Ziel-ID kann auch manuell eingegeben werden.'};
  let field, loading=false;
  messages.profiles='CallMeBot-Profile nicht geladen. Profil-ID manuell eingeben oder Standardempfänger verwenden.';
  messages.signalProfiles='Signal-Profile nicht geladen. Profil-ID manuell eingeben oder Standardempfänger verwenden.';
  function group() {const kind=fieldChoice(field)?.kind;return kind==='callmebot_signal_profile'?'signalProfiles':kind==='callmebot_profile'?'profiles':kind==='action'?'actions':kind==='entity_id'?'entities':'targets';}
  async function refreshProfiles(channel='whatsapp') {
    const key=channel==='signal'?'signalProfiles':'profiles';
    try {
      const response=await fetch(new URL(channel==='signal'?'./api/ha/callmebot-signal-profiles':'./api/ha/callmebot-profiles',document.baseURI),{cache:'no-store',signal:AbortSignal.timeout(12000)});
      const data=await response.json();if(!response.ok||!Array.isArray(data.profiles))throw Error();
      catalog[key]=data.profiles.filter(p=>p&&typeof p.id==='string'&&/^[a-z][a-z0-9_]{0,39}$/.test(p.id)&&typeof p.name==='string');
      profileNames[channel]=new Map(catalog[key].map(p=>[p.id,p.name]));
      const defaultProfile=catalog[key].find(p=>p.id===data.default_profile);
      if(defaultProfile)profileNames[channel].set('',defaultRecipient()+' · '+defaultProfile.name);
      messages[key]=channel==='signal'?'Signal-Profile geladen. Leere Profil-ID verwendet den Standardempfänger.':'CallMeBot-Profile geladen. Leere Profil-ID verwendet den Standardempfänger.';
    } catch {
      catalog[key]=[];profileNames[channel]=new Map();messages[key]=channel==='signal'?'Signal-Profile nicht verfügbar. Signal-App, MQTT-Verbindung und HA-Discovery prüfen. Profil-ID kann manuell eingegeben werden.':'CallMeBot-Profile nicht verfügbar. CallMeBot-App aktualisieren, MQTT-Verbindung und HA-Discovery prüfen. Profil-ID kann manuell eingegeben werden.';
    }
    for(const block of workspace.getBlocksByType(channel==='signal'?'ugso_callmebot_signal_action':'ugso_callmebot_action'))block.getField('PROFILE')?.forceRerender();
    if(profileKind(fieldChoice(field))&&profileChannel(field)===channel)render();
  }
  function selectedIds(){try{const value=JSON.parse(el('entity-id').value);return Array.isArray(value)?value:[];}catch{return [el('entity-id').value];}}
  function render() {
    el('entity-status').textContent=messages[group()]; el('entity-results').replaceChildren();
    const spec=fieldChoice(field), matches=field?matchingChoices(catalog,field,el('entity-search').value):[];
    const titles={action:'HA-Aktion auswählen',entity_id:'Entität auswählen',device_id:'Gerät auswählen',area_id:'Bereich auswählen',floor_id:'Etage auswählen',label_id:'Label auswählen'};
    el('entity-title').textContent=profileKind(spec)?(profileChannel(field)==='signal'?'Signal-Profil auswählen':'CallMeBot-Profil auswählen'):titles[spec?.kind]||'HA-Auswahl';
    el('entity-id').parentElement.firstChild.nodeValue=profileKind(spec)?'Profil-ID (leer = Standardempfänger)':'ID, Liste oder HA-Template';
    el('entity-id').rows=profileKind(spec)?1:3;
    for(const row of matches.slice(0,150)) {
      const button=document.createElement('button');button.type='button';button.className='entity-result';button.dataset.entity=row.id;
      const name=document.createElement('strong'), id=document.createElement('span'), state=document.createElement('small');name.textContent=row.name;id.textContent=row.id;state.textContent=[row.state,row.unit].filter(Boolean).join(' ');button.append(name,id,state);
      button.setAttribute('aria-pressed',String(selectedIds().includes(row.id)));
      button.addEventListener('click',()=>{if(el('entity-multiple').checked){const ids=selectedIds().filter(value=>typeof value==='string'&&value.trim());el('entity-id').value=JSON.stringify(ids.includes(row.id)?ids.filter(id=>id!==row.id):[...ids,row.id]);}else el('entity-id').value=row.id;el('entity-error').textContent='';render();});
      el('entity-results').append(button);
    }
    el('entity-count').textContent=matches.length+' Treffer'+(matches.length>150?' · erste 150 angezeigt, Suche eingrenzen':'');
  }
  async function refresh() {
    if(loading)return;loading=true;loadButton.disabled=el('entity-refresh').disabled=true;
    const results=await Promise.allSettled(['entities','actions','targets'].map(async kind=>{
      const response=await fetch(new URL('./api/ha/'+kind,document.baseURI),{cache:'no-store',signal:AbortSignal.timeout(12000)});
      const data=await response.json();if(!response.ok)throw Error(typeof data.error==='string'?data.error:'HA-Katalog nicht verfügbar.');
      if(kind==='entities') {
        if(!Array.isArray(data.entities))throw Error('Keine gültige Entitätsliste.');
        catalog.entities=data.entities.filter(row=>row&&entityIdPattern.test(row.entity_id)&&['name','domain','state','unit'].every(key=>typeof row[key]==='string'));
        messages.entities=catalog.entities.length+' Entitäten aus HA geladen. Zustände sind eine Momentaufnahme.';status.textContent='HA verbunden · '+catalog.entities.length+' Entitäten';status.classList.add('connected');
      }else if(kind==='actions'){
        if(!Array.isArray(data.actions))throw Error('Keine gültige Aktionsliste.');
        catalog.actions=data.actions.filter(row=>row&&entityIdPattern.test(row.id)&&typeof row.name==='string').map(row=>({...row,domains:Array.isArray(row.domains)?row.domains.filter(d=>typeof d==='string'):[]}));messages.actions=catalog.actions.length+' verfügbare HA-Aktionen geladen.';
      }else{
        if(!data.targets||typeof data.targets!=='object')throw Error('Kein gültiger Zielkatalog.');
        for(const kind of targetKinds.filter(k=>k!=='entity_id'))catalog.targets[kind]=(Array.isArray(data.targets[kind])?data.targets[kind]:[]).filter(row=>row&&typeof row.id==='string'&&typeof row.name==='string');
        messages.targets=data.unavailable?.length?'Einige HA-Zielarten sind nicht verfügbar; fehlende IDs manuell eingeben.':'Geräte, Bereiche, Etagen und Labels aus HA geladen.';
      }
    }));
    ['entities','actions','targets'].forEach((kind,i)=>{if(results[i].status==='rejected'){messages[kind]=kind==='actions'?'HA-Aktionen nicht verfügbar. Gängige Beispiele; eigene Aktion oder Template eingeben.':'HA-Katalog nicht verfügbar. ID, Liste oder Template manuell eingeben.';if(kind==='actions')catalog.actions=fallbackActions;else if(kind==='targets')catalog.targets={};else{catalog.entities=[];status.textContent='Lokal · manuelle Entitäts-IDs';status.classList.remove('connected');}}});
    loading=false;loadButton.disabled=el('entity-refresh').disabled=false;render();
  }
  openPicker=selected=>{
    if(selected.getSourceBlock()?.workspace!==workspace)return;field=selected;const spec=fieldChoice(field);
    el('entity-id').value=String(field.getValue());el('entity-search').value='';el('entity-error').textContent='';
    el('entity-multiple').parentElement.hidden=spec.kind==='action'||!spec.structured||spec.allowNumber||spec.allowTime;
    el('entity-multiple').checked=!el('entity-multiple').parentElement.hidden&&(!!spec.listOnly||el('entity-id').value.trim().startsWith('['));
    render();dialog.showModal();el('entity-search').focus();if(profileKind(spec))refreshProfiles(profileChannel(field));
  };
  el('entity-search').addEventListener('input',render);el('entity-id').addEventListener('input',()=>{el('entity-error').textContent='';});
  el('entity-cancel').addEventListener('click',()=>dialog.close());el('entity-refresh').addEventListener('click',()=>profileKind(fieldChoice(field))?refreshProfiles(profileChannel(field)):refresh());loadButton.addEventListener('click',()=>{refresh();refreshProfiles();refreshProfiles('signal');});
  el('entity-form').addEventListener('submit',event=>{
    event.preventDefault();if(!field||field.getSourceBlock().isDisposed()){dialog.close();return;}
    const raw=el('entity-id').value,text=/\{\{|\{%/.test(raw)?raw:raw.trim(),spec=fieldChoice(field);
    if(!validChoice(text,spec)){el('entity-error').textContent=profileKind(spec)?'Profil-ID: Kleinbuchstaben, Ziffern und _; leer für Standardempfänger.':spec.kind==='action'?'Aktionsname wie light.turn_on oder HA-Template erwartet.':'Passende ID, Liste oder HA-Template erwartet.';return;}
    const domain=entityDomain(field.getSourceBlock());
    if(domain&&spec.kind==='entity_id'&&text.trim()&&!text.includes('{{')&&!text.includes('{%')) {
      const ids=text.trim().startsWith('[')?JSON.parse(text):[text.trim()];
      if(ids.some(id=>!id.startsWith(domain+'.'))){el('entity-error').textContent='Dieser Block benötigt eine '+domain+'-Entität.';return;}
    }
    field.setValue(text);dialog.close();
  });
  dialog.addEventListener('close',()=>{if(!dialog.open)field=undefined;});refresh();
}
