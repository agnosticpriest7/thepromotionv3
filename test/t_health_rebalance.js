/* BRANCH HEALTH REBALANCE (branch: health-rebalance). Health now reads as HOW WELL THE FLOOR RUNS,
   not how much everyone likes you: low average stress lifts it, and the stressed tail, feuds, empty
   desks, and mistakes pull it down. Friendship is no longer measured — it became leverage. These
   tests assert the BEHAVIOR (move each input in isolation, watch the score respond), not the formula. */
const { createWorld } = require('./harness');
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };
const w = createWorld({ seed: 7 }); w.startNewGame(0);
let f = 0; while (f < 1500) { w.run(30); f += 30; }
const S = w.sandbox, G = w.g;
const ws = () => G.NPCS.filter(n => S.isWorker(n) && n.alive && !n.gone);
const H = () => S.branchHealth();
const setAll = (k, v) => ws().forEach(n => n[k] = v);
const calm = () => { setAll('stress', 12); setAll('mood', 0); setAll('friend', 0); ws().forEach(n => n.feudWith = null); ws().forEach(n => n.strikes = 0); G.career.revenue = 0; };

// ---- PART A: what health MEASURES ----
calm();
ck('breakdown reconstructs branchHealth', S.healthBreakdown().health === H());
ck('a calm, full, feud-free floor scores well on its own (no friendship)', H() >= 72, 'health=' + H());

// STRESS is the dominant lever
calm(); setAll('stress', 5); const lowS = H();
calm(); setAll('stress', 85); const hiS = H();
ck('LOW stress scores much higher than HIGH stress (stress is the engine)', lowS - hiS >= 25, `${lowS} vs ${hiS} (Δ${lowS - hiS})`);

// each operational problem pulls DOWN
calm(); const clean = H();
{ calm(); const a = ws()[0], b = ws()[1]; a.feudWith = b.name; b.feudWith = a.name; ck('an active feud lowers health', H() < clean, `${clean}->${H()}`); }
{ calm(); ws()[0].strikes = 3; ck('mistakes (strikes) lower health', H() < clean, `${clean}->${H()}`); }
{ calm(); const d = G.desks.find(x => x.owner && x.owner !== 'you' && !x.mgrOffice && !x.reserved && !x.retired); d.owner = null; ck('an unfilled desk lowers health', H() < clean); }
{ calm(); G.today.meltdowns = 1; ck('a meltdown lowers health', H() < clean); G.today.meltdowns = 0; }
{ calm(); G.today.fired.push('X'); ck('a walkout lowers health', H() < clean); G.today.fired.pop(); }

// friendship and mood are NO LONGER measured
{ calm(); const h = H(); setAll('friend', 100); ck('making everyone an ally does NOT change health', H() === h, `${h}->${H()}`); }
{ calm(); const h = H(); setAll('mood', 100); const up = H(); setAll('mood', -100); const dn = H(); ck('mood does NOT change health', up === h && dn === h, `${dn}..${up}`); }

// ---- PART B: friendship as LEVERAGE ----  (mediation + break are manager tools: rank >= 4)
G.player.rank = 5;
const opt = (n, re) => S.buildOptions({ kind: 'npc', ref: n }).items.find(i => re.test(i.label));

// suggest-a-break: lands if they're on good terms; a paranoid who dislikes you takes it as a threat
{ calm(); const s = ws()[0]; s.stress = 82; s.friend = 55; s.suspectsYou = false;
  const it = opt(s, /take five/); it && it.act();
  ck('a worker on good terms takes the break (stress drops)', !!it && s.stress < 82, s ? 'stress=' + Math.round(s.stress) : ''); }
{ calm(); const p = ws()[1]; p.stress = 82; p.ptype = 'paranoid'; p.friend = 5; p.suspectsYou = false;
  const it = opt(p, /take five/); it && it.act();
  ck('a paranoid who distrusts you takes it as "building a case" (backfires)', !!it && p.stress > 82 && p.suspectsYou === true, p ? 'stress=' + Math.round(p.stress) + ' suspects=' + p.suspectsYou : ''); }

// mediation: reliable between people who like you; can fail with someone who doesn't
function mediate(n) {
  const it = opt(n, /Sit them down/); if (!it) return 'no-item';
  it.act(); if (G.player.act && G.player.act.fn) { const fn = G.player.act.fn; G.player.act = null; fn(); }
  return n.feudWith === null;   // did the feud clear?
}
{ calm(); const a = ws()[0], b = ws()[1]; let cleared = 0;
  for (let i = 0; i < 6; i++) { a.feudWith = b.name; b.feudWith = a.name; a.friend = 100; b.friend = 100; if (mediate(a) === true) cleared++; }
  ck('mediation is reliable when both parties like you (6/6)', cleared === 6, cleared + '/6'); }
{ calm(); const a = ws()[0], b = ws()[1]; let cleared = 0;
  for (let i = 0; i < 20; i++) { a.feudWith = b.name; b.feudWith = a.name; a.friend = 0; b.friend = 0; if (mediate(a) === true) cleared++; }
  ck('mediation CAN fail with someone who does not like you (not 20/20)', cleared < 20, cleared + '/20 cleared'); }

console.log(`\nHEALTH REBALANCE: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
