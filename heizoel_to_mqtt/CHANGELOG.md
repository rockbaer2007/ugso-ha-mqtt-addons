# Changelog

## 0.1.15

- Added app icon and logo assets for the Home Assistant app store and repository documentation.

## 0.1.14

- Publish price sensors with two decimal places and add Home Assistant discovery precision hints for price entities.

## 0.1.13

- Accept legacy hose values with spaces (`40 m`, `60 m`, `80 m`) so existing Home Assistant app options can be saved and migrated.

## 0.1.12

- Reduced offer entities from 10 to 6 provider groups.
- Changed hose options to `40m`, `60m` and `80m`.
- Added retained MQTT Discovery cleanup for legacy offer entities 07 through 10.

## 0.1.11

- Changed hose length from a numeric field to the fixed values `40 m`, `60 m` and `80 m`.
- Quoted the visible payment option schema so Home Assistant keeps the German labels.

## 0.1.10

- Added total price, price per litre and price per 100 litres as separate entities for each of the first 10 offers.

## 0.1.9

- Added MQTT Discovery sensors for the provider names of the first 10 offers per source and amount.
- Added offer attributes with price, delivery, rating and rank for those provider sensors.

## 0.1.8

- Changed visible payment options to the German ioBroker mask labels.
- Added runtime mapping from German payment labels to EasyOil request codes.

## 0.1.7

- Changed visible oil product options to the German ioBroker mask labels.
- Added runtime mapping from German product labels to EasyOil request codes.

## 0.1.6

- Changed hose length to a numeric metre field.
- Renamed the visible short vehicle option to tank truck and changed its choices to trailer/no-trailer labels.

## 0.1.5

- Renamed the visible EasyOil switch label.
- Added the postal-code-and-amount note to the visible Heizöl24 provider switch labels.

## 0.1.4

- Changed visible delivery time options to the German ioBroker mask labels.
- Added runtime mapping from German delivery time labels to EsyOil request codes.

## 0.1.3

- Added German and English Home Assistant app configuration translations.
- Documented that provider lookups are intended for Germany and Austria only.

## 0.1.2

- Removed legacy `_enabled` provider option names from the runtime configuration path and public documentation.

## 0.1.1

- Changed visible configuration keys to match the original ioBroker adapter masks.
- Kept compatibility with the first `0.1.0` configuration key names.

## 0.1.0

- Initial testable Home Assistant app.
- Added Esyoil and Heizöl24 polling.
- Added MQTT Discovery sensors.
