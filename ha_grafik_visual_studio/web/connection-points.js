export function setFreeConnectionOrientation(widget, vertical, width, height) {
  if (widget.startWidgetId || widget.endWidgetId || widget.startCollector || widget.endCollector) return false;
  const x = Number(widget.startX) || 0, y = Number(widget.startY) || 0;
  const dx = (Number(widget.endX) || 0) - x, dy = (Number(widget.endY) || 0) - y;
  const length = Math.hypot(dx, dy) || 260;
  const target = Math.max(0, Math.min(length, vertical ? height - 40 - y : width - 40 - x));
  const angle = (vertical ? Math.PI / 2 : 0) - Math.atan2(dy, dx);
  const cos = Math.cos(angle), sin = Math.sin(angle), scale = target / length;
  for (const point of widget.connectionPoints || []) {
    const px = Number(point.x) - x, py = Number(point.y) - y;
    point.x = x + (px * cos - py * sin) * scale;
    point.y = y + (px * sin + py * cos) * scale;
  }
  widget.endX = x + (vertical ? 0 : target);
  widget.endY = y + (vertical ? target : 0);
  return true;
}

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
