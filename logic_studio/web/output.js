export function outputMode(block){return block.params.mode||'BOOL';}
export function outputAction(entity,mode,value){
 const domain=entity.split('.')[0];
 if(mode==='BOOL')return {action:domain+(value?'.turn_on':'.turn_off'),data:{entity_id:entity}};
 if(mode==='NUMBER')return {action:'input_number.set_value',data:{entity_id:entity,value}};
 if(mode==='TEXT')return {action:'input_text.set_value',data:{entity_id:entity,value}};
 if(mode==='BRIGHTNESS')return value===0?{action:'light.turn_off',data:{entity_id:entity}}:{action:'light.turn_on',data:{entity_id:entity,brightness_pct:value}};
 throw Error('Unbekannter Ausgangsmodus.');
}
export function validateOutput(mode,value,meta={}){
 if(mode==='BOOL'&&typeof value!=='boolean')throw Error('Ausgang erfordert BOOL.');
 if(['NUMBER','BRIGHTNESS'].includes(mode)&&(!Number.isFinite(value)||typeof value!=='number'))throw Error('Ausgang erfordert eine endliche Zahl.');
 if(mode==='NUMBER'&&(!Number.isFinite(meta.min)||!Number.isFinite(meta.max)||value<meta.min||value>meta.max))throw Error('Zahl außerhalb der HA-Zielgrenzen.');
 if(mode==='BRIGHTNESS'&&(value<0||value>100))throw Error('Helligkeit: 0 bis 100 %.');
 if(mode==='TEXT'&&(typeof value!=='string'||value.length>(meta.max??255)||value.length<(meta.min??0)))throw Error('Textlänge außerhalb der HA-Zielgrenzen.');
 return value;
}
