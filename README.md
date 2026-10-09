# UGSo MQTT Add-ons

Gemeinsames Home-Assistant-Add-on-Repository fuer die MQTT-Projekte von UGSo Software.

Dieses Repository kann in Home Assistant einmal als Add-on-Repository eingetragen werden. Danach erscheinen die enthaltenen MQTT-Projekte einzeln in der Add-on-Uebersicht.

## Enthaltene Add-ons

- FRITZ!Box to MQTT
- Heizoel to MQTT
- [Parcel to MQTT](parcel_to_mqtt/README.md): Entwicklung eingestellt, da [Parcel Tracker von SoerenKaiser99](https://github.com/SoerenKaiser99/parcel_tracker) bereits deutlich weiter entwickelt ist. / Development discontinued because Parcel Tracker is already much further along.
- [MQTT-Client](mqtt_client/README.md): ausgewählte HA-Zustände an einen externen Broker (z. B. ioBroker) senden, optional mit Ein/Aus-Befehlen zurück an HA.
- [HA Grafik Visual Studio](ha_grafik_visual_studio/README.md): **experimentelles** Grundgerüst für eine grafische HA-Visualisierung mit getrenntem Editor- und Runtime-Modus.

## Weitere Projekte

- [UGSo Blocks for HA](blocks_for_ha/README.md): visueller Editor für native HA-Automationen mit YAML-Import/-Export. Lokaler Prototyp, noch kein installierbares Add-on. Start im Unterverzeichnis mit `npm install` und `npm run dev` auf Port 4180.

## Add-on-Installation

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

- FRITZ!Box, Heizoel und Parcel to MQTT nutzen Home-Assistant-MQTT-Discovery und einen MQTT-Broker für Home Assistant.
- MQTT-Client verbindet sich zusätzlich mit einem externen Broker; der vorhandene HA-Broker bleibt bestehen. Die App verwendet keine MQTT-Discovery.
- Die einzelnen Projekt-Repositories bleiben weiterhin als Quell- und Entwicklungsrepos bestehen.
