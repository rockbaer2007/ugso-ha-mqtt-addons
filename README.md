# UGSo HA Apps

Gemeinsames Repository für alle Home-Assistant-App-Veröffentlichungen von UGSo Software: MQTT-Apps, Grafik Visual Studio, Blocks for HA und zukünftige Apps. Jede App liegt in einem eigenen Unterverzeichnis mit eigener Version und Dokumentation. Die bestehende Repository-URL bleibt erhalten.

Dieses Repository kann in Home Assistant einmal als Add-on-Repository eingetragen werden. Danach erscheinen die installierbaren Apps einzeln in der Add-on-Übersicht. Lokale Prototypen erscheinen dort erst, wenn ihre HA-App-Paketierung fertig ist.

## Enthaltene Add-ons

- [UGSo CallMeBot Signal](callmebot_signal/README.md): **experimentelle** Signal-Textnachrichten mit Telefon-/UUID-Profilen, eigenem MQTT-Namensraum und dreisprachigem Blockly-Baustein. Oberfläche: DE/EN/FR.
- [UGSo CallMeBot Whatsapp](callmebot/README.md): **experimentelle** WhatsApp-Textnachrichten mit Empfängerprofilen, MQTT und dreisprachigem Blockly-Baustein. Oberfläche: DE/EN/FR.

- FRITZ!Box to MQTT
- Heizoel to MQTT
- [Parcel to MQTT](parcel_to_mqtt/README.md): Entwicklung eingestellt, da [Parcel Tracker von SoerenKaiser99](https://github.com/SoerenKaiser99/parcel_tracker) bereits deutlich weiter entwickelt ist. / Development discontinued because Parcel Tracker is already much further along.
- [MQTT-Client](mqtt_client/README.md): ausgewählte HA-Zustände an einen externen Broker (z. B. ioBroker) senden, optional mit Ein/Aus-Befehlen zurück an HA.
- [HA Grafik Visual Studio](ha_grafik_visual_studio/README.md): **experimentelles** Grundgerüst für eine grafische HA-Visualisierung mit getrenntem Editor- und Runtime-Modus.
- [UGSo Blocks for HA](blocks_for_ha/DOCS.md): **experimentelle** HA-App für native Automationen aus visuellen Blocks, mit YAML-Import/-Export und HA-Ingress.

## Weitere Projekte

- [Blocks-Entwicklung](blocks_for_ha/README.md): alternativ lokal mit `npm install` und `npm run dev` im Unterverzeichnis auf Port 4180 starten.

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
