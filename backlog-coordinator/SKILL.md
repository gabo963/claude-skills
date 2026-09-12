---
name: backlog-coordinator
description: Coordinates backlog implementation as a dynamic Workflow — the main session orchestrates, a scripted Workflow slices, implements, verifies and commits each spec on the current branch. Use when asked to "coordinate", "work the backlog", or "implement specs".
---

# Backlog Coordinator

The main session is the **orchestrator**: it decides which specs to work, starts the dev environment, keeps state, and launches Claude's Workflow tool with the script shipped in this skill. The Workflow does the heavy lifting (scope → slice → workers → compile check → verify → finalize), running file-segregated specs in parallel, and reports back. You read the result, update state, and loop.

Invoking this skill is the user's opt-in to run the Workflow tool. Do not ask again.

# Instructions

## Quick Start

**Triggers**: "coordinate", "work the backlog", "implement specs", "resume coordinating"
**Entry**: resume check → read TRACKER → confirm spec selection → start dev env → launch Workflow → handle results → loop.

## Role

You orchestrate. Your context must stay lean so you can survive an entire backlog session.

**Do not:**

- Write code, read source files, or read spec bodies — the Workflow agents do that
- Run build/test/REPL commands yourself (dev env startup/restart is the exception)
- Create, switch, merge, or delete branches — ever
- Push, unless the user explicitly asks
- Skip state-file updates

## Git Rules (fixed, no need for the user to repeat them)

- **Stay on the current branch.** Whatever `git branch --show-current` returns at session start is where all work lands. No `spec/*` branches, no merges.
- **Commit as you go.** The Workflow commits after every slice group, after every fix cycle, and once more when it marks the spec done and updates TRACKER.md. This is durable authorization to commit on the current branch; do not ask "master or branch?".
- A dirty working tree at start is fine: commits only add the files each slice touched. Mention pre-existing uncommitted changes to the user, never stash or reset them.

## Session Start Checklist

1. Check for `docs/ai/coordination-state.md` — if it exists, resume (see State Management)
2. Read `docs/ai/specs/TRACKER.md` (this is the one file you read yourself)
3. **Confirm spec selection** (see below)
4. **Start dev environment** per project conventions (STARTUP.md / README — Docker, dev server, DB, REPL as applicable). Note the dev URL if there is one.
5. Record `BRANCH=$(git branch --show-current)`
6. Report to user: branch, environment status, the ordered list of specs about to run

## Spec Selection

If the invocation already says what to work on (e.g. "work the P0 specs", "implement sso-config and student-forms", "work everything ready"), use that.

If it does not, **ask before launching anything** with AskUserQuestion, building the options from TRACKER.md:

- Only P0 specs (Recommended when P0 specs exist)
- P0 and P1 specs
- Everything not Done, in priority order
- A specific spec or list (user types it)

Selected specs are passed in TRACKER priority order. Specs whose `Depends on` entries are not Done are deferred, not dropped: after each Workflow run, re-read TRACKER.md and queue any selected spec whose dependencies are now Done.

The Workflow does the full readiness check per spec (no `TBD`/`TODO`/`???`/`(unresolved)` in Requirements or Approach, Approach names concrete files, Verification section present) and returns `skipped` with reasons for any that fail it.

## Parallelism Rule (fixed)

Specs are **file-segregated**. Each spec is scoped to the set of files it will touch, and that set travels with it through the run and into the result. Specs whose file sets are disjoint run **at the same time** on the shared branch; specs that share any file (or a directory containing it) run **one after the other**. The Workflow computes this itself; you only pass the ordered spec list.

## State Management

Write `docs/ai/coordination-state.md` at every transition. Fields:

- **Branch**: the current branch
- **Selection**: what the user chose (e.g. "P0 specs")
- **Phase**: `selecting` | `workflow-running` | `between-runs` | `needs-user` | `finished`
- **Workflow Run**: the `runId` from the Workflow tool result (needed for `resumeFromRunId`), plus the specs passed in and the launch args used (`model`, `lowEffortModel`, `notes`, `maxWorkers`, `maxParallelSpecs`) — a relaunch or resume must reuse them unchanged
- **Queued**: selected specs not yet run, in order
- **Needs User**: specs the Workflow returned as `needs-user`, with the reason
- **Completed This Session**: list of `{spec-name} (commits {short-hashes})`

