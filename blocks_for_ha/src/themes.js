import * as BlocklyModule from 'blockly/core';
import * as DarkModule from '@blockly/theme-dark';
import * as ModernModule from '@blockly/theme-modern';
import * as TritanopiaModule from '@blockly/theme-tritanopia';
const Blockly = Reflect.get(BlocklyModule, 'default') || BlocklyModule;
const unwrap = module => module.default?.default || module.default || module;
const bases = { standard: Blockly.Themes.Classic, dark: unwrap(DarkModule), modern: unwrap(ModernModule), tritanopia: unwrap(TritanopiaModule) };
// Preserve original UGSo colours in Standard/Dark; map standard groups to upstream palettes.
const groups = {
  '#187b72': ['root', 'logic_blocks', '#24635e'],
  '#2682a5': ['action', 'logic_blocks', '#254e72'],
  '#2e7653': ['values', 'text_blocks', null],
  '#6860b5': ['logic', 'logic_blocks', null],
  '#b26c24': ['trigger', 'logic_blocks', '#db8f39'],
  '#a54879': ['variable', 'variable_blocks', null],
  '#8056a1': ['time', 'procedure_blocks', '#005b63'],
  '#9463a6': ['conversion', 'math_blocks', '#7b293c'],
  '#7a8639': ['timeout', 'loop_blocks', '#4c565d'],
  '#967b44': ['object', 'list_blocks', '#39596f'],
  '#3e8054': ['loop', 'loop_blocks', null],
  '#7658a0': ['list', 'list_blocks', null],
  '#5e62a1': ['math', 'math_blocks', null],
  '#397b68': ['text', 'text_blocks', null],
  '#ad6841': ['colour', 'colour_blocks', null],
  '#8a6635': ['template', 'procedure_blocks', '#4c3f73'],
  '#87579d': ['function', 'procedure_blocks', null]
};
export const themeKey = 'ugso-blocks-for-ha-theme-v1';
export const themeOptions = [['standard', 'UGSo Standard'], ['dark', 'Dark'], ['modern', 'Modern'], ['tritanopia', 'Tritanopia']];
export const themes = Object.fromEntries(themeOptions.map(([id]) => {
  const base = bases[id], blockStyles = {}, categoryStyles = {};
  for (const [colour, [group, upstream, accessible]] of Object.entries(groups)) {
    const palette = id === 'standard' || id === 'dark' ? { colourPrimary: colour } : id === 'tritanopia' && accessible ? { colourPrimary: accessible } : { ...base.blockStyles[upstream] };
    blockStyles[`ugso_${group}`] = palette;
    categoryStyles[`ugso_${group}_category`] = { colour: palette.colourPrimary };
  }
  const dark = id === 'dark';
  return [id, Blockly.Theme.defineTheme(`ugso_${id}`, {
    base, blockStyles, categoryStyles,
    fontStyle: { family: 'Segoe UI, sans-serif', size: 12, weight: 'normal' },
    componentStyles: { ...(dark ? {} : { workspaceBackgroundColour: '#fafcfb' }), toolboxBackgroundColour: dark ? '#25313c' : '#20313c', toolboxForegroundColour: '#f4f7fa', flyoutBackgroundColour: dark ? '#151d25' : '#eaf0f5', flyoutForegroundColour: dark ? '#eef4f8' : '#233a36', flyoutOpacity: 1 }
  })];
}));
export function themedDefinition(definition) {
  const group = groups[definition.colour]?.[0];
  if (!group) throw new Error(`Theme: unbekannte Blockfarbe ${definition.colour}`);
  const { colour, ...rest } = definition;
  return { ...rest, style: `ugso_${group}` };
}
export function themedCategories(toolbox) {
  for (const category of toolbox.contents) {
    const group = groups[category.colour]?.[0];
    if (group) { category.categorystyle = `ugso_${group}_category`; delete category.colour; }
  }
}
export function savedTheme(storage) {
  try { const id = (typeof storage === 'function' ? storage() : storage).getItem(themeKey); return Object.hasOwn(themes, id) ? id : 'standard'; } catch { return 'standard'; }
}
export function labelInk(colour) {
  const hex = Blockly.utils.colour.parse(colour);
  if (!hex) return '#ffffff';
  const values = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  const luminance = values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
  return luminance > .179 ? '#10232b' : '#ffffff';
}
// Application adapter: update only label ink, preserving original plugin palettes.
const applyColour = Blockly.BlockSvg.prototype.applyColour;
Blockly.BlockSvg.prototype.applyColour = function () {
  applyColour.call(this);
  this.getSvgRoot()?.style.setProperty('--ugso-label-ink', labelInk(this.getColour()));
};
