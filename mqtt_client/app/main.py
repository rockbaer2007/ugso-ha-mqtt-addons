"""Independent HA -> external MQTT client, with explicit command permissions."""

import json
import math
import logging
import os
import queue
import re
import signal
import ssl
import threading
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from itertools import count
from pathlib import Path
from tempfile import NamedTemporaryFile

import paho.mqtt.client as mqtt
from live import StateStream, TopicInventory, broker_identity, entity_registry
from routing import TopicRoutes
from settings_store import SettingsStore
from label_support import related_readings, related_reading_report, reading_class, READING_CLASSES, metadata as label_metadata, light_features, light_value, light_command, finite
from websocket import WebSocketException

LOG = logging.getLogger("mqtt-client")
ENTITY = re.compile(r"^[a-z0-9_]+\.[a-z0-9_]+$")
ATTRIBUTE = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_.-]*$")
TOGGLE_COMMAND_DOMAINS = {"switch", "light", "input_boolean", "fan"}
VALUE_COMMAND_DOMAINS = {"input_number", "number", "input_select", "select", "input_text", "text"}
PRESS_COMMAND_DOMAINS = {"button", "input_button"}
COMMAND_DOMAINS = TOGGLE_COMMAND_DOMAINS | VALUE_COMMAND_DOMAINS | PRESS_COMMAND_DOMAINS | {"cover"}
OPTIONS_PATH = Path(os.environ.get("MQTT_CLIENT_OPTIONS", "/data/options.json"))
INGRESS_PORT = int(os.environ.get("MQTT_CLIENT_INGRESS_PORT", "8099"))
APP_VERSION = "0.1.36"
DEVICE_SUFFIXES = (
    "Energieeinspeisung",
    "Last Response Time",
    "Signal Strength",
    "Link Quality",
    "Failed Pings",
    "Neu starten",
    "Gesamtenergie",
    "Stromstärke",
    "Überhitzung",
    "Überspannung",
    "Überstrom",
    "Überlast",
    "Temperatur",
    "Feuchtigkeit",
    "Spannung",
    "Leistung",
    "Batterie",
    "Firmware",
    "Uptime",
    "Status",
    "Energie",
    "Energy",
    "Power",
    "Voltage",
    "Current",
    "Battery",
    "Humidity",
    "RSSI",
    "Signal",
    "Switch",
    "Schalter",
    "Update",
)


def ascii_slug_text(value):
    text = str(value).casefold()
    replacements = {"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"}
    for source, target in replacements.items():
        text = text.replace(source, target)
    return re.sub(r"[^a-z0-9]+", "_", text).strip("_")


DEVICE_OBJECT_SUFFIXES = tuple(f"_{ascii_slug_text(suffix)}" for suffix in DEVICE_SUFFIXES)


