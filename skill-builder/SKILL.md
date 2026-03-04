---
name: skill-builder
description: Creates and validates Claude Code skill folders with guided workflows, quality checks, and iterative refinement. Handles both new skill creation (full scaffolding) and existing skill validation/improvement. Use when user says "create a skill", "new skill", "build a skill", "check my skill", "validate skill", "fix my SKILL.md", or "improve my skill".
compatibility: Requires Python 3.8+. Scripts use only the standard library (no pip dependencies).
---

# Skill Builder

# Instructions

## Step 1: Determine Mode

Identify whether the user wants to **create** a new skill or **modify/validate** an existing one.

- **Create triggers**: "create a skill", "new skill", "build a skill", "make a skill"
- **Modify/Validate triggers**: "check my skill", "validate skill", "fix my SKILL.md", "improve my skill", "update my skill"

If ambiguous, ask:

```
Are you looking to:
1. Create a new skill from scratch
2. Validate or improve an existing skill
```

Then proceed to the corresponding flow.

---

## Create Flow

### Step 2: Gather Basics

Ask the user two things upfront:

1. **Skill name**: What should this skill be called?
2. **Skill purpose**: In a sentence or two, what does this skill do?

After receiving answers, derive a **kebab-case name** from their input.

**Name rules** (full details in `references/skill-file-structure.md`):
- kebab-case only: `notion-project-setup` ✓
- No spaces: `Notion Project Setup` ✗
- No underscores: `notion_project_setup` ✗
- No capitals: `NotionProjectSetup` ✗
- Must not contain "claude" or "anthropic" (reserved)

If the user's name violates these rules, suggest a corrected version and confirm before proceeding.

### Step 3: Draft Description

Draft a `description` for the YAML frontmatter. The description MUST follow this structure:

```
[What it does] + [When to use it / trigger phrases] + [Key capabilities]
```

**Rules** (full details in `references/yaml-frontmatter.md`):
- MUST include what the skill does AND when to use it (trigger conditions)
- MUST be under 1024 characters
- MUST NOT contain XML tags (< or >)
- MUST include specific phrases a user might say
- SHOULD mention relevant file types if applicable

**Good — specific with trigger phrases:**
```yaml
description: Manages Linear project workflows including sprint
  planning, task creation, and status tracking. Use when user
  mentions "sprint", "Linear tasks", "project planning", or asks
  to "create tickets".
```

**Bad — vague, no triggers:**
```yaml
description: Helps with projects.
```

Present the draft description to the user and ask if it captures everything. Refine until they confirm.

### Step 4: Guide Through Details

Walk through each section step by step, asking targeted questions and drafting content as you go.

#### 4A: Main Instructions

Ask the user to describe the **workflow** the skill should follow. Probe with:

- "What's the first thing the agent should do when this skill is triggered?"
- "What decisions or branches does the workflow have?"
- "Are there any prerequisites or setup steps?"
- "What tools or MCP servers does it need to use?"

Structure answers into numbered steps. Each step MUST be **specific and actionable**.

**Good — concrete command with error handling:**
```markdown
### Step 1: Validate Input Data

Run `python scripts/validate.py --input {filename}` to check data format.
If validation fails, common issues include:
- Missing required fields (add them to the CSV)
- Invalid date formats (use YYYY-MM-DD)
```

**Bad — vague, no actionable detail:**
```markdown
### Step 1: Validate the data

Validate the data before proceeding.
```

For exhaustive guidance on writing instructions, consult `references/main-instructions.md`.
For workflow patterns, consult `references/workflows.md`.
For output templates and consistency patterns, consult `references/output-patterns.md`.

#### 4B: Examples

Ask the user for 1–3 common scenarios where this skill would be used. For each, document:

1. What the user says (trigger)
2. What actions the agent takes
3. What the expected result is

Format:
```markdown
### Example 1: [Scenario Name]

User says: "[trigger phrase]"

Actions:
1. [First action]
2. [Second action]

Result: [Expected outcome]
```

#### 4C: Troubleshooting

Ask: "What are the most common things that could go wrong?"

For each error case, document:
- The error message or symptom
- Why it happens
- How to fix it

Format:
```markdown
### Error: [Error message or symptom]

Cause: [Why it happens]
Solution: [How to fix it]
```

#### 4D: MCP Server Integration

Ask: "Does this skill interact with any MCP servers?"

If **yes**:
1. Add `mcp-server` to the YAML `metadata` section
2. Add `allowed-tools` to the YAML frontmatter if the skill should restrict tool access
3. Add MCP connection troubleshooting:

