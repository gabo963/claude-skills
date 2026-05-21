---
name: backlog-coordinator
description: Coordinates backlog implementation using Agent Teams with parallelization. Use when asked to "coordinate", "work the backlog", or "implement specs".
---

# Backlog Coordinator

Autonomously coordinate backlog implementation using Agent Teams. Picks specs, slices them into small parallel tasks, spawns workers and verifiers, manages branches, and updates TRACKER.md.

# Instructions

## Quick Start

**Triggers**: "coordinate", "work the backlog", "implement specs", "resume coordinating"
**Entry**: Check for resume state → start dev env → create team → pick specs → slice → dispatch workers.

## Role

You are the **coordinator / team lead**. You orchestrate work by spawning agents for every phase. Your context must stay lean so you can survive an entire backlog session.

**Constraints** — do not:

- Write code — delegate to worker agents
- Read source files — delegate to Explore agents
- Read spec files directly — delegate to Picker/Slicer agents
- Run build/REPL/eval commands directly (except dev env startup/restart)
- Skip verification or state file updates
- Reuse teammates across specs or slices
- Leave branches when done

## Session Start Checklist

1. Check for `docs/ai/coordination-state.md` — if exists, resume from recorded phase
2. Read `docs/ai/specs/TRACKER.md`
3. **Start dev environment** per project conventions (e.g. STARTUP.md / README — Docker, dev server, DB, REPL as applicable)
4. Create team: `TeamCreate(team_name: "backlog")`
5. Report to user: environment running, team created, listing ready specs

## Spec Readiness Check

Before starting any spec, verify:

- No `TBD`, `TODO`, `???`, or `(unresolved)` in Requirements or Approach
- All `Depends on` dependencies are Done in TRACKER.md
- Has Approach section with specific files to create/modify
- Has Verification section with testable items

If not ready → skip, log reason in coordination state, move to next.

## State Management

Write `docs/ai/coordination-state.md` at every phase transition. Required fields:

- **Current Spec Name**: the spec being worked on
- **Phase**: one of `picking`, `slicing`, `workers-active`, `workers-done`, `compiling`, `verifying`, `verified`, `merging`
- **Branch**: `spec/{spec-name}`
- **Active Workers**: list of `{slice-name}: {worker-name}`
- **Parallel Batch**: list of spec names if running specs in parallel
- **Verifier**: teammate name or `n/a`
- **Attempt**: `1`, `2`, or `3`
- **Issues**: any blockers or problems
- **Completed This Session**: list of `{spec-name} (merged to default branch, commit {short-hash})`

## Coordination Loop

### Phase 1 — Pick Spec & Branch

- Read TRACKER.md → highest-priority ready spec
- Readiness check (see above)
- `git checkout -b spec/{spec-name}`
- Write coordination state
- Update spec file: Status = `active`, Owner = `backlog-coordinator`
- Update TRACKER.md: move row to Active section

**Cross-spec parallelization**: If the picker identifies multiple ready specs with **zero file overlap at the individual file level**, they may run in parallel on separate branches (max 3 concurrent workers total). Two specs in the same module are always serial unless file-level analysis proves they touch completely different files.

### Phase 2 — Slice the Spec

Spawn a **Slicer agent** to break the spec into fine-grained slices. See `references/slicer-prompt.md`.

The slicer reads the spec's Approach + Affected Modules, examines existing files, and produces a **slice plan**:

- Each slice covers **1-3 files** to create or modify
- Each slice has a specific description of what to do in each file
- Each slice lists **only the skills needed** for that slice
- Each slice lists **only the reference files** needed
- Slices are marked as **independent** (disjoint files, no ordering dependency) or **dependent** (must run after a predecessor)

This is the key mechanism that prevents workers from running out of context. By scoping each worker to 1-3 files with minimal skill loading, the worker has plenty of context for actual implementation.

Write coordination state (phase = slicing).

### Phase 3 — Spawn Workers

Using the slice plan from Phase 2:

- **Independent slices**: spawn workers in parallel — multiple `Agent()` calls in a single message
- **Dependent slices**: spawn sequentially after predecessor completes
- Each worker gets its own slice prompt (see `references/worker-prompt.md`)
- Max 3 concurrent workers across all specs and slices

```
TaskCreate(subject: "Implement {spec-name} slice {N}")

Agent tool:
  subagent_type: general-purpose
  team_name: "backlog"
  name: "worker-{spec-name}-s{N}"
  mode: bypassPermissions
  prompt: (Worker Prompt — see references/worker-prompt.md)

TaskUpdate(taskId: "...", owner: "worker-{spec-name}-s{N}", status: "in_progress")
```