INDEX_HTML = """<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MQTT-Client</title>
  <link rel="icon" type="image/svg+xml" href="./mqtt-icon.svg">
  <style>
    :root { color-scheme: light dark; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: var(--primary-background-color, #111827); color: var(--primary-text-color, #f9fafb); }
    main { max-width: 1120px; margin: 0 auto; padding: 24px 16px 32px; }
    h1 { font-size: 1.35rem; margin: 0 0 18px; font-weight: 650; }
    h1 { display: flex; align-items: center; gap: 10px; }
    h1 img { width: 36px; height: 36px; flex-shrink: 0; }
    h2 { font-size: 1rem; margin: 0 0 10px; font-weight: 650; }
    form, .panel { border: 1px solid rgba(148, 163, 184, .35); border-radius: 8px; padding: 14px; background: var(--ha-card-background, rgba(15, 23, 42, .38)); }
    form { display: grid; gap: 14px; margin-bottom: 16px; }
    label { display: grid; gap: 6px; font-size: .93rem; }
    input { box-sizing: border-box; width: 100%; border: 1px solid rgba(148, 163, 184, .55); border-radius: 8px; padding: 11px 12px; font: inherit; background: rgba(15, 23, 42, .18); color: inherit; }
    input:focus { outline: 2px solid #03a9f4; outline-offset: 1px; }
    select { width: 100%; box-sizing: border-box; border: 1px solid #64748b; border-radius: 8px; padding: 11px; font: inherit; color: inherit; background: #1f2937; }
    textarea { box-sizing: border-box; width: 100%; max-width: 100%; padding: 8px; border-radius: 8px; font: inherit; color: inherit; background: rgba(15, 23, 42, .18); }
    details > label, details > p { margin-top: 10px; }
    #retainedList label { overflow-wrap: anywhere; }
    main > section.panel { margin-bottom: 16px; }
    main > section.panel .toolbar { flex-wrap: wrap; }
    main > section.panel .toolbar button { flex: 1 1 200px; }
    .row { display: grid; grid-template-columns: 1fr 120px; gap: 12px; }
    .status { display: flex; align-items: center; gap: 10px; margin: 0 0 20px; font-weight: 650; }
    .dot { width: 14px; height: 14px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 0 4px rgba(239, 68, 68, .18); }
    .status.connected .dot { background: #22c55e; box-shadow: 0 0 0 4px rgba(34, 197, 94, .18); }
    .hint, .message, .sub { color: var(--secondary-text-color, #94a3b8); font-size: .85rem; }
    .hint { margin: -4px 0 2px; }
    button { border: 0; border-radius: 8px; padding: 10px 14px; font: inherit; font-weight: 650; color: #fff; background: #03a9f4; cursor: pointer; }
    button.secondary { color: inherit; background: rgba(148, 163, 184, .2); }
    button.danger { background: #ef4444; }
    button:disabled { opacity: .55; cursor: default; }
    .message { min-height: 1.35em; }
    .credentials { margin-bottom: 16px; }
    .credentialsToggle { width: 100%; text-align: left; color: inherit; background: rgba(148, 163, 184, .12); }
    .credentialsToggle::before { content: '▸'; display: inline-block; width: 20px; }
    .credentialsToggle[aria-expanded="true"]::before { content: '▾'; }
    #credentialsFields, #tlsFields { display: grid; gap: 10px; margin-top: 10px; }
    #credentialsFields[hidden], #tlsFields[hidden] { display: none !important; }
    .transferList { display: grid; gap: 8px; max-height: 60vh; overflow: auto; }
    .transferRow { display: grid; gap: 5px; padding: 12px; border-radius: 8px; background: rgba(148, 163, 184, .12); overflow-wrap: anywhere; }
    .transferHeading { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .origin { padding: 3px 8px; border-radius: 12px; font-size: .78rem; font-weight: 650; }
    .origin.label { color: #082f49; background: #7dd3fc; }
    .origin.manual { color: #052e16; background: #86efac; }
    .origin.both { color: #2e1065; background: #d8b4fe; }
    .transferError { color: #fca5a5; }
    #transmissionsDialog .dialog-body { display: flex; flex-direction: column; max-height: calc(100dvh - 60px); box-sizing: border-box; }
    #transmissionsDialog .transferList { min-height: 0; flex: 1 1 auto; }
    .connectionActions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .entity-grid { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 16px; }
    .toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .toolbar input { padding: 9px 10px; }
    .list { display: grid; gap: 8px; max-height: 460px; overflow: auto; padding-right: 4px; }
    .device { width: 100%; text-align: left; color: inherit; background: rgba(148, 163, 184, .12); display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: center; }
    .device:hover { background: rgba(3, 169, 244, .18); }
    .devicePopup { width: min(920px, calc(100vw - 28px)); }
    .deviceSections { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; max-height: 62vh; overflow: auto; }
    .deviceSection { border: 1px solid rgba(148, 163, 184, .25); border-radius: 10px; padding: 12px; background: rgba(148, 163, 184, .08); }
    .deviceSection h3 { margin: 0 0 10px; font-size: .98rem; }
    .deviceRows { display: grid; gap: 6px; }
    .entityRow { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 10px 12px; border-radius: 8px; background: rgba(148, 163, 184, .12); }
    .entityRow input { width: auto; }
    .entityText { display: grid; gap: 3px; min-width: 0; }
    .entityRow .name, .entityValue { font-weight: 400; }
    .entityValue { white-space: nowrap; }
    .entity, .selected { width: 100%; text-align: left; color: inherit; background: rgba(148, 163, 184, .12); display: grid; gap: 2px; }
    .entity:hover, .selected:hover { background: rgba(3, 169, 244, .18); }
    .selected { grid-template-columns: minmax(0, 1fr) auto; align-items: center; }
    .name { font-weight: 650; overflow-wrap: anywhere; }
    .meta { color: var(--secondary-text-color, #94a3b8); font-size: .78rem; overflow-wrap: anywhere; }
    .check.bidirectional { display: none; }
    .check.bidirectional.visible { display: flex; }
    dialog { width: min(560px, calc(100vw - 28px)); border: 1px solid rgba(148, 163, 184, .4); border-radius: 8px; padding: 0; background: var(--ha-card-background, #111827); color: inherit; }
    dialog::backdrop { background: rgba(0, 0, 0, .45); }
    .dialog-body { display: grid; gap: 14px; padding: 18px; }
    .checks { display: grid; gap: 8px; max-height: 260px; overflow: auto; }
    .check { display: flex; gap: 10px; align-items: center; padding: 8px; border-radius: 8px; background: rgba(148, 163, 184, .12); }
    .check input { width: auto; }
    .check.deviceReadingsOption { border: 1px solid rgba(251, 191, 36, .65); border-left: 4px solid #fbbf24; background: rgba(251, 191, 36, .16); padding: 12px; font-weight: 650; }
    .deviceReadingsOption input { accent-color: #fbbf24; flex-shrink: 0; }
    .actions { display: flex; justify-content: flex-end; gap: 10px; }
    @media (max-width: 820px) { .entity-grid, .row, .deviceSections { grid-template-columns: 1fr; } main { padding-top: 18px; } }
  </style>
</head>
<body>
  <main>
    <h1><img src="./mqtt-icon.svg" width="36" height="36" alt="">MQTT-Client</h1>
    <div id="status" class="status"><span class="dot"></span><span>Keine Verbindung</span></div>
    <p id="statusDetails" class="sub" role="status"></p>
    <form id="form" autocomplete="off">
    <section id="credentials" class="credentials">
    <button id="credentialsToggle" class="credentialsToggle" type="button" aria-expanded="false" aria-controls="credentialsFields">Zugangsdaten</button>
    <div id="credentialsFields" hidden>
      <div class="row">
        <label>IP oder Hostname
          <input id="broker_host" name="broker_host" required placeholder="192.168.1.20">
        </label>
        <label>Port
          <input id="broker_port" name="broker_port" type="number" min="1" max="65535" value="1883" required>
        </label>
      </div>
      <label>Username
        <input id="username" name="username" autocomplete="username">
      </label>
      <label>Passwort
        <input id="password" name="password" type="password" autocomplete="new-password" placeholder="unverändert lassen">
      </label>
      <p class="hint">Standardport für den ioBroker-MQTT-Adapter: 1883.</p>
    </div>
    </section>
      <section id="transferSettings"><h2>Übertragung und TLS</h2>
        <label>Publish-Pause für Messwerte und Attribute in ms
          <input id="publish_delay_ms" name="publish_delay_ms" type="number" min="0" max="1000" value="50">
        </label>
        <p class="hint">Schaltzustände und Rückmeldungen haben Vorrang und werden durch diese Pause nicht gebremst.</p>
        <label>HA-Kontrollabgleich / Polling-Rückfall in Sekunden <input name="poll_interval" type="number" min="1" max="300" value="5"></label>
        <label>Topic-Präfix <input name="topic_prefix" value="ha_external" required></label>
        <label>HA-Label-ID für Zustandsweiterleitung <input name="forward_label" placeholder="an_mqtt_client_weiterleiten" maxlength="128"></label>
        <label class="check deviceReadingsOption"><input name="label_device_readings" type="checkbox"> Zugehörige Mess- und Batteriewerte desselben Geräts automatisch einbeziehen</label>
        <button id="readingDiagnostics" type="button" class="secondary">Zugehörige Messwerte prüfen</button>
        <p class="hint">Label-Auswahl aktiviert passende Rückkanäle und Standardattribute. Zusätzliche Messwerte werden nur gelesen. Light-Helligkeit: 0–100 %.</p>
        <label>Client-ID <input name="client_id" value="ugso-ha-mqtt-client" required></label>
        <label>MQTT-Struktur für neue Entitäten und Labels
          <select name="topic_layout_new"><option value="nested">Bisherige Struktur mit state/set</option><option value="flat">Flach mit kurzen Namen</option></select>
        </label>
        <p class="hint">Nur neue Entitäten erhalten diese Struktur. Bereits gespeicherte Pfade bleiben auch nach Label-Wechsel, Neustart und Update erhalten. Nach der Auswahl speichern. Für flache MQTT-Pfade wird Helfer 0.1.34 benötigt.</p>
        <section id="tlsSettings">
        <button id="tlsToggle" class="credentialsToggle" type="button" aria-expanded="false" aria-controls="tlsFields">TLS und Zertifikate</button>
        <div id="tlsFields" hidden>
        <label class="check"><input name="tls" type="checkbox"> TLS mit Zertifikatsprüfung</label>
        <p class="hint">PEM-Dateien laden oder Text einfügen. Leere Felder behalten vorhandene Zertifikate. Client-Zertifikat und privater Schlüssel gehören zusammen.</p>
        <label>Eigene CA (PEM) <textarea name="tls_ca" rows="3" placeholder="unverändert lassen"></textarea><input type="file" data-pem="tls_ca" accept=".pem,.crt,.cer"></label>
        <label>Client-Zertifikat (PEM) <textarea name="tls_cert" rows="3" placeholder="unverändert lassen"></textarea><input type="file" data-pem="tls_cert" accept=".pem,.crt"></label>
        <label>Privater Client-Schlüssel (PEM) <textarea name="tls_key" rows="3" placeholder="unverändert lassen"></textarea><input type="file" data-pem="tls_key" accept=".pem,.key"></label>
        <label class="check"><input name="clear_tls_material" type="checkbox"> Gespeicherte TLS-Zertifikate und Schlüssel entfernen</label>
        <p id="tlsStored" class="hint"></p>
        </div>
        </section>
      </section>
      <div class="connectionActions">
        <button id="save" type="submit">Speichern und verbinden</button>
        <button id="transmissions" type="button" class="secondary">Aktuell übertragene Werte</button>
      </div>
    </form>
    <div id="message" class="message" role="status"></div>
    <dialog id="readingDialog"><div class="dialog-body">
      <h2>Zugehörige Messwerte prüfen</h2>
      <p class="sub">Nur die HA-Gerätezuordnung zählt. Fehlende Klassen können für W, V, A oder Wh aus eindeutigen Einheiten ergänzt werden. Keine Zuordnung nur anhand ähnlicher Namen.</p>
      <div id="readingReport" class="checks" role="status"></div>
      <div class="actions"><button id="closeReadingDialog" type="button" class="secondary">Schließen</button></div>
    </div></dialog>
    <dialog id="transmissionsDialog" class="devicePopup"><div class="dialog-body">
      <h2>Aktuell übertragene Werte</h2>
      <p class="sub">Blau: Label · Grün: Manuell · Violett: Beides. Bestätigt bedeutet vom MQTT-Broker angenommen, nicht vom Zielgerät verarbeitet. Bestätigungsdaten werden nur im Arbeitsspeicher gehalten.</p>
      <div class="toolbar"><input id="transferSearch" aria-label="Übertragene Werte suchen" placeholder="Name, Entität, Attribut oder Topic suchen"><button id="refreshTransfers" type="button">Aktualisieren</button></div>
      <p id="transferCount" class="sub" role="status"></p>
      <div id="transferList" class="transferList"></div>
      <div class="actions"><button id="closeTransfers" type="button" class="secondary">Schließen</button></div>
    </div></dialog>
    <section class="panel">
      <h2>Sicherung und Retain-Bereinigung</h2>
      <p class="hint">Sicherung ohne MQTT-Passwort und ohne Client-Zertifikat/privaten Schlüssel. Beim Wiederherstellen auf einem anderen Broker diese separat neu eintragen.</p>
      <div class="toolbar">
        <button id="backup" type="button" class="secondary">Einstellungen sichern</button>
        <a href="downloads/ugso-mqtt-role-mapper.js" download="ugso-mqtt-role-mapper.js">ioBroker-/VIS-2-Helfer herunterladen</a>
        <button id="restore" type="button" class="secondary">Sicherung öffnen</button>
        <input id="restoreFile" type="file" accept=".json" hidden>
        <button id="retained" type="button" class="secondary">Veraltete Retain-Topics prüfen</button>
      </div>
    </section>
    <dialog id="retainedDialog"><div class="dialog-body">
      <h2>Veraltete Retain-Topics</h2>
      <p>Nur von dieser App erfasste Topics auf dem aktuellen Broker. Auswählen und Löschen bestätigen; aktive Werte bleiben erhalten. Höchstens 100 Topics pro Vorgang.</p>
      <div id="retainedList" class="list"></div>
      <div class="actions"><button id="deleteRetained" type="button">Ausgewählte löschen</button><button id="closeRetained" type="button" class="secondary">Schließen</button></div>
    </div></dialog>

    <section class="entity-grid">
      <div class="panel">
        <h2>Geräte</h2>
        <div class="toolbar">
          <input id="filter" type="search" placeholder="Gerät oder Entität suchen">
          <button id="reload" class="secondary" type="button">Neu laden</button>
        </div>
        <div id="entityList" class="list"></div>
      </div>
      <div class="panel">
        <h2>Übertragung</h2>
        <p class="sub">Ausgewählte States und Attribute werden an MQTT gesendet.</p>
        <div id="selectedList" class="list"></div>
        <div id="selectionMessage" class="message"></div>
      </div>
    </section>
  </main>

  <dialog id="deviceDialog" class="devicePopup">
    <div class="dialog-body">
      <div>
        <h2 id="deviceDialogTitle">Gerät</h2>
        <div id="deviceDialogMeta" class="meta"></div>
      </div>
      <label class="check"><input id="deviceSelectAll" type="checkbox"> Alle States dieses Geräts übertragen</label>
      <div id="deviceSections" class="deviceSections"></div>
      <div class="actions">
        <button id="closeDeviceDialog" class="secondary" type="button">Schließen</button>
      </div>
    </div>
  </dialog>

  <dialog id="entityDialog">
    <div class="dialog-body">
      <div>
        <h2 id="dialogTitle">Entität</h2>
        <div id="dialogMeta" class="meta"></div>
      </div>
      <label class="check"><input id="stateCheck" type="checkbox"> State übertragen</label>
      <label id="commandRow" class="check bidirectional"><input id="commandCheck" type="checkbox"> Bidirektional / Werte schreiben</label>
      <div>
        <h2>Attribute</h2>
        <div id="attributeList" class="checks"></div>
      </div>
      <div class="actions">
        <button id="removeEntity" class="danger" type="button">Entfernen</button>
        <button id="closeDialog" class="secondary" type="button">Abbrechen</button>
        <button id="saveEntity" type="button">Übernehmen</button>
      </div>
    </div>
  </dialog>

  <script>
    const form = document.getElementById('form');
    const statusBox = document.getElementById('status');
    const message = document.getElementById('message');
    const save = document.getElementById('save');
    const filter = document.getElementById('filter');
    const entityList = document.getElementById('entityList');
    const selectedList = document.getElementById('selectedList');
    const selectionMessage = document.getElementById('selectionMessage');
    const deviceDialog = document.getElementById('deviceDialog');
    const deviceSections = document.getElementById('deviceSections');
    const deviceSelectAll = document.getElementById('deviceSelectAll');
    const dialog = document.getElementById('entityDialog');
    const stateCheck = document.getElementById('stateCheck');
    const commandRow = document.getElementById('commandRow');
    const commandCheck = document.getElementById('commandCheck');
    const attributeList = document.getElementById('attributeList');
    let catalog = [];
    let devices = [];
    let selectedStates = new Set();
    let selectedAttributes = new Set();
    let commandEntities = new Set();
    let activeEntity = null;
    let activeDevice = null;
    const commandDomains = new Set(['switch', 'light', 'fan', 'cover', 'input_boolean', 'input_number', 'number', 'input_select', 'select', 'input_text', 'text', 'button', 'input_button']);

    function setStatus(data) {
      statusBox.classList.toggle('connected', Boolean(data.connected));
      statusBox.querySelector('span:last-child').textContent = data.text || 'Keine Verbindung';
      const date = value => value ? new Date(value * 1000).toLocaleString() : 'noch keine';
      document.getElementById('statusDetails').textContent = `MQTT: ${data.mqtt_connected ? 'verbunden' : 'getrennt'} · HA: ${data.ha_connected ? 'erreichbar' : 'nicht erreichbar'} · ${data.mode === 'websocket' ? 'Live-Ereignisse' : 'Polling-Rückfall'} · Abgleich: ${date(data.last_sync)} · Übertragung: ${date(data.last_publish)} · Wartend: ${data.pending_events || 0} · Zusammengefasst: ${data.coalesced_events || 0} · HA-Eingang: ${date(data.last_ha_event)} · Gesendet: ${data.published || 0}` + (data.last_error ? ` · Fehler: ${data.last_error}` : '') + (data.stream_error ? ` · Live-Verbindung: ${data.stream_error}` : '') + (data.dropped_events ? ` · Überlast/Neuabgleich: ${data.dropped_events}` : '');
    }

    function attrKey(entity, attr) {
      return `${entity}:${attr}`;
    }

    function entityLabel(item) {
      return item.name || item.entity_id;
    }

    function deviceMatches(device, term) {
      if (!term) return true;
      if ((device.name || '').toLowerCase().includes(term)) return true;
      return (device.entities || []).some((item) => {
        return entityLabel(item).toLowerCase().includes(term) || item.entity_id.toLowerCase().includes(term);
      });
    }

    function isCommandEntity(entityId) {
      return commandDomains.has(entityId.split('.')[0]);
    }

    function syncAutomaticCommand(item) {
      if (selectedStates.has(item.entity_id) && isCommandEntity(item.entity_id)) {
        commandEntities.add(item.entity_id);
      } else {
        commandEntities.delete(item.entity_id);
      }
    }

    function entityDomain(item) {
      return item.entity_id.split('.')[0];
    }

    function entitySection(item) {
      const domain = entityDomain(item);
      const label = `${entityLabel(item)} ${item.entity_id}`.toLowerCase();
      if (label.match(/diagnose|diagnostic|überhitz|overheat|überlast|overload|failed|ping|response|rssi|signal|uptime|status/)) return 'Diagnose';
      if (['update', 'button', 'input_button'].includes(domain) || label.match(/firmware|konfiguration|configuration|restart|neu starten/)) return 'Konfiguration';
      if (['switch', 'light', 'input_boolean', 'fan', 'cover', 'lock', 'input_number', 'number', 'input_select', 'select', 'input_text', 'text'].includes(domain)) return 'Steuerung';
      return 'Sensoren';
    }

    function deviceCountLabel(device) {
      const count = (device.entities || []).length;
      return count === 1 ? '1 Entität' : `${count} Entitäten`;
    }

    function selectedSummary(entityId) {
      const attrs = [...selectedAttributes].filter((entry) => entry.startsWith(`${entityId}:`));
      const parts = [];
      if (selectedStates.has(entityId)) parts.push('State');
      if (attrs.length) parts.push(`${attrs.length} Attribute`);
      if (commandEntities.has(entityId)) parts.push('Rückbefehl aktiv');
      return parts.length ? ` · ${parts.join(' · ')}` : '';
    }

    function deviceStateEntities(device) {
      return (device?.entities || []).map((item) => item.entity_id);
    }

    function selectEntityWithAttributes(item, selected) {
      if (selected) selectedStates.add(item.entity_id);
      else selectedStates.delete(item.entity_id);
      syncAutomaticCommand(item);
      (item.attributes || []).forEach((attr) => {
        const key = attrKey(item.entity_id, attr);
        if (selected) selectedAttributes.add(key);
        else selectedAttributes.delete(key);
      });
    }

    function entityFullySelected(item) {
      return selectedStates.has(item.entity_id) && (item.attributes || []).every((attr) => selectedAttributes.has(attrKey(item.entity_id, attr)));
    }

    function updateDeviceSelectAllState() {
      if (!activeDevice) return;
      const items = activeDevice.entities || [];
      const selectedCount = items.filter((item) => entityFullySelected(item)).length;
      deviceSelectAll.checked = Boolean(items.length && selectedCount === items.length);
      deviceSelectAll.indeterminate = Boolean(selectedCount && selectedCount < items.length);
      deviceSections.querySelectorAll('.entityRow').forEach((row) => {
        const item = catalog.find((entry) => entry.entity_id === row.dataset.entityId);
        if (!item) return;
        const input = row.querySelector('input[type="checkbox"]');
        const meta = row.querySelector('.entityDetails');
        input.checked = entityFullySelected(item);
        meta.textContent = `${item.iobroker_type} · ${item.attributes.length} Attribute${selectedSummary(item.entity_id)}`;
      });
    }

    function renderLists() {
      const term = filter.value.trim().toLowerCase();
      entityList.innerHTML = '';
      devices
        .filter((device) => deviceMatches(device, term))
        .forEach((device) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'device';
          button.innerHTML = `<span class="name"></span><span class="meta"></span>`;
          button.querySelector('.name').textContent = device.name || 'Gerät';
          button.querySelector('.meta').textContent = deviceCountLabel(device);
          button.addEventListener('click', () => openDevice(device.id));
          entityList.appendChild(button);
        });
      if (!entityList.children.length) {
        entityList.innerHTML = '<div class="sub">Kein Gerät gefunden.</div>';
      }

      selectedList.innerHTML = '';
      const selectedIds = new Set([...selectedStates, ...[...selectedAttributes].map((entry) => entry.split(':')[0])]);
      [...selectedIds].sort().forEach((entity) => {
        const attrs = [...selectedAttributes].filter((entry) => entry.startsWith(`${entity}:`)).map((entry) => entry.slice(entity.length + 1));
        const item = catalog.find((entry) => entry.entity_id === entity);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'selected';
        button.innerHTML = `<span class="entityText"><span class="name"></span><span class="meta"></span></span><span>Bearbeiten</span>`;
        button.querySelector('.name').textContent = item ? entityLabel(item) : entity;
        const parts = [];
        if (selectedStates.has(entity)) parts.push('State');
        if (attrs.length) parts.push(`${attrs.length} Attribute`);
        if (commandEntities.has(entity)) parts.push('Rückbefehl aktiv');
        button.querySelector('.meta').textContent = parts.join(' · ') || 'Keine Auswahl';
        button.addEventListener('click', () => openEntity(entity));
        selectedList.appendChild(button);
      });
      if (!selectedIds.size) {
        selectedList.innerHTML = '<div class="sub">Noch keine Entität ausgewählt.</div>';
      }
    }

    function openDevice(deviceId) {
      activeDevice = devices.find((device) => device.id === deviceId);
      if (!activeDevice) return;
      if ((activeDevice.entities || []).length === 1) {
        openEntity(activeDevice.entities[0].entity_id);
        return;
      }
      document.getElementById('deviceDialogTitle').textContent = activeDevice.name || 'Gerät';
      document.getElementById('deviceDialogMeta').textContent = deviceCountLabel(activeDevice);
      deviceSections.innerHTML = '';
      const groups = new Map([['Steuerung', []], ['Sensoren', []], ['Konfiguration', []], ['Diagnose', []]]);
      (activeDevice.entities || []).forEach((item) => groups.get(entitySection(item)).push(item));
      groups.forEach((items, title) => {
        if (!items.length) return;
        const section = document.createElement('section');
        section.className = 'deviceSection';
        section.innerHTML = '<h3></h3><div class="deviceRows"></div>';
        section.querySelector('h3').textContent = title;
        const rows = section.querySelector('.deviceRows');
        items.forEach((item) => {
          const row = document.createElement('label');
          row.className = 'entityRow';
          row.dataset.entityId = item.entity_id;
          row.innerHTML = '<input type="checkbox"><span class="entityText"><span class="name"></span><span class="entityId meta"></span><span class="meta entityDetails"></span></span><span class="entityValue"></span>';
          row.querySelector('.name').textContent = entityLabel(item);
          row.querySelector('.entityId').textContent = item.entity_id;
          row.querySelector('.entityDetails').textContent = `${item.iobroker_type} · ${item.attributes.length} Attribute${selectedSummary(item.entity_id)}`;
          row.querySelector('.entityValue').textContent = item.state;
          const input = row.querySelector('input');
          input.checked = entityFullySelected(item);
          input.addEventListener('change', async () => {
            selectEntityWithAttributes(item, input.checked);
            try {
              await saveSelections();
              updateDeviceSelectAllState();
            } catch (error) {
              selectionMessage.textContent = error.message;
            }
          });
          rows.appendChild(row);
        });
        deviceSections.appendChild(section);
      });
      if (!deviceSections.children.length) {
        deviceSections.innerHTML = '<div class="sub">Keine Entitäten gefunden.</div>';
      }
      updateDeviceSelectAllState();
      deviceDialog.showModal();
    }

    function openEntity(entityId) {
      activeEntity = catalog.find((item) => item.entity_id === entityId) || { entity_id: entityId, name: entityId, state: '', attributes: [] };
      document.getElementById('dialogTitle').textContent = entityLabel(activeEntity);
      document.getElementById('dialogMeta').textContent = activeEntity.state ? `${activeEntity.entity_id} · aktueller State: ${activeEntity.state}` : activeEntity.entity_id;
      stateCheck.checked = selectedStates.has(entityId);
      commandCheck.checked = commandEntities.has(entityId);
      commandRow.classList.toggle('visible', isCommandEntity(entityId));
      attributeList.innerHTML = '';
      activeEntity.attributes.forEach((attr) => {
        const label = document.createElement('label');
        label.className = 'check';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = attr;
        input.checked = selectedAttributes.has(attrKey(entityId, attr));
        const span = document.createElement('span');
        span.textContent = attr;
        label.append(input, span);
        attributeList.appendChild(label);
      });
      if (!activeEntity.attributes.length) attributeList.innerHTML = '<div class="sub">Keine Attribute gefunden.</div>';
      dialog.showModal();
    }

    async function saveSelections() {
      selectionMessage.textContent = 'Speichere Auswahl...';
      const response = await fetch('./api/selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entities: [...selectedStates], entity_attributes: [...selectedAttributes], command_entities: [...commandEntities] })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Auswahl konnte nicht gespeichert werden');
      selectionMessage.textContent = 'Auswahl gespeichert.';
      renderLists();
    }

    function setCredentialsOpen(open) {
      document.getElementById('credentialsFields').hidden = !open;
      document.getElementById('credentialsToggle').setAttribute('aria-expanded', String(open));
    }

    document.getElementById('credentialsToggle').addEventListener('click', () => {
      setCredentialsOpen(document.getElementById('credentialsFields').hidden);
    });
    document.getElementById('credentialsFields').addEventListener('invalid', () => setCredentialsOpen(true), true);

    function setTlsOpen(open) {
      document.getElementById('tlsFields').hidden = !open;
      document.getElementById('tlsToggle').setAttribute('aria-expanded', String(open));
    }
    function updateTlsSummary() {
      document.getElementById('tlsToggle').textContent = 'TLS und Zertifikate · ' + (form.tls.checked ? 'TLS ausgewählt' : 'TLS nicht ausgewählt');
    }
    document.getElementById('tlsToggle').addEventListener('click', () => setTlsOpen(document.getElementById('tlsFields').hidden));
    document.getElementById('tlsFields').addEventListener('invalid', () => setTlsOpen(true), true);
    form.tls.addEventListener('change', updateTlsSummary);

    async function loadConfig() {
      const response = await fetch('./api/config', { cache: 'no-store' });
      const data = await response.json();
      form.broker_host.value = data.broker_host || '';
      setCredentialsOpen(!Boolean(data.broker_host));
      form.broker_port.value = data.broker_port || 1883;
      form.username.value = data.username || '';
      form.publish_delay_ms.value = data.publish_delay_ms ?? 50;
      form.poll_interval.value = data.poll_interval ?? 5;
      form.topic_prefix.value = data.topic_prefix || 'ha_external';
      form.forward_label.value = data.forward_label || '';
      form.label_device_readings.checked = Boolean(data.label_device_readings);
      form.topic_layout_new.value = data.topic_layout_new || 'nested';
      form.client_id.value = data.client_id || 'ugso-ha-mqtt-client';
      form.tls.checked = Boolean(data.tls);
      updateTlsSummary();
      setTlsOpen(false);
      document.getElementById('tlsStored').textContent = `Gespeichert: CA ${data.has_tls_ca ? 'ja' : 'nein'}, Client-Zertifikat ${data.has_tls_cert ? 'ja' : 'nein'}, privater Schlüssel ${data.has_tls_key ? 'ja' : 'nein'}.`;
      selectedStates = new Set(data.entities || []);
      selectedAttributes = new Set(data.entity_attributes || []);
      commandEntities = new Set(data.command_entities || []);
      setStatus(data.status || {});
      renderLists();
    }

    async function loadEntities() {
      entityList.innerHTML = '<div class="sub">Lade Entitäten...</div>';
      const response = await fetch('./api/entities', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Entitäten konnten nicht geladen werden');
      catalog = data.entities || [];
      devices = data.devices || [{ id: 'all', name: 'Alle Entitäten', entities: catalog }];
      renderLists();
    }

    async function refreshStatus() {
      try {
        const response = await fetch('./api/status', { cache: 'no-store' });
        setStatus(await response.json());
      } catch (error) {
        setStatus({ connected: false, text: 'Keine Verbindung' });
      }
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      save.disabled = true;
      message.textContent = 'Speichere...';
      const payload = {
        broker_host: form.broker_host.value.trim(),
        broker_port: Number(form.broker_port.value || 1883),
        username: form.username.value.trim(),
        publish_delay_ms: Number(form.publish_delay_ms.value || 0),
        poll_interval: Number(form.poll_interval.value || 5),
        topic_prefix: form.topic_prefix.value.trim(), client_id: form.client_id.value.trim(),
        forward_label: form.forward_label.value.trim(),
        label_device_readings: form.label_device_readings.checked,
        topic_layout_new: form.topic_layout_new.value,
        tls: form.tls.checked, clear_tls_material: form.clear_tls_material.checked
      };
      if (form.password.value) payload.password = form.password.value;
      for (const key of ['tls_ca', 'tls_cert', 'tls_key']) if (form[key].value.trim()) payload[key] = form[key].value.trim();
      try {
        const response = await fetch('./api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Speichern fehlgeschlagen');
        form.password.value = '';
        for (const key of ['tls_ca', 'tls_cert', 'tls_key']) form[key].value = '';
        form.clear_tls_material.checked = false;
        await loadConfig();
        message.textContent = 'Gespeichert. Verbindung wird aufgebaut...';
        setStatus(data.status || {});
      } catch (error) {
        message.textContent = error.message;
      } finally {
        save.disabled = false;
      }
    });

    document.getElementById('saveEntity').addEventListener('click', async () => {
      if (!activeEntity) return;
      if (stateCheck.checked) selectedStates.add(activeEntity.entity_id);
      else selectedStates.delete(activeEntity.entity_id);
      syncAutomaticCommand(activeEntity);
      activeEntity.attributes.forEach((attr) => selectedAttributes.delete(attrKey(activeEntity.entity_id, attr)));
      attributeList.querySelectorAll('input:checked').forEach((input) => selectedAttributes.add(attrKey(activeEntity.entity_id, input.value)));
      try {
        await saveSelections();
        dialog.close();
      } catch (error) {
        selectionMessage.textContent = error.message;
      }
    });

    document.getElementById('removeEntity').addEventListener('click', async () => {
      if (!activeEntity) return;
      selectedStates.delete(activeEntity.entity_id);
      commandEntities.delete(activeEntity.entity_id);
      [...selectedAttributes].forEach((entry) => { if (entry.startsWith(`${activeEntity.entity_id}:`)) selectedAttributes.delete(entry); });
      try {
        await saveSelections();
        dialog.close();
      } catch (error) {
        selectionMessage.textContent = error.message;
      }
    });

    document.getElementById('closeDialog').addEventListener('click', () => dialog.close());
    document.getElementById('closeDeviceDialog').addEventListener('click', () => deviceDialog.close());
    deviceSelectAll.addEventListener('change', async () => {
      if (!activeDevice) return;
      (activeDevice.entities || []).forEach((item) => selectEntityWithAttributes(item, deviceSelectAll.checked));
      try {
        await saveSelections();
        updateDeviceSelectAllState();
      } catch (error) {
        selectionMessage.textContent = error.message;
      }
    });
    document.getElementById('reload').addEventListener('click', () => loadEntities().catch((error) => entityList.innerHTML = `<div class="sub">${error.message}</div>`));
    filter.addEventListener('input', renderLists);

    async function api(path, payload) {
      const response = await fetch('./api/' + path, payload === undefined ? {cache:'no-store'} : {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Vorgang fehlgeschlagen');
      return data;
    }
    let transferRows = [], transferLoading = false;
    function renderTransfers() {
      const term = document.getElementById('transferSearch').value.trim().toLowerCase();
      const rows = transferRows.filter(row => [row.name, row.entity_id, row.attribute, row.topic].join(' ').toLowerCase().includes(term));
      const list = document.getElementById('transferList');
      const scrollTop = list.scrollTop;
      list.replaceChildren();
      document.getElementById('transferCount').textContent = `${rows.length} von ${transferRows.length} Werten (States und ausgewählte Attribute)`;
      for (const row of rows) {
        const item = document.createElement('article'); item.className = 'transferRow';
        const heading = document.createElement('div'); heading.className = 'transferHeading';
        const name = document.createElement('strong'); name.textContent = row.name;
        const badge = document.createElement('span'); badge.className = 'origin ' + row.origin;
        badge.textContent = {label:'Label', manual:'Manuell', both:'Beides'}[row.origin];
        heading.append(name, badge); item.append(heading);
        for (const text of [row.entity_id + (row.attribute ? ' · Attribut: ' + row.attribute : ''), 'Wert: ' + row.value, 'Topic: ' + row.topic]) {
          const line = document.createElement('div'); line.textContent = text; item.append(line);
        }
        const status = document.createElement('div'); status.className = row.error ? 'transferError' : 'meta';
        status.textContent = row.error ? 'Übertragungsfehler: ' + row.error : row.last_success ? 'Vom Broker bestätigt' : 'Noch nicht bestätigt';
        if (row.last_success) status.textContent += ' · Letzte Bestätigung: ' + new Date(row.last_success * 1000).toLocaleString() + ' · Gesendeter Wert: ' + row.last_sent_value;
        item.append(status); list.append(item);
        if (row.set_topic) { const command = document.createElement('div'); command.className = 'meta'; command.textContent = 'Rückkanal aktiv: ' + row.set_topic; item.append(command); }
      }
      if (!rows.length) list.textContent = transferRows.length ? 'Keine passenden Werte.' : 'Noch keine aktiven Übertragungen erfasst. Verbindung und Auswahl prüfen.';
      list.scrollTop = scrollTop;
    }
    async function loadTransfers() {
      if (transferLoading) return;
      transferLoading = true;
      try { const data = await api('transmissions'); transferRows = data.values || []; renderTransfers(); }
      catch (error) { document.getElementById('transferCount').textContent = 'Aktualisierung fehlgeschlagen: ' + error.message; }
      finally { transferLoading = false; }
    }
    document.getElementById('transmissions').addEventListener('click', () => { document.getElementById('transmissionsDialog').showModal(); loadTransfers(); });
    document.getElementById('refreshTransfers').addEventListener('click', loadTransfers);
    document.getElementById('closeTransfers').addEventListener('click', () => document.getElementById('transmissionsDialog').close());
    document.getElementById('readingDiagnostics').addEventListener('click', async () => {
      const output = document.getElementById('readingReport');
      output.textContent = 'Prüfung läuft …';
      document.getElementById('readingDialog').showModal();
      try {
        const data = await api('label-diagnostics');
        output.textContent = data.enabled ? 'Automatische Gerätemesswerte sind gespeichert und aktiv.' : 'Automatische Gerätemesswerte sind nicht gespeichert/aktiv. Option aktivieren und speichern.';
        const reasons = {included:'wird einbezogen',disabled:'in HA deaktiviert',missing_class_or_unit:'keine passende Klasse oder eindeutige Einheit',unsupported_class:'nicht unterstützte Messwertklasse'};
        for (const root of data.roots || []) {
          const block = document.createElement('div'), title = document.createElement('strong');
          title.textContent = root.entity_id; block.append(title);
          const info = document.createElement('p');
          info.textContent = !root.device_linked ? 'Keine HA-Gerätezuordnung vorhanden.' : !root.candidates.length ? 'Keine Sensoren an dieser HA-Gerätezuordnung gefunden.' : 'Sensoren derselben HA-Gerätezuordnung:';
          block.append(info);
          for (const item of root.candidates) {
            const line = document.createElement('p');
            line.textContent = item.entity_id + ' · ' + (item.device_class || 'Klasse fehlt') + ' · ' + (item.unit || 'Einheit fehlt') + ' · ' + (reasons[item.reason] || item.reason) + (item.class_source === 'unit' ? ' (aus Einheit)' : '');
            block.append(line);
          }
          output.append(block);
        }
        if (!data.roots?.length) output.append(' Keine gelabelten Entitäten erkannt. Label-ID und Verbindung prüfen.');
      } catch (error) { output.textContent = error.message; }
    });
    document.getElementById('closeReadingDialog').addEventListener('click', () => document.getElementById('readingDialog').close());
    document.getElementById('transferSearch').addEventListener('input', renderTransfers);
    setInterval(() => { if (document.getElementById('transmissionsDialog').open) loadTransfers(); }, 3000);
    for (const input of document.querySelectorAll('[data-pem]')) input.addEventListener('change', async () => {
      try { const file = input.files[0]; if (!file) return; if (file.size > 65536) throw Error('PEM-Datei ist zu groß'); form[input.dataset.pem].value = await file.text(); }
      catch (error) { message.textContent = error.message; }
      finally { input.value = ''; }
    });
    document.getElementById('backup').addEventListener('click', async () => {
      try { const data = await api('backup'); const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})); const a = document.createElement('a'); a.href = url; a.download = 'mqtt-client-settings.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000); }
      catch (error) { message.textContent = error.message; }
    });
    document.getElementById('restore').addEventListener('click', () => document.getElementById('restoreFile').click());
    document.getElementById('restoreFile').addEventListener('change', async event => {
      try { const file = event.target.files[0]; if (!file) return; if (file.size > 1048576) throw Error('Sicherung ist zu groß'); const data = JSON.parse(await file.text()); if (!confirm('Broker-Einstellungen und Entitätsauswahl durch diese Sicherung ersetzen? Vorhandene Geheimnisse bleiben nur beim gleichen Broker erhalten.')) return; await api('restore',data); await loadConfig(); message.textContent = 'Sicherung geladen. Passwort und Client-Zertifikate gegebenenfalls neu eintragen.'; }
      catch (error) { message.textContent = error.message; }
      finally { event.target.value = ''; }
    });
    async function showRetained() {
      const data = await api('retained'), list = document.getElementById('retainedList'); list.replaceChildren();
      for (const topic of data.topics) { const label = document.createElement('label'); label.className = 'check'; const input = document.createElement('input'); input.type = 'checkbox'; input.value = topic; label.append(input,document.createTextNode(topic)); list.append(label); }
      if (!data.topics.length) list.textContent = 'Keine erfassten veralteten Topics.';
      document.getElementById('deleteRetained').disabled = !data.topics.length;
      const dialog = document.getElementById('retainedDialog'); if (!dialog.open) dialog.showModal();
    }
    document.getElementById('retained').addEventListener('click', () => showRetained().catch(error => message.textContent = error.message));
    document.getElementById('closeRetained').addEventListener('click', () => document.getElementById('retainedDialog').close());
    document.getElementById('deleteRetained').addEventListener('click', async event => {
      const topics = [...document.querySelectorAll('#retainedList input:checked')].map(input => input.value);
      if (!topics.length || !confirm(`${topics.length} ausgewählte Retain-Topics wirklich löschen?`)) return;
      event.target.disabled = true;
      try { const data = await api('retained',{confirm:true,topics}); message.textContent = `${data.deleted.length} Retain-Topics gelöscht.`; await showRetained(); }
      catch (error) { message.textContent = error.message; await showRetained().catch(() => {}); }
      finally { event.target.disabled = false; }
    });

    loadConfig().catch((error) => message.textContent = error.message || 'Konfiguration konnte nicht geladen werden.');
    loadEntities().catch((error) => entityList.innerHTML = `<div class="sub">${error.message}</div>`);
    setInterval(refreshStatus, 3000);
  </script>
</body>
</html>"""


