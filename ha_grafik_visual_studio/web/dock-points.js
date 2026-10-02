export function dockPointKey(anchorId) {
  return `dock_${anchorId.replaceAll("-", "_")}`;
}

export function initializeDockPoints(widget, anchorIds) {
  const legacyEnabled = widget.dockPointsEnabled === true;
  for (const anchorId of anchorIds) widget[dockPointKey(anchorId)] ??= legacyEnabled;
}

export function setAllDockPoints(widget, anchorIds, enabled) {
  for (const anchorId of anchorIds) widget[dockPointKey(anchorId)] = enabled;
}

export function dockPointSelection(widget, anchorIds) {
  const active = anchorIds.filter(anchorId => widget[dockPointKey(anchorId)] === true).length;
  return active === 0 ? "none" : active === anchorIds.length ? "all" : "some";
}
