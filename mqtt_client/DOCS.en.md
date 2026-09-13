# MQTT-Client 0.1.2

An independent Home Assistant app connecting to an external MQTT broker, such as
ioBroker's MQTT adapter in Server/Broker mode. Your existing HA broker and MQTT
integration remain in place. This is a direct HA API client, not a broker bridge.

Add `https://github.com/rockbaer2007/ugso-ha-mqtt-addons` to the HA app store and
install **MQTT-Client** (amd64/aarch64). Open **Open Web UI** to configure the
external broker IP/hostname, port, username and password. Port `1883` is the
default for ioBroker's MQTT adapter. The web UI shows red **No connection** and
green **Connected**. It also lists available Home Assistant entities on the left
and selected transmissions on the right. Click an entity to choose state and
attributes in a dialog.

Broker settings and selected states/attributes from the web UI are applied
immediately. No manual HA token is needed: access uses the Supervisor token and
HA Core API proxy.

States are polled every five seconds by default (`poll_interval`: 1–300 seconds).
Changes are published as plain state strings to `<topic_prefix>/<entity_id>/state`
and selected attributes to `<topic_prefix>/<entity_id>/attribute/<attribute>`
with QoS 1 and Retain. After MQTT reconnection, all selected values are resent.
The default prefix is `ha_external`. Only selected states and attributes are
exported, with no MQTT Discovery. Short transitions between polls may be missed.
Missing entities produce `unavailable`; `unknown`/`unavailable` are passed through.

Optional `command_entities` must be a subset of `entities`. Only `switch`, `light`,
`input_boolean` and `fan` support commands in this version. Publish `ON` or `OFF`
without Retain to `<topic_prefix>/<entity_id>/set`. The default empty command list
disables commands. Retained messages received on subscription, invalid payloads
and stale queued commands are discarded. Arbitrary HA service calls are unsupported.

`<topic_prefix>/availability` is `online` after a successful HA synchronization and
`offline` on failure, shutdown or MQTT Last Will. Failure detection is subject to
API timeout and MQTT keepalive. Reconnection is automatic. Use a unique client ID
and prefix for each instance. Retained states from removed entities or old topic
prefixes must be cleared on the broker manually.

TLS verifies certificates using system trust; adjust the broker port accordingly
(often 8883). Custom CA files and client certificates are not configurable yet.
The app does not edit HA configuration files or export authentication credentials.

See the [German README](README.md) for a complete sample configuration and tests.