class RuntimeStatus:
    def __init__(self):
        self.lock = threading.Lock()
        self.connected = False
        self.message = "Keine Verbindung"
        self.details = dict(ha_connected=False, mode="polling", last_sync=None, last_publish=None,
                            published=0, last_error=None, stream_error=None, dropped_events=0,
                            pending_events=0, coalesced_events=0, last_ha_event=None, sync_pending=False)

    def update(self, **values):
        with self.lock:
            self.details.update(values)

    def published(self):
        with self.lock:
            self.details["last_publish"] = time.time()
            self.details["published"] += 1

    def set_connected(self, connected, message=None):
        with self.lock:
            self.connected = connected
            self.message = message or ("Verbunden" if connected else "Keine Verbindung")

    def snapshot(self):
        with self.lock:
            return {"connected": self.connected, "mqtt_connected": self.connected,
                    "text": self.message, **self.details}


@dataclass(frozen=True)
class Config:
    host: str
    port: int
    username: str
    password: str
    tls: bool
    client_id: str
    prefix: str
    interval: int
    entities: tuple
    entity_attributes: tuple
    command_entities: tuple
    publish_delay_ms: int
    tls_ca: str = ""
    tls_cert: str = ""
    tls_key: str = ""
    forward_label: str = ""
    label_device_readings: bool = False
    topic_layout_new: str = "nested"

    @classmethod
    def load(cls, options):
        host = str(options.get("broker_host", "")).strip()
        prefix = str(options.get("topic_prefix", "ha_external")).strip().strip("/")
        client_id = str(options.get("client_id", "ugso-ha-mqtt-client")).strip()
        if not host or any(c in host for c in "/\x00\r\n"):
            raise ValueError("broker_host muss einen Hostnamen oder eine IP enthalten")
        if not prefix or prefix.startswith("$") or any(c in prefix for c in "+#\x00"):
            raise ValueError("topic_prefix darf keine MQTT-Platzhalter enthalten")
        if not client_id or "\x00" in client_id:
            raise ValueError("client_id muss gesetzt sein")
        port = int(options.get("broker_port", 1883))
        interval = int(options.get("poll_interval", 5))
        publish_delay_ms = int(options.get("publish_delay_ms", 50))
        if not 1 <= port <= 65535 or not 1 <= interval <= 300 or not 0 <= publish_delay_ms <= 1000:
            raise ValueError("Port, Abfrageintervall oder Publish-Verzögerung liegt außerhalb des erlaubten Bereichs")
        entities = validate_entities(options.get("entities", []), "entities")
        requested_commands = validate_entities(options.get("command_entities", []), "command_entities")
        entity_attributes = validate_entity_attributes(options.get("entity_attributes", []))
        if not set(requested_commands).issubset(entities):
            raise ValueError("command_entities muss eine Teilmenge von entities sein")
        if any(entity.split('.')[0] not in COMMAND_DOMAINS for entity in requested_commands):
            raise ValueError("Befehle sind nur für unterstützte steuerbare Domains erlaubt")
        commands = automatic_command_entities(entities)
        pem = [options.get(key, "") for key in ("tls_ca", "tls_cert", "tls_key")]
        if any(not isinstance(v, str) or len(v) > 65536 for v in pem) or bool(pem[1]) != bool(pem[2]):
            raise ValueError("TLS benötigt gültige PEM-Texte und Client-Zertifikat plus privaten Schlüssel")
        label = options.get("forward_label", "")
        if not isinstance(label, str) or (label and not re.fullmatch(r"[a-z0-9_]{1,128}", label)):
            raise ValueError("forward_label muss eine gültige HA-Label-ID sein")
        if not isinstance(options.get("label_device_readings", False), bool):
            raise ValueError("label_device_readings muss ein Boolean sein")
        if options.get("topic_layout_new", "nested") not in ("nested", "flat"):
            raise ValueError("topic_layout_new muss nested oder flat sein")
        return cls(host, port, str(options.get("username", "")), str(options.get("password", "")),
                   bool(options.get("tls", False)), client_id, prefix, interval, entities, entity_attributes,
                   commands, publish_delay_ms, *pem, forward_label=label,
                   label_device_readings=options.get("label_device_readings", False),
                   topic_layout_new=options.get("topic_layout_new", "nested"))

    def topic(self, entity, suffix):
        return f"{self.prefix}/{entity}/{suffix}"


