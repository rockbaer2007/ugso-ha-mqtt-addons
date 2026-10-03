export const HEATING_PARAMS = [
  ["heatingPeriod", "Heizperiode aktiv", "Heating period active"],
  ["publicHoliday", "Heute Feiertag", "Public holiday today"],
  ["present", "Anwesend", "Present"],
  ["party", "Jetzt feiern", "Party now"],
  ["guests", "Gäste anwesend", "Guests present"],
  ["holidayHome", "Urlaub zu Hause", "Holiday at home"],
  ["vacationAway", "Urlaub abwesend", "Vacation away"],
  ["fireplace", "Kaminmodus", "Fireplace mode"],
];
export function heatingParamsBindings(widget) {
  return [widget.chosenRoomEntityId, ...HEATING_PARAMS.map(([key]) => widget[`${key}EntityId`])].filter(Boolean);
}
export function heatingParamState(widget, key, states, runtime, pending = new Set()) {
  const entityId = widget[`${key}EntityId`], value = entityId ? states[entityId]?.state : runtime ? undefined : widget[`${key}Preview`];
  const state = [true, 1, "on", "true", "1"].includes(value) ? true : [false, 0, "off", "false", "0"].includes(value) ? false : null;
  const writable = runtime && widget.readOnly !== true && /^(input_boolean|switch)\.[a-z0-9_]+$/.test(entityId || "") && ["on", "off"].includes(value) && !pending.has(entityId);
  return { entityId, state, writable, pending: pending.has(entityId) };
}
export function renderHeatingParams(widget, doc, { states = {}, runtime = false, locale = "de", pending = new Set(), write = () => {} } = {}) {
  const de = locale === "de", root = doc.createElement("div"); root.className = "heating-params";
  if (widget.chosenRoomEntityId) {
    const room = doc.createElement("small"), value = states[widget.chosenRoomEntityId]?.state;
    room.textContent = `${de ? "Gewählter Raum" : "Chosen room"}: ${typeof value === "string" && value && !["unknown", "unavailable"].includes(value) ? value.slice(0, 512) : de ? "Unbekannt" : "Unknown"}`;
    root.append(room);
  }
  for (const [key, german, english] of HEATING_PARAMS) {
    const current = heatingParamState(widget, key, states, runtime, pending), row = doc.createElement("label"); row.className = "heating-param-row";
    const control = doc.createElement("input"); control.type = "checkbox"; control.setAttribute("role", "switch"); control.setAttribute("aria-label", de ? german : english);
    control.checked = current.state === true; control.indeterminate = current.state === null; control.disabled = !current.writable;
    const caption = doc.createElement("span"); caption.textContent = de ? german : english;
    const status = doc.createElement("small"); status.textContent = current.pending ? de ? "Wird geschaltet …" : "Switching …" : current.state === null ? !current.entityId ? de ? "Ungebunden" : "Unbound" : de ? "Unbekannt" : "Unknown" : !runtime && !current.entityId ? de ? "Vorschau" : "Preview" : "";
    control.addEventListener("change", () => { if (current.writable && !control.disabled) write(current.entityId, control.checked); });
    row.append(control, caption, status); root.append(row);
  }
  return root;
}