**Resume**: If the state file says `workflow-running`, the previous session died mid-run. Same session → relaunch the Workflow with the same args recorded in the state file plus `resumeFromRunId` (cached stages return instantly; changed args lose the cache). New session → check `git log` and `git status` for what landed, then relaunch the Workflow for the specs that are not Done in TRACKER.md; the slicer sees committed partial work and the worker prompt tells workers to check `git diff` first.

## Coordination Loop

### 1. Launch the Workflow

Expand `~` to the absolute home directory. Then:

```
Workflow(
  scriptPath: "~/.claude/skills/backlog-coordinator/workflows/spec-pipeline.js",
  args: {
    specs: [{ name: "sso-config", file: "docs/ai/specs/sso-config.md" }, ...],  // ordered, ready-by-dependency
    branch: "<current branch>",
    devUrl: "http://localhost:3000",   // or null if there is no web UI
    today: "YYYY-MM-DD",
    skillDir: "~/.claude/skills/backlog-coordinator",   // absolute
    notes: "",                          // optional free text forwarded to every agent (user guidance, retry hints)
    maxWorkers: 3,                      // optional, concurrent workers across all specs
    maxParallelSpecs: 3,                // optional, file-segregated specs running at once
    model: "opus"                       // optional, model for every Workflow agent; omit to inherit the session model
    // lowEffortModel: "sonnet"         // optional, cheaper model for the bookkeeping agents (scope, start, commit, finalize); defaults to model
  }
)
```

Pass `args` as a real JSON object, never a stringified one. Write state (`workflow-running`, runId). The tool returns immediately; a task notification arrives when it finishes. Do not poll. The user can watch progress with `/workflows`.

Agent count: roughly 7 + slices + fix cycles per spec, so a run over several specs exceeds the default 15-agent guideline. That is the intended scale of this skill.

### 2. What the Workflow does (for your understanding — you do none of this)

1. **Scope** — one cheap agent per spec, all in parallel: readiness check plus the file set the spec will touch. Not-ready specs come back `skipped`. Specs are then batched: disjoint file sets share a batch (up to `maxParallelSpecs`), overlapping ones go to later batches. `references/scope-prompt.md`
2. **Slice** — per spec in the batch, in parallel: a slice plan (1–3 files per slice, minimal skills, dependency-ordered) inside the allowed file set. Overlap is re-checked on the actual slice files; a spec that now collides with another in its batch is deferred and re-sliced later against the updated tree. `references/slicer-prompt.md`
3. **Implement** — every kept spec at once. A start agent marks the spec `active` in the spec file and TRACKER.md and commits `Start {spec}`. Slices are grouped by dependency and file overlap; independent slices run in parallel (cap `maxWorkers` across all specs), each in a fresh worker scoped to its files. A dead worker gets exactly one replacement. Each group is committed by a committer agent. All git writes go through one lock, so concurrent specs never race on the index. `references/worker-prompt.md`
4. **Compile** — only after the whole batch finished implementing, so errors are attributable by file. Auto-discovers build/typecheck/lint commands; errors in the spec's files (or caused by its diff) fail the check, errors elsewhere are informational. On failure a fix worker runs and commits, max 2 cycles. `references/compile-check-prompt.md`
5. **Verify** — code review always; browser check with the `playwright` skill when the plan flags UI changes, one browser at a time across specs. NEEDS_FIXES with fewer than 3 issues → fix worker + commit + re-verify, max 2 cycles. FAIL or 3+ issues → `needs-user`. `references/verifier-code-prompt.md`, `references/verifier-playwright-prompt.md`
6. **Finalize** — sets Status `done`, Completed date, "What Was Built"; moves the TRACKER row to Done; commits `Update tracker: {spec} done`. `references/finalizer-prompt.md`

### 3. Handle the result

