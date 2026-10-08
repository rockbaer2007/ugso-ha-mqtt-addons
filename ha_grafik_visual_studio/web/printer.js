// Independent implementation; inspiration: ADNPolymerase/ha-printer-card (MIT).
export const isPrinter = widget => widget.type === 'ugso.printer/printer';
export const cartridgeCount = widget => Math.min(6, Math.max(1, Math.trunc(Number(widget.cartridgeCount) || 4)));
export function printerBindings(widget) {
  return [...new Set([widget.entityId, widget.messageEntityId, widget.powerEntityId, widget.pagesEntityId,
    ...Array.from({length: cartridgeCount(widget)}, (_, i) => widget[`cartridge${i + 1}EntityId`])].filter(Boolean))];
}
export function printerNumber(value) {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
export function printerStatus(value, reason = '') {
  const text = String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_-]+/g, ' ');
  if (!text || /^(unknown|unavailable|offline|unreachable|off|aus|inconnu|indisponible)$/.test(text)) return text && text !== 'unknown' && text !== 'inconnu' ? 'offline' : 'unknown';
  const details = `${text} ${String(reason).toLowerCase()}`;
  if (/jam|bourrage|papierstau|stopped|error|erreur|fehler|out of paper|media-empty|media-needed|cover.open/.test(details)) return 'stopped';
  if (/printing|processing|busy|copying|druckt|drucken|impression|imprime|warming/.test(text)) return 'printing';
  if (/warning|warnung|toner.low|low.ink|attention|supply-low/.test(details)) return 'warning';
  if (/sleep|power.?save|veille|eco|ruhezustand|energiespar/.test(text)) return 'sleep';
  if (/^(idle|ready|online|normal|standby|bereit|pret|disponible|on)$/.test(text)) return 'ready';
  return 'unknown';
}
export function printerCartridges(widget, states = {}) {
  const threshold = Math.min(100, Math.max(0, printerNumber(widget.lowThreshold) ?? 20));
  return Array.from({length: cartridgeCount(widget)}, (_, i) => {
    const prefix = `cartridge${i + 1}`, entity = widget[prefix + 'EntityId'];
    const raw = printerNumber(states[entity]?.state), level = raw == null ? null : Math.min(100, Math.max(0, raw));
    return {entity, name: widget[prefix + 'Name'] || states[entity]?.attributes?.friendly_name || String(i + 1),
      color: widget[prefix + 'Color'] || '#313b46', level, low: level != null && level <= threshold};
  });
}

