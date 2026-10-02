export function numberDisplay(widget, entityState) {
  const bound = Boolean(String(widget.entityId || "").trim());
  const raw = bound ? entityState?.state : widget.state;
  const numeric = raw === null || raw === undefined || String(raw).trim() === ""
    ? NaN : Number(String(raw).trim().replace(",", "."));
  let value = raw === null || raw === undefined || raw === "" ? "--" : String(raw);
  let scaledValue = numeric;
  if (Number.isFinite(numeric)) {
    const factor = Number(widget.factor ?? 1);
    scaledValue = numeric * (Number.isFinite(factor) ? factor : 1);
    const digits = Math.max(0, Math.min(10, Math.trunc(Number(widget.digits ?? 1) || 0)));
    value = scaledValue.toFixed(digits);
    if (widget.decimalComma) value = value.replace(".", ",");
  } else if (bound) value = "--";
  const suffix = scaledValue === 1 ? widget.suffixSingular || widget.unit || "" : widget.suffixPlural || widget.unit || "";
  return { value, bound, prefix: bound ? "" : widget.prefix || "", suffix: bound ? "" : suffix };
}
