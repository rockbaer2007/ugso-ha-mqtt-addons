// Independent HA adaptation. Reference and MIT attribution: packages/energy/UPSTREAM.txt.
export const isEnergy = widget => widget.type?.startsWith('ugso.energy/');
export const energyBindings = widget => [...new Set(Object.entries(widget).filter(([key,value]) => /EntityId$/.test(key) && typeof value === 'string' && value).map(([,value]) => value))];
export const energyNumber = value => (typeof value === 'number' || typeof value === 'string' && value.trim()) && Number.isFinite(Number(value)) ? Number(value) : null;
const n = (value,fallback) => energyNumber(value) ?? fallback;
export function energyValue(widget, states, prefix) {
  const value=energyNumber(states[widget[prefix+'EntityId']]?.state);
  return value == null ? null : energyNumber(value*n(widget[prefix+'Factor'],1));
}
export function energyBalance(widget,states) {
  const production=energyValue(widget,states,'production'),net=energyValue(widget,states,'grid'),separate=energyValue(widget,states,'export');
  const imported=net==null?null:Math.max(0,net),exported=widget.exportEntityId?separate:net==null?null:Math.max(0,-net);
  const house=widget.houseEntityId?energyValue(widget,states,'house'):production==null||imported==null||exported==null?null:Math.max(0,production+imported-exported);
  const used=production==null||exported==null?null:Math.max(0,production-exported);
  const clamp=value=>Math.min(100,Math.max(0,value));
  return {production,imported,exported,house,used,autarky:house>0&&imported!=null?clamp((house-imported)/house*100):null,selfUse:production>0&&used!=null?clamp(used/production*100):null};
}
export function energyBattery(widget,states) {
  const raw=energyValue(widget,states,'soc'),soc=raw==null?null:Math.min(100,Math.max(0,raw)),power=energyValue(widget,states,'power');
  const capacity=Math.max(0,n(widget.capacity,0));
  const stored=widget.energyEntityId?energyValue(widget,states,'energy'):soc==null?null:capacity*soc/100;
  const charging=power==null?null:(widget.chargingPositive!==false?power>0:power<0);
  const kw=power==null?null:Math.abs(power)/(widget.powerUnit==='kW'?1:1000);
  const remaining=stored==null||!kw||capacity<=0?null:Math.max(0,charging?capacity-stored:stored)/kw;
  return {soc,power,stored,charging,remaining};
}
export function energyPeriod(period='day', date='', now=new Date()) {
  let start=/^\d{4}-\d{2}-\d{2}$/.test(date)?new Date(date+'T00:00:00'):new Date(now);
  if (!Number.isFinite(start.getTime())) start=new Date(now);
  start.setHours(0,0,0,0);
  if(period==='week')start.setDate(start.getDate()-(start.getDay()+6)%7);
  if(period==='month')start.setDate(1);
  if(period==='year')start.setMonth(0,1);
  const end=new Date(start);
  if(period==='year')end.setFullYear(end.getFullYear()+1);
  else if(period==='month')end.setMonth(end.getMonth()+1);
  else end.setDate(end.getDate()+(period==='week'?7:1));
  const edges=[new Date(start)];
  while(edges.at(-1)<end && edges.length<40){const edge=new Date(edges.at(-1));if(period==='day')edge.setTime(edge.getTime()+3600000);else if(period==='year')edge.setMonth(edge.getMonth()+1);else edge.setDate(edge.getDate()+1);edges.push(edge>end?new Date(end):edge);}
  return {period,start,end,edges};
}
export function energyBuckets(points,range,mode='counter',factor=1,coverageEnd=+range.end) {
  const rows=Array.isArray(points)?points.filter(p=>Number.isFinite(p.x)&&p.x<=+range.end).slice().sort((a,b)=>a.x-b.x):[];
  return range.edges.slice(0,-1).map((edge,index)=>{
    const end=Math.min(+range.edges[index+1],coverageEnd);let value=null;
    if(+edge>=coverageEnd)return {x:+edge,y:null};
    if(mode==='sum') {const inside=rows.filter(p=>p.x>=+edge&&p.x<end);if(inside.length&&inside.every(p=>energyNumber(p.y)!=null))value=inside.reduce((sum,p)=>sum+p.y,0);}
    else {
      const before=rows.filter(p=>p.x<=+edge).at(-1),inside=rows.filter(p=>p.x>+edge&&p.x<=end),last=inside.at(-1)||before;
      // Recorder states are held until the next transition. Unknown gaps/resets invalidate the bucket.
      if(before&&last&&energyNumber(before.y)!=null&&inside.every(p=>energyNumber(p.y)!=null)){
        const sequence=[before,...inside];if(sequence.every((p,i)=>!i||p.y>=sequence[i-1].y))value=last.y-before.y;
      }
    }
    return {x:+edge,y:value==null?null:value*factor};
  });
}
export function energyPrices(source,widget={},now=new Date()) {
  try{if(typeof source==='string')source=JSON.parse(source);}catch{return [];}
  if(source&&!Array.isArray(source))source=['prices','today','data','values','result'].map(key=>source[key]).find(Array.isArray);
  if(!Array.isArray(source)||source.length>2000)return [];
  const midnight=new Date(now);midnight.setHours(0,0,0,0);
  const choose=(row,key,keys)=>key?row[key]:keys.map(k=>row[k]).find(v=>v!==undefined&&v!==null);
  return source.map((row,i)=>{
    const price=typeof row==='number'?row:row&&typeof row==='object'?choose(row,widget.priceKey,['total','marketprice','price','value','y']):null;
    const stamp=typeof row==='number'?+midnight+i*3600000:row&&typeof row==='object'?choose(row,widget.timeKey,['startsAt','start_timestamp','start','date','x']):null;
    const numeric=energyNumber(stamp),x=stamp==null?NaN:numeric!=null?(numeric<1e11?numeric*1000:numeric):Date.parse(stamp),y=energyNumber(price);
    return {x,y:y==null?null:energyNumber(y*n(widget.priceFactor,100))};
  }).filter(p=>Number.isFinite(p.x)&&p.y!=null&&(!widget.futureOnly||p.x+3600000>+now)).sort((a,b)=>a.x-b.x).slice(0,Math.max(0,n(widget.hours,0))||2000);
}
export function energyCosts(consumption,exported,widget,days=1) {
  if(consumption==null||widget.exportEntityId&&exported==null)return null;
  return energyNumber(consumption*n(widget.price,0)+Math.max(0,days)*n(widget.baseFee,0)-(exported??0)*n(widget.feedPrice,0));
}

