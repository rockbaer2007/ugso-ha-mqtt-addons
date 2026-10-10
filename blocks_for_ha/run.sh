#!/bin/sh
set -eu
python3 /app/server.py &
bridge_pid=$!
nginx -g 'daemon off;' &
web_pid=$!
trap 'kill "$bridge_pid" "$web_pid" 2>/dev/null || true; wait || true' EXIT
trap 'exit 0' TERM INT
while kill -0 "$bridge_pid" 2>/dev/null && kill -0 "$web_pid" 2>/dev/null; do
    sleep 1
done
exit 1
