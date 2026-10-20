"""Pure transformations: change only each top-level view's visible property."""
import copy
import hashlib
import json


class Invalid(ValueError):
    pass


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False,
                                    separators=(',', ':')).encode()).hexdigest()


def human_users(users):
    return [u for u in users if not u.get('system_generated', False)]


def user_ids(view):
    value = view.get('visible', True)
    if isinstance(value, bool):
        return None if value else []
    if not isinstance(value, list) or any(
        not isinstance(item, dict) or set(item) != {'user'} or
        not isinstance(item['user'], str) or not item['user'] for item in value
    ):
        raise Invalid('Unbekanntes Sichtbarkeitsformat; diese Ansicht bleibt unverändert.')
    return list(dict.fromkeys(item['user'] for item in value))


def summary(config):
    rows = []
    for index, view in enumerate(config.get('views', [])):
        if not isinstance(view, dict):
            raise Invalid('Ungültige Ansichtskonfiguration.')
        row = {'index': index, 'title': view.get('title') or f'Ansicht {index + 1}',
               'title_generated': not bool(view.get('title')),
               'path': view.get('path', str(index)), 'subview': bool(view.get('subview'))}
        try:
            row['users'] = user_ids(view)
        except Invalid as exc:
            row.update(users=[], unsupported=str(exc))
        rows.append(row)
    return rows


def transform(config, users, operation, selected):
    if operation not in {'add', 'remove', 'replace', 'reset'}:
        raise Invalid('Unbekannte Aktion.')
    if not isinstance(selected, list) or any(not isinstance(x, str) for x in selected):
        raise Invalid('Ungültige Benutzerauswahl.')
    known = [u['id'] for u in human_users(users)]
    chosen = list(dict.fromkeys(selected))
    if any(x not in known for x in chosen):
        raise Invalid('Ein ausgewählter Benutzer existiert nicht mehr.')
    if operation != 'reset' and not chosen:
        raise Invalid('Bitte mindestens einen Benutzer auswählen.')
    if not isinstance(config, dict) or 'strategy' in config or not isinstance(config.get('views'), list):
        raise Invalid('Automatisch erzeugte Dashboards sind nicht bearbeitbar.')
    if not config['views']:
        raise Invalid('Dieses Dashboard enthält keine Ansichten.')
    result = copy.deepcopy(config)
    changes, warnings = [], []
    for index, view in enumerate(result['views']):
        if not isinstance(view, dict):
            raise Invalid('Ungültige Ansichtskonfiguration.')
        try:
            current = user_ids(view)
        except Invalid as exc:
            raise Invalid(f'Ansicht {index + 1}: {exc}') from exc
        before = copy.deepcopy(view)
        if operation == 'reset':
            view.pop('visible', None)
        elif operation == 'replace':
            view['visible'] = [{'user': x} for x in chosen]
        elif operation == 'add':
            if current is not None:
                added = [x for x in chosen if x not in current]
                if added:
                    view['visible'] = [*copy.deepcopy(view.get('visible') or []),
                                       *({'user': x} for x in added)]
        elif operation == 'remove':
            source = known if current is None else current
            remaining = [x for x in source if x not in chosen]
            if remaining != source:
                view['visible'] = [{'user': x} for x in remaining]
                if current is None:
                    warnings.append('Aus „Alle“ wird eine feste Benutzerliste. '
                                    'Künftige neue Benutzer werden nicht automatisch sichtbar.')
        if view != before:
            changes.append({'index': index, 'title': view.get('title') or f'Ansicht {index + 1}',
                            'before': current, 'after': user_ids(view),
                            'subview': bool(view.get('subview'))})
    return result, changes, list(dict.fromkeys(warnings))


def transform_matrix(config, users, rows):
    """Apply edited rows only; retain unrepresented/deleted user IDs."""
    if not isinstance(config, dict) or 'strategy' in config or not isinstance(config.get('views'), list):
        raise Invalid('Automatisch erzeugte Dashboards sind nicht bearbeitbar.')
    if not isinstance(rows, list):
        raise Invalid('Ungültige Ansichtenauswahl.')
    known = [u['id'] for u in human_users(users)]
    result, changes, seen = copy.deepcopy(config), [], set()
    for row in rows:
        if not isinstance(row, dict) or set(row) != {'index', 'users'}:
            raise Invalid('Ungültige Ansichtenauswahl.')
        index, selected = row['index'], row['users']
        if type(index) is not int or index < 0 or index >= len(result['views']) or index in seen:
            raise Invalid('Ungültige oder doppelte Ansicht.')
        seen.add(index)
        if not isinstance(selected, list) or any(not isinstance(x, str) or x not in known for x in selected):
            raise Invalid('Ungültiger oder nicht mehr vorhandener Benutzer.')
        view = result['views'][index]
        if not isinstance(view, dict):
            raise Invalid('Ungültige Ansichtskonfiguration.')
        current = user_ids(view)
        visible_known = set(known if current is None else (x for x in current if x in known))
        if visible_known == set(selected):
            continue
        remaining = [x for x in (current or []) if x not in known or x in selected]
        remaining += [x for x in known if x in selected and x not in remaining]
        view['visible'] = [{'user': x} for x in remaining]
        changes.append({'index': index, 'title': view.get('title') or f'Ansicht {index + 1}',
                        'before': current, 'after': remaining, 'subview': bool(view.get('subview'))})
    return result, changes, []
