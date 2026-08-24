# UGSo MQTT Add-ons

Gemeinsames Home-Assistant-Add-on-Repository fuer die MQTT-Projekte von UGSo Software.

Dieses Repository kann in Home Assistant einmal als Add-on-Repository eingetragen werden. Danach erscheinen die enthaltenen MQTT-Projekte einzeln in der Add-on-Uebersicht.

## Enthaltene Add-ons

- FRITZ!Box to MQTT
- Heizoel to MQTT
- Parcel to MQTT

## Installation

In Home Assistant:

```text
Einstellungen -> Add-ons -> Add-on Store -> Drei Punkte -> Repositorys
```

Dann diese Repository-URL eintragen:

```text
https://github.com/rockbaer2007/ugso-ha-mqtt-addons
```

Danach koennen die einzelnen Add-ons installiert und separat konfiguriert werden.

## Hinweise

- Die Add-ons nutzen Home-Assistant-MQTT-Discovery.
- Ein MQTT-Broker muss in Home Assistant vorhanden sein.
- Die einzelnen Projekt-Repositories bleiben weiterhin als Quell- und Entwicklungsrepos bestehen.
