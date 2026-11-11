import {pins} from './catalog.js?v=0.1.12';
import {haConfig,exportOptions} from './ha-export.js?v=0.1.12';
import {statefulTypes,timedTypes,statefulStep,statefulTemplate,memoryId} from './stateful.js?v=0.1.12';
import {outputMode,outputAction,validateOutput} from './output.js?v=0.1.12';
const q=JSON.stringify;

export function compileGraph(p,defs,{analyze,cast,expression,yaml,VERSION}){
 const {errors,order,incoming}=analyze(p,defs);if(errors.length)throw Error(errors.join('\n'));
 const js=p.target==='javascript',options=exportOptions(p),refs=new Map(),reads=[],steps=[],outs=[],memories=[],code=[],pending=[];
 const literal=(v,type)=>{const value=cast(v,type);return typeof value==='boolean'?(value?'true':'false'):q(value);};
 for(const [i,b]of order.entries()){
  if(b.type==='COMMENT')continue;
  const name='v'+i,def=defs.get(b.type),isStateful=statefulTypes.has(b.type),args={};
  for(const pin of pins(def,b,'inputs')){const source=incoming.get(b.id+'.'+pin.id);args[pin.id]=source?refs.get(source.join('.')):literal(b.params[pin.id]??pin.default,pin.type);}
  if(b.type==='STATE_OUT'){
   const mode=outputMode(b);if(outs.some(o=>o.entity===b.params.oid))throw Error('Mehrere Ausgänge für dieselbe HA-Entität: '+b.params.oid);
   outs.push({entity:b.params.oid,mode,value:args.IN,label:b.name});continue;
  }
  let expr,divisor;
  if(b.type==='STATE_IN'){
   const attribute=b.params.attribute||'',raw='raw'+i;reads.push({entity:b.params.oid,type:b.params.type,attribute,raw});
   if(js){code.push(`  const ${raw} = ${attribute?`await readAttribute(${q(b.params.oid)},${q(attribute)})`:`await readState(${q(b.params.oid)})`};\n  if (${raw} === null || ${raw} === undefined || ['unknown','unavailable'].includes(${raw})) throw new Error('Unavailable input: ${b.id}');`);expr=`cast(${raw},${q(b.params.type)})`;}
   else{const value=raw+'.value';expr=b.params.type==='BOOL'?`(${value} in [true,'on','true',1])`:b.params.type==='REAL'?`(${value}|float)`:b.params.type==='INT'?`(${value}|int)`:value;}
  }else if(b.type==='CONST')expr=literal(b.params.value,b.params.type);
  else if(isStateful){
   const id=memoryId(p,b,options.objectId);if(memories.some(m=>m.id===id))throw Error('Speicher-Helfer mehrfach verwendet: '+id);
   memories.push({id,name:'mem'+i,kind:b.type});
   if(js){code.push(`  if (!loadMemory || !saveMemory) throw new Error('Persistent memory host required');\n  const ${name} = statefulStep(${q(b.type)},{${Object.entries(args).map(([k,v])=>q(k)+':'+v).join(',')}},await loadMemory(${q(id)}) ?? {},now,boot);`);pending.push(`  await saveMemory(${q(id)},${name}.state);`);}
   else steps.push({name,label:b.name,stateful:b.type,args,template:statefulTemplate(b.type,args,'mem'+i)});
  }else{expr=expression(b.type,Object.values(args),js?'js':'yaml');if(b.type==='DIV')divisor=Object.values(args)[1];}
  if(!isStateful){
   if(js)code.push(`  const ${name} = ${expr};\n  if (typeof ${name} === 'number' && !Number.isFinite(${name})) throw new Error('Invalid numeric result: ${name}');`);
   else steps.push({name,label:b.name,expression:expr,type:pins(def,b,'outputs')[0]?.type,divisor});
  }
  for(const pin of pins(def,b,'outputs'))refs.set(b.id+'.'+pin.id,isStateful?`${name}.outputs.${pin.id}`:js?name:name+'.value');
 }
 for(const m of memories)if(outs.some(o=>o.entity===m.id))throw Error('Ausgang darf keinen Bausteinspeicher überschreiben.');
 if(js){
  const checks=outs.map((o,i)=>`  const meta${i} = ${o.mode==='NUMBER'?`{min:await readAttribute(${q(o.entity)},'min'),max:await readAttribute(${q(o.entity)},'max')}`:o.mode==='TEXT'?`{min:await readAttribute(${q(o.entity)},'min') ?? 0,max:await readAttribute(${q(o.entity)},'max') ?? 255}`:'{}'};\n  validateOutput(${q(o.mode)},${o.value},meta${i});`);
  return `// UGSo Logic Studio ${VERSION}. Host: serialize calls; tick every 1000 ms for stateful plans.\n// Persist memory atomically; on host restart call once with boot:true (no artificial edges).\nconst statefulTypes=new Set(${q([...statefulTypes])});\nconst timedTypes=new Set(${q([...timedTypes])});\nconst cast=${cast.toString()};\nconst statefulStep=${statefulStep.toString()};\nconst outputAction=${outputAction.toString()};\nconst validateOutput=${validateOutput.toString()};\nexport async function run({readState,readAttribute=async()=>null,callAction,loadMemory,saveMemory,now=Date.now(),boot=false}){\n${code.join('\n')}\n${checks.join('\n')}\n${pending.join('\n')}\n${outs.map(o=>`  {const command=outputAction(${q(o.entity)},${q(o.mode)},${o.value});await callAction(command.action,command.data);}`).join('\n')}\n}\n`;
 }
 return '# UGSo Logic Studio '+VERSION+'\n# '+(options.format==='editor'?'HA-Editor: einzelner Eintrag; Speicher-Helfer separat anlegen.':options.format==='package'?'HA-Package: nach Backup unter homeassistant.packages einbinden.':'Dateiformat: in bestehende Datei einordnen, nicht ersetzen.')+'\n'+yaml(haConfig(p,{reads,steps,outs,memories}))+'\n';
}

