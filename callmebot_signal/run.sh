#!/usr/bin/with-contenv bashio
set -euo pipefail
export CALLMEBOT_INGRESS=1
export CALLMEBOT_DATA=/data
export CALLMEBOT_PORT=8099
if bashio::services.available mqtt; then
    export MQTT_HOST MQTT_PORT MQTT_USERNAME MQTT_PASSWORD
    MQTT_HOST="$(bashio::services mqtt host)"
    MQTT_PORT="$(bashio::services mqtt port)"
    MQTT_USERNAME="$(bashio::services mqtt username)"
    MQTT_PASSWORD="$(bashio::services mqtt password)"
fi
exec python3 /app/server.py
