# Meta-Critique Decision Criteria

This document defines how the Phase 2 impartial reviewer classifies each issue from a Phase 1 critique as VALID or NOISE.

## Core Principle: The 80% Rule

A work product does not need to cover everything. It needs to cover what 80% of users will need. The most common source of critique noise is flagging gaps that only affect edge cases or advanced users.

Ask: "Would a typical user, following this work product for its intended purpose, hit this issue?" If yes, it is VALID. If only a power user digging into internals would notice, it is NOISE.

## Classification Rubric

### VALID -- Keep This Issue

An issue is VALID if ANY of these apply:

1. **Genuinely incorrect statement** -- The work product makes a factual claim that is demonstrably wrong. Wrong function signature, wrong default, wrong behavior, wrong API endpoint.

2. **Broken example** -- A code example, config, or command that would fail if copied and used as-is. Syntax errors, wrong imports, missing required arguments, deprecated APIs.

3. **Common-case gap** -- Something missing that most users would need. If following the work product for its stated purpose would leave users stuck or confused, the gap is real.

4. **Misleading guidance** -- Advice that would lead users to incorrect patterns, anti-patterns, or behaviors that work in testing but break in production.

### NOISE -- Remove This Issue

An issue is NOISE if ANY of these apply:

1. **Internal/obscure detail** -- Flags an undocumented internal function, a rarely-used option, or an edge case that fewer than 20% of users would encounter.

2. **Completeness padding** -- The critique flags something as "missing" but the work product already covers the 80% case. The reviewer is being thorough for thoroughness' sake.

3. **Critique is wrong** -- The critique's own claim is incorrect. The work product was actually right, or the issue is based on a misunderstanding of the reference material.

4. **Not actionable** -- The issue is vaguely stated, has no concrete suggestion, or describes a preference rather than an error. "Could be more detailed" without specifying what detail is missing.

5. **Style/cosmetic only** -- Formatting preferences, naming conventions, or organizational choices that do not affect correctness or usability.

## Decision Threshold

- **2 or more VALID issues** -> KEEP the critique. Rewrite it to contain only the VALID issues.
- **Fewer than 2 VALID issues** -> DELETE the critique. The work product is good enough.

### Why 2?

A single valid issue is more likely to be a marginal call or minor oversight that does not warrant a structured fix pass. Two or more issues indicate a pattern worth addressing. This threshold was calibrated on a 10-skill critique run where it correctly separated 9 skills needing fixes from 1 that was good enough.

## Real Examples from Proven Runs

### Example: Issues KEPT (from Fulcro skills critique)

**KEPT -- Wrong label rendering behavior (fulcro-defsc)**
- Critique claimed: "The skill shows `:label` as a direct prop on `dom/input`"
- Reality: Fulcro's `dom/input` does not render a label element; you need a separate `dom/label`
- Classification: **VALID** -- broken example, users would copy this and get no label

**KEPT -- Missing commonly-used option (fulcro-mutations)**
- Critique claimed: "Skill does not document the `:ok-action` and `:error-action` callbacks"
- Reality: These are the primary way to handle remote mutation results
- Classification: **VALID** -- common-case gap, most users doing remote mutations need this

**KEPT -- Anti-pattern in loading example (fulcro-loading)**
- Critique claimed: "Example uses `load!` inside `componentDidMount` instead of in a mutation or lifecycle"
- Reality: Calling `load!` in `componentDidMount` works but causes unnecessary re-renders
- Classification: **VALID** -- misleading guidance, leads to suboptimal pattern

**KEPT -- Wrong handler argument signature (fulcro-dom)**
- Critique claimed: "Skill shows event handlers as `(fn [e] ...)`"
- Reality: Some Fulcro DOM event handlers receive different arguments depending on the element type
- Classification: **VALID** -- accuracy error, would cause confusion when handler args do not match

### Example: Issues REMOVED (from Fulcro skills critique)

**REMOVED -- Missing internal merge function (fulcro-normalized-state)**
- Critique claimed: "Does not document `merge*` internal function"
- Reality: `merge*` is an implementation detail of the merge system
- Classification: **NOISE** -- internal detail, users call `merge-component!` not `merge*`

**REMOVED -- Does not cover all targeting modes (fulcro-data-targeting)**
- Critique claimed: "Missing documentation for `:prepend-to` targeting"
- Reality: The skill covers `append-to`, `replace-at`, and `multiple-targets` which handle 95% of cases
- Classification: **NOISE** -- completeness padding, 80% rule applies

**REMOVED -- Incomplete router lifecycle docs (fulcro-dynamic-routing)**
- Critique claimed: "Does not document `will-enter` return value variations"
- Reality: The skill documents the two main return types (`route-immediate` and `route-deferred`)
- Classification: **NOISE** -- completeness padding, the common cases are covered

**REMOVED -- Critique wrong about threading macro (fulcro-uism)**
- Critique claimed: "Skill incorrectly shows `->` threading for state machine handlers"
- Reality: The skill's usage was actually correct; the critique misread the macro expansion
- Classification: **NOISE** -- critique is wrong

## Edge Cases

### When the work product IS the reference material

Sometimes the user wants to critique code against best practices rather than a specific reference. In this case, the meta-critique should be stricter about what counts as VALID -- without a concrete source of truth, subjective "should" claims are more likely to be noise.

### When the critique finds only 1 valid issue but it is High severity

The threshold is 2+ issues, but a single High severity issue (e.g., security vulnerability, data loss risk, fundamentally broken example) should still be KEPT. Use judgment: if the one issue would cause real harm, keep it.

### When the meta-critique is uncertain

If the meta-critique agent cannot determine whether an issue is VALID or NOISE from the work product alone (without the reference material), it should mark it as VALID. False positives (keeping a noise issue) are less costly than false negatives (removing a real issue).

## Impartiality Rule

The Phase 2 agent must NOT read the reference material. This is deliberate. Phase 1 agents develop a completeness bias from reading the source -- they see everything that COULD be documented and flag gaps. The Phase 2 agent, reading only the work product, evaluates whether each flagged issue represents a real problem for someone using the work product as intended.

This separation is what makes the pipeline effective. Without it, the meta-critique inherits the same bias and rubber-stamps most issues.
