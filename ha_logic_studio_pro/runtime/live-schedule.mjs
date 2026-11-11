const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const clock = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;

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
