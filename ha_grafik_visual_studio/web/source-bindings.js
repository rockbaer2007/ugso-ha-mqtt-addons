const entity=/^[a-z][a-z0-9_]*\.[a-z0-9_]+$/;
const finite=value=>(typeof value==='number'||typeof value==='string'&&value.trim())&&Number.isFinite(Number(value))?Number(value):null;
export const sourceKey=(kind,key)=>`source${kind}__${key}`;
export function sourceEntries(widget){return Object.entries(widget).filter(([key,value])=>(key==='entityId'||/EntityId\d*$/.test(key))&&typeof value==='string'&&entity.test(value));}
export function readableSource(widget,key){
  if(/^(output|inputEntityId|brightnessEntityId|coverEntityId|modeEntityId|notifyEntityId|controlEntityId)|HelperEntityId$/.test(key))return false;
  if(key==='powerEntityId'&&widget.type?.startsWith('ugso.technic/'))return false;
  if(widget.energyKind==='price' && key==='pricesEntityId')return false;
  if(widget.type?.endsWith('/heating-params') && !widget.readOnly)return false;
  if(key==='targetEntityId' && !/^gauge-/.test(widget.type||''))return false;
  if(/(?:switch|dimmer|thermostat)/.test(widget.type||'')&&key==='entityId')return false;
  return true;
}
export function sourceUnitConversion(value,from,to){
  if(from===to || !to || !from)return {value,factor:1,valid:true};
  const groups=[{W:1,kW:1000,MW:1000000},{Wh:1,kWh:1000,MWh:1000000},{'ct/kWh':.01,'€/kWh':1,'EUR/kWh':1},{m:1,cm:.01,mm:.001,km:1000,ft:.3048,in:.0254},{l:1,ml:.001,'m³':1000},{'m/s':1,'km/h':1/3.6,mph:.44704},{Pa:1,hPa:100,kPa:1000,bar:100000,psi:6894.757293168},{'%':1}];
  for(const group of groups)if(Object.hasOwn(group,from)&&Object.hasOwn(group,to)){const factor=group[from]/group[to];return {value:value*factor,factor,valid:true};}
  if(from==='°C'&&to==='°F')return {value:value*9/5+32,factor:null,valid:true};
  if(from==='°F'&&to==='°C')return {value:(value-32)*5/9,factor:null,valid:true};
  return {value:null,factor:null,valid:false};
}
export function sourceTargetUnit(widget,key,states){
  const fixed=fixedSourceUnit(widget,key,states);if(fixed)return fixed;
  const parts=key.match(/^(.*)EntityId(\d*)$/),prefix=parts?.[1]||key,index=parts?.[2]||'';
  return widget[sourceKey('Unit',key)]||widget[`${prefix}Unit${index}`]||(/(soc|humidity|charging)EntityId/i.test(key)?'%':'')||(/(actual|temperature|low|high)EntityId/.test(key)?states[widget.targetEntityId]?.attributes?.temperature_unit:'')||widget.unit||(/powerEntityId/.test(key)?widget.powerUnit:'')||states[widget[key]]?.attributes?.unit_of_measurement||'';
}
export function fixedSourceUnit(widget,key,states){
  if(widget.type?.startsWith('ugso.solar/'))return {powerEntityId:'W',temperatureEntityId:'°C',socEntityId:'%'}[key]||'';
  if(widget.energyKind){
    if(key==='socEntityId')return '%';if(key==='energyEntityId')return 'kWh';if(key==='powerEntityId')return widget.powerUnit||'W';
    if(widget.energyKind==='costs'&&['consumptionEntityId','exportEntityId'].includes(key))return 'kWh';
    const prefix=key.replace(/EntityId$/,'');return widget[`${prefix}Unit`]||widget.unit||'';
  }
  if(widget.type?.startsWith('ugso.technic/')&&key==='actualEntityId')return states[widget.targetEntityId]?.attributes?.temperature_unit||'';
  const parts=key.match(/^(.*)EntityId(\d*)$/),prefix=parts?.[1]||key,index=parts?.[2]||'';return widget[`${prefix}Unit${index}`]||widget.unit||'';
}
export function resolveSource(widget,states,key){
  const id=widget[key],entry=states[id],enabled=widget.sourceOptionsEnabled===true&&readableSource(widget,key),attribute=enabled?widget[sourceKey('Attribute',key)]||'':'';
  const attrs=entry?.attributes||{},unit=attrs.unit_of_measurement||attrs.temperature_unit||'';
  let value=entry?.state;
  if(!entry||['unknown','unavailable'].includes(entry.state))return {id,value:null,unit,valid:false,error:'Quelle nicht verfügbar',attribute};
  if(attribute){value=Object.hasOwn(attrs,attribute)?attrs[attribute]:undefined;if(value===undefined)return {id,value:null,unit,valid:false,error:'Attribut nicht verfügbar',attribute};}
  const auto=enabled && widget[sourceKey('AutoUnit',key)]===true,target=sourceTargetUnit(widget,key,states);
  let factor=1;
  if(auto){const number=finite(value);if(number===null)return {id,value:null,unit,valid:false,error:'Numerische Quelle erforderlich',attribute};if(!unit||!target)return {id,value:null,unit,valid:false,error:'Quell- und Zieleinheit erforderlich',attribute};const conversion=sourceUnitConversion(number,unit,target);if(!conversion.valid)return {id,value:null,unit,valid:false,error:'Einheiten sind nicht kompatibel',attribute};value=conversion.value;factor=conversion.factor;}
  if(value===undefined||value===null)return {id,value:null,unit,valid:false,error:'Quelle nicht verfügbar',attribute};
  return {id,value,unit:auto?target:unit,sourceUnit:unit,factor,valid:true,error:'',attribute,converted:auto};
}
export function mapDisplaySources(widget,states){
  if(widget.sourceOptionsEnabled!==true)return {widget,states};
  const model={...widget},mapped={...states};let serial=0;
  for(const [key,id]of sourceEntries(widget)){
    if(!readableSource(widget,key)||(!widget[sourceKey('Attribute',key)]&&!widget[sourceKey('AutoUnit',key)]))continue;
    const result=resolveSource(widget,states,key),virtual=`sensor.studio_source_${++serial}_${widget.id.replace(/[^a-z0-9_]/gi,'_').toLowerCase()}`;
    model[key]=virtual;let value=result.value;
    if(value!==null&&typeof value==='object'){try{value=JSON.stringify(value);if(value.length>262144)value=null;}catch{value=null;}}
    mapped[virtual]={...states[id],entity_id:virtual,state:result.valid&&value!==null?typeof value==='boolean'?value?'on':'off':String(value):'unavailable',attributes:{...states[id]?.attributes,unit_of_measurement:result.unit}};
    if(key==='entityId'&&result.converted&&!model.unit)model.unit=result.unit;
  }
  return {widget:model,states:mapped};
}
export function sourceGroups(widget,states,labels={}){
  const fields=sourceEntries(widget).filter(([key])=>readableSource(widget,key)).flatMap(([key,id])=>[
    {label:`${labels[key]||states[id]?.attributes?.friendly_name||id}: Attribut`,key:sourceKey('Attribute',key),type:'text',suggestions:[...new Set([...(states[id]?.attributeNames||[]),...Object.keys(states[id]?.attributes||{})])].filter(name=>name.length<=128)},
    {label:`${labels[key]||states[id]?.attributes?.friendly_name||id}: Einheiten automatisch umrechnen`,key:sourceKey('AutoUnit',key),type:'checkbox',default:false},
    {label:`${labels[key]||states[id]?.attributes?.friendly_name||id}: Zieleinheit`,key:sourceKey('Unit',key),type:'text',default:fixedSourceUnit(widget,key,states),disabled:Boolean(fixedSourceUnit(widget,key,states)),suggestions:['W','kW','MW','Wh','kWh','MWh','°C','°F','%','ct/kWh','€/kWh','EUR/kWh','m','cm','mm','km','ft','in','l','ml','m³','m/s','km/h','mph','Pa','hPa','kPa','bar','psi']},
  ]);
  return {id:'source-bindings',label:'HA-Quellen und Einheiten',masterKey:'sourceOptionsEnabled',defaultEnabled:false,hint:'Attribut und automatische Umrechnung sind optional. Bestehende Quellen und Faktoren bleiben erhalten.',fields};
}
export function sourceAttributes(widget){return sourceEntries(widget).flatMap(([key,id])=>[...['friendly_name','unit_of_measurement','device_class','state_class','temperature_unit','min','max','step'],...(widget.sourceOptionsEnabled&&readableSource(widget,key)&&widget[sourceKey('Attribute',key)]?[widget[sourceKey('Attribute',key)]]:[])].map(name=>`${id}|${name}`));}
