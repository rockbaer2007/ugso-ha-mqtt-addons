/** Search HA names and IDs across entity and device metadata. */
function terms(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('de')
    .replace(/[_.-]+/g, ' ').trim().split(/\s+/).filter(Boolean);
}

export function entitySearchMatches(query, entity = {}, stateEntry = {}, device = {}) {
  const haystack = terms([
    entity.entity_id, entity.name_by_user, entity.name, entity.original_name,
    stateEntry.attributes?.friendly_name,
    device.name_by_user, device.name, device.model, device.manufacturer,
  ].filter(Boolean).join(' ')).join(' ');
  return terms(query).every(term => haystack.includes(term));
}
