# Skill Builder

Claude Code skill builder based on the official Anthropic guides and skill examples. This builder can create new skills from scratch and validate or improve existing ones to match the Claude skill format.

## What it does

- **Create flow** -- scaffolds a complete skill folder (SKILL.md, references, scripts) through a guided Q&A workflow
- **Validate/Modify flow** -- audits an existing skill against structural and content-quality checks, auto-fixes what it can, and reports the rest

## Sources & Inspiration

This skill was built from the patterns and rules described in:

- [The Complete Guide to Building Skills for Claude (PDF)](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf?hsLang=en)
- [Equipping Agents for the Real World with Agent Skills (Blog)](https://claude.com/blog/equipping-agents-for-the-real-world-with-agent-skills)
- [anthropics/skills (GitHub)](https://github.com/anthropics/skills) -- Anthropic's official skill examples and reference implementations

## Requirements

- Python 3.8+ (standard library only, no pip dependencies)
- Claude Code CLI

## Installation

Clone or copy the `skill-builder` folder into one of the skill locations that Claude Code reads from:

| Scope | Path | Applies to |
|-------|------|------------|
| Personal | `~/.claude/skills/skill-builder/` | All your projects |
| Project | `<project>/.claude/skills/skill-builder/` | That project only |

For example, to install it globally:

```bash
# from inside this repo
cp -r . ~/.claude/skills/skill-builder
```

Or for a single project:

```bash
mkdir -p /path/to/project/.claude/skills
cp -r . /path/to/project/.claude/skills/skill-builder
```

Once installed, Claude Code discovers the skill automatically. You can verify by asking Claude *"What skills are available?"* or invoking it directly with `/skill-builder`.

> **Note:** Legacy `.claude/commands/` paths also work, but `.claude/skills/` is the recommended location since it supports supporting files, frontmatter options, and auto-discovery.

## Usage

Once installed, say things like:

- *"Create a new skill for managing Notion projects"*
- *"Check my skill for issues"*
- *"Validate and fix my SKILL.md"*

## License

MIT
