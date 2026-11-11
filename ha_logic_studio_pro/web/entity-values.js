export function entityParameters(previous, entity, blockType) {
 const params={...previous,oid:entity.entity_id};
 if(blockType!=='STATE_IN'){const mode=entity.output_mode||(entity.domain==='input_number'?'NUMBER':entity.domain==='input_text'?'TEXT':'BOOL');return {...params,mode,...(mode!==(previous.mode||'BOOL')?{IN:mode==='TEXT'?'':mode==='BOOL'?false:0}:{})};}
 params.attribute=entity.selected_attribute||'';
 const value=params.attribute?entity.attributes?.[params.attribute]:entity.state;
 params.type=params.attribute?(typeof value==='boolean'?'BOOL':typeof value==='number'?'REAL':'STRING'):entity.signal_type;
 // Keep unavailable inputs explicit; never turn them silently into FALSE/zero.
 params.demo=value===null||value===undefined?'unavailable':['unknown','unavailable'].includes(value)?value:
   params.type==='BOOL'?(value===true||['on','true'].includes(value)):params.type==='REAL'?Number(value):String(value);
 return params;
}
