---
name: playwright
description: Drive a real browser with Playwright from any project via a shell CLI. Use for UI verification and browser evidence — navigate pages, capture desktop/mobile screenshots, inspect the DOM, fill forms, and confirm a UI change renders and behaves correctly.
---

# Playwright Skill (Browser Automation + UI Verification)

Use this skill for browser-based verification and UI evidence capture in any project. It wraps Playwright in a small shell CLI so you can navigate, snapshot, screenshot, and interact with a running app without writing test code.

## When to Use

Reach for Playwright/browser verification when any of these are true:
- UI layout, styling, copy, rendering, or interaction changed.
- A screen/route/component is added or modified.
- A bug fix claims visible user-facing behavior changed.
- A task asks for visual confirmation, screenshots, or browser proof.

## Verification Discipline

Prefer not to call UI work done on the strength of code inspection alone. Capture browser evidence first — or, if you're blocked, report the exact commands/errors and whatever fallback evidence you have.

## Quick Start

```bash
# 1. Make sure your app's dev server is running (note its URL/port)
# 2. Start browser (port auto-saved to .playwright-port)
./.claude/skills/playwright/scripts/start-browser.sh
# Or run headless (no visible window — good for CI / background agents):
./.claude/skills/playwright/scripts/start-browser.sh --headless

# 3. Open the page you want to verify
./.claude/skills/playwright/scripts/pw.sh navigate http://localhost:3000/

# 4. Capture evidence at the viewports you care about
./.claude/skills/playwright/scripts/pw.sh snapshot
./.claude/skills/playwright/scripts/pw.sh resize 1440 900
./.claude/skills/playwright/scripts/pw.sh screenshot tmp/playwright/desktop.png
./.claude/skills/playwright/scripts/pw.sh resize 390 844
./.claude/skills/playwright/scripts/pw.sh screenshot tmp/playwright/mobile.png

# 5. Stop when done
./.claude/skills/playwright/scripts/stop-browser.sh
```

## Evidence to Report

When you verify a UI task, a useful final response includes:
- Playwright status (`verified` or `blocked`)
- URL verified
- Viewport sizes used (e.g. desktop + mobile)
- Screenshot paths
- Observed validation statement (what was confirmed)

If blocked, also include:
- Block reason
- Exact commands attempted
- Exact error text
- Fallback evidence
- Next unblock action

## Verification Checklist

- [ ] Verified in browser (not code inspection only)
- [ ] Captured evidence at the viewports that matter (e.g. desktop and mobile)
- [ ] Recorded URL, viewports, screenshot paths
- [ ] Reported observed validation outcome

## Headless Mode

Pass `--headless` to `start-browser.sh` to launch Chromium without a visible window (uses `--headless=new --disable-gpu` under the hood). All `pw.sh` commands work identically — same CDP port, same snapshots, same screenshots.

```bash
./.claude/skills/playwright/scripts/start-browser.sh --headless
```

Use headless when:
- Running in an environment without a display (CI, remote shells, background agents).
- You only need evidence capture (screenshots/snapshots), not interactive debugging.

Use headed (default) when you want to watch the browser drive the page.

## Port Management

Each project gets its own unique port stored in `.playwright-port`:

- **First run**: `start-browser.sh` generates a random port (9300-9999) and saves it. The candidate port is verified free before use; on collision, it re-rolls (up to 50 attempts).
- **Subsequent runs**: All scripts read the port from `.playwright-port`
- **Multiple projects**: Each project directory has its own `.playwright-port` file
- **Override**: Set `PW_PORT=XXXX` environment variable to use a specific port
- **Profile directory** is keyed on `sha1(cwd)`, not the port — so the same project always restores its session even if the random port changes, and two cwds that ever land on the same port still get isolated Chromium profiles.

**Never hardcode port 9222.** Always let the scripts manage ports via `.playwright-port`.

### Multiple worktrees / parallel agents (REQUIRED reading)

When the repo uses git worktrees (e.g. `dt-wt/wt-1`, `dt-wt/wt-2`) or
multiple subagents drive Playwright in parallel, the disambiguator is **cwd**.
There is no session naming, no MCP, no shared bus — one cwd = one browser.

Hard rules:

1. **Always `cd <project-or-worktree-dir>` before invoking any `pw.sh` /
   `start-browser.sh` / `stop-browser.sh` command.** The scripts read
   `.playwright-port` from `$PWD`. A subagent that forgets to `cd` will land
   on whoever's `.playwright-port` is in the conductor's cwd.
2. **Do not hand-roll your own `playwright.chromium.launch(...)`.** It
   bypasses port-collision protection and the cwd-keyed profile, which is
   how the worktree acceptance run hit "Playwright conflicting across
   worktrees." Use the skill scripts.
3. **`pw.sh` will not auto-adopt another cwd's browser.** If the cwd's
   `.playwright-port` does not point at a live CDP server, `pw.sh` fails and
   lists any other live browsers as diagnostic info only. Never copy a port
   from another cwd's `.playwright-port` into yours — start your own.