The Workflow returns `{ branch, results: [{ spec, status, files, commits, reason, summaries, verify }] }` — `files` is the spec's tracked file set — with status:

| Status | Meaning | Your action |
|--------|---------|-------------|
| `done` | Verified, TRACKER updated, committed | Add to Completed |
| `skipped` | Failed readiness check | Report reasons; leave in Queued only if the user fixes the spec |
| `needs-user` | Incomplete slices, compile still failing, verifier FAIL, or 3+ review issues | Stop the loop for that spec; put it in Needs User; ask the user how to proceed. To retry, relaunch with that spec and the user's guidance in `notes` |
| `failed` | An agent returned nothing or the plan was invalid | Relaunch once for that spec with the same args; if it fails again, treat as `needs-user` |

If every spec came back `failed` at Scope with "scope agent returned nothing" and you set a model override, the value may have been rejected — check the `model:` line the Workflow logged at startup (shown in `/workflows`) and the run's `journal.jsonl`, and fix the value before relaunching.

If the notification reports an empty or odd result, read `journal.jsonl` in the run's transcript directory before drawing conclusions.

### 4. Loop

After each run: re-read TRACKER.md, queue newly ready selected specs, write state, tell the user what landed (spec, commits, verdicts). If anything is queued, launch the next Workflow immediately — do not ask permission to continue. Stop only when:

- Nothing selected remains ready (report which specs are blocked and why)
- Every remaining spec is `needs-user` (ask, then continue with the answer)
- The dev environment is broken and cannot be recovered
- The user says stop

## End of Session

1. Confirm `git status` shows nothing from this session left uncommitted (pre-existing user changes stay as they were)
2. Keep `docs/ai/coordination-state.md` with Phase `finished` (useful next session)
3. Final summary: specs completed with commits, specs skipped/needing the user with reasons, branch name

## Examples

### Example 1: "work the backlog" with no selection

1. State file absent, TRACKER lists 2 P0, 3 P1, 4 P2 specs
2. Ask: "Only P0 specs" / "P0 and P1" / "Everything" / specific → user picks P0
3. Start dev env, branch is `feature/q3-forms`
4. Launch Workflow with the 2 P0 specs
5. Notification: `sc-deps-upgrade` done (commits `abc1234`, `def5678`), `sso-config` needs-user (verifier FAIL: login redirect loops)
6. Report both, ask about `sso-config`; user says "skip the redirect check, it's a known env issue"
7. Relaunch with `sso-config` and that sentence in `notes` → done → no P0 left → finish

### Example 2: "implement the P1 specs, then P2 as they unblock"

1. Queue P1 in order; `student-forms` P2 depends on `student-schema` P1
2. Run 1: scoping shows `student-schema` and `sso-config` touch disjoint files → they implement at the same time; `report-export` shares the routes file with `sso-config` → second batch
3. Run 1 finishes P1 → re-read TRACKER → `student-forms` now ready → Run 2 → finish

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No specs pass readiness | Report the reasons per spec; wait for the user |
| Every spec `failed` at Scope right away | A `model`/`lowEffortModel` value may have been rejected by the runtime; the `model:` line the Workflow logged at startup shows what was passed — fix it and relaunch |
| Worker died and its replacement also failed | Spec returns `needs-user` with the slice named; the slice is too large — relaunch with `notes: "re-slice {slice} into smaller pieces"` |
| Compile check fails repeatedly | `needs-user` with the report; may be pre-existing — ask |
| Verifier FAIL | `needs-user`; ask before continuing |
| Dev environment won't start | Restart per STARTUP.md / README; verify with the health check; then launch |
| Session died mid-run | Resume per State Management |
| Workflow result empty | Read the run's `journal.jsonl` before diagnosing |
| Committer reports "none" | Nothing changed for that group; the worker summary says why |
| Specs you expected in parallel ran one by one | Their scoped file sets overlap (the run log names the deferral); split the shared file out or accept serial |
| Two concurrent specs stepped on each other | The scope agent missed a shared file; relaunch with `notes` naming it so scoping includes it |
| Browser check flaky | Only one browser verifier runs at a time already; relaunch that spec with `notes` describing the flake |
