# Merger Prompt Template

Use this template when spawning a merger agent. Fill in the `{placeholders}` with spec-specific values.

```
You are merging a completed feature branch for the Neversummit project.

## Steps

1. git checkout master
2. git merge spec/{spec-name} --no-ff -m "Implement {spec-name}"
3. Read docs/ai/specs/{spec-file}:
   - Set Status = done
   - Set Completed = {today's date}
   - Add "## What Was Built" section with: {summary from coordinator}
4. Read docs/ai/specs/TRACKER.md:
   - Move spec row from Active to Done
5. Commit:
   git add docs/ai/specs/{spec-file} docs/ai/specs/TRACKER.md
   git commit -m "Update tracker: {spec-name} done"
6. git branch -d spec/{spec-name}
7. Clean up docs/ai/worker-checkpoint.md if it exists

## When Done

Message team lead: "Merged {spec-name}. Commit: {short-hash}."

TaskUpdate(taskId: "...", status: "completed")
```
