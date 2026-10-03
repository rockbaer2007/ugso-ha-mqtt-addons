const bounded = (value, fallback, min, max) => {
  const number = Number(value ?? fallback);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
};

export function svgShapeGeometry(widget) {
  const type = widget.shape || "circle";
  const stroke = bounded(widget.strokeWidth, 5, 0, 100);
  const rotation = bounded(widget.rotation, 0, 0, 360);
  const transform = `rotate(${rotation}) scale(${bounded(widget.scaleX, 1, 0, 1)} ${bounded(widget.scaleY, 1, 0, 1)})`;
  if (type === "line") return { tag: "line", attributes: { x1: -50, y1: 0, x2: 50, y2: 0, transform: `rotate(${rotation})`, "vector-effect": "non-scaling-stroke" } };
  if (type === "circle") return { tag: "circle", attributes: { cx: 0, cy: 0, r: Math.max(0, 50 - stroke / 2), transform } };
  if (type === "arrow") return { tag: "polygon", attributes: { points: `0,-40 ${-25 * Math.sqrt(3)},35 0,10 ${25 * Math.sqrt(3)},35`, transform } };
  const count = { triangle: 3, square: 4, pentagon: 5, hexagon: 6, octagon: 8, star: 5 }[type] ?? Math.trunc(bounded(widget.pointCount, 3, 3, 20));
  const radius = Math.max(0, 50 - stroke);
  const step = type === "star" ? 4 * Math.PI / 5 : 2 * Math.PI / count;
  const points = Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 - step * index;
    return `${radius * Math.cos(angle)},${radius * Math.sin(angle)}`;
  }).join(" ");
  return { tag: "polygon", attributes: { points, transform } };
}
