import { isSeparator, clearSeparatorConnections } from "./separator-line.js";
import { isIndustrialSwitch, switchPortActive } from "./industrial-switch.js";
import { isIndustrialLcd, lcdPortActive } from "./industrial-lcd.js";
import { isIndustrialOdometer, odometerPortActive } from "./industrial-odometer.js";
import { isIndustrialSegment, segmentPortActive } from "./industrial-segment.js";
import { isIndustrialClock, clockPortActive } from "./industrial-clock.js";
import { isIndustrialWeather, weatherPortActive } from "./industrial-weather.js";
import { isIndustrialSection } from "./industrial-section.js";
import { isIndustrialHeating } from "./industrial-heating.js";

export function dockPointKey(anchorId) {
  return `dock_${anchorId.replaceAll("-", "_")}`;
}

export const OUTPUT_SIDES = [["top-center", "Oben"], ["bottom-center", "Unten"], ["right-center", "Rechts"], ["left-center", "Links"]];
export function hasSimpleOutput(widget) {
  if (isIndustrialHeating(widget)) return false;
  return !!widget && !isIndustrialSwitch(widget) && !isIndustrialLcd(widget) && !isIndustrialOdometer(widget) && !isIndustrialSegment(widget) && !isIndustrialClock(widget) && !isIndustrialWeather(widget) && !isIndustrialSection(widget) && !isSeparator(widget) && !["svg-connection", "linebox", "linebox-math", "value-converter"].includes(widget.type);
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
  if (isIndustrialHeating(widget)) return false;
  if (isIndustrialSwitch(widget)) return switchPortActive(widget, anchor, side);
  if (isIndustrialLcd(widget)) return lcdPortActive(widget, anchor, side);
  if (isIndustrialOdometer(widget)) return odometerPortActive(widget, anchor, side);
  if (isIndustrialSegment(widget)) return segmentPortActive(widget, anchor, side);
  if (isIndustrialClock(widget)) return clockPortActive(widget, anchor, side);
  if (isIndustrialWeather(widget)) return weatherPortActive(widget, anchor, side);
  if (isIndustrialSection(widget)) return false;
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
