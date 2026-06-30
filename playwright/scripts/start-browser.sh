#!/bin/bash
# Start Chromium with CDP (Chrome DevTools Protocol) enabled
#
# The browser runs in the background and can be controlled via Playwright's
# connectOverCDP(). Each project gets its own port stored in .playwright-port.
#
# Usage:
#   ./start-browser.sh           # Start with GUI
#   ./start-browser.sh --headless  # Start in headless mode

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT_FILE="$PWD/.playwright-port"

# Parse arguments
HEADLESS=""
for arg in "$@"; do
    case $arg in
        --headless)
            HEADLESS="yes"
            shift
            ;;
    esac
done

# Returns 0 if something is already listening on $1.
port_in_use() {
    curl -s --max-time 1 "http://localhost:$1/json/version" >/dev/null 2>&1 \
        && return 0
    if command -v ss >/dev/null 2>&1; then
        ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]$1$" && return 0
    fi
    return 1
}

# Generate or read port for this project. Each cwd gets its own .playwright-port.
# Cross-cwd port collisions (two projects rolling the same random port) are
# detected and avoided by re-rolling.
if [ -n "$PW_PORT" ]; then
    # Explicit port provided — trust the caller.
    :
elif [ -f "$PORT_FILE" ]; then
    PW_PORT=$(cat "$PORT_FILE")
else
    # Roll a random port in 9300-9999 (avoids common 9222) until we find one
    # that is not already bound. Bail after 50 attempts so we never spin
    # forever.
    for _attempt in $(seq 1 50); do
        candidate=$((9300 + RANDOM % 700))
        if ! port_in_use "$candidate"; then
            PW_PORT="$candidate"
            break
        fi
    done
    if [ -z "$PW_PORT" ]; then
        echo "Error: Could not find a free port in 9300-9999 after 50 attempts." >&2
        exit 1
    fi
    echo "$PW_PORT" > "$PORT_FILE"
    echo "Generated new port $PW_PORT (saved to .playwright-port)"
fi

# Profile is keyed on the cwd, NOT the port. This guarantees:
#   1. The same project always reuses its profile (cookies/session persist
#      across restarts even if the random port changes).
#   2. Two different cwds that happen to roll the same port still get
#      distinct user-data-dirs — no Chromium SingletonLock collision.
CWD_HASH=$(printf '%s' "$PWD" | sha1sum | cut -c1-12)
PID_FILE="/tmp/pw-browser-$PW_PORT.pid"
USER_DATA_DIR="/tmp/pw-profile-$CWD_HASH"

# Find chromium binary. Prefer Playwright's cached Chrome for Testing so we
# never hijack the user's main Chrome, even if something put a rogue
# google-chrome shim on PATH. Order: $CHROMIUM_BIN, Playwright cache, PATH,
# /Applications/Google Chrome.app as a last resort.
if [ -z "$CHROMIUM_BIN" ]; then
    PW_CACHE="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/Library/Caches/ms-playwright}"
    for dir in "$PW_CACHE"/chromium-*/chrome-mac-arm64/Google\ Chrome\ for\ Testing.app/Contents/MacOS/Google\ Chrome\ for\ Testing \
               "$PW_CACHE"/chromium-*/chrome-mac/Google\ Chrome\ for\ Testing.app/Contents/MacOS/Google\ Chrome\ for\ Testing \
               "$PW_CACHE"/chromium-*/chrome-mac/Chromium.app/Contents/MacOS/Chromium \
               "$PW_CACHE"/chromium-*/chrome-linux/chrome; do
        if [ -x "$dir" ]; then
            CHROMIUM_BIN="$dir"
            break
        fi
    done
fi

if [ -z "$CHROMIUM_BIN" ]; then
    CHROMIUM_BIN=$(which chromium 2>/dev/null || which chromium-browser 2>/dev/null || which google-chrome 2>/dev/null || true)
fi

if [ -z "$CHROMIUM_BIN" ] && [ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]; then
    CHROMIUM_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
fi

if [ -z "$CHROMIUM_BIN" ]; then
    echo "Error: Could not find a Chromium binary."
    echo "  Tried: \$CHROMIUM_BIN, Playwright cache, PATH (chromium/chromium-browser/google-chrome), /Applications/Google Chrome.app"
    echo "  Fix: run 'npx playwright install chromium' or set CHROMIUM_BIN=/path/to/chrome"
    exit 1
fi

# Check if our own browser is already running on this port.
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo "Browser already running on port $PW_PORT (PID: $OLD_PID)"
        exit 0
    else
        rm -f "$PID_FILE"
    fi
fi

# Defend against another process squatting on our port (e.g. a sibling
# worktree's browser whose .playwright-port we don't control). Refuse to
# launch — the user must either delete .playwright-port to roll a new port,
# or stop the other process.
if port_in_use "$PW_PORT"; then
    echo "Error: Port $PW_PORT is already in use by another process," >&2
    echo "  but no PID file at $PID_FILE indicates we own it." >&2
    echo "  Likely cause: another cwd / worktree rolled the same port." >&2
    echo "  Fix: delete $PORT_FILE and re-run start-browser.sh to roll a new port." >&2
    exit 1
fi

if [ -n "$HEADLESS" ]; then
    echo "Starting Chromium with CDP (headless)..."
else
    echo "Starting Chromium with CDP..."
fi
echo "  Port: $PW_PORT"
echo "  Profile: $USER_DATA_DIR"
echo "  Binary: $CHROMIUM_BIN"

# Build chrome flags
CHROME_FLAGS=(
    --remote-debugging-port="$PW_PORT"
    --user-data-dir="$USER_DATA_DIR"
    --no-first-run
    --no-default-browser-check
)

if [ -n "$HEADLESS" ]; then
    CHROME_FLAGS+=(--headless=new --disable-gpu)
fi

# Launch Chromium with CDP enabled
"$CHROMIUM_BIN" "${CHROME_FLAGS[@]}" &>/dev/null &

BROWSER_PID=$!
echo "$BROWSER_PID" > "$PID_FILE"

# Wait for CDP endpoint to be ready
echo -n "Waiting for CDP endpoint..."
for i in {1..30}; do
    if curl -s "http://localhost:$PW_PORT/json/version" &>/dev/null; then
        echo " ready!"
        echo ""
        if [ -n "$HEADLESS" ]; then
            echo "Chromium started with CDP enabled (headless)!"
        else
            echo "Chromium started with CDP enabled!"
        fi
        echo "  PID: $BROWSER_PID"
        echo "  CDP: http://localhost:$PW_PORT"
        echo ""
        echo "Run commands with:"
        echo "  $SCRIPT_DIR/pw.sh navigate https://example.com"
        echo "  $SCRIPT_DIR/pw.sh snapshot"
        echo ""
        echo "Stop with:"
        echo "  $SCRIPT_DIR/stop-browser.sh"
        exit 0
    fi
    echo -n "."
    sleep 0.5
done

echo " timeout!"
echo "Error: CDP endpoint not responding at http://localhost:$PW_PORT/json/version"
kill "$BROWSER_PID" 2>/dev/null || true
rm -f "$PID_FILE"
exit 1