def validate_entities(values, key):
    if not isinstance(values, list) or any(not isinstance(v, str) or not ENTITY.fullmatch(v) for v in values):
        raise ValueError(f"{key} muss eine Liste konkreter Entity-IDs sein")
    return tuple(dict.fromkeys(values))


def automatic_command_entities(entities):
    return tuple(entity for entity in entities if entity.split('.')[0] in COMMAND_DOMAINS)


def validate_entity_attributes(values):
    if not isinstance(values, list):
        raise ValueError("entity_attributes muss eine Liste sein")
    clean = []
    for value in values:
        if not isinstance(value, str) or ":" not in value:
            raise ValueError("entity_attributes muss Werte im Format entity_id:attribut enthalten")
        entity, attribute = value.split(":", 1)
        if not ENTITY.fullmatch(entity) or not ATTRIBUTE.fullmatch(attribute) or any(c in attribute for c in "+#/\x00"):
            raise ValueError("entity_attributes enthält einen ungültigen Wert")
        clean.append(f"{entity}:{attribute}")
    return tuple(dict.fromkeys(clean))


def encode_mqtt_payload(value):
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float, str)):
        return str(value)
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def tls_context(config):
    context = ssl.create_default_context(cadata=config.tls_ca or None)
    if config.tls_cert:
        paths = []
        try:
            for text in (config.tls_cert, config.tls_key):
                with NamedTemporaryFile("w", encoding="utf-8", delete=False) as handle:
                    handle.write(text)
                    paths.append(Path(handle.name))
            context.load_cert_chain(str(paths[0]), str(paths[1]))
        finally:
            for path in paths:
                path.unlink(missing_ok=True)
    return context


