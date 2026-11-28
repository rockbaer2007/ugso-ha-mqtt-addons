// Blockly's floating input is outside the workspace DOM. Commit before another
// block or a toolbar action takes focus, without requiring Enter.
const committing = new WeakSet();
export function commitBlocklyField(Blockly, workspace, changed, input) {
  // Blockly 13 exposes no WidgetDiv.getOwner. Match its actual active input
  // against fields of this workspace rather than assuming a global owner API.
  const field = workspace.getAllBlocks(false).flatMap(block => block.inputList.flatMap(row => row.fieldRow))
    .find(candidate => candidate.htmlInput_ === input);
  if (committing.has(workspace) || !field || field.getSourceBlock?.()?.workspace !== workspace || !input?.classList?.contains('blocklyHtmlInput')) return false;
  committing.add(workspace);
  try {
    field.setValue(input.value);
    Blockly.WidgetDiv.hide();
    changed(Blockly.serialization.workspaces.save(workspace));
    return true;
  } finally { committing.delete(workspace); }
}
export function installBlocklyCommit(Blockly, workspace, changed) {
  const pointer = event => {
    const input = document.querySelector('.blocklyWidgetDiv .blocklyHtmlInput');
    if (input && event.target !== input && !input.contains(event.target)) commitBlocklyField(Blockly, workspace, changed, input);
  };
  const blur = event => commitBlocklyField(Blockly, workspace, changed, event.target);
  document.addEventListener('pointerdown', pointer, true);
  document.addEventListener('focusout', blur, true);
  return () => { document.removeEventListener('pointerdown', pointer, true); document.removeEventListener('focusout', blur, true); };
}