const words = {
  de: {ready:'Bereit', printing:'Druckt', sleep:'Ruhezustand', warning:'Hinweis', stopped:'Gestoppt', offline:'Offline', unknown:'Unbekannt', pages:'Seiten', low:'Füllstand niedrig', ink:'Patronen', toner:'Toner'},
  en: {ready:'Ready', printing:'Printing', sleep:'Sleep', warning:'Attention', stopped:'Stopped', offline:'Offline', unknown:'Unknown', pages:'Pages', low:'Low supply', ink:'Cartridges', toner:'Toner'},
  fr: {ready:'Prêt', printing:'Impression', sleep:'Veille', warning:'Attention', stopped:'Arrêté', offline:'Hors ligne', unknown:'Inconnu', pages:'Pages', low:'Niveau faible', ink:'Cartouches', toner:'Toner'},
};
let drawingId = 0;
function printerDrawing(doc, model, status, label) {
  const ns = 'http://www.w3.org/2000/svg', id = `ugso-printer-${++drawingId}`;
  const svg = doc.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 360 220');
  svg.classList.add('printer-drawing'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label);
  // Static, original artwork. All entity and user text is inserted with textContent below.
  svg.innerHTML = `<defs>
    <linearGradient id="${id}-body" x2="0" y2="1"><stop stop-color="#d6e0e7"/><stop offset="1" stop-color="#8698a7"/></linearGradient>
    <linearGradient id="${id}-face" x2="0" y2="1"><stop stop-color="#445569"/><stop offset="1" stop-color="#263647"/></linearGradient>
  </defs>
  <ellipse cx="180" cy="207" rx="139" ry="9" fill="#000" opacity=".16"/>
  <g class="printer-machine">
    <path d="M89 70V24H270V74" fill="#edf3f7" stroke="#687b8d" stroke-width="3"/>
    <path d="M108 39H250M108 49H234M108 59H242" stroke="#c3cfd8" stroke-width="3"/>
    <rect x="40" y="68" width="280" height="126" rx="22" fill="url(#${id}-body)" stroke="#617586" stroke-width="3"/>
    <path d="M49 84Q49 73 62 73H298Q312 73 312 86V111H49Z" fill="#edf3f7"/>
    <rect x="56" y="112" width="248" height="70" rx="12" fill="url(#${id}-face)"/>
    <rect x="112" y="143" width="137" height="9" rx="4" fill="#0c1825"/>
    <rect x="74" y="83" width="58" height="20" rx="4" fill="#142c3c"/>
    <path d="M82 93H106M111 93H124" stroke="#83d4ed" stroke-width="3" stroke-linecap="round"/>
    <circle class="printer-led" cx="280" cy="94" r="5" fill="currentColor"/>
    <g class="printer-sheet"><path d="M121 149H240L253 197H108Z" fill="#f5f8fa" stroke="#c4d1da" stroke-width="2"/>
      <path d="M133 160H230M130 169H221M127 179H234" stroke="#a7b8c5" stroke-width="3"/></g>
  </g>`;
  if (model === 'mfp' || model === 'office') {
    const lid = doc.createElementNS(ns, 'path'); lid.setAttribute('d', 'M41 71L63 43H297L320 71Z');
    lid.setAttribute('fill', '#657b8d'); lid.setAttribute('stroke', '#35495b'); lid.setAttribute('stroke-width', '3');
    svg.querySelector('.printer-machine').prepend(lid);
  }
  if (model === 'office') {
    const tray = doc.createElementNS(ns, 'path'); tray.setAttribute('d', 'M48 181H312V202H48ZM63 191H298');
    tray.setAttribute('fill', '#9bafbf'); tray.setAttribute('stroke', '#526c80'); tray.setAttribute('stroke-width', '3');
    svg.querySelector('.printer-machine').append(tray);
  }
  if (status === 'stopped') {
    const alert = doc.createElementNS(ns, 'path'); alert.setAttribute('d', 'M283 121L306 161H260Z');
    alert.setAttribute('fill', '#ffbd59'); alert.setAttribute('stroke', '#40341e'); alert.setAttribute('stroke-width', '2'); svg.append(alert);
    const mark = doc.createElementNS(ns, 'text'); mark.setAttribute('x','283'); mark.setAttribute('y','153'); mark.setAttribute('text-anchor','middle');
    mark.setAttribute('fill','#40341e'); mark.setAttribute('font-size','26'); mark.setAttribute('font-weight','bold'); mark.textContent='!'; svg.append(mark);
  }
  return svg;
}
export function renderPrinter(widget, doc, {states = {}, locale = 'de'} = {}) {
  const lang = words[locale.slice(0, 2)] || words.de, state = states[widget.entityId];
  const reason = state?.attributes?.state_reason, status = printerStatus(state?.state, reason);
  const cartridges = printerCartridges(widget, states), lows = cartridges.filter(c => c.low);
  const root = doc.createElement('div'); root.className = 'printer-widget'; root.dataset.status = status;
  root.style.setProperty('--printer-bg', widget.printerBackground || '#17242d');
  root.style.setProperty('--printer-text', widget.printerText || '#e7edf2');
  root.style.setProperty('--printer-accent', widget.accentColor || '#61c5ef');
  root.style.setProperty('--printer-columns', String(cartridges.length));
  const make = (tag, cls, text) => {const node = doc.createElement(tag); node.className = cls; if (text != null) node.textContent = text; return node;};
  const header = make('div', 'printer-header'), title = make('strong', 'printer-title', widget.heading || state?.attributes?.friendly_name || 'UGSo Printer');
  title.title = title.textContent;
  const badge = make('span','printer-status',lang[status]); badge.title = String(state?.state ?? '—');
  header.append(title, badge); root.append(header);
  const figure = make('div', 'printer-figure'); figure.append(printerDrawing(doc, widget.printerModel, status, title.textContent + ': ' + lang[status])); root.append(figure);
  if (widget.showMessage !== false) {
    const value = widget.messageEntityId ? states[widget.messageEntityId]?.state : state?.attributes?.state_message || reason;
    const message = make('div','printer-message',Array.isArray(value) ? value.join(', ') : value || ''); message.title = message.textContent; root.append(message);
  }
  const metrics = make('div','printer-metrics');
  for (const [key, label, unit] of [['powerEntityId', '', 'W'], ['pagesEntityId', lang.pages, '']]) {
    if (!widget[key]) continue;
    const sensor = states[widget[key]], value = printerNumber(sensor?.state);
    const text = value == null ? '—' : new Intl.NumberFormat(locale, {maximumFractionDigits:key === 'pagesEntityId' ? 0 : 1}).format(value);
    metrics.append(make('span','printer-metric', [label, text, sensor?.attributes?.unit_of_measurement || unit].filter(Boolean).join(' ')));
  }
  if (metrics.childNodes.length) root.append(metrics);
  const supplies = make('div','printer-supplies'); supplies.setAttribute('role','list'); supplies.setAttribute('aria-label',lang[widget.supplyStyle === 'toner' ? 'toner' : 'ink']);
  for (const supply of cartridges) {
    const item = make('div','printer-cartridge'); item.dataset.low = String(supply.low); item.dataset.unknown = String(supply.level == null);
    item.setAttribute('role','listitem'); item.style.setProperty('--ink-color', supply.color);
    const value = supply.level == null ? '—' : new Intl.NumberFormat(locale, {maximumFractionDigits:0}).format(supply.level) + ' %';
    item.title = `${supply.name}: ${value}${supply.low ? ' · ' + lang.low : ''}`;
    item.setAttribute('aria-label',item.title);
    const name = make('span','printer-ink-name',supply.name), shell = make('div','printer-cartridge-shell');
    shell.dataset.style = widget.supplyStyle === 'toner' ? 'toner' : 'ink';
    const fill = make('div','printer-ink-fill'); fill.style.height = (supply.level ?? 0) + '%';
    shell.append(fill); item.append(name, shell, make('strong','printer-ink-level',value)); supplies.append(item);
  }
  root.append(supplies);
  const alert = make('div','printer-low-alert', lows.length ? `${lang.low}: ${lows.map(c => c.name).join(', ')}` : '');
  alert.title = alert.textContent; root.append(alert);
  return root;
}
