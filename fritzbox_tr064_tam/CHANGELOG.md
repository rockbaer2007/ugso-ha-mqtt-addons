# Changelog

## 0.1.40

- Add shared attributes to each legacy last-call sensor group with call index, availability, name, number, date/time, type, duration, caller and called values.

## 0.1.39

- Expand the legacy last-call card sensors from 10 to 20 calls so dashboards can show more entries from today and the previous days.

## 0.1.38

- Sort the legacy last-call sensors by the FRITZ!Box call date and publish today's calls first, so dashboard cards show the current day's recent calls before older entries.

## 0.1.37

- Publish the legacy last-call card sensors as simple MQTT Discovery entities whose names and object IDs directly match `sensor.fritzbox_letzte_anrufe_call_*`.
- Clear both earlier legacy discovery variants before republishing so Home Assistant can rebuild the expected entities.

## 0.1.36

- Force the legacy last-call discovery object IDs to the expected Home Assistant entity IDs such as `sensor.fritzbox_letzte_anrufe_call_1_name_2`.
- Remove the earlier intermediate discovery topics so Home Assistant can recreate the corrected entities after the add-on restarts.

## 0.1.35

- Added legacy individual last-call MQTT Discovery sensors for Lovelace cards that expect `sensor.fritzbox_letzte_anrufe_call_1_name_2`, number, date, type and duration entities up to call 10.
- Kept the existing call list sensors with `entries` and `lines` attributes unchanged.

## 0.1.34

- Added Home Assistant diagnostic sensors for the current polling mode and a
  readable polling message.
- Publish `full`, `limited` or `unknown` so dashboards and automations can show
  whether detail polling is active or paused while WAN/DSL reconnects.

## 0.1.33

- Pause call list, answering machine, DECT and phonebook polling while WAN/DSL
  appears offline.
- Keep WLAN, WAN and general connection status polling active so the app can
  detect when the connection returns.
- Refresh all paused polling groups immediately after WAN/DSL comes back online.

## 0.1.32

- Split FRITZ!Box polling into lower-load groups.
- Poll WLAN, WAN and general box status every 120 seconds by default.
- Poll call lists, answering machines and DECT every 600 seconds by default.
- Poll phonebooks every 3600 seconds by default.
- Keep the call monitor live through port `1012`.

## 0.1.31

- Added app icon and logo assets for the Home Assistant app store and repository documentation.

## 0.1.30

- Display WLAN status and WAN link status sensors as `Ein`/`Aus` instead of raw FRITZ!Box values such as `Up` or `Disabled`.

## 0.1.29

- Prepared public GitHub distribution.
- Updated repository metadata to `FRITZ!Box to MQTT`.
- Added project-level open-source documentation files.

## 0.1.28

- Removed DECT `NoRingTime` sensors.
- Kept DECT `intern` and `device` sensors.
- Old retained `NoRingTime` discovery configs are cleared on startup.
