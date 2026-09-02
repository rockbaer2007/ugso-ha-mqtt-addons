# Changelog

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
