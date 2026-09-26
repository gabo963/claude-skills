export const meta = {
  name: 'backlog-spec-pipeline',
  description: 'Implement backlog specs on the current branch: scope, slice, implement (file-segregated specs in parallel), compile-check, verify, commit, update TRACKER',
  phases: [
    { title: 'Scope', detail: 'readiness check + files each spec will touch' },
    { title: 'Slice', detail: 'slice plan per spec, overlap check' },
    { title: 'Implement', detail: 'one worker per slice, one commit per slice group' },
    { title: 'Compile', detail: 'build/typecheck with fix loop' },
    { title: 'Verify', detail: 'code review + browser check with fix loop' },
    { title: 'Finalize', detail: 'spec status, TRACKER.md, commit' },
  ],
}

// args: { specs: [{name, file}], branch, devUrl, today, skillDir, notes?, maxWorkers?, maxParallelSpecs?, model?, lowEffortModel? }
const { specs, branch, devUrl, today, skillDir } = args
const notes = args.notes || ''
const MAX_WORKERS = args.maxWorkers || 3          // concurrent workers across ALL specs
const MAX_PARALLEL_SPECS = args.maxParallelSpecs || 3
const M = args.model ? { model: args.model } : {}   // e.g. 'opus'; omit to inherit the session model
const LOW = args.lowEffortModel ? { model: args.lowEffortModel } : M // for effort:'low' bookkeeping agents; defaults to model
// Every agent goes through spawn(): it applies the model override (LOW for effort:'low') so no call site can forget it.
const spawn = (prompt, opts = {}) => agent(prompt, { ...(opts.effort === 'low' ? LOW : M), ...opts })
log(`model: ${args.model || 'inherit'}, low-effort model: ${args.lowEffortModel || args.model || 'inherit'}`)
const REFS = `${skillDir}/references`
const role = file => `Read ${REFS}/${file} first and follow it exactly. Then carry out the assignment below.`

// ---------- schemas ----------
const strings = { type: 'array', items: { type: 'string' } }
const SCOPE = {
  type: 'object', required: ['ready', 'reasons', 'files'],
  properties: { ready: { type: 'boolean' }, reasons: strings, files: strings },
}
const PLAN = {
  type: 'object', required: ['uiChanges', 'slices'],
  properties: {
    uiChanges: { type: 'boolean' },
    slices: { type: 'array', items: {
      type: 'object', required: ['id', 'name', 'files', 'instructions', 'skills', 'references', 'dependsOn'],
      properties: {
        id: { type: 'integer' }, name: { type: 'string' }, files: strings,
        instructions: { type: 'string' }, skills: strings, references: strings,
        dependsOn: { type: 'array', items: { type: 'integer' } },
      },
    } },
  },
}
const WORK = {
  type: 'object', required: ['status', 'filesChanged', 'summary', 'issues'],
  properties: {
    status: { enum: ['done', 'partial', 'blocked'] },
    filesChanged: strings, summary: { type: 'string' }, issues: strings,
  },
}
const COMMIT = { type: 'object', required: ['commit'], properties: { commit: { type: 'string' } } }
const COMPILE = {
  type: 'object', required: ['pass', 'commands', 'report'],
  properties: { pass: { type: 'boolean' }, commands: strings, report: { type: 'string' } },
}
const VERDICT = {
  type: 'object', required: ['verdict', 'issues', 'notes'],
  properties: {
    verdict: { enum: ['PASS', 'NEEDS_FIXES', 'FAIL'] },
    issues: { type: 'array', items: {
      type: 'object', required: ['severity', 'description', 'fix', 'files'],
      properties: { severity: { type: 'string' }, description: { type: 'string' }, fix: { type: 'string' }, files: strings },
    } },
    notes: { type: 'string' },
  },
}

