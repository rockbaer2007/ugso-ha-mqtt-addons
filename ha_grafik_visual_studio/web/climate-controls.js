export const CLIMATE_ATTRIBUTES=['supported_features','hvac_modes','preset_modes','preset_mode','fan_modes','fan_mode','swing_modes','swing_mode','swing_horizontal_modes','swing_horizontal_mode','target_temp_low','target_temp_high','min_temp','max_temp','target_temp_step','min_humidity','max_humidity','target_humidity_step','humidity','temperature_unit'];
const choices=[['hvac',0,'hvac_modes','state','Betriebsart'],['preset',16,'preset_modes','preset_mode','Voreinstellung'],['fan',8,'fan_modes','fan_mode','Lüftermodus'],['swing',32,'swing_modes','swing_mode','Schwenkmodus'],['swing_horizontal',512,'swing_horizontal_modes','swing_horizontal_mode','Horizontal schwenken']];
export function climateCapabilities(entry){
  const attrs=entry?.attributes||{},flags=Number.isInteger(attrs.supported_features)?attrs.supported_features:0;
  return {available:Boolean(entry && typeof entry.state==='string' && !['unknown','unavailable'].includes(entry.state)),attrs,flags,
    choices:choices.filter(([,bit,key])=>(!bit || flags&bit) && Array.isArray(attrs[key]) && attrs[key].length),range:Boolean(flags&2),humidity:Boolean(flags&4),on:Boolean(flags&256),off:Boolean(flags&128)};
}
export const climateOptionsGroup={id:'climate-controls',label:'Climate-Steuerung',masterKey:'climateControlsEnabled',defaultEnabled:false,fields:[
  ...[['climateRange','Heiz-/Kühlbereich'],['climateHvac','Betriebsart'],['climatePreset','Voreinstellung'],['climateFan','Lüftermodus'],['climateSwing','Schwenkmodus'],['climateSwingHorizontal','Horizontal schwenken'],['climateHumidity','Soll-Feuchtigkeit'],['climatePower','Ein-/Ausschalten']].map(([key,label])=>({key,label,type:'checkbox',default:false})),
]};
export function renderClimateControls(widget,doc,{runtime=false,getEntry=()=>null,write=async()=>{},text=value=>value,settled=()=>{}}={}){
  const root=doc.createElement('section');root.className='climate-controls';const caps=climateCapabilities(getEntry());
  const status=doc.createElement('output');status.setAttribute('role','status');let busy=false;
  const disabled=()=>!runtime || widget.readOnly || !caps.available || busy || !/^climate\./.test(widget.targetEntityId||'');
  const submit=async(action,value)=>{if(disabled())return;busy=true;root.dataset.writing='true';for(const control of root.querySelectorAll('input,select,button'))control.disabled=true;status.textContent=text('Wird übertragen …');try{await write({entity_id:widget.targetEntityId,action,value});status.textContent=text('Befehl an HA übergeben');}catch{status.textContent=text('Climate-Aktion fehlgeschlagen');}finally{busy=false;delete root.dataset.writing;settled();}};
  const row=(label,input)=>{const wrapper=doc.createElement('label');wrapper.append(doc.createTextNode(text(label)),input);root.append(wrapper);return input;};
  for(const [action,bit,key,current,label] of caps.choices){
    const property={hvac:'climateHvac',preset:'climatePreset',fan:'climateFan',swing:'climateSwing',swing_horizontal:'climateSwingHorizontal'}[action];if(!widget[property])continue;
    const select=doc.createElement('select');select.dataset.climateAction=action;
    for(const value of caps.attrs[key])if(typeof value==='string'){const option=doc.createElement('option');option.value=value;option.textContent=text(value);select.append(option);}
    const actual=current==='state'?getEntry().state:caps.attrs[current];if(!caps.attrs[key].includes(actual)){const empty=doc.createElement('option');empty.value='';empty.textContent=text('Unbekannt');select.prepend(empty);}select.value=actual||'';select.disabled=disabled();select.onchange=()=>{if(select.value)void submit(action,select.value);};row(label,select);
  }
  const numeric=(label,value,min,max,step)=>{const input=doc.createElement('input');input.type='number';input.value=Number.isFinite(Number(value))&&value!=null?value:'';input.min=min;input.max=max;input.step=step;input.disabled=disabled();return row(label,input);};
  if(widget.climateRange && caps.range){const a=caps.attrs,unit=a.temperature_unit?` (${a.temperature_unit})`:'',low=numeric('Unterer Sollwert',a.target_temp_low,a.min_temp,a.max_temp,a.target_temp_step||.5),high=numeric('Oberer Sollwert',a.target_temp_high,a.min_temp,a.max_temp,a.target_temp_step||.5);low.parentElement.append(doc.createTextNode(unit));high.parentElement.append(doc.createTextNode(unit));const button=doc.createElement('button');button.type='button';button.textContent=text('Bereich übernehmen');button.disabled=disabled();button.onclick=()=>{if(!low.value||!high.value||!low.checkValidity()||!high.checkValidity()||Number(low.value)>=Number(high.value)){status.textContent=text('Ungültiger Temperaturbereich');return;}void submit('range',{low:Number(low.value),high:Number(high.value)});};root.append(button);}
  if(widget.climateHumidity && caps.humidity){const a=caps.attrs,input=numeric('Soll-Feuchtigkeit',a.humidity,a.min_humidity??30,a.max_humidity??99,a.target_humidity_step||1);input.onchange=()=>{if(input.value&&input.checkValidity())void submit('humidity',Number(input.value));};}
  if(widget.climatePower)for(const [value,supported,label] of [[true,caps.on,'Einschalten'],[false,caps.off,'Ausschalten']])if(supported){const button=doc.createElement('button');button.type='button';button.textContent=text(label);button.disabled=disabled();button.onclick=()=>void submit('power',value);root.append(button);}
  if(!root.childElementCount)root.append(doc.createTextNode(text('Keine gewählte Climate-Funktion verfügbar')));
  root.append(status);root.addEventListener('focusout',()=>doc.defaultView.setTimeout(()=>{if(!root.contains(doc.activeElement)&&!busy)settled();},0));for(const name of ['click','keydown','pointerdown'])root.addEventListener(name,event=>event.stopPropagation());return root;
}
