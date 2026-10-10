import {parseExpression,parseTemplate,generateExpression,generateTemplate,filterNames} from './jinja-parser.js';
import * as BlocklyModule from 'blockly/core';
const Blockly=Reflect.get(BlocklyModule,'default')||BlocklyModule;
const expr={output:'JinjaExpression',colour:'#8a6635',inputsInline:false},part={output:'JinjaPart',colour:'#8a6635',inputsInline:false};
const header={type:'input_end_row',name:'HEADER'};
const input=(name,check='JinjaExpression')=>({type:'input_value',name,check});
const text=(name,value)=>({type:'field_input',name,text:value});
const multiline=(name,value)=>({type:'field_multilinetext',name,text:value,maxLines:4});
const dropdown=(name,values)=>({type:'field_dropdown',name,options:values.map(v=>[v,v])});
export const jinjaDefinitions=[
  ...['value','condition'].map(kind=>({type:`ugso_jinja_composed_${kind}`,message0:kind==='value'?'Jinja zusammengesetzt %2 %1':'Jinja-Bedingung zusammengesetzt %2 %1',args0:[input('BODY','JinjaPart'),header],output:kind==='value'?['String','Value']:'Boolean',colour:'#8a6635',inputsInline:true,tooltip:'Bearbeitbare Jinja-Struktur. Unverändert bleibt der Originaltext erhalten; Änderungen erzeugen Jinja.'})),
  {type:'ugso_jinja_entity',message0:'Entität %1 Funktion %2 %3',args0:[{type:'ugso_field_entity',name:'ENTITY',text:'sensor.test'},dropdown('FUNCTION',['states','state_attr','is_state','is_state_attr']),header],...expr,inputsInline:true},
  {type:'ugso_jinja_filter',message0:'Filter %1 Argumente %2 %4 Wert %3',args0:[dropdown('FILTER',filterNames),{type:'field_number',name:'COUNT',value:1,min:0,max:3,precision:1},input('VALUE'),header],...expr,inputsInline:true},
  {type:'ugso_jinja_literal',message0:'Literal (Jinja) %1',args0:[text('TEXT','0')],...expr},
  {type:'ugso_jinja_variable',message0:'Jinja-Variable %1',args0:[text('NAME','item')],...expr},
  {type:'ugso_jinja_now',message0:'Jetzt (Jinja)',...expr},
  {type:'ugso_jinja_binary',message0:'Ausdruck %1 %2 %3',args0:[input('LEFT'),dropdown('OP',['+','-','*','/','//','%','~','==','!=','<','>','<=','>=','and','or']),input('RIGHT')],...expr},
  {type:'ugso_jinja_unary',message0:'Ausdruck %1 %2',args0:[dropdown('OP',['not','-','+']),input('VALUE')],...expr},
  {type:'ugso_jinja_select',message0:'Wert %1 wenn %2 sonst %3',args0:[input('YES'),input('TEST'),input('NO')],...expr},
  {type:'ugso_jinja_output',message0:'Ausgeben %2 %1',args0:[input('VALUE'),header],...part,inputsInline:true},
  {type:'ugso_jinja_text',message0:'Jinja-Text %1',args0:[multiline('TEXT','Text')],...part},
  {type:'ugso_jinja_join',message0:'Template-Teile %3 %1 %4 danach %2',args0:[input('FIRST','JinjaPart'),input('NEXT','JinjaPart'),header,{type:'input_end_row',name:'BETWEEN'}],...part,inputsInline:true},
  {type:'ugso_jinja_if',message0:'Wenn %1 Text %2 sonst %3',args0:[input('TEST'),input('YES','JinjaPart'),input('NO','JinjaPart')],...part},
  {type:'ugso_jinja_for',message0:'Für %1 in %2 Text %3 wenn leer %4',args0:[text('NAME','item'),input('ITEMS'),input('BODY','JinjaPart'),input('EMPTY','JinjaPart')],...part},
];
const entityArgs={states:0,state_attr:1,is_state:1,is_state_attr:2};
export function setupJinjaShape(block){
  if(block.type==='ugso_jinja_filter'||block.type==='ugso_jinja_entity'){
    const filter=block.type==='ugso_jinja_filter';
    const update=count=>{for(let i=0;i<count;i++)if(!block.getInput(`ARG${i}`)){if(filter||i>0)block.appendEndRowInput(`ARGROW${i}`);block.appendValueInput(`ARG${i}`).setCheck('JinjaExpression').appendField(`${i+1}.`);}for(let i=count;i<3;i++){if(block.getInput(`ARG${i}`))block.removeInput(`ARG${i}`);if(block.getInput(`ARGROW${i}`))block.removeInput(`ARGROW${i}`);}};
    if(filter){block.saveExtraState=()=>({args:Number(block.getFieldValue('COUNT'))});block.loadExtraState=state=>{if(!Number.isInteger(state.args)||state.args<0||state.args>3)throw Error('Jinja: 0–3 Argumente.');block.setFieldValue(state.args,'COUNT');update(state.args);};block.getField('COUNT').setValidator(value=>{update(Number(value));return value;});update(1);}
    else {block.getField('FUNCTION').setValidator(value=>{update(entityArgs[value]);return value;});update(0);}
  }
  if(block.type.startsWith('ugso_jinja_composed_')){
    block.jinjaOriginal_='';block.jinjaGenerated_='';
    block.saveExtraState=()=>({original:block.jinjaOriginal_,generated:block.jinjaGenerated_});
    block.loadExtraState=state=>{if(typeof state.original!=='string'||state.original.length>10000||typeof state.generated!=='string'||state.generated.length>20000)throw Error('Jinja: Ungültiger Originalzustand.');if(state.original&&generateTemplate(parseTemplate(state.original))!==state.generated)throw Error('Jinja: Original und Struktur passen nicht zusammen.');block.jinjaOriginal_=state.original;block.jinjaGenerated_=state.generated;};
  }
}
function expressionNode(block,depth=0){
  if(depth>15||!block?.isEnabled())throw Error('Jinja: Ausdruck fehlt oder ist zu tief.');
  const field=name=>block.getFieldValue(name),child=name=>expressionNode(block.getInputTargetBlock(name),depth+1);
  switch(block.type){
    case 'ugso_jinja_literal':{const node=parseExpression(field('TEXT'));if(node.kind!=='literal')throw Error('Jinja: Text in Anführungszeichen, Zahl, true/false oder none erwartet.');return node;}
    case 'ugso_jinja_variable':{const node=parseExpression(field('NAME'));if(node.kind!=='variable')throw Error('Jinja: Variablenname ungültig.');return node;}
    case 'ugso_jinja_now':return {kind:'now'};
    case 'ugso_jinja_entity':if(!/^[a-z][a-z0-9_]*\.[a-z0-9_]+$/.test(field('ENTITY')))throw Error('Jinja: Entitäts-ID erwartet.');return {kind:'entity',fn:field('FUNCTION'),entity:field('ENTITY'),args:Array.from({length:entityArgs[field('FUNCTION')]},(_,i)=>child(`ARG${i}`))};
    case 'ugso_jinja_filter':return {kind:'filter',name:field('FILTER'),value:child('VALUE'),args:Array.from({length:Number(field('COUNT'))},(_,i)=>child(`ARG${i}`))};
    case 'ugso_jinja_binary':return {kind:'binary',op:field('OP'),left:child('LEFT'),right:child('RIGHT')};
    case 'ugso_jinja_unary':return {kind:'unary',op:field('OP'),value:child('VALUE')};
    case 'ugso_jinja_select':return {kind:'conditional',test:child('TEST'),yes:child('YES'),no:child('NO')};
    default:throw Error('Jinja: Ausdrucksblock erwartet.');
  }
}
function parts(block,depth=0){
  if(!block)return [];if(depth>100||!block.isEnabled())throw Error('Jinja: Template-Teil ungültig.');
  const child=name=>parts(block.getInputTargetBlock(name),depth+1),expression=name=>expressionNode(block.getInputTargetBlock(name));
  switch(block.type){
    case 'ugso_jinja_text':if(/\{[{%#]/.test(block.getFieldValue('TEXT')))throw Error('Jinja: Textblock enthält Steuerzeichen; Originalblock verwenden.');return [{kind:'text',text:block.getFieldValue('TEXT')}];
    case 'ugso_jinja_output':return [{kind:'output',value:expression('VALUE')}];
    case 'ugso_jinja_join':return [...child('FIRST'),...child('NEXT')];
    case 'ugso_jinja_if':return [{kind:'if',test:expression('TEST'),yes:child('YES'),no:child('NO')}];
    case 'ugso_jinja_for':{const name=block.getFieldValue('NAME');if(parseExpression(name).kind!=='variable')throw Error('Jinja: Schleifenvariable ungültig.');return [{kind:'for',variable:name,items:expression('ITEMS'),body:child('BODY'),otherwise:child('EMPTY')}];}
    default:throw Error('Jinja: Template-Teil erwartet.');
  }
}
export function composedJinja(block){
  if(!block.getInputTargetBlock('BODY'))throw Error('Jinja: Template-Inhalt fehlt.');
  const generated=generateTemplate(parts(block.getInputTargetBlock('BODY')));
  if(generated.length>10000)throw Error('Jinja: Template zu groß.');
  // Compare current structural output, not event counts: undo restores originals too.
  return generated===block.jinjaGenerated_&&block.jinjaOriginal_?block.jinjaOriginal_:generated;
}
export function jinjaBlockExpression(block){
  if(block.type.startsWith('ugso_jinja_composed_')){
    const body=parseTemplate(composedJinja(block));if(body.length!==1||body[0].kind!=='output')throw Error('Jinja: Hier nur ein einzelner Ausdruck.');return generateExpression(body[0].value);
  }
  return generateExpression(expressionNode(block));
}
export function createJinjaBlock(workspace,source,condition=false){
  const finish=block=>{if(workspace.rendered){const descendants=block.getDescendants(false).reverse();for(const child of descendants)child.initSvg();for(const child of descendants)child.render();}return block;};
  let ast;try{ast=parseTemplate(source);generateTemplate(ast);}catch{const block=workspace.newBlock(condition?'ugso_jinja_condition':'ugso_jinja_value');block.setFieldValue(source,'TEXT');return finish(block);}
  const created=[];
  const make=(type,fields={})=>{const block=workspace.newBlock(type);created.push(block);for(const [key,value]of Object.entries(fields))block.setFieldValue(value,key);return block;};
  const connect=(parent,name,child)=>{if(child)parent.getInput(name).connection.connect(child.outputConnection);return parent;};
  function expr(node){
    let block;
    switch(node.kind){
      case 'literal':return make('ugso_jinja_literal',{TEXT:node.raw});
      case 'variable':return make('ugso_jinja_variable',{NAME:node.name});
      case 'now':return make('ugso_jinja_now');
      case 'entity':block=make('ugso_jinja_entity',{ENTITY:node.entity,FUNCTION:node.fn});node.args.forEach((x,i)=>connect(block,`ARG${i}`,expr(x)));return block;
      case 'filter':block=make('ugso_jinja_filter',{FILTER:node.name});block.loadExtraState({args:node.args.length});connect(block,'VALUE',expr(node.value));node.args.forEach((x,i)=>connect(block,`ARG${i}`,expr(x)));return block;
      case 'binary':block=make('ugso_jinja_binary',{OP:node.op});connect(block,'LEFT',expr(node.left));return connect(block,'RIGHT',expr(node.right));
      case 'unary':return connect(make('ugso_jinja_unary',{OP:node.op}),'VALUE',expr(node.value));
      case 'conditional':block=make('ugso_jinja_select');connect(block,'TEST',expr(node.test));connect(block,'YES',expr(node.yes));return connect(block,'NO',expr(node.no));
    }
  }
  function body(nodes){
    const blocks=nodes.map(node=>{
      let b;
      switch(node.kind){
        case 'text':return make('ugso_jinja_text',{TEXT:node.text});
        case 'output':return connect(make('ugso_jinja_output'),'VALUE',expr(node.value));
        case 'if':b=make('ugso_jinja_if');connect(b,'TEST',expr(node.test));connect(b,'YES',body(node.yes));return connect(b,'NO',body(node.no));
        case 'for':b=make('ugso_jinja_for',{NAME:node.variable});connect(b,'ITEMS',expr(node.items));connect(b,'BODY',body(node.body));return connect(b,'EMPTY',body(node.otherwise));
      }
    });
    return blocks.reduceRight((next,block)=>next?connect(connect(make('ugso_jinja_join'),'FIRST',block),'NEXT',next):block,null);
  }
  try{
    const root=make(condition?'ugso_jinja_composed_condition':'ugso_jinja_composed_value');connect(root,'BODY',body(ast));const before=JSON.stringify(root.saveExtraState());root.jinjaGenerated_=generateTemplate(ast);root.jinjaOriginal_=source;Blockly.Events.fire(new Blockly.Events.BlockChange(root,'mutation',null,before,JSON.stringify(root.saveExtraState())));return finish(root);
  }catch(e){for(const block of created)if(!block.isDisposed())block.dispose(false);throw e;}
}
