// A deliberately bounded Jinja subset. Unsupported syntax remains original text.
export const filterNames = ['float','int','round','default','abs','lower','upper','trim','length','string','list','join','replace'];
function tokenize(source) {
  const result=[];let pos=0;
  while(pos<source.length){
    if(/\s/.test(source[pos])){pos++;continue;}
    const start=pos,c=source[pos];
    if(c==='"'||c==="'"){
      pos++;let escaped=false,closed=false;
      while(pos<source.length){const ch=source[pos++];if(escaped){escaped=false;continue;}if(ch==='\\'){escaped=true;continue;}if(ch===c){closed=true;break;}}
      if(!closed)throw Error('Jinja: Zeichenfolge nicht geschlossen.');result.push({kind:'string',value:source.slice(start,pos)});if(result.length>300)throw Error('Jinja: Zu viele Ausdrucksteile.');continue;
    }
    const match=/^(?:\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[A-Za-z_]\w*|==|!=|<=|>=|\/\/|\*\*|[()+\-*/%~<>|,])/.exec(source.slice(pos));
    if(!match)throw Error('Jinja: Ausdruck außerhalb des unterstützten Umfangs.');pos+=match[0].length;result.push({kind:/^\d/.test(match[0])?'number':'token',value:match[0]});
    if(result.length>300)throw Error('Jinja: Zu viele Ausdrucksteile.');
  }
  result.push({kind:'end',value:''});return result;
}
export function parseExpression(source) {
  const tokens=tokenize(source);let pos=0;
  const peek=()=>tokens[pos].value,take=()=>tokens[pos++],expect=value=>{if(take().value!==value)throw Error(`Jinja: ${value} erwartet.`);};
  const priorities={or:1,and:2,'==':3,'!=':3,'<':3,'>':3,'<=':3,'>=':3,'+':5,'-':5,'~':6,'*':7,'/':7,'//':7,'%':7};
  function parse(min=0,depth=0,allowFilters=true){
    if(depth>10)throw Error('Jinja: Ausdruck zu tief verschachtelt.');
    const token=take();let left;
    if(token.value==='('){left=parse(0,depth+1);expect(')');}
    else if(['not','+','-'].includes(token.value))left={kind:'unary',op:token.value,value:parse(token.value==='not'?3:8,depth+1,token.value==='not')};
    else if(token.kind==='number'){if(!Number.isFinite(Number(token.value)))throw Error('Jinja: Ungültige Zahl.');left={kind:'literal',raw:token.value};}
    else if(token.kind==='string'||['true','false','none','True','False','None'].includes(token.value))left={kind:'literal',raw:token.value};
    else if(/^[A-Za-z_]\w*$/.test(token.value)){
      if(peek()==='('){
        take();const args=[];if(peek()!==')'){do{args.push(parse(0,depth+1));if(peek()!==',')break;take();}while(true);}expect(')');
        if(!['states','state_attr','is_state','is_state_attr','now'].includes(token.value))throw Error('Jinja: Unbekannte Funktion.');
        const counts={states:1,state_attr:2,is_state:2,is_state_attr:3,now:0};if(args.length!==counts[token.value])throw Error('Jinja: Funktionsargumente passen nicht.');
        if(token.value==='now')left={kind:'now'};
        else {
          const raw=args[0].raw;if(!raw||!/^(['"])[a-z][a-z0-9_]*\.[a-z0-9_]+\1$/.test(raw))throw Error('Jinja: Feste Entität erwartet.');
          left={kind:'entity',fn:token.value,entity:raw.slice(1,-1),args:args.slice(1)};
        }
      }else{if(['if','else','and','or','in','is','not'].includes(token.value))throw Error('Jinja: Ausdruck fehlt.');left={kind:'variable',name:token.value};}
    }else throw Error('Jinja: Ausdruck fehlt.');
    while(true){
      if(allowFilters&&peek()==='|'&&8>=min){take();const name=take().value;if(!filterNames.includes(name))throw Error('Jinja: Unbekannter Filter.');const args=[];if(peek()==='('){take();if(peek()!==')'){do{args.push(parse(0,depth+1));if(peek()!==',')break;take();}while(true);}expect(')');}if(args.length>3)throw Error('Jinja: Höchstens drei Filterargumente.');left={kind:'filter',name,args,value:left};continue;}
      const op=peek(),priority=priorities[op];if(priority===undefined||priority<min)break;take();const right=parse(priority+1,depth+1);
      // Chained comparisons need their own semantics; retain their original.
      if(priority===3&&left.kind==='binary'&&priorities[left.op]===3)throw Error('Jinja: Vergleichskette bleibt Original.');
      left={kind:'binary',op,left,right};
    }
    if(min===0&&peek()==='if'){take();const test=parse(1,depth+1);expect('else');left={kind:'conditional',test,yes:left,no:parse(0,depth+1)};}
    return left;
  }
  const result=parse();if(tokens[pos].kind!=='end')throw Error('Jinja: Nicht unterstützter Ausdrucksteil.');return result;
}
export function generateExpression(node,depth=0){
  if(depth>15)throw Error('Jinja: Ausdruck zu tief.');const g=x=>generateExpression(x,depth+1);
  switch(node.kind){
    case 'literal':return node.raw;
    case 'variable':return node.name;
    case 'now':return 'now()';
    case 'entity':return `${node.fn}(${[JSON.stringify(node.entity),...node.args.map(g)].join(', ')})`;
    case 'filter':return `(${g(node.value)} | ${node.name}${node.args.length?'('+node.args.map(g).join(', ')+')':''})`;
    case 'unary':return `(${node.op} ${g(node.value)})`;
    case 'binary':return `(${g(node.left)} ${node.op} ${g(node.right)})`;
    case 'conditional':return `(${g(node.yes)} if ${g(node.test)} else ${g(node.no)})`;
    default:throw Error('Jinja: Unbekannter Ausdruck.');
  }
}
export function parseTemplate(source){
  if(typeof source!=='string'||source.length>10000)throw Error('Jinja: Höchstens 10000 Zeichen.');
  // Preserve whitespace-control, comments, raw, assignments and unsupported tags.
  if(/\{[{%][-+]|[-+][}%]\}|\{#/.test(source))throw Error('Jinja: Original mit Steuerzeichen/Kommentaren erhalten.');
  const tokens=[];let pos=0;
  while(pos<source.length){
    const relative=source.slice(pos).search(/\{[{%]/);if(relative<0){tokens.push({kind:'text',text:source.slice(pos)});break;}
    const start=pos+relative;if(start>pos)tokens.push({kind:'text',text:source.slice(pos,start)});
    const opener=source.slice(start,start+2),endMark=opener==='{{'?'}}':'%}';let quote='',escaped=false,end=-1;
    for(let i=start+2;i<source.length-1;i++){const c=source[i];if(escaped){escaped=false;continue;}if(quote){if(c==='\\')escaped=true;else if(c===quote)quote='';continue;}if(c==='"'||c==="'"){quote=c;continue;}if(source.slice(i,i+2)===endMark){end=i;break;}}
    if(end<0)throw Error('Jinja: Nicht geschlossen.');tokens.push({kind:opener==='{{'?'output':'tag',text:source.slice(start+2,end).trim()});pos=end+2;
    if(tokens.length>100)throw Error('Jinja: Höchstens 100 Template-Teile.');
  }
  let index=0;
  function sequence(stops=[],depth=0){
    if(depth>8)throw Error('Jinja: Template zu tief.');const nodes=[];
    while(index<tokens.length){const t=tokens[index],name=t.text.split(/\s/)[0];if(t.kind==='tag'&&stops.includes(name))break;index++;
      if(t.kind==='text')nodes.push({kind:'text',text:t.text});
      else if(t.kind==='output')nodes.push({kind:'output',value:parseExpression(t.text)});
      else if(name==='if'){
        const test=parseExpression(t.text.slice(2).trim()),yes=sequence(['else','endif'],depth+1);let no=[];
        if(tokens[index]?.text==='else'){index++;no=sequence(['endif'],depth+1);}
        if(tokens[index++]?.text!=='endif')throw Error('Jinja: endif erwartet.');nodes.push({kind:'if',test,yes,no});
      }else if(name==='for'){
        const match=/^for\s+([A-Za-z_]\w*)\s+in\s+([\s\S]+)$/.exec(t.text);if(!match)throw Error('Jinja: Einfache for-Schleife erwartet.');
        if(parseExpression(match[1]).kind!=='variable')throw Error('Jinja: Schleifenvariable ungültig.');
        const items=parseExpression(match[2]),body=sequence(['else','endfor'],depth+1);let otherwise=[];
        if(tokens[index]?.text==='else'){index++;otherwise=sequence(['endfor'],depth+1);}
        if(tokens[index++]?.text!=='endfor')throw Error('Jinja: endfor erwartet.');nodes.push({kind:'for',variable:match[1],items,body,otherwise});
      }else throw Error('Jinja: Nicht unterstützte Anweisung.');
    }return nodes;
  }
  const body=sequence();if(tokens.length>100)throw Error('Jinja: Höchstens 100 Template-Teile.');if(!tokens.some(t=>t.kind!=='text'))throw Error('Jinja: Template erwartet.');if(generateTemplate(body).length>10000)throw Error('Jinja: Zerlegte Struktur zu groß; Original erhalten.');return body;
}
export function generateTemplate(body,depth=0){
  if(depth>10)throw Error('Jinja: Template zu tief.');return body.map(node=>{
    switch(node.kind){
      case 'text':return node.text;
      case 'output':return `{{ ${generateExpression(node.value)} }}`;
      case 'if':return `{% if ${generateExpression(node.test)} %}${generateTemplate(node.yes,depth+1)}{% else %}${generateTemplate(node.no,depth+1)}{% endif %}`;
      case 'for':return `{% for ${node.variable} in ${generateExpression(node.items)} %}${generateTemplate(node.body,depth+1)}{% else %}${generateTemplate(node.otherwise,depth+1)}{% endfor %}`;
      default:throw Error('Jinja: Unbekannter Template-Teil.');
    }
  }).join('');
}
