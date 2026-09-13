# FRITZ!Box to MQTT

![FRITZ!Box to MQTT icon](./icon.png)

Home Assistant app for reading FRITZ!Box data and live call events and publishing the result through MQTT Discovery.

It creates entities for detected answering machines only. The entity names use `AB0` to `AB4`; the FRITZ!Box answering machine name is exposed only as an attribute.

## App Icon

The Home Assistant app icon and logo are provided as `icon.png` and `logo.png`.
Editable SVG sources live in [`../assets`](../assets).

## Entities

For each detected answering machine:

- `AB0 Neue Nachrichten`
- `AB0 Alte Nachrichten`
- `AB0 Ein/Aus`
- `AB0 Status`

The AB status binary sensor follows the FRITZ!Box `NewEnable` value. The switch is only the control entity. The raw `NewTAMRunning` and `NewStatus` values are exposed as attributes for diagnostics.

WAN entities:

- `Verbindung Download`
- `Verbindung Upload`
- `Downloadrate`
- `Uploadrate`
- `WAN Link Status`
- `Box Mesh Rolle`
- `Box PPP Verbindung`
- `Box PPP IPv4 Extern`
- `Box IPv6 Extern`
- `Box DECT`
- `Box DNS over TLS`

Current upload/download rates use TR-064 WAN data. If the FRITZ!Box does not expose direct rate values, the app calculates them from total byte counters between polls.
WAN PPP/IP control URLs are discovered from the FRITZ!Box service descriptions so different FRITZ!Box models can expose different paths.
Control names from the service descriptions are normalized automatically, for example `wanpppconn1` can be called through `/upnp/control/wanpppconn1` or `/wanpppconn1` depending on the model.
IPv6 additionally uses the FHEM-style `X_AVM_DE_GetExternalIPv6Address` action and `X_AVM-DE_AppSetup.GetAppRemoteInfo` as fallbacks.
Following FritzSmart, `query.lua` is used for `ipv6:settings/ip` and `dnscfg:settings/dns_over_tls_enabled` when available.
Web fallbacks use the FRITZ!Box web interface on `http(s)://<ip>/`, not the TR-064 port.
`Box Mesh Rolle`, `Box PPP Verbindung`, `Box PPP IPv4 Extern`, and `Box IPv6 Extern` are text sensors and publish `unknown` when the FRITZ!Box does not expose a value.
`Box DNS over TLS` is a binary sensor. It remains unavailable/unknown when the FRITZ!Box does not expose this setting through the queried interfaces.

Optional DECT line entities, if `include_dect_lines` is true:

- `{DECT name} intern`
- `{DECT name} device`
- further detected DECT lines

The displayed DECT entity names use the FRITZ!Box handset name. `DECT0`, `DECT1`, and so on are only used as a fallback when the FRITZ!Box does not return a name.
`intern` and `device` publish numeric values only.
DECT details are read by combining `GetGenericDectEntry`, `GetDECTHandsetInfo`, the DECT list XML, VoIP clients, and the FritzSmart-style `telcfg:settings/Foncontrol/User/list(...)` Lua query to find internal handset numbers such as `600`.
If no internal number is exposed directly, the app falls back from the DECT device ID to the usual FRITZ!Box range (`1` -> `600`, `2` -> `601`).

Call list entities, depending on `call_lists`:

- `Alle Anrufe`
- `Eingehende Anrufe`
- `Ausgehende Anrufe`
- `Verpasste Anrufe`
- `Abgewiesene Anrufe`
- `Gesperrte Anrufe`

Each call list sensor reports the total count as its state and exposes up to `max_calls` entries in the `entries` and `lines` attributes.

Live call monitor entities, if `call_monitor_enabled` is true:

- `Anrufmonitor Status`
- `Telefon klingelt`
- `Anrufmonitor Ereignis`
- `Anrufmonitor Verlauf`

The live monitor listens on FRITZ!Box port `1012` and publishes `RING`, `CALL`, `CONNECT`, and `DISCONNECT` events.

Phonebook entities, depending on `phonebooks`:

- `Telefonbücher`
- `Telefonbuch Anzeige`
- `Telefonbücher Auswahl`
- detected FRITZ!Box phonebooks by their FRITZ!Box names
- further detected FRITZ!Box phonebooks

`Telefonbücher` lists all detected FRITZ!Box phonebooks in its attributes.
`Telefonbuch Anzeige` is a Home Assistant select entity for choosing `Alle Telefonbücher` or one detected phonebook.
`Telefonbücher Auswahl` accepts comma-separated IDs or names for showing several phonebooks, for example `0,2` or `Privat,Firma`.
Each selected phonebook sensor reports the contact count as its state and exposes the FRITZ!Box phonebook name as an attribute.

Detected WLAN services:

- `WLAN 2.4 GHz Ein/Aus` (`wlan2_4`)
- `WLAN 2.4 GHz Status` (`wlan2_4`)
- `WLAN 5 GHz Ein/Aus` (`wlan5`)
- `WLAN 5 GHz Status` (`wlan5`)
- `WLAN Gast Ein/Aus` (`wlanguest`)
- `WLAN Gast Status` (`wlanguest`)

The SSID is exposed as an attribute and is not used as the entity name.

## Lovelace Example

A Mushroom status card example is available in [`../examples/mushroom-status-card.yaml`](../examples/mushroom-status-card.yaml).

![FRITZ!Box to MQTT Mushroom status card](../examples/fritzbox-to-mqtt.png)

## Requirements

- TR-064 enabled on the FRITZ!Box.
- A FRITZ!Box user with sufficient rights for telephony/TAM and network status.
- MQTT broker installed as Home Assistant app.
- MQTT integration with discovery enabled in Home Assistant.

## App Configuration

The visible configuration mask contains only:

```yaml
ip: 192.168.178.1
port: 49000
user: homeassistant
password: secret
call_lists: all,incoming,outgoing,missed,rejected,blocked
phonebooks: all
phonebook_names: 3:tellows Sperrliste 7,4:tellows Sperrliste 8-9
phonebook_name_excludes: ""
call_monitor_enabled: true
call_monitor_port: 1012
max_calls: 20
max_live_events: 20
include_dect_lines: false
max_dect_lines: 6
dns_over_tls_enabled: true
log_value_details: true
```

MQTT host, port, username and password are requested from Home Assistant's internal MQTT service automatically.
`phonebooks` is the startup selection; after the first successful scan, use the `Telefonbuch Anzeige` select entity in Home Assistant.
`phonebook_names` can override generic FRITZ!Box names, for example `1:Privat,3:Firma`.
The default maps phonebook `3` to `tellows Sperrliste 7` and phonebook `4` to `tellows Sperrliste 8-9`.
`phonebook_name_excludes` hides matching FRITZ!Box phonebook names from the list, for example `tellows`.
`dns_over_tls_enabled` is only the fallback value for `Box DNS over TLS` when `query.lua` does not return `dnscfg:settings/dns_over_tls_enabled`.
Mesh role uses TR-064 mesh XML first and falls back to the FHEM-style `data.lua?page=wlanmesh` query.
If no mesh role source returns a value, `Box Mesh Rolle` publishes the FHEM default `master`.
`log_value_details` writes the relevant raw TR-064 response dictionaries and normalized publish values to the app log. Set it to `false` after troubleshooting if the log should be quieter.
