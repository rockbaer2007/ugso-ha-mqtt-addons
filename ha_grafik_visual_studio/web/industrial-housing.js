export const INDUSTRIAL_BACKGROUND = "#263238";

// Apply only to the housing root; display surfaces keep their own colors.
export function applyIndustrialBackground(widget, root) {
  if (!root || widget.industrialBackgroundEnabled !== true) return;
  root.style.background = /^#[0-9a-f]{6}$/i.test(widget.industrialBackgroundColor || "") ? widget.industrialBackgroundColor : INDUSTRIAL_BACKGROUND;
}
