export const appearanceKey = 'ugso-blocks-for-ha-appearance';
const modes = new Set(['light', 'dark', 'system']);

export function setupAppearance() {
  const system = matchMedia('(prefers-color-scheme: dark)');
  let mode = 'system';
  try { const saved = localStorage.getItem(appearanceKey); if (modes.has(saved)) mode = saved; } catch {}
  const label = document.createElement('label');
  label.className = 'appearance-label'; label.textContent = 'Darstellung';
  const select = document.createElement('select');
  select.id = 'appearance'; select.setAttribute('aria-label', 'Darstellung der App');
  for (const [value, text] of [['light', 'Hell'], ['dark', 'Dunkel'], ['system', 'System']]) select.add(new Option(text, value));
  label.append(select); document.querySelector('.header-right').prepend(label);
  const apply = () => {
    const dark = mode === 'dark' || (mode === 'system' && system.matches);
    document.documentElement.dataset.appearance = dark ? 'dark' : 'light';
    select.value = mode;
    for (const badge of document.querySelectorAll('.blockly-attribution img')) {
      badge.src = `./branding/built-with-blockly-badge-${dark ? 'black' : 'white'}.svg`;
    }
  };
  select.addEventListener('change', () => {
    mode = select.value; apply();
    try { localStorage.setItem(appearanceKey, mode); } catch {}
  });
  system.addEventListener('change', () => { if (mode === 'system') apply(); });
  window.addEventListener('storage', event => {
    if (event.key === appearanceKey) { mode = modes.has(event.newValue) ? event.newValue : 'system'; apply(); }
  });
  apply();
}
