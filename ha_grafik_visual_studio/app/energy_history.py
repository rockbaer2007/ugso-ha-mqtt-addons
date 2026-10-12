"""Read-only, bounded Home Assistant Recorder data for Energy charts."""
import math
import re
from datetime import datetime, timedelta, timezone

def energy_history_plan(request, now=None):
    if not isinstance(request, dict) or set(request) - {'entity_ids', 'start', 'end', 'attributes'} or not {'entity_ids', 'start', 'end'} <= set(request):
        raise ValueError('Ungültige Energie-Verlauf-Anfrage.')
    ids=request['entity_ids']
    if not isinstance(ids,list) or not 1 <= len(ids) <= 6 or any(not isinstance(i,str) or not re.fullmatch(r'[a-z][a-z0-9_]*\.[a-z0-9_]+',i) for i in ids):
        raise ValueError('Eine bis sechs gültige Verlauf-Entitäten auswählen.')
    attributes = request.get('attributes', {})
    if not isinstance(attributes, dict) or any(key not in ids or not isinstance(value, str) or not value or len(value) > 128 or any(ord(char) < 32 for char in value) for key, value in attributes.items()):
        raise ValueError('Ungültige Verlauf-Attributauswahl.')
    try:
        start=datetime.fromisoformat(request['start'].replace('Z','+00:00'))
        end=datetime.fromisoformat(request['end'].replace('Z','+00:00'))
    except (TypeError,ValueError,AttributeError):
        raise ValueError('Gültige Zeitstempel mit Zeitzone erforderlich.')
    if start.tzinfo is None or end.tzinfo is None or end <= start or end-start > timedelta(days=366, hours=2):
        raise ValueError('Verlauf benötigt einen Zeitraum von maximal 366 Tagen.')
    current=now or datetime.now(timezone.utc)
    if start > current:
        raise ValueError('Der Zeitraum liegt in der Zukunft.')
    end=min(end,current)
    return {'type':'history/history_during_period','start_time':start.isoformat(),'end_time':end.isoformat(),'entity_ids':list(dict.fromkeys(ids)),'minimal_response':not bool(attributes),'no_attributes':not bool(attributes)}, start, end

def energy_history_data(ids,raw,start,end,attributes=None):
    result={'series':{},'start':start.isoformat(),'end':end.isoformat()}
    for entity in ids:
        entries=raw.get(entity,[]) if isinstance(raw,dict) else []
        if not isinstance(entries,list): entries=[]
        if len(entries)>20000: raise ValueError('Zu viele Recorder-Zustände; kürzeren Zeitraum auswählen.')
        points=[]
        for entry in entries:
            if not isinstance(entry,dict): continue
            stamp=entry.get('lu',entry.get('last_updated',entry.get('lc',entry.get('last_changed'))))
            try:
                when=datetime.fromtimestamp(stamp,timezone.utc) if isinstance(stamp,(float,int)) else datetime.fromisoformat(str(stamp).replace('Z','+00:00'))
                if when.tzinfo is None or when>end: continue
            except (ValueError,TypeError,OverflowError,OSError): continue
            try:
                source = entry.get('a', entry.get('attributes', {})) if (attributes or {}).get(entity) else None
                value=float(source.get(attributes[entity]) if isinstance(source,dict) else None if (attributes or {}).get(entity) else entry.get('s',entry.get('state')))
                if not math.isfinite(value):value=None
            except (ValueError,TypeError,OverflowError):value=None
            points.append({'x':max(start,when).timestamp()*1000,'y':value})
        result['series'][entity]=sorted(points,key=lambda p:p['x'])
    return result