def mqtt_command(entity, payload):
    domain = entity.split(".", 1)[0]
    if domain in {"cover", "light", "fan"} and payload.startswith("{"):
        data = json.loads(payload)
        key, service = {"cover": ("position", "set_cover_position"),
                        "light": ("brightness_pct", "turn_on"), "fan": ("percentage", "set_percentage")}[domain]
        if not isinstance(data, dict) or set(data) != {key} or isinstance(data[key], bool) or not isinstance(data[key], (int, float)) or not math.isfinite(data[key]) or not 0 <= data[key] <= 100:
            raise ValueError("Nur Position/Helligkeit/Prozent von 0 bis 100 erlaubt")
        return (service, data)
    if domain == "cover":
        service = {"OPEN": "open_cover", "CLOSE": "close_cover", "STOP": "stop_cover"}.get(payload.upper())
        if service is None:
            raise ValueError("OPEN/CLOSE/STOP oder JSON mit position erwartet")
        return service
    if domain in TOGGLE_COMMAND_DOMAINS:
        service = {"ON": "turn_on", "OFF": "turn_off"}.get(payload.upper())
        if service is None:
            raise ValueError("nur ON/OFF erlaubt")
        return service
    if domain in {"input_number", "number"}:
        try:
            value = float(payload)
        except ValueError as error:
            raise ValueError("Zahl erwartet") from error
        if not math.isfinite(value):
            raise ValueError("Endliche Zahl erwartet")
        return ("set_value", {"value": value})
    if domain in {"input_select", "select"}:
        if not payload:
            raise ValueError("Option darf nicht leer sein")
        return ("select_option", {"option": payload})
    if domain in {"input_text", "text"}:
        return ("set_value", {"value": payload})
    if domain in PRESS_COMMAND_DOMAINS:
        if payload and payload.upper() not in {"PRESS", "ON", "TRUE", "1"}:
            raise ValueError("PRESS erwartet")
        return "press"
    raise ValueError("Domain nicht unterstützt")


def _strip_device_suffix(name):
    clean = " ".join(str(name).replace("_", " ").split())
    for suffix in DEVICE_SUFFIXES:
        pattern = re.compile(rf"^(.+?)(?:\s+-|\s+)?\s+{re.escape(suffix)}$", re.IGNORECASE)
        match = pattern.match(clean)
        if match and len(match.group(1).strip()) >= 3:
            return match.group(1).strip(" -_")
    return clean


def _strip_object_suffix(object_id):
    clean = object_id.casefold()
    for suffix in DEVICE_OBJECT_SUFFIXES:
        if clean.endswith(suffix) and len(clean) > len(suffix) + 2:
            return object_id[:-len(suffix)]
    return object_id


def device_name_for_entity(entity_id, name, attributes):
    for key in ("device_name", "device", "device_id"):
        value = attributes.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    friendly = str(name or entity_id)
    base = _strip_device_suffix(friendly)
    if base and base != entity_id:
        return base
    try:
        object_id = entity_id.split(".", 1)[1]
    except IndexError:
        return base or entity_id
    object_id = _strip_object_suffix(object_id)
    return " ".join(part for part in object_id.replace("_", " ").split()).strip() or entity_id


def device_id_for_name(name):
    slug = re.sub(r"[^a-z0-9]+", "_", str(name).casefold()).strip("_")
    return slug or "device"


def object_id_for_entity(entity_id):
    try:
        return entity_id.split(".", 1)[1]
    except IndexError:
        return entity_id


def display_name_from_object_id(object_id):
    return " ".join(part for part in object_id.replace("_", " ").split()).strip() or object_id


def common_object_prefixes(entities):
    candidates = {}
    prefix_counts = {}
    for entity in entities:
        object_id = entity["object_id"]
        base = _strip_object_suffix(object_id)
        candidates.setdefault(base, entity["device_name"])
        parts = object_id.split("_")
        if len(parts) > 2:
            prefix = "_".join(parts[:-1])
            prefix_counts[prefix] = prefix_counts.get(prefix, 0) + 1
    for prefix, count in prefix_counts.items():
        if count >= 2 and prefix not in candidates:
            candidates[prefix] = display_name_from_object_id(prefix)
    child_candidates = [
        candidate for candidate in candidates
        if any(candidate.startswith(f"{parent}_") for parent in candidates if parent != candidate)
    ]
    for candidate in child_candidates:
        candidates.pop(candidate, None)
    return candidates


def canonical_device_for_entity(entity, prefixes):
    object_id = entity["object_id"]
    matches = [prefix for prefix in prefixes if object_id == prefix or object_id.startswith(f"{prefix}_")]
    if not matches:
        return device_id_for_name(entity["device_name"]), entity["device_name"]
    prefix = max(matches, key=len)
    return device_id_for_name(prefix), prefixes[prefix]


def mqtt_slug(value):
    return ascii_slug_text(value) or "wert"


def topic_value_name_for_entity(entity_id, name, device_name):
    friendly = " ".join(str(name or entity_id).split())
    device = " ".join(str(device_name or "").split())
    value = friendly
    if device and friendly.casefold().startswith(device.casefold()):
        value = friendly[len(device):].strip(" -_:")
    if not value or value == entity_id:
        try:
            domain, object_id = entity_id.split(".", 1)
        except ValueError:
            return entity_id
        if domain in TOGGLE_COMMAND_DOMAINS:
            return "switch"
        if domain in PRESS_COMMAND_DOMAINS:
            return "button"
        device_slug = mqtt_slug(device)
        object_slug = mqtt_slug(_strip_object_suffix(object_id))
        prefix = f"{device_slug}_"
        if object_slug.startswith(prefix) and len(object_slug) > len(prefix):
            object_slug = object_slug[len(prefix):]
        if not object_slug or object_slug == device_slug:
            return "switch" if domain in TOGGLE_COMMAND_DOMAINS else domain
        return object_slug
    return value


def device_topic_for_entity(entity_id, state_entry, prefixes=None):
    attributes = state_entry.get("attributes", {})
    if not isinstance(attributes, dict):
        attributes = {}
    name = attributes.get("friendly_name") or entity_id
    device_name = device_name_for_entity(entity_id, name, attributes)
    if prefixes:
        _, device_name = canonical_device_for_entity(
            {"object_id": object_id_for_entity(entity_id), "device_name": device_name},
            prefixes,
        )
    value_name = topic_value_name_for_entity(entity_id, name, device_name)
    return f"{mqtt_slug(device_name)}/{mqtt_slug(value_name)}"


def common_prefixes_from_states(states):
    entities = []
    for state in states.values():
        entity_id = state.get("entity_id", "")
        attributes = state.get("attributes", {})
        if not ENTITY.fullmatch(entity_id) or not isinstance(attributes, dict):
            continue
        name = attributes.get("friendly_name") or entity_id
        entities.append({
            "object_id": object_id_for_entity(entity_id),
            "device_name": device_name_for_entity(entity_id, name, attributes),
        })
    return common_object_prefixes(entities)


def iobroker_mapping(entity_id, state, attributes):
    domain = entity_id.split(".", 1)[0]
    device_class = str(attributes.get("device_class", "")).lower()
    state_value = str(state).lower()
    if device_class == "press" or domain in PRESS_COMMAND_DOMAINS:
        return {"state_type": "press", "iobroker_type": "button"}
    if domain in {"switch", "input_boolean", "binary_sensor"} or state_value in {"on", "off", "true", "false"}:
        return {"state_type": "state_boolean", "iobroker_type": "switch"}
    if domain in {"input_number", "number"}:
        return {"state_type": "state_number", "iobroker_type": "number"}
    if device_class == "text" or domain in {"input_text", "text", "input_select", "select"}:
        return {"state_type": "state", "iobroker_type": "state"}
    try:
        float(str(state))
    except ValueError:
        return {"state_type": "state", "iobroker_type": "state"}
    return {"state_type": "state_number", "iobroker_type": "number"}


class HomeAssistant:
    def __init__(self, token, base_url="http://supervisor/core/api"):
        self.base_url = base_url.rstrip("/")
        self.token = token

    def request(self, path, data=None):
        request = urllib.request.Request(
            f"{self.base_url}/{path}",
            data=None if data is None else json.dumps(data).encode(),
            headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"},
        )
        with urllib.request.urlopen(request, timeout=10) as response:
            return json.load(response)

    def states(self):
        states = self.request("states")
        if not isinstance(states, list):
            raise ValueError("Invalid HA states response")
        return {state["entity_id"]: state["state"] for state in states}

    def full_states(self):
        states = self.request("states")
        if not isinstance(states, list):
            raise ValueError("Invalid HA states response")
        return states

    def command(self, entity, service, data=None):
        payload = {"entity_id": entity}
        if data:
            payload.update(data)
        return self.request(f"services/{entity.split('.')[0]}/{service}", payload)


def ha_state_time(entry):
    value = entry.get("last_updated") if isinstance(entry, dict) else None
    if not isinstance(value, str):
        return None
    try:
        stamp = datetime.fromisoformat(value)
        return stamp.timestamp() if stamp.tzinfo is not None else None
    except (ValueError, OverflowError):
        return None


class LiveEventQueue:
    """Snapshots/recovery first, then control states, then measurements."""
    def __init__(self, maxsize=10000):
        self.items = queue.PriorityQueue(maxsize=maxsize)
        self.sequence = count()

    def put_nowait(self, event):
        priority = 0 if event[0] != "event" else 2 if event[1].get("entity_id", "").startswith("sensor.") else 1
        self.items.put_nowait((priority, next(self.sequence), event))

    def get_nowait(self):
        return self.items.get_nowait()[2]

    def qsize(self):
        return self.items.qsize()

    def empty(self):
        return self.items.empty()

    def urgent(self):
        with self.items.mutex:
            return bool(self.items.queue and self.items.queue[0][0] <= 1)


