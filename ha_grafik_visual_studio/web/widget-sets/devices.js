import {registerWidgetSet} from '../widget-registry.js';
import {cssGroups} from './core.js';

// Original HA-native definitions. Both presentations use the same state/control model.
const devices=[['switch','Schalter','toggle-switch'],['dimmer','Dimmer','brightness-6'],['color','Farbiges Licht','palette'],['thermostat','Thermostat','thermostat'],['value','Messwert','gauge']];
registerWidgetSet({id:'devices',label:'Geräte',widgets:devices.flatMap(([kind,label,icon])=>['tile','floorplan'].map(presentation=>({
  type:`device-${kind}-${presentation}`,label:`${label} · ${presentation==='tile'?'Kachel':'Grundriss'}`,icon:`mdi:${icon}`,
  deviceWidget:true,render:{kind:'device'},
  defaults:{deviceKind:kind,presentation,width:presentation==='tile'?240:120,height:presentation==='tile'?170:90,entityId:'',readOnly:false,showName:true,showState:true,color:'#38bdf8',backgroundColor:'#202b38',radius:12},
  propertyGroups:[{label:'Gerät',fields:[{key:'title',label:'Name'},{key:'entityId',label:'Home-Assistant-Entität'},{key:'presentation',label:'Darstellung',type:'select',options:[{value:'tile',label:'Kachel'},{value:'floorplan',label:'Grundriss'}]},{key:'readOnly',label:'Nur lesen',type:'checkbox'},{key:'showName',label:'Name anzeigen',type:'checkbox'},{key:'showState',label:'Status anzeigen',type:'checkbox'},{key:'icon',label:'Symbol',default:`mdi:${icon}`},{key:'color',label:'Akzentfarbe',type:'color'}]},
    {label:'Größe und Position',fields:['x','y','width','height'].map(key=>({key,label:key,type:'number',min:0}))},...cssGroups().map(group=>({...group,defaultEnabled:false}))]
}))) });
