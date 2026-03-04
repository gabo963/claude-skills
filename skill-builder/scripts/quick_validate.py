#!/usr/bin/env python3
"""Quick, deterministic validation for a skill folder."""

from __future__ import annotations

import re
import sys
from pathlib import Path


ALLOWED_KEYS = {
    "name",
    "description",
    "license",
    "allowed-tools",
    "metadata",
    "compatibility",
}

PATH_PREFIXES = ("references/", "scripts/", "assets/")
ALLOWED_DIRS = {"references", "scripts", "assets"}

# Map common misnomers to the correct directory name
DIR_SUGGESTIONS: dict[str, str] = {
    "docs": "references",
    "doc": "references",
    "documentation": "references",
    "resources": "references",
    "ref": "references",
    "refs": "references",
    "guides": "references",
    "src": "scripts",
    "source": "scripts",
    "bin": "scripts",
    "lib": "scripts",
    "tools": "scripts",
    "utils": "scripts",
    "static": "assets",
    "images": "assets",
    "img": "assets",
    "templates": "assets",
    "media": "assets",
    "files": "assets",
    "data": "assets",
}


def _extract_frontmatter(content: str) -> str:
    match = re.match(r"^---\n(.*?)\n---\n?", content, re.DOTALL)
    if not match:
        raise ValueError("Missing or malformed YAML frontmatter delimiters")
    return match.group(1)


def _parse_frontmatter_loose(frontmatter: str) -> dict[str, str]:
    data: dict[str, str] = {}
    current_key: str | None = None
    current_value_lines: list[str] = []

    def flush() -> None:
        nonlocal current_key, current_value_lines
        if current_key is not None:
            data[current_key] = "\n".join(current_value_lines).strip()
        current_key = None
        current_value_lines = []

    for raw_line in frontmatter.splitlines():
        if not raw_line.strip() or raw_line.lstrip().startswith("#"):
            continue

        is_top_level = raw_line[:1] not in {" ", "\t"} and ":" in raw_line
        if is_top_level:
            flush()
            key, value = raw_line.split(":", 1)
            current_key = key.strip()
            current_value_lines = [value.strip()]
        elif current_key is not None:
            current_value_lines.append(raw_line.strip())

    flush()
    return data


def _normalize_path_token(raw: str) -> str | None:
    token = raw.strip().strip("<>").strip('"\'`')
    token = token.rstrip(",.;:)")
    if not token:
        return None
    if "{" in token or "}" in token:
        return None
    if "://" in token:
        return None
    token = token.split("#", 1)[0].split("?", 1)[0]
    if not token.startswith(PATH_PREFIXES):
        return None
    return token


def _extract_referenced_paths(content: str) -> set[str]:
    found: set[str] = set()

    for raw in re.findall(r"\[[^\]]+\]\(([^)]+)\)", content):
        token = _normalize_path_token(raw)
        if token:
            found.add(token)

    for raw in re.findall(r"`([^`]+)`", content):
        token = _normalize_path_token(raw)
        if token:
            found.add(token)

    return found


def validate_skill(skill_dir: Path) -> tuple[bool, list[str]]:
    errors: list[str] = []

    if not skill_dir.exists() or not skill_dir.is_dir():
        return False, [f"Skill directory does not exist: {skill_dir}"]

    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        errors.append("SKILL.md not found")
        return False, errors

    if (skill_dir / "README.md").exists():
        errors.append("README.md should not exist in a skill folder")

    # Detect non-allowed directories in the skill root
    for entry in sorted(skill_dir.iterdir()):
        if not entry.is_dir() or entry.name.startswith("."):
            continue
        if entry.name not in ALLOWED_DIRS:
            suggestion = DIR_SUGGESTIONS.get(entry.name.lower())
            if suggestion:
                errors.append(
                    f"Non-allowed directory '{entry.name}/' in skill root"
                    f" — rename to {suggestion}/"
                )
            else:
                errors.append(
                    f"Non-allowed directory '{entry.name}/' in skill root"
                    f" — only references/, scripts/, and assets/ are permitted"
                )

    # Detect misplaced files in the skill root
    SCRIPT_EXTENSIONS = {".py", ".sh", ".bash"}
    IGNORED_ROOT_FILES = {"SKILL.md", "README.md", "LICENSE"}
    for entry in sorted(skill_dir.iterdir()):
        if entry.is_dir() or entry.name.startswith("."):
            continue
        if entry.name in IGNORED_ROOT_FILES:
            continue
        if entry.suffix == ".md":
            errors.append(
                f"Misplaced file '{entry.name}' in skill root — move to references/"
            )
        elif entry.suffix in SCRIPT_EXTENSIONS:
            errors.append(
                f"Misplaced file '{entry.name}' in skill root — move to scripts/"
            )

    content = skill_md.read_text(encoding="utf-8")
    try:
        fm_text = _extract_frontmatter(content)
    except ValueError as exc:
        return False, [str(exc)]

    fm = _parse_frontmatter_loose(fm_text)

    missing = [k for k in ("name", "description") if k not in fm]
    if missing:
        errors.append(f"Missing required frontmatter field(s): {', '.join(missing)}")

    unexpected = sorted(set(fm.keys()) - ALLOWED_KEYS)
    if unexpected:
        errors.append(
            "Unexpected frontmatter key(s): "
            + ", ".join(unexpected)
            + ". Allowed keys: "
            + ", ".join(sorted(ALLOWED_KEYS))
        )

    name = fm.get("name", "")
    if name:
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name):
            errors.append("name must be kebab-case with lowercase letters, numbers, and single hyphens")
        if "claude" in name or "anthropic" in name:
            errors.append("name cannot contain reserved words 'claude' or 'anthropic'")
        if len(name) > 64:
            errors.append("name must be 64 characters or fewer")
        if name != skill_dir.name:
            errors.append(f"name must match folder name: expected '{skill_dir.name}', got '{name}'")

    description = fm.get("description", "")
    if description:
        if len(description) > 1024:
            errors.append("description must be 1024 characters or fewer")
        if "<" in description or ">" in description:
            errors.append("description cannot contain '<' or '>'")
        if len(description) < 20:
            errors.append("description is too short to be useful; include what it does and trigger phrases")

    body = re.sub(r"^---\n.*?\n---\n?", "", content, flags=re.DOTALL)
    for required_section in ("## Examples", "## Troubleshooting"):
        if required_section not in body:
            errors.append(f"Missing required section: {required_section}")

    referenced_paths = sorted(_extract_referenced_paths(body))
    for ref in referenced_paths:
        full_path = skill_dir / ref
        if not full_path.exists():
            errors.append(f"Referenced path does not exist: {ref}")

    return len(errors) == 0, errors


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("Usage: scripts/quick_validate.py <path-to-skill-folder>")
        return 1

    path = Path(argv[1]).resolve()
    ok, errors = validate_skill(path)
    if ok:
        print("Validation passed")
        return 0

    print("Validation failed:")
    for err in errors:
        print(f"- {err}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
