'use strict';
const I18n = {
  messages: {}, language: 'en', preference: 'auto', listeners: [],
  normalize(value) { const code = String(value || '').toLowerCase().split(/[-_]/)[0]; return ['de','en','fr'].includes(code) ? code : 'en'; },
  detect() {
    if (this.preference !== 'auto') return this.normalize(this.preference);
    try { const language = window.parent.document.querySelector('home-assistant')?.hass?.language; if (language) return this.normalize(language); } catch { /* Different origin: browser fallback only, no credential access. */ }
    return this.normalize(navigator.languages?.[0] || navigator.language);
  },
  t(key, values = {}) {
    if (!(key in this.messages)) key = Object.keys(this.messages).find(source => this.messages[source].includes(key)) || key;
    const template = this.language === 'de' ? key : this.messages[key]?.[this.language === 'fr' ? 1 : 0] || this.messages[key]?.[0] || key;
    return template.replace(/\{(\w+)\}/g, (match, name) => values[name] === undefined ? match : String(values[name]));
  },
  apply() {
    this.language = this.detect(); document.documentElement.lang = this.language; document.title = this.t('Dashboard-Benutzer');
    for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = this.t(el.dataset.i18n);
    for (const el of document.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label',this.t(el.dataset.i18nAria));
    for (const fn of this.listeners) fn();
  },
  async init() {
    try { this.preference = localStorage.getItem('dashboard-users-language') || 'auto'; } catch { /* Private storage may be unavailable. */ }
    if (!['auto','de','en','fr'].includes(this.preference)) this.preference = 'auto';
    const response = await fetch('locales.json', {cache:'no-store'}); if (!response.ok) throw new Error('Translations unavailable'); this.messages = await response.json();
    const select = document.getElementById('language'); select.value = this.preference;
    select.addEventListener('change', () => {this.preference = select.value; try {localStorage.setItem('dashboard-users-language',this.preference);} catch {} this.apply();});
    this.apply();
    // HA exposes its current UI language on the same-origin parent element.
    // Read only that property; never inspect its connection or credentials.
    window.setInterval(() => {if (this.detect() !== this.language) this.apply();}, 1500);
    window.addEventListener('languagechange', () => this.apply());
  }
};
if (typeof module !== 'undefined') module.exports = I18n;
