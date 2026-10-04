"""Bounded, read-only Recorder data for external MaterialDesign charts."""
import math
import re
from datetime import datetime, timedelta, timezone

def material_history_plan(request, now=None):
    if not isinstance(request, dict) or set(request) != {'entity_ids', 'hours'}:
        raise ValueError('Ungültige Diagramm-Verlauf-Anfrage.')
    ids, hours = request['entity_ids'], request['hours']
    if not isinstance(ids, list) or not 1 <= len(ids) <= 10 or any(not isinstance(i, str) or not re.fullmatch(r'[a-z][a-z0-9_]*\.[a-z0-9_]+', i) for i in ids):
        raise ValueError('Eine bis zehn gültige Verlauf-Entitäten auswählen.')
    if isinstance(hours, bool) or not isinstance(hours, (int, float)) or not math.isfinite(hours) or not 1 <= hours <= 168:
        raise ValueError('Verlauf muss zwischen einer Stunde und sieben Tagen liegen.')
    end = now or datetime.now(timezone.utc)
    start = end - timedelta(hours=hours)
    return {'type': 'history/history_during_period', 'start_time': start.isoformat(), 'end_time': end.isoformat(), 'entity_ids': list(dict.fromkeys(ids)), 'minimal_response': True, 'no_attributes': True}, start, end

def material_history_data(ids, raw, start, end):
    buckets = raw if isinstance(raw, dict) else {}
    result = {'labels': [], 'datasets': []}
    times = set()
    series = []
    for entity in ids:
        points = []
        entries = buckets.get(entity, [])
        for entry in entries[:20000] if isinstance(entries, list) else []:
            if not isinstance(entry, dict):
                continue
            timestamp = entry.get('lu', entry.get('last_updated', entry.get('lc', entry.get('last_changed'))))
            try:
                when = datetime.fromtimestamp(timestamp, timezone.utc) if isinstance(timestamp, (int, float)) else datetime.fromisoformat(str(timestamp).replace('Z', '+00:00'))
                if when.tzinfo is None or when > end:
                    continue
                when = max(start, when)
                value = float(entry.get('s', entry.get('state')))
                if not math.isfinite(value):
                    value = None
            except (ValueError, TypeError, OverflowError, OSError):
                # Unknown states must preserve a gap at their valid timestamp.
                try:
                    when = datetime.fromtimestamp(timestamp, timezone.utc) if isinstance(timestamp, (int, float)) else datetime.fromisoformat(str(timestamp).replace('Z', '+00:00'))
                    if when.tzinfo is None or when > end:
                        continue
                    when = max(start, when)
                except (ValueError, TypeError, OverflowError, OSError):
                    continue
                value = None
            points.append((when, value))
        points.sort(key=lambda p: p[0])
        series.append((entity, points))
        times.update(p[0] for p in points)
    times = sorted(times)
    if len(times) > 720:
        times = [times[round(i * (len(times) - 1) / 719)] for i in range(720)]
    result['labels'] = [t.isoformat() for t in times]
    for entity, points in series:
        data, index, value = [], 0, None
        for when in times:
            gap = False
            while index < len(points) and points[index][0] <= when:
                value = points[index][1]
                gap = gap or value is None
                index += 1
            data.append(None if gap else value)
        result['datasets'].append({'label': entity, 'data': data})
    return result
