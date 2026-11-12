const units = {ms: 1, s: 1000, min: 60_000, h: 3_600_000, d: 86_400_000};
const clockPattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

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
      const target = wall(a) + b * units.d;
      // Try offsets on both sides of the target. During a gap, advance by the gap;
      // during a repeated hour, choose the earlier occurrence.
      const candidates = [-2, 0, 2].map(days => target + days * units.d)
        .map(ms => target - (wall(ms) - ms)).sort((x, y) => x - y);
      return candidates.find(ms => wall(ms) === target) ??
        candidates.find(ms => wall(ms) > target) ?? candidates.at(-1);
    }
    throw new Error('Ungültiger Zeitbefehl / Invalid time operation.');
  };
}

export const guestTimeApi = `
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
