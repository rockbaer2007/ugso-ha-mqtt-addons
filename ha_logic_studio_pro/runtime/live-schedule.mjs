const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const clock = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;

export function cronMatcher(source) {
  const invalid = () => { throw new Error('Ungültiger CRON-Ausdruck. / Invalid CRON expression.'); };
  if (typeof source !== 'string' || source.length > 256) invalid();
  const fields = source.trim().split(/\s+/);
  if (fields.length === 5) fields.unshift('0');
  if (fields.length !== 6) invalid();
  const bounds = [[0, 59], [0, 59], [0, 23], [1, 31], [1, 12], [0, 7]];
  const values = fields.map((field, index) => {
    const [min, max] = bounds[index];
    const allowed = new Set();
    for (const part of field.split(',')) {
      const match = /^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/.exec(part);
      if (!match) invalid();
      const step = Number(match[2] ?? 1);
      const [first, last] = match[1] === '*' ? [min, max] : match[1].split('-').map(Number);
      const end = last ?? (match[2] ? max : first);
      if (first < min || end > max || first > end || step < 1 || step > max - min + 1) invalid();
      for (let value = first; value <= end; value += step) allowed.add(index === 5 && value === 7 ? 0 : value);
    }
    return allowed;
  });
  return (local, date) => {
    const [hour, minute, second] = local.clock.split(':').map(Number);
    const [, month, day] = date.split('-').map(Number);
    const dayMatches = values[3].has(day);
    const weekdayMatches = values[5].has(days.indexOf(local.weekday));
    const calendarMatches = fields[3] === '*' || fields[5] === '*'
      ? dayMatches && weekdayMatches : dayMatches || weekdayMatches;
    return values[0].has(second) && values[1].has(minute) && values[2].has(hour) &&
      values[4].has(month) && calendarMatches;
  };
}

export function scheduleMatcher(schedule) {
  if (schedule?.trigger === 'time_pattern') {
    const matchers = ['hours', 'minutes', 'seconds'].map((key, index) => {
      const max = index === 0 ? 23 : 59;
      const value = schedule[key];
      if (value === '*') return () => true;
      if (Number.isInteger(value) && value >= 0 && value <= max) return current => current === value;
      if (typeof value === 'string' && /^\/[1-9]\d?$/.test(value) && Number(value.slice(1)) <= max) {
        const divisor = Number(value.slice(1));
        return current => current % divisor === 0;
      }
      throw new Error('Ungültiges Zeitmuster: ' + key);
    });
    return time => matchers.every((matches, index) => matches(Number(time.clock.split(':')[index])));
  }
  if (schedule?.trigger === 'time') {
    const at = Array.isArray(schedule.at) ? schedule.at : [schedule.at];
    const weekday = schedule.weekday ?? days;
    if (!at.length || at.length > 2000 || !at.every(value => typeof value === 'string' && clock.test(value)) ||
        !Array.isArray(weekday) || !weekday.length || !weekday.every(day => days.includes(day))) {
      throw new Error('Ungültige Uhrzeit oder ungültiger Wochentag.');
    }
    const times = new Set(at);
    return time => times.has(time.clock) && weekday.includes(time.weekday);
  }
  throw new Error('Zeitplan unterstützt time und time_pattern.');
}

export function scheduleClock(timeZone) {
  const format = new Intl.DateTimeFormat('en-GB', {timeZone, weekday: 'short', hour: '2-digit',
    minute: '2-digit', second: '2-digit', hourCycle: 'h23'});
  return timestamp => {
    const parts = Object.fromEntries(format.formatToParts(timestamp).map(part => [part.type, part.value]));
    return {clock: `${parts.hour}:${parts.minute}:${parts.second}`, weekday: parts.weekday.toLowerCase()};
  };
}

export function sunSchedule(readSun, event, offset, startedAt) {
  const attribute = {sunrise: 'next_rising', sunset: 'next_setting'}[event];
  if (!['sunrise', 'sunset'].includes(event) || !Number.isInteger(offset) || Math.abs(offset) > 1440) {
    throw new Error('Ungültiges Astro-Ereignis oder ungültiger Versatz.');
  }
  const readNext = () => {
    const sun = readSun();
    return ['above_horizon', 'below_horizon'].includes(sun?.state)
      ? Date.parse(sun.attributes?.[attribute]) : NaN;
  };
  let next = readNext();
  const pending = new Set();
  return (now, previous) => {
    const base = readNext();
    if (!Number.isFinite(base)) {
      next = NaN;
      pending.clear();
      return false;
    }
    const delay = offset * 60_000;
    // HA replaces next_rising/next_setting at the crossing itself. Keep the previous crossing for a positive offset.
    if (base !== next && next <= now && next < base && next + delay > previous) pending.add(next + delay);
    next = base;
    const due = next + delay;
    let fire = due > Math.max(previous, startedAt) && due <= now;
    for (const retained of pending) {
      if (retained <= now) {
        fire ||= retained > Math.max(previous, startedAt);
        pending.delete(retained);
      }
    }
    return fire;
  };
}

export function dateTimeSchedule(readHelper, convert) {
  let lastDate;
  const firedTimes = new Set();
  let convertedState, due;
  return (now, previous, local, date) => {
    const helper = readHelper();
    const state = helper?.state;
    if (typeof state !== 'string') return false;
    if (helper.attributes?.has_date === false && helper.attributes?.has_time === true) {
      if (lastDate !== date) {
        lastDate = date;
        firedTimes.clear();
      }
      if (state !== local.clock || firedTimes.has(state)) return false;
      firedTimes.add(state);
      return true;
    }
    if (helper.attributes?.has_date !== true) return false;
    const hasTime = helper.attributes.has_time === true;
    const valid = hasTime ? /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/ : /^\d{4}-\d{2}-\d{2}$/;
    if (!valid.test(state)) return false;
    if (convertedState !== state) {
      convertedState = state;
      try { due = convert(state); }
      catch { due = NaN; }
    }
    return due > previous && due <= now;
  };
}
