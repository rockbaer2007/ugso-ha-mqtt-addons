const units = {ms: 1, s: 1000, min: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000};
export const sunTimeAttributes = Object.freeze({
  sunrise: 'next_rising', sunset: 'next_setting', dawn: 'next_dawn',
  dusk: 'next_dusk', solarNoon: 'next_noon', nadir: 'next_midnight',
});
export const datePatterns = ['YYYY.MM.DD', 'YYYY/MM/DD', 'YY.MM.DD', 'YY/MM/DD',
  'DD.MM.YYYY', 'DD/MM/YYYY', 'DD.MM.YY', 'DD/MM/YY', 'MM/DD/YYYY', 'MM/DD/YY',
  'DD.MM.', 'DD/MM', 'MM.DD', 'MM/DD', 'hh:mm:ss', 'hh:mm:ss.sss'];
const clockPattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
const isoPattern = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|[+-]\d{2}:?\d{2})?)?$/i;

export function timeOperations(timeZone, now = Date.now) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  const parts = ms => Object.fromEntries(formatter.formatToParts(ms).map(({type, value}) => [type, value]));
  const wall = ms => {
    const p = parts(ms);
    return Date.parse(p.year.padStart(4, '0') + '-' + p.month + '-' + p.day + 'T' +
      p.hour + ':' + p.minute + ':' + p.second + '.000Z') + ((ms % 1000 + 1000) % 1000);
  };
  const fromWall = target => {
    // Advance through a missing hour and choose the earlier instant in a repeated hour.
    const candidates = [-2, 0, 2].map(days => target + days * units.d)
      .map(ms => target - (wall(ms) - ms)).sort((x, y) => x - y);
    return candidates.find(ms => wall(ms) === target) ??
      candidates.find(ms => wall(ms) > target) ?? candidates.at(-1);
  };
  const dateValue = (value, unit) => {
    const invalid = () => new Error('Ungültiges Datum oder Zeitstempel / Invalid date or timestamp.');
    const input = typeof value === 'string' ? value.trim() : value;
    if (typeof input === 'number' || (typeof input === 'string' && /^[+-]?\d+(?:\.\d+)?$/.test(input))) {
      const date = new Date(Number(input) * (unit === 's' ? 1000 : 1));
      if (!Number.isFinite(date.getTime())) throw invalid();
      return date;
    }
    const match = typeof input === 'string' && isoPattern.exec(input);
    if (!match) throw invalid();
    const [, day, time = '00:00', seconds = '00', fraction = '', zone] = match;
    const local = day + 'T' + time + ':' + seconds + '.' + fraction.padEnd(3, '0').slice(0, 3);
    const wallDate = new Date(local + 'Z');
    if (!Number.isFinite(wallDate.getTime()) || wallDate.toISOString().slice(0, 23) !== local) throw invalid();
    const date = zone ? new Date(local + zone.toUpperCase()) : new Date(fromWall(wallDate.getTime()));
    if (!Number.isFinite(date.getTime())) throw invalid();
    return date;
  };
  const clock = value => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      const p = parts(value);
      return +p.hour * 60 + +p.minute;
    }
    const match = typeof value === 'string' && clockPattern.exec(value);
    if (!match) throw new Error('Uhrzeit als HH:mm oder Datum / Expected HH:mm or a date.');
    return +match[1] * 60 + +match[2];
  };
  const format = (ms, key) => {
    const p = parts(ms);
    if (key === 'clock') return p.hour + ':' + p.minute;
    if (key === 'day') return p.year + '-' + p.month + '-' + p.day;
    const millisecond = (ms % 1000 + 1000) % 1000;
    if (datePatterns.includes(key)) {
      const tokens = {YYYY: p.year, YY: p.year.slice(-2), MM: p.month, DD: p.day,
        hh: p.hour, mm: p.minute, ss: p.second, sss: String(millisecond).padStart(3, '0')};
      return key.replace(/YYYY|YY|MM|DD|hh|mm|sss|ss/g, token => tokens[token]);
    }
    const localDate = new Date(wall(ms));
    const weekday = localDate.getUTCDay() || 7;
    const values = {ms: millisecond, s: +p.second, m: +p.minute, h: +p.hour, d: +p.day,
      M: +p.month, y: +p.year - 1900, fy: +p.year, wd: weekday,
      sid: +p.hour * 3600 + +p.minute * 60 + +p.second, mid: +p.hour * 60 + +p.minute};
    if (Object.hasOwn(values, key)) return values[key];
    if (key === 'cw') {
      localDate.setUTCHours(0, 0, 0, 0);
      localDate.setUTCDate(localDate.getUTCDate() + 4 - weekday);
      return Math.ceil(((localDate - Date.UTC(localDate.getUTCFullYear(), 0, 1)) / units.d + 1) / 7);
    }
    throw new Error('Ungültiges Datumsformat / Invalid date format.');
  };
  return (operation, [a, b, c, d]) => {
    if (operation === 'convert') {
      const date = dateValue(a, b);
      if (c === 'date' || c === 'ms') return date.getTime();
      if (c === 'iso') return date.toISOString();
      return format(date.getTime(), c);
    }
    if (operation === 'duration') {
      if (typeof a !== 'number' || !Number.isFinite(a) || Math.abs(a) > Number.MAX_SAFE_INTEGER ||
          !['hh:mm:ss', 'hh:mm', 'h:m:s', 'h:m', 'mm:ss', 'm:s'].includes(b)) throw new Error('Zeitdifferenz in Millisekunden erwartet / Expected a duration in milliseconds.');
      const seconds = Math.floor(Math.abs(a) / 1000);
      const pad = value => String(value).padStart(2, '0');
      const values = {h: Math.floor(seconds / 3600), m: Math.floor(seconds / 60) % (b.startsWith('h') ? 60 : Infinity), s: seconds % 60};
      return (a < 0 ? '-' : '') + b.split(':').map(part => part.length === 2 ? pad(values[part[0]]) : values[part]).join(':');
    }
    if (operation === 'current') {
      const ms = now();
      if (a === 'date' || a === 'unix') return ms;
      return format(ms, a);
    }
    if (operation === 'boundary') {
      const match = /^(day|week|month)(Start|End)$/.exec(a);
      if (!match) throw new Error('Ungültige Kalendergrenze / Invalid calendar boundary.');
      const local = new Date(wall(now()));
      local.setUTCHours(0, 0, 0, 0);
      if (match[1] === 'week') local.setUTCDate(local.getUTCDate() - ((local.getUTCDay() + 6) % 7));
      if (match[1] === 'month') local.setUTCDate(1);
      if (match[2] === 'Start') return fromWall(local.getTime());
      if (match[1] === 'month') local.setUTCMonth(local.getUTCMonth() + 1);
      else local.setUTCDate(local.getUTCDate() + (match[1] === 'week' ? 7 : 1));
      return fromWall(local.getTime()) - 1;
    }
    if (operation === 'compare') {
      const value = clock(d === null ? now() : d), start = clock(b);
      switch (a) {
        case '<': return value < start;
        case '<=': return value <= start;
        case '===': return value === start;
        case '!==': return value !== start;
        case '>=': return value >= start;
        case '>': return value > start;
        case 'between': case 'outside': {
          const end = clock(c);
          const inside = start <= end ? value >= start && value < end : value >= start || value < end;
          return a === 'between' ? inside : !inside;
        }
      }
    }
    if (operation === 'shift') {
      if (!Number.isSafeInteger(a) || !Number.isFinite(b) || !Object.hasOwn(units, c) ||
          (c === 'd' && !Number.isInteger(b))) throw new Error('Ungültige Zeitberechnung / Invalid time calculation.');
      if (c !== 'd' || b === 0) {
        const result = a + Math.trunc(b * units[c]);
        if (!Number.isFinite(new Date(result).getTime())) throw new Error('Date out of range.');
        return result;
      }
      return fromWall(wall(a) + b * units.d);
    }
    throw new Error('Ungültiger Zeitbefehl / Invalid time operation.');
  };
}

export const guestTimeApi = `
  convertDate: (input, unit, format) => {
    const isDate = input instanceof Date;
    const result = timeRequest('convert', [isDate ? input.getTime() : input, isDate ? 'ms' : unit, format]);
    return format === 'date' ? new Date(result) : result;
  },
  formatDuration: (milliseconds, format) => timeRequest('duration', [milliseconds, format]),
  calendarBoundary: type => timeRequest('boundary', [type]),
  astroTime: (event, offset) => new Date(astroTimeRequest(event, offset)),
  compareTime: (op, start, end = null, at = null) => {
    const raw = value => value instanceof Date ? value.getTime() : value;
    return timeRequest('compare', [op, raw(start), raw(end), raw(at)]);
  },
  currentTime: format => {
    const value = timeRequest('current', [format]);
    return format === 'date' ? new Date(value) : value;
  },
  shiftTime: (base, amount, unit) => {
    const date = base instanceof Date;
    const result = timeRequest('shift', [date ? base.getTime() : base, amount, unit]);
    return date ? new Date(result) : result;
  },
`;
