import { isIndustrialSwitch } from "./industrial-switch.js";
export const HOUSING_CORNERS = [["top-left", "Oben links", 0, 0], ["top-right", "Oben rechts", 1, 0], ["bottom-left", "Unten links", 0, 1], ["bottom-right", "Unten rechts", 1, 1]];
export const housingPoints = widget => isIndustrialSwitch(widget) ? [...HOUSING_CORNERS, ["left-center", "Links Mitte", 0, .5], ["right-center", "Rechts Mitte", 1, .5]] : HOUSING_CORNERS;
export const housingKey = id => `housing_${id.replaceAll("-", "_")}`;
export const isIndustrial = widget => widget?.type?.startsWith("ugso.industrial/");
export const housingSpace = widget => Math.max(0, Math.min(64, Number(widget.housingSpace ?? 1) || 0));
export const housingActive = (widget, id) => isIndustrial(widget) && housingPoints(widget).some(([point]) => point === id) && widget.housingSnapEnabled === true && widget[housingKey(id)] === true;
export const housingSnapGroup = { label: "Gehäuse-Snappunkte", fields: [
  { label: "Gehäuse-Snapping aktivieren", key: "housingSnapEnabled", type: "checkbox", default: false },
  ...HOUSING_CORNERS.map(([id, label]) => ({ label, key: housingKey(id), type: "checkbox", default: false })),
  { label: "Abstand rundherum (px)", key: "housingSpace", type: "number", min: 0, max: 64, default: 1 },
  { label: "Snappunkte dauerhaft anzeigen", key: "housingSnapAlwaysVisible", type: "checkbox", default: false },
] };
export const housingSnapGroupFor = widget => ({ ...housingSnapGroup, fields: [housingSnapGroup.fields[0], ...housingPoints(widget).map(([id, label]) => ({ label, key: housingKey(id), type: "checkbox", default: false })), ...housingSnapGroup.fields.slice(5)] });

export function snapHousing(widget, widgets, tolerance = 8) {
  if (!isIndustrial(widget) || widget.housingSnapEnabled !== true) return null;
  let best = null;
  for (const other of widgets) {
    if (other.id === widget.id || other.visible === false || !isIndustrial(other) || other.housingSnapEnabled !== true) continue;
    const gap = housingSpace(widget) + housingSpace(other);
    for (const [id, , ax, ay] of housingPoints(widget)) for (const [target, , bx, by] of housingPoints(other)) {
      if (!housingActive(widget, id) || !housingActive(other, target)) continue;
      const offsets = [];
      if (ax !== bx) offsets.push({ x: Number(other.x) + bx * other.width - ax * widget.width + (ax ? -gap : gap), y: Number(other.y) + by * other.height - ay * widget.height });
      if (ay !== by && [0, 1].includes(ay) && [0, 1].includes(by)) offsets.push({ x: Number(other.x) + bx * other.width - ax * widget.width, y: Number(other.y) + by * other.height - ay * widget.height + (ay ? -gap : gap) });
      for (const position of offsets) {
        if (position.x < 0 || position.y < 0) continue;
        const overlap = widgets.some(item => item.id !== widget.id && isIndustrial(item) && item.visible !== false && position.x < item.x + item.width - .01 && position.x + widget.width > item.x + .01 && position.y < item.y + item.height - .01 && position.y + widget.height > item.y + .01);
        if (overlap) continue;
        const distance = Math.hypot(position.x - widget.x, position.y - widget.y);
        if (distance <= tolerance && (!best || distance < best.distance)) best = { ...position, distance, source: id, target, targetId: other.id };
      }
    }
  }
  return best;
}
