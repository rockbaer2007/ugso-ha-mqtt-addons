import test from 'node:test';
import assert from 'node:assert/strict';
import { Blockly, knownTypes, toolbox } from '../src/blocks.js';
import { themes, savedTheme, labelInk } from '../src/themes.js';
test('All UGSo blocks and categories have theme styles; original palettes reach own blocks', () => {
  const ws = new Blockly.Workspace();
  globalThis.document = Blockly.utils.xml.createElement('div').ownerDocument;
  globalThis.HTMLElement = document.defaultView.HTMLElement;
  try {
    for (const type of knownTypes) {
      if (!type.startsWith('ugso_')) continue;
      const b = ws.newBlock(type), style = b.getStyleName();
      assert.ok(style.startsWith('ugso_'), type);
      for (const theme of Object.values(themes)) assert.ok(theme.blockStyles[style], `${type}:${theme.name}`);
    }
    for (const category of toolbox.contents.filter(c => c.kind === 'category')) for (const theme of Object.values(themes)) assert.ok(theme.categoryStyles[category.categorystyle], category.name);
    assert.equal(themes.standard.blockStyles.ugso_math.colourPrimary, '#5e62a1');
    assert.equal(themes.tritanopia.blockStyles.ugso_math.colourPrimary, '#e6da39');
    assert.notEqual(themes.dark.componentStyles.toolboxBackgroundColour, themes.dark.componentStyles.flyoutBackgroundColour);
  } finally { ws.dispose(); }
});
test('Saved theme rejects unknown preferences and handles inaccessible storage', () => {
  for (const id of Object.keys(themes)) assert.equal(savedTheme({ getItem: () => id }), id);
  assert.equal(savedTheme({ getItem: () => 'missing' }), 'standard');
  assert.equal(savedTheme(() => { throw new Error('blocked'); }), 'standard');
  assert.equal(labelInk('#e6da39'), '#10232b'); assert.equal(labelInk('#1e1e1e'), '#ffffff');
});
