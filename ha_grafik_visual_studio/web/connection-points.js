export function connectionPointActive(point, side = "start") {
  return !!point && (point.valueOutputEnabled === true ? side === "start" : point.collectorEnabled === true);
}

export function referencedConnectionPoint(reference, widgets) {
  const [id, pointId] = String(reference || "").split(":");
  return widgets.find(widget => widget.id === id && widget.type === "svg-connection" && widget.visible !== false)
    ?.connectionPoints?.find(point => point.id === pointId);
}

export function isValuePointConnection(line, widgets) {
  return line.type === "svg-connection" && referencedConnectionPoint(line.startCollector, widgets)?.valueOutputEnabled === true;
}

export function nearestPointOnPath(path, position) {
  const length=path.getTotalLength();
  if(!length)return path.getPointAtLength(0);
  const count=Math.max(32,Math.min(2048,Math.ceil(length/8))),step=length/count;
  const distance=at=>{const p=path.getPointAtLength(at);return (p.x-position.x)**2+(p.y-position.y)**2;};
  let best=0,bestDistance=distance(0);
  for(let index=1;index<=count;index++) {
    const at=index*step,d=distance(at);
    if(d<bestDistance){best=at;bestDistance=d;}
  }
  let left=Math.max(0,best-step),right=Math.min(length,best+step);
  for(let index=0;index<24;index++) {
    const a=left+(right-left)/3,b=right-(right-left)/3;
    if(distance(a)<distance(b))right=b;else left=a;
  }
  const middle=(left+right)/2;
  return path.getPointAtLength(distance(middle)<bestDistance?middle:best);
}
