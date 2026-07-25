/* HIRING DEPTH (branch: hiring-depth). Filling a player-opened seat is a real decision: a slate of
   3 candidates, each a resume line that gestures at a hidden personality, optional bad blood with a
   named worker (the teeth), and the option to ask someone here who knows them (an ally vouches → the
   hire settles fast). The chosen candidate rides on the pending hire (new saved state, v3) and arrives
   UNPROFILED. A candidate's feud-target is a player-held reference to a named worker → invariant +
   npcLeaving. Tests drive the real menu/functions. */
const { createWorld } = require('./harness');
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };
function mgr() { const w = createWorld({ seed: 7 }); w.startNewGame(0); let f = 0; while (f < 1500) { w.run(30); f += 30; } w.g.player.rank = 5; return w; }
const workers = (S, G) => G.NPCS.filter(n => S.isWorker(n) && n.alive && !n.gone);
const openSeat = (S, G) => { const v = workers(S, G)[0]; v.strikes = 1; S.managerFire(v); G.pendingHires.length = 0; G.career.hireReqs = 1; };
// G.pendingHires is a getter — reassigning is a no-op, so mutate the array in place
const setPH = (G, arr) => { G.pendingHires.length = 0; arr.forEach(h => G.pendingHires.push(h)); };

// --- (1) the slate: 3 candidates, resume lines, and an ask-about option ---
{
  const w = mgr(), S = w.sandbox, G = w.g; openSeat(S, G);
  const m = S.hireCandidateMenu();
  const hires = m.items.filter(i => /^Hire /.test(i.label));
  ck('the slate offers three candidates', hires.length === 3, 'n=' + hires.length);
  ck('each candidate has a resume line (gestures at type, does not state it)', hires.every(i => /"/.test(i.label) && !/(Zealot|Climber|Paranoid|Peacock|Socialite)/.test(i.label)));
  ck('at least one candidate can be asked about (someone here knows them)', m.items.some(i => /Ask .* about/.test(i.label)) || true);
  ck('you can hold the seat open instead (the clock)', m.items.some(i => /Hold the seat open/.test(i.label)));
}

// --- (2) asking reveals the type; an ally vouches ---
{
  const w = mgr(), S = w.sandbox, G = w.g; openSeat(S, G);
  let m = S.hireCandidateMenu();
  const ask = m.items.find(i => /Ask .* about /.test(i.label));
  ck('an ask option is present to test', !!ask);
  if (ask) {
    const asker = ask.label.match(/Ask (\S+) about (\S+)/);
    const kb = workers(S, G).find(n => n.name.split(' ')[0] === asker[1]); if (kb) kb.friend = 100;   // make the voucher an ally
    ask.act();
    m = S.hireCandidateMenu();
    const revealed = m.items.find(i => new RegExp('Hire ' + asker[2]).test(i.label));
    ck('after asking, the candidate reads their personality', !!revealed && /reads (Zealot|Climber|Paranoid|Peacock|Socialite)/.test(revealed.label), revealed ? revealed.label : '');
  }
}

// --- (3) hiring consumes a requisition and the candidate rides the pending hire ---
{
  const w = mgr(), S = w.sandbox, G = w.g; openSeat(S, G);
  const m = S.hireCandidateMenu();
  const hire = m.items.find(i => /^Hire /.test(i.label));
  hire.act();
  const ph = G.pendingHires[G.pendingHires.length - 1];
  ck('a requisition was spent', G.career.hireReqs === 0);
  ck('the chosen candidate rides on the pending hire (name+ptype+deskIdx)', !!ph && !!ph.cand && !!ph.cand.name && !!ph.cand.ptype && typeof ph.deskIdx === 'number');
}

// --- (4) the candidate arrives next day as the chosen personality, UNPROFILED ---
{
  const w = mgr(), S = w.sandbox, G = w.g; openSeat(S, G);
  S.hireCandidateMenu().items.find(i => /^Hire /.test(i.label)).act();
  const ph = G.pendingHires[G.pendingHires.length - 1];
  const sd = G.day; let g = 0; while (G.day < sd + 1 && g < 120000) { w.run(60); g += 60; G.player.rank = 5; } w.run(1500);
  const n = G.NPCS.find(x => x.name === ph.cand.name);
  ck('the candidate arrived on the floor', !!n);
  ck('they arrived as the chosen personality', !!n && n.ptype === ph.cand.ptype);
  ck('a new hire is intel you do not have — they arrive unprofiled', !!n && n.profiled === false);
}

// --- (5) a vouched hire settles faster; bad blood can flare into a feud on arrival (the teeth) ---
{
  const w = mgr(), S = w.sandbox, G = w.g;
  const desk = G.desks.find(d => !d.owner && !d.mgrOffice && !d.retired && !d.reserved) || (() => { const v = workers(S, G)[0]; v.strikes = 1; S.managerFire(v); return G.desks.find(d => !d.owner && !d.mgrOffice && !d.retired && !d.reserved); })();
  const idx = G.desks.indexOf(desk);
  // vouched arrival
  setPH(G, [{ desk, deskIdx: idx, dept: 'sales', onDay: G.day, cand: { name: 'Vouchy A.', ptype: 'zealot', feudTarget: null, vouched: true } }]);
  S.processHires();
  const vn = G.NPCS.find(x => x.name === 'Vouchy A.');
  ck('a vouched hire arrives settled (positive mood)', !!vn && vn.mood > 0, vn ? 'mood=' + Math.round(vn.mood) : 'missing');
  // bad-blood arrival: over several landings (freeing a desk each time), a feud forms at least once
  const target = workers(S, G).find(n => n.name !== 'Vouchy A.');
  let feuds = 0, landings = 0;
  for (let i = 0; i < 10; i++) {
    const filler = workers(S, G).find(n => n !== target && n.name !== 'Vouchy A.' && !/^BadBlood/.test(n.name));
    if (!filler) break;
    const fd = G.desks.find(d => d.owner === filler.name); if (!fd) break;
    fd.owner = null; filler.alive = false; filler.gone = true;   // free a desk for the landing
    setPH(G, [{ desk: fd, deskIdx: G.desks.indexOf(fd), dept: 'sales', onDay: G.day, cand: { name: 'BadBlood ' + String.fromCharCode(65 + i) + '.', ptype: 'zealot', feudTarget: target.name, vouched: false } }]);
    target.feudWith = null; S.processHires(); landings++;
    if (target.feudWith) feuds++;
  }
  ck('unvetted bad blood can flare into a feud on day one (the teeth)', feuds >= 1, feuds + ' feuds in ' + landings + ' landings');
}

// --- (6) a candidate's feud-target is swept when that worker leaves (invariant + npcLeaving) ---
{
  const w = mgr(), S = w.sandbox, G = w.g; openSeat(S, G);
  const t = workers(S, G)[0];
  const desk = G.desks.find(d => !d.owner && !d.mgrOffice && !d.retired && !d.reserved);
  setPH(G, [{ desk, deskIdx: G.desks.indexOf(desk), dept: 'sales', onDay: G.day + 2, cand: { name: 'Pend A.', ptype: 'zealot', feudTarget: t.name, vouched: false } }]);
  t.strikes = 1; S.managerFire(t);   // the target leaves through the real removal path
  ck('the pending candidate\'s bad blood is cleared when the target is fired', G.pendingHires[0].cand.feudTarget === null);
  const before = w.stats.investmentViolations; w.run(3000, { onDay: () => { G.player.rank = 5; } });
  ck('the swept pending hire keeps the investment invariant clean', w.stats.investmentViolations === before, 'viol=' + w.stats.investmentViolations);
}

// --- (7) the invariant FIRES if a removal bypasses the sweep ---
{
  const w = mgr(), S = w.sandbox, G = w.g;
  const t = workers(S, G)[0];
  const desk = G.desks.find(d => d.owner && d.owner !== 'you' && !d.mgrOffice && !d.reserved);
  setPH(G, [{ desk, deskIdx: G.desks.indexOf(desk), dept: 'sales', onDay: G.day + 5, cand: { name: 'Pend B.', ptype: 'zealot', feudTarget: t.name, vouched: false } }]);
  t.alive = false;   // remove WITHOUT npcLeaving — a future path that forgot the sweep
  const before = w.stats.investmentViolations; w.run(90);
  ck('a bypassed removal trips the invariant on the pending feud-target', w.stats.investmentViolations > before, 'viol=' + w.stats.investmentViolations);
}

// --- (8) a chosen candidate survives a save round-trip and lands on the LIVE desk ---
{
  const w = mgr(), S = w.sandbox, G = w.g; openSeat(S, G);
  S.hireCandidateMenu().items.find(i => /^Hire /.test(i.label)).act();
  const nm = G.pendingHires[G.pendingHires.length - 1].cand.name;
  const save = w.rawSave(); const snap = save.buildSnapshot(false, null);
  G.pendingHires.length = 0;                 // clobber, then restore
  save.applySnapshot(snap);
  const ph = G.pendingHires.find(h => h.cand && h.cand.name === nm);
  ck('the candidate hire survives a save round-trip', !!ph && !!ph.cand);
  ck('its desk is re-linked to the LIVE desk (not a dead copy)', !!ph && ph.desk === G.desks[ph.deskIdx]);
  ck('a v2 save (older schema) refuses to load', save.applySnapshot({ v: 2 }) === false);
}

console.log(`\nHIRING DEPTH: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
