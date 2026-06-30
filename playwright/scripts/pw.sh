#!/bin/bash
# Thin wrapper for Playwright CDP client
#
# Usage:
#   ./pw.sh navigate https://example.com
#   ./pw.sh snapshot
#   ./pw.sh click e5
#   ./pw.sh type e3 "hello world"
#
# Port is read from .playwright-port in current directory (created by start-browser.sh).
# No SSE transport, no HTTP server. Simple command interface.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT_FILE="$PWD/.playwright-port"

# Read port from .playwright-port or use PW_PORT env var
if [ -n "$PW_PORT" ]; then
    :
elif [ -f "$PORT_FILE" ]; then
    PW_PORT=$(cat "$PORT_FILE")
else
    echo "Error: No .playwright-port file found. Run start-browser.sh first."
    exit 1
fi

export PW_PORT

# Check if OUR browser is reachable via CDP. We deliberately do NOT auto-adopt
# another cwd's browser here: if .playwright-port for this cwd does not point
# at a live CDP server, fail. Auto-adoption silently routes commands to a
# sibling worktree's browser, which is exactly the cross-worktree confusion
# this skill must prevent. Other live CDP browsers are listed for human
# diagnosis only.
if ! curl -s --max-time 1 "http://localhost:$PW_PORT/json/version" &>/dev/null; then
    echo "Error: No browser running on port $PW_PORT (from $PORT_FILE)" >&2
    echo "  cwd: $PWD" >&2
    echo "  Start one for this cwd: $SCRIPT_DIR/start-browser.sh" >&2

    OTHERS=""
    for pid_file in /tmp/pw-browser-*.pid; do
        [ -f "$pid_file" ] || continue
        CHECK_PID=$(cat "$pid_file")
        CHECK_PORT=$(basename "$pid_file" | sed 's/pw-browser-\(.*\)\.pid/\1/')
        if [ "$CHECK_PORT" != "$PW_PORT" ] \
            && kill -0 "$CHECK_PID" 2>/dev/null \
            && curl -s --max-time 1 "http://localhost:$CHECK_PORT/json/version" &>/dev/null; then
            OTHERS="${OTHERS}    port $CHECK_PORT (PID $CHECK_PID)"$'\n'
        fi
    done
    if [ -n "$OTHERS" ]; then
        echo "" >&2
        echo "  Other live CDP browsers (NOT auto-adopted):" >&2
        printf '%s' "$OTHERS" >&2
        echo "  If one of those is yours, cd into that project's directory before running pw.sh." >&2
    fi
    exit 1
fi

# Pass all arguments to the Node.js CDP client
exec node "$SCRIPT_DIR/pw-client.mjs" "$@"
