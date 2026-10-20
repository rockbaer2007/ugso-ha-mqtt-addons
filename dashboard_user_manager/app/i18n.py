"""Shared DE/EN/FR message catalog; preserve dynamic identifiers verbatim."""
import json
from pathlib import Path
import re

MESSAGES = json.loads((Path(__file__).parent / 'locales.json').read_text(encoding='utf-8'))

def language(header):
    code = (header or 'en').split(',')[0].split(';')[0].strip().lower().replace('_', '-').split('-')[0]
    return code if code in ('de', 'en', 'fr') else 'en'

def translate(text, lang):
    if lang == 'de' or not isinstance(text, str):
        return text
    if text in MESSAGES:
        return MESSAGES[text][1 if lang == 'fr' else 0]
    for key, translations in MESSAGES.items():
        if '{' not in key:
            continue
        pieces = re.split(r'(\{\w+\})', key)
        pattern = ''.join('(?P<' + p[1:-1] + '>' + (r'\d+' if p[1:-1] in ('number','count','views','users') else '.*?') + ')' if p.startswith('{') else re.escape(p) for p in pieces)
        if match := re.fullmatch(pattern, text):
            values = match.groupdict()
            if 'message' in values:
                values['message'] = translate(values['message'], lang)
            return translations[1 if lang == 'fr' else 0].format(**values)
    return text

def payload(value, lang):
    # Do not translate user names, paths, titles or the stored backup config.
    if not isinstance(value, dict):
        return value
    for key in ('error', 'message'):
        if key in value:
            value[key] = translate(value[key], lang)
    for row in value.get('views', []):
        if 'unsupported' in row:
            row['unsupported'] = translate(row['unsupported'], lang)
    if 'warnings' in value:
        value['warnings'] = [translate(item, lang) for item in value['warnings']]
    return value