class Bridge:
    def __init__(self, config, ha, client=None, status=None):
        self.config = config
        self.ha = ha
        self.status = status
        self.connected = threading.Event()
        self.stop = threading.Event()
        self.commands = queue.Queue(maxsize=50)
        self.generation = 0
        self.sent_generation = -1
        self.sent = {}
        self.sent_topics = {}
        self.transfer_results = {}
        self.data_lock = threading.RLock()
        self.events = LiveEventQueue()
        self.sync_pending = False
        self.states_cache = {}
        self.labeled_entities = frozenset()
        self.label_roots = None
        self.label_registry = []
        self.auto_attributes = set()
        self.bridge_metadata = {}
        self.live = False
        self.inventory = None
        self.routes = None
        self.availability = f"{config.prefix}/availability"
        self.attribute_map = {}
        for entry in config.entity_attributes:
            entity, attribute = entry.split(":", 1)
            self.attribute_map.setdefault(entity, []).append(attribute)
        self.manual_attribute_map = {entity: list(attrs) for entity, attrs in self.attribute_map.items()}
        self.event_entities = frozenset(config.entities) | frozenset(self.manual_attribute_map)
        self.command_topics = {config.topic(entity, "set"): entity for entity in config.command_entities}
        self.command_features = {}
        self.subscribed_command_topics = set()
        self.client = client or mqtt.Client(mqtt.CallbackAPIVersion.VERSION2,
                                            client_id=config.client_id, clean_session=True)
        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect
        self.client.on_message = self.on_message
        self.client.reconnect_delay_set(min_delay=1, max_delay=60)
        self.client.max_queued_messages_set(100)
        if config.username:
            self.client.username_pw_set(config.username, config.password)
        if config.tls:
            self.client.tls_set_context(tls_context(config))
        self.client.will_set(self.availability, "offline", qos=1, retain=True)

    def topic(self, entity, suffix, state_entry=None, prefixes=None):
        if self.routes:
            assigned = self.routes.topic(self.config, entity, suffix)
            if assigned:
                return assigned
        if state_entry:
            return f"{self.config.prefix}/{device_topic_for_entity(entity, state_entry, prefixes)}/{suffix}"
        return self.config.topic(entity, suffix)

    def route_layout(self, entity):
        return self.routes.route(self.config, entity).get("layout", "nested") if self.routes else "nested"

    def assign_routes(self, entities, states, prefixes):
        if not self.routes:
            return
        if self.label_roots is not None:
            self.routes.seed_labels(self.config, self.labeled_entities)
        classes = {"energy": "energie", "power": "leistung", "voltage": "spannung", "current": "stromstaerke", "temperature": "temperatur", "humidity": "luftfeuchte", "battery": "batterie"}
        for entity in sorted(entities, key=lambda entity: (not bool(self.routes.route(self.config, entity)), entity)):
            entry = states.get(entity)
            attrs = entry.get("attributes", {}) if entry else {}
            attrs = attrs if isinstance(attrs, dict) else {}
            attrs = {**attrs, **self.bridge_metadata.get(entity, {})}
            domain = entity.split(".")[0]
            dc = attrs.get("device_class")
            base = f"{self.config.prefix}/{device_topic_for_entity(entity, entry, prefixes)}" if entry else self.config.topic(entity, "state")[:-6]
            name = "licht" if domain == "light" else "schalter" if domain in TOGGLE_COMMAND_DOMAINS else classes.get(dc, base.rsplit("/", 1)[-1]) if isinstance(dc, str) else base.rsplit("/", 1)[-1]
            self.routes.assign(self.config, entity, base, mqtt_slug(name)[:64])

    def refresh_command_topics(self, states, prefixes=None):
        entities = set(self.config.command_entities) | set(automatic_command_entities(self.labeled_entities))
        topics = {}
        features = {}
        for entity in entities:
            entry = states.get(entity)
            topics[self.topic(entity, "set", entry, prefixes)] = entity
            if entry:
                if entity in self.labeled_entities and entity.startswith("light."):
                    for feature in light_features(entry.get("attributes", {})):
                        topic = self.topic(entity, f"{feature}/set", entry, prefixes)
                        topics[topic] = entity
                        features[topic] = feature
        self.command_topics = topics
        self.command_features = features
        if self.connected.is_set():
            for topic in sorted(self.subscribed_command_topics - set(topics)):
                self.client.unsubscribe(topic)
                self.subscribed_command_topics.remove(topic)
            for topic in sorted(set(topics) - self.subscribed_command_topics):
                self.client.subscribe(topic, qos=0)
                self.subscribed_command_topics.add(topic)

    def on_connect(self, client, userdata, flags, reason_code, properties):
        if reason_code.is_failure:
            LOG.warning("MQTT-Anmeldung fehlgeschlagen: %s", reason_code)
            if self.status:
                self.status.set_connected(False, "Keine Verbindung")
                self.status.update(last_error="MQTT connection rejected")
            return
        self.generation += 1
        self.subscribed_command_topics.clear()
        self.connected.set()
        if self.status:
            self.status.set_connected(True, "Verbunden")
        LOG.info("Mit externem MQTT-Broker verbunden")

    def on_disconnect(self, client, userdata, flags, reason_code, properties):
        self.connected.clear()
        if self.status:
            self.status.set_connected(False, "Keine Verbindung")
        LOG.info("MQTT-Verbindung getrennt; automatischer Wiederaufbau aktiv")

    def on_message(self, client, userdata, message):
        entity = self.command_topics.get(message.topic)
        if entity is None or message.retain or len(message.payload) > 256:
            return
        try:
            payload = message.payload.decode("utf-8").strip()
        except UnicodeDecodeError:
            return
        if not payload:
            return
        try:
            feature = self.command_features.get(message.topic)
            command = self.parse_command(entity, payload, feature)
        except ValueError as error:
            LOG.warning("Ungültiger Befehl verworfen (%s)", error)
            return
        try:
            self.commands.put_nowait((time.monotonic(), self.generation, entity, command, payload, feature))
        except queue.Full:
            LOG.warning("Befehlswarteschlange voll; Befehl verworfen")

    def publish(self, topic, payload, throttle=False):
        info = self.client.publish(topic, payload, qos=1, retain=True)
        if info.rc != mqtt.MQTT_ERR_SUCCESS:
            raise ConnectionError("MQTT publish failed")
        info.wait_for_publish(timeout=5)
        if not info.is_published():
            raise ConnectionError("MQTT publish acknowledgement timed out")
        if self.status:
            self.status.published()
        if throttle and self.config.publish_delay_ms:
            self.stop.wait(self.config.publish_delay_ms / 1000)

    def parse_command(self, entity, payload, feature=None):
        if entity not in set(self.config.command_entities) | set(automatic_command_entities(self.labeled_entities)):
            raise ValueError("Rückkanal nicht mehr freigegeben")
        entry = self.states_cache.get(entity, {})
        attrs = entry.get("attributes", {})
        if feature:
            if entity not in self.labeled_entities or not entity.startswith("light."):
                raise ValueError("Light-Rückkanal nicht mehr freigegeben")
            return light_command(feature, payload, attrs)
        if entity in self.labeled_entities:
            domain = entity.split(".", 1)[0]
            if domain == "light" and payload.startswith("{"):
                data = json.loads(payload)
                if not isinstance(data, dict) or len(data) != 1:
                    raise ValueError("Genau ein Light-Wert erwartet")
                key, value = next(iter(data.items()))
                if key not in {"brightness_pct", "rgb_color", "effect", "color_temp_kelvin"}:
                    raise ValueError("Light-Wert nicht unterstützt")
                return light_command("brightness" if key == "brightness_pct" else key,
                                     value if key == "effect" else json.dumps(value), attrs)
            command = mqtt_command(entity, payload)
            if domain in {"number", "input_number"}:
                value = command[1]["value"]
                lo, hi = attrs.get("min"), attrs.get("max")
                if (lo is not None and (not finite(lo) or value < lo)) or (hi is not None and (not finite(hi) or value > hi)):
                    raise ValueError("Zahl außerhalb der Entitätsgrenzen")
            if domain in {"select", "input_select"} and payload not in (attrs.get("options") or []):
                raise ValueError("Auswahl nicht verfügbar")
            if domain in {"text", "input_text"} and not attrs.get("min", 0) <= len(payload) <= attrs.get("max", 255):
                raise ValueError("Textlänge außerhalb der Entitätsgrenzen")
            return command
        return mqtt_command(entity, payload)

    def prepare_label_values(self, states):
        roots = self.label_roots if self.label_roots is not None else self.labeled_entities
        extra = related_readings(roots, self.label_registry, states) if self.config.label_device_readings else set()
        self.labeled_entities = frozenset(set(roots) | extra)
        self.attribute_map = {entity: list(attrs) for entity, attrs in self.manual_attribute_map.items()}
        self.auto_attributes = set()
        for entity in self.labeled_entities:
            attrs = states.get(entity, {}).get("attributes", {})
            if not isinstance(attrs, dict):
                attrs = {}
            for attribute in label_metadata(entity, attrs):
                self.auto_attributes.add((entity, attribute))
                values = self.attribute_map.setdefault(entity, [])
                if attribute not in values:
                    values.append(attribute)
        # Explicit source identity and command permission for the ioBroker VIS-2
        # helper. Never infer HA domains from translated device/value names.
        selected = set(self.config.entities) | (self.labeled_entities & states.keys())
        commands = set(self.config.command_entities) | set(automatic_command_entities(self.labeled_entities))
        self.bridge_metadata = {entity: {"ha_entity_id": entity, "command_enabled": entity in commands} for entity in selected}
        registry = {entry.get("entity_id"): entry for entry in self.label_registry}
        for entity in self.labeled_entities & selected:
            attrs = states.get(entity, {}).get("attributes", {})
            if entity.startswith("sensor.") and isinstance(attrs, dict) and not attrs.get("device_class"):
                inferred = reading_class(registry.get(entity, {}), attrs)
                if inferred in READING_CLASSES:
                    self.bridge_metadata[entity]["device_class"] = inferred
                    self.auto_attributes.add((entity, "device_class"))
        for entity, attrs in self.bridge_metadata.items():
            values = self.attribute_map.setdefault(entity, [])
            for attr in attrs:
                if attr not in values:
                    values.append(attr)
        # One immutable selection for the WebSocket producer: never queue the
        # whole HA installation merely because label selection is enabled.
        self.event_entities = frozenset(self.config.entities) | self.labeled_entities | frozenset(self.attribute_map)

    def light_specs(self, states, prefixes=None):
        for entity in sorted(self.labeled_entities):
            if not entity.startswith("light.") or entity not in states:
                continue
            entry = states[entity]
            for feature in sorted(light_features(entry.get("attributes", {}))):
                yield ("feature", entity, feature), self.topic(entity, f"{feature}/state", entry, prefixes), encode_mqtt_payload(light_value(feature, entry))

    def inventory_attributes(self):
        values = {f"{entity}:{attr}" for entity, attrs in self.attribute_map.items() for attr in attrs}
        values.update(f"{key[1]}:light/{key[2]}" for key, _, _ in self.light_specs(self.states_cache))
        return values

    def reading_diagnostics(self):
        with self.data_lock:
            return {"enabled": self.config.label_device_readings,
                    "roots": related_reading_report(self.label_roots or [], self.label_registry, self.states_cache)}

    def catalog_attributes(self, entity, states):
        attrs = states.get(entity, {}).get("attributes", {})
        if not isinstance(attrs, dict):
            attrs = {}
        attrs = {**attrs, **self.bridge_metadata.get(entity, {})}
        return {name: attrs[name] for name in sorted(label_metadata(entity, attrs))}

    def poll(self, states=None):
        with self.data_lock:
            return self.sync_states(states)

    def publish_value(self, key, topic, value, priority=False):
        previous = self.transfer_results.get(key, {})
        try:
            self.publish(topic, value, throttle=not priority)
        except Exception as error:
            self.transfer_results[key] = {**previous, "error": type(error).__name__}
            raise
        self.transfer_results[key] = {"topic": topic, "value": value, "last_success": time.time(), "error": None}

    def transmission_snapshot(self):
        with self.data_lock:
            states = self.states_cache
            prefixes = common_prefixes_from_states(states)
            rows = []
            keys = [("state", entity) for entity in set(self.config.entities) | set(self.labeled_entities)]
            keys += [("attribute", entity, attribute) for entity, attrs in self.attribute_map.items() for attribute in attrs]
            for key in sorted(keys):
                entity = key[1]
                attribute = key[2] if len(key) == 3 else None
                entry = states.get(entity, {"state": "unavailable", "attributes": {}})
                attrs = entry.get("attributes", {})
                if not isinstance(attrs, dict):
                    attrs = {}
                value = encode_mqtt_payload(attrs.get(attribute, "unavailable")) if attribute else str(entry.get("state", "unavailable"))
                topic = self.topic(entity, f"attribute/{attribute}" if attribute else "state", entry if entity in states else None, prefixes)
                attrs = {**attrs, **self.bridge_metadata.get(entity, {})}
                if attribute in self.bridge_metadata.get(entity, {}):
                    value = encode_mqtt_payload(attrs[attribute])
                manual = (attribute in self.manual_attribute_map.get(entity, []) or attribute in self.bridge_metadata.get(entity, {}) and entity in self.config.entities) if attribute else entity in self.config.entities
                label = ((entity, attribute) in self.auto_attributes or attribute in self.bridge_metadata.get(entity, {})) and entity in self.labeled_entities if attribute else entity in self.labeled_entities
                result = self.transfer_results.get(key, {})
                same_topic = result.get("topic") == topic
                rows.append(dict(entity_id=entity, attribute=attribute, name=attrs.get("friendly_name") or entity,
                                 value=value, topic=topic, origin="both" if manual and label else "manual" if manual else "label",
                                 last_success=result.get("last_success") if same_topic else None,
                                 last_sent_value=result.get("value") if same_topic else None, error=result.get("error"),
                                 set_topic=self.topic(entity, "set", entry if entity in states else None, prefixes) if not attribute and entity in set(self.config.command_entities) | set(automatic_command_entities(self.labeled_entities)) else None))
            for key, topic, value in self.light_specs(states, prefixes):
                result = self.transfer_results.get(key, {})
                same_topic = result.get("topic") == topic
                rows.append(dict(entity_id=key[1], attribute=key[2], name=states[key[1]].get("attributes", {}).get("friendly_name") or key[1],
                                 value=value, topic=topic, origin="label", last_success=result.get("last_success") if same_topic else None,
                                 last_sent_value=result.get("value") if same_topic else None, error=result.get("error"),
                                 set_topic=topic.removesuffix("/state") + "/set"))
            return {"values": rows}

    def refresh_label_selection(self):
        try:
            registry = entity_registry(self.ha)
            selected = frozenset(
                entry["entity_id"] for entry in registry
                if not entry.get("disabled_by") and self.config.forward_label in entry.get("labels", [])
                and ENTITY.fullmatch(entry["entity_id"])
            )
        except (OSError, ValueError, WebSocketException, KeyError, TypeError, AttributeError) as error:
            LOG.warning("HA-Label-Abgleich fehlgeschlagen (%s)", type(error).__name__)
            selected = frozenset()
            registry = []
        changed = selected != self.label_roots or registry != self.label_registry
        self.label_roots = selected
        self.label_registry = registry
        if not changed:
            return False
        for entity in self.labeled_entities - selected:
            self.sent.pop(("state", entity), None)
            self.sent_topics.pop(("state", entity), None)
        self.labeled_entities = selected
        extra = related_readings(selected, registry, self.states_cache) if self.config.label_device_readings else set()
        self.event_entities = frozenset(self.config.entities) | selected | frozenset(extra) | frozenset(self.manual_attribute_map)
        return True

    def sync_states(self, states=None):
        self.sync_pending = False
        generation = self.generation
        if generation != self.sent_generation:
            self.sent.clear()
            self.sent_topics.clear()
            self.sent_generation = generation
        if states is None:
            try:
                states = {state["entity_id"]: state for state in self.ha.full_states()}
            except (OSError, ValueError, TypeError, KeyError):
                if self.status:
                    self.status.update(ha_connected=False)
                raise
        if self.status:
            self.status.update(ha_connected=True)
        self.states_cache = dict(states)
        self.prepare_label_values(states)
        prefixes = common_prefixes_from_states(states)
        state_entities = set(self.config.entities) | (self.labeled_entities & states.keys())
        self.assign_routes(state_entities | set(self.attribute_map), states, prefixes)
        polled_entities = sorted(state_entities | set(self.attribute_map))
        active_keys = {("state", entity) for entity in state_entities} | {("attribute", entity, attr) for entity, attrs in self.attribute_map.items() for attr in attrs}
        active_keys.update(key for key, _, _ in self.light_specs(states, prefixes))
        self.transfer_results = {key: result for key, result in self.transfer_results.items() if key in active_keys}
        targets = set()
        # Control feedback must precede all measurement/metadata bulk traffic.
        for entity in sorted(state_entities):
            if self.stop.is_set():
                return
            if entity.startswith("sensor."):
                continue
            entry = states.get(entity, {"state": "unavailable", "attributes": {}})
            topic = self.topic(entity, "state", entry if entity in states else None, prefixes)
            key, value = ("state", entity), str(entry.get("state", "unavailable"))
            if self.sent.get(key) != value or self.sent_topics.get(key) != topic:
                self.publish_value(key, topic, value, priority=True)
                if self.inventory:
                    self.inventory.remember(self.config, topic, entity, topic_layout=self.route_layout(entity))
                self.sent[key], self.sent_topics[key] = value, topic
        for key, topic, value in self.light_specs(states, prefixes):
            if self.stop.is_set():
                return
            targets.add(topic)
            if self.sent.get(key) != value or self.sent_topics.get(key) != topic:
                self.publish_value(key, topic, value, priority=True)
                if self.inventory:
                    self.inventory.remember(self.config, topic, key[1], "light/" + key[2])
                self.sent[key], self.sent_topics[key] = value, topic
        for entity in polled_entities:
            if self.stop.is_set():
                return
            if self.yield_to_controls():
                return
            entry = states.get(entity, {"state": "unavailable", "attributes": {}})
            state = str(entry.get("state", "unavailable"))
            state_topic = self.topic(entity, "state", entry if entity in states else None, prefixes)
            if entity in state_entities:
                targets.add(state_topic)
            state_key = ("state", entity)
            if entity in state_entities and (self.sent.get(state_key) != state or self.sent_topics.get(state_key) != state_topic):
                self.publish_value(state_key, state_topic, state)
                if self.inventory:
                    self.inventory.remember(self.config, state_topic, entity, topic_layout=self.route_layout(entity))
                self.sent[("state", entity)] = state
                self.sent_topics[state_key] = state_topic
            attributes = entry.get("attributes", {})
            if not isinstance(attributes, dict):
                attributes = {}
            attributes = {**attributes, **self.bridge_metadata.get(entity, {})}
            for attribute in self.attribute_map.get(entity, []):
                if self.yield_to_controls():
                    return
                value = encode_mqtt_payload(attributes.get(attribute, "unavailable"))
                key = ("attribute", entity, attribute)
                topic = self.topic(entity, f"attribute/{attribute}", entry if entity in states else None, prefixes)
                targets.add(topic)
                if self.sent.get(key) != value or self.sent_topics.get(key) != topic:
                    self.publish_value(key, topic, value)
                    if self.inventory:
                        self.inventory.remember(self.config, topic, entity, attribute)
                    self.sent[key] = value
                    self.sent_topics[key] = topic
        selection_topic = f"{self.config.prefix}/selected_entities"
        # Prefix keeps ioBroker's MQTT JSON expansion from splitting this catalog.
        # Bind permissions to the exact current topic, including renamed devices.
        selected_value = "v1:" + json.dumps({entity: {
            "state_topic": self.topic(entity, "state", states.get(entity), prefixes),
            "topic_layout": self.route_layout(entity),
            "command_topic": self.topic(entity, "set", states.get(entity), prefixes) if self.bridge_metadata[entity]["command_enabled"] else None,
            "feature_state_topics": {feature: self.topic(entity, feature + "/state", states.get(entity), prefixes) for feature in light_features(states.get(entity, {}).get("attributes", {}))} if entity.startswith("light.") and entity in self.labeled_entities else {},
            "feature_command_topics": {feature: self.topic(entity, feature + "/set", states.get(entity), prefixes) for feature in light_features(states.get(entity, {}).get("attributes", {}))} if entity.startswith("light.") and entity in self.labeled_entities else {},
            "command": self.bridge_metadata[entity]["command_enabled"],
            "features": sorted(light_features(states.get(entity, {}).get("attributes", {}))) if entity.startswith("light.") and entity in self.labeled_entities else [],
            "attributes": self.catalog_attributes(entity, states),
        } for entity in sorted(state_entities)}, ensure_ascii=False, separators=(",", ":"))
        if self.sent.get(("selection",)) != selected_value:
            self.publish(selection_topic, selected_value)
            self.sent[("selection",)] = selected_value
        targets.add(selection_topic)
        if self.inventory:
            self.inventory.remember(self.config, selection_topic, None)
        if self.sent.get(("availability",)) != "online":
            self.publish(self.availability, "online")
            self.sent[("availability",)] = "online"
        targets.add(self.availability)
        if self.inventory:
            self.inventory.remember(self.config, self.availability, None)
        self.refresh_command_topics(states, prefixes)
        if self.inventory:
            self.inventory.reconcile(self.config, targets)
        if self.status:
            self.status.update(ha_connected=True, last_sync=time.time(), last_error=None, sync_pending=False)

    def yield_to_controls(self):
        if not self.commands.empty() or isinstance(self.events, LiveEventQueue) and self.events.urgent():
            self.sync_pending = True
            if self.status:
                self.status.update(sync_pending=True)
            return True
        return False

    def reconcile_if_due(self, deadline, selection_changed=False):
        now = time.monotonic()
        fresh = selection_changed or now >= deadline or self.sent_generation != self.generation
        if fresh or self.sync_pending:
            self.poll(None if fresh else self.states_cache)
        return time.monotonic() + self.config.interval if fresh else deadline

    def deliver_event(self, event):
        if event[0] == "event" and event[1].get("entity_id") not in self.event_entities:
            return
        try:
            self.events.put_nowait(event)
            if self.status:
                details = {"pending_events": self.events.qsize()}
                if event[0] == "event":
                    details["last_ha_event"] = time.time()
                self.status.update(**details)
        except queue.Full:
            while not self.events.empty():
                try:
                    self.events.get_nowait()
                except queue.Empty:
                    break
            self.events.put_nowait(("fallback", None))
            if self.status:
                self.status.update(dropped_events=self.status.snapshot()["dropped_events"] + 1)
            if event[0] != "fallback":
                raise ConnectionError("Event queue full; resync required")

    def process_event(self, event):
        kind, data = event
        if kind == "fallback":
            self.live = False
            return
        if kind == "snapshot":
            states = {s["entity_id"]: s for s in data}
            self.sent.clear()
            self.poll(states)
            self.live = True
            if self.status:
                self.status.update(mode="websocket", stream_error=None)
        elif kind == "event" and self.live:
            if self.apply_live_state(data):
                self.poll(self.states_cache)

    def apply_live_state(self, data):
        entity = data["entity_id"]
        incoming_time = ha_state_time(data.get("new_state"))
        cached_time = ha_state_time(self.states_cache.get(entity))
        if incoming_time is not None and cached_time is not None and incoming_time <= cached_time:
            return False
        if data.get("new_state") is None:
            old_time = ha_state_time(data.get("old_state"))
            if old_time is not None and cached_time is not None and old_time < cached_time:
                return False
            self.states_cache.pop(entity, None)
        else:
            self.states_cache[entity] = data["new_state"]
        return entity in self.event_entities

    def process_pending_events(self):
        first = self.events.get_nowait()
        if first[0] != "event" or not first[1].get("entity_id", "").startswith("sensor.") or self.events.qsize() < 32:
            if self.status:
                self.status.update(pending_events=self.events.qsize())
            self.process_event(first)
            return first[0]
        batch, barrier = [first[1]], None
        for _ in range(511):
            try:
                event = self.events.get_nowait()
            except queue.Empty:
                break
            if event[0] != "event" or not event[1].get("entity_id", "").startswith("sensor."):
                barrier = event
                break
            batch.append(event[1])
        if barrier:
            self.process_event(barrier)
        if self.live:
            changed = False
            for data in batch:
                changed = self.apply_live_state(data) or changed
            if changed:
                self.poll(self.states_cache)
        if self.status:
            collapsed = len(batch) - len({data["entity_id"] for data in batch})
            self.status.update(pending_events=self.events.qsize(), coalesced_events=self.status.snapshot()["coalesced_events"] + collapsed)
        return barrier[0] if barrier else "event"

    def cleanup(self, topics):
        with self.data_lock:
            if not self.connected.is_set() or not self.inventory:
                raise ValueError("MQTT ist nicht verbunden")
            allowed = set(self.inventory.candidates(self.config, self.labeled_entities, self.inventory_attributes()))
            if not isinstance(topics, list) or len(topics) > 100 or any(not isinstance(t, str) or t not in allowed for t in topics):
                raise ValueError("Nur bis zu 100 erfasste veraltete Topics dürfen gelöscht werden")
            deleted = []
            for topic in dict.fromkeys(topics):
                self.publish(topic, "")
                self.inventory.forget(self.config, topic)
                deleted.append(topic)
            return deleted

    def process_command(self, command):
        created, generation, entity, service, *original = command
        if self.connected.is_set() and generation == self.generation and time.monotonic() - created <= 10:
            if original:
                try:
                    service = self.parse_command(entity, original[0], original[1])
                except ValueError:
                    return
            if isinstance(service, tuple):
                self.ha.command(entity, service[0], service[1])
            else:
                self.ha.command(entity, service)

    def run(self):
        self.client.connect_async(self.config.host, self.config.port, keepalive=30)
        self.client.loop_start()
        stream = StateStream(self.ha, self.stop, self.deliver_event, self.status)
        self.stream = stream
        stream_thread = threading.Thread(target=stream.run, name="ha-state-stream", daemon=True)
        stream_thread.start()
        next_poll = 0
        next_label_refresh = 0
        try:
            while not self.stop.is_set():
                if not self.connected.wait(timeout=1):
                    continue
                labels_changed = False
                if self.config.forward_label and time.monotonic() >= next_label_refresh:
                    with self.data_lock:
                        labels_changed = self.refresh_label_selection()
                    next_label_refresh = time.monotonic() + self.config.interval
                try:
                    event_kind = self.process_pending_events()
                    if event_kind == "snapshot":
                        next_poll = time.monotonic() + self.config.interval
                    if event_kind == "fallback":
                        next_poll = 0
                except queue.Empty:
                    pass
                except (OSError, ValueError, RuntimeError, KeyError) as error:
                    self.live = False
                    stream.close()
                    next_poll = 0
                    if self.status:
                        self.status.update(mode="polling", last_error=type(error).__name__)
                if labels_changed or self.sync_pending or time.monotonic() >= next_poll or self.sent_generation != self.generation:
                    try:
                        next_poll = self.reconcile_if_due(next_poll, labels_changed)
                    except (OSError, ValueError, RuntimeError, KeyError) as error:
                        # Never log HTTP bodies, options, credentials or state payloads.
                        LOG.warning("Zustandsabgleich fehlgeschlagen (%s)", type(error).__name__)
                        if self.status:
                            self.status.update(last_error=type(error).__name__)
                        try:
                            self.publish(self.availability, "offline")
                            self.sent[("availability",)] = "offline"
                        except (OSError, RuntimeError, ValueError):
                            pass
                        next_poll = time.monotonic() + self.config.interval
                try:
                    timeout = 0 if not self.events.empty() else (0.1 if self.live else min(0.5, max(0, next_poll - time.monotonic())))
                    command = self.commands.get(timeout=timeout)
                except queue.Empty:
                    continue
                try:
                    self.process_command(command)
                    next_poll = 0
                except (OSError, ValueError) as error:
                    LOG.warning("HA-Befehl fehlgeschlagen (%s); keine Wiederholung", type(error).__name__)
                    if self.status:
                        self.status.update(last_error="HA command: " + type(error).__name__)
        finally:
            self.stop.set()
            stream.close()
            stream_thread.join(timeout=6)
            try:
                if self.connected.is_set():
                    self.publish(self.availability, "offline")
            except (OSError, RuntimeError, ValueError):
                pass
            self.client.disconnect()
            self.client.loop_stop()


