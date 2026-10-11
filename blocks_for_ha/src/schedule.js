import { language } from './locales.js';

export const scheduleErrors = {
  syntax: ['Zeitplan: Ungültiger CRON-Ausdruck.', 'Schedule: Invalid CRON expression.', 'Horaire : expression CRON invalide.'],
  calendar: ['Zeitplan: Monat und Monatstag müssen * sein. Kalenderregeln werden noch nicht unterstützt.', 'Schedule: Month and day of month must be *. Calendar rules are not supported yet.', 'Horaire : mois et jour du mois doivent être *. Règles calendaires non prises en charge.'],
  size: ['Zeitplan: Zu viele einzelne Uhrzeiten. Intervall vereinfachen.', 'Schedule: Too many individual times. Simplify the interval.', 'Horaire : trop d’heures individuelles. Simplifier l’intervalle.']
};
const fail = key => { throw Error(scheduleErrors[key][0]); };
function values(source, max) {
  const result = new Set();
  for (const part of source.split(',')) {
    const match = /^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/.exec(part);
    if (!match) fail('syntax');
    const step = Number(match[2] || 1);
    const range = match[1] === '*' ? [0, max] : match[1].split('-').map(Number);
    const [start, end = match[2] ? max : start] = range;
    if (step < 1 || step > max + 1 || start > end || end > max) fail('syntax');
    for (let n = start; n <= end; n += step) result.add(n);
  }
  return [...result].sort((a, b) => a - b);
}
export function scheduleTrigger(source) {
  const parts = source.trim().split(/\s+/);
  if (parts.length !== 5 && parts.length !== 6) fail('syntax');
  const [seconds, minutes, hours, day, month, weekday] = parts.length === 5 ? ['0', ...parts] : parts;
  if (day !== '*' || month !== '*') fail('calendar');
  const ss = values(seconds, 59), mm = values(minutes, 59), hh = values(hours, 23), ww = values(weekday, 7);
  const simple = (part, max) => part === '*' ? '*' : /^\*\/\d+$/.test(part) ? Number(part.slice(2)) > max ? 0 : '/' + part.slice(2) : /^\d+$/.test(part) ? Number(part) : null;
  if (weekday === '*' && [seconds, minutes, hours].every(part => simple(part, 59) !== null)) return { trigger: 'time_pattern', hours: simple(hours, 23), minutes: simple(minutes, 59), seconds: simple(seconds, 59) };
  if (ss.length * mm.length * hh.length > 2000) fail('size');
  const at = [];
  for (const h of hh) for (const m of mm) for (const s of ss) at.push([h, m, s].map(n => String(n).padStart(2, '0')).join(':'));
  return { trigger: 'time', at: at.length === 1 ? at[0] : at, ...(weekday === '*' ? {} : { weekday: [...new Set(ww.map(n => ['sun','mon','tue','wed','thu','fri','sat','sun'][n]))] }) };
}

