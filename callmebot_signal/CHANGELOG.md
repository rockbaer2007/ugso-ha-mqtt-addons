# Changelog

## 0.1.2

- Beta designation in UI/docs; HA experimental stage retained because beta is not a supported stage.
- Persistent metadata-only send history (200 entries), profile/error filters and confirmed clearing in DE/EN/FR.
- Password-encrypted profile backup/restore (scrypt + AES-GCM), provider isolation and no changes on invalid backup; pending sends block restore.
- External MQTT with verified TLS, custom CA and client certificate/key. Automatic HA broker remains the default; existing profiles, keys, topics and entity IDs are preserved.


## 0.1.1

- Removed UGSo from the visible application name; existing technical IDs, saved data and MQTT topics remain compatible.
- Verified German, English and French application messages.

## 0.1.0

- First experimental UGSo CallMeBot Signal app, alongside UGSo CallMeBot Whatsapp.
- Authenticated HA Ingress with DE/EN/FR, system language and light/dark/system appearance.
- Private recipient profiles accept international numbers or Signal UUIDs and matching CallMeBot Signal API keys.
- Fixed Signal HTTPS endpoint, isolated MQTT topics/discovery/client ID, retained profile catalog for Blocks for HA 0.1.50.
- Queue, ten-second per-profile rate limit, safe status results and optional request deduplication. No automatic retries or retained commands.
- Home Assistant icon with Signal overlay.
