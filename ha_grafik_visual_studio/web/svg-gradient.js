// Parse CSS linear gradients without evaluating CSS/HTML or splitting color functions.
export function linearGradient(value) {
  const match = String(value || "").trim().match(/^linear-gradient\((.*)\)$/s);
  if (!match || match[1].length > 2048) return null;
  const parts = []; let depth = 0, start = 0;
  for (let i=0;i<match[1].length;i++) {
    if (match[1][i] === '(') depth++;
    if (match[1][i] === ')') depth--;
    if (depth < 0) return null;
    if (match[1][i] === ',' && depth === 0) {parts.push(match[1].slice(start,i).trim()); start=i+1;}
  }
  if (depth) return null;
  parts.push(match[1].slice(start).trim());
  let angle=180;
  const directions={'to top':0,'to right':90,'to bottom':180,'to left':270,'to top right':45,'to bottom right':135,'to bottom left':225,'to top left':315};
  if (/^-?\d+(?:\.\d+)?deg$/i.test(parts[0])) angle=parseFloat(parts.shift());
  else if (Object.hasOwn(directions,parts[0])) angle=directions[parts.shift()];
  const stops=parts.map(part=>{
    const stop=part.match(/^(.*?)\s+(-?\d+(?:\.\d+)?)%$/);
    return {color:stop?stop[1]:part,position:stop?Math.max(0,Math.min(1,Number(stop[2])/100)):null};
  });
  if (stops.length<2 || stops.length>32 || stops.some(s=>!s.color || /[;<>]|url\s*\(|var\s*\(/i.test(s.color))) return null;
  stops[0].position ??= 0; stops.at(-1).position ??= 1;
  let last=0;
  for(let i=1;i<stops.length;i++) if(stops[i].position!==null) {
    stops[i].position=Math.max(stops[last].position,stops[i].position);
    for(let j=last+1;j<i;j++) stops[j].position=stops[last].position+(stops[i].position-stops[last].position)*(j-last)/(i-last);
    last=i;
  }
  return {angle,stops};
}
let serial=0;
export function svgPaint(svg, value, fallback) {
  const gradient=linearGradient(value);
  if(!gradient) return String(value||'').startsWith('linear-gradient')?fallback:value||fallback;
  const doc=svg.ownerDocument, ns='http://www.w3.org/2000/svg';
  const node=doc.createElementNS(ns,'linearGradient'),id=`studio-gradient-${++serial}`;
  node.setAttribute('id',id);
  const angle=gradient.angle*Math.PI/180, x=Math.sin(angle)*.5,y=-Math.cos(angle)*.5;
  for(const [key,num] of Object.entries({x1:.5-x,y1:.5-y,x2:.5+x,y2:.5+y}))node.setAttribute(key,`${num*100}%`);
  for(const item of gradient.stops){const stop=doc.createElementNS(ns,'stop');stop.setAttribute('offset',`${item.position*100}%`);stop.setAttribute('stop-color',item.color);node.append(stop);}
  const defs=doc.createElementNS(ns,'defs');defs.append(node);svg.prepend(defs);
  return `url(#${id})`;
}
