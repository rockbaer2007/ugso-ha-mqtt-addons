export const headingStatusGroup={id:'heading-status',label:'Status in Überschrift',masterKey:'headingStatusEnabled',defaultEnabled:false,fields:[{key:'headingEntityId',label:'Home-Assistant-Entität'},{key:'headingAttribute',label:'Attribut (optional)'},{key:'headingUnit',label:'Einheit (leer = automatisch)'},{key:'headingDecimals',label:'Nachkommastellen',type:'number',min:0,max:6,default:1}]};
export function headingStatus(widget,states,locale='de'){
  if(!widget.headingStatusEnabled||!widget.headingEntityId)return '';
  const entry=states[widget.headingEntityId];if(!entry||['unknown','unavailable'].includes(entry.state))return '—';
  const raw=widget.headingAttribute?entry.attributes?.[widget.headingAttribute]:entry.state;if(raw==null||typeof raw==='object')return '—';
  const number=typeof raw==='number'||typeof raw==='string'&&raw.trim()!==''?Number(raw):NaN;
  const value=Number.isFinite(number)?new Intl.NumberFormat(locale,{maximumFractionDigits:Math.max(0,Math.min(6,Number(widget.headingDecimals) || 0))}).format(number):String(raw);
  return `${value} ${widget.headingUnit||(!widget.headingAttribute?entry.attributes?.unit_of_measurement:'')||''}`.trim();
}
