const MIN_CYCLES_PER_SECOND = 0.05;
const MAX_CYCLES_PER_SECOND = 20;

export function lineboxAnimationSettings(widget) {
  return {
    animationSource: "number",
    animationDivisor: widget.lineboxDivisor ?? 1,
    animationAutoDivisor: widget.lineboxAutoDivisor === true,
    animationTargetSpeed: widget.lineboxTargetSpeed,
  };
}

export function connectionAnimationEntityId(widget) {
  if (widget.animationSource === "number") return widget.animationNumberEntityId || "";
  if (widget.animationSource === "boolean") return widget.animationBooleanEntityId || "";
  return "";
}

export function resolveConnectionAnimation(widget, stateEntry) {
  const source = widget.animationSource || "manual";
  if (source === "manual") return {};

  const rawState = String(stateEntry?.state ?? "").trim().toLowerCase();
  if (source === "number") {
    const value = Number(rawState.replace(",", "."));
    if (!rawState || !Number.isFinite(value) || value === 0) return { animationEnabled: false };
    const divisor = Number(widget.animationDivisor);
    const target = Number(widget.animationTargetSpeed ?? 1);
    const targetSpeed = Number.isFinite(target) && target > 0 ? Math.min(5, Math.max(MIN_CYCLES_PER_SECOND, target)) : 1;
    const safeDivisor = widget.animationAutoDivisor === true ? Math.abs(value) / targetSpeed : Number.isFinite(divisor) && divisor > 0 ? divisor : 1;
    const cyclesPerSecond = Math.min(MAX_CYCLES_PER_SECOND, Math.max(MIN_CYCLES_PER_SECOND, Math.abs(value) / safeDivisor));
    return {
      animationDirection: value < 0 ? "reverse" : "forward",
      animationDuration: 1 / cyclesPerSecond,
    };
  }

  if (source === "boolean") {
    if (!["on", "off", "true", "false", "1", "0"].includes(rawState)) return { animationEnabled: false };
    const forward = ["on", "true", "1"].includes(rawState) !== Boolean(widget.animationBooleanInvert);
    return { animationDirection: forward ? "forward" : "reverse" };
  }

  return {};
}
