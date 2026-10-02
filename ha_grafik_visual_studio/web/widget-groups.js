export function groupMembers(widgets, widget, editingGroupId = null) {
  return widget?.editorGroupId && widget.editorGroupId !== editingGroupId
    ? widgets.filter(item => item.editorGroupId === widget.editorGroupId) : widget ? [widget] : [];
}

export function groupBounds(widgets) {
  if (!widgets.length) return null;
  const x = Math.min(...widgets.map(widget => Number(widget.x) || 0));
  const y = Math.min(...widgets.map(widget => Number(widget.y) || 0));
  return { x, y, width: Math.max(...widgets.map(widget => (Number(widget.x) || 0) + (Number(widget.width) || 140))) - x,
    height: Math.max(...widgets.map(widget => (Number(widget.y) || 0) + (Number(widget.height) || 62))) - y };
}

export function translateGroup(origins, dx, dy) {
  dx = Math.max(dx, -Math.min(...origins.map(item => item.x)));
  dy = Math.max(dy, -Math.min(...origins.map(item => item.y)));
  return origins.map(item => ({ id: item.id, x: Math.round(item.x + dx), y: Math.round(item.y + dy) }));
}

export function remapGroups(sources, idMap, createId) {
  const groups = new Map();
  for (const source of sources) if (source.editorGroupId) {
    const members = sources.filter(item => item.editorGroupId === source.editorGroupId);
    if (members.length > 1 && !groups.has(source.editorGroupId)) groups.set(source.editorGroupId, createId());
  }
  for (const [oldId, newId] of groups) idMap.set(oldId, newId);
}
