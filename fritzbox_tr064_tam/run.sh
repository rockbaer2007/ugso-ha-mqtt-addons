#!/usr/bin/with-contenv bashio
set -euo pipefail

if bashio::services.available "mqtt"; then
    bashio::log.info "MQTT service found, fetching internal broker credentials"
    export MQTT_HOST
    export MQTT_PORT
    export MQTT_USERNAME
    export MQTT_PASSWORD
    MQTT_HOST="$(bashio::services mqtt "host")"
    MQTT_PORT="$(bashio::services mqtt "port")"
    MQTT_USERNAME="$(bashio::services mqtt "username")"
    MQTT_PASSWORD="$(bashio::services mqtt "password")"
else
    bashio::log.warning "No internal MQTT service found, using configured/default MQTT values"
fi

exec python /app/main.py
