# Critique Format Template

When writing a `critique.md` file during Phase 1, follow this structure exactly.

## Template

```markdown
# Critique: [Target Name]

**Reviewed:** [file path or description of work product]
**Against:** [reference material used]
**Date:** [date]
**Verdict:** [GOOD | NEEDS WORK | POOR]

## Summary

[2-3 sentences: overall quality assessment, main themes found]

## Issues

### Issue 1: [Short descriptive title]

- **Category:** [Accuracy | Working Example | Completeness]
- **Severity:** [High | Medium | Low]
- **Location:** [file path + line number or section name]
- **Claim:** [What the work product says or implies]
- **Reality:** [What is actually true, per the reference material]
- **Source:** [Specific file, function, line, or doc section in reference material]
- **Suggested fix:** [Concrete change to make]

### Issue 2: ...

(Continue for all issues found)
```

## Verdict Criteria

- **GOOD** -- Work is largely correct. Minor gaps or improvements possible but nothing misleading.
- **NEEDS WORK** -- Multiple inaccuracies or significant gaps that would mislead users.
- **POOR** -- Fundamentally incorrect or so incomplete as to be unhelpful.

## Category Definitions

- **Accuracy** -- A factual claim that is wrong. Wrong function signature, wrong default value, wrong behavior description, incorrect API endpoint, etc.
- **Working Example** -- A code example, config snippet, or command that would fail if used as-is. Syntax errors, wrong imports, incorrect arguments, missing setup steps.
- **Completeness** -- Something missing that users would commonly need. Apply the 80% rule: only flag if most users following this work product would hit this gap.

## Severity Definitions

- **High** -- Would cause runtime errors, data loss, security issues, or fundamentally wrong behavior if followed.
- **Medium** -- Would cause confusion, require debugging, or lead to suboptimal outcomes.
- **Low** -- Minor inaccuracy or gap that most users could work around.

## Good Issue Examples

```markdown
### Issue 3: Wrong default value for timeout parameter

- **Category:** Accuracy
- **Severity:** Medium
- **Location:** docs/api-client.md, "Configuration" section
- **Claim:** "The default timeout is 30 seconds"
- **Reality:** The default timeout is 5000ms (5 seconds), set in src/client.ts:42
- **Source:** src/client.ts:42 -- `const DEFAULT_TIMEOUT = 5000`
- **Suggested fix:** Change "30 seconds" to "5 seconds (5000ms)"
```

```markdown
### Issue 5: Example code uses removed API

- **Category:** Working Example
- **Severity:** High
- **Location:** README.md, "Quick Start" section
- **Claim:** Shows `client.fetchAll()` as the way to list resources
- **Reality:** `fetchAll()` was removed in v3.0. The correct method is `client.list()`
- **Source:** src/client.ts -- no `fetchAll` method exists; CHANGELOG.md v3.0 breaking changes
- **Suggested fix:** Replace `client.fetchAll()` with `client.list()` in the example
```

## Bad Issue Examples (These Are Noise)

```markdown
### Issue 7: Missing documentation for internal parse function

- **Category:** Completeness
- **Severity:** Low
- **Location:** docs/api.md
- **Claim:** Does not document `_parseInternal()` function
- **Reality:** `_parseInternal()` is a public function in the module
```

Why this is noise: The function is prefixed with underscore, indicating it is internal. Most users would never call it. This is completeness padding.

```markdown
### Issue 9: Does not mention edge case with empty arrays

- **Category:** Completeness
- **Severity:** Low
- **Location:** docs/guide.md, "Data Processing" section
- **Claim:** Guide does not mention behavior when input array is empty
- **Reality:** Passing an empty array returns an empty result
```

Why this is noise: The behavior is intuitive (empty in, empty out). Documenting this adds bulk without helping anyone.
