export function numberDisplay(widget, entityState) {
  const bound = Boolean(String(widget.entityId || "").trim());
  const raw = bound ? entityState?.state : widget.state;
  const numeric = raw === null || raw === undefined || String(raw).trim() === ""
    ? NaN : widget.numberMode === "reference" ? parseFloat(raw) : Number(String(raw).trim().replace(",", "."));
  let value = raw === null || raw === undefined || raw === "" ? "--" : String(raw);
  let scaledValue = numeric;
  if (Number.isFinite(numeric)) {
    const factor = Number(widget.factor ?? 1);
    scaledValue = numeric * (Number.isFinite(factor) ? factor : 1);
    const automatic = widget.automaticDigits === true || widget.numberMode === "reference" && widget.digits === "";
    const digits = Math.max(0, Math.min(10, Math.trunc(Number(widget.digits ?? 1) || 0)));
    value = automatic ? String(scaledValue) : scaledValue.toFixed(digits);
    if (widget.thousandsSeparator) {
      const [whole, fraction] = value.split(".");
      value = whole.replace(/\B(?=(\d{3})+(?!\d))/g, widget.decimalComma ? "." : ",") + (fraction === undefined ? "" : (widget.decimalComma ? "," : ".") + fraction);
    } else if (widget.decimalComma) value = value.replace(".", ",");
  } else if (bound) value = "--";
  const singular = widget.numberMode === "reference" ? parseFloat(value) === 1 : scaledValue === 1;
  const suffix = singular ? widget.suffixSingular || widget.unit || "" : widget.suffixPlural || widget.unit || "";
  return { value, bound, prefix: widget.prefix || "", suffix };
}
