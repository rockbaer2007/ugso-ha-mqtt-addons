const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const invalid = detail => { throw new Error('ioBroker-JSON-Zeitplan: ' + detail); };

function dayNumber(value) {
  if (!value) return null;
  if (typeof value !== 'string') invalid('Datum ungültig');
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  const german = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(value);
  if (!iso && !german) invalid('Datum ungültig');
  const [y, m, d] = (iso ? iso.slice(1) : german.slice(1).reverse()).map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) invalid('Datum ungültig');
  return date.getTime() / 86400000;
}

function minute(value) {
  if (typeof value !== 'string' || !/^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(value)) {
    invalid('Uhrzeit ungültig oder Astro-Zeit im JSON-Zeitplan');
  }
  const [hour, min] = value.split(':').map(Number);
  return hour * 60 + min;
}

function list(value, min, max) {
  if (!value) return null;
  const values = typeof value === 'string' ? JSON.parse(value) : value;
  if (!Array.isArray(values) || !values.length || values.some(n => !Number.isInteger(n) || n < min || n > max)) {
    invalid('Kalenderliste ungültig');
  }
  return new Set(values);
}

export function ioBrokerScheduleMatcher(rule) {
  const {time, period, valid} = rule ?? {};
  if (!time || !period || typeof time !== 'object' || typeof period !== 'object' || Array.isArray(period)) {
    invalid('time und period erforderlich');
  }
  const from = dayNumber(valid?.from);
  const to = dayNumber(valid?.to);
  const once = dayNumber(period.once);
  if (from !== null && to !== null && from > to) invalid('Gültigkeitszeitraum ungültig');
  const start = minute(time.start);
  if (typeof time.exactTime !== 'boolean' && time.exactTime !== undefined) invalid('exactTime ungültig');
  const end = time.exactTime ? start : minute(time.end || '23:59');
  const interval = time.exactTime ? 1 : Number(time.interval ?? 1);
  if (!Number.isSafeInteger(interval) || interval < 1 || end < start ||
      (!time.exactTime && !['minutes', 'hours'].includes(time.mode))) invalid('Intervall ungültig');
  const step = interval * (time.exactTime || time.mode === 'minutes' ? 1 : 60);
  const dows = list(period.dows, 0, 6);
  const dates = list(period.dates, 1, 31);
  const months = typeof period.months === 'number' ? null : list(period.months, 1, 12);
  const counts = [period.days, period.weeks, typeof period.months === 'number' ? period.months : 0, period.years];
  if (counts.some(n => n !== undefined && (!Number.isSafeInteger(n) || n < 0))) invalid('Wiederholung ungültig');
  const [daily, weekly, monthly, yearly] = counts;
  if (counts.some(n => n > 1) && from === null) invalid('Wiederholung benötigt valid.from');
  const anchor = from === null ? null : new Date(from * 86400000);
  return (local, isoDate) => {
    const day = dayNumber(isoDate);
    const [year, month, date] = isoDate.split('-').map(Number);
    const [hour, min, second] = local.clock.split(':').map(Number);
    const current = hour * 60 + min;
    if (second !== 0 || current < start || current > end || (current - start) % step) return false;
    if ((from !== null && day < from) || (to !== null && day > to)) return false;
    if (once !== null) return day === once;
    if (daily || weekly) {
      if (dows && !dows.has(weekdays.indexOf(local.weekday))) return false;
      return daily > 1 ? (day - from) % daily === 0 : !(weekly > 1 && Math.floor((day - from) / 7) % weekly);
    }
    const monthDelta = anchor ? (year - anchor.getUTCFullYear()) * 12 + month - 1 - anchor.getUTCMonth() : 0;
    if (months || monthly) return (!months || months.has(month)) && (!dates || dates.has(date)) &&
      (!(monthly > 1) || monthDelta % monthly === 0);
    if (yearly) return (!period.yearMonth || period.yearMonth === month) && (!period.yearDate || period.yearDate === date) &&
      (yearly === 1 || Math.floor(monthDelta / 12) % yearly === 0);
    return true;
  };
}
