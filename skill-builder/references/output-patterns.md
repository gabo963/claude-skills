# Output Patterns

Use these patterns to improve consistency of generated outputs.

## Strict Template Pattern

Use when output format must be exact.

```markdown
ALWAYS use this structure:

# [Title]

## Summary
[1 short paragraph]

## Findings
- [Finding 1]
- [Finding 2]

## Actions
1. [Action 1]
2. [Action 2]
```

## Flexible Template Pattern

Use when format can adapt to context.

```markdown
Use this as the default structure and adapt as needed:

# [Title]
## Summary
## Details
## Recommended Next Steps
```

## Example Pair Pattern

When style matters, include input/output examples.

```markdown
Example input: "Fix login bug"
Example output: "fix(auth): handle null token in login flow"
```

## Quality Checks for Outputs

- Output matches requested structure.
- Output includes concrete actions, not only descriptions.
- Output avoids placeholders in final delivery.
- Output references files/commands when implementation is involved.