export function scanGraph(p,defs,options,{analyze,cast,operation}){
 const {errors,order,incoming}=analyze(p,defs);if(errors.length)throw Error(errors.join('\n'));
 const values=new Map(),signals=new Map(),memory=structuredClone(options.memory||{}),now=options.now??Date.now();
 for(const b of order){
  if(b.type==='COMMENT')continue;
  let value,outputs;
  if(b.type==='STATE_IN'){const raw=options.readInput?options.readInput(b):b.params.demo;if(raw==null||['unknown','unavailable'].includes(raw))throw Error('Eingangswert nicht verfügbar: '+b.name);value=cast(raw,b.params.type);}
  else if(b.type==='CONST')value=cast(b.params.value,b.params.type);
  else{
   const args=Object.fromEntries(pins(defs.get(b.type),b,'inputs').map(pin=>{const s=incoming.get(b.id+'.'+pin.id);return [pin.id,s?signals.get(s.join('.')):cast(b.params[pin.id]??pin.default,pin.type)];}));
   if(statefulTypes.has(b.type)){const result=statefulStep(b.type,args,memory[b.id]||{},now,options.boot||false);memory[b.id]=result.state;outputs=result.outputs;value=outputs[pins(defs.get(b.type),b,'outputs')[0].id];}
   else value=b.type==='STATE_OUT'?args.IN:operation(b.type,Object.values(args));
  }
  if(typeof value==='number'&&!Number.isFinite(value))throw Error('Ungültiges Zahlenergebnis.');
  values.set(b.id,value);for(const pin of pins(defs.get(b.type),b,'outputs'))signals.set(b.id+'.'+pin.id,outputs?outputs[pin.id]:value);
 }
 return {values,signals,memory};
}
