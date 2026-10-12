// Original, inert Studio palette drawings. No upstream assets or live widgets.
const calendar = '<path d="M1 6H31M8 1V5M24 1V5"/><path d="M7 10H10M15 10H18M23 10H26M7 16H10M15 16H18M23 16H26M7 22H10M15 22H18M23 22H26"/>';
const drawings = {
  "universal-button": '<rect x="1" y="1" width="30" height="24" rx="4"/><circle cx="9" cy="10" r="4"/><path d="M17 7H27M17 12H25M5 20H27"/>',
  calendar,
  "event-calendar": calendar + '<rect x="3" y="12" width="10" height="3" fill="currentColor" stroke="none"/><rect x="17" y="18" width="12" height="3" fill="currentColor" stroke="none"/>',
  "styled-checkbox": '<rect x="5" y="1" width="22" height="24" rx="2"/><path d="M9 13L14 18L24 7" stroke-width="3"/>',
  "styled-slider": '<path d="M1 13H31" stroke-width="4"/><circle cx="19" cy="13" r="6" fill="var(--panel,white)"/>',
  "interactive-table": '<path d="M0 6H32M0 13H32M0 20H32M10 0V26M22 0V26"/><rect width="32" height="6" fill="currentColor" fill-opacity=".25" stroke="none"/>',
  marquee: '<path d="M1 6H31M1 20H31M10 13H29M1 13L6 8M1 13L6 18"/><path d="M15 10V16M20 10V16M25 10V16" stroke-width="1"/>',
  "interactive-value-list": '<circle cx="3" cy="4" r="2" fill="currentColor"/><circle cx="3" cy="13" r="2" fill="currentColor"/><circle cx="3" cy="22" r="2" fill="currentColor"/><path d="M9 4H31M9 13H27M9 22H31"/>',
  "styled-switch": '<rect x="1" y="4" width="30" height="18" rx="9" fill="currentColor" fill-opacity=".25"/><circle cx="22" cy="13" r="8" fill="var(--panel,white)"/>',
  "radial-slider": '<path d="M7 22A12 12 0 1 1 25 22" stroke-width="3"/><circle cx="25" cy="5" r="3" fill="var(--panel,white)"/><path d="M12 14H20"/>',
  dropdown: '<path d="M1 6H18M1 13H15M1 20H18M23 10L27 15L31 10"/>',
};
export const INTERACTIVE_PREVIEW_TYPES = Object.freeze(Object.keys(drawings));
export function renderInteractivePreview(type, doc) {
  if (!Object.hasOwn(drawings, type)) return null;
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 32 26"); svg.setAttribute("aria-hidden", "true"); svg.setAttribute("focusable", "false");
  svg.setAttribute("fill", "none"); svg.setAttribute("stroke", "currentColor"); svg.setAttribute("stroke-width", "1.5");
  svg.setAttribute("stroke-linecap", "round"); svg.setAttribute("stroke-linejoin", "round");
  svg.innerHTML = drawings[type];
  return svg;
}
