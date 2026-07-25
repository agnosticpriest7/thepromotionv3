/* CONCURRENT ROUTES: the Dale loyalty arc and the delegation gate at the same time.
   Both are AM->Manager routes. This drives Dale's arc through the REAL beats (offerDaleFavor +
   completeDaleFavor) AND completes real delegated jobs, then asserts what happens to the outstanding
   beats at the instant 12 clean completions promote Dale upstairs (delegMeritMet -> dalePromotedUp).

   LIVE BEHAVIOUR AS OF THIS TEST: the arc DEAD-ENDS SILENTLY — Dale (the manager NPC) is removed, so
   no further beat can be offered; dale.step freezes, dale.active stays true, dale.done stays false,
   nothing throws, and THE WAY UP still tells the player to "finish Dale's arc" they can no longer
   finish. This test documents that behaviour (a regression anchor); it is NOT an endorsement of it. */
const { createWorld } = require('./harness');
const w = createWorld({ seed: 7 }); w.startNewGame(0);
let f = 0; while (f < 1500) { w.run(30); f += 30; }   // warm past intro
const S = w.sandbox, G = w.g;
G.player.rank = 4;
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };
const daleAlive = () => G.NPCS.some(n => n.mgr && n.alive);

// drive one REAL Dale beat (he offers the authored step, you complete it)
function driveBeat() {
  if (G.dale.step >= 16 || !daleAlive()) return false;
  G.dale.todayCount = 0; G.dale.cooldown = 0; G.dale.offered = null;
  S.offerDaleFavor();
  if (G.dale.offered) { S.completeDaleFavor(); return true; }
  return false;
}
const wk = G.NPCS.find(n => S.isWorker(n) && n.alive && !n.gone); wk.ptype = 'zealot';
function driveOneClean() {
  const t = { id: ++G.deleg.seq, kind: 'grind', phase: 510, exp: G.clock, to: null, state: 'open' };
  G.deleg.q.push(t); S.delegAssign(t, wk); S.delegExpireDue();
}

// run both concurrently; leave beats 8..16 outstanding when the delegation gate fires
let snap = null, threw = null;
try {
  for (let i = 0; i < 20 && !G.career.mgrGone; i++) {
    if (G.dale.step < 8) driveBeat();
    const before = G.career.mgrGone;
    driveOneClean();
    if (!before && G.career.mgrGone) snap = { step: G.dale.step, active: G.dale.active, done: G.dale.done, titled: G.dale.titled, daleAlive: daleAlive() };
  }
} catch (e) { threw = e.message; }

ck('setup ran without throwing', threw === null, threw || '');
ck('the delegation gate fired (Dale promoted upstairs)', !!snap && G.career.mgrGone === true);
ck('the arc was genuinely mid-flight (some beats done, some outstanding)', !!snap && snap.step > 0 && snap.step < 16, snap ? `beat ${snap.step}/16` : 'no snapshot');
ck('Dale (the manager NPC) is gone at the gate', !!snap && snap.daleAlive === false);

// --- now probe what happens to the outstanding beats ---
const step0 = G.dale.step, done0 = G.dale.done, active0 = G.dale.active;
let advThrew = null, offered = false;
try { G.dale.todayCount = 0; G.dale.cooldown = 0; G.dale.offered = null; S.offerDaleFavor(); offered = !!G.dale.offered; } catch (e) { advThrew = e.message; }

const completesRemotely = G.dale.done && snap && !snap.done;
const hardStop = advThrew !== null || (active0 && !G.dale.active);   // errored, or the arc got explicitly cancelled
const deadEnd = !completesRemotely && !hardStop && G.dale.active && !G.dale.done && !offered && G.dale.step === step0;

ck('advancing the arc does not throw', advThrew === null, advThrew || '');
ck('no new beat can be offered (no live manager)', offered === false);
ck('the arc did NOT complete remotely (dale.done stays false)', G.dale.done === false);
ck('the arc is NOT hard-stopped/cancelled (dale.active stays true, step frozen)', G.dale.active === true && G.dale.step === step0);

// the player-visible tell: THE WAY UP still points at the now-impossible arc
G.player.rank = 5;
const ceo = S.ladderSteps();
const daleLine = ceo && ceo.steps.find(s => s.text && /Dale/.test(s.text) && /arc/.test(s.text) && !s.done);
ck('THE WAY UP still tells the player to finish an arc they cannot finish (the silent dead-end, visible)', !!daleLine, daleLine ? daleLine.text : 'not shown');

const verdict = completesRemotely ? 'COMPLETES REMOTELY' : hardStop ? 'HARD-STOP' : deadEnd ? 'DEAD-ENDS SILENTLY' : 'INDETERMINATE';
console.log(`\nLIVE BEHAVIOUR: ${verdict}  (arc frozen at beat ${step0}/16, active=${G.dale.active}, done=${G.dale.done}, Dale gone)`);
console.log(`DALE ARC vs DELEGATION GATE: ${fail === 0 ? 'documented ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
