// Templates remain source text; Home Assistant resolves them at execution time.
export function validActionEntity(value) {
  return typeof value === 'string' && (/^[a-z][a-z0-9_]*\.[a-z0-9_]+$/.test(value) || /\{\{[\s\S]*?\S[\s\S]*?\}\}|\{%[\s\S]*?\S[\s\S]*?%\}/.test(value));
}
