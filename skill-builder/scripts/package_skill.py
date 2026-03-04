#!/usr/bin/env python3

from __future__ import annotations

import sys
import zipfile
from pathlib import Path

from quick_validate import validate_skill


def package_skill(skill_dir: Path, output_dir: Path | None) -> Path:
    skill_dir = skill_dir.resolve()
    if not skill_dir.exists() or not skill_dir.is_dir():
        raise FileNotFoundError(f"Skill directory does not exist: {skill_dir}")

    ok, errors = validate_skill(skill_dir)
    if not ok:
        formatted = "\n".join(f"- {err}" for err in errors)
        raise ValueError(f"Validation failed:\n{formatted}")

    destination = (output_dir.resolve() if output_dir else Path.cwd())
    destination.mkdir(parents=True, exist_ok=True)
    archive = destination / f"{skill_dir.name}.skill"

    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as zf:
        for item in skill_dir.rglob("*"):
            if item.is_file():
                arcname = item.relative_to(skill_dir.parent)
                zf.write(item, arcname)

    return archive


def main(argv: list[str]) -> int:
    if len(argv) not in {2, 3}:
        print("Usage: scripts/package_skill.py <path-to-skill-folder> [output-directory]")
        return 1

    skill_dir = Path(argv[1])
    output_dir = Path(argv[2]) if len(argv) == 3 else None

    try:
        packaged = package_skill(skill_dir, output_dir)
    except Exception as exc:  # noqa: BLE001
        print(exc)
        return 1

    print(f"Packaged skill: {packaged}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