4. **Prove which browser you used with `pw.sh whoami`.** In any test/report
   that involves multiple browsers, save its JSON output as evidence so a
   reader can verify cwd → port → PID → profile → current URL all line up.

Per-worktree state (each cwd holds exactly one of each):

| Resource | Path | Keyed on |
|---|---|---|
| Port file | `<cwd>/.playwright-port` | cwd |
| PID file | `/tmp/pw-browser-<port>.pid` | port |
| Chromium profile | `/tmp/pw-profile-<sha1(cwd)[:12]>` | cwd |
| CDP endpoint | `http://localhost:<port>` | port |

## Shell CLI Commands

### Navigation

| Command          | Description              |
|------------------|--------------------------|
| `navigate <url>` | Go to URL                |
| `back`           | Go back to previous page |
| `close`          | Close current page       |

### Page State

| Command                        | Description                                                   |
|--------------------------------|---------------------------------------------------------------|
| `snapshot`                     | Get page accessibility tree with element refs                 |
| `snapshot -g <pattern>`        | Search snapshot for pattern (reduces context for large pages) |
| `snapshot -g <pattern> -C <N>` | Search with N lines of context above/below (default: 3)       |
| `screenshot [file]`            | Take screenshot (auto-resized to max 2000px)                  |
| `console [ms]`                 | Get console messages                                          |
| `network [--static]`           | List network requests                                         |
| `whoami`                       | JSON: cwd, port file, PW_PORT, browser PID, profile dir, current URL/title. Use as multi-worktree / parallel-agent proof. |

### Interaction

| Command                    | Description                                                   |
|----------------------------|---------------------------------------------------------------|
| `click <ref>`              | Click element by ref                                          |
| `hover <ref>`              | Hover over element by ref                                     |
| `type <ref> <text>`        | Type text into element                                        |
| `fill <json>`              | Fill multiple form fields: `[{"ref":"e1","value":"..."},...]` |
| `press <key>`              | Press keyboard key (Enter, Escape, Tab, ArrowUp, etc.)        |
| `select <ref> <values...>` | Select dropdown option(s)                                     |
| `drag <startRef> <endRef>` | Drag from one element to another                              |

### Coordinate-Based (Vision)

| Command                       | Description                                     |
|-------------------------------|-------------------------------------------------|
| `click-xy <x> <y>`            | Click at coordinates                            |
| `move-xy <x> <y>`             | Move mouse to coordinates                       |
| `drag-xy <x1> <y1> <x2> <y2>` | Drag between coordinates                        |
| `scroll <dir> [amount]`       | Scroll page (up/down/left/right, default 300px) |

### Execution

| Command      | Description                                             |
|--------------|---------------------------------------------------------|
| `eval <js>`  | Evaluate JavaScript in page context                     |
| `run <code>` | Run Playwright code: `await page.click('x'); return 1;` |

### Utilities

| Command                      | Description                   |
|------------------------------|-------------------------------|
| `wait <seconds>`             | Wait for specified time       |
| `wait text <text>`           | Wait for text to appear       |
| `wait gone <text>`           | Wait for text to disappear    |
| `resize <width> <height>`    | Resize viewport               |
| `dialog accept [text]`       | Accept next dialog            |
| `dialog dismiss`             | Dismiss next dialog           |
| `upload <paths...>`          | Upload files via file chooser |
| `tabs list/new/close/select` | Tab management                |

## Element Refs

Run `snapshot` to get interactive elements with refs:

```
e1: [RootWebArea] "Example Domain"
e2: [heading] "Example Domain"
e3: [link] "More information..."
```

Then use the ref: `./.claude/skills/playwright/scripts/pw.sh click e3`

For large pages, use greppable snapshots to reduce context:

```bash
./.claude/skills/playwright/scripts/pw.sh snapshot -g "login"        # Find login-related elements
./.claude/skills/playwright/scripts/pw.sh snapshot -g "button" -C 5  # 5 lines of context
```

## Common Workflows

### Login and Verify Dashboard

```bash
./.claude/skills/playwright/scripts/start-browser.sh
./.claude/skills/playwright/scripts/pw.sh navigate http://localhost:3059/login
./.claude/skills/playwright/scripts/pw.sh snapshot
./.claude/skills/playwright/scripts/pw.sh type e5 "user@example.com"
./.claude/skills/playwright/scripts/pw.sh type e7 "password"
./.claude/skills/playwright/scripts/pw.sh click e9
./.claude/skills/playwright/scripts/pw.sh wait text "Dashboard"
./.claude/skills/playwright/scripts/pw.sh screenshot /tmp/dashboard.png
./.claude/skills/playwright/scripts/stop-browser.sh
```

### Fill a Form

```bash
./.claude/skills/playwright/scripts/pw.sh fill '[{"ref":"e1","value":"username"},{"ref":"e2","value":"password"}]'
./.claude/skills/playwright/scripts/pw.sh click e3
```

### Test Responsive Layout

