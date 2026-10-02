// The textarea must live inside the modal: browsers prevent focus outside it.
export async function copyText(text, root, clipboard = globalThis.navigator?.clipboard) {
  if (clipboard?.writeText) {
    try { await clipboard.writeText(text); return; }
    catch { /* HTTP and embedded browsers may reject the modern API. */ }
  }
  const document = root.ownerDocument;
  const previousFocus = document.activeElement;
  const field = document.createElement("textarea");
  field.value = text;
  field.readOnly = true;
  field.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;";
  root.append(field);
  try {
    field.focus();
    field.select();
    field.setSelectionRange(0, text.length);
    if (!document.execCommand("copy")) throw new Error("Clipboard copy rejected");
  } finally {
    field.remove();
    previousFocus?.focus();
  }
}
