# Changelog

## 0.1.1

- Sending works when crypto.randomUUID is unavailable, including HTTP Home Assistant Ingress. Request IDs use getRandomValues when available, with a timestamp/counter fallback for older browsers.
- Verified native UUID, random-byte and compatibility paths without real sends.

## 0.1.0

- First experimental HA App in the shared UGSo HA Apps repository.
- Authenticated Ingress UI, DE/EN/FR, system language and light/dark/system appearance.
- Private recipient profiles, default recipient and test message.
- MQTT send/result protocol, queue, rate limiting and optional request deduplication.
- Matching Blocks for HA 0.1.48 block, no provider credentials in generated YAML.
