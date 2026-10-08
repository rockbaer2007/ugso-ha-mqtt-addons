export const isSolar = widget => ['ugso.solar/head','ugso.solar/battery','ugso.solar/solo','ugso.solar/panel'].includes(widget?.type);
export const solarKind = widget => widget.type.split('/')[1];
export const SOLAR_CHANNELS = [['power','Leistung','W'],['temperature','Temperatur','°C'],['soc','Ladezustand (SoC)','%']];
const SIDES = [['left-center','Links',0,.5],['right-center','Rechts',1,.5],['top-center','Oben',.5,0],['bottom-center','Unten',.5,1]];
export const solarAnchors = widget => solarKind(widget)==='panel'
  ? [['right-center','Ausgang',widget.solarOutputPosition==='left'?0:widget.solarOutputPosition==='right'?1:.5, .89]]
  : SIDES.filter(([id]) => solarKind(widget)==='solo' || (solarKind(widget)==='head' ? id!=='bottom-center' : id==='left-center'||id==='right-center'));
export const solarPortKey = (anchor, suffix) => `solar${anchor.split('-').map(part=>part[0].toUpperCase()+part.slice(1)).join('')}${suffix[0].toUpperCase()+suffix.slice(1)}`;
export const solarPortRole = (widget, anchor) => solarAnchors(widget).some(([id])=>id===anchor) ? solarKind(widget)==='panel' ? (widget.solarOutputEnabled===false?'off':'output') : widget[solarPortKey(anchor,'role')] || 'off' : 'off';
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
  const ports=solarAnchors(widget).filter(([id])=>solarPortRole(widget,id)==='input' && widget[solarPortKey(id,'value')]===channel);
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
    {key:solarPortKey(anchor,'role'),label:`${label}: Rolle`,type:'radio',default:'off',options:[{value:'off',label:'Aus'},{value:'input',label:'Eingang'},{value:'output',label:'Ausgang'}]},
    {key:solarPortKey(anchor,'value'),label:`${label}: Wert`,type:'select',default:'power',options:SOLAR_CHANNELS.map(([value,label])=>({value,label}))}
  ])}];
}
export function renderSolar(widget,doc,{states={},input,locale='de'}={}) {
  const root=doc.createElement('div'), kind=solarKind(widget);
  root.className=`solar-widget solar-${kind}`;
  const image=doc.createElement('img');image.className='solar-graphic';image.draggable=false;
  image.src=new URL(`solar/${kind}.svg`,import.meta.url).href;
  if(kind==='panel' && widget.solarPanelOrientation==='mirrored')image.style.transform='scaleX(-1)';
  image.alt=kind==='panel'?'Solarpanel mit Standrohr und Fuß':kind==='battery'?'Akkupack':kind==='head'?'Wechselrichter Kopfteil':'Wechselrichter Solo';root.append(image);
  const rows=SOLAR_CHANNELS.filter(([key])=>widget[`show${key[0].toUpperCase()+key.slice(1)}`]===true);
  const panel=doc.createElement('div');panel.className='solar-readings';panel.dataset.count=String(rows.length);
  const graphicHeight=Number(widget.width)*82/400;
  const available=kind==='head'?graphicHeight*.6:Number(widget.height)*(kind==='solo'?.16:.6);
  root.style.setProperty('--solar-head-height',`${graphicHeight}px`);
  root.style.setProperty('--solar-font-size',`${Math.max(kind==='battery'?9:4,Math.min(Number(widget.solarFontSize)||18,available/Math.max(1,rows.length)/1.4))}px`);
  root.style.color=/^#[0-9a-f]{6}$/i.test(widget.solarTextColor||'')?widget.solarTextColor:'#17242c';
  for(const [channel,label] of rows) {
    const reading=solarReading(widget,channel,states,input), row=doc.createElement('div');row.className='solar-reading';row.dataset.channel=channel;row.title=label;
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
