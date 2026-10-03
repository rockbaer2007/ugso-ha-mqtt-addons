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

export function parseMathPorts(text) {
  const ids = String(text || "").trim().toUpperCase().split(/[,;\s]+/).filter(Boolean);
  if (ids.some(id => !MATH_IDS.includes(id))) throw new Error("Anschlüsse als einzelne Buchstaben A–P angeben, z. B. E,F;H");
  return [...new Set(ids)];
}

export function mathCalculations(box) {
  return Array.from({ length: 4 }, (_, index) => {
    const stored = Array.isArray(box.mathCalculations) ? box.mathCalculations[index] : null;
    if (stored) return { enabled: false, mode: "expression", expression: "A + B", outputs: "", inputEnabled: false, inputTarget: "", ...stored };
    return {
      enabled: index === 0 && !Array.isArray(box.mathCalculations),
      mode: index === 0 ? box.mathMode || "expression" : "expression",
      expression: index === 0 ? box.mathExpression || "A + B" : "A + B",
      outputs: index === 0 && !Array.isArray(box.mathCalculations) ? MATH_IDS.filter(id => mathPortRole(box, id) === "output").join(",") : "",
      inputEnabled: false, inputTarget: "",
    };
  });
}

export function validateMathAssignments(box) {
  const calculations = mathCalculations(box);
  const outputs = new Map(), inputs = new Map();
  const errors = [];
  calculations.forEach((calculation, index) => {
    if (!calculation.enabled) return;
    const label = `Rechnung ${index + 1}`;
    try {
      for (const id of parseMathPorts(calculation.outputs)) {
        if (mathPortRole(box, id) !== "output") errors.push(`${label}: ${id} ist kein aktiver Ausgang`);
        if (outputs.has(id)) errors.push(`${id}: Ausgang ist mehreren Rechnungen zugeordnet`);
        outputs.set(id, index);
      }
      if (calculation.inputEnabled === true) {
        const targets = parseMathPorts(calculation.inputTarget);
        if (targets.length !== 1 || mathPortRole(box, targets[0]) !== "input") errors.push(`${label}: Genau einen aktiven Eingang für die interne Übergabe wählen`);
        else {
          const id = targets[0];
          if (inputs.has(id)) errors.push(`${id}: Eingang erhält mehrere interne Ergebnisse`);
          inputs.set(id, index);
        }
      }
    } catch (error) { errors.push(`${label}: ${error.message}`); }
  });
  const completed = new Set(), pending = new Set();
  function checkDependencies(index) {
    if (completed.has(index)) return;
    if (pending.has(index)) { errors.push(`Rechnung ${index + 1}: Rückkopplung zwischen Rechnungen erkannt`); return; }
    pending.add(index);
    const calculation = calculations[index];
    const ids = calculation.mode === "average" ? [...inputs.keys()] : String(calculation.expression || "").toUpperCase().match(/[A-P]/g) || [];
    for (const id of ids) if (inputs.has(id)) checkDependencies(inputs.get(id));
    pending.delete(index); completed.add(index);
  }
  calculations.forEach((calculation, index) => { if (calculation.enabled) checkDependencies(index); });
  return { calculations, outputs, inputs, errors };
}

