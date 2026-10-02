export function sliderScale(widget) {
  const min = Number(widget.min ?? 0);
  const max = Number(widget.max ?? 100);
  const limit = Number.isFinite(min) && Number.isFinite(max) ? Math.max(0, Math.ceil(max - min) - 1) : 0;
  const count = Math.max(0, Math.min(limit, Math.trunc(Number(widget.scaleSteps) || 0)));
  const marks = [];
  if (widget.showMinMax) marks.push({ percent: 0, label: String(min), endpoint: true });
  for (let index = 1; index <= count; index++) {
    const value = min + (max - min) * index / (count + 1);
    marks.push({ percent: 100 * index / (count + 1), label: widget.showStepValues ? String(Number(value.toFixed(6))) : "", endpoint: false });
  }
  if (widget.showMinMax) marks.push({ percent: 100, label: String(max), endpoint: true });
  return { limit, count, position: widget.scalePosition === "above" ? "above" : "below", marks };
}