class AppController:
    def __init__(self, options_path, token, bridge_factory=Bridge):
        self.options_path = Path(options_path)
        self.settings = SettingsStore(self.options_path)
        self.token = token
        self.bridge_factory = bridge_factory
        self.ha = HomeAssistant(self.token)
        self.lock = threading.Lock()
        self.status = RuntimeStatus()
        self.inventory = TopicInventory(self.options_path.parent / "mqtt-topics.json")
        self.routes = TopicRoutes(self.options_path.parent / "mqtt-routes.json")
        self.bridge = None
        self.thread = None

    def read_options(self):
        return self.settings.read()

    def write_options(self, options):
        self.settings.write(options)

    def start(self):
        with self.lock:
            try:
                config = Config.load(self.read_options())
                if config.tls:
                    tls_context(config)
            except (OSError, ValueError, TypeError) as error:
                LOG.info("MQTT-Client wartet auf gültige Broker-Konfiguration (%s)", type(error).__name__)
                self.status.set_connected(False, "Keine Verbindung")
                return None
            self._start_locked(config)
            return config

    def stop(self):
        with self.lock:
            self._stop_locked()

    def _start_locked(self, config):
        self.routes.bootstrap(config, self.inventory)
        self.status.set_connected(False, "Keine Verbindung")
        self.status.update(ha_connected=False, mode="polling", last_error=None, stream_error=None)
        self.bridge = self.bridge_factory(config, self.ha, status=self.status)
        self.bridge.inventory = self.inventory
        self.bridge.routes = self.routes
        self.thread = threading.Thread(target=self.bridge.run, name="mqtt-bridge", daemon=True)
        self.thread.start()

    def _stop_locked(self):
        if self.bridge:
            self.bridge.stop.set()
            if getattr(self.bridge, "stream", None):
                self.bridge.stream.close()
        thread = self.thread
        if thread and thread.is_alive():
            thread.join(timeout=15)
            if thread.is_alive():
                raise RuntimeError("Vorherige Verbindung beendet sich noch")
        self.bridge = None
        self.thread = None
        self.status.set_connected(False, "Keine Verbindung")

    def public_config(self):
        options = self.read_options()
        entities = options.get("entities", [])
        command_entities = list(automatic_command_entities(validate_entities(entities, "entities"))) if isinstance(entities, list) else []
        return {
            "broker_host": options.get("broker_host", ""),
            "broker_port": options.get("broker_port", 1883),
            "username": options.get("username", ""),
            "has_password": bool(options.get("password")),
            "entities": entities,
            "entity_attributes": options.get("entity_attributes", []),
            "command_entities": command_entities,
            "publish_delay_ms": options.get("publish_delay_ms", 50),
            "poll_interval": options.get("poll_interval", 5),
            "topic_prefix": options.get("topic_prefix", "ha_external"),
            "forward_label": options.get("forward_label", ""),
            "label_device_readings": options.get("label_device_readings", False),
            "topic_layout_new": options.get("topic_layout_new", "nested"),
            "client_id": options.get("client_id", "ugso-ha-mqtt-client"),
            "tls": bool(options.get("tls", False)),
            "has_tls_ca": bool(options.get("tls_ca")),
            "has_tls_cert": bool(options.get("tls_cert")),
            "has_tls_key": bool(options.get("tls_key")),
            "status": self.status.snapshot(),
        }

    def update_connection(self, payload):
        with self.lock:
            options = self.read_options()
            self.preserve_routes(options)
            for key in ("broker_host", "broker_port", "username", "publish_delay_ms", "poll_interval", "topic_prefix", "client_id", "tls", "tls_ca", "tls_cert", "tls_key", "forward_label", "label_device_readings", "topic_layout_new"):
                if key in payload:
                    options[key] = payload[key]
            if "password" in payload:
                options["password"] = payload["password"]
            if payload.get("clear_tls_material") is True:
                for key in ("tls_ca", "tls_cert", "tls_key"):
                    options[key] = ""
            config = Config.load(options)
            if config.tls:
                tls_context(config)
            self.write_options(options)
            self._stop_locked()
            self._start_locked(config)
        return self.public_config()

    BACKUP_KEYS = {"broker_host", "broker_port", "username", "tls", "tls_ca", "client_id",
                   "topic_prefix", "poll_interval", "publish_delay_ms", "entities",
                   "entity_attributes", "command_entities", "forward_label", "label_device_readings", "topic_layout_new"}

    def export_settings(self):
        with self.lock:
            options = self.read_options()
            try:
                route_data = self.routes.export(Config.load(options))
            except ValueError:
                route_data = {"format": "ugso-mqtt-routes", "version": 1, "scopes": []}
            return {"format": "mqtt-client-settings", "version": 1,
                    "options": {k: v for k, v in options.items() if k in self.BACKUP_KEYS},
                    "topic_routes": route_data}

    def preserve_routes(self, options):
        try:
            config = Config.load(options)
        except (ValueError, TypeError):
            return
        self.routes.bootstrap(config, self.inventory)

    def import_settings(self, payload):
        if payload.get("format") != "mqtt-client-settings" or payload.get("version") != 1 or not isinstance(payload.get("options"), dict):
            raise ValueError("Ungültige MQTT-Client-Sicherung")
        incoming = payload["options"]
        if set(incoming) - self.BACKUP_KEYS:
            raise ValueError("Sicherung enthält nicht unterstützte Einstellungen oder Geheimnisse")
        with self.lock:
            old = self.read_options()
            options = dict(incoming)
            same_broker = all(old.get(k, d) == options.get(k, d) for k, d in (("broker_host", ""), ("broker_port", 1883), ("username", ""), ("tls", False)))
            for key in ("password", "tls_cert", "tls_key"):
                options[key] = old.get(key, "") if same_broker else ""
            config = Config.load(options)
            if config.tls:
                tls_context(config)
            if "topic_routes" in payload:
                self.routes.merge(config, payload["topic_routes"])
            self._stop_locked()
            self.write_options(options)
            self._start_locked(config)
        return self.public_config()

    def retained_candidates(self):
        with self.lock:
            config = Config.load(self.read_options())
            labeled = self.bridge.labeled_entities if self.bridge else ()
            attributes = self.bridge.inventory_attributes() if self.bridge else ()
            return {"topics": self.inventory.candidates(config, labeled, attributes)}

    def transmissions(self):
        with self.lock:
            bridge = self.bridge
        return bridge.transmission_snapshot() if bridge else {"values": []}

    def reading_diagnostics(self):
        with self.lock:
            bridge = self.bridge
        return bridge.reading_diagnostics() if bridge and hasattr(bridge, 'reading_diagnostics') else {"enabled": False, "roots": []}

    def cleanup_retained(self, payload):
        if payload.get("confirm") is not True:
            raise ValueError("Retain-Löschung muss bestätigt werden")
        with self.lock:
            if not self.bridge:
                raise ValueError("MQTT ist nicht verbunden")
            return {"deleted": self.bridge.cleanup(payload.get("topics"))}

    def update_selections(self, payload):
        with self.lock:
            options = self.read_options()
            self.preserve_routes(options)
            entities = validate_entities(payload.get("entities", []), "entities")
            entity_attributes = validate_entity_attributes(payload.get("entity_attributes", []))
            validate_entities(payload.get("command_entities", []), "command_entities")
            commands = list(automatic_command_entities(entities))
            options["entities"] = list(entities)
            options["entity_attributes"] = list(entity_attributes)
            options["command_entities"] = commands
            self.write_options(options)
            self._stop_locked()
            try:
                config = Config.load(options)
            except (ValueError, TypeError):
                config = None
            if config:
                self._start_locked(config)
        return self.public_config()

    def entity_catalog(self):
        states = self.ha.full_states()
        entities = []
        for state in states:
            entity_id = state.get("entity_id", "")
            attributes = state.get("attributes", {})
            if not ENTITY.fullmatch(entity_id) or not isinstance(attributes, dict):
                continue
            name = attributes.get("friendly_name") or entity_id
            mapping = iobroker_mapping(entity_id, state.get("state", ""), attributes)
            device_name = device_name_for_entity(entity_id, name, attributes)
            entity = {
                "entity_id": entity_id,
                "name": str(name),
                "device_name": device_name,
                "object_id": object_id_for_entity(entity_id),
                "state": str(state.get("state", "")),
                "command_supported": entity_id.split(".")[0] in COMMAND_DOMAINS,
                "state_type": mapping["state_type"],
                "iobroker_type": mapping["iobroker_type"],
                "attributes": sorted(str(attr) for attr in attributes if ATTRIBUTE.fullmatch(str(attr))),
            }
            entities.append(entity)
        prefixes = common_object_prefixes(entities)
        device_map = {}
        for entity in entities:
            device_key, device_name = canonical_device_for_entity(entity, prefixes)
            entity["device_name"] = device_name
            device = device_map.setdefault(device_key, {"id": device_key, "name": device_name, "entities": []})
            device["entities"].append(entity)
        entities.sort(key=lambda item: (item["name"].casefold(), item["entity_id"]))
        devices = sorted(device_map.values(), key=lambda item: (item["name"].casefold(), item["id"]))
        for device in devices:
            device["entities"].sort(key=lambda item: (item["name"].casefold(), item["entity_id"]))
        for entity in entities:
            entity.pop("object_id", None)
        return {"entities": entities, "devices": devices}


