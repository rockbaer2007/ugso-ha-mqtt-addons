"""Explicit HA actions for Material controls; no arbitrary services or bindings."""
import math
import re

def material_action(request, entries):
    if not isinstance(request, dict) or set(request) != {'entity_id', 'value'}:
        raise ValueError('Ungültige Material-Aktion.')
    entity, value = request['entity_id'], request['value']
    if not isinstance(entity, str) or not re.fullmatch(r'[a-z][a-z0-9_]*\.[a-z0-9_]+', entity):
        raise ValueError('Ungültige Home-Assistant-Entität.')
    entry = next((item for item in entries if isinstance(item, dict) and item.get('entity_id') == entity), None)
    domain = entity.split('.', 1)[0]
    if not entry or entry.get('state') == 'unavailable' or (entry.get('state') == 'unknown' and domain not in ('button', 'input_button')):
        raise ValueError('Entität ist nicht verfügbar.')
    attrs = entry.get('attributes', {})
    data = {}
    if (domain in ('switch', 'input_boolean') and value in ('on', 'off', 'true', 'false', '1', '0', True, False, 1, 0)) or (domain == 'light' and isinstance(value, str) and value in ('on', 'off')):
        service = 'turn_on' if value in ('on', 'true', '1', True, 1) else 'turn_off'
    elif domain in ('input_number', 'number', 'light', 'fan', 'cover'):
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise ValueError('Ein endlicher Zahlenwert ist erforderlich.')
        if domain in ('input_number', 'number'):
            minimum, maximum = attrs.get('min'), attrs.get('max')
            if (isinstance(minimum, (int, float)) and value < minimum) or (isinstance(maximum, (int, float)) and value > maximum):
                raise ValueError('Der Wert liegt außerhalb der Entitätsgrenzen.')
            service, data = 'set_value', {'value': value}
        else:
            if not 0 <= value <= 100:
                raise ValueError('Der Wert muss zwischen 0 und 100 liegen.')
            service, key = {'light': ('turn_on', 'brightness_pct'), 'fan': ('set_percentage', 'percentage'), 'cover': ('set_cover_position', 'position')}[domain]
            data = {key: value}
    elif domain in ('input_text', 'text'):
        maximum = attrs.get('max', 255)
        maximum = min(255, maximum) if isinstance(maximum, (int, float)) and not isinstance(maximum, bool) else 255
        if not isinstance(value, str) or len(value) > maximum:
            raise ValueError('Der Text überschreitet die Entitätsgrenze.')
        service, data = 'set_value', {'value': value}
    elif domain in ('select', 'input_select'):
        if not isinstance(value, str) or value not in attrs.get('options', []):
            raise ValueError('Die Auswahl ist nicht verfügbar.')
        service, data = 'select_option', {'option': value}
    elif domain in ('button', 'input_button') and value == 'PRESS':
        service = 'press'
    else:
        raise ValueError('Diese Entität unterstützt den Material-Befehl nicht.')
    return {'type': 'call_service', 'domain': domain, 'service': service, 'target': {'entity_id': entity}, 'service_data': data}
