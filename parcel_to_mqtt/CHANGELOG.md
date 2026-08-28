# Changelog

## 0.1.17

- Added an ioBroker-style DHL JSON payload at `parcel/dhl/json`.
- Added a matching Home Assistant MQTT Discovery sensor for DHL JSON details.

## 0.1.16

- Added ioBroker-style provider JSON topics at `parcel/allProviderJson` and `parcel/allProviderObjects`.
- Added provider list fields for `id`, `name`, `status`, `source`, `delivery_status` and `direction`.

## 0.1.15

- Added parcel detail fields for recipient name, recipient location, raw direction and tracking events.
- Included parcel detail fields in list, all and per-parcel MQTT attributes.

## 0.1.14

- Wrapped `parcel/list` as a JSON object with `count` and `parcels` so Home Assistant can read it as attributes.

## 0.1.13

- Added a compact parcel JSON list with number, status and direction.
- Added direction detection for incoming and outgoing parcels.

## 0.1.12

- Improved DHL authentication error logging.

## 0.1.11

- Improved DHL account parcel diagnostics.
- Improved DHL tracking-number detection in nested response fields.
- Prevented empty MQTT configuration fields from overriding Home Assistant service values.

## 0.1.10

- Improved DHL account parcel polling.
- Accepted complete DHL redirect URLs and raw authorization codes.
- Used the DHL access token for account parcel-list requests.

## 0.1.9

- Added visible MQTT connection settings for host, port, username, password, discovery prefix, base topic and retain.

## 0.1.8

- Fixed the add-on startup path from `/app/app/main.py` to `/app/main.py`.

## 0.1.7

- Grouped app configuration by provider for accordion-style Home Assistant settings.
- Added prepared provider sections for GLS, DPD, UPS, Amazon Logistics, Deutsche Post letters and FedEx.
- Kept DHL and Hermes active while preserving legacy flat option compatibility.

## 0.1.6

- Added masked provider request/response debug logging when `log_response_details` is enabled.
- Added `/data/provider_debug.log` with a maximum of 100 retained JSON lines.

## 0.1.5

- Added the DHL login URL as a visible configuration copy helper.
- Added the DHL browser-login steps to the configuration descriptions and README.

## 0.1.4

- Added optional DHL account login through a `dhllogin://` browser redirect URL.
- Stored the DHL refresh token in the app data folder and reused it on restart.
- Added DHL account parcel-list polling in addition to manual tracking numbers.

## 0.1.3

- Fixed local Home Assistant app builds by using the same Home Assistant base Python image layout as the other UGSo apps.

## 0.1.2

- Added direct Hermes Germany parcel tracking.
- Added shared parcel status groups for registered, pickup point and returning.
- Prepared GLS configuration fields while keeping GLS polling disabled until the required guest bearer session is implemented.
- Added attribution for the ha-parcel-integrations status model inspiration.

## 0.1.1

- Removed 17TRACK API support because the API key can be paid.
- Switched the MVP to direct DHL parcel tracking by configured DHL tracking numbers.

## 0.1.0

- Initial Home Assistant Supervisor app.
- Added MQTT Discovery sensors for parcel tracking.
- Added manual tracking number configuration, counters, JSON lists and six parcel slot entities.
- Added app icon and logo assets.
