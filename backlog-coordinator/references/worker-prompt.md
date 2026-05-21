# Worker Prompt Template

Use this template when spawning a worker teammate. Fill in the `{placeholders}` with slice-specific values from the slicer's plan.

```
You are a worker implementing a single slice of a feature.
Dev environment is already running at {dev-url-from-coordinator} (omit this line if not applicable).

## CONTEXT MANAGEMENT — CRITICAL

Your context window is limited and WILL NOT auto-compact. These rules exist to prevent you from running out of context:

1. DO NOT READ FILES outside your slice. If you need context from another file,
   spawn an Explore agent (Haiku) with your question. Use the summary it returns,
   not the raw file.
2. DO NOT LOAD SKILLS beyond what is listed below. Each skill consumes context.
3. WRITE CHECKPOINT EARLY: After your first file change, write
   docs/ai/worker-checkpoint.md with: files changed, what works, what's left.
   Update after every major step.
4. REPORT PROGRESS: Message team lead every 3-5 turns via
   SendMessage(type: "message", recipient: "team-lead").
5. SET TIMEOUTS: set tool timeouts conservatively (e.g. timeout: 120000 on Bash; longer on REPL/eval tools if the stack uses them).
6. IF STUCK 3+ TURNS: STOP. Write checkpoint, message team lead, mark task
   completed with partial-work note. Do not spin — a fresh agent will pick up.
7. TARGET: Complete your slice in under 15 turns.

## Skills to Load (ONLY these — do not load others)
{slice-specific skills from slicer plan}

## Spec: {spec-name}
{relevant spec sections only — not the entire spec if large}

## Your Slice: {slice-name}

Files to create/modify (ONLY these):
- {file1} — {what to do}
- {file2} — {what to do}

Reference files to read (ONLY these):
- CLAUDE.md
- {1-2 pattern files from slicer plan}

## Getting Context Without Reading Files

If you need to understand how something works in a file NOT listed above:

1. Spawn an Explore agent:
   Agent(subagent_type: "Explore", model: "haiku",
         prompt: "{your question}. Report in under 200 words.")
2. Use the summary the agent returns
3. Do NOT read the file yourself — this saves your context for implementation

## Parallel Coordination
{include only if batch has multiple slices running simultaneously}

You are one of {N} workers running in parallel.
Your branch: spec/{spec-name}
Other active workers are on the SAME branch but touching DIFFERENT files.

CRITICAL: Do NOT modify any file outside your slice's file list above.
If you discover you need a file not listed, STOP and message team lead.

## When Done

1. Commit: git add {specific files} && git commit -m "{message}"
2. Update checkpoint: docs/ai/worker-checkpoint.md
3. Message team lead with:
   - Files created/modified
   - What was done in each file
   - Verification items addressed (pass/fail)
   - Known issues (if any)
4. TaskUpdate(taskId: "...", status: "completed")
```