export function mathBoxResults(box, widgets, states, visited = new Set()) {
  const { calculations, outputs, inputs, errors } = validateMathAssignments(box);
  const values = {}, inputCache = new Map(), calculationCache = new Map(), evaluating = new Set();
  const next = new Set(visited).add(`math:${box.id}`);
  function inputValue(id) {
    if (inputCache.has(id)) {
      const cached = inputCache.get(id); if (cached.error) throw new Error(cached.error); return cached.value;
    }
    try {
      if (mathPortRole(box, id) !== "input") throw new Error(`Eingang ${id} fehlt oder ist ungültig`);
      let total;
      if (inputs.has(id)) {
        const result = calculate(inputs.get(id));
        if (result.error) throw new Error(`Eingang ${id}: ${result.error}`);
        total = result.value;
      } else {
        const connections = widgets.filter(line => line.type === "svg-connection" && line.visible !== false).flatMap(line => ["start", "end"].filter(side => line[`${side}WidgetId`] === box.id && line[`${side}Anchor`] === id).map(side => ({ line, side })));
        if (!connections.length) throw new Error(`Eingang ${id} fehlt oder ist ungültig`);
        total = 0;
        for (const { line, side } of connections) {
          if (line.startWidgetId === box.id && line.endWidgetId === box.id) throw new Error("Rückkopplung erkannt");
          const value = numericConnectionValue(line, widgets, states, next);
          if (value === null) throw new Error(`Eingang ${id}: Wert fehlt, ist ungültig oder enthält eine Rückkopplung`);
          total += side === "end" ? value : -value;
        }
      }
      if (!Number.isFinite(total)) throw new Error(`Eingang ${id}: Zahlenbereich überschritten`);
      values[id] = total; inputCache.set(id, { value: total }); return total;
    } catch (error) { inputCache.set(id, { error: error.message }); throw error; }
  }
  function calculate(index) {
    if (calculationCache.has(index)) return calculationCache.get(index);
    if (evaluating.has(index)) return { value: null, error: "Rückkopplung zwischen Rechnungen erkannt" };
    const calculation = calculations[index];
    if (!calculation.enabled) return { value: null, error: "" };
    evaluating.add(index);
    let result;
    try {
      if (visited.has(`math:${box.id}`)) throw new Error("Rückkopplung erkannt");
      if (errors.length) throw new Error(errors.join("; "));
      const ids = calculation.mode === "average"
        ? MATH_IDS.filter(id => mathPortRole(box, id) === "input" && (inputs.has(id) || widgets.some(line => line.type === "svg-connection" && line.visible !== false && ["start", "end"].some(side => line[`${side}WidgetId`] === box.id && line[`${side}Anchor`] === id))))
        : [...new Set(String(calculation.expression || "").toUpperCase().match(/[A-P]/g) || [])];
      const localValues = Object.fromEntries(ids.map(id => [id, inputValue(id)]));
      const numbers = Object.values(localValues);
      const value = calculation.mode === "average" ? (numbers.length ? numbers.reduce((sum, number) => sum + number, 0) / numbers.length : null) : evaluateMathExpression(calculation.expression, localValues);
      if (!Number.isFinite(value)) throw new Error("Keine gültigen Eingänge");
      result = { value, error: "", values: localValues };
    } catch (error) { result = { value: null, error: error.message, values: {} }; }
    evaluating.delete(index); calculationCache.set(index, result); return result;
  }
  const results = calculations.map((calculation, index) => ({ enabled: calculation.enabled === true, ...calculate(index) }));
  return { results, values, outputs, errors };
}

export function mathBoxResult(box, widgets, states, visited = new Set(), outputAnchor = "") {
  const evaluated = mathBoxResults(box, widgets, states, visited);
  const index = outputAnchor ? evaluated.outputs.get(outputAnchor) : 0;
  const result = evaluated.results[index];
  return { value: result?.value ?? null, values: evaluated.values, error: result?.error || (outputAnchor && index === undefined ? "Ausgang keiner Rechnung zugeordnet" : "") };
}

// Corners use the horizontal edge: A/E from above, I/M from below.
export function mathLeadPoint(box, id, endpoint, distance = 24) {
  if (box?.type !== "linebox-math" || !MATH_IDS.includes(id)) return null;
  if (["A", "B", "C", "D", "E"].includes(id)) return { x: endpoint.x, y: endpoint.y - distance };
  if (["I", "J", "K", "L", "M"].includes(id)) return { x: endpoint.x, y: endpoint.y + distance };
  return { x: endpoint.x + (["F", "G", "H"].includes(id) ? distance : -distance), y: endpoint.y };
}
