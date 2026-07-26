/* ALLY COVER ANNOUNCE (branch: ally-cover-announce). Allies past ALLY_THRESHOLD already look away when
   you commit wrongdoing (workerSeesPlayer excludes them) — but it was invisible. Now the FIRST time an
   ally covers for you, they say so ("I didn't see anything") — once per person (transient
   _coveredForYou). It makes every favour already done feel purposeful. Hooked in witnessReact's
   no-hostile-witness path; no save changes. */
const { createWorld } = require('./harness');
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };
const w = createWorld({ seed: 7 }); w.startNewGame(0);
let f = 0; while (f < 1500) { w.run(30); f += 30; }
const S = w.sandbox, G = w.g;
const workers = () => G.NPCS.filter(n => S.isWorker(n) && n.alive && !n.gone);
// clear the stage: shove everyone far away, then place one subject right on top of the player (inside
// hearing radius, so inCone is true regardless of facing). Keeps HR and non-allies out of the cone.
function stage(subject, friend) {
  G.NPCS.forEach(n => { n.x = -99999; n.y = -99999; n.bubble = null; });
  subject.friend = friend; subject.x = G.player.x; subject.y = G.player.y; subject.wentHome = false; subject.gone = false; subject.alive = true;
}

// --- (1) an ally in the cone covers, and says so, once ---
{
  const a = workers()[0]; stage(a, 100); a._coveredForYou = false;
  const r = S.witnessReact();
  ck('witnessReact reports no hostile witness (an ally is not a threat)', r === false);
  ck('the ally is marked as having covered for you', a._coveredForYou === true);
  ck('the ally announces it (a bubble)', !!a.bubble);
  // a second commit near the same ally does NOT re-announce
  a.bubble = null;
  S.witnessReact();
  ck('once per person — a later commit near the same ally is silent', a.bubble === null);
}

// --- (2) a NON-ally in the cone catches you — no cover announcement ---
{
  const n = workers()[0]; stage(n, 0); n._coveredForYou = false;
  const r = S.witnessReact();
  ck('a non-ally catches you (witnessReact returns true)', r === true);
  ck('a non-ally is never marked as covering', !n._coveredForYou);
}

// --- (3) no ally in the cone — nothing happens ---
{
  G.NPCS.forEach(n => { n.x = -99999; n.y = -99999; n.bubble = null; });
  const before = workers().filter(n => n._coveredForYou).length;
  const r = S.witnessReact();
  ck('empty cone: no witness, no cover', r === false && workers().filter(n => n._coveredForYou).length === before);
}

// --- (4) HR seeing you short-circuits before any cover note ---
{
  const hr = G.NPCS.find(n => n.dept === 'hr' && n.alive);
  const ally = workers()[0];
  G.NPCS.forEach(n => { n.x = -99999; n.y = -99999; });
  ally.friend = 100; ally.x = G.player.x; ally.y = G.player.y; ally._coveredForYou = false;   // an ally IS present…
  if (hr) { hr.x = G.player.x; hr.y = G.player.y; }                                            // …but so is HR, on top of you
  const r = S.witnessReact();
  ck('HR seeing you takes precedence (returns true, ally cover not credited)', r === true && !ally._coveredForYou);
}

console.log(`\nALLY COVER ANNOUNCE: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
