/* PER-PERSON FAVOUR TRACK (branch: favor-track). Favours you do for ONE coworker accumulate; at a
   threshold (FAVOR_THRESHOLD, a dial) that person owes you a single one-time VERB in the shape of
   their personality — alibi / dirt / machine / tip-off / a clean mismatched delegation. State is
   player-held (career.favors), saved with career, and swept by npcLeaving. ANTI-FARMING: errands are
   NOT requestable on demand (no menu item) — they arrive on the world's schedule (maybeOfferFavor).
   Driven through the real functions (offerMission/creditMission/cashFavor/delegResolve/…), no
   flag-setting of the track itself. */
const { createWorld } = require('./harness');
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };
function fresh() { const w = createWorld({ seed: 11 }); w.startNewGame(0); let f = 0; while (f < 1500) { w.run(30); f += 30; } return w; }
// complete ONE real favour for worker n: an errand arrives (offerMission) and you finish it (creditMission)
function favorTo(S, n) {
  for (let k = 0; k < 8 && !S.missionFor(n.name); k++) S.offerMission(n);
  const m = S.missionFor(n.name);
  if (!m) throw new Error('could not create a mission for ' + n.name);
  S.creditMission(m, 0);
}
const workers = (S, G) => G.NPCS.filter(n => S.isWorker(n) && n.alive && !n.gone);

// ---------- (1) favours accumulate PER PERSON and do not cross-credit ----------
{
  const w = fresh(), S = w.sandbox, G = w.g;
  const [A, B] = workers(S, G);
  favorTo(S, A); favorTo(S, A); favorTo(S, A);   // three for A
  favorTo(S, B);                                  // one for B
  const fa = G.career.favors[A.name], fb = G.career.favors[B.name];
  ck('A accrued exactly 3 favours', fa && fa.n === 3, fa ? 'n=' + fa.n : 'none');
  ck('B accrued exactly 1 (A did not cross-credit B)', fb && fb.n === 1, fb ? 'n=' + fb.n : 'none');
  ck('at threshold A now owes you a reward (assigned, not yet given)', fa.reward && fa.given === false, 'reward=' + fa.reward);
  ck('B below threshold owes nothing yet', fb.reward === null);
}

// ---------- (2) the threshold fires ONCE and only once per person ----------
{
  const w = fresh(), S = w.sandbox, G = w.g;
  const A = workers(S, G)[0];
  favorTo(S, A); favorTo(S, A); favorTo(S, A);
  const first = G.career.favors[A.name].reward;
  favorTo(S, A); favorTo(S, A);                   // keep helping past the line
  const fa = G.career.favors[A.name];
  ck('reward is assigned once and never re-rolled', fa.reward === first && fa.given === false, 'n=' + fa.n + ' reward=' + fa.reward);
}

