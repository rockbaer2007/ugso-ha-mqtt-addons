# Flex Table Card examples

Each file is ready to paste into a Home Assistant dashboard using
[`custom:flex-table-card`](https://github.com/custom-cards/flex-table-card).
The MQTT Discovery entity is created by Parcel to MQTT automatically. It is
available even when the provider currently has no parcels.

- `all-providers-flex-table-card.yaml`: combined DHL, Hermes, GLS, DPD, UPS,
  Amazon Logistics, Deutsche Post and FedEx list.
- `dhl-flex-table-card.yaml`
- `hermes-flex-table-card.yaml`
- `gls-flex-table-card.yaml`
- `dpd-flex-table-card.yaml`
- `ups-flex-table-card.yaml`
- `amazon-flex-table-card.yaml`
- `deutsche-post-flex-table-card.yaml`
- `fedex-flex-table-card.yaml`

If Home Assistant assigned a different entity ID because a previous entity
already exists, replace only the `entities.include` value in the card file.
