import { numericConnectionValue } from "./linebox.js";
import { dockPointKey } from "./dock-points.js";

export const MATH_ANCHORS = [
  ["A", "A · Links oben", 0, 0], ["B", "B · Oben 1/4", .25, 0], ["C", "C · Oben Mitte", .5, 0], ["D", "D · Oben 3/4", .75, 0],
  ["E", "E · Rechts oben", 1, 0], ["F", "F · Rechts 1/4", 1, .25], ["G", "G · Rechts Mitte", 1, .5], ["H", "H · Rechts 3/4", 1, .75],
  ["I", "I · Rechts unten", 1, 1], ["J", "J · Unten 3/4", .75, 1], ["K", "K · Unten Mitte", .5, 1], ["L", "L · Unten 1/4", .25, 1],
  ["M", "M · Links unten", 0, 1], ["N", "N · Links 3/4", 0, .75], ["O", "O · Links Mitte", 0, .5], ["P", "P · Links 1/4", 0, .25],
];
export const MATH_IDS = MATH_ANCHORS.map(([id]) => id);

export function mathPortRole(box, id) {
  if (box?.type !== "linebox-math" || !MATH_IDS.includes(id) || box.dockPointsEnabled !== true || box[dockPointKey(id)] !== true) return "none";
  return ["input", "output"].includes(box[`mathRole_${id}`]) ? box[`mathRole_${id}`] : "none";
}

// A small arithmetic parser: no JavaScript execution, functions or property access.
export function evaluateMathExpression(expression, values, validateOnly = false) {
  const text = String(expression || "").toUpperCase();
  if (text.length > 512) throw new Error("Formel zu lang");
  const tokens = text.match(/\d+(?:\.\d*)?|\.\d+|[A-P]|[()+\-*/]|\S/g) || [];
  let index = 0;
  function primary() {
    const token = tokens[index++];
    if (token === "+") return primary();
    if (token === "-") return -primary();
    if (token === "(") { const value = sum(); if (tokens[index++] !== ")") throw new Error("Schließende Klammer fehlt"); return value; }
    if (/^[A-P]$/.test(token || "")) { if (!Number.isFinite(values[token])) throw new Error(`Eingang ${token} fehlt oder ist ungültig`); return values[token]; }
    if (/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token || "")) return Number(token);
    throw new Error("Ungültige Formel");
  }
  function product() {
    let value = primary();
    while (["*", "/"].includes(tokens[index])) { const operator = tokens[index++]; const right = primary(); if (operator === "/" && right === 0 && !validateOnly) throw new Error("Division durch null"); value = operator === "*" ? value * right : right === 0 ? 0 : value / right; }
    return value;
  }
  function sum() { let value = product(); while (["+", "-"].includes(tokens[index])) { const operator = tokens[index++]; const right = product(); value = operator === "+" ? value + right : value - right; } return value; }
  const value = sum();
  if (index !== tokens.length || !Number.isFinite(value)) throw new Error("Ungültige Formel oder Ergebnis außerhalb des Zahlenbereichs");
  return value;
}

export function mathBoxResult(box, widgets, states, visited = new Set()) {
  const values = {};
  if (visited.has(`math:${box.id}`)) return { value: null, values, error: "Rückkopplung erkannt" };
  const next = new Set(visited).add(`math:${box.id}`);
  try {
    for (const id of MATH_IDS.filter(id => mathPortRole(box, id) === "input")) {
      const connections = widgets.filter(line => line.type === "svg-connection" && line.visible !== false).flatMap(line => ["start", "end"].filter(side => line[`${side}WidgetId`] === box.id && line[`${side}Anchor`] === id).map(side => ({ line, side })));
      if (!connections.length) continue;
      let total = 0;
      for (const { line, side } of connections) {
        if (line.startWidgetId === box.id && line.endWidgetId === box.id) throw new Error("Rückkopplung erkannt");
        const value = numericConnectionValue(line, widgets, states, next);
        if (value === null) throw new Error(`Eingang ${id}: Wert fehlt, ist ungültig oder enthält eine Rückkopplung`);
        total += side === "end" ? value : -value;
      }
      if (!Number.isFinite(total)) throw new Error(`Eingang ${id}: Zahlenbereich überschritten`);
      values[id] = total;
    }
    const inputs = Object.values(values);
    const value = box.mathMode === "average" ? (inputs.length ? inputs.reduce((sum, value) => sum + value, 0) / inputs.length : null) : evaluateMathExpression(box.mathExpression || "A + B", values);
    if (value === null || !Number.isFinite(value)) throw new Error("Keine gültigen Eingänge");
    return { value, values, error: "" };
  } catch (error) { return { value: null, values, error: error.message }; }
}

// Corners use the horizontal edge: A/E from above, I/M from below.
export function mathLeadPoint(box, id, endpoint, distance = 24) {
  if (box?.type !== "linebox-math" || !MATH_IDS.includes(id)) return null;
  if (["A", "B", "C", "D", "E"].includes(id)) return { x: endpoint.x, y: endpoint.y - distance };
  if (["I", "J", "K", "L", "M"].includes(id)) return { x: endpoint.x, y: endpoint.y + distance };
  return { x: endpoint.x + (["F", "G", "H"].includes(id) ? distance : -distance), y: endpoint.y };
}
