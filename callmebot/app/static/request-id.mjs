// Request IDs deduplicate sends; they are not authentication tokens.
let sequence = 0;
export function requestId(cryptoApi = globalThis.crypto) {
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();
  if (typeof cryptoApi?.getRandomValues === 'function') {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  return `request_${Date.now().toString(36)}_${(++sequence).toString(36)}_${Math.random().toString(36).slice(2)}`;
}
