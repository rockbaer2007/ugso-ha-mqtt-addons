import assert from 'node:assert/strict';
import { materialAppearance, renderMaterialColorSchemes } from '../web/material-color-schemes.js';
import { MATERIAL_PALETTES } from '../web/material-palettes.js';
const snapshot = JSON.stringify(MATERIAL_PALETTES);
assert.equal(Object.keys(MATERIAL_PALETTES).length, 26);
assert.equal(MATERIAL_PALETTES['material.red'][0], '#b71c1c');
assert.equal(MATERIAL_PALETTES['material.red'].at(-1), '#ffebee');
assert.equal(materialAppearance({designStyle:'legacy', themeMode:'dark'}).background, '#ffffff');
assert.equal(materialAppearance({designStyle:'project',themeMode:'project'}, {projectStyle:'legacy',pageTheme:'dark'}).background, '#ffffff');
assert.equal(materialAppearance({designStyle:'project',themeMode:'project'}, {projectStyle:'material3',pageTheme:'light'}).background, '#f7f2fa');
const doc = {createElement: () => ({style:{}, children:[], attributes:{}, append(...children){this.children.push(...children);}, setAttribute(key,value){this.attributes[key]=value;}})};
for (const designStyle of ['legacy','material3','project']) {
  const root = renderMaterialColorSchemes({designStyle,themeMode:'dark',heading:'<script>test</script>'}, doc);
  assert.equal(root.children.length, 27);
  assert.equal(root.children[0].textContent, '<script>test</script>');
  assert.equal(root.children[1].children.length, 8);
  assert.equal(root.children[1].children[1].style.backgroundColor, '#44739e');
}
assert.equal(JSON.stringify(MATERIAL_PALETTES), snapshot);
console.log('26 palette rows, unchanged swatches, project/style/theme resolution and text-safe titles verified.');
