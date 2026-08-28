#!/usr/bin/with-contenv sh
set -eu

if [ -f /data/options.json ]; then
  export OPTIONS_FILE=/data/options.json
fi

python3 /app/main.py
