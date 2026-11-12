import { remapUniversalReferences } from "./universal-element.js";

const format = "ugso-studio-page";
export const pageTransferLimit = 10_000_000;

function collectWidgets(surface, result, depth = 0) {
  if (depth > 8 || !Array.isArray(surface?.widgets)) throw new Error("widgets");
  for (const widget of surface.widgets) {
    if (!widget || typeof widget.id !== "string" || !widget.id ||
        typeof widget.type !== "string" || result.has(widget.id) || result.size >= 10000) {
      throw new Error("widget");
    }
    if (widget.type === "universal-button" && widget.visualStates != null && !Array.isArray(widget.visualStates)) {
      throw new Error("states");
    }
    result.set(widget.id, widget);
    if (widget.tabSurfaces != null) {
      if (!Array.isArray(widget.tabSurfaces) || widget.tabSurfaces.length > 20) throw new Error("tabs");
      for (const child of widget.tabSurfaces) if (child) {
        if (!child.page || typeof child.page !== "object" || Array.isArray(child.page)) throw new Error("surface");
        collectWidgets(child, result, depth + 1);
      }
    }
  }
  return result;
}

export function readPageTransfer(source) {
  if (source.length > pageTransferLimit) throw new Error("size");
  const data = JSON.parse(source, (key, value) => {
    if (["__proto__", "prototype", "constructor"].includes(key)) throw new Error("key");
    return value;
  });
  const pages = data?.format === format && data.version === 1 ? [data.page] : data?.pages;
  if (!Array.isArray(pages) || !pages.length || pages.length > 1000) throw new Error("format");
  for (const page of pages) {
    if (!page || typeof page.id !== "string" || !page.id || typeof page.name !== "string" ||
        !page.name.trim() || !page.page || typeof page.page !== "object" || Array.isArray(page.page)) {
      throw new Error("page");
    }
    collectWidgets(page, new Map());
  }
  return pages;
}

export function writePageTransfer(page) {
  return JSON.stringify({format, version: 1, page}, null, 2) + "\n";
}

export function freePageName(name, pages) {
  const names = new Set(pages.map(page => page.name.toLocaleLowerCase()));
  if (!names.has(name.toLocaleLowerCase())) return name;
  for (let number = 2; ; number++) {
    const candidate = `${name} (${number})`;
    if (!names.has(candidate.toLocaleLowerCase())) return candidate;
  }
}

export function copyPage(source, {id, name, widgetId, groupId, validateWidget}) {
  const page = structuredClone(source);
  const widgets = collectWidgets(page, new Map());
  if (validateWidget) for (const widget of widgets.values()) validateWidget(widget);
  const ids = new Map([...widgets.keys()].map(old => [old, widgetId()]));
  const groups = new Map();
  for (const [old, widget] of widgets) {
    widget.id = ids.get(old);
    if (widget.editorGroupId) {
      if (!groups.has(widget.editorGroupId)) groups.set(widget.editorGroupId, groupId());
      widget.editorGroupId = groups.get(widget.editorGroupId);
    }
    remapUniversalReferences(widget, ids);
    for (const key of Object.keys(widget)) {
      const value = widget[key];
      if (typeof value !== "string" || !value) continue;
      if (/FromWidget$/.test(key) || ["startWidgetId", "endWidgetId", "flowParentId", "detailWidget"].includes(key)) {
        if (ids.has(value)) widget[key] = ids.get(value);
      } else if (key === "startCollector" || key === "endCollector") {
        const colon = value.indexOf(":");
        const owner = value.slice(0, colon);
        if (colon > 0 && ids.has(owner)) widget[key] = ids.get(owner) + value.slice(colon);
      } else if (value === source.id && /^(targetPage|printPage|page\d+|tabPage\d+)$/.test(key)) {
        widget[key] = id;
      }
    }
    for (const [index, surface] of (widget.tabSurfaces || []).entries()) {
      if (surface) surface.id = `${widget.id}-tab-${index}`;
    }
  }
  return {...page, id, name, visible: page.visible ?? true};
}
