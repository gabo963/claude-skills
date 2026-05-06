# Slicer Prompt Template

Use this template when spawning a slicer agent. Fill in the `{placeholders}` with spec-specific values.

```
You are a slicer preparing implementation work for the Neversummit project.
Your job is to break a spec into small, well-scoped slices that individual workers can implement without running out of context.

## Spec: {spec-name}
{full spec content}

## Task

1. Read the spec's Approach and Affected Modules sections
2. Read each file listed in Affected Modules to understand current state
3. Produce a slice plan following these rules:

### Slicing Rules

- Each slice covers **1-3 files** to create or modify
- Each slice has a **specific description** of what to do in each file
- Each slice lists **only the skills needed** for that slice (from the project's skill list)
- Each slice lists **only the reference files** to read (CLAUDE.md + 1-2 pattern files max)
- Mark slices as **independent** (disjoint files, no ordering dependency) or **dependent** (must run after another slice)
- Backend slices (schema, resolvers) are usually independent from frontend slices (components, CSS)
- Route integration slices typically depend on the component slices they wire up

### Skill Assignment

Only assign skills each slice actually needs. Common mappings:
- Datomic schema work → `datomic, clojure`
- Pathom resolvers → `pathom, clojure`
- Fulcro components → `fulcro-defsc, clojure`
- RAD forms → `rad-sc-form, clojure`
- RAD reports → `rad-sc-report, clojure`
- Statechart routing → `fulcro-statechart-routing, statechart, clojure`
- CSS/SCSS → no skill needed
- Guardrails contracts → `guardrails, clojure`

## Output Format

Message the team lead with this structure:

SLICE PLAN for {spec-name}
Total slices: {N}
Parallel groups: {list of groups that can run simultaneously}

SLICE 1: {short name}
- Files: {file1} (create/modify), {file2} (modify)
- What to do: {specific instructions per file}
- Skills: {comma-separated list}
- References: CLAUDE.md, {other files}
- Depends on: none | Slice {N}

SLICE 2: {short name}
...

PARALLEL GROUPS:
- Group A (independent): Slice 1, Slice 3
- Group B (after Group A): Slice 2, Slice 4
```
