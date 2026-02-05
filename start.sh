#!/bin/sh

# Get the actual port nginx is listening on from config
NGINX_PORT=$(grep -m1 'listen' /etc/nginx/conf.d/default.conf | grep -oE '[0-9]+' | head -1)
NGINX_PORT=${NGINX_PORT:-80}

escape_json() {
    # Escape backslashes and double quotes for embedding into JSON
    # shellcheck disable=SC2001
    printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\r//g'
}

INDEX_HTML="/usr/share/nginx/html/index.html"
if [ -f "$INDEX_HTML" ]; then
    DEBUG_BOOL=false
    if [ "$DEBUG_MODE" = "true" ]; then
        DEBUG_BOOL=true
    fi

    PT_URL_ESC=$(escape_json "${PLAYTEST_URL:-}")
    PT_TOKEN_ESC=$(escape_json "${PLAYTEST_TOKEN:-}")

    CONFIG_LINE="<script>window.__MANTA_CONFIG__={\"debug\":${DEBUG_BOOL},\"playtest\":{\"url\":\"${PT_URL_ESC}\",\"token\":\"${PT_TOKEN_ESC}\"}};</script>"

    TMP_FILE=$(mktemp)
    awk -v cfg="$CONFIG_LINE" '
        BEGIN { inBlock=0 }
        /<!-- MANTA_CONFIG_START -->/ { print; print "    " cfg; inBlock=1; next }
        /<!-- MANTA_CONFIG_END -->/ { inBlock=0; print; next }
        inBlock==0 { print }
    ' "$INDEX_HTML" > "$TMP_FILE" && mv "$TMP_FILE" "$INDEX_HTML"

    if [ "$DEBUG_BOOL" = "true" ]; then
        echo "  Debug mode: ENABLED (DEBUG_MODE=true)"
    else
        echo "  Debug mode: disabled"
    fi
else
    echo "  Warning: index.html not found at $INDEX_HTML (skipping config injection)"
fi

echo "========================================"
echo "  MANTA SPHERE"
echo "========================================"
echo "  Server running on port $NGINX_PORT"
echo "  Access at: http://localhost:$NGINX_PORT"
echo "========================================"

exec nginx -g 'daemon off;'
