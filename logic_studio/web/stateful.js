export const statefulTypes=new Set('RS SR R_TRIG F_TRIG TON TOF TP BLINK CTU CTD CTUD'.split(' '));
export const timedTypes=new Set('TON TOF TP BLINK'.split(' '));

// One deterministic scan. Milliseconds since Unix epoch; the host schedules scans.
export function statefulStep(type,a,previous={},now=Date.now(),boot=false){
 if(!statefulTypes.has(type)||!Number.isFinite(now)||now<0)throw Error('Ungültiger Laufzeitaufruf.');
 if(previous===null||typeof previous!=='object'||Array.isArray(previous))throw Error('Beschädigter Bausteinspeicher.');
 if(Object.keys(previous).length&&(previous.version!==1||previous.kind!==type))throw Error('Bausteinspeicher passt nicht zum Typ.');
 const fresh=!Object.keys(previous).length,s={...previous,version:1,kind:type},out={};
 for(const key of ['q','p','u','d'])if(s[key]!==undefined&&typeof s[key]!=='boolean')throw Error('Ungültiger Merker.');
 for(const key of ['t','cv'])if(s[key]!==undefined&&(!Number.isFinite(s[key])||s[key]<0))throw Error('Ungültiger Speicherwert.');
 const rising=(value,key)=>!fresh&&!boot&&value&&!Boolean(s[key]);
 if(type==='RS'||type==='SR'){s.q=type==='RS'?!a.R1&&(a.S||Boolean(s.q)):a.S1||(!a.R&&Boolean(s.q));out.Q1=s.q;}
 if(type==='R_TRIG'||type==='F_TRIG'){out.Q=!fresh&&!boot&&(type==='R_TRIG'?a.CLK&&!s.p:!a.CLK&&s.p);s.p=a.CLK;}
 if(timedTypes.has(type)){
  for(const key of type==='BLINK'?['TH','TL']:['PT'])if(!Number.isFinite(a[key])||a[key]<(type==='BLINK'?1:0))throw Error('Ungültige Zeit (Millisekunden).');
  // A clock correction backwards restarts the elapsed interval.
  if(s.t!==undefined&&s.t>now)s.t=now;
  if(type==='TON'){if(!a.IN){delete s.t;s.q=false;}else{if(s.t===undefined)s.t=now;s.q=now-s.t>=a.PT;}out.Q=Boolean(s.q);out.ET=s.t===undefined?0:Math.min(a.PT,now-s.t);}
  if(type==='TOF'){if(a.IN){s.q=true;delete s.t;}else if(s.q){if(s.t===undefined)s.t=now;if(now-s.t>=a.PT)s.q=false;}out.Q=Boolean(s.q);out.ET=s.t===undefined?0:Math.min(a.PT,now-s.t);}
  if(type==='TP'){if(rising(a.IN,'p')&&!(s.q&&s.t!==undefined&&now-s.t<a.PT)){s.t=now;s.q=true;}s.q=Boolean(s.q)&&s.t!==undefined&&now-s.t<a.PT;out.Q=s.q;out.ET=s.t===undefined?0:Math.min(a.PT,now-s.t);s.p=a.IN;}
  if(type==='BLINK'){if(!a.EN){delete s.t;s.q=false;}else{if(s.t===undefined)s.t=now;s.q=(now-s.t)%(a.TH+a.TL)<a.TH;}out.Q=Boolean(s.q);}
 }
 if(['CTU','CTD','CTUD'].includes(type)){
  if(!Number.isInteger(a.PV)||a.PV<0||a.PV>2147483647)throw Error('Zählervorgabe: 0 bis 2147483647.');
  let cv=s.cv??0;const up=rising(a.CU,'u'),down=rising(a.CD,'d');
  if(a.R)cv=0;else if(a.LD)cv=a.PV;else cv=Math.max(0,Math.min(2147483647,cv+(up?1:0)-(down?1:0)));
  s.cv=cv;if(a.CU!==undefined)s.u=a.CU;if(a.CD!==undefined)s.d=a.CD;
  if(type==='CTUD'){out.QU=cv>=a.PV;out.QD=cv<=0;}else out.Q=type==='CTU'?cv>=a.PV:cv<=0;
  out.CV=cv;
 }
 if(JSON.stringify(s).length>255)throw Error('Bausteinspeicher überschreitet 255 Zeichen.');
 return {state:s,outputs:out};
}

