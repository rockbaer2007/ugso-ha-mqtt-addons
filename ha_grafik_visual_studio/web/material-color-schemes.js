import { MATERIAL_PALETTES } from './material-palettes.js';

export function materialAppearance(widget, { projectStyle = 'material3', pageTheme = 'dark' } = {}) {
  const style = widget.designStyle === 'project' ? projectStyle : widget.designStyle;
  const dark = (widget.themeMode === 'project' ? pageTheme : widget.themeMode) !== 'light';
  return style === 'material3'
    ? { background: dark ? '#1d1b20' : '#f7f2fa', text: dark ? '#e6e0e9' : '#1d1b20', primary: dark ? '#d0bcff' : '#6750a4', radius: '12px' }
    : { background: '#ffffff', text: '#000000', primary: '#44739e', radius: '0px' };
}

export function renderMaterialColorSchemes(widget, doc, settings) {
  const appearance = materialAppearance(widget, settings);
  const root = doc.createElement('div'); root.className = 'material-color-schemes';
  Object.assign(root.style, { background: appearance.background, color: appearance.text, borderRadius: appearance.radius });
  const title = doc.createElement('div'); title.className = 'material-schemes-title';
  title.textContent = widget.heading ?? 'Material Design Widgets Color Schemes Preview';
  title.style.color = appearance.primary;
  root.append(title);
  for (const [name, colors] of Object.entries(MATERIAL_PALETTES)) {
    const row = doc.createElement('div'); row.className = 'material-schemes-row';
    const label = doc.createElement('span'); label.textContent = `${name}:`; row.append(label);
    for (const color of colors) {
      const swatch = doc.createElement('span'); swatch.className = 'material-scheme-swatch';
      swatch.style.backgroundColor = color; swatch.title = `${name}: ${color}`;
      swatch.setAttribute('role', 'img'); swatch.setAttribute('aria-label', swatch.title);
      row.append(swatch);
    }
    root.append(row);
  }
  return root;
}
