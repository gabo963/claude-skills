This file explains how to write the main instructions section of a SKILL.md file — everything after the YAML frontmatter.

## Structure

After the frontmatter, write the actual instructions in Markdown:

```markdown
---
name: your-skill-name
description: ...
---

# Your Skill Name

# Instructions

### Step 1: [First Major Step]

Clear explanation of what happens.

### Step 2: [Second Major Step]

Clear explanation of what happens.

(Add more steps as needed)
```

## Examples Section

Include concrete examples of how the skill is used:

```markdown
## Examples

### Example 1: [Common Scenario]

User says: "Set up a new marketing campaign"

Actions:
1. Fetch existing campaigns via MCP
2. Create new campaign with provided parameters

Result: Campaign created with confirmation link

(Add more examples as needed)
```

## Troubleshooting Section

Document common errors and how to resolve them:

```markdown
## Troubleshooting

### Error: [Common error message]

Cause: [Why it happens]
Solution: [How to fix]

(Add more error cases as needed)
```

## Best Practices

### Be Specific and Actionable

Good:
```
Run `python scripts/validate.py --input {filename}` to check data format.
If validation fails, common issues include:
- Missing required fields (add them to the CSV)
- Invalid date formats (use YYYY-MM-DD)
```

Bad:
```
Validate the data before proceeding.
```

### Include Error Handling

```markdown
## Common Issues

### MCP Connection Failed

If you see "Connection refused":
1. Verify MCP server is running: Check Settings > Extensions
2. Confirm API key is valid
3. Try reconnecting: Settings > Extensions > [Your Service] > Reconnect
```

### Reference Bundled Resources Clearly

```markdown
Before writing queries, consult `references/api-patterns.md` for:
- Rate limiting guidance
- Pagination patterns
- Error codes and handling
```

### Use Progressive Disclosure

Keep SKILL.md focused on core instructions. Move detailed documentation to `references/` and link to it.