const words = {
  de: ['Zeitplan definieren', 'Wizard', 'Einfach', 'CRON', 'Intervall', 'Bestimmte Zeit', 'Jeden', 'Sekunden', 'Minuten', 'Stunden', 'Uhrzeit', 'Wochentage (0=So, 1=Mo … 6=Sa, 7=So)', 'Sekunden benutzen', 'Sekunden · Minuten · Stunden · Monatstag · Monat · Wochentag', 'OK', 'Abbrechen', 'Monat und Monatstag: *; Zahlen, Listen, Bereiche und /Schritte. Ausführung durch Home Assistant in dessen Ortszeit.'],
  en: ['Define schedule', 'Wizard', 'Simple', 'CRON', 'Interval', 'Specific time', 'Every', 'Seconds', 'Minutes', 'Hours', 'Time', 'Weekdays (0=Sun, 1=Mon … 6=Sat, 7=Sun)', 'Use seconds', 'Seconds · Minutes · Hours · Day of month · Month · Weekday', 'OK', 'Cancel', 'Month and day of month: *; numbers, lists, ranges and /steps. Home Assistant executes in its local time.'],
  fr: ['Définir l’horaire', 'Assistant', 'Simple', 'CRON', 'Intervalle', 'Heure précise', 'Toutes les', 'Secondes', 'Minutes', 'Heures', 'Heure', 'Jours (0=dim, 1=lun … 6=sam, 7=dim)', 'Utiliser les secondes', 'Secondes · Minutes · Heures · Jour du mois · Mois · Jour de semaine', 'OK', 'Annuler', 'Mois et jour du mois : * ; nombres, listes, plages et /pas. Exécution par Home Assistant dans son heure locale.']
};
export function installScheduleField(Blockly) {
  class ScheduleField extends Blockly.FieldTextInput {
    static fromJson(options) { return new ScheduleField(options.text); }
    showEditor_() {
      const w = words[language], dialog = document.createElement('dialog'); dialog.id = 'schedule-dialog';
      dialog.innerHTML = `<h2>${w[0]}</h2><label><select id="schedule-mode"><option value="wizard">${w[1]}</option><option value="simple">${w[2]}</option><option value="cron">${w[3]}</option></select></label><section id="schedule-wizard"><label><select id="schedule-kind"><option value="interval">${w[4]}</option><option value="time">${w[5]}</option></select></label><label>${w[6]} <input id="schedule-every" type="number" min="1" max="59" value="1"><select id="schedule-unit"><option value="minutes">${w[8]}</option><option value="seconds">${w[7]}</option><option value="hours">${w[9]}</option></select></label><label>${w[10]} <input id="schedule-time" type="time" step="1" value="07:00:00"></label><label>${w[11]}<input id="schedule-days" value="*"></label></section><section id="schedule-cron"><label><input id="schedule-seconds" type="checkbox">${w[12]}</label><label>${w[13]}<input id="schedule-source" spellcheck="false"></label></section><p>${w[16]}</p><p id="schedule-preview" role="status"></p><div class="entity-actions"><button id="schedule-ok" class="primary">${w[14]}</button><button id="schedule-cancel">${w[15]}</button></div>`;
      document.body.append(dialog);
      const el = name => dialog.querySelector('#schedule-' + name);
      el('source').value = this.getValue(); el('seconds').checked = this.getValue().trim().split(/\s+/).length === 6;
      // Open an existing expression in CRON mode; wizard changes are deliberate.
      el('mode').value = 'cron';
      const tabs = document.createElement('div'); tabs.className = 'schedule-tabs'; tabs.setAttribute('role', 'tablist');
      const component = document.createElement('input'); component.id = 'schedule-component'; component.spellcheck = false;
      const componentLabel = document.createElement('label'); componentLabel.append(component);
      el('cron').append(tabs, componentLabel);
      let selectedPart = 0;
      const syncParts = () => {
        const parts = el('source').value.trim().split(/\s+/), seconds = parts.length === 6;
        const labels = w[13].split(' · ').slice(seconds ? 0 : 1);
        selectedPart = Math.min(selectedPart, labels.length - 1); tabs.replaceChildren();
        labels.forEach((label, index) => {
          const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
          button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', String(index === selectedPart));
          button.addEventListener('click', () => { selectedPart = index; syncParts(); }); tabs.append(button);
        });
        component.value = parts[selectedPart] || '*'; component.setAttribute('aria-label', labels[selectedPart]);
      };
      const update = () => {
        const mode = el('mode').value, daily = mode === 'wizard' && el('kind').value === 'time';
        el('wizard').hidden = mode === 'cron'; el('cron').hidden = mode !== 'cron';
        el('kind').parentElement.hidden = mode === 'simple';
        el('every').parentElement.hidden = daily; el('time').parentElement.hidden = !daily; el('days').parentElement.hidden = !daily;
        if (mode !== 'cron') {
          if (daily) { const [h,m,s='00'] = el('time').value.split(':'); el('source').value = `${Number(s)} ${Number(m)} ${Number(h)} * * ${el('days').value}`; }
          else { const n = el('every').value, unit = el('unit').value; el('source').value = unit === 'seconds' ? `*/${n} * * * * *` : unit === 'hours' ? `0 0 */${n} * * *` : `0 */${n} * * * *`; }
        }
        el('every').max = el('unit').value === 'hours' ? '24' : '60';
        syncParts();
        try { const trigger = scheduleTrigger(el('source').value); el('preview').textContent = JSON.stringify(trigger); el('ok').disabled = false; }
        catch (e) { el('preview').textContent = Object.values(scheduleErrors).find(v => v[0] === e.message)?.[['de','en','fr'].indexOf(language)] || e.message; el('ok').disabled = true; }
      };
      component.addEventListener('input', event => {
        event.stopPropagation(); const parts = el('source').value.trim().split(/\s+/);
        parts[selectedPart] = component.value; el('source').value = parts.join(' '); update();
      });
      dialog.addEventListener('input', update);
      const modes = document.createElement('div'); modes.className = 'schedule-modes';
      for (const [i, mode] of ['wizard','simple','cron'].entries()) {
        const label = document.createElement('label'), radio = document.createElement('input');
        radio.type = 'radio'; radio.name = 'schedule-mode'; radio.checked = mode === 'cron';
        radio.addEventListener('change', () => { el('mode').value = mode; update(); });
        label.append(radio, w[i + 1]); modes.append(label);
      }
      el('mode').parentElement.hidden = true; el('mode').parentElement.before(modes);
      el('seconds').addEventListener('change', () => { const parts = el('source').value.trim().split(/\s+/); if (el('seconds').checked && parts.length === 5) parts.unshift('0'); else if (!el('seconds').checked && parts.length === 6) parts.shift(); el('source').value = parts.join(' '); update(); });
      const close = () => { dialog.close(); dialog.remove(); };
      el('ok').addEventListener('click', () => { scheduleTrigger(el('source').value); this.setValue(el('source').value.trim()); close(); });
      el('cancel').addEventListener('click', close); dialog.addEventListener('close', () => dialog.remove());
      update(); dialog.showModal();
    }
  }
  Blockly.fieldRegistry.register('field_schedule', ScheduleField);
}
