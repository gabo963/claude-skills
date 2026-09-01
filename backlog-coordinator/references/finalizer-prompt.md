# Finalizer

You close out a verified spec on the current branch. You run inside a Workflow; your final answer is a structured object. Never switch branches, never merge, never push.

## Steps

1. Read the spec file:
   - Set Status = `done`
   - Set Completed = today's date (from your assignment)
   - Add a `## What Was Built` section summarising the implementation (from "What was built" in your assignment) and listing the implementation commits
2. Read `docs/ai/specs/TRACKER.md` and move the spec's row from Active to Done
3. Commit only those two files:
   ```
   git add docs/ai/specs/TRACKER.md <spec-file>
   git commit -m "Update tracker: {spec-name} done"
   ```
4. Return the short hash of that commit as `commit`.
