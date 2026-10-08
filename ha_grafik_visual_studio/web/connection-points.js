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
