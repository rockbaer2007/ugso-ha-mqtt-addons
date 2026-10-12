// Shared, inert helpers. No ioBroker bindings or executable user expressions.
export const number = (value, fallback = 0) => value !== '' && value != null && Number.isFinite(Number(value)) ? Number(value) : fallback;
export const bounded = (value, fallback, min, max) => Math.min(max, Math.max(min, number(value, fallback)));
export const truth = value => [true, 1, '1', 'true', 'on'].includes(value);
export function el(doc, tag, text, className) { const node = doc.createElement(tag); if (text != null) node.textContent = String(text); if (className) node.className = className; return node; }
export function image(doc, value, size, color, context) { const node = el(doc, 'img', null, 'material-widget-icon'); node.alt = ''; node.width = node.height = bounded(size, 24, 8, 200); context.icon?.(node, value && !value.includes(':') && !value.includes('/') ? `mdi:${value}` : value, color); return node; }
export function feedback(w, doc) {
  if (w.vibrateOnMobilDevices) doc.defaultView?.navigator?.vibrate?.(bounded(w.vibrateOnMobilDevices, 0, 0, 1000));
  if (!w.clickSoundPlay) return;
  try { const Audio = doc.defaultView.AudioContext || doc.defaultView.webkitAudioContext, audio = new Audio(), oscillator = audio.createOscillator(), gain = audio.createGain(); gain.gain.value = bounded(w.clickSoundVolume, .5, 0, 1) * .15; oscillator.connect(gain); gain.connect(audio.destination); oscillator.frequency.value = 800; oscillator.onended = () => void audio.close(); oscillator.start(); oscillator.stop(audio.currentTime + .035); } catch { /* Browser may disallow optional feedback. */ }
}
export function formatNumber(value, w, locale) { return Number(value).toLocaleString(locale || 'de', { minimumFractionDigits: bounded(w.minDecimals, w.decimals || 0, 0, 10), maximumFractionDigits: Math.max(bounded(w.minDecimals, w.decimals || 0, 0, 10), bounded(w.maxDecimals, w.decimals || 0, 0, 10)) }); }
export function condition(value, operator, compare) {
  if (operator === 'exist') return value != null && !['unknown', 'unavailable'].includes(value);
  if (operator === 'not exist') return !condition(value, 'exist');
  if (operator === 'consist') return String(value).includes(String(compare));
  if (operator === 'not consist') return !String(value).includes(String(compare));
  if (operator === '==') return String(value) === String(compare);
  if (operator === '!=') return String(value) !== String(compare);
  const a = Number(value), b = Number(compare); if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return operator === '<' ? a < b : operator === '<=' ? a <= b : operator === '>' ? a > b : operator === '>=' ? a >= b : false;
}
export function safeHtml(doc, source) {
  const frame = el(doc, 'iframe'); frame.setAttribute('sandbox', ''); frame.setAttribute('referrerpolicy', 'no-referrer'); frame.srcdoc = String(source ?? ''); return frame;
}