```markdown
### MCP Connection Failed

If you see "Connection refused":
1. Verify MCP server is running: Check Settings > Extensions
2. Confirm API key is valid
3. Try reconnecting: Settings > Extensions > [Service] > Reconnect
```

If **no**, skip this section entirely.

#### 4E: Supporting References

Ask: "Is there any supporting documentation, API guides, or reference material the agent should consult?"

If yes, note these files for inclusion in the `references/` directory during scaffolding.

If the user provides reference content directly, write it to the appropriate files. If they point to external docs, create placeholder reference files noting the source URL.

### Step 5: Scaffold Folder

Use the scaffolder script for deterministic setup:

```bash
python3 scripts/init_skill.py {skill-name} --path {output-directory}
```

Then tailor the generated folder structure to match actual needs:

```
{skill-name}/
├── SKILL.md
├── references/            # Always created by scaffolder; remove if unused
│   └── {reference files}
├── scripts/               # Always created by scaffolder; remove if unused
│   └── {script files}
└── assets/                # Always created by scaffolder; remove if unused
    └── {asset files}
```

Write the finalized SKILL.md with all sections assembled:
1. YAML frontmatter (name, description, optional fields)
2. Main instructions (numbered steps)
3. Examples section
4. Troubleshooting section

Then proceed to **Step 6: Validate**.

---

## Modify Flow

### Step 2: Locate Existing Skill

1. Check the current working directory for a `SKILL.md` file
2. If found, read the full `SKILL.md` and scan the folder structure (`references/`, `scripts/`, `assets/`)
3. If NOT found, ask the user for the path to their skill folder
4. If the path also has no `SKILL.md`, offer to create a new skill instead
5. Scan for misplaced files in the skill root: any `.md` files (other than `SKILL.md`) should be moved to `references/`, and any `.py`/`.sh`/`.bash` scripts should be moved to `scripts/`. Relocate them before proceeding.
6. Scan for non-allowed directories: only `references/`, `scripts/`, and `assets/` (plus hidden dotfile dirs like `.claude/`) are permitted in the skill root. If any other directory exists (e.g. `resources/`, `docs/`, `src/`, `templates/`), rename or merge it into the correct allowed directory. Common mappings:
   - `resources/`, `docs/`, `documentation/`, `guides/`, `ref/`, `refs/` → `references/`
   - `src/`, `source/`, `bin/`, `lib/`, `tools/`, `utils/` → `scripts/`
   - `static/`, `images/`, `img/`, `templates/`, `media/`, `files/`, `data/` → `assets/`
   If the target directory already exists, merge the contents. Then update any references in SKILL.md to point to the new paths.

Then proceed to **Step 6: Validate**.

---

## Validation and Iteration (Both Flows)

### Step 6: Validate

Run deterministic validation first, then the full checklist:

```bash
python3 scripts/quick_validate.py {path-to-skill-folder}
```

After script validation passes, run the **full validation checklist** against the skill for structural compliance and content quality.

#### Structural Checks

**1. YAML Frontmatter** (full rules in `references/yaml-frontmatter.md`):
- [ ] Has opening and closing `---` delimiters
- [ ] `name` field exists and is kebab-case
- [ ] `name` does not contain "claude" or "anthropic"
- [ ] `name` matches the skill folder name
- [ ] `description` field exists
- [ ] `description` is under 1024 characters
- [ ] `description` contains no XML tags (< or >)
- [ ] Optional fields (`license`, `allowed-tools`, `metadata`, `compatibility`) are correctly formatted if present

**2. Folder Structure** (full rules in `references/skill-file-structure.md`):
- [ ] `SKILL.md` file exists with exact casing (not `skill.md` or `SKILL.MD`)
- [ ] Skill folder name is kebab-case
- [ ] No `README.md` inside the skill folder
- [ ] No misplaced files in skill root (`.md` files belong in `references/`, scripts in `scripts/`)
- [ ] No non-allowed directories in skill root (only `references/`, `scripts/`, `assets/`, and hidden dotfile dirs are permitted)
- [ ] `references/` directory exists if referenced in instructions
- [ ] `scripts/` directory exists if scripts are referenced
- [ ] `assets/` directory exists if assets are referenced

**3. File References**:
- [ ] Every file path referenced in SKILL.md actually exists in the folder
- [ ] No broken references to `references/`, `scripts/`, or `assets/` files

#### Content Quality Checks

**4. Description Quality**:
- [ ] States what the skill does (an action, not just a noun)
- [ ] Includes trigger conditions ("Use when user says...")
- [ ] Includes specific user phrases, not generic categories
- [ ] Mentions file types if the skill handles specific files

