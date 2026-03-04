---
name: meta-critique
description: "Multi-phase critique pipeline that validates any work product against
  reference material. Phase 1 critiques accuracy, Phase 2 filters noise via impartial
  meta-critique, Phase 3 applies fixes. Use when user says \"critique\", \"review
  against source\", \"audit my code\", \"validate docs\", \"check accuracy\", \"meta-critique\",
  or asks to compare work against a spec, API docs, or source of truth."
---

# Meta-Critique Pipeline

A three-phase review pipeline for validating any work product (code, documentation, skills, configs) against reference material. The key insight: raw critiques contain 60-70% noise. An impartial meta-critique phase filters to only genuinely actionable issues.

## Reference Files

Before running the pipeline, consult:

- `references/critique-format.md` -- Structured critique template, field explanations, good/bad issue examples
- `references/decision-criteria.md` -- VALID vs NOISE rubric, the 80% rule, real examples from proven runs, threshold rationale

## Instructions

### Step 1: Gather Context from the User

Ask the user three questions:

1. **What to critique** -- the work product(s). Could be files, a directory, a PR, a skill, generated code, documentation, configs, etc. Read all identified files. If the user points to a directory, scan for relevant files with Glob.
2. **What to compare against** -- the source of truth. Could be source code, API docs, a spec, a style guide, tests, or "best practices for X". Read or fetch all reference material.
3. **Scope** -- one of:
   - `full` (critique + meta-critique + fix) -- default
   - `audit` (critique + meta-critique, no fixes applied)
   - `critique-only` (just Phase 1, raw unfiltered critique)

Confirm the target list and reference material with the user before proceeding.

### Step 2: Phase 1 -- Critique

Spawn one agent per work product (parallelize when multiple targets). Each critique agent:

1. Reads the work product thoroughly.
2. Reads the reference material / source of truth.
3. Compares claims against reality. Checks:
   - **Accuracy** -- incorrect statements, wrong signatures, wrong defaults, wrong behavior
   - **Working examples** -- would code examples compile and run correctly?
   - **Completeness (80% rule)** -- only flag gaps that matter for the common case, not exhaustive coverage of every edge
4. Writes a structured `critique.md` co-located with the work product, following the template in `references/critique-format.md`:
   - Summary with verdict (GOOD / NEEDS WORK / POOR)
   - Numbered issues, each with: Category, Severity, Location, Claim, Reality, Source reference, Suggested fix

If scope is `critique-only`, present the raw critique(s) to the user and stop.

### Step 3: Phase 2 -- Meta-Critique (Impartial Reviewer)

For each critique, spawn a **separate** agent. This agent is deliberately impartial -- it reads ONLY the critique and the work product, NOT the reference material. This prevents it from inheriting the same completeness bias as Phase 1.

The meta-critique agent classifies each issue using the rubric in `references/decision-criteria.md`:

**VALID -- keep:**
- Genuinely incorrect statement with evidence
- Code/example that would break if used as-is
- Missing something that users would commonly need

**NOISE -- remove:**
- Obscure/internal detail most people never need
- Nitpicking completeness when the work covers the 80% case
- The critique is wrong about its own claim
- Padding -- reviewer wanted to say something but it is not actionable

**Threshold:** 2+ valid issues -> KEEP critique (rewrite with only valid issues). Fewer than 2 -> DELETE critique (work is good enough).

If scope is `audit`, present the filtered results to the user and stop.

### Step 4: Phase 3 -- Fix

For each surviving critique, spawn a fix agent:

1. Reads the filtered critique.
2. Reads the work product and reference material as needed.
3. Applies surgical fixes -- minimal edits, do not rewrite unaffected sections.
4. Deletes `critique.md` after all fixes are applied.

### Step 5: Report

Present a summary table and totals:

**Per-target row:** target name | Phase 1 verdict | meta-critique decision (KEPT/DELETED) | valid issue count | fixes applied

**Totals:** targets processed, critiques kept vs deleted, total fixes applied, noise removal rate (percentage of Phase 1 issues removed by Phase 2)

## Examples

### Example 1: Full Pipeline on Generated Code

User says: "Critique my generated API client against the OpenAPI spec."

Actions:
1. Ask user for the generated code files and the OpenAPI spec file.
2. Read both. Confirm targets.
3. Phase 1: Spawn critique agent. It finds 8 issues -- wrong HTTP methods, missing query params, incorrect response types, plus some nitpicks about optional headers.
4. Phase 2: Spawn meta-critique agent. It classifies 3 issues as VALID (wrong HTTP method, missing required param, incorrect response type) and 5 as NOISE (optional headers, internal-only endpoints, cosmetic).
5. Phase 3: Spawn fix agent. Applies 3 surgical fixes to the client code. Deletes critique.md.
6. Report: 1 target, 1 critique kept, 3 fixes applied, 62% noise removal.

### Example 2: Audit a Skill (No Fixes)

User says: "Audit my fulcro-mutations skill against the library source, but don't fix anything yet."

Actions:
1. Read the skill's SKILL.md and the Fulcro mutations source code.
2. Scope: `audit` (no fixes).
3. Phase 1: Critique finds 10 issues including wrong signatures, missing options, and several obscure internal APIs.
4. Phase 2: Meta-critique keeps 4 issues (wrong signature, missing commonly-used option, broken example, misleading default). Removes 6 as noise (internal APIs, padding).
5. Present filtered critique to user. No fixes applied.
6. Report: 1 target, 1 critique kept, 4 valid issues, 60% noise removal.

### Example 3: Critique Documentation Against API Behavior

User says: "Check if our REST API docs match what the server actually does."

Actions:
1. Ask user for the documentation files and the server route/controller source code.
2. Read both. Confirm targets (e.g., 5 endpoint doc pages).
3. Phase 1: Spawn 5 critique agents in parallel. They find issues across docs -- wrong status codes, missing error responses, outdated parameter names.
4. Phase 2: Spawn 5 meta-critique agents. Filter results: 3 docs have 2+ valid issues (kept), 2 docs have only nitpicks (deleted).
5. Phase 3: Spawn 3 fix agents for surviving critiques. Apply fixes to docs.
6. Report: 5 targets, 3 critiques kept, 2 deleted, 11 fixes applied, 65% noise removal.

## Troubleshooting

### Reference material not found or inaccessible

If the user points to files that do not exist or cannot be read, ask for corrected paths. If some references are unavailable (e.g., external URLs that cannot be fetched), skip those and note in the report which references were unavailable. Do not block the entire pipeline on one missing reference.

### Meta-critique removes all issues (possible false negative)

If the meta-critique deletes every critique and the user suspects real issues were missed:
1. Re-run as `critique-only` scope so the user can see the raw Phase 1 output.
2. The user can manually override the threshold by marking specific issues as VALID.
3. Consider whether the reference material was too narrow -- the critique may have found real issues the meta-critique could not verify without source access.

### Fix introduces new problems

If a Phase 3 fix causes regressions or introduces new errors:
1. The fix agent should preserve both the original and fixed versions when uncertain (e.g., comment with original).
2. Report ambiguous fixes in the summary for manual resolution.
3. If the work product has tests or validation (e.g., `quick_validate.py` for skills), run them after fixes and report failures.

### Too many targets to process at once

When the user provides a large set of targets (more than 10):
1. Batch into groups of 5.
2. Process each batch through the full pipeline before starting the next.
3. Aggregate results across batches in the final report.