Write coordination state (phase = workers-active).

### Phase 4 — Monitor Workers

Watch for (per-worker independently):

- **Progress reports**: Worker should message every 3-5 turns
- **Completion**: Move that slice to done, check if more slices to spawn
- **Idle notifications**: Check if it sent a progress/completion message
- **Silence** (3+ idle notifications, no substantive message):
  1. Message: "What is your current status? What files have you changed?"
  2. If no useful response after 2 nudges → shutdown_request
  3. Check `docs/ai/worker-checkpoint.md` + `git status`
  4. Spawn replacement worker with checkpoint context

Workers complete at different times. As each completes, immediately spawn dependent slices or proceed to Phase 5.

When all slices report completion → Phase 5.

### Phase 5 — Assess Worker Output

- All verification items from all slices addressed?
- Checkpoint files show all slices done?
- `git diff spec/{spec-name}` shows expected changes?

If complete → Phase 5b. Shutdown all workers. Write coordination state (phase = workers-done).

### Phase 5b — Compilation Check

Before verification, confirm the project compiles/typechecks cleanly. Spawn a **Compilation Check agent** (general-purpose, bypassPermissions) that:

1. **Auto-discovers** the project's build/typecheck commands by inspecting available manifests and docs:
   - `package.json` scripts (`build`, `typecheck`, `lint`)
   - `tsconfig.json` (`tsc --noEmit`)
   - `deps.edn` / `project.clj` aliases
   - `Makefile` targets
   - `Cargo.toml` (`cargo check`)
   - `pyproject.toml` / `setup.py` (mypy, ruff)
   - `go.mod` (`go build ./...`, `go vet ./...`)
   - Style/asset pipelines (sass, postcss, tailwind) if present
   - Any commands documented in `CLAUDE.md`, `README.md`, or `STARTUP.md`
2. **Runs each discovered command** and captures warnings/errors per layer.
3. **Reports** PASS (all clean) or FAIL (lists issues per layer, with the command that produced them).

- All PASS → Phase 6
- Any FAIL → spawn a fix worker targeting the specific errors, then re-run the compilation check (max 2 fix cycles). If still failing after 2 cycles, ask user for guidance.

Write coordination state (phase = compiling).

### Phase 6 — Verify

Spawn verifiers in parallel:

1. **Verifier-Code** (always — see `references/verifier-code-prompt.md`): code review against spec and conventions
2. **Verifier-Playwright** (mandatory if the spec changes any UI artifact — components, templates, routes, styles, assets; skip for backend-only specs — see `references/verifier-playwright-prompt.md`): browser testing of verification items

Coordinator combines verdicts:

- Both PASS → Phase 8
- Either NEEDS FIXES → Phase 7
- Either FAIL → log reason, ask user for guidance

**Playwright serialization**: Only one Verifier-Playwright agent can control the browser at a time. If multiple specs complete workers simultaneously, code reviews all run in parallel, but Playwright testing is queued.

Write coordination state (phase = verifying).

### Phase 7 — Handle Fixes

- Fewer than 3 issues: spawn a fix worker with specific instructions, then re-verify (max 2 fix cycles)
- 3+ issues or FAIL: log reason, ask user for guidance

Shutdown verifiers. Write coordination state (phase = verified).

### Phase 8 — Merge and Update

Spawn a **Merger agent** (see `references/merger-prompt.md`):

- Detect the default branch (`git symbolic-ref --short refs/remotes/origin/HEAD`, fallback `main`), then `git checkout $DEFAULT && git merge spec/{spec-name} --no-ff -m "Implement {spec-name}"`
- `git branch -d spec/{spec-name}`
- Update spec file: Status = `done`, Completed = today's date, add "What Was Built" summary
- Update TRACKER.md: move from Active to Done
- Commit: `"Update tracker: {spec-name} done"`

Coordinator receives one-line confirmation from merger.

**Merge serialization**: Only one merger at a time to avoid TRACKER.md conflicts.

- Clean up `docs/ai/worker-checkpoint.md`
- Write coordination state (add to Completed, clear current spec)
- Shutdown all remaining teammates for this spec
- Tell user what was completed → Loop to Phase 1

## Teammate Lifecycle & Context Limits

