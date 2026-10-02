import { dockPointKey } from "./dock-points.js";

const roleKey = anchorId => `lineboxRole_${anchorId.replaceAll("-", "_")}`;
const passKey = anchorId => `lineboxPass_${anchorId.replaceAll("-", "_")}`;

export function lineboxPortRole(box, anchorId) {
  if (box?.type !== "linebox" || !anchorId || box.dockPointsEnabled !== true || box[dockPointKey(anchorId)] !== true) return "none";
  return ["input", "output"].includes(box[roleKey(anchorId)]) ? box[roleKey(anchorId)] : "none";
}

export function lineboxRuntimeJoinPosition(box, anchorId) {
  if (lineboxPortRole(box, anchorId) === "none") return null;
  const x = Number(box.x);
  const y = Number(box.y);
  const width = Number(box.width);
  const height = Number(box.height);
  if (![x, y, width, height].every(Number.isFinite)) return null;
  return { x: x + width / 2, y: y + height / 2 };
}

export function lineboxInputSum(box, widgets, entityStates) {
  let sum = 0;
  let validInputs = 0;
  const seen = new Set();
  for (const line of widgets.filter(item => item.type === "svg-connection" && item.visible !== false && item.animationSource === "number")) {
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

export function lineboxHelperOutput(box, widgets, entityStates) {
  if (box?.type !== "linebox" || box.outputHelperEnabled !== true) return null;
  const entityId = String(box.outputHelperEntityId || "").trim();
  if (!/^input_number\.[a-z0-9_]+$/.test(entityId)) return null;
  const inputs = widgets.filter(line => line.type === "svg-connection" && line.visible !== false && line.animationSource === "number" && ["start", "end"].some(side => line[`${side}WidgetId`] === box.id && lineboxPortRole(box, line[`${side}Anchor`] || (side === "start" ? "right-center" : "left-center")) === "input"));
  if (inputs.some(line => line.animationNumberEntityId === entityId)) return null;
  const sum = lineboxInputSum(box, widgets, entityStates);
  return sum === null || !Number.isFinite(sum) ? null : { entityId, value: Number(sum.toFixed(6)) };
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
