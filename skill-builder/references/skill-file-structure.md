This file explains how a skill folder should be structured.

```
your-skill-name/
├── SKILL.md              # Required - main skill file
├── scripts/              # Optional - executable code
│   ├── process_data.py   # Example
│   └── validate.sh       # Example
├── references/           # Optional - documentation
│   ├── api-guide.md      # Example
│   └── examples/         # Example
└── assets/               # Optional - templates, etc.
    └── report-template.md # Example
```

## SKILL.md Naming

- Must be exactly SKILL.md (case-sensitive)
- No variations accepted (SKILL.MD, skill.md, etc.)

## Skill Folder Naming

- Use kebab-case: `notion-project-setup` (good)
- No spaces: `Notion Project Setup` (bad)
- No underscores: `notion_project_setup` (bad)
- No capitals: `NotionProjectSetup` (bad)

## No README.md

- Don't include README.md inside your skill folder
- All documentation goes in SKILL.md or references/
- Note: when distributing via GitHub, you'll still want a repo-level README for human users — but it must live at the repository root, outside the skill folder.

## Allowed Directories

Only these directories are permitted in the skill root:

| Directory | Purpose |
|---|---|
| `references/` | Documentation, guides, reference material |
| `scripts/` | Executable code (`.py`, `.sh`, `.bash`) |
| `assets/` | Templates, images, other static files |

Hidden directories (starting with `.`, e.g. `.claude/`) are also allowed.

**No other directories are permitted.** Common mistakes include using `resources/`, `docs/`, `src/`, `templates/`, etc. These must be renamed or merged into the correct allowed directory above.

## File Placement Rules

Only `SKILL.md` should live in the skill root directory. All other files belong in subdirectories:

| File type | Belongs in | Examples |
|---|---|---|
| `.md` documentation | `references/` | `api-guide.md`, `conventions.md` |
| `.py`, `.sh`, `.bash` scripts | `scripts/` | `validate.py`, `setup.sh` |
| Templates, images, other assets | `assets/` | `report-template.md`, `logo.png` |

Files that may stay in the root: `SKILL.md`, `LICENSE`, dotfiles (`.gitignore`, etc.).