**5. Instructions Quality** (full guidance in `references/main-instructions.md`):
- [ ] Instructions are broken into numbered/named steps
- [ ] Each step is specific and actionable (not vague like "handle the data")
- [ ] Steps include concrete commands, tool calls, or decision criteria where applicable
- [ ] Error handling is addressed for steps that can fail
- [ ] Progressive disclosure: core instructions in SKILL.md, detailed docs in `references/`

**6. Examples Quality**:
- [ ] At least one example scenario is included
- [ ] Each example shows: user trigger → actions taken → expected result
- [ ] Examples cover the most common use cases

**7. Troubleshooting Quality**:
- [ ] Common error cases are documented
- [ ] Each error has: symptom, cause, and solution
- [ ] MCP connection issues are covered (if MCP is used)

### Step 7: Iterate Until Clean

After running validation:

1. If ANY check fails, fix the issue automatically
2. Re-run the **full** validation checklist from Step 6
3. Repeat until all checks pass
4. Maximum 5 iterations — if still failing after 5 passes, stop and present remaining issues to the user

Do NOT present results to the user until all checks pass (or the 5-iteration limit is reached).

### Step 8: Package

When validation is clean, produce a distributable archive:

```bash
python3 scripts/package_skill.py {path-to-skill-folder} [optional-output-dir]
```

Packaging must fail closed: if validation fails, do not produce a `.skill` file.

### Step 9: Present Summary

Show the user:

1. **What was created/changed** — list of files created or modified
2. **What was caught and fixed** — list of validation issues found and how they were resolved (if any)
3. **Final validation status** — confirmation that all checks pass, or list of unresolved issues if the iteration limit was hit

---

## Examples

### Example 1: Creating a New Skill

User says: "Create a new skill for managing Notion projects"

Actions:
1. Ask for name and purpose → name: `notion-project-manager`, purpose: "manages Notion project boards and tasks"
2. Draft description with trigger phrases → "Manages Notion project boards... Use when user says 'create a Notion project', 'update board', 'add task to Notion'..."
3. User confirms description
4. Guide through instructions (steps for board creation, task management), examples, troubleshooting
5. Ask about MCP → user confirms Notion MCP server → add metadata and connection troubleshooting
6. Scaffold `notion-project-manager/` folder with SKILL.md and references/
7. Validate → find description missing file types → fix → re-validate → clean
8. Present summary: 1 folder created, 2 files written, 1 issue caught and fixed

Result: Complete `notion-project-manager/` folder with validated SKILL.md

### Example 2: Fixing an Existing Skill

User says: "Check my skill for issues"

Actions:
1. Detect SKILL.md in current working directory
2. Read SKILL.md and scan folder structure
3. Run validation — finds: description too vague (no triggers), no examples section, folder name uses underscores
4. Fix description to include trigger phrases, add examples section template, flag folder rename
5. Re-validate → still missing troubleshooting section → add it
6. Re-validate → clean
7. Present summary: 3 issues found and fixed, 1 manual action needed (folder rename)

Result: Updated SKILL.md passing all checks, user notified about folder rename

### Example 3: Creating a Skill with MCP Integration

User says: "Build a skill that uses the GitHub MCP server to automate PR workflows"

Actions:
1. Gather basics: name `github-pr-workflow`, purpose "automates GitHub PR creation and review workflows"
2. Draft description with GitHub-specific triggers
3. Guide through instructions for PR creation, review assignment, status checks
4. MCP question → yes, GitHub MCP → add `mcp-server: github` to metadata, add `allowed-tools`
5. Add MCP connection troubleshooting section
6. Scaffold folder
7. Validate and iterate until clean
8. Present summary

Result: `github-pr-workflow/` folder with MCP-aware SKILL.md including connection troubleshooting

---

## Troubleshooting

### User provides a vague skill purpose

If the user says something like "it helps with stuff":
1. Ask targeted follow-ups: "What specific tasks does it automate?", "What tools or services does it interact with?", "What would a user say to trigger this skill?"
2. Do not proceed to drafting until you have a clear, specific purpose

### SKILL.md not found in current directory

If auto-detection fails:
1. Ask the user for the full path to their skill folder
2. Verify the path exists and contains a SKILL.md
3. If still not found, offer to create a new skill instead

### Name conflicts with reserved words

If the user's chosen name contains "claude" or "anthropic":
1. Explain these are reserved names
2. Suggest an alternative that captures the same intent
3. Confirm before proceeding

### Validation loop hits iteration limit

If validation keeps finding new issues after 5 passes:
1. Stop iterating
2. Present the current state of the SKILL.md
3. List the remaining unresolved issues with suggested fixes
4. Ask the user how they'd like to proceed
