# CallMeBot Whatsapp

Beta Home Assistant App **0.1.6**, in the same repository as Blocks for HA. Original UGSo implementation, inspired by the functionality of [ioBroker.whatsapp-cmb](https://github.com/ioBroker/ioBroker.whatsapp-cmb). No ioBroker runtime required. Sending also works without crypto.randomUUID, including HTTP Ingress.

Blocks for HA 0.1.59 can select saved profiles by name. The app publishes a retained catalog of IDs, names and the default profile on `ugso/callmebot/profiles`, plus an HA MQTT discovery sensor. Blocks reads this sensor through its HA connection. Update/restart both apps and keep HA MQTT discovery enabled. The catalog never contains numbers, messages or keys. Profile names are visible in HA and MQTT; use suitable display names.

Configure recipient profiles through authenticated Home Assistant Ingress: profile ID, name, international phone number and the matching CallMeBot API key. The interface supports **German, English, French**, system language and light/dark/system appearance. Secrets remain in `/data/profiles.json`, never in Blockly, MQTT commands, logs or browser storage. HA backups contain this private file; protect backups accordingly.

Install this repository in Home Assistant, install **CallMeBot Whatsapp**, start the MQTT broker and the app, then open the web UI. Supervisor MQTT service credentials are preferred; manual MQTT options are the fallback. Automatic HA broker selection remains the default; external brokers and verified TLS are configurable.

- [Deutsch](https://opensource.ugso-software.de/projects/callmebot/)
- [English](https://opensource.ugso-software.de/en/projects/callmebot/)
- [Français](https://opensource.ugso-software.de/fr/projects/callmebot/)
- [Setup and protocol](DOCS.md)

## Development

```sh
python -m pip install -r callmebot/requirements.txt
python -m unittest discover -s callmebot/tests -v
docker build -t ugso-callmebot:test callmebot
```

For the MQTT round-trip test, start a disposable local Mosquitto broker on port 18890 using `tests/mosquitto.conf`, then run `python callmebot/tests/mqtt_roundtrip.py` from the repository root. Its provider is mocked; it never sends WhatsApp messages. The anonymous test broker configuration is for local tests only.

For a loopback-only preview, run `app/server.py` inside this directory with `CALLMEBOT_NO_MQTT=1`. Port: 4181. The UI's send button sends a real message if a valid profile is configured. Automated tests inject a mock provider and never send real messages.

License: Apache-2.0. This community project is independent of WhatsApp/Meta and CallMeBot. CallMeBot is an external service, not bundled software.

## Beta: history, profile backup and MQTT TLS

History persists up to 200 entries with timestamp, profile ID, source and result. Filter by profile/error status and explicitly confirm clearing. It contains no messages, numbers, API keys or request IDs. Accepted still means provider acceptance, not confirmed delivery. A storage error never causes automatic resending.

Profile backups encrypt numbers, API keys and the default profile using AES-GCM and a password-derived key (scrypt). Choose at least 12 characters and keep the password separately; it is not stored. Restoration requires it, explicit confirmation and valid authenticated content. Wrong passwords, damaged files or backups from the other CallMeBot app leave profiles untouched. Pending sends block restoration. MQTT credentials and history are excluded; use a full HA app backup for those.

Automatic HA broker selection remains the existing default. Disable it to configure an external host, port, username and password. TLS always checks certificates and hostname; custom PEM CA and client certificate/key uploads are supported. Choose the broker TLS port, often 8883. Empty secret fields preserve saved values. HA/Blocks must use this broker or forward send/result/profile/discovery topics between brokers; this is not an automatic broker bridge.

Existing profiles.json, recipient keys, MQTT topics and entity IDs remain unchanged. History uses /data/history.json; explicitly saved MQTT settings use /data/mqtt.json. No automatic configuration rewrite. All new UI labels support DE/EN/FR.

Beta is displayed in the UI and description. HA has no native beta stage, so the valid experimental configuration stage remains. [HA configuration](https://developers.home-assistant.io/docs/apps/configuration/).
