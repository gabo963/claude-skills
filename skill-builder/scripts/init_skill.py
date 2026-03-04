#!/usr/bin/env python3
"""Initialize a skill directory with deterministic starter files."""

from __future__ import annotations

import re
import sys
from pathlib import Path


TEMPLATE_SKILL_MD = """---
name: {skill_name}
description: [TODO: Explain what this skill does. Include concrete trigger phrases for when to use it.]
---

# {skill_title}

# Instructions

### Step 1: [First Step]

[TODO: Add specific, actionable instructions.]

### Step 2: [Second Step]

[TODO: Add specific, actionable instructions.]

## Examples

### Example 1: [Common Scenario]

User says: "[trigger phrase]"

Actions:
1. [First action]
2. [Second action]

Result: [Expected outcome]

## Troubleshooting

### Error: [Common error]

Cause: [Why it happens]
Solution: [How to fix it]
"""

TEMPLATE_REFERENCE = """# Reference Notes

Store detailed documentation that should only be loaded when needed.
"""

TEMPLATE_SCRIPT = """#!/usr/bin/env python3
\"\"\"Example helper script. Replace or delete as needed.\"\"\"


def main() -> None:
    print("example helper")


if __name__ == "__main__":
    main()
"""

TEMPLATE_ASSET = """Placeholder asset file.

Store templates, boilerplate, or static resources in this directory.
"""


def _to_title(skill_name: str) -> str:
    return " ".join(part.capitalize() for part in skill_name.split("-"))


def _validate_skill_name(skill_name: str) -> str | None:
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", skill_name):
        return "Skill name must be kebab-case (lowercase letters, numbers, single hyphens)."
    if len(skill_name) > 64:
        return "Skill name must be 64 characters or fewer."
    if "claude" in skill_name or "anthropic" in skill_name:
        return "Skill name cannot contain reserved words 'claude' or 'anthropic'."
    return None


def init_skill(skill_name: str, output_root: Path) -> Path:
    error = _validate_skill_name(skill_name)
    if error:
        raise ValueError(error)

    skill_dir = output_root / skill_name
    if skill_dir.exists():
        raise FileExistsError(f"Skill directory already exists: {skill_dir}")

    skill_dir.mkdir(parents=True)
    (skill_dir / "scripts").mkdir()
    (skill_dir / "references").mkdir()
    (skill_dir / "assets").mkdir()

    skill_md = TEMPLATE_SKILL_MD.format(skill_name=skill_name, skill_title=_to_title(skill_name))
    (skill_dir / "SKILL.md").write_text(skill_md, encoding="utf-8")
    script_path = skill_dir / "scripts" / "example.py"
    script_path.write_text(TEMPLATE_SCRIPT, encoding="utf-8")
    script_path.chmod(0o755)
    (skill_dir / "references" / "guide.md").write_text(TEMPLATE_REFERENCE, encoding="utf-8")
    (skill_dir / "assets" / "README.txt").write_text(TEMPLATE_ASSET, encoding="utf-8")

    return skill_dir


def main(argv: list[str]) -> int:
    if len(argv) != 4 or argv[2] != "--path":
        print("Usage: scripts/init_skill.py <skill-name> --path <output-directory>")
        return 1

    skill_name = argv[1].strip()
    output_root = Path(argv[3]).resolve()

    try:
        created = init_skill(skill_name, output_root)
    except Exception as exc:  # noqa: BLE001
        print(f"Error: {exc}")
        return 1

    print(f"Created skill skeleton: {created}")
    print("Next: edit SKILL.md, then run scripts/quick_validate.py and scripts/package_skill.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
