"""Fixed provider loader document for the sandboxed Meteored frame."""
import re


def meteored_document(widget_id):
    if not isinstance(widget_id, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", widget_id):
        raise ValueError("Ungültige Meteored-Widget-ID.")
    return ('<!doctype html><html><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<style>html,body{margin:0;padding:0;background:transparent}body{overflow:auto}</style>'
            '</head><body><div id="mrwid' + widget_id + '"></div>'
            '<script async src="https://api.meteored.com/widget/loader/' + widget_id + '"></script>'
            '</body></html>').encode("utf-8")
