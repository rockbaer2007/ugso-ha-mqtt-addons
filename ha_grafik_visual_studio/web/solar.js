export const isSolar = widget => ['ugso.solar/head','ugso.solar/battery','ugso.solar/solo','ugso.solar/panel'].includes(widget?.type);
export const solarKind = widget => widget.type.split('/')[1];
export const SOLAR_CHANNELS = [['power','Leistung','W'],['temperature','Temperatur','°C'],['soc','Ladezustand (SoC)','%']];
const SIDES = [['left-center','Links',0,.5],['right-center','Rechts',1,.5],['top-center','Oben',.5,0],['bottom-center','Unten',.5,1]];
const PV_PORTS = [['pv-left-upper','Solar links oben',.0925,28/82],['pv-left-lower','Solar links unten',.0925,61/82],['pv-right-upper','Solar rechts oben',.9075,28/82],['pv-right-lower','Solar rechts unten',.9075,61/82]];
export function solarAnchors(widget) {
  const kind=solarKind(widget);
  if(kind==='panel')return [['right-center','Ausgang',widget.solarOutputPosition==='left'?0:widget.solarOutputPosition==='right'?1:.5,.89]];
  if(kind==='head') {
    const height=Number(widget.height)||64, graphicHeight=(Number(widget.width)||256)*82/400;
    return [...SIDES.slice(0,2),...PV_PORTS.map(([id,label,x,y])=>[id,label,x,(height-graphicHeight+graphicHeight*y)/height])];
  }
  if(kind==='battery')return SIDES.slice(0,2).map(([id,label,x,y])=>widget[solarPortKey(id,'position')]==='housing'?[id,label,x===0?.09:.91,190/264]:[id,label,x,y]);
  if(kind==='solo')return [...SIDES,
    ['bottom-left','Unten Ecke links',0,1],['bottom-left-outer','Unten links außen',1/6,1],['bottom-left-inner','Unten links innen',2/6,1],
    ['bottom-right-inner','Unten rechts innen',4/6,1],['bottom-right-outer','Unten rechts außen',5/6,1],['bottom-right','Unten Ecke rechts',1,1]
  ];
  return SIDES;
}
export const solarPortKey = (anchor, suffix) => `solar${anchor.split('-').map(part=>part[0].toUpperCase()+part.slice(1)).join('')}${suffix[0].toUpperCase()+suffix.slice(1)}`;
export const solarPortRole = (widget, anchor) => solarAnchors(widget).some(([id])=>id===anchor) ? solarKind(widget)==='panel' ? (widget.solarOutputEnabled===false?'off':'output') : solarKind(widget)==='head'&&anchor.startsWith('pv-') ? (widget[solarPortKey(anchor,'enabled')]===false?'off':'input') : widget[solarPortKey(anchor,'role')] || 'off' : 'off';
export const solarPortActive = (widget,anchor,side='') => side==='start' ? solarPortRole(widget,anchor)==='output' : side==='end' ? solarPortRole(widget,anchor)==='input' : ['input','output'].includes(solarPortRole(widget,anchor));
export const solarBindings = widget => SOLAR_CHANNELS.map(([key])=>widget[`${key}EntityId`]).filter(Boolean);
export function solarSize(widget, changed='width') {
  const kind=solarKind(widget), ratio=kind==='panel'?360/400:kind==='battery'?264/400:kind==='solo'?284/396:82/400;
  const width=Math.max(kind==='solo'?96:128,Math.min(1600,Number(changed==='height'&&kind!=='head'?widget.height/ratio:widget.width)|| (kind==='solo'?144:256)));
  return {width:Math.round(width*10)/10,height:Math.round((kind==='head'?Math.max(width*ratio,Number(widget.height)||64):width*ratio)*10)/10};
}
export function solarReading(widget, channel, states, input) {
  const unit=SOLAR_CHANNELS.find(([key])=>key===channel)?.[2];
  if(!unit)return {value:null,unit:'',error:'Unbekannter Solar-Wert'};
  const ports=solarAnchors(widget).filter(([id])=>!id.startsWith('pv-') && solarPortRole(widget,id)==='input' && (widget[solarPortKey(id,'value')]||'power')===channel);
  if(ports.length>1)return {value:null,unit,error:'Genau ein Eingang pro Solar-Wert erlaubt'};
  let raw, sourceUnit;
  if(ports.length) {
    const result=input?.(ports[0][0]);
    if(!result||result.error)return {value:null,unit,error:result?.error||'Eingangswert fehlt'};
    raw=result.value;sourceUnit=result.unit;
  } else {
    const entity=widget[`${channel}EntityId`], entry=states[entity];
    raw=entity?entry?.state:widget[`${channel}Preview`];sourceUnit=entry?.attributes?.unit_of_measurement;
  }
  const value=typeof raw==='boolean'||raw===null||raw===undefined||String(raw).trim()===''?NaN:Number(String(raw).replace(',','.'));
  if(!Number.isFinite(value))return {value:null,unit,error:'Quelle hat keinen verfügbaren Wert'};
  return {value:channel==='power'&&sourceUnit==='kW'?value*1000:value,unit,error:''};
}
export function solarPortGroups(widget) {
  if(solarKind(widget)==='panel')return [{id:'solar-ports',label:'Linienanschluss',fields:[
    {key:'solarOutputEnabled',label:'Ausgangspunkt aktiv',type:'checkbox',default:true},
    {key:'solarOutputPosition',label:'Position des Ausgangspunkts',type:'select',default:'pipe',options:[{value:'pipe',label:'Am Standrohr über dem Fuß'},{value:'left',label:'Widgetkante links'},{value:'right',label:'Widgetkante rechts'}]}
  ]}];
  return [{id:'solar-ports',label:'Linienanschlüsse',fields:solarAnchors(widget).flatMap(([anchor,label])=>[
    ...(anchor.startsWith('pv-') ? [{key:solarPortKey(anchor,'enabled'),label:`${label}: Eingang aktiv`,type:'checkbox',default:true}] : [
    {key:solarPortKey(anchor,'role'),label:`${label}: Rolle`,type:'radio',default:'off',options:[{value:'off',label:'Aus'},{value:'input',label:'Eingang'},{value:'output',label:'Ausgang'}]},
    {key:solarPortKey(anchor,'value'),label:`${label}: Wert`,type:'select',default:'power',options:SOLAR_CHANNELS.map(([value,label])=>({value,label}))}
    ]),
    ...(solarKind(widget)==='battery'?[{key:solarPortKey(anchor,'position'),label:`${label}: Position`,type:'select',default:'widget',options:[{value:'widget',label:'Widgetkante Mitte'},{value:'housing',label:'Gehäusekante an unterer Naht'}]}]:[])
  ])}];
}
export function solarPropertyGroups(widget, groups) {
  if(solarKind(widget)==='head')return groups.filter(group=>!group.fields.some(field=>/^(power|temperature|soc)(EntityId|Preview)$|^show(Power|Temperature|Soc|PowerDirection)$|^solar(TextColor|FontSize)$/.test(field.key)));
  if(solarKind(widget)==='battery')return groups.map(group=>{
    const channel=SOLAR_CHANNELS.find(([key])=>group.fields.some(field=>field.key===`${key}EntityId`))?.[0];
    return channel?{...group,fields:[...group.fields,{key:`${channel}TextColor`,label:'Schriftfarbe des Werts',type:'color',default:widget.solarTextColor||'#17242c'}]}:group;
  });
  return groups;
}
export function renderSolar(widget,doc,{states={},input,locale='de'}={}) {
  const root=doc.createElement('div'), kind=solarKind(widget);
  root.className=`solar-widget solar-${kind}`;
  const image=doc.createElement('img');image.className='solar-graphic';image.draggable=false;
  image.src=new URL(`solar/${kind}.svg`,import.meta.url).href;
  if(kind==='panel' && widget.solarPanelOrientation==='mirrored')image.style.transform='scaleX(-1)';
  image.alt=kind==='panel'?'Solarpanel mit Standrohr und Fuß':kind==='battery'?'Akkupack':kind==='head'?'Wechselrichter Kopfteil':'Wechselrichter Solo';root.append(image);
  const rows=kind==='head'?[]:SOLAR_CHANNELS.filter(([key])=>widget[`show${key[0].toUpperCase()+key.slice(1)}`]===true);
  const panel=doc.createElement('div');panel.className='solar-readings';panel.dataset.count=String(rows.length);
  const graphicHeight=Number(widget.width)*82/400;
  const available=kind==='head'?graphicHeight*.6:Number(widget.height)*(kind==='solo'?.16:.6);
  root.style.setProperty('--solar-head-height',`${graphicHeight}px`);
  root.style.setProperty('--solar-font-size',`${Math.max(kind==='battery'?9:4,Math.min(Number(widget.solarFontSize)||18,available/Math.max(1,rows.length)/1.4))}px`);
  root.style.color=/^#[0-9a-f]{6}$/i.test(widget.solarTextColor||'')?widget.solarTextColor:'#17242c';
  for(const [channel,label] of rows) {
    const reading=solarReading(widget,channel,states,input), row=doc.createElement('div');row.className='solar-reading';row.dataset.channel=channel;row.title=label;
    if(kind==='battery'&&/^#[0-9a-f]{6}$/i.test(widget[`${channel}TextColor`]||''))row.style.color=widget[`${channel}TextColor`];
    if(channel==='power' && widget.showPowerDirection===true && !reading.error && reading.value!==0) {
      const into=(reading.value>0)===(widget.positivePowerDirection!=='out'), icon=doc.createElement('span');
      icon.className=`solar-power-direction is-${into?'in':'out'}`;icon.textContent=into?(widget.powerInIcon||'↓'):(widget.powerOutIcon||'↑');
      icon.setAttribute('aria-label',locale.startsWith('de')?(into?'Energie hinein':'Energie heraus'):(into?'Energy in':'Energy out'));row.append(icon);
    }
    const value=doc.createElement('span');value.className='solar-value';
    value.textContent=reading.error?'—':`${new Intl.NumberFormat(locale,{maximumFractionDigits:channel==='temperature'?1:0}).format(reading.value)} ${reading.unit}`;
    row.append(value);panel.append(row);
  }
  root.append(panel);return root;
}
