# AGENTS.md

## Parcel to MQTT

- Die Paket-JSON-Ausgabe soll sich fuer alle Provider am ioBroker-Parcel-Adapter orientieren.
- DHL ist die erste Referenzstruktur, aber dieselbe Form gilt spaeter auch fuer Hermes, GLS, DPD, UPS, Amazon Logistics, Deutsche Post und FedEx.
- Provider-Listen sollen mindestens Felder wie `id`, `name`, `status`, `source`, `delivery_status` und `direction` enthalten.
- Provider-Detail-JSON soll moeglichst nah an der Struktur `sendungen` mit `sendungsinfo`, `sendungsdetails`, `sendungsnummern`, Empfaenger/Ort und `sendungsverlauf.events` bleiben.
- Provider-Listen sollen standardmaessig bis zu 10 Pakete pro Provider unterstuetzen; Amazon Logistics darf wegen haeufigerer Sammelbestellungen bis zu 15 Pakete liefern.
- Eine spaetere Gesamtgrenze von etwa 50 Paketen ist sinnvoll, damit MQTT- und Home-Assistant-Attribute nicht unnoetig gross werden.
- Sensitive Felder wie Tokens, Cookies, Session-IDs, Passwoerter und personenbezogene Login-Daten duerfen nicht unnoetig ueber MQTT veroeffentlicht werden.
