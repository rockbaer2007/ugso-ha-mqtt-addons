/** A fixed command value, independent from the entity's current state. */
export function htmlStateValue(widget) {
  const value = widget.writeValue ?? widget.state ?? false;
  if (value === "true") return true;
  if (value === "false") return false;
  if (typeof value === "string") {
    const number = parseFloat(value);
    if (String(number) === value) return number;
  }
  return value;
}