// ---------- helpers ----------
function mutex() {
  let tail = Promise.resolve()
  return fn => {
    const run = tail.then(fn)
    tail = run.catch(() => {})
    return run
  }
}
function semaphore(n) {
  let active = 0
  const queue = []
  const next = () => { if (active < n && queue.length) { active++; queue.shift()() } }
  return fn => new Promise((resolve, reject) => {
    queue.push(() => fn().then(resolve, reject).finally(() => { active--; next() }))
    next()
  })
}
const withGit = mutex()          // every git write on the shared branch goes through here
const withBrowser = mutex()      // one browser verifier at a time
const workerSlot = semaphore(MAX_WORKERS)

const norm = p => p.replace(/^\.\//, '').replace(/\/+$/, '')
// a path overlaps another if equal, or one is a directory containing the other
const pathsOverlap = (a, b) => a === b || a.startsWith(b + '/') || b.startsWith(a + '/')
const setsOverlap = (as, bs) => as.some(a => bs.some(b => pathsOverlap(a, b)))

// Greedy: put each spec in the first batch (≤ MAX_PARALLEL_SPECS) whose files it does not touch; else open a new batch.
function batchSpecs(items) {
  const batches = []
  for (const it of items) {
    const b = batches.find(bk => bk.length < MAX_PARALLEL_SPECS && bk.every(o => !setsOverlap(o.files, it.files)))
    if (b) b.push(it); else batches.push([it])
  }
  return batches
}

// Order slices by dependsOn, then split each level so concurrently running slices never share a file.
function sliceGroups(slices) {
  const groups = []
  const placed = new Set()
  let remaining = slices.slice()
  while (remaining.length) {
    const level = remaining.filter(s => s.dependsOn.every(d => placed.has(d)))
    if (!level.length) throw new Error('cyclic or unknown slice dependencies: ' + remaining.map(s => s.id).join(','))
    const buckets = []
    for (const s of level) {
      const b = buckets.find(bk => bk.every(o => !setsOverlap(o.files, s.files)))
      if (b) b.push(s); else buckets.push([s])
    }
    groups.push(...buckets)
    level.forEach(s => placed.add(s.id))
    remaining = remaining.filter(s => !placed.has(s.id))
  }
  return groups
}

const envLine = devUrl ? `Dev environment: ${devUrl}` : 'Dev environment: not applicable'
const notesLine = notes ? `\nCoordinator notes: ${notes}` : ''
const list = files => files.map(f => `- ${f}`).join('\n')

function workerPrompt(spec, slice, peerCount, extra) {
  return `${role('worker-prompt.md')}

## Spec: ${spec.name}
Spec file: ${spec.file} (read only the sections your slice needs)
Branch: ${branch} (already checked out — never switch branches, never commit; a committer runs after you)
${envLine}

## Your slice: ${slice.id} — ${slice.name}
Files to create/modify (ONLY these):
${list(slice.files)}

Instructions:
${slice.instructions}

Skills to load (ONLY these): ${slice.skills.join(', ') || 'none'}
Reference files to read (ONLY these): ${['CLAUDE.md', ...slice.references].join(', ')}
${peerCount > 1 ? `\n${peerCount - 1} other worker(s) on this spec, and possibly workers on other specs, are editing DIFFERENT files on the same branch right now. Never touch a file outside your list.` : '\nWorkers on other specs may be editing DIFFERENT files on the same branch right now. Never touch a file outside your list.'}${notesLine}${extra || ''}`
}

function fixPrompt(spec, allowedFiles, issues, extra) {
  return `${role('worker-prompt.md')}

## Spec: ${spec.name}
Spec file: ${spec.file}
Branch: ${branch} (already checked out — never switch branches, never commit)
${envLine}

## Your slice: FIX — resolve the issues below
Files you may modify (ONLY these):
${list(allowedFiles)}

Issues to fix:
${issues}

Skills to load: only what the files above require.
Reference files to read (ONLY these): CLAUDE.md${notesLine}${extra || ''}`
}

async function runWorker(prompt, label) {
  let r = await spawn(prompt, { label, phase: 'Implement', schema: WORK })
  if (!r) {
    log(`${label}: worker died, spawning one replacement`)
    r = await spawn(prompt + `\n\nA previous worker on this slice died mid-way. Run git status and git diff on your files to see what is already done, then complete the rest.`,
      { label: `${label}:retry`, phase: 'Implement', schema: WORK })
  }
  return r
}

async function commit(spec, message, files, phaseName) {
  const uniq = [...new Set(files.map(norm))]
  if (!uniq.length) return null
  const r = await withGit(() => spawn(`You commit finished work on branch ${branch}. Do not switch branches, do not push, do not touch any other file, do not stage anything not listed.
Run: git add -- ${uniq.map(f => `'${f}'`).join(' ')}
Then: git commit -m ${JSON.stringify(message)}
If a listed file does not exist, drop it from the add. If nothing is staged, return commit = "none".
Return the short commit hash.`, { label: `commit:${spec.name}`, phase: phaseName, schema: COMMIT, effort: 'low' }))
  return r && r.commit !== 'none' ? r.commit : null
}

function fmtIssues(v) {
  return v.issues.map((i, n) => `${n + 1}. [${i.severity}] ${i.description}\n   Fix: ${i.fix}\n   Files: ${i.files.join(', ') || 'unspecified'}`).join('\n')
}

// ---------- stages ----------
async function scope(spec) {
  const s = await spawn(`${role('scope-prompt.md')}

Spec: ${spec.name}
Spec file: ${spec.file}
Branch: ${branch}${notesLine}`, { label: `scope:${spec.name}`, phase: 'Scope', schema: SCOPE, effort: 'low' })
  return s
}

async function slice(spec) {
  const plan = await spawn(`${role('slicer-prompt.md')}

Spec: ${spec.name}
Spec file: ${spec.file}
Branch: ${branch} (already checked out — never switch branches, never commit)
Files this spec is allowed to touch (from scoping; stay inside this set, or say so in instructions if impossible):
${list(spec.files)}${notesLine}`, { label: `slice:${spec.name}`, phase: 'Slice', schema: PLAN })
  return plan
}

async function markActive(spec) {
  await withGit(() => spawn(`Mark a backlog spec as started on branch ${branch}. Never switch branches, never push.
1. In ${spec.file} set Status = active and Owner = backlog-coordinator.
2. In docs/ai/specs/TRACKER.md move the row for ${spec.name} to the Active section.
3. git add docs/ai/specs/TRACKER.md ${spec.file} && git commit -m "Start ${spec.name}"
Return the short commit hash.`, { label: `start:${spec.name}`, phase: 'Implement', schema: COMMIT, effort: 'low' }))
}

// Implements all slices; returns the partial result object.
async function implement(spec, plan) {
  const result = { spec: spec.name, status: 'unknown', files: spec.files, commits: [], reason: '', summaries: [], uiChanges: plan.uiChanges }
  const groups = sliceGroups(plan.slices)
  log(`${spec.name}: ${plan.slices.length} slice(s) in ${groups.length} group(s)${plan.uiChanges ? ', UI changes' : ''}`)
  await markActive(spec)
  const incomplete = []
  for (const group of groups) {
    const outs = await parallel(group.map(s => () =>
      workerSlot(() => runWorker(workerPrompt(spec, s, group.length), `work:${spec.name}#${s.id}`))))
    group.forEach((s, i) => {
      const o = outs[i]
      if (o) result.summaries.push(`Slice ${s.id} (${s.name}): ${o.summary}`)
      if (!o || o.status !== 'done') incomplete.push(`slice ${s.id} ${s.name}: ${o ? o.status + ' — ' + o.issues.join('; ') : 'no result'}`)
    })
    const files = group.flatMap(s => s.files).concat(outs.filter(Boolean).flatMap(o => o.filesChanged))
    const c = await commit(spec, `${spec.name}: ${group.map(s => s.name).join(', ')}`, files, 'Implement')
    if (c) result.commits.push(c)
  }
  if (incomplete.length) return { ...result, status: 'needs-user', reason: 'incomplete slices — ' + incomplete.join(' | ') }
  return result
}

async function compileCheck(spec, allFiles) {
  return spawn(`${role('compile-check-prompt.md')}

Spec: ${spec.name}
Branch: ${branch}
Files this spec changed (errors here, or errors caused by this spec's diff, fail the check; errors elsewhere are informational):
${list(allFiles)}`, { label: `compile:${spec.name}`, phase: 'Compile', schema: COMPILE })
}

// Compile check → verify → finalize. Runs only after every spec in the batch finished implementing.
async function verifyAndFinalize(spec, plan, result) {
  const allFiles = [...new Set(plan.slices.flatMap(s => s.files).concat(spec.files))]

  for (let i = 0; ; i++) {
    const c = await compileCheck(spec, allFiles)
    if (!c) return { ...result, status: 'failed', reason: 'compile check agent returned nothing' }
    if (c.pass) break
    if (i === 2) return { ...result, status: 'needs-user', reason: 'compile check still failing after 2 fix cycles:\n' + c.report }
    log(`${spec.name}: compile check failed, fix cycle ${i + 1}`)
    const fix = await runWorker(fixPrompt(spec, allFiles, `Compilation/typecheck errors (commands: ${c.commands.join('; ')}):\n${c.report}`,
      '\n\nException to the file rule: if an error is in a file not listed above but is caused by this spec\'s changes (e.g. a caller of a changed signature), fix that file too and include it in filesChanged.'), `fix-compile:${spec.name}#${i + 1}`)
    const cm = await commit(spec, `${spec.name}: fix compile errors`, allFiles.concat(fix ? fix.filesChanged : []), 'Compile')
    if (cm) result.commits.push(cm)
  }

  const summary = result.summaries.join('\n')
  for (let i = 0; ; i++) {
    const [code, browser] = await parallel([
      () => spawn(`${role('verifier-code-prompt.md')}

Spec: ${spec.name}
Spec file: ${spec.file}
Branch: ${branch}
Files to review (ONLY these):
${list(allFiles)}

What was implemented:
${summary}${notesLine}`, { label: `verify-code:${spec.name}`, phase: 'Verify', schema: VERDICT }),
      () => plan.uiChanges ? withBrowser(() => spawn(`${role('verifier-playwright-prompt.md')}

Spec: ${spec.name}
Spec file: ${spec.file} (read only its Verification section)
${envLine}

What was implemented:
${summary}${notesLine}`, { label: `verify-browser:${spec.name}`, phase: 'Verify', schema: VERDICT })) : Promise.resolve({ verdict: 'PASS', issues: [], notes: 'no UI changes' }),
    ])
    if (!code || !browser) return { ...result, status: 'failed', reason: 'a verifier returned nothing' }
    const verdicts = [code, browser]
    result.verify = { code: code.verdict, browser: browser.verdict }
    if (verdicts.every(v => v.verdict === 'PASS')) break
    const issues = verdicts.flatMap(v => v.issues)
    const text = verdicts.map((v, n) => `${n === 0 ? 'Code review' : 'Browser check'} (${v.verdict}): ${v.notes}\n${fmtIssues(v)}`).join('\n\n')
    if (verdicts.some(v => v.verdict === 'FAIL')) return { ...result, status: 'needs-user', reason: 'verifier FAIL:\n' + text }
    if (issues.length >= 3) return { ...result, status: 'needs-user', reason: `${issues.length} issues found (3+ needs a decision):\n` + text }
    if (i === 2) return { ...result, status: 'needs-user', reason: 'still NEEDS_FIXES after 2 fix cycles:\n' + text }
    log(`${spec.name}: verification needs fixes, fix cycle ${i + 1}`)
    const fixScope = [...new Set(allFiles.concat(issues.flatMap(x => x.files)))]
    const fix = await runWorker(fixPrompt(spec, fixScope, text), `fix-verify:${spec.name}#${i + 1}`)
    const cm = await commit(spec, `${spec.name}: address review findings`, fixScope.concat(fix ? fix.filesChanged : []), 'Verify')
    if (cm) result.commits.push(cm)
  }

  const fin = await withGit(() => spawn(`${role('finalizer-prompt.md')}

Spec: ${spec.name}
Spec file: ${spec.file}
Branch: ${branch} (never switch branches, never push)
Today: ${today}
Implementation commits: ${result.commits.join(', ') || 'none'}

What was built:
${summary}${notesLine}`, { label: `finalize:${spec.name}`, phase: 'Finalize', schema: COMMIT, effort: 'low' }))
  if (!fin) return { ...result, status: 'failed', reason: 'finalizer returned nothing' }
  result.commits.push(fin.commit)
  return { ...result, status: 'done' }
}

// ---------- main ----------
const results = []
const fail = (spec, status, reason) => results.push({ spec: spec.name, status, reason, files: spec.files || [], commits: [] })

// Scope every spec: readiness + file set. Barrier is genuine — batching needs all file sets.
const scopes = await parallel(specs.map(sp => () => scope(sp)))
const runnable = []
specs.forEach((sp, i) => {
  const s = scopes[i]
  if (!s) fail(sp, 'failed', 'scope agent returned nothing' + (LOW.model ? ` (model '${LOW.model}' may have been rejected — see the run's journal.jsonl)` : ''))
  else if (!s.ready) fail(sp, 'skipped', 'not ready: ' + s.reasons.join('; '))
  else runnable.push({ ...sp, files: s.files.map(norm) })
})

const queue = batchSpecs(runnable)
log(`${runnable.length} runnable spec(s) in ${queue.length} batch(es): ${queue.map(b => '[' + b.map(s => s.name).join(', ') + ']').join(' → ')}`)

while (queue.length) {
  const batch = queue.shift()
  log(`=== batch: ${batch.map(s => s.name).join(', ')} ===`)

  // Slice every spec in the batch, then re-check overlap on the ACTUAL slice files.
  const plans = await parallel(batch.map(sp => () => slice(sp)))
  const kept = [], deferred = []
  batch.forEach((sp, i) => {
    const plan = plans[i]
    if (!plan) return fail(sp, 'failed', 'slicer returned nothing')
    if (!plan.slices.length) return fail(sp, 'failed', 'slicer produced zero slices')
    const files = [...new Set(plan.slices.flatMap(s => s.files.map(norm)).concat(sp.files))]
    const item = { ...sp, files, plan }
    if (kept.every(k => !setsOverlap(k.files, files))) kept.push(item)
    else deferred.push({ ...sp, files })   // re-sliced later against the updated tree
  })
  if (deferred.length) {
    log(`deferred (slice files overlap a spec in this batch): ${deferred.map(s => s.name).join(', ')}`)
    queue.unshift(...batchSpecs(deferred))
  }
  if (!kept.length) continue

  // Implement all kept specs concurrently (disjoint files, shared worker cap, serialized git).
  const partials = await parallel(kept.map(sp => () => implement(sp, sp.plan).catch(e => ({ spec: sp.name, status: 'failed', reason: String(e && e.message || e), files: sp.files, commits: [] }))))

  // Barrier: verify only once the batch's tree is fully implemented, so compile errors are attributable by file.
  const finals = await parallel(kept.map((sp, i) => () => {
    const p = partials[i]
    if (!p || p.status !== 'unknown') return Promise.resolve(p || { spec: sp.name, status: 'failed', reason: 'implement returned nothing', files: sp.files, commits: [] })
    return verifyAndFinalize(sp, sp.plan, p).catch(e => ({ ...p, status: 'failed', reason: String(e && e.message || e) }))
  }))
  finals.forEach((r, i) => {
    const out = r || { spec: kept[i].name, status: 'failed', reason: 'no result', files: kept[i].files, commits: [] }
    results.push(out)
    log(`${out.spec}: ${out.status}${out.reason ? ' — ' + out.reason.split('\n')[0] : ''}`)
  })
}

return { branch, results }
