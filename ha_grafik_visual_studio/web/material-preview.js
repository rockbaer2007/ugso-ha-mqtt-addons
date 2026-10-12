// Original static drawings: the palette never mounts live Material controls.
const paths={
  button:'<rect x="1" y="4" width="30" height="18" rx="4"/><path d="M8 13H24"/>',
  switch:'<rect x="1" y="4" width="30" height="18" rx="9"/><circle cx="22" cy="13" r="7"/>',
  checkbox:'<rect x="4" y="1" width="24" height="24" rx="3"/><path d="M8 13L14 19L25 6"/>',
  slider:'<path d="M1 13H31" stroke-width="3"/><circle cx="19" cy="13" r="6"/>',
  input:'<path d="M1 24H31M4 6H20M4 13H25M27 3V20"/>',
  calendar:'<rect x="1" y="1" width="30" height="24" rx="2"/><path d="M1 7H31M8 11H12M20 11H24M8 17H12M20 17H24"/>',
  list:'<path d="M1 4H5M1 13H5M1 22H5M9 4H31M9 13H31M9 22H31"/>',
  chart:'<path d="M1 0V25H32M4 20L11 11L19 17L30 3"/>',
  select:'<path d="M1 6H20M1 20H20M23 11L27 15L31 11"/>',
  table:'<rect x="1" y="1" width="30" height="24"/><path d="M1 8H31M1 17H31M11 1V25M21 1V25"/>',
  icon:'<path d="M16 1L20 9L30 10L23 17L25 25L16 21L7 25L9 17L2 10L12 9Z"/>',
  'slider-round':'<path d="M6 23A12 12 0 1 1 26 23"/><circle cx="25" cy="5" r="3"/>',
};
export function isMaterialDefinition(definition){return String(definition.render?.kind||'').startsWith('material-');}
export function renderMaterialPreview(definition,doc){
  if(!isMaterialDefinition(definition))return null;
  const kind=definition.defaults.materialKind,svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 32 26');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.5');svg.setAttribute('stroke-linejoin','round');
  svg.innerHTML=paths[kind]||paths[{'progress':'slider','progress-circular':'slider-round','autocomplete':'select','icon-list':'list','layout':'table'}[kind]]||'<rect x="1" y="1" width="30" height="24" rx="4"/><path d="M5 7H27M5 13H22M5 19H27"/>';
  return svg;
}
