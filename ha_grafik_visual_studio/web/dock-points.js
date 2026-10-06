import { isSeparator, clearSeparatorConnections } from "./separator-line.js";
import { isIndustrialSwitch, switchPortActive } from "./industrial-switch.js";

export function dockPointKey(anchorId) {
  return `dock_${anchorId.replaceAll("-", "_")}`;
}

export const OUTPUT_SIDES = [["top-center", "Oben"], ["bottom-center", "Unten"], ["right-center", "Rechts"], ["left-center", "Links"]];
export function hasSimpleOutput(widget) {
  return !!widget && !isIndustrialSwitch(widget) && !isSeparator(widget) && !["svg-connection", "linebox", "linebox-math", "value-converter"].includes(widget.type);
}
export function outputDockActive(widget, anchor) {
  return hasSimpleOutput(widget) && widget.dataOutputEnabled === true && anchor === (widget.dataOutputAnchor || "right-center");
}
export function setOutputAnchor(widget, widgets, anchor) {
  if (!OUTPUT_SIDES.some(([id]) => id === anchor)) return;
  const previous = widget.dataOutputAnchor || "right-center";
  widget.dataOutputAnchor = anchor;
  if (widget.dataOutputEnabled !== true) return;
  for (const line of widgets) {
    if (line.type === "svg-connection" && !line.startCollector && line.startWidgetId === widget.id && (line.startAnchor || "right-center") === previous) line.startAnchor = anchor;
  }
}
export function dockPointActive(widget, anchor, side = "") {
  if (isIndustrialSwitch(widget)) return switchPortActive(widget, anchor, side);
  if (widget && isSeparator(widget)) return false;
  if (outputDockActive(widget, anchor)) return side !== "end";
  return widget?.dockPointsEnabled === true && widget[dockPointKey(anchor)] === true;
}

export function initializeDockPoints(widget, anchorIds) {
  if (isSeparator(widget)) { clearSeparatorConnections(widget); return; }
  const legacyEnabled = widget.dockPointsEnabled === true;
  for (const anchorId of anchorIds) widget[dockPointKey(anchorId)] ??= legacyEnabled;
}

export function setAllDockPoints(widget, anchorIds, enabled) {
  for (const anchorId of anchorIds) widget[dockPointKey(anchorId)] = enabled;
}

export function dockPointSelection(widget, anchorIds) {
  const active = anchorIds.filter(anchorId => widget[dockPointKey(anchorId)] === true).length;
  return active === 0 ? "none" : active === anchorIds.length ? "all" : "some";
}