```bash
./.claude/skills/playwright/scripts/pw.sh resize 375 667   # Mobile
./.claude/skills/playwright/scripts/pw.sh screenshot /tmp/mobile.png
./.claude/skills/playwright/scripts/pw.sh resize 1440 900  # Desktop
./.claude/skills/playwright/scripts/pw.sh screenshot /tmp/desktop.png
```

## Additional Resources

For detailed command parameter documentation:

- [Navigation](references/navigation.md) - `navigate`, `back`
- [Page State](references/page-state.md) - `snapshot`, `screenshot`, `console`, `network`
- [Interaction](references/interaction.md) - `click`, `type`, `hover`, `drag`, `press`, `select`, `fill`
- [Execution](references/execution.md) - `eval`, `run`
- [Utilities](references/utilities.md) - `wait`, `resize`, `close`, `dialog`, `upload`
- [Coordinate-Based](references/coordinates.md) - `click-xy`, `move-xy`, `drag-xy`, `scroll`
- [Extras](references/tabs-install-pdf-tracing.md) - `tabs`, `pdf`

## Scripts

The shell scripts are in the `scripts/` subdirectory of this skill:

| File                       | Description                      |
|----------------------------|----------------------------------|
| `./.claude/skills/playwright/scripts/start-browser.sh` | Start Chromium with CDP enabled  |
| `./.claude/skills/playwright/scripts/pw.sh`            | Run commands against the browser |
| `./.claude/skills/playwright/scripts/stop-browser.sh`  | Stop the browser                 |
| `scripts/pw-client.mjs`    | Node.js Playwright CDP client    |

## Dependencies

Requires `playwright` and `sharp` (for screenshot resizing):

```json
{
  "dependencies": {
    "playwright": "^1.40.0",
    "sharp": "^0.33.0"
  }
}
```

## Examples

### Example 1: Verify a Page Loads Correctly

User says: "Check that the login page renders properly"

Actions:

1. Start browser with `./.claude/skills/playwright/scripts/start-browser.sh`
2. Navigate to the login URL: `./.claude/skills/playwright/scripts/pw.sh navigate http://localhost:3059/login`
3. Take a snapshot: `./.claude/skills/playwright/scripts/pw.sh snapshot`
4. Verify expected elements (username, password fields, submit button) appear in the snapshot
5. Take a screenshot for visual confirmation: `./.claude/skills/playwright/scripts/pw.sh screenshot /tmp/login.png`

Result: Confirmation that the login page renders with the expected form elements, plus a screenshot.

### Example 2: Fill and Submit a Form

User says: "Test submitting the sign-up form"

Actions:

1. Navigate to the form page
2. Use `./.claude/skills/playwright/scripts/pw.sh snapshot` to identify form element refs
3. Fill fields: `./.claude/skills/playwright/scripts/pw.sh fill '[{"ref":"e5","value":"Jane Doe"},{"ref":"e7","value":"jane@example.com"}]'`
4. Click submit: `./.claude/skills/playwright/scripts/pw.sh click e9`
5. Wait for success: `./.claude/skills/playwright/scripts/pw.sh wait text "Thanks for signing up"`

Result: Form submitted successfully, confirmation message visible.

### Example 3: Debug a UI Issue with Greppable Snapshot

User says: "The save button seems to be missing from the settings page"

Actions:

1. Navigate to settings: `./.claude/skills/playwright/scripts/pw.sh navigate http://localhost:3059/settings`
2. Search for the button: `./.claude/skills/playwright/scripts/pw.sh snapshot -g "save" -C 5`
3. If not found, take a full snapshot and screenshot to inspect the page state
4. Report findings with element tree context

Result: Identified whether the save button is missing from the DOM or present but hidden.

## Troubleshooting

### Error: Browser not starting

Cause: Another Chromium instance may already be using the CDP port, or Playwright is not installed.
Solution:

1. Check for existing processes: `ps aux | grep -E 'playwright|chromium' | grep -v grep`
2. Kill stale processes if found: `kill <pid>`
3. Verify Playwright is installed: `npx playwright --version`
4. Retry: `./.claude/skills/playwright/scripts/start-browser.sh`

### Error: Connection refused on pw.sh commands

Cause: The browser is not running or the port in `.playwright-port` is stale.
Solution:

1. Check if browser is running: `ps aux | grep chromium | grep -v grep`
2. If not running, start it: `./.claude/skills/playwright/scripts/start-browser.sh`
3. If running but still failing, delete `.playwright-port` and restart the browser

### Error: Element ref not found (e.g., "e5 not found")

Cause: The page changed since the last snapshot, so element refs are stale.
Solution: Run `./.claude/skills/playwright/scripts/pw.sh snapshot` again to get fresh element refs, then retry the command with the updated ref.

### Error: Screenshot is blank or incomplete

Cause: The page hasn't finished loading or rendering.
Solution: Wait for content before capturing: `./.claude/skills/playwright/scripts/pw.sh wait text "expected content"` then take the screenshot.
