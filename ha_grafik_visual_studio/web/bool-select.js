/** VIS2-style truthiness, with HA on/off and saved preview states normalized. */
export function boolSelectOn(value) {
  if (value === "false" || value === "off") return false;
  if (value === "true" || value === "on") return true;
  if (typeof value === "string") {
    const number = parseFloat(value);
    return number.toString() === value ? Boolean(number) : value !== "";
  }
  return Boolean(value);
}
