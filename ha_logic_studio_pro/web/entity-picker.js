// Shared, ingress-relative HA-style picker. Selecting never grants runtime access.
const copy = {
  de: {search: 'Durchsuchen', empty: 'Keine passenden Entitäten.', loading: 'Entitäten werden gelesen …', more: 'Weitere anzeigen', clear: 'Auswahl leeren', open: 'Entitäten anzeigen', failed: 'HA-Entitäten sind nicht verfügbar.'},
  en: {search: 'Search', empty: 'No matching entities.', loading: 'Reading entities …', more: 'Show more', clear: 'Clear selection', open: 'Show entities', failed: 'HA entities are unavailable.'},
  fr: {search: 'Rechercher', empty: 'Aucune entité correspondante.', loading: 'Lecture des entités …', more: 'Afficher plus', clear: 'Effacer la sélection', open: 'Afficher les entités', failed: 'Les entités HA sont indisponibles.'},
};
const paths = {
  light: 'M9 18h6m-6 3h6M8 13a6 6 0 1 1 8 0l-1 3H9z',
  switch: 'M8 6h8a6 6 0 0 1 0 12H8A6 6 0 0 1 8 6Zm0 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  sensor: 'M4 17a9 9 0 1 1 16 0M12 12l4-4M8 20h8',
  binary_sensor: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-4 9 3 3 5-6',
  temperature: 'M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0Zm2-5v9',
  power: 'm13 2-8 12h6l-1 8 9-13h-7z',
  cover: 'M4 3h16v18H4zM4 7h16M4 11h16M4 15h16M10 19h4',
  default: 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5',
};
function node(tag, className, text) {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (text !== undefined) result.textContent = text;
  return result;
}
export function entityContext(item) {
  return [...new Set([item.area, item.device].filter(Boolean))].join(' › ');
}
export function entityIcon(item) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', paths[item.device_class] ?? paths[item.domain ?? item.entity_id?.split('.')[0]] ?? paths.default);
  svg.append(path);
  return svg;
}
export async function loadEntityPage(search, {signal, offset = 0, domains = [], output = false} = {}) {
  const query = new URLSearchParams({q: search, offset: String(offset), domain: domains.join(','), output: output ? '1' : '0'});
  const response = await fetch('./api/entities?' + query, {signal});
  if (!response.ok) throw new Error('HA entities unavailable');
  return response.json();
}