// ---------- (3) each reward VERB actually works, by personality ----------
{
  const w = fresh(), S = w.sandbox, G = w.g;
  const ws = workers(S, G);
  const [wz, wc, wp, wk, wsoc] = ws;
  wz.ptype = 'zealot'; wc.ptype = 'climber'; wp.ptype = 'paranoid'; wk.ptype = 'peacock'; wsoc.ptype = 'socialite';
  const arm = n => { favorTo(S, n); favorTo(S, n); favorTo(S, n); };
  [wz, wc, wp, wk, wsoc].forEach(arm);
  const F = n => G.career.favors[n.name];
  ck('personality → reward map (zealot=deleg, climber=machine, paranoid=tipoff, peacock=alibi, socialite=dirt)',
    F(wz).reward === 'deleg' && F(wc).reward === 'machine' && F(wp).reward === 'tipoff' && F(wk).reward === 'alibi' && F(wsoc).reward === 'dirt');

  // -- alibi (peacock): wipes suspicion --
  G.player.suspicion = 55;
  S.cashFavor(wk);
  ck('alibi wipes suspicion and marks the favour spent', G.player.suspicion === 0 && F(wk).given === true, 'susp=' + G.player.suspicion);

  // -- dirt (socialite): hands you leverage on someone ELSE --
  const levBefore = G.player.leverage.length;
  S.cashFavor(wsoc);
  const newLev = G.player.leverage[G.player.leverage.length - 1];
  ck('dirt adds one leverage item (src=favor) about another worker',
    G.player.leverage.length === levBefore + 1 && newLev && newLev.src === 'favor' && newLev.target && newLev.target !== wsoc.name && F(wsoc).given === true);

  // -- tip-off (paranoid): the next scheduled audit is announced, perk consumed --
  S.cashFavor(wp);
  ck('tip-off arms career.auditTipoff', G.career.auditTipoff === true && F(wp).given === true);
  S.scheduleAudit();
  ck('scheduling an audit consumes the tip-off (fires once)', G.career.auditTipoff === false);

  // -- machine (climber): their desk sends a catfish email even while HR is watching, then consumes --
  S.cashFavor(wc);
  ck('machine perk is armed after cashing', F(wc).armed === true && F(wc).given === true);
  const wcDesk = G.desks.find(d => d.owner === wc.name);
  const hr = G.NPCS.find(n => n.dept === 'hr' && n.alive);
  if (hr) { hr.x = G.player.x; hr.y = G.player.y; hr.gone = false; hr.wentHome = false; }   // force "seen"
  const seenNow = typeof S.seenByAnyone === 'function' ? S.seenByAnyone() : true;
  const sentBefore = G.catfish.emailsSent, suspBefore = G.player.suspicion;
  S.sendCatfishEmail(wcDesk);
  ck('machine access sends even though HR is watching (bypasses the caught-you +30)',
    seenNow === true && G.catfish.emailsSent === sentBefore + 1 && G.player.suspicion <= suspBefore + 1, 'seen=' + seenNow + ' susp+' + (G.player.suspicion - suspBefore));
  ck('the machine perk is consumed (one use)', F(wc).armed === false);
  // contrast: a desk with NO perk, HR still watching → the send is refused and suspicion spikes
  const otherDesk = G.desks.find(d => d.owner && d.owner !== wc.name && !G.catfish.usedDesks.includes(d.owner));
  const s2 = G.catfish.emailsSent, u2 = G.player.suspicion;
  if (otherDesk) S.sendCatfishEmail(otherDesk);
  ck('without the perk the same watched send is caught (no email, suspicion up)',
    !otherDesk || (G.catfish.emailsSent === s2 && G.player.suspicion > u2), 'susp+' + (G.player.suspicion - u2));

  // -- deleg (zealot): takes ONE real mismatched job clean, no botch, then consumes --
  S.cashFavor(wz);
  ck('deleg perk armed after cashing', F(wz).armed === true && F(wz).given === true);
  const doneBefore = G.deleg.done;
  const t1 = { kind: 'credit', to: wz.name, state: 'assigned' };   // 'credit' suits a climber, NOT a zealot → a real mismatch
  ck('sanity: this really is a mismatch for a zealot', S.delegMatch(t1, wz) === false);
  const r1 = S.delegResolve(t1, wz);
  ck('the owed favour makes a mismatched delegation resolve CLEAN (no botch)',
    r1 === 'clean' && G.deleg.done === doneBefore + 1 && t1.state === 'done' && F(wz).armed === false, 'r=' + r1);
  // contrast: a second mismatch on the same zealot (perk spent) botches in character
  const t2 = { kind: 'credit', to: wz.name, state: 'assigned' };
  const r2 = S.delegResolve(t2, wz);
  ck('with the perk spent, a mismatched job botches as normal', r2 === 'botch', 'r=' + r2);
}

