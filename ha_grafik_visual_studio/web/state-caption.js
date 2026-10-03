// Empty state overrides inherit a configured caption; editor names are never captions.
export function stateCaption(...values) {
  return values.find(value => value !== undefined && value !== null && String(value).trim() !== "") ?? "";
}

export function booleanCaption(widget, checked) {
  return String(stateCaption(widget[checked ? "textTrue" : "textFalse"], widget[checked ? "textFalse" : "textTrue"], widget.title));
}
