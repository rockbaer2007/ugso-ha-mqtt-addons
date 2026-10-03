export function imageCount(widget) {
  const value = Number(widget.count ?? 0);
  return Number.isFinite(value) ? Math.max(0, Math.min(200, Math.trunc(value))) : 0;
}

export function imageIndex(widget, value) {
  const index = value == null || value === false || ["false", "off"].includes(value) ? 0
    : value === true || ["true", "on"].includes(value) ? 1
      : typeof value === "string" && !value.trim() ? NaN : Number(value);
  return Number.isInteger(index) && index >= 0 && index <= imageCount(widget)
    && widget.enabledPropertyGroups?.[`indexed-image-8-${index}`] !== false ? index : -1;
}

export function imageOptions(widget, runtime) {
  const interactive = runtime && widget.allowUserInteractions === true;
  return {
    width: "100%", height: widget.stretch === true ? "100%" : "auto", maxHeight: "none",
    pointerEvents: interactive ? "auto" : "none", userSelect: interactive ? "auto" : "none", touchAction: interactive ? "auto" : "none",
    draggable: interactive,
  };
}
