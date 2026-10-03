export function barDisplay(widget, value) {
  const min = Number(widget.min ?? 0), max = Number(widget.max ?? 100);
  const numeric = parseFloat(value);
  const percent = Number.isFinite(numeric) && Number.isFinite(min) && Number.isFinite(max) && max !== min
    ? Math.min(100, Math.max(0, Math.round((numeric - min) / (max - min) * 100))) : 0;
  const vertical = widget.orientation === "vertical";
  const reverse = widget.invert === true || widget.invert === "true";
  return { percent, dimension: vertical ? "height" : "width", inset: vertical ? reverse ? "auto 0 0" : "0 0 auto" : reverse ? "0 0 0 auto" : "0 auto 0 0" };
}
