export const squareLocked = widget => widget.aspectRatio1to1 !== false;
const dimension = value => Math.min(4096, Math.max(64, Number(value) || 64));
export function industrialSize(widget, changedKey) {
  const width = dimension(widget.width), height = dimension(widget.height);
  if (!squareLocked(widget)) return { width, height };
  const size = changedKey === "width" ? width : changedKey === "height" ? height : Math.max(width, height);
  return { width: size, height: size };
}
export function industrialResize(origin, direction, dx, dy, locked) {
  let width = origin.width + (direction.includes("e") ? dx : direction.includes("w") ? -dx : 0);
  let height = origin.height + (direction.includes("s") ? dy : direction.includes("n") ? -dy : 0);
  if (locked) width = height = /[ew]/.test(direction) ? width : height;
  width = dimension(Math.round(width)); height = dimension(Math.round(height));
  return { width, height, x: direction.includes("w") ? Math.max(0, origin.left + origin.width - width) : origin.left, y: direction.includes("n") ? Math.max(0, origin.top + origin.height - height) : origin.top };
}