// ---------- (4) npcLeaving closes an in-progress track, and the invariant has teeth ----------
{
  const w = fresh(), S = w.sandbox, G = w.g;
  const C = workers(S, G)[3];
  favorTo(S, C); favorTo(S, C);                   // two deep — an in-progress track (no reward yet)
  ck('C has an in-progress track', G.career.favors[C.name] && G.career.favors[C.name].n === 2);
  S.npcLeaving(C); C.alive = false; C.gone = true;   // a real departure sweep, then they physically leave
  ck('npcLeaving deletes the favour track (no dangling reference, no payout)', !G.career.favors[C.name]);
  const before = w.stats.investmentViolations; w.run(600);
  ck('… and the investment invariant stays clean after they are gone', w.stats.investmentViolations === before, 'viol=' + w.stats.investmentViolations);
}
{
  // teeth: a track left dangling on a gone worker (npcLeaving bypassed) MUST trip the invariant
  const w = fresh(), S = w.sandbox, G = w.g;
  const D = workers(S, G)[4];
  favorTo(S, D);
  D.alive = false; D.gone = true;                 // leave WITHOUT the sweep
  const before = w.stats.investmentViolations; w.run(600);
  ck('the invariant catches a favour track dangling on a gone worker', w.stats.investmentViolations > before, 'viol=' + w.stats.investmentViolations);
}

// ---------- (5) save round-trip with partial tracks across multiple people ----------
{
  const w = fresh(), S = w.sandbox, G = w.g, save = w.rawSave();
  const [A, B, E] = workers(S, G);
  favorTo(S, A); favorTo(S, A); favorTo(S, A); S.cashFavor(A);   // A: fully given (armed if deleg/machine)
  favorTo(S, B); favorTo(S, B);                                  // B: in progress (n=2)
  G.career.auditTipoff = true;                                  // a cashed tip-off floating (not person-tied)
  const snap = JSON.parse(JSON.stringify(save.buildSnapshot(false, null)));
  const aWas = JSON.parse(JSON.stringify(G.career.favors[A.name]));
  const bWas = JSON.parse(JSON.stringify(G.career.favors[B.name]));
  // clobber, then restore
  Object.keys(G.career.favors).forEach(k => delete G.career.favors[k]); G.career.auditTipoff = false;
  const ok = save.applySnapshot(snap);
  const aNow = G.career.favors[A.name], bNow = G.career.favors[B.name];
  ck('save round-trips partial tracks for multiple people', ok === true &&
    aNow && aNow.n === aWas.n && aNow.reward === aWas.reward && aNow.given === aWas.given && aNow.armed === aWas.armed &&
    bNow && bNow.n === bWas.n && bNow.reward === bWas.reward);
  ck('the floating tip-off perk survives the round-trip', G.career.auditTipoff === true);
}

// ---------- (6) ANTI-FARMING: favours are not requestable on demand ----------
{
  const w = fresh(), S = w.sandbox, G = w.g;
  const A = workers(S, G)[0];
  const labels = S.missionItems(A).map(o => (o.label || '').toLowerCase());
  ck('the interaction menu offers NO on-demand "ask what they need"', !labels.some(l => l.includes('ask what they need')));
  // …but once a reward is owed, the "call in the favour" verb DOES surface on that person's menu
  favorTo(S, A); favorTo(S, A); favorTo(S, A);
  const owed = S.missionItems(A).map(o => (o.label || '').toLowerCase());
  ck('when a favour is owed, a "call in the favour" verb appears on their menu', owed.some(l => l.includes('call in the favour')));
  // and the world-schedule arrival exists and is capped (scarcity, not farmable)
  ck('maybeOfferFavor (world-schedule arrival) exists', typeof S.maybeOfferFavor === 'function');
  for (let i = 0; i < 40; i++) S.maybeOfferFavor();
  const open = (typeof S.missionFor === 'function') ? workers(S, G).filter(n => S.missionFor(n.name)).length : 0;
  ck('errands stay scarce even under repeated ticks (≤3 open at once)', open <= 3, 'open=' + open);
}

console.log(`\nFAVOUR TRACK: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