let nextPicker = 0;
export function createEntityPicker({locale = 'de', current = '', load = loadEntityPage,
  onSelect, onClear, extra, selected = item => item.entity_id === current, placeholder} = {}) {
  const text = copy[locale] ?? copy.en;
  const root = node('div', 'ha-entity-picker');
  root.dataset.userText = '';
  const field = node('div', 'ha-entity-selected');
  const toggle = node('button', 'ha-entity-toggle');
  toggle.type = 'button';
  const caption = node('span', 'ha-entity-caption', current || placeholder || text.open);
  toggle.append(entityIcon({entity_id: current}), caption, node('span', 'ha-entity-chevron', '▾'));
  const clear = node('button', 'ha-entity-clear', '×');
  clear.type = 'button';
  clear.setAttribute('aria-label', text.clear);
  clear.hidden = !current;
  field.append(toggle, clear);
  const panel = node('div', 'ha-entity-panel');
  const searchBox = node('div', 'ha-entity-search');
  const search = node('input');
  search.type = 'search';
  search.placeholder = placeholder || text.search;
  search.setAttribute('aria-label', text.search);
  search.setAttribute('role', 'combobox');
  search.setAttribute('aria-autocomplete', 'list');
  search.autocomplete = 'off';
  const list = node('div', 'ha-entity-list');
  list.id = 'ha-entity-list-' + ++nextPicker;
  list.setAttribute('role', 'listbox');
  search.setAttribute('aria-controls', list.id);
  toggle.setAttribute('aria-controls', list.id);
  const status = node('div', 'ha-entity-status');
  status.setAttribute('role', 'status');
  const more = node('button', 'ha-entity-more', text.more);
  more.type = 'button';
  more.hidden = true;
  searchBox.append(node('span', 'ha-entity-search-icon', '⌕'), search);
  panel.append(searchBox, list, status, more);
  root.append(field, panel);
  let controller, timer, sequence = 0, items = [], rows = [], active = -1, disposed = false;
  let known = new Map();
  const show = open => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    search.setAttribute('aria-expanded', String(open));
  };
  function setCurrent(value, item = known.get(value)) {
    current = value || '';
    caption.replaceChildren(node('strong', '', item?.name || current || placeholder || text.open));
    if (item && item.name !== current) caption.append(node('small', '', current));
    clear.hidden = !current;
    toggle.firstChild.replaceWith(entityIcon(item ?? {entity_id: current}));
  }
  function syncSelection() {
    rows.forEach((row, index) => {
      const chosen = Boolean(selected(items[index]));
      row.setAttribute('aria-selected', String(chosen));
      row.querySelector('.ha-entity-check').textContent = chosen ? '✓' : '';
    });
  }
  function focusRow(index) {
    if (!rows.length) return;
    active = Math.max(0, Math.min(rows.length - 1, index));
    rows.forEach((row, i) => row.classList.toggle('ha-entity-active', i === active));
    search.setAttribute('aria-activedescendant', rows[active].id);
    rows[active].scrollIntoView?.({block: 'nearest'});
  }
  function render() {
    list.replaceChildren();
    rows = [];
    for (const item of items) {
      const wrapper = node('div', 'ha-entity-option');
      const row = node('button', 'ha-entity-row');
      row.type = 'button';
      row.tabIndex = -1;
      row.id = list.id + '-' + rows.length;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', String(Boolean(selected(item))));
      row.append(entityIcon(item));
      const body = node('span', 'ha-entity-body');
      body.append(node('strong', '', item.name || item.entity_id));
      const context = entityContext(item);
      if (context) body.append(node('small', 'ha-entity-context', context));
      body.append(node('small', 'ha-entity-id', item.entity_id));
      row.append(body);
      if (item.state !== undefined) row.append(node('span', 'ha-entity-state', String(item.state) + (item.unit ? ' ' + item.unit : '')));
      row.append(node('span', 'ha-entity-check', selected(item) ? '✓' : ''));
      const additional = extra?.(item);
      row.onclick = () => {
        setCurrent(item.entity_id, item);
        onSelect?.(item, additional);
        syncSelection();
      };
      wrapper.append(row);
      if (additional) wrapper.append(additional);
      rows.push(row);
      list.append(wrapper);
    }
    active = -1;
    search.removeAttribute('aria-activedescendant');
  }
  async function refresh(append = false) {
    controller?.abort();
    controller = new AbortController();
    const request = ++sequence;
    status.textContent = text.loading;
    more.hidden = true;
    list.setAttribute('aria-busy', 'true');
    if (!append) { items = []; render(); }
    try {
      const data = await load(search.value.trim(), {signal: controller.signal, offset: append ? items.length : 0});
      if (disposed || request !== sequence) return;
      const incoming = Array.isArray(data) ? data : data.items;
      const all = new Map(items.map(item => [item.entity_id, item]));
      for (const item of incoming) {
        if (typeof item.entity_id !== 'string') continue;
        all.set(item.entity_id, item);
        known.set(item.entity_id, item);
      }
      items = [...all.values()];
      render();
      setCurrent(current);
      status.textContent = items.length ? '' : text.empty;
      more.hidden = !items.length || items.length >= (data.total ?? items.length);
    } catch (error) {
      if (disposed || request !== sequence || error.name === 'AbortError') return;
      status.textContent = text.failed;
    } finally {
      if (request === sequence) list.removeAttribute('aria-busy');
    }
  }
  toggle.onclick = () => { show(panel.hidden); if (!panel.hidden) search.focus(); };
  clear.onclick = () => { setCurrent(''); onClear?.(); syncSelection(); show(true); search.focus(); };
  more.onclick = () => void refresh(true);
  search.oninput = () => {
    clearTimeout(timer);
    controller?.abort();
    sequence++;
    timer = setTimeout(() => void refresh(), 150);
  };
  search.onkeydown = event => {
    if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      focusRow(active + (event.key === 'ArrowDown' ? 1 : -1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (active >= 0) rows[active].click();
    } else if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); show(false); toggle.focus();
    }
  };
  show(true);
  return {root, search, refresh, setCurrent, focus: () => search.focus(), destroy() {
    disposed = true; sequence++; clearTimeout(timer); controller?.abort();
  }};
}
