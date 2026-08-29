/* MUTATION RUNNER — apply a deliberate defect, run a test, report whether the test noticed.
   Not part of the gate rotation (it is not a t_*.js). It rewrites index.html, so it must NEVER
   run alongside the gate.

       node test/mutate.js path/to/mutants.json

   ⚠️ THIS TOOL HAS LIED TWICE, BOTH TIMES THE SAME WAY: it inferred a result from OUTPUT TEXT
   instead of reading the actual signal.
     1. It scanned stdout for lines containing FAIL and reported a suite-KILLING mutation as
        SURVIVED, because a test that dies produces no FAIL line at all.
     2. Fixed to use the exit code for the VERDICT, it still built the DESCRIPTION from text, so a
        clean assertion failure whose output line did not start with "FAIL" was announced as
        "the test THREW: (no stderr)". The verdict was right and the description was fiction.
   A wrong description costs an hour of chasing the wrong thing at 2am, which is the entire value
   this tool is supposed to provide. So every outcome below is decided by a SIGNAL — exit code,
   timeout, or the presence of a real stack trace in stderr — and never by prose matching.

   ⚠️ AND IT ALWAYS RESTORES index.html, including on timeout, throw, or Ctrl-C. A killed run that
   leaves a mutant in the working tree has happened, and the next thing you do is measure it. */
'use strict';
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO = path.join(__dirname, '..');
const IDX  = path.join(REPO, 'index.html');

/* a real Node stack frame, which is what distinguishes "threw" from "exited non-zero on purpose".
   process.exit(1) writes nothing to stderr; an uncaught throw writes a stack. */
const STACK = /^\s+at \S/m;
const ERRLINE = /^[A-Za-z]*Error\b/m;

function describe(res) {
  if (res.timedOut) return { verdict: 'CAUGHT', kind: 'hung', note: 'no output within the timeout' };
  if (res.status === 0) return { verdict: 'SURVIVED', kind: 'passed', note: 'the test did not notice' };
  const err = res.stderr || '';
  if (STACK.test(err) || ERRLINE.test(err)) {
    const line = err.trim().split('\n').find(l => ERRLINE.test(l)) || err.trim().split('\n')[0];
    return { verdict: 'CAUGHT', kind: 'threw', note: line.slice(0, 140) };
  }
  return { verdict: 'CAUGHT', kind: 'failed', note: 'exited ' + res.status + ' with no stack — a clean assertion failure' };
}

/* the test's own failure lines, for a human. Informational only: nothing here decides anything. */
function failureLines(stdout) {
  return (stdout || '').split('\n')
    .filter(l => /\bFAIL\b|RED ❌/.test(l))
    .map(l => l.trim()).slice(0, 8);
}

/* ⚠️ INDEX.HTML IS CRLF IN THE WORKING TREE (core.autocrlf), AND A MUTANT SPEC IS WRITTEN WITH
   \n. So every anchor spanning more than one line matched ZERO times, and three of the four
   self-test cases came back NOT APPLIED while the single-line one worked perfectly. The tool was
   not wrong -- it refused to guess, which is the whole point -- but "anchor matched 0 times" for
   a mutation whose only problem is line endings is a true statement that sends you to the wrong
   place, and that is the same sin as a wrong description. So: match in the file's OWN convention,
   and if it still will not match, say which of the two reasons it was. */
function eolOf(src) { return /\r\n/.test(src) ? '\r\n' : '\n'; }
function toEol(text, eol) { return text.replace(/\r\n/g, '\n').replace(/\n/g, eol); }

function runMutant(good, test, name, oldText, newText, timeoutMs) {
  fs.copyFileSync(good, IDX);
  try {
    const src = fs.readFileSync(IDX, 'utf8');
    const eol = eolOf(src);
    const anchor = toEol(oldText, eol), replacement = toEol(newText, eol);
    const hits = src.split(anchor).length - 1;
    if (hits !== 1) {
      /* was it the line endings, or is the anchor simply not in the file? Answer it, rather than
         leaving a bare number the reader has to guess at. */
      const naive = src.split(oldText).length - 1;
      console.log('--- MUTANT: ' + name);
      console.log('  => NOT APPLIED  (anchor matched ' + hits + ' times, needs exactly 1)');
      if (hits === 0 && /\n/.test(oldText) && naive === 0)
        console.log('     the file is ' + (eol === '\r\n' ? 'CRLF' : 'LF') + ' and the anchor was normalised to it,' +
                    ' so this is a genuine miss and not line endings');
      console.log('');
      return 'NOT APPLIED';
    }
    fs.writeFileSync(IDX, src.replace(anchor, replacement), 'utf8');
    const res = spawnSync('node', [path.join(__dirname, test)],
      { cwd: REPO, encoding: 'utf8', timeout: timeoutMs || 900000, maxBuffer: 64 * 1024 * 1024 });
    const timedOut = res.error && res.error.code === 'ETIMEDOUT';
    const d = describe({ status: res.status, stderr: res.stderr, timedOut });
    console.log('--- MUTANT: ' + name);
    failureLines(res.stdout).forEach(l => console.log('  ' + l));
    console.log('  => ' + d.verdict + ' (' + d.kind + ')  ' + d.note);
    console.log('');
    return d.verdict + ':' + d.kind;
  } finally {
    fs.copyFileSync(good, IDX);          // ALWAYS, even on throw
  }
}

if (require.main === module) {
  const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  /* THE PRISTINE COPY IS TAKEN HERE, NOT SUPPLIED. A spec used to name its own `good` file, which
     means a spec written last week restores LAST WEEK'S index.html over the live one when it
     finishes -- the runner would hand you a stale build as its final act, and the next thing you
     do is measure it. Snapshot what is actually on disk right now instead. A spec may still name
     `good` to pin a specific baseline, but it gets told when that differs from the live file. */
  const good = path.join(os.tmpdir(), 'mutate_pristine_' + process.pid + '.html');
  fs.copyFileSync(spec.good || IDX, good);
  if (spec.good && fs.readFileSync(spec.good, "utf8") !== fs.readFileSync(IDX, "utf8"))
    console.log("!! spec.good differs from the live index.html -- this run will END with "
                + "the copy the spec names in place, not the one on disk now.");
  console.log('=== BASELINE ===');
  for (const t of [...new Set(spec.mutants.map(m => m.test))]) {
    const r = spawnSync('node', [path.join(__dirname, t)], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    console.log('  ' + t + '  exit=' + r.status + (r.status === 0 ? '  (green, as required before any mutant means anything)' : '  <-- NOT GREEN, fix this first'));
  }
  console.log('');
  const results = [];
  for (const m of spec.mutants) results.push([m.name, runMutant(good, m.test, m.name, m.old, m.new, m.timeoutMs)]);
  console.log('=== SUMMARY ===');
  results.forEach(([n, r]) => console.log('  ' + String(r).padEnd(20) + n));
  try { fs.unlinkSync(good); } catch (e) {}
  process.exitCode = 0;                  // an instrument, not a gate
}
module.exports = { runMutant, describe };
