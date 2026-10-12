# Changelog

## 0.1.6

- Beta designation in UI/docs; HA experimental stage retained because beta is not a supported stage.
- Persistent metadata-only send history (200 entries), profile/error filters and confirmed clearing in DE/EN/FR.
- Password-encrypted profile backup/restore (scrypt + AES-GCM), provider isolation and no changes on invalid backup; pending sends block restore.
- External MQTT with verified TLS, custom CA and client certificate/key. Automatic HA broker remains the default; existing profiles, keys, topics and entity IDs are preserved.


## 0.1.5

- Removed UGSo from the visible application name; existing technical IDs, saved data and MQTT topics remain compatible.
- Verified German, English and French application messages.

## 0.1.4

- Renamed the app to UGSo CallMeBot Whatsapp. Existing slug, saved profiles, MQTT topics and entity IDs are preserved.
- Separate UGSo CallMeBot Signal app can run alongside WhatsApp.

## 0.1.3

- App icon combines a blue Home Assistant house with a green WhatsApp overlay. Includes HA store icon/logo, web header and favicon.

## 0.1.2

- MQTT discovery profile catalog for Blocks for HA 0.1.49: profile IDs, names and default recipient only.
- Retained catalog is updated on profile changes and MQTT reconnection. No phone numbers, messages or API keys in catalog/discovery payloads.

## 0.1.1

- Sending works when crypto.randomUUID is unavailable, including HTTP Home Assistant Ingress. Request IDs use getRandomValues when available, with a timestamp/counter fallback for older browsers.
- Verified native UUID, random-byte and compatibility paths without real sends.

## 0.1.0

- First experimental HA App in the shared UGSo HA Apps repository.
- Authenticated Ingress UI, DE/EN/FR, system language and light/dark/system appearance.
- Private recipient profiles, default recipient and test message.
- MQTT send/result protocol, queue, rate limiting and optional request deduplication.
- Matching Blocks for HA 0.1.48 block, no provider credentials in generated YAML.
