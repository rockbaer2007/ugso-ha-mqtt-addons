import { remapUniversalReferences } from "./universal-element.js";

export function tabCount(widget) { return Math.max(1, Math.min(20, Math.trunc(Number(widget.tabCount) || 4))); }

export function tabSize(widget) {
  const width = Number(widget.width) || 500;
  return { width: Math.max(16, width - (widget.tabsVertical ? Math.min(120, width / 2) : 0)),
    height: Math.max(16, (Number(widget.height) || 300) - (widget.tabsVertical ? 0 : 44)) };
}

export function ownTabSurface(widget, index) {
  widget.tabSurfaces ??= [];
  const size = tabSize(widget);
  const surface = widget.tabSurfaces[index] ??= { id: `${widget.id}-tab-${index}`, name: `Tab ${index + 1}`, visible: true,
    page: { preset: "custom", background: "transparent", backgroundMode: "tile", ...size }, widgets: [] };
  surface.name = widget[`tabTitle${index}`] || `Tab ${index + 1}`;
  Object.assign(surface.page, size);
  return surface;
}

export function allProjectWidgets(project) {
  const collect = widgets => widgets.flatMap(widget => [widget, ...(widget.tabSurfaces || []).filter(Boolean).flatMap(surface => collect(surface.widgets || []))]);
  return (project.pages || []).flatMap(page => collect(page.widgets || []));
}

export function tabTarget(widget, index, parentId) {
  return widget[`tabSource${index}`] === "page" ? widget[`tabPage${index}`] || "" : `${parentId}/${widget.id}/${index}`;
}

export function canEmbedTab(target, current, chain) { return Boolean(target) && target !== current && !chain.includes(target) && chain.length < 8; }

export function visibleTabSurfaces(project, page, selection, chain = []) {
  const surfaces = [page];
  for (const widget of page.widgets || []) {
    if (widget.type !== "tabs" || widget.visible === false) continue;
    const index = Math.max(0, Math.min(tabCount(widget) - 1, selection(widget, page) || 0));
    const target = tabTarget(widget, index, page.id);
    if (!canEmbedTab(target, page.id, chain)) continue;
    const child = widget[`tabSource${index}`] === "page" ? project.pages.find(item => item.id === target) : ownTabSurface(widget, index);
    if (child) surfaces.push(...visibleTabSurfaces(project, child, selection, [...chain, page.id]));
  }
  return surfaces;
}

export function reidentifyTabWidgets(owner, widgetId, groupId) {
  for (const [index, surface] of (owner.tabSurfaces || []).entries()) {
    if (!surface) continue;
    surface.id = `${owner.id}-tab-${index}`;
    const map = new Map((surface.widgets || []).map(widget => [widget.id, widgetId()]));
    const groups = new Map();
    for (const widget of surface.widgets || []) {
      widget.id = map.get(widget.id);
      remapUniversalReferences(widget, map);
      if (widget.editorGroupId) { if (!groups.has(widget.editorGroupId)) groups.set(widget.editorGroupId, groupId()); widget.editorGroupId = groups.get(widget.editorGroupId); }
      for (const key of ["startWidgetId", "endWidgetId", "flowParentId"]) if (widget[key]) widget[key] = map.get(widget[key]) || "";
      for (const key of ["startCollector", "endCollector"]) {
        if (!widget[key]) continue;
        const [id, point] = widget[key].split(":"); widget[key] = map.has(id) ? `${map.get(id)}:${point}` : "";
      }
      reidentifyTabWidgets(widget, widgetId, groupId);
    }
  }
}
