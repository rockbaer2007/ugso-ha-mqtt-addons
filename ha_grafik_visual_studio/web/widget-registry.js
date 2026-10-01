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
  sets.set(set.id, registered);
  for (const widget of registered.widgets) types.set(widget.type, widget);
}

export function getWidgetSets() { return [...sets.values()]; }

export function getWidgetDefinition(type) {
  const definition = types.get(type);
  if (!definition) throw new Error(`Unbekannter Widget-Typ: ${type}`);
  return definition;
}
