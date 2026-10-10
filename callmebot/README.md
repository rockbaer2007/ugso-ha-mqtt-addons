# UGSo CallMeBot

Experimental Home Assistant App **0.1.3**, in the same repository as Blocks for HA. Original UGSo implementation, inspired by the functionality of [ioBroker.whatsapp-cmb](https://github.com/ioBroker/ioBroker.whatsapp-cmb). No ioBroker runtime required. Sending also works without crypto.randomUUID, including HTTP Ingress.

Blocks for HA 0.1.49 can select saved profiles by name. The app publishes a retained catalog of IDs, names and the default profile on `ugso/callmebot/profiles`, plus an HA MQTT discovery sensor. Blocks reads this sensor through its HA connection. Update/restart both apps and keep HA MQTT discovery enabled. The catalog never contains numbers, messages or keys. Profile names are visible in HA and MQTT; use suitable display names.

Configure recipient profiles through authenticated Home Assistant Ingress: profile ID, name, international phone number and the matching CallMeBot API key. The interface supports **German, English, French**, system language and light/dark/system appearance. Secrets remain in `/data/profiles.json`, never in Blockly, MQTT commands, logs or browser storage. HA backups contain this private file; protect backups accordingly.

Install this repository in Home Assistant, install **UGSo CallMeBot**, start the MQTT broker and the app, then open the web UI. Supervisor MQTT service credentials are preferred; manual MQTT options are the fallback. Version 0.1.0 targets the internal HA broker and does not offer external TLS broker configuration.

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
