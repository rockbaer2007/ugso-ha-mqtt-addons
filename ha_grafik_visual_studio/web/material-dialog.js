import { materialAppearance } from './material-color-schemes.js';
import { iframeOptions } from './iframe-widget.js';

export function materialIframeUrl(source, baseUrl) {
  if (typeof source !== 'string' || !source.trim()) return null;
  try {
    const url = new URL(source.trim(), baseUrl);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

const controllers = new Map();
const number = (value, fallback, min, max) => value === '' || value == null || !Number.isFinite(Number(value)) ? fallback : Math.min(max, Math.max(min, Number(value)));
export const dialogStateOpen = value => [true, 1, '1', 'true', 'on'].includes(value);
export function materialDialogGroups(groups, widget, groupKey) {
  const labels = { legacy: 'Klassisch', material3: 'Material 3', project: 'Projektstandard', light: 'Hell', dark: 'Dunkel', button: 'Schaltfläche', datapoint: 'Boolesche Entität', raised: 'Erhöht', outlined: 'Umrandet', text: 'Text', icon: 'Symbol', left: 'Links', right: 'Rechts', 'flex-start': 'Links', center: 'Mitte', 'flex-end': 'Rechts', small: 'Klein', medium: 'Mittel', large: 'Groß' };
  return groups.map((group, index) => ({ ...group, id: groupKey(group, index) }))
    .filter(group => widget.showAdvanced || !['Button Layout', 'Layout Kopfzeile', 'Layout der Schaltflächen in der Dialogfußzeile'].includes(group.label))
    .map(group => ({ ...group, fields: group.fields.map(field => field.key === 'targetPage' ? { ...field, type: 'page' } : field.type === 'color' ? { ...field, optionalColor: true } : field.type === 'select' ? { ...field, options: field.options.map(value => typeof value === 'object' ? value : ({ value, label: labels[value] || value })) } : field) }));
}
export function materialDialogLayout(widget, viewportWidth) {
  return { fullscreen: viewportWidth <= number(widget.fullscreenResolutionLower, 360, 0, 3000), width: number(widget.dialogMaxWidth, 800, 160, 3000), height: number(widget.viewHeight, 400, 100, 3000), gap: number(widget.viewDistanceToBorder, 16, 0, 100), opacity: number(widget.overlayOpacity, .6, 0, 1) };
}
export function syncMaterialDialogs(surface, ids) {
  const live = new Set(ids);
  for (const [key, controller] of controllers) if (!live.has(key) || controller.surface !== surface) { controller.dialog?.close(); controller.dialog?.remove(); controllers.delete(key); }
}
function feedback(widget, win) {
  win.navigator?.vibrate?.(number(widget.vibrateOnMobilDevices, 50, 0, 1000));
  if (!widget.clickSoundPlay) return;
  try {
    const Audio = win.AudioContext || win.webkitAudioContext;
    const audio = new Audio(), oscillator = audio.createOscillator(), gain = audio.createGain();
    gain.gain.value = number(widget.clickSoundVolume, .5, 0, 1) * .15;
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.frequency.value = 800;
    oscillator.onended = () => { void audio.close(); }; oscillator.start(); oscillator.stop(audio.currentTime + .035);
  } catch { /* Optional feedback may be unavailable in the browser. */ }
}
export function renderMaterialDialog(widget, doc, context = {}) {
  const { runtime = false, popupUrl = null, states = {}, surface, resetState = async () => {}, locale = 'de' } = context;
  const appearance = materialAppearance(widget, context);
  const root = doc.createElement('div'); root.className = 'material-dialog-trigger'; root.dataset.dialogWidgetId = widget.id;
  const trigger = doc.createElement('button'); trigger.type = 'button';
  trigger.className = `material-dialog-button material-button-${widget.buttonStyle || 'raised'}`;
  const label = doc.createElement('span'); label.textContent = widget.labelText || (locale === 'de' ? 'Dialog öffnen' : locale === 'fr' ? 'Ouvrir le dialogue' : 'Open dialog');
  label.style.flexBasis = `${number(widget.labelWidth, 0, 0, 100)}%`;
  if (widget.image) { const icon = doc.createElement('span'); icon.textContent = widget.image; icon.style.color = widget.imageColor || 'inherit'; icon.style.fontSize = `${number(widget.iconHeight, 20, 8, 100)}px`; trigger.append(icon); }
  if (widget.buttonStyle !== 'icon') trigger.append(label);
  else if (!widget.image) trigger.textContent = '▣';
  trigger.setAttribute('aria-label', label.textContent); trigger.style.flexDirection = widget.iconPosition === 'right' ? 'row-reverse' : 'row';
  Object.assign(trigger.style, { backgroundColor: ['text', 'icon', 'outlined'].includes(widget.buttonStyle) ? 'transparent' : widget.mdwButtonPrimaryColor || appearance.primary, color: widget.mdwButtonSecondaryColor || (['text', 'icon', 'outlined'].includes(widget.buttonStyle) ? appearance.primary : appearance.background), fontFamily: widget.textFontFamily || 'inherit', fontSize: `${number(widget.textFontSize, 14, 8, 100)}px`, borderRadius: widget.designStyle === 'legacy' ? '4px' : appearance.radius });
  if (widget.mdwButtonColorPress) trigger.style.setProperty('--material-press', widget.mdwButtonColorPress);
  root.append(trigger);
  if (!runtime) return root;
  if (!popupUrl) { trigger.disabled = true; trigger.title = context.iframe ? (locale === 'de' ? 'Eine gültige HTTP-/HTTPS-Quelle auswählen.' : 'Select a valid HTTP/HTTPS source.') : (locale === 'de' ? 'Eine andere Studio-Seite als Ansicht auswählen.' : 'Select another Studio page as the view.'); }
  let controller = controllers.get(widget.id);
  if (!controller) { controller = { surface, dialog: null, high: false }; controllers.set(widget.id, controller); }
  const close = () => { controller.dialog?.close(); if (widget.showDialogMethod === 'datapoint' && /^(switch|input_boolean)\./.test(widget.entityId || '')) void resetState(widget.entityId).catch(() => {}); };
  const open = userClick => {
    if (!popupUrl || controller.dialog?.open) return;
    if (userClick) feedback(widget, doc.defaultView);
    const layout = materialDialogLayout(widget, doc.defaultView.innerWidth);
    const dialog = doc.createElement('dialog'); dialog.className = `material-view-dialog${layout.fullscreen ? ' material-dialog-fullscreen' : ''}`; dialog.dataset.widgetId = widget.id;
    dialog.setAttribute('aria-label', widget.dialogTitle || label.textContent);
    Object.assign(dialog.style, { width: `${layout.width}px`, height: `${layout.height}px`, maxWidth: `calc(100vw - ${layout.gap * 2}px)`, maxHeight: `calc(100dvh - ${layout.gap * 2}px)`, backgroundColor: widget.backgroundColor || appearance.background, color: appearance.text, borderRadius: appearance.radius, zIndex: String(number(widget.zIndex, 1000, 0, 99999)) });
    dialog.style.setProperty('--material-overlay', widget.overlayColor || '#000'); dialog.style.setProperty('--material-overlay-opacity', String(layout.opacity));
    const header = doc.createElement('header'); header.hidden = widget.showTitle === false;
    header.textContent = widget.dialogTitle || label.textContent;
    Object.assign(header.style, { minHeight: `${number(widget.headerHeight, 48, 0, 300)}px`, backgroundColor: widget.headerBackgroundColor || 'transparent', color: widget.titleColor || appearance.text, fontSize: `${number(widget.titleFontSize, 20, 8, 100)}px`, fontFamily: widget.titleFont || 'inherit' });
    const frame = doc.createElement('iframe');
    if (context.iframe) {
      const options = iframeOptions({ ...widget, noFrame: widget.seamless === true });
      if (options.sandbox !== null) frame.setAttribute('sandbox', options.sandbox);
      frame.setAttribute('scrolling', options.scrolling);
      frame.setAttribute('referrerpolicy', 'no-referrer');
      Object.assign(frame.style, { border: options.border, overflowX: options.overflowX, overflowY: options.overflowY });
    }
    frame.src = popupUrl; frame.title = widget.dialogTitle || label.textContent; frame.className = 'material-dialog-view';
    const footer = doc.createElement('footer'); footer.style.justifyContent = widget.buttonPosition || 'flex-end';
    footer.style.minHeight = `${number(widget.footerHeight, 48, 0, 300)}px`; footer.style.backgroundColor = widget.footerBackgroundColor || 'transparent';
    const button = doc.createElement('button'); button.type = 'button'; button.className = `material-dialog-close material-close-${widget.buttonSize || 'medium'}`;
    button.textContent = layout.fullscreen ? widget.fullscreenCloseIcon || '×' : widget.buttonText || (locale === 'de' ? 'Schließen' : locale === 'fr' ? 'Fermer' : 'Close');
    button.setAttribute('aria-label', locale === 'de' ? 'Dialog schließen' : locale === 'fr' ? 'Fermer le dialogue' : 'Close dialog');
    Object.assign(button.style, { width: widget.buttonFullWidth ? '100%' : '', color: (layout.fullscreen ? widget.fullscreenCloseIconColor : widget.buttonFontColor) || appearance.primary, fontSize: `${number(widget.buttonFontSize, 14, 8, 100)}px`, fontFamily: widget.buttonFont || 'inherit' });
    button.style.setProperty('--material-press', (layout.fullscreen ? widget.fullscreenCloseIconPressColor : widget.pressColor) || '#8884');
    button.addEventListener('click', close); footer.append(button);
    if (widget.showDivider) { header.style.borderBottom = footer.style.borderTop = `1px solid ${widget.dividerColor || '#8886'}`; }
    dialog.append(header, frame, footer);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('click', event => { if (event.target !== dialog || widget.closingClickOutside === false) return; const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close(); });
    dialog.addEventListener('close', () => { if (controller.dialog === dialog) controller.dialog = null; dialog.remove(); });
    controller.dialog = dialog; doc.body.append(dialog); dialog.showModal(); button.focus();
  };
  trigger.addEventListener('click', event => { event.stopPropagation(); open(true); });
  if (widget.showDialogMethod === 'datapoint') {
    trigger.hidden = true;
    const high = dialogStateOpen(states[widget.entityId]?.state);
    if (!high) controller.dialog?.close();
    if (high && !controller.high && popupUrl) queueMicrotask(() => { if (root.isConnected && controllers.get(widget.id) === controller) open(false); });
    controller.high = high;
  }
  return root;
}
