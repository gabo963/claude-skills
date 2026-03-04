This file explains how a YAML header should look.

The minimal required format for a YAML header is:

```yaml
---
name: your-skill-name
description: What it does. Use when user asks to [specific
phrases].
---

```
## Fields

name (required):
- kebab-case only
- No spaces or capitals
- Should match the skill containing folder name

description (required):

Good structure for the description:

```
[What it does] + [When to use it] + [Key capabilities]
```

A description MUST include BOTH:
- What the skill does
- When to use it (trigger conditions)

A description MUST also:
- Have UNDER 1024 characters
- Not contain XML tags (< or >)
- Include specific tasks users might say
- Mention file types if relevant

### Examples

```yaml
# Good - specific and actionable
description: Analyzes Figma design files and generates
  developer handoff documentation. Use when user uploads .fig
  files, asks for "design specs", "component documentation", or
  "design-to-code handoff".

# Good - includes trigger phrases
description: Manages Linear project workflows including sprint
  planning, task creation, and status tracking. Use when user
  mentions "sprint", "Linear tasks", "project planning", or asks
  to "create tickets".

# Good - clear value proposition
description: End-to-end customer onboarding workflow for
  PayFlow. Handles account creation, payment setup, and
  subscription management. Use when user says "onboard new
  customer", "set up subscription", or "create PayFlow account".

# Too vague
description: Helps with projects.

# Missing triggers
description: Creates sophisticated multi-page documentation
systems.

# Too technical, no user triggers
description: Implements the Project entity model with
hierarchical relationships.

```

license (optional):
- Use if making skill open source
- Common: MIT, Apache-2.0

compatibility (optional):
- 1-500 characters
- Indicates environment requirements: e.g. intended product, required system packages, network access needs, etc.

metadata (optional):
- Any custom key-value pairs
- Suggested: author, version, mcp-server
- Example:

```yaml
metadata:
  author: ProjectHub
  version: 1.0.0
  mcp-server: projecthub
```

## Security Restrictions

Forbidden in frontmatter:
- XML angle brackets (< >)
- Skills with "claude" or "anthropic" in name (reserved)

## All optional YAML header fields
```yaml
name: skill-name
description: [required description]
license: MIT # Optional: License for open-source
allowed-tools: "Bash(python:*) Bash(npm:*) WebFetch" # Optional:
Restrict tool access
metadata: # Optional: Custom fields
 author: Company Name
 version: 1.0.0
 mcp-server: server-name
 category: productivity
 tags: [project-management, automation]
 documentation: https: /example.com/docs
 support: support@example.com
```
