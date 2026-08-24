# Heizöl to MQTT

Home Assistant app for publishing heating-oil price data through MQTT Discovery.

Adapted from and inspired by the original ioBroker adapter:
[TA2k/ioBroker.heizoel](https://github.com/TA2k/ioBroker.heizoel)

## Entities

For every enabled source and configured amount, the app creates:

- `{source} {amount}l Preis pro 100l`
- `{source} {amount}l Gesamtpreis`
- `{source} {amount}l Händler`
- `{source} {amount}l Lieferdauer`
- `{source} {amount}l Angebote`
- `{source} {amount}l Anbieter 01` through `{source} {amount}l Anbieter 06`
- `{source} {amount}l Anbieter 01 Gesamtpreis` through `{source} {amount}l Anbieter 06 Gesamtpreis`
- `{source} {amount}l Anbieter 01 Preis pro Liter` through `{source} {amount}l Anbieter 06 Preis pro Liter`
- `{source} {amount}l Anbieter 01 Preis pro 100l` through `{source} {amount}l Anbieter 06 Preis pro 100l`

Each offer also exposes delivery, rating and rank as attributes.

It also creates:

- `Heizöl Verbindung`
- `Heizöl letzte Aktualisierung`

## Sources

- Esyoil
- Heizöl24 DE
- Heizöl24 AT

The price lookups are valid for Germany and Austria only.

## Lovelace Example

A Mushroom provider card example is available in [`../examples/mushroom-provider-card.yaml`](../examples/mushroom-provider-card.yaml).

![Heizöl to MQTT Mushroom provider card](../examples/heizoel-to-mqtt.png)

Editable icon sources live in [`../assets`](../assets).

## Configuration Mask

The visible configuration keys follow the original ioBroker adapter masks:

- `plz`
- `amount`
- `interval`
- `esyActive`
- `deliveryTimes`
- `payment_type`
- `prod`
- `unloading_points`
- `hose`
- `short_vehicle`
- `hoDe`
- `hoAt`

Home Assistant shows translated configuration labels when the active UI language is German or English.

Heizöl24 uses postal code and amount like the original adapter note says. The detailed delivery, payment, product, hose and vehicle options are used for Esyoil.

Only use German or Austrian postal codes that match the selected providers.

## Notes

The external endpoints are public website endpoints, not official stable APIs. They may change without notice.

The configured postal code and request parameters are sent to the enabled providers.
