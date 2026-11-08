const words={en:{'Ein':'On','Aus':'Off','Nicht verfügbar':'Unavailable','Vorschau':'Preview','Schließen':'Close','Helligkeit':'Brightness','Temperatur':'Temperature','Farbe':'Color','Übertragen …':'Sending …','Aktion fehlgeschlagen':'Action failed','Gerät':'Device'},fr:{'Ein':'Marche','Aus':'Arrêt','Nicht verfügbar':'Indisponible','Vorschau':'Aperçu','Schließen':'Fermer','Helligkeit':'Luminosité','Temperatur':'Température','Farbe':'Couleur','Übertragen …':'Envoi …','Aktion fehlgeschlagen':'Échec de l’action','Gerät':'Appareil'}};
export function deviceModel(widget,entry){
  const a=entry?.attributes||{},domain=(widget.entityId||'').split('.')[0],available=Boolean(entry&&!['unknown','unavailable'].includes(entry.state)),modes=Array.isArray(a.supported_color_modes)?a.supported_color_modes:[];
  const kind=widget.deviceKind;
  return {available,on:entry?.state==='on',name:widget.title||a.friendly_name||widget.entityId,raw:entry?.state,unit:a.unit_of_measurement||'',attrs:a,
    power:available&&['switch','light','input_boolean'].includes(domain)&&kind!=='value',
    brightness:available&&domain==='light'&&['dimmer','color'].includes(kind)&&modes.some(v=>['brightness','color_temp','hs','xy','rgb','rgbw','rgbww','white'].includes(v)),
    rgb:available&&domain==='light'&&kind==='color'&&modes.some(v=>['hs','xy','rgb','rgbw','rgbww'].includes(v)),
    temperature:available&&domain==='climate'&&kind==='thermostat'&&Boolean(Number(a.supported_features)&1)&&Number.isFinite(a.min_temp)&&Number.isFinite(a.max_temp),
  };
}
export function renderDevice(widget,doc,{runtime=false,states={},getEntry=()=>states[widget.entityId],locale='de',icon=()=>{},write=async()=>{},settled=()=>{}}={}){
  const t=s=>words[locale]?.[s]||s,root=doc.createElement('section');let model=deviceModel(widget,getEntry());root.className=`device-card device-${widget.presentation||'tile'}`;
  root.style.setProperty('--device-accent',widget.color||'#38bdf8');
  root.style.borderRadius=`${Math.max(0,Number(widget.radius) || 12)}px`;
  if(widget.presentation!=='floorplan')root.style.backgroundColor=widget.backgroundColor||'#202b38';
  const heading=doc.createElement('strong');heading.textContent=model.name||t('Gerät');if(widget.showName!==false)root.append(heading);
  const image=doc.createElement('img');image.className='device-icon';image.alt='';icon(image,widget.icon||({switch:'mdi:toggle-switch',dimmer:'mdi:brightness-6',color:'mdi:palette',thermostat:'mdi:thermostat',value:'mdi:gauge'}[widget.deviceKind]));root.append(image);
  const state=doc.createElement('output');state.textContent=!model.available?(runtime?t('Nicht verfügbar'):t('Vorschau')):model.raw==='on'?t('Ein'):model.raw==='off'?t('Aus'):`${model.raw} ${model.unit}`.trim();if(widget.showState!==false)root.append(state);
  const controls=doc.createElement('div');controls.className='device-controls';const status=doc.createElement('output');status.className='device-feedback';status.setAttribute('role','status');let busy=false;
  const allowed=()=>runtime&&!widget.readOnly&&model.available&&!busy;
  const submit=async(path,body)=>{if(!allowed())return;busy=true;root.dataset.writing='true';controls.querySelectorAll('input,button').forEach(n=>n.disabled=true);status.textContent=t('Übertragen …');try{await write(path,body);status.textContent='';}catch{status.textContent=t('Aktion fehlgeschlagen');}finally{busy=false;delete root.dataset.writing;controls.querySelectorAll('input,button').forEach(n=>n.disabled=!allowed());settled();}};
  if(model.power){const button=doc.createElement('button');button.type='button';button.textContent=model.on?t('Aus'):t('Ein');button.setAttribute('role','switch');button.setAttribute('aria-checked',String(model.on));button.disabled=!allowed();button.onclick=()=>submit('material-value',{entity_id:widget.entityId,value:model.on?'off':'on'});controls.append(button);}
  const numeric=(name,min,max,step,value,send)=>{const label=doc.createElement('label');label.textContent=t(name);const input=doc.createElement('input');input.type=name==='Helligkeit'?'range':'number';Object.assign(input,{min:String(min),max:String(max),step:String(step),value:String(value??min),disabled:!allowed()});input.setAttribute('aria-label',t(name));input.onchange=()=>{if(input.value!==''&&input.checkValidity())send(Number(input.value));};label.append(input);controls.append(label);};
  if(model.brightness)numeric('Helligkeit',0,100,1,Math.round((model.attrs.brightness||0)/255*100),value=>submit('material-value',{entity_id:widget.entityId,value}));
  if(model.rgb){const label=doc.createElement('label');label.textContent=t('Farbe');const color=doc.createElement('input');color.type='color';color.value='#'+(model.attrs.rgb_color||[255,255,255]).map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');color.disabled=!allowed();color.onchange=()=>submit('universal-color',{entity_id:widget.entityId,kind:'rgb',value:color.value.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16))});label.append(color);controls.append(label);}
  if(model.temperature){const a=model.attrs;numeric('Temperatur',a.min_temp,a.max_temp,a.target_temp_step||.5,a.temperature,value=>submit('temperature',{entity_id:widget.entityId,value,min:a.min_temp,max:a.max_temp,step:a.target_temp_step||.5}));}
  for(const name of ['click','pointerdown','keydown'])controls.addEventListener(name,e=>e.stopPropagation());
  controls.append(status);
  root.updateDevice=()=>{if(busy)return;model=deviceModel(widget,getEntry());state.textContent=model.available?(model.raw==='on'?t('Ein'):model.raw==='off'?t('Aus'):`${model.raw} ${model.unit}`.trim()):t('Nicht verfügbar');const power=controls.querySelector('[role=switch]');if(power){power.textContent=model.on?t('Aus'):t('Ein');power.setAttribute('aria-checked',String(model.on));}controls.querySelectorAll('input,button').forEach(node=>node.disabled=!allowed());};
  controls.addEventListener('focusout',()=>doc.defaultView.setTimeout(settled,0));
  if(widget.presentation==='floorplan'){
    const open=doc.createElement('button');open.type='button';open.className='device-open';open.textContent='⋯';open.setAttribute('aria-label',model.name||t('Gerät'));open.disabled=!runtime;open.onclick=e=>{e.stopPropagation();const dialog=doc.createElement('dialog');dialog.className='device-popup';const title=doc.createElement('h2');title.textContent=model.name||t('Gerät');const close=doc.createElement('button');close.type='button';close.textContent=t('Schließen');close.onclick=()=>dialog.close();dialog.append(title,controls,close);const observer=new doc.defaultView.MutationObserver(()=>{if(!root.isConnected)dialog.close();});dialog.addEventListener('close',()=>{observer.disconnect();root.append(controls);controls.hidden=true;dialog.remove();settled();},{once:true});doc.body.append(dialog);controls.hidden=false;dialog.showModal();observer.observe(doc.body,{childList:true,subtree:true});};root.append(open,controls);controls.hidden=true;
  }else root.append(controls);
  return root;
}
