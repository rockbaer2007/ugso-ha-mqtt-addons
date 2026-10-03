export const isSeparator = w => ["horizontal-line", "vertical-line"].includes(w.type);
const eligible = w => isSeparator(w) && !w.cssTransform && (!w.cssPosition || w.cssPosition === "absolute") && !["cssLeft", "cssTop", "cssWidth", "cssHeight"].some(k => w[k]);
const vertical = w => w.type === "vertical-line";
const bounds = w => ({ x: Number(w.x) || 0, y: Number(w.y) || 0, width: Math.max(16, Number(w.width) || 16), height: Math.max(16, Number(w.height) || 16) });

export function snapSeparator(widget, peers, direction = "", tolerance = 8) {
  const box = bounds(widget);
  if (!eligible(widget) || widget.separatorSnap === false) return box;
  const v = vertical(widget), axis = v ? "y" : "x", cross = v ? "x" : "y", size = v ? "height" : "width", breadth = v ? "width" : "height";
  let best;
  const consider = (delta, apply) => {
    if (Math.abs(delta) <= tolerance && (!best || Math.abs(delta) < best.distance)) {
      const candidate = apply();
      if (candidate.x >= 0 && candidate.y >= 0 && candidate.width >= 16 && candidate.height >= 16) best = { distance: Math.abs(delta), box: candidate };
    }
  };
  for (const peer of peers) {
    if (peer.id === widget.id || !eligible(peer) || vertical(peer) === v || peer.visible === false || peer.cssDisplay === "none") continue;
    const target = bounds(peer), center = target[axis] + target[size] / 2, crossCenter = box[cross] + box[breadth] / 2;
    if (crossCenter >= target[cross] && crossCenter <= target[cross] + target[breadth]) {
      for (const end of [0, 1]) {
        const handle = v ? (end ? "s" : "n") : (end ? "e" : "w");
        if (direction && !direction.includes(handle)) continue;
        const delta = center - (box[axis] + end * box[size]);
        consider(delta, () => direction ? { ...box, [axis]: end ? box[axis] : center, [size]: box[size] + (end ? delta : -delta) } : { ...box, [axis]: box[axis] + delta });
      }
    }
    // A stationary endpoint can meet any position along the moving line.
    if (!direction && center >= box[axis] && center <= box[axis] + box[size]) {
      for (const end of [0, 1]) {
        const delta = target[cross] + end * target[breadth] - crossCenter;
        consider(delta, () => ({ ...box, [cross]: box[cross] + delta }));
      }
    }
  }
  return best?.box || box;
}

export function renderSeparator(widget, document) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const v = vertical(widget), box = bounds(widget), length = box[v ? "height" : "width"], breadth = box[v ? "width" : "height"];
  const thickness = Math.min(breadth, Math.max(1, Number(widget.separatorThickness) || 2));
  const border = Math.min(thickness / 2, Math.max(0, Number(widget.separatorBorderWidth) || 0));
  svg.setAttribute("viewBox", `0 0 ${v ? breadth : length} ${v ? length : breadth}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.style.width = "100%"; svg.style.height = "100%"; svg.style.display = "block";
  const pointed = widget.separatorEnds === "pointed", shape = document.createElementNS(svg.namespaceURI, pointed ? "polygon" : "rect");
  const low = (breadth - thickness) / 2 + border / 2, high = breadth - low, start = border / 2, finish = length - border / 2;
  if (pointed) {
    const tip = Math.min(thickness, (finish - start) / 2), middle = breadth / 2;
    const points = [[start, middle], [start + tip, low], [finish - tip, low], [finish, middle], [finish - tip, high], [start + tip, high]];
    shape.setAttribute("points", points.map(([a, b]) => v ? `${b},${a}` : `${a},${b}`).join(" "));
    shape.setAttribute("stroke-linejoin", "round");
  } else {
    shape.setAttribute("x", String(v ? low : start)); shape.setAttribute("y", String(v ? start : low));
    shape.setAttribute("width", String(v ? high - low : finish - start)); shape.setAttribute("height", String(v ? finish - start : high - low));
    shape.setAttribute("rx", widget.separatorEnds === "round" ? String((thickness - border) / 2) : "0");
  }
  shape.setAttribute("fill", widget.separatorColor || "#888888");
  shape.setAttribute("stroke", widget.separatorBorderColor || "#222222"); shape.setAttribute("stroke-width", String(border));
  svg.append(shape); return svg;
}