def make_handler(controller):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt, *args):
            LOG.debug("Web UI: " + fmt, *args)

        def send_json(self, status, data):
            body = json.dumps(data).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            if self.path.endswith("/api/label-diagnostics"):
                self.send_json(HTTPStatus.OK, controller.reading_diagnostics())
                return
            if self.path.split("?", 1)[0].endswith("/downloads/ugso-mqtt-role-mapper.js"):
                body = (Path(__file__).parent / "iobroker" / "ugso-mqtt-role-mapper.js").read_bytes()
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", "text/javascript; charset=utf-8")
                self.send_header("Content-Disposition", 'attachment; filename="ugso-mqtt-role-mapper.js"')
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            if self.path.endswith("/api/transmissions"):
                self.send_json(HTTPStatus.OK, controller.transmissions())
                return
            if self.path.endswith("/api/backup"):
                self.send_json(HTTPStatus.OK, controller.export_settings())
                return
            if self.path.endswith("/api/retained"):
                try:
                    self.send_json(HTTPStatus.OK, controller.retained_candidates())
                except (ValueError, OSError) as error:
                    self.send_json(HTTPStatus.BAD_REQUEST, {"error": type(error).__name__})
                return
            if self.path.split("?", 1)[0].endswith("/mqtt-icon.svg"):
                body = (Path(__file__).parent / "mqtt-icon.svg").read_bytes()
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", "image/svg+xml")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            if self.path.endswith("/api/config"):
                try:
                    self.send_json(HTTPStatus.OK, controller.public_config())
                except (OSError, ValueError, TypeError) as error:
                    self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": type(error).__name__})
                return
            if self.path.endswith("/api/status"):
                self.send_json(HTTPStatus.OK, controller.status.snapshot())
                return
            if self.path.endswith("/api/entities"):
                try:
                    self.send_json(HTTPStatus.OK, controller.entity_catalog())
                except (OSError, ValueError, TypeError, KeyError) as error:
                    self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": type(error).__name__})
                return
            body = INDEX_HTML.encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_POST(self):
            if not any(self.path.endswith("/api/" + name) for name in ("config", "selections", "restore", "retained")):
                self.send_json(HTTPStatus.NOT_FOUND, {"error": "not found"})
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= 1048576:
                    raise ValueError("Anfrage muss 1 bis 1048576 Bytes enthalten")
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
                if not isinstance(payload, dict):
                    raise ValueError("JSON-Objekt erwartet")
                if self.path.endswith("/api/restore"):
                    result = controller.import_settings(payload)
                elif self.path.endswith("/api/retained"):
                    result = controller.cleanup_retained(payload)
                elif self.path.endswith("/api/selections"):
                    result = controller.update_selections(payload)
                else:
                    result = controller.update_connection(payload)
                self.send_json(HTTPStatus.OK, result)
            except (json.JSONDecodeError, ValueError, TypeError) as error:
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
            except (OSError, RuntimeError) as error:
                self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": type(error).__name__})

    return Handler


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    token = os.environ.get("SUPERVISOR_TOKEN")
    if not token:
        LOG.error("Home-Assistant-API-Zugang fehlt (SUPERVISOR_TOKEN)")
        return 1
    controller = AppController(OPTIONS_PATH, token)
    config = controller.start()
    server = ThreadingHTTPServer(("0.0.0.0", INGRESS_PORT), make_handler(controller))

    def shutdown(*_):
        controller.stop()
        threading.Thread(target=server.shutdown, name="web-shutdown", daemon=True).start()

    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, shutdown)
    if config:
        LOG.info("MQTT-Client %s: %d Entitäten, %d Befehlsfreigaben", APP_VERSION,
                 len(config.entities), len(config.command_entities))
    else:
        LOG.info("MQTT-Client %s: Weboberfläche bereit, Broker noch nicht konfiguriert", APP_VERSION)
    LOG.info("Weboberfläche auf Port %d aktiv", INGRESS_PORT)
    try:
        server.serve_forever()
    finally:
        server.server_close()
        controller.stop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
