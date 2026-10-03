import { dockPointKey } from "./dock-points.js";
import { mathBoxResult, mathPortRole } from "./linebox-math.js";

const roleKey = anchorId => `lineboxRole_${anchorId.replaceAll("-", "_")}`;
const passKey = anchorId => `lineboxPass_${anchorId.replaceAll("-", "_")}`;
const numericTypes = new Set(["sensor", "red-number", "gauge", "bar", "slider", "input-value"]);
const numeric = raw => raw === null || raw === undefined || String(raw).trim() === "" || !Number.isFinite(Number(String(raw).trim().replace(",", "."))) ? null : Number(String(raw).trim().replace(",", "."));

export function numericWidgetInput(widget, widgets, entityStates, visited = new Set()) {
  if (!numericTypes.has(widget?.type) || visited.has(`widget:${widget.id}`)) return null;
  const next = new Set(visited).add(`widget:${widget.id}`);
  if (widget.numericSource !== "dock") return numeric(widget.numericSource !== "preview" && widget.entityId ? entityStates[widget.entityId]?.state : widget.state);
  const anchor = widget.numericInputAnchor || "left-center";
  if (widget.dockPointsEnabled !== true || widget[dockPointKey(anchor)] !== true) return null;
  let sum = 0, count = 0;
  for (const line of widgets.filter(item => item.type === "svg-connection" && item.visible !== false)) {
    for (const side of ["start", "end"]) {
      if (line[`${side}WidgetId`] !== widget.id || (line[`${side}Anchor`] || (side === "start" ? "right-center" : "left-center")) !== anchor) continue;
      const value = numericConnectionValue(line, widgets, entityStates, next);
      if (value !== null) { sum += side === "end" ? value : -value; count++; }
    }
  }
  return count ? sum : null;
}

export function numericConnectionValue(line, widgets, entityStates, visited = new Set()) {
  if (visited.has(`line:${line.id}`)) return null;
  const next = new Set(visited).add(`line:${line.id}`);
  const forwarded = lineboxOutputForConnection(line, widgets, entityStates, next);
  if (forwarded) return forwarded.value;
  if (line.animationSource === "number" && line.animationNumberEntityId) return numeric(entityStates[line.animationNumberEntityId]?.state);
  // A docked numeric widget supplies its value even when animation is manual.
  for (const side of ["start", "end"]) {
    const source = widgets.find(item => item.id === line[`${side}WidgetId`] && numericTypes.has(item.type));
    if (!source) continue;
    let value = numericWidgetInput(source, widgets, entityStates, next);
    if (value === null) continue;
    if (source.type === "sensor") { const factor = Number(source.factor ?? 1); value *= Number.isFinite(factor) ? factor : 1; }
    return side === "start" ? value : -value;
  }
  return null;
}

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

export function lineboxInputSum(box, widgets, entityStates, visited = new Set()) {
  if (visited.has(`box:${box.id}`)) return null;
  const next = new Set(visited).add(`box:${box.id}`);
  let sum = 0;
  let validInputs = 0;
  const seen = new Set();
  for (const line of widgets.filter(item => item.type === "svg-connection" && item.visible !== false)) {
    for (const side of ["start", "end"]) {
      if (line[`${side}WidgetId`] !== box.id || seen.has(line.id)) continue;
      const anchorId = line[`${side}Anchor`] || (side === "start" ? "right-center" : "left-center");
      if (lineboxPortRole(box, anchorId) !== "input") continue;
      const value = numericConnectionValue(line, widgets, entityStates, next);
      if (value === null) continue;
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
  const inputs = widgets.filter(line => line.type === "svg-connection" && line.visible !== false && ["start", "end"].some(side => line[`${side}WidgetId`] === box.id && lineboxPortRole(box, line[`${side}Anchor`] || (side === "start" ? "right-center" : "left-center")) === "input"));
  if (inputs.some(line => line.animationNumberEntityId === entityId || [line.startWidgetId, line.endWidgetId].some(id => widgets.some(widget => widget.id === id && widget.numericSource !== "preview" && widget.entityId === entityId)))) return null;
  const sum = lineboxInputSum(box, widgets, entityStates);
  return sum === null || !Number.isFinite(sum) ? null : { entityId, value: Number(sum.toFixed(6)) };
}

export function lineboxOutputForConnection(line, widgets, entityStates, visited = new Set()) {
  for (const side of ["start", "end"]) {
    const math = widgets.find(item => item.id === line[`${side}WidgetId`] && item.type === "linebox-math");
    if (mathPortRole(math, line[`${side}Anchor`]) === "output") {
      const result = mathBoxResult(math, widgets, entityStates, visited);
      return { boxId: math.id, value: result.value === null ? null : side === "start" ? result.value : -result.value };
    }
    const box = widgets.find(item => item.id === line[`${side}WidgetId`] && item.type === "linebox");
    const anchorId = line[`${side}Anchor`] || (side === "start" ? "right-center" : "left-center");
    if (lineboxPortRole(box, anchorId) !== "output" || box[passKey(anchorId)] !== true) continue;
    const sum = lineboxInputSum(box, widgets, entityStates, visited);
    return { boxId: box.id, value: sum === null ? null : side === "start" ? sum : -sum };
  }
  return null;
}
