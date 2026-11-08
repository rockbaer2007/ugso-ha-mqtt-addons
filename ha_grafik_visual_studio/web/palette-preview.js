const descriptions={
  switch:['Schaltet eine HA-Entität ein oder aus und zeigt ihren Zustand.','Turn an HA entity on or off and display its state.','Commande marche/arrêt et affichage de l’état HA.'],
  dimmer:['Licht schalten und seine Helligkeit einstellen.','Switch a light and adjust its brightness.','Allumer une lumière et régler sa luminosité.'],
  color:['Licht mit Helligkeit und unterstützter RGB-Farbe steuern.','Control a light with brightness and supported RGB color.','Commander la luminosité et la couleur RGB prise en charge.'],
  thermostat:['Temperatur anzeigen und den unterstützten Sollwert einstellen.','Display temperature and adjust the supported setpoint.','Afficher la température et régler la consigne prise en charge.'],
  value:['Zustand und Einheit einer HA-Entität lesend anzeigen.','Display an HA entity state and unit, read-only.','Afficher l’état et l’unité HA en lecture seule.'],
  clock:['Uhrzeit als analoge oder digitale Miniaturansicht.','Analog or digital clock display.','Affichage analogique ou numérique de l’heure.'],
  gauge:['Numerischen Wert mit Skala und Zeiger darstellen.','Display a numeric value using a scale and pointer.','Afficher une valeur numérique avec échelle et aiguille.'],
};
export const nameOnlyPalette=(set,definition)=>/^ugso\b/i.test(set.label||'')||['svg-connection','linebox','linebox-math'].includes(definition.type);
export function paletteDescription(definition,locale='de'){
  const index=locale==='fr'?2:locale==='en'?1:0;
  const kind=definition.defaults?.deviceKind||(/clock/.test(definition.type)?'clock':/gauge/.test(definition.type)?'gauge':null);
  if(kind&&descriptions[kind])return descriptions[kind][index];
  return ['Widget auf die Arbeitsfläche setzen und Inhalt, HA-Quelle sowie Darstellung in den Eigenschaften konfigurieren.','Add the widget to the canvas and configure content, HA source and appearance in its properties.','Ajouter le widget sur la surface puis configurer le contenu, la source HA et la présentation dans ses propriétés.'][index];
}
export function deviceMiniature(definition,doc){
  const kind=definition.defaults?.deviceKind||(/clock/.test(definition.type)?'clock':/gauge/.test(definition.type)?'gauge':null);if(!kind)return null;
  const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 120 60');
  const designs={switch:'<rect x="32" y="21" width="56" height="24" rx="12" fill="#82919e"/><circle cx="75" cy="33" r="9" fill="#f1f5f9"/>',dimmer:'<circle cx="60" cy="20" r="12" fill="#d5dce5"/><path d="M53 36h14M56 42h8" stroke="#d5dce5" stroke-width="3"/><path d="M25 53h70" stroke="#6d7b88" stroke-width="4"/><circle cx="67" cy="53" r="5" fill="#38bdf8"/>',color:'<circle cx="50" cy="25" r="15" fill="#ef5350"/><circle cx="69" cy="25" r="15" fill="#4caf50" opacity=".85"/><circle cx="60" cy="40" r="15" fill="#2196f3" opacity=".85"/>',thermostat:'<path d="M38 43a25 25 0 1 1 44 0" fill="none" stroke="#7a8a99" stroke-width="5"/><text x="60" y="38" text-anchor="middle" fill="#eef2f7" font-size="21">21°</text>',value:'<text x="60" y="36" text-anchor="middle" fill="#eef2f7" font-size="25">21.4°</text>'};
  // Static artwork owned by Studio, never derived from package/user HTML.
  designs.clock='<rect x="8" y="10" width="104" height="40" rx="20" fill="#202b38" stroke="#9c7fea" stroke-width="3"/><circle cx="28" cy="30" r="9" fill="none" stroke="#9c7fea" stroke-width="2"/><path d="M28 24v6l5 3" fill="none" stroke="#9c7fea" stroke-width="2"/><text x="45" y="37" fill="#eef2f7" font-size="21">14:25</text>';
  designs.gauge='<path d="M18 51a42 42 0 0 1 84 0" fill="none" stroke="#78909c" stroke-width="9"/><path d="M24 31a42 42 0 0 1 32-22" fill="none" stroke="#66bb6a" stroke-width="9"/><path d="M60 9a42 42 0 0 1 28 12" fill="none" stroke="#ffca28" stroke-width="9"/><path d="M90 24a42 42 0 0 1 12 27" fill="none" stroke="#ef5350" stroke-width="9"/><path d="M58 51l22-29-15 33Z" fill="#e3eaf0"/>';
  svg.innerHTML=designs[kind]||'';return svg;
}
