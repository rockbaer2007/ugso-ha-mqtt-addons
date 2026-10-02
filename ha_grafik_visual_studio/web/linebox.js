import { dockPointKey } from "./dock-points.js";

const roleKey = anchorId => `lineboxRole_${anchorId.replaceAll("-", "_")}`;
const passKey = anchorId => `lineboxPass_${anchorId.replaceAll("-", "_")}`;

export function lineboxPortRole(box, anchorId) {
  if (box?.type !== "linebox" || !anchorId || box.dockPointsEnabled !== true || box[dockPointKey(anchorId)] !== true) return "none";
  return ["input", "output"].includes(box[roleKey(anchorId)]) ? box[roleKey(anchorId)] : "none";
}

export function lineboxInputSum(box, widgets, entityStates) {
  let sum = 0;
  let validInputs = 0;
  const seen = new Set();
  for (const line of widgets.filter(item => item.type === "svg-connection" && item.animationSource === "number")) {
    for (const side of ["start", "end"]) {
      if (line[`${side}WidgetId`] !== box.id || seen.has(line.id)) continue;
      const anchorId = line[`${side}Anchor`] || (side === "start" ? "right-center" : "left-center");
      if (lineboxPortRole(box, anchorId) !== "input") continue;
      const raw = String(entityStates[line.animationNumberEntityId]?.state ?? "").trim().replace(",", ".");
      const value = Number(raw);
      if (!raw || !Number.isFinite(value)) continue;
      sum += side === "end" ? value : -value;
      validInputs += 1;
      seen.add(line.id);
    }
  }
  return validInputs ? sum : null;
}

export function lineboxOutputForConnection(line, widgets, entityStates) {
  for (const side of ["start", "end"]) {
    const box = widgets.find(item => item.id === line[`${side}WidgetId`] && item.type === "linebox");
    const anchorId = line[`${side}Anchor`] || (side === "start" ? "right-center" : "left-center");
    if (lineboxPortRole(box, anchorId) !== "output" || box[passKey(anchorId)] !== true) continue;
    const sum = lineboxInputSum(box, widgets, entityStates);
    return { boxId: box.id, value: sum === null ? null : side === "start" ? sum : -sum };
  }
  return null;
}
