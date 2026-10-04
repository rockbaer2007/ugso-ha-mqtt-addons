const sets = new Map();
const types = new Map();

/** Register an independent Home Assistant widget set. */
export function registerWidgetSet(set) {
  if (!set?.id || !set?.label || !Array.isArray(set.widgets) || sets.has(set.id)) throw new Error("Ungültiges oder doppeltes Widget-Set");
  const incomingTypes = new Set();
  for (const widget of set.widgets) {
    if (!widget?.type || !widget.label || !widget.defaults || !Array.isArray(widget.propertyGroups) || types.has(widget.type) || incomingTypes.has(widget.type)) throw new Error(`Ungültiges oder doppeltes Widget: ${widget?.type || "(ohne Typ)"}`);
    incomingTypes.add(widget.type);
  }
  const registered = structuredClone(set);
  const generalCss = [...registered.widgets, ...types.values()].flatMap(widget => widget.propertyGroups).find(group => group.css && group.label === "CSS Allgemein");
  sets.set(set.id, registered);
  for (const widget of registered.widgets) {
    if (generalCss && !widget.propertyGroups.some(group => group.css && group.label === "CSS Allgemein")) {
      widget.propertyGroups.push({ ...structuredClone(generalCss), id: "css-general-required" });
    }
    for (const group of widget.propertyGroups) {
      if (group.css && group.label === "CSS Allgemein") {
        group.defaultEnabled = true;
        group.required = true;
      }
    }
    widget.legacyDefaultTitle = widget.defaults.title;
    widget.defaults.title = "";
    widget.defaults.captionInitialized = true;
    types.set(widget.type, widget);
  }
}

/** Remove old automatic captions once; subsequent explicit edits are retained. */
export function initializeWidgetCaption(widget) {
  if (widget.captionInitialized === true) return;
  const definition = types.get(widget.type);
  if (!definition) return;
  if (widget.title === definition.legacyDefaultTitle || widget.title === definition.label) widget.title = "";
  widget.captionInitialized = true;
}

export function getWidgetSets() { return [...sets.values()]; }

export function unregisterExternalWidgetSets() {
  for (const [id, set] of sets) {
    if (!set.externalPackage) continue;
    for (const widget of set.widgets) types.delete(widget.type);
    sets.delete(id);
  }
}

export function getWidgetDefinition(type) {
  const definition = types.get(type);
  if (!definition) throw new Error(`Unbekannter Widget-Typ: ${type}`);
  return definition;
}
