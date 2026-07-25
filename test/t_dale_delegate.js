/* CONCURRENT ROUTES: the Dale loyalty arc and the delegation gate at the same time. Both are
   AM->Manager routes. This drives Dale's arc through the REAL beats (offerDaleFavor + completeDaleFavor)
   AND completes real delegated jobs, then asserts what happens to the outstanding beats at the instant
   12 clean completions promote Dale upstairs (delegMeritMet -> dalePromotedUp -> npcLeaving).

   BEHAVIOUR AFTER THE npc-leaving-sweep: the arc now CLOSES GRACEFULLY. When Dale is removed, the
   npcLeaving() hook closes the loyalty road with a feed line (dale.active -> false), THE WAY UP stops
   telling the player to finish it, and — critically — there is NO consolation payout (dale.done stays
   false, no vpFavor), so the collision never becomes a CEO shortcut. Dale's richer "hold the gate and
   choose" treatment (D) will layer on top of this cheap default later. (Was: DEAD-ENDS SILENTLY.) */
const { createWorld } = require('./harness');
const w = createWorld({ seed: 7 }); w.startNewGame(0);
let f = 0; while (f < 1500) { w.run(30); f += 30; }   // warm past intro
const S = w.sandbox, G = w.g;
G.player.rank = 4;
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };
const daleAlive = () => G.NPCS.some(n => n.mgr && n.alive);

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
let snap = null, threw = null, vpAtGate = null;
try {
  for (let i = 0; i < 20 && !G.career.mgrGone; i++) {
    if (G.dale.step < 8) driveBeat();
    const before = G.career.mgrGone;
    driveOneClean();
    if (!before && G.career.mgrGone) { snap = { step: G.dale.step, active: G.dale.active, done: G.dale.done }; vpAtGate = G.career.vpFavor; }
  }
} catch (e) { threw = e.message; }

ck('setup ran without throwing', threw === null, threw || '');
ck('the delegation gate fired (Dale promoted upstairs)', !!snap && G.career.mgrGone === true);
ck('the arc was genuinely mid-flight (8 of 16 beats done)', !!snap && snap.step === 8, snap ? `beat ${snap.step}/16` : 'no snapshot');
ck('Dale (the manager NPC) is gone at the gate', !daleAlive());

// the sweep closed the arc gracefully
ck('the arc is CLOSED (dale.active -> false), not left dangling', G.dale.active === false);
ck('the close does NOT complete the arc remotely (dale.done stays false)', G.dale.done === false);
ck('the close pays out NO CEO key (vpFavor unchanged — collision is not a shortcut)', vpAtGate === 0 && G.career.vpFavor === 0, 'vpFavor=' + G.career.vpFavor);

// no further beat can be offered, and it does not throw
let advThrew = null, offered = false;
try { G.dale.todayCount = 0; G.dale.cooldown = 0; G.dale.offered = null; S.offerDaleFavor(); offered = !!G.dale.offered; } catch (e) { advThrew = e.message; }
ck('no new beat can be offered (no live manager), and it does not throw', offered === false && advThrew === null, advThrew || '');

// THE WAY UP no longer tells the player to finish an arc they cannot finish
G.player.rank = 5;
const ceo = S.ladderSteps();
const stillPointing = ceo && ceo.steps.find(s => s.text && /Finish Dale's arc/.test(s.text));
ck('THE WAY UP no longer tells the player to finish the impossible arc', !stillPointing, stillPointing ? stillPointing.text : 'gone');

console.log(`\nDALE ARC vs DELEGATION GATE: closes gracefully ${fail === 0 ? '✅' : '❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
