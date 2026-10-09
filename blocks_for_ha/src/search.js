import '@blockly/toolbox-search';
import { Blockly, toolbox } from './blocks.js';
const SearchCategory = Blockly.registry.getClass(Blockly.registry.Type.TOOLBOX_ITEM, 'search');
class GermanSearchCategory extends SearchCategory {
  createDom_() {
    const dom = super.createDom_();
    const input = dom.querySelector('input');
    input.placeholder = 'Blocks suchen'; input.setAttribute('aria-label', 'Blocks suchen');
    input.addEventListener('input', () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Unidentified' })));
    return dom;
  }
  getContents() {
    return super.getContents().map(item => item.kind === 'label' ? { ...item, text: item.text === 'No matching blocks found' ? 'Keine passenden Blocks' : 'Suchbegriff eingeben' } : item);
  }
}
Blockly.registry.register(Blockly.registry.Type.TOOLBOX_ITEM, 'ugso_search', GermanSearchCategory);
toolbox.contents.push({ kind: 'ugso_search', name: 'Suche', contents: [] });