const periods=new Map(),historyCache=new Map();
export function clearEnergyCache(){periods.clear();historyCache.clear();}
function rangeFor(widget,widgets){const selector=widgets.find(w=>w.id===widget.intervalWidgetId&&w.energyKind==='interval');const source=selector||widget;const choice=periods.get(source.id)||source;return energyPeriod(choice.period,choice.startDate);}
function requestHistory(widget,range,ids,ctx){
  if(!ids.length)return {error:ctx.locale==='en'?'Select history entities':'Verlauf-Entitäten auswählen'};
  const end=Math.min(+range.end,Date.now()),key=JSON.stringify([ids,+range.start,end>=+range.end?end:Math.floor(end/60000)*60000]);
  const found=historyCache.get(key);if(found)return found;
  const entry={pending:true};historyCache.set(key,entry);
  while(historyCache.size>32)historyCache.delete(historyCache.keys().next().value);
  ctx.history({entity_ids:ids,start:range.start.toISOString(),end:new Date(Math.max(+range.start+1,end)).toISOString()}).then(data=>{entry.data=data;entry.pending=false;ctx.refresh();}).catch(error=>{entry.error=error.message||(ctx.locale==='en'?'Recorder history unavailable':'Recorder-Verlauf nicht verfügbar');entry.pending=false;ctx.refresh();});
  return entry;
}
export function renderEnergy(widget,doc,ctx={}) {
  const {states={},locale='de',widgets=[],runtime=false}=ctx,english=locale.startsWith('en'),kind=widget.energyKind;
  const root=doc.createElement('div');root.className='energy-widget';root.dataset.energyKind=kind;
  Object.assign(root.style,{background:widget.noCard?'transparent':widget.backgroundColor||'#17242d',color:widget.textColor||'#e7edf2',borderRadius:widget.noCard?'0':'12px',padding:widget.noCard?'4px':'12px'});
  const words=(de,en)=>english?en:de;
  const fmt=(value,unit='')=>value==null?'—':new Intl.NumberFormat(locale,{maximumFractionDigits:Math.min(5,Math.max(0,n(widget.decimals,1)))}).format(value)+(unit?' '+unit:'');
  const line=(label,value)=>{const row=doc.createElement('div');row.className='energy-value-row';const name=doc.createElement('span'),number=doc.createElement('strong');name.textContent=label;number.textContent=value;row.append(name,number);root.append(row);return row;};
  if(widget.heading&&!widget.noCard){const heading=doc.createElement('strong');heading.className='energy-heading';heading.textContent=widget.heading;root.append(heading);}
  const range=rangeFor(widget,widgets);
  if(kind==='interval'){
    const controls=doc.createElement('div');controls.className='energy-period-controls';
    const choice={period:widget.period||'day',startDate:widget.startDate||'',...periods.get(widget.id)};
    const period=doc.createElement('select');period.setAttribute('aria-label',words('Zeitraum','Period'));
    for(const [value,de,en]of[['day','Tag','Day'],['week','Woche','Week'],['month','Monat','Month'],['year','Jahr','Year']]){const option=doc.createElement('option');option.value=value;option.textContent=words(de,en);period.append(option);}period.value=choice.period;
    const date=doc.createElement('input');date.type='date';date.setAttribute('aria-label',words('Datum','Date'));date.value=choice.startDate||localDate(new Date());
    const change=()=>{if(!runtime)return;periods.set(widget.id,{period:period.value,startDate:date.value});ctx.refresh();};period.onchange=date.onchange=change;
    for(const [label,delta]of[[words('Zurück','Previous'),-1],[words('Heute','Today'),0],[words('Weiter','Next'),1]]){const button=doc.createElement('button');button.type='button';button.textContent=label;button.disabled=!runtime;button.onclick=event=>{event.stopPropagation();const r=energyPeriod(period.value,date.value);const d=new Date(r.start);if(!delta)d.setTime(Date.now());else if(period.value==='year')d.setFullYear(d.getFullYear()+delta);else if(period.value==='month')d.setMonth(d.getMonth()+delta);else d.setDate(d.getDate()+delta*(period.value==='week'?7:1));date.value=localDate(d);change();};controls.append(button);}
    period.disabled=date.disabled=!runtime;controls.prepend(period,date);controls.addEventListener('pointerdown',event=>{if(runtime)event.stopPropagation();});root.append(controls);return root;
  }
  let svg;
  const makeSvg=(width=640,height=300)=>{svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('role','img');svg.setAttribute('aria-label',widget.heading||kind);root.append(svg);return svg;};
  const el=(tag,attrs,parent=svg)=>{const node=doc.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value]of Object.entries(attrs))node.setAttribute(key,value);parent.append(node);return node;};
  const text=(x,y,value,size=18,fill=widget.textColor||'#e7edf2',parent=svg)=>{const node=el('text',{x,y,'text-anchor':'middle','font-size':size,fill},parent);node.textContent=value;return node;};
  const ring=(x,y,value,label,color)=>{el('circle',{cx:x,cy:y,r:65,fill:'none',stroke:'#52616b','stroke-width':12});if(value!=null)el('circle',{cx:x,cy:y,r:65,fill:'none',stroke:color,'stroke-width':12,'stroke-dasharray':`${value*4.084} 408.4`,transform:`rotate(-90 ${x} ${y})`});text(x,y+8,fmt(value,'%'),27);text(x,y+100,label,18);};
  if(kind==='sufficiency'){
    const balance=energyBalance(widget,states);makeSvg(640,230);ring(170,90,balance.autarky,words('Autarkie','Self-sufficiency'),widget.accentColor);ring(470,90,balance.selfUse,words('Eigenverbrauch','Self-consumption'),'#6fd39a');
    for(const [key,de,en]of[['production','Erzeugung','Production'],['imported','Netzbezug','Import'],['exported','Einspeisung','Export'],['house','Haus','House']])line(words(de,en),fmt(balance[key],widget.unit));return root;
  }
  if(kind==='battery'){
    const b=energyBattery(widget,states);makeSvg(640,200);el('rect',{x:40,y:30,width:165,height:130,rx:12,fill:'none',stroke:'#869ba8','stroke-width':8});el('rect',{x:205,y:72,width:16,height:42,rx:4,fill:'#869ba8'});if(b.soc!=null)el('rect',{x:50,y:40,width:145*b.soc/100,height:110,rx:5,fill:widget.accentColor});text(123,105,fmt(b.soc,'%'),26);text(410,70,fmt(b.power,widget.powerUnit),30);text(410,110,b.power==null?'—':b.power===0?words('Ruhe','Idle'):b.charging?words('Laden','Charging'):words('Entladen','Discharging'),20);text(410,150,b.remaining==null?'—':fmt(b.remaining,'h'),20);line(words('Gespeicherte Energie','Stored energy'),fmt(b.stored,'kWh'));return root;
  }
  if(kind==='distribution'){
    makeSvg(640,500);const home={x:320,y:250,r:65};const count=Math.min(10,Math.max(1,Math.trunc(n(widget.nodeCount,3))));
    const net=energyValue(widget,states,'grid'),exported=energyValue(widget,states,'export');const nodes=[{name:words('Netz','Grid'),value:net==null?null:net-(exported??0),color:widget.accentColor,reverse:false,second:null},...Array.from({length:count},(_,i)=>{const p='node'+(i+1);return {name:widget[p+'Name'],value:energyValue(widget,states,p),color:widget[p+'Color'],reverse:widget[p+'Reverse'],second:energyNumber(states[widget[p+'SecondEntityId']]?.state),secondUnit:widget[p+'SecondUnit']};})];
    const total=nodes.reduce((sum,node)=>sum+(node.value==null?0:Math.abs(node.value)),0);let angle=-90;
    nodes.forEach((node,i)=>{const radians=-Math.PI/2+i*2*Math.PI/nodes.length,x=320+205*Math.cos(radians),y=250+175*Math.sin(radians),r=nodes.length>7?42:52;
      const length=Math.hypot(x-home.x,y-home.y),ux=(x-home.x)/length,uy=(y-home.y)/length,x1=x-ux*r,y1=y-uy*r,x2=home.x+ux*home.r,y2=home.y+uy*home.r;
      el('line',{x1,y1,x2,y2,stroke:node.color,'stroke-width':n(widget.lineWidth,3),opacity:node.value==null?.3:1});
      if(node.value!=null&&node.value!==0&&widget.animate!==false){const dot=el('circle',{r:4,fill:node.color});const inward=(node.value>0)!==Boolean(node.reverse);el('animateMotion',{dur:`${Math.max(1,Math.min(6,5-Math.log10(Math.abs(node.value)+1)))}s`,repeatCount:'indefinite',path:inward?`M${x1} ${y1}L${x2} ${y2}`:`M${x2} ${y2}L${x1} ${y1}`},dot);}
      el('circle',{cx:x,cy:y,r,fill:widget.backgroundColor||'#17242d',stroke:node.color,'stroke-width':3});text(x,y-13,node.name,14);text(x,y+9,fmt(node.value,widget.unit),16);if(node.second!=null)text(x,y+29,fmt(node.second,node.secondUnit),13);
      if(total&&node.value!=null){const portion=Math.abs(node.value)/total*360;el('circle',{cx:320,cy:250,r:65,fill:'none',stroke:node.color,'stroke-width':8,'stroke-dasharray':`${portion/360*408.4} 408.4`,transform:`rotate(${angle} 320 250)`});angle+=portion;}
    });el('circle',{cx:320,cy:250,r:57,fill:widget.backgroundColor||'#17242d'});text(320,240,words('Haus','House'),20);text(320,270,fmt(energyValue(widget,states,'house'),widget.unit),23);return root;
  }
  let series=[];
  if(kind==='comparison'){
    series=Array.from({length:Math.min(6,Math.max(1,n(widget.seriesCount,3)))},(_,i)=>{const p='series'+(i+1);return {name:widget[p+'Name'],unit:widget[p+'Unit'],color:widget[p+'Color'],points:[{x:i,y:energyValue(widget,states,p)}]};});
    if(widget.sort!=='none')series.sort((a,b)=>a.points[0].y==null?1:b.points[0].y==null?-1:(a.points[0].y-b.points[0].y)*(widget.sort==='descending'?-1:1));
    series.forEach((s,i)=>s.points[0].x=i);
  }else if(kind==='price'){
    const entry=states[widget.pricesEntityId],source=widget.pricesAttribute?entry?.attributes?.[widget.pricesAttribute]:entry?.state;
    const points=energyPrices(source,widget),rank=points.slice().sort((a,b)=>a.y-b.y),highlight=Math.max(1,n(widget.highlightCount,3)),now=Date.now();
    const cheap=new Set(rank.slice(0,highlight)),expensive=new Set(rank.slice(-highlight));
    for(const p of points)p.color=p.x<=now&&p.x+3600000>now?widget.currentColor:cheap.has(p)?widget.cheapColor:expensive.has(p)?widget.expensiveColor:widget.accentColor;
    series=[{name:words('Preis','Price'),unit:widget.unit,color:widget.accentColor,points}];const current=points.find(p=>p.x<=now&&p.x+3600000>now);line(words('Aktueller Preis','Current price'),fmt(current?.y??null,widget.unit));
  }else if(kind==='consumption'||kind==='costs'){
    const prefixes=kind==='costs'?['consumption',...(widget.exportEntityId?['export']:[])]:Array.from({length:Math.min(6,Math.max(1,n(widget.seriesCount,3)))},(_,i)=>'series'+(i+1));
    if(kind==='consumption'||widget.costMode==='history'){
      const ids=[...new Set(prefixes.map(p=>widget[p+'EntityId']).filter(Boolean))];const history=requestHistory(widget,range,ids,ctx);
      if(history.pending||history.error){line(words('Verlauf','History'),history.error||words('Lädt…','Loading…'));return root;}
      for(const p of prefixes){const points=history.data?.series?.[widget[p+'EntityId']]||[];const coverageEnd=Date.parse(history.data.end);series.push({name:widget[p+'Name']||p,unit:widget[p+'Unit']||'kWh',color:widget[p+'Color']||widget.accentColor,coverageEnd,points:energyBuckets(points,range,widget.historyMode,n(widget[p+'Factor'],1),coverageEnd)});}
    }
    if(kind==='costs'){
      const total=p=>{const points=series[p]?.points.filter(point=>point.x<series[p].coverageEnd)||[];return points.length&&points.every(p=>p.y!=null)?points.reduce((sum,p)=>sum+p.y,0):null;};
      const consumption=widget.costMode==='history'?total(0):energyValue(widget,states,'consumption'),exported=widget.costMode==='history'?total(1):energyValue(widget,states,'export');
      const civil=date=>Date.UTC(date.getFullYear(),date.getMonth(),date.getDate());
      const days=(civil(range.end)-civil(range.start))/86400000,cost=energyCosts(consumption,exported,widget,days);
      line(words('Verbrauch','Consumption'),fmt(consumption,'kWh'));line(words('Einspeisung','Export'),fmt(exported,'kWh'));line(words('Grundgebühr','Base fee'),fmt(days*n(widget.baseFee,0),widget.currency));const row=line(words('Gesamtkosten','Total cost'),fmt(cost,widget.currency));row.classList.add('energy-cost-total');return root;
    }
    line(words('Zeitraum','Period'),range.start.toLocaleDateString(locale)+' – '+new Date(+range.end-1).toLocaleDateString(locale));
  }
  makeSvg();const valid=series.flatMap(s=>s.points).filter(p=>p.y!=null);
  if(!valid.length){text(320,150,words('Keine gültigen Daten','No valid data'));return root;}
  // Different units stay separate: compare only matching units on a common axis.
  if(new Set(series.filter(s=>s.points.some(p=>p.y!=null)).map(s=>s.unit)).size>1){text(320,130,words('Einheiten unterscheiden sich','Units differ'));text(320,160,words('Einheit und Multiplikatoren anpassen','Adjust units and factors'),16);for(const s of series)line(s.name,fmt(s.points[0]?.y,s.unit));return root;}
  if(widget.chartType==='pie'&&kind==='comparison'){
    const sum=valid.reduce((sum,p)=>sum+Math.max(0,p.y),0);let angle=-90;
    for(const s of series){const value=s.points[0].y;if(value==null||value<0)continue;const sweep=sum?value/sum*360:0;el('circle',{cx:320,cy:145,r:94,fill:'none',stroke:s.color,'stroke-width':65,'stroke-dasharray':`${sweep/360*590.62} 590.62`,transform:`rotate(${angle} 320 145)`});angle+=sweep;line(s.name,fmt(value,s.unit));}return root;
  }
  const xs=[...new Set(series.flatMap(s=>s.points.map(p=>p.x)))].sort((a,b)=>a-b),min=Math.min(0,...valid.map(p=>p.y)),max=Math.max(0,...valid.map(p=>p.y)),span=max-min||1;
  const px=p=>60+(xs.indexOf(p.x)+.5)/xs.length*540,py=value=>250-(value-min)/span*215;
  for(let i=0;i<=4;i++){const v=min+span*i/4;el('line',{x1:60,x2:600,y1:py(v),y2:py(v),stroke:'#63737d',opacity:.3});text(30,py(v)+4,fmt(v),12);}
  const width=Math.max(.8,Math.min(55,500/xs.length/series.length));
  series.forEach((s,index)=>{
    let run=[];const flush=()=>{if(run.length>1)el('polyline',{points:run.join(' '),fill:'none',stroke:s.color,'stroke-width':2});run=[];};
    for(const p of s.points){if(p.y==null){flush();continue;}const x=px(p),y=py(p.y);let mark;
      if(widget.chartType==='line'&&kind!=='price'){run.push(`${x},${y}`);mark=el('circle',{cx:x,cy:y,r:3,fill:s.color});}
      else mark=el('rect',{x:x-width*series.length/2+index*width,y:Math.min(y,py(0)),width:Math.max(.8,width-1),height:Math.max(1,Math.abs(py(0)-y)),fill:p.color||s.color});
      const title=el('title',{},mark);title.textContent=`${s.name}: ${fmt(p.y,s.unit)} · ${kind==='comparison'?s.name:new Date(p.x).toLocaleString(locale)}`;
    }flush();
    const legend=line(s.name,s.unit);legend.style.color=s.color;
  });
  for(let i=0;i<xs.length;i+=Math.max(1,Math.ceil(xs.length/6))){const label=kind==='comparison'?series[i]?.name:kind==='price'||range.period==='day'?new Date(xs[i]).toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'}):new Date(xs[i]).toLocaleDateString(locale,{day:'2-digit',month:'2-digit'});text(px({x:xs[i]}),278,label||'',12);}
  if(kind==='price'){const avg=valid.reduce((sum,p)=>sum+p.y,0)/valid.length;el('line',{x1:60,x2:600,y1:py(avg),y2:py(avg),stroke:widget.textColor,'stroke-dasharray':'5 4'});text(470,Math.max(18,py(avg)-6),'Ø '+fmt(avg,widget.unit),13);}
  return root;
}
function localDate(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
