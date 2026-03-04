# Workflow Patterns

Use these patterns when writing multi-step instructions.

## Sequential Workflow

Break the task into explicit ordered steps with concrete commands:

1. Analyze inputs
2. Generate or transform output
3. Validate output
4. Handle common failure paths

Template:

```markdown
### Step 1: Analyze Input

Run `python scripts/analyze.py --input {path}`.

### Step 2: Process Data

Run `python scripts/process.py --input {path} --output {out}`.

### Step 3: Validate Result

Run `python scripts/validate.py --input {out}`.
```

## Conditional Workflow

For branching flows, define the decision first, then branch-specific steps.

Template:

```markdown
1. Determine operation type:
   - Creating new content -> follow Creation workflow
   - Updating existing content -> follow Update workflow

2. Creation workflow:
   1. ...
   2. ...

3. Update workflow:
   1. ...
   2. ...
```

## Deterministic Workflow Rules

- Prefer script calls over vague prose for fragile tasks.
- Include at least one validation step before final output.
- Include a recovery path for known failure modes.
- Keep core workflow in `SKILL.md`; move long details to references.
