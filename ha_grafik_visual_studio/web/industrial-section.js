import { housingSpace } from "./housing-snap.js";

export const isIndustrialSection = widget => widget?.type === "ugso.industrial/section";
export const sectionCount = widget => Math.max(1, Math.min(4, Math.trunc(Number(widget.sectionCount) || 1)));
export const sectionRows = widget => Math.max(1, Math.min(4, Math.trunc(Number(widget.sectionRows) || 1)));
export function sectionSize(widget, changed = "height") {
  const count = sectionCount(widget), rows = sectionRows(widget), space = housingSpace(widget);
  const gapX = 2 * space * (count - 1), gapY = 2 * space * (rows - 1);
  const cell = Math.max(64, Math.min(Math.floor((4096-gapX)/count), Math.floor((4096-gapY)/rows), Math.round(changed === "width" ? (Number(widget.width)-gapX)/count : (Number(widget.height || 64)-gapY)/rows)));
  return { height: cell * rows + gapY, width: cell * count + gapX };
}
const color = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value || "") ? value : fallback;
export function renderIndustrialSection(widget, doc) {
  const root = doc.createElement("div"), style = widget.industrialStyle !== false;
  root.className = "industrial-section";
  root.classList.toggle("industrial-housing", style);
  root.style.borderRadius = `${Math.max(0, Math.min(200, Number(widget.radius ?? 4) || 0))}px`;
  root.style.borderColor = color(widget.industrialFrameColor, "#879097");
  root.style.borderWidth = `${style ? widget.industrialFrameWidthEnabled === true ? Math.max(1, Math.min(16, Number(widget.industrialFrameWidth) || 2)) : 2 : 0}px`;
  if (style && widget.industrialScrewsEnabled !== false) for (const corner of ["tl", "tr", "bl", "br"]) {
    const screw = doc.createElement("span"); screw.className = `industrial-screw ${corner}`; screw.textContent = "×"; root.append(screw);
  }
  return root;
}
