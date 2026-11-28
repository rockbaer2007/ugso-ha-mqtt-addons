// Keep the saved comma/whitespace format of the multiple-state trigger.
export function entityList(value) {
  return [...new Set(String(value).split(/[\s,]+/).filter(Boolean))];
}
export function validEntityList(value) {
  const ids = entityList(value);
  return ids.length > 0 && ids.length <= 100 && ids.every(id => /^[a-z][a-z0-9_]*\.[a-z0-9_]+$/.test(id));
}
export function toggleEntityList(value, id) {
  const ids = new Set(entityList(value));
  if (ids.has(id)) ids.delete(id); else ids.add(id);
  return [...ids].join(', ');
}
