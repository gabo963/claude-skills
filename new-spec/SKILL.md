---
name: new-spec
description: Drafts a new backlog spec file under docs/ai/specs/ from a free-form prompt and registers it in TRACKER.md at the requested priority. Use when the user says "write a spec", "draft a spec", "new spec", "create a spec for ...", or "/new-spec [priority] [description]". Does not change spec status, write code, or move rows between TRACKER sections — for that, use the project-specs skill.
---

# /new-spec — Draft a New Spec & Tracker Entry

Turn a one-line user prompt into a properly formatted backlog spec under `docs/ai/specs/` and add the matching row to
`TRACKER.md`.

This skill **only creates backlog specs**. It never edits code, never marks specs active/done, and never moves rows
between tracker sections (use the `project-specs` skill for those).

## Inputs

- **Priority** (required): one of `P0`, `P1`, `P2`, `P3`. If the user did not say, ask once before drafting.
- **Description** (required): the free-form prompt. Use it to derive the title, kebab-case filename, context, and
  requirements. If the prompt is just a vague topic ("something for photos"), ask one clarifying question before
  drafting — do not invent requirements.

## Steps

### Step 1: Read context (parallel)

- Read `docs/ai/specs/TRACKER.md` to confirm current Backlog count and check for closely related specs.
- List `docs/ai/specs/` to avoid filename collisions.

### Step 2: Pick a filename

- Feature-oriented kebab-case: `student-photos-optional-crop`, not `fix-issue-42`.
- Verify no existing file collides; if it does, append a disambiguating qualifier (e.g. add a scope word, not a
  number).
- If a closely related Backlog/Active spec already covers this work, surface it to the user and ask whether to extend
  it instead of creating a duplicate. Stop until the user decides.

### Step 3: Draft the spec

Use the dominant repo format — table frontmatter plus standard sections. This is the template:

```markdown
# [Human-Readable Title]

| Field    | Value       |
|----------|-------------|
| Status   | backlog     |
| Priority | P0          |
| Created  | YYYY-MM-DD  |
| Owner    | unassigned  |

## Context

Two to four sentences: the problem, why it matters, the intended outcome. Pull from the user's prompt and any code
already seen this session — do not explore the codebase from scratch just to write the spec.

## Requirements

1. Testable acceptance criterion
2. Testable acceptance criterion
3. ...

## Affected Modules

- `path/to/file.ext` — what changes

## Approach

High-level strategy, not detailed steps. One or two paragraphs or a short bulleted plan. Reference existing functions
and files rather than restating their code.

## Open Questions

- Anything that needs human input before implementation. Empty list is fine — delete the section if so.

## Verification

1. [ ] How to confirm requirement 1 works end-to-end
2. [ ] How to confirm requirement 2 works end-to-end
```

**Date**: today in `YYYY-MM-DD`. Convert any relative dates the user mentions ("by next Tuesday") to absolute.

**Sizing**: if the work is too small for a spec (single-line fix, typo), say so and recommend just doing it instead.
If it is too big (3+ unrelated subsystems), suggest splitting into sibling specs and stop.

**Surgical scope**: design the spec for surgical changes only. Requirements, Affected Modules, and Approach should
touch only what the work demands — no adjacent refactors, no "while we're here" cleanups, no speculative abstractions
or configurability that was not requested. If the user's prompt implies broader cleanup, call it out and ask whether
to keep it surgical or split the cleanup into a sibling spec.

Sections that do not apply get deleted. Better a short, concrete spec than a vague long one.

### Step 4: Write the spec file

Write `docs/ai/specs/[kebab-name].md` with the Write tool.

### Step 5: Update TRACKER.md

- Insert a row in the **Backlog** table:
  ```
  | [spec-name](spec-name.md) | P0 | YYYY-MM-DD | One-line summary of the work |
  ```
- Bump the `Backlog:` count and update `Last updated:` in the HTML comment at the top of TRACKER.md.
- Do **not** touch the Active, Blocked, or Done sections.

### Step 6: Report

Tell the user:

- The spec filename and priority.
- A 1-sentence summary of what the spec contains.
- Confirmation that TRACKER.md is updated.
- Any open questions captured in the spec they should resolve before someone picks it up.

## Examples

### Example 1: Direct prompt with priority

User says: `/new-spec P1 add CSV export to the admin dashboard`

Actions:

1. Read TRACKER.md and `ls docs/ai/specs/`; no collision with `admin-csv-export.md`.
2. Draft `admin-csv-export.md` with status `backlog`, priority `P1`, today's date, Context (admins need bulk export
   for reporting), 3 testable requirements, Affected Modules pointing at the admin dashboard report, a short Approach,
   and a Verification checklist.
3. Insert the row into TRACKER.md Backlog and bump the count.
4. Report filename, priority, summary, and any open questions.

Result: New `docs/ai/specs/admin-csv-export.md` exists at status `backlog`; TRACKER.md Backlog has one new row.

### Example 2: Prompt missing priority

User says: "write a spec for unifying email templates"

Actions:

1. Ask: "What priority — P0, P1, P2, or P3?"
2. After the user answers `P2`, proceed as in Example 1 with filename `unify-email-templates.md`.

Result: Spec drafted only after priority is confirmed.

### Example 3: Vague prompt

User says: "/new-spec P3 fix the photos thing"

Actions:

1. Ask one clarifying question: "Which photos field — `:student/photos`, `:student/profile-photo-url`, or company
   logos? And what is the symptom?"
2. After the user clarifies, draft the spec.

Result: No spec is written until the work is concrete enough to capture testable requirements.

### Example 4: Duplicate detected

User says: "/new-spec P1 student photos optional crop"

Actions:

1. Read TRACKER.md; find existing Backlog spec `student-photos-optional-crop`.
2. Surface it to the user and ask whether to extend the existing spec or create a sibling spec with a different scope.
3. Do not write a duplicate.

Result: User chooses, and either no new spec is written or a clearly-scoped sibling spec is created.

## Troubleshooting

### Validator complains about description angle brackets

Symptom: `description cannot contain '<' or '>'`.

Cause: Using a YAML folded scalar (`description: >-`) — the loose validator captures the `>` into the value.

Solution: Use a plain inline string for `description`, no `>-` and no `|`. Keep it under 1024 characters.

### Validator complains about unexpected frontmatter keys

Symptom: `Unexpected frontmatter key(s): argument-hint, disable-model-invocation`.

Cause: Only `name`, `description`, `license`, `allowed-tools`, `metadata`, and `compatibility` are allowed at the top
level.

Solution: Remove unsupported keys, or move them under a `metadata:` block as custom key/value pairs if they need to
persist.

### TRACKER count drifts after the row is added

Symptom: The HTML comment at the top of TRACKER.md still shows the old `Backlog:` count.

Cause: Forgot to update the metadata comment in the same edit.

Solution: After inserting the Backlog row, edit the comment line to bump the count and `Last updated:` date in the
same step. Confirm by re-reading the first 5 lines of TRACKER.md.

### User prompt is too small for a spec

Symptom: The work is a one-line fix or a typo.

Cause: Specs are for testable bodies of work, not micro-tasks.

Solution: Tell the user it is too small for a spec and offer to just do the change directly. Do not draft a spec.

### User prompt spans multiple unrelated subsystems

Symptom: Requirements would touch three or more disjoint feature areas.

Cause: The prompt is really an initiative, not a spec.

Solution: Suggest splitting into sibling specs, list the proposed split, and stop until the user confirms which to
draft first.
