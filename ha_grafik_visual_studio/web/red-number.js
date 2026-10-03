export function redNumberDisplay(value, runtime, hasSource = true) {
  const number = hasSource ? parseFloat(value) : NaN;
  const valid = Number.isFinite(number);
  return { text: valid ? String(number) : "--", singular: valid && number === 1, visible: !runtime || (valid && number !== 0) };
}
