#!/bin/bash
# Stop the Playwright browser

PORT_FILE="$PWD/.playwright-port"

# Read port from .playwright-port or use PW_PORT env var
if [ -n "$PW_PORT" ]; then
    :
elif [ -f "$PORT_FILE" ]; then
    PW_PORT=$(cat "$PORT_FILE")
else
    echo "Error: No .playwright-port file found and PW_PORT not set."
    exit 1
fi

PID_FILE="/tmp/pw-browser-$PW_PORT.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "No browser PID file found for port $PW_PORT"
    exit 0
fi

PID=$(cat "$PID_FILE")

if kill -0 "$PID" 2>/dev/null; then
    echo "Stopping browser on port $PW_PORT (PID: $PID)..."
    kill "$PID"
    rm -f "$PID_FILE"
    rm -f "$PORT_FILE"
    echo "Browser stopped"
else
    echo "Browser not running (stale PID file)"
    rm -f "$PID_FILE"
    rm -f "$PORT_FILE"
fi
