export function imageOptions(widget, runtime) {
  const interactive = runtime && widget.allowUserInteractions === true;
  return {
    width: "100%", height: widget.stretch === true ? "100%" : "auto", maxHeight: "none",
    pointerEvents: interactive ? "auto" : "none", userSelect: interactive ? "auto" : "none", touchAction: interactive ? "auto" : "none",
    draggable: interactive,
  };
}
