---
name: friction
description: "Tracks friction points (stuck moments, ambiguity, confusion, repeated
  errors) during AI-assisted tasks in a temporary friction.md file. Supports both
  AI self-detection and manual logging. At task completion, presents friction items
  for selective fixing via sub-agents. Use when user says \"track friction\", \"enable
  friction\", \"log friction\", \"start friction tracking\", \"friction: ...\", or
  \"note friction\"."
---

# Friction Tracking

Track friction points during AI-assisted tasks — moments of confusion, ambiguity, repeated errors, or being stuck — in a temporary `friction.md` file. At task completion, present items for selective fixing via sub-agents, then delete the file.

## Step 1 — Activate

When the user triggers friction tracking:

1. Check if a `temp/` directory exists at the project root.
   - If yes: create the file at `temp/friction.md`
   - If no: create the file at `{project root}/friction.md`
2. If `friction.md` already exists from a prior session, ask the user whether to **append** or **start fresh**.
3. Copy the template from `references/friction-template.md`, replacing `{task description}` with a brief summary of the current task and `{YYYY-MM-DD HH:MM}` with the current timestamp.
4. Confirm to the user: "Friction tracking active. Logging to `{path}`."

## Step 2 — Log Friction During Work

Friction is logged in two modes:

### AI Self-Detection

Automatically log a friction entry when any of these occur:
- Same approach tried 2+ times without success
- Need to ask the user for clarification due to ambiguous specs
- Expected files, APIs, or docs not found where anticipated
- Tool call fails with an unexpected error
- Unsure between multiple approaches with no clear signal

Do **not** log normal exploration, minor course corrections, or routine debugging.

### User Manual Logging

Triggered by phrases like "log friction", "note friction", or "friction: [description]". Confirm briefly ("Noted.") and continue working.

### Entry Format

Each entry follows this format:

```
- [HH:MM] <description> (`path/to/file` L42)
```

- Timestamp in 24-hour format
- Description in active voice, max ~100 characters
- File reference with line number is optional — include only when relevant

## Step 3 — Continue Primary Task

Never derail the workflow for friction logging.
- **Self-detected friction**: log silently, do not ask "should I log this?"
- **Manual friction**: confirm briefly ("Noted.") and immediately continue

The primary task always takes priority.

## Step 4 — Present at Completion

When the task is done (user confirms completion or a natural stopping point is reached):

1. Read `friction.md`
2. Present entries as a numbered list
3. Ask: **"Which would you like me to fix? (numbers, 'all', or 'none')"**

## Step 5 — Fix Selected Items

For each selected friction item, spawn sub-agents via the Agent tool with clean context.

- **3 or fewer items**: one agent per item, run in parallel
- **More than 3 items**: single agent handling all items sequentially

Each agent receives:
- The friction description
- The file reference (if any)
- Instruction to investigate the root cause and apply a fix

Agent prompt template:

```
Investigate and fix this friction point:

"{friction description}"

File reference: {path and line, or "none"}

Steps:
1. Read the relevant file(s) and understand the current state
2. Identify the root cause of the friction
3. Apply a fix — prioritize clarity and correctness
4. Verify the fix doesn't break surrounding code
```

## Step 6 — Clean Up

After fixes are applied (or the user selects "none"):

1. Delete `friction.md`
2. Do not generate a summary or report — the fixes speak for themselves

## Examples

### Example 1: AI Self-Detects During Refactoring

> **User**: "Track friction. Now refactor the auth module to use JWT."
>
> AI activates friction tracking, begins refactoring. Encounters unclear type definitions — logs: `- [14:22] Type definitions for UserSession are ambiguous, multiple conflicting interfaces (src/types.ts L31)`. Tests fail 3 times on token validation — logs: `- [14:35] Token validation test fails repeatedly, mock setup doesn't match runtime behavior (tests/auth.test.ts L88)`.
>
> Task completes. AI presents:
> 1. Type definitions for UserSession are ambiguous
> 2. Token validation test fails repeatedly
>
> User picks "1". Sub-agent investigates `src/types.ts`, consolidates the conflicting interfaces, verifies no breakage. File deleted.

### Example 2: User Manually Logs

> **User**: "friction: API docs don't match the actual response format for /users endpoint"
>
> AI responds "Noted." and continues working. At task completion, presents the entry. User selects it for fixing. Sub-agent checks the API response, updates the docs or the code to match.

### Example 3: No Fixes Needed

> Task ends with 2 friction entries. User says "none". AI deletes `friction.md` immediately. No further output.

## Troubleshooting

- **friction.md not found mid-task**: Re-check both `temp/` and project root. If missing, recreate from template and continue.
- **Sub-agent can't reproduce the issue**: Mark as resolved, move on. Don't block on phantom friction.
- **User wants to see the log mid-task**: Read and display `friction.md` contents without ending the task or triggering the fix flow.
