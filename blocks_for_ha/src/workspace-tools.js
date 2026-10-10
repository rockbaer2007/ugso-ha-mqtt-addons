import { Blockly } from './blocks.js';
import { WorkspaceSearch } from '@blockly/plugin-workspace-search';

export function setupWorkspaceTools(workspace) {
  Blockly.ShortcutItems.registerNavigationShortcuts();
  const search = new WorkspaceSearch(workspace);
  search.init();
  search.setSearchPlaceholder('Platzierte Blocks suchen …');
  const container = workspace.getInjectionDiv();
  container.querySelector('.blockly-ws-search input').setAttribute('aria-label', 'Platzierte Blocks suchen');
  for (const [selector, label] of [
    ['next', 'Nächster Treffer'], ['previous', 'Vorheriger Treffer'], ['close', 'Suche schließen'],
  ]) {
    const button = container.querySelector(`.blockly-ws-search-${selector}-btn`);
    button.setAttribute('aria-label', label);
    button.title = label;
  }
  const actions = document.querySelector('.canvas-actions');
  const button = document.createElement('button');
  button.id = 'workspace-search-open';
  button.textContent = 'Suchen';
  button.title = 'Platzierte Blocks suchen (Strg/Cmd+F im Arbeitsbereich)';
  button.setAttribute('aria-label', 'Blocks im Arbeitsbereich suchen');
  button.addEventListener('click', () => search.open());
  actions.append(button);

  const helpButton = document.createElement('button');
  helpButton.textContent = '?';
  helpButton.setAttribute('aria-label', 'Tastaturhilfe');
  helpButton.title = 'Tastaturhilfe';
  actions.append(helpButton);
  const help = document.createElement('dialog');
  help.id = 'keyboard-help';
  help.setAttribute('aria-labelledby', 'keyboard-help-title');
  help.innerHTML = `<h2 id="keyboard-help-title">Blocks per Tastatur</h2>
    <p>Tab bringt den Fokus in den Arbeitsbereich. Die folgenden Tasten gelten dort, außerhalb von Eingabefeldern.</p>
    <dl><dt>Strg/Cmd + F</dt><dd>Platzierte Blocks suchen. Enter: nächster Treffer; Umschalt + Enter: vorheriger Treffer; Escape: schließen.</dd>
    <dt>Pfeiltasten</dt><dd>Durch Blocks und Felder navigieren.</dd>
    <dt>Enter</dt><dd>Ein Feld bearbeiten oder einen Block aus der Toolbox einsetzen.</dd>
    <dt>T</dt><dd>Toolbox öffnen und fokussieren.</dd>
    <dt>M</dt><dd>Block aufnehmen; Pfeiltasten bewegen, Enter legt ihn ab.</dd>
    <dt>Pos1 / Ende</dt><dd>Anfang / Ende des Blocks.</dd>
    <dt>Bild auf / ab</dt><dd>Anfang / Ende des Blockstapels.</dd>
    <dt>Strg/Cmd + Pos1 / Ende</dt><dd>Erster / letzter Block.</dd>
    <dt>Strg/Cmd + Pfeiltasten</dt><dd>Arbeitsbereich scrollen.</dd>
    <dt>Entf / Rücktaste</dt><dd>Fokussierten Block löschen.</dd></dl>
    <p>Die Suche am Menüende findet verfügbare Bausteine zum Hinzufügen.</p>
    <form method="dialog"><button>Schließen</button></form>`;
  document.body.append(help);
  helpButton.addEventListener('click', () => help.showModal());
}