// Each HA helper holds one small, versioned JSON state. No initial value: HA restores it.
export function memoryId(plan,block,objectId){return block.params.memory||`input_text.ls_${objectId}_${block.id}`;}

// Equivalent Jinja scan; generated native HA YAML is independent of the app.
export function statefulTemplate(type,args,old,now='logic_now',boot='logic_boot'){
 const a=key=>args[key]??'false',lines=[`{% set s = namespace(q=${old}.get('q',false), p=${old}.get('p',false), u=${old}.get('u',false), d=${old}.get('d',false), t=${old}.get('t',none), cv=${old}.get('cv',0)) %}`,`{% set fresh = not ${old} %}`,`{% if s.t is not none and s.t > ${now} %}{% set s.t = ${now} %}{% endif %}`];
 let outputs;
 if(type==='RS'||type==='SR'){lines.push(`{% set s.q = ${type==='RS'?`not ${a('R1')} and (${a('S')} or s.q)`:`${a('S1')} or (not ${a('R')} and s.q)`} %}`);outputs="{'Q1':s.q}";}
 if(type==='R_TRIG'||type==='F_TRIG'){lines.push(`{% set q = not fresh and not ${boot} and (${type==='R_TRIG'?`${a('CLK')} and not s.p`:`not ${a('CLK')} and s.p`}) %}`,`{% set s.p = ${a('CLK')} %}`);outputs="{'Q':q}";}
 if(type==='TON'){lines.push(`{% if not ${a('IN')} %}{% set s.t = none %}{% set s.q = false %}{% else %}{% if s.t is none %}{% set s.t = ${now} %}{% endif %}{% set s.q = ${now} - s.t >= ${a('PT')} %}{% endif %}`);outputs=`{'Q':s.q,'ET':0 if s.t is none else ([${a('PT')},${now}-s.t]|min)}`;}
 if(type==='TOF'){lines.push(`{% if ${a('IN')} %}{% set s.q = true %}{% set s.t = none %}{% elif s.q %}{% if s.t is none %}{% set s.t = ${now} %}{% endif %}{% if ${now}-s.t >= ${a('PT')} %}{% set s.q = false %}{% endif %}{% endif %}`);outputs=`{'Q':s.q,'ET':0 if s.t is none else ([${a('PT')},${now}-s.t]|min)}`;}
 if(type==='TP'){lines.push(`{% if not fresh and not ${boot} and ${a('IN')} and not s.p and not (s.q and s.t is not none and ${now}-s.t < ${a('PT')}) %}{% set s.t = ${now} %}{% set s.q = true %}{% endif %}`,`{% set s.q = s.q and s.t is not none and ${now}-s.t < ${a('PT')} %}`,`{% set s.p = ${a('IN')} %}`);outputs=`{'Q':s.q,'ET':0 if s.t is none else ([${a('PT')},${now}-s.t]|min)}`;}
 if(type==='BLINK'){lines.push(`{% if not ${a('EN')} %}{% set s.t = none %}{% set s.q = false %}{% else %}{% if s.t is none %}{% set s.t = ${now} %}{% endif %}{% set s.q = (${now}-s.t) % (${a('TH')}+${a('TL')}) < ${a('TH')} %}{% endif %}`);outputs="{'Q':s.q}";}
 if(['CTU','CTD','CTUD'].includes(type)){
  lines.push(`{% set up = not fresh and not ${boot} and ${a('CU')} and not s.u %}`,`{% set down = not fresh and not ${boot} and ${a('CD')} and not s.d %}`,`{% if ${a('R')} %}{% set s.cv = 0 %}{% elif ${a('LD')} %}{% set s.cv = ${a('PV')} %}{% else %}{% set s.cv = [0,([2147483647,s.cv+(up|int)-(down|int)]|min)]|max %}{% endif %}`);
  if(args.CU!==undefined)lines.push(`{% set s.u = ${a('CU')} %}`);if(args.CD!==undefined)lines.push(`{% set s.d = ${a('CD')} %}`);
  outputs=type==='CTUD'?`{'QU':s.cv>=${a('PV')},'QD':s.cv<=0,'CV':s.cv}`:`{'Q':${type==='CTU'?`s.cv>=${a('PV')}`:'s.cv<=0'},'CV':s.cv}`;
 }
 const state=`dict(version=1,kind=${JSON.stringify(type)},q=s.q,p=s.p,u=s.u,d=s.d,cv=s.cv,**({'t':s.t} if s.t is not none else {}))`;
 return lines.join('\n')+`\n{{ {'state':${state},'outputs':${outputs}} }}`;
}
