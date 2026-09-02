# Configuration

Example:

```yaml
ip: 192.168.178.1
port: 49000
user: homeassistant
password: secret
call_lists: all,incoming,outgoing,missed,rejected,blocked
phonebooks: all
phonebook_names: 3:tellows Sperrliste 7,4:tellows Sperrliste 8-9
phonebook_name_excludes: ""
poll_interval: 120
call_list_poll_interval: 600
tam_poll_interval: 600
dect_poll_interval: 600
phonebook_poll_interval: 3600
call_monitor_enabled: true
call_monitor_port: 1012
max_calls: 20
max_live_events: 20
include_dect_lines: false
max_dect_lines: 6
dns_over_tls_enabled: true
log_value_details: true
```

The visible Home Assistant app configuration asks for the FRITZ!Box connection and display choices.
MQTT host, port, username and password are requested from Home Assistant's internal MQTT service automatically.
MQTT discovery uses the prefix `homeassistant` and base topic `fritzbox`.
To reduce FRITZ!Box load, polling is split into groups:

- `poll_interval`: WLAN, WAN and general box status every 120 seconds by default
- `call_list_poll_interval`: call lists every 600 seconds by default
- `tam_poll_interval`: answering machines every 600 seconds by default
- `dect_poll_interval`: DECT status and optional DECT lines every 600 seconds by default
- `phonebook_poll_interval`: phonebooks every 3600 seconds by default

The live call monitor stays active on port `1012` and does not wait for these polling intervals.
If WAN/DSL appears offline, the app pauses call list, answering machine, DECT and phonebook polling and keeps only WLAN, WAN and general connection status polling active. When WAN/DSL comes back online, the paused groups are refreshed immediately.
If `log_value_details` is true, the app logs the relevant raw TR-064 response dictionaries and the normalized values published to MQTT.
`dns_over_tls_enabled` is only the fallback value for `Box DNS over TLS` when `query.lua` does not return `dnscfg:settings/dns_over_tls_enabled`.
Only readable FRITZ!Box features are published to Home Assistant; missing optional services are hidden in normal logs and skipped in discovery.
Current WAN upload/download rates use TR-064. Port `1012` is only the live call monitor and does not provide bandwidth data.
WAN PPP/IP control URLs are discovered from `/igddesc.xml` and `/tr64desc.xml`, with known paths used as fallbacks.
Control names are normalized automatically so FRITZ!Box descriptions that expose names such as `wanpppconn1` can still be called through the matching URL path.
IPv6 additionally uses the FHEM-style `X_AVM_DE_GetExternalIPv6Address` action and `X_AVM-DE_AppSetup.GetAppRemoteInfo` as fallbacks.
Following FritzSmart, `query.lua` is used for `ipv6:settings/ip` and `dnscfg:settings/dns_over_tls_enabled` when available.
Web fallbacks use the FRITZ!Box web interface on `http(s)://<ip>/`, not the TR-064 port.
Additional box status sensors include text sensors for `box_meshRole`, `box_ppp_connect`, `ipv4_extern` (`Box PPP IPv4 Extern`), and `ipv6_extern` (`Box IPv6 Extern`), plus binary sensors for `box_dect` and `box_dns_over_tls` where the FRITZ!Box exposes them. Missing text values are published as `unknown`.
Mesh role uses TR-064 mesh XML first and falls back to the FHEM-style `data.lua?page=wlanmesh` query.
If no mesh role source returns a value, `Box Mesh Rolle` publishes the FHEM default `master`.
If `include_dect_lines` is true, the app also publishes `dect*_intern` and `dect*_device` sensors up to `max_dect_lines`. The Home Assistant sensor names use the FRITZ!Box handset name when available. `intern` and `device` publish numeric values only. DECT details combine `GetGenericDectEntry`, `GetDECTHandsetInfo`, the DECT list XML, VoIP client data, and the FritzSmart-style `telcfg:settings/Foncontrol/User/list(...)` Lua query where available. If no internal number is exposed directly, the app falls back from the DECT device ID to the usual FRITZ!Box range (`1` -> `600`, `2` -> `601`).

`call_lists` is a comma-separated selection of:

- `all`
- `incoming`
- `outgoing`
- `missed`
- `rejected`
- `blocked`

`phonebooks` can be `all` or a comma-separated list of FRITZ!Box phonebook IDs, for example `0,1`.
It is only the startup selection. After the first successful scan, the `Telefonbücher` sensor lists all detected phonebooks and the `Telefonbuch Anzeige` select entity can switch between `Alle Telefonbücher` and individual phonebooks.
For several selected phonebooks at once, use the `Telefonbücher Auswahl` text entity with comma-separated IDs or names, for example `0,2` or `Privat,Firma`.
`phonebook_names` can override generic FRITZ!Box names, for example `1:Privat,3:Firma`.
The default maps phonebook `3` to `tellows Sperrliste 7` and phonebook `4` to `tellows Sperrliste 8-9`.
`phonebook_name_excludes` is a comma-separated name filter; for example `tellows` hides matching phonebooks from the list and from `Alle Telefonbücher`.
`max_calls` limits how many calls are included in the call list sensor attributes. The sensor state still reports the total count for the selected list.

If `call_monitor_enabled` is true, the app also connects to the FRITZ!Box call monitor on `call_monitor_port` and publishes live `RING`, `CALL`, `CONNECT`, and `DISCONNECT` events. `max_live_events` limits the live event history. The call monitor must be enabled on the FRITZ!Box, usually with `#96*5*` from a connected phone.

The app probes answering machine indexes `0` to `max_tam - 1` and publishes discovery only for readable/present entries.
It probes WLAN TR-064 services from `WLANConfiguration:1` to `WLANConfiguration:max_wlan` and publishes only services that answer successfully.
The first three WLAN services use stable MQTT and Home Assistant object IDs:

- `WLANConfiguration:1` -> `wlan2_4` / `WLAN 2.4 GHz`
- `WLANConfiguration:2` -> `wlan5` / `WLAN 5 GHz`
- `WLANConfiguration:3` -> `wlanguest` / `WLAN Gast`

Further readable WLAN services use the fallback `wlan_service_4`, `wlan_service_5`, and so on.

The switch entity calls TR-064 `SetEnable`, so `AB0 Ein/Aus` can enable or disable the corresponding answering machine.
The AB status binary sensor follows `NewEnable`; the AB switch remains the control entity. Raw `NewTAMRunning` and `NewStatus` are kept as attributes because FRITZ!Box models report them differently.
WLAN switches also call TR-064 `SetEnable`; for example `WLAN 2.4 GHz Ein/Aus` controls `WLANConfiguration:1`.
