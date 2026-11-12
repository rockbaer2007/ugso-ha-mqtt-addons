const day = 86_400_000;
export const historyModes = ['none', 'min', 'max', 'average', 'count'];

export function historyRange(start, end, mode, step, count) {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
      start < 0 || end > 8.64e15 || end <= start || end - start > 31 * day ||
      !historyModes.includes(mode) || !Number.isSafeInteger(step) || step < 0 ||
      !Number.isInteger(count) || count < 1 || count > 5000) {
    throw new Error('Verlauf: Zeitraum (max. 31 Tage), Aggregation, Schritt oder Anzahl ungültig.');
  }
  return {start, end, mode, step, count};
}

export function historyRows(rows, {start, end, mode, step, count}) {
  const points = rows.flatMap(row => {
    const ts = typeof row.lu === 'number' ? row.lu * 1000 : Date.parse(row.last_updated);
    const state = row.s ?? row.state;
    if (!Number.isFinite(ts) || ts < start || ts > end || typeof state !== 'string') return [];
    const numeric = state.trim() ? Number(state) : NaN;
    return [{ts: Math.round(ts), val: Number.isFinite(numeric) ? numeric : state}];
  }).sort((a, b) => a.ts - b.ts);
  if (mode === 'none') return points.slice(0, count);
  const width = step || Math.ceil((end - start) / count);
  const buckets = new Map();
  for (const {ts, val} of points) {
    if (mode !== 'count' && typeof val !== 'number') continue;
    const key = start + Math.floor((ts - start) / width) * width;
    const bucket = buckets.get(key) ?? {sum: 0, count: 0, min: Infinity, max: -Infinity};
    bucket.count++;
    if (typeof val === 'number') {
      bucket.sum += val;
      bucket.min = Math.min(bucket.min, val);
      bucket.max = Math.max(bucket.max, val);
    }
    buckets.set(key, bucket);
  }
  return [...buckets].slice(0, step ? 5000 : count).map(([ts, bucket]) => ({
    ts, val: mode === 'average' ? bucket.sum / bucket.count : bucket[mode],
  }));
}
