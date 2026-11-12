const units = {ms: 1, s: 1000, min: 60_000, h: 3_600_000, d: 86_400_000};
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
  return (operation, [a, b, c, d]) => {
    if (operation === 'convert') {
      const date = dateValue(a, b);
      if (c === 'date' || c === 'ms') return date.getTime();
      if (c === 'iso') return date.toISOString();
      const p = parts(date);
      if (c === 'clock') return p.hour + ':' + p.minute;
      if (c === 'day') return p.year + '-' + p.month + '-' + p.day;
    }
    if (operation === 'duration') {
      if (typeof a !== 'number' || !Number.isFinite(a) || Math.abs(a) > Number.MAX_SAFE_INTEGER ||
          !['hh:mm:ss', 'hh:mm'].includes(b)) throw new Error('Zeitdifferenz in Millisekunden erwartet / Expected a duration in milliseconds.');
      const seconds = Math.floor(Math.abs(a) / 1000);
      const pad = value => String(value).padStart(2, '0');
      const duration = pad(Math.floor(seconds / 3600)) + ':' + pad(Math.floor(seconds / 60) % 60);
      return (a < 0 ? '-' : '') + duration + (b === 'hh:mm:ss' ? ':' + pad(seconds % 60) : '');
    }
    if (operation === 'current') {
      const ms = now();
      if (a === 'date' || a === 'unix') return ms;
      const p = parts(ms);
      if (a === 'clock') return p.hour + ':' + p.minute;
      if (a === 'day') return p.year + '-' + p.month + '-' + p.day;
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
