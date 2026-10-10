# Changelog

## 0.1.0

- First experimental UGSo CallMeBot Signal app, alongside UGSo CallMeBot Whatsapp.
- Authenticated HA Ingress with DE/EN/FR, system language and light/dark/system appearance.
- Private recipient profiles accept international numbers or Signal UUIDs and matching CallMeBot Signal API keys.
- Fixed Signal HTTPS endpoint, isolated MQTT topics/discovery/client ID, retained profile catalog for Blocks for HA 0.1.50.
- Queue, ten-second per-profile rate limit, safe status results and optional request deduplication. No automatic retries or retained commands.
- Home Assistant icon with Signal overlay.
