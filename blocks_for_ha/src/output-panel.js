export function setupOutputPanel(onResize) {
  const key = 'ugso-blocks-for-ha-output-collapsed';
  const layout = document.querySelector('.editor-layout');
  const panel = document.querySelector('.output-panel');
  const content = document.createElement('div');
  content.id = 'output-content';
  content.append(...panel.childNodes); panel.append(content);
  const toggle = document.createElement('button');
  toggle.id = 'output-toggle'; toggle.type = 'button';
  toggle.setAttribute('aria-controls', content.id);
  panel.append(toggle);
  const rail = document.createElement('span');
  rail.className = 'output-rail-label'; rail.textContent = 'HA-Ausgabe';
  rail.setAttribute('aria-hidden', 'true'); panel.append(rail);
  let collapsed = false;
  try { collapsed = localStorage.getItem(key) === 'true'; } catch {}
  const apply = () => {
    layout.classList.toggle('output-collapsed', collapsed);
    content.hidden = collapsed; rail.hidden = !collapsed;
    toggle.textContent = collapsed ? '‹' : '›';
    toggle.title = collapsed ? 'HA-Ausgabe ausklappen' : 'HA-Ausgabe nach rechts einklappen';
    toggle.setAttribute('aria-label', toggle.title);
    toggle.setAttribute('aria-expanded', String(!collapsed));
  };
  toggle.addEventListener('click', () => {
    collapsed = !collapsed; apply();
    requestAnimationFrame(onResize);
    try { localStorage.setItem(key, String(collapsed)); } catch {}
  });
  apply();
}