1. **Fresh teammate per slice** — never reuse across slices or specs
2. **Fresh teammate per role** — don't reuse a worker as a verifier
3. **Shutdown after use** — send shutdown_request when done
4. **Workers scoped to 1-3 files** — slicer ensures small scope
5. **Workers load minimal skills** — only what their slice needs
6. **Workers delegate exploration** — spawn Explore sub-agents, never read broadly
7. **Independent slices run in parallel** — slicer identifies which are safe
8. **Max 3 concurrent workers** — across all specs and slices
9. **Playwright testing serialized** — browser is a singleton
10. **Merges serialized** — TRACKER.md is a shared resource

Autocompaction does NOT reliably work for teammates. When a teammate fills its context window, it may error and stop.

**If a teammate errors out**: check checkpoint + git status, spawn replacement with checkpoint context. Do NOT try to resume — always spawn fresh. If teammates consistently die: the slicer made slices too large, re-slice into smaller pieces.

## Execution Mode

**Never stop until the backlog is empty.** After completing each spec, immediately pick the next ready spec and continue. Do not ask the user for permission to continue — just keep going. Only stop when:
- The backlog has zero ready specs (all remaining are blocked or need refinement)
- The dev environment is broken and cannot be recovered
- The user explicitly asks you to stop

## End of Session

When backlog is empty or you're stopping:

1. Ensure no orphan branches: `git branch` — delete any `spec/*` branches
2. Ensure all teammates are shut down
3. Clean up team: `TeamDelete`
4. Clean up runtime files: `docs/ai/worker-checkpoint.md`
5. Keep `docs/ai/coordination-state.md` (useful for next session)
6. Tell user: final summary of what was completed

## Examples

### Example 1: Small Spec (1-2 files)

User says: "work the backlog"

Actions:
1. Read TRACKER.md → `sc-deps-upgrade` is highest priority, ready
2. Create branch `spec/sc-deps-upgrade`
3. Spawn Slicer → produces 1 slice: "Update dependency manifest" (files: dependency manifest; skills: project's language skill)
4. Spawn 1 worker with that slice
5. Worker completes in ~8 turns
6. Spawn Verifier-Code (no UI changes, so Playwright is skipped) → PASS
7. Spawn Merger → merged to default branch, commit `abc1234`

Result: Spec done, TRACKER updated, branch cleaned up, loop to next spec.

### Example 2: Large Spec with Parallel Slices

Spec `student-forms` has 6 files across backend and frontend.

Actions:
1. Spawn Slicer → produces 3 slices:
   - Slice 1: backend schema + handlers (2 files, skills matching the backend stack)
   - Slice 2: UI component + styles (2 files, skills matching the frontend stack)
   - Slice 3: route/integration wiring (1 file, skills matching routing) — depends on Slice 2
2. Spawn Slice 1 + Slice 2 workers in parallel (independent, disjoint files)
3. Both complete → spawn Slice 3 worker (was blocked on Slice 2)
4. Slice 3 completes → verify (Verifier-Code + Verifier-Playwright, since this spec changes UI) → merge

Result: 3 small-scoped workers instead of 1 large worker. No context exhaustion.

### Example 3: Recovering from a Stuck Worker

1. Worker `worker-sso-config-s2` has sent 3 idle notifications with no progress
2. Coordinator nudges twice — no useful response
3. Coordinator shuts down stuck worker
4. Check checkpoint: slice 2 is partially done (1 of 2 files)
5. Spawn replacement `worker-sso-config-s2b` with checkpoint context
6. Replacement completes the remaining file

Result: Work continues without losing progress.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No specs pass readiness check | Report to user with list of issues per spec |
| Worker keeps dying mid-slice | Slice is still too large — re-slice into smaller pieces |
| Teammate silent (3+ idles, no progress) | Nudge twice → shutdown → check checkpoint + git status → spawn replacement |
| Verifier reports FAIL | Log reason, ask user for guidance before continuing |
| Dev environment won't start | Restart the dev server per project conventions (STARTUP.md / README). If containers are down, bring them up first. Verify via the project's health-check endpoint or process check. |
| REPL / dev process state corrupt | Stop and restart per project conventions. If the problem persists, restart from scratch and notify any active worker. |
| Session dies mid-spec | Branch `spec/{name}` has partial work → restart with `/backlog-coordinator` → reads coordination-state.md → resumes |
| Branch conflicts on merge | Should not happen with file-level overlap analysis; if it does, resolve manually |
| Compilation check fails repeatedly | Log specific errors, ask user for guidance — may be a pre-existing issue |
| No specs ready | Report: "No ready specs. Remaining need refinement: {list}" → wait for user |
| Playwright contention | Only one Verifier-Playwright at a time. Queue others. Prioritize higher-priority specs |
| Worker modifies out-of-scope file | Worker should STOP and message coordinator. Coordinator decides scope |
