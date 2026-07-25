/* AM Delegation Layer (Milestone D1) — B1: the task queue.
   Jobs arrive into a tray during Regular Work phases at ASSISTANT MANAGER (rank 4): 2/2/2/3 = ~9/day.
   Each expires at the end of its phase (an unhandled job is a MISS = 0.5 demerit in a rolling 2-day
   window). Dormant unless AM. The assign verb, personality outcomes, boss-channel escalation and the
   DELEG_TARGET gate land in later branches. This drives the REAL functions (no counter-shoving). */
const { createWorld } = require('./harness');
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };

// Drive one in-game day, sampling the tray. Returns per-phase peak tray size + end-of-day state.
function driveDay(rank) {
  const w = createWorld({ seed: 7 }); w.startNewGame(0);
  const S = w.sandbox, G = w.g;
  G.player.rank = rank;
  const startDay = G.day, peakByPhase = {};
  const susp0 = G.player.suspicion;
  let frames = 0;
  while (G.day === startDay && frames < 60000) {
    w.run(6); frames += 6; G.player.rank = rank;              // pin rank across the day
    const cp = S.currentPhase();
    if (cp && S.isWorkPhase(cp.name)) { const st = cp.start; peakByPhase[st] = Math.max(peakByPhase[st] || 0, G.deleg.q.length); }
  }
  return { w, S, G, peakByPhase, susp0, endSusp: G.player.suspicion, seq: G.deleg.seq, done: G.deleg.done, win: S.delegWindow() };
}

// --- dormant unless AM: a SENIOR SALES (rank 3) gets nothing ---
{
  const r = driveDay(3);
  ck('dormant for non-AM: no jobs ever arrive', r.seq === 0 && r.G.deleg.q.length === 0, 'seq=' + r.seq);
}

// --- AM: arrival counts per phase match the table (2 / 2 / 2 / 3) ---
{
  const r = driveDay(4);
  ck('phase 08:30 delivered 2 jobs', r.peakByPhase[510] === 2, 'peak=' + r.peakByPhase[510]);
  ck('phase 10:45 delivered 2 jobs', r.peakByPhase[645] === 2, 'peak=' + r.peakByPhase[645]);
  ck('phase 12:45 delivered 2 jobs', r.peakByPhase[765] === 2, 'peak=' + r.peakByPhase[765]);
  ck('phase 14:15 delivered 3 jobs', r.peakByPhase[855] === 3, 'peak=' + r.peakByPhase[855]);
  ck('~9 jobs arrived across the day', r.seq === 9, 'seq=' + r.seq);
  // nobody assigned anything -> every job expired as a miss, and misses did NOT touch HR suspicion
  ck('unhandled jobs expired (tray empties by day end)', r.G.deleg.q.length === 0);
  ck('no clean completions from pure expiry', r.done === 0);
  ck('misses recorded as demerits in the rolling window', r.win > 0, 'window=' + r.win);
}

// --- expiry itself does NOT touch HR suspicion (boss channel is separate; isolate the call
//     because an idle AM accrues ambient suspicion from ordinary play over a whole day) ---
{
  const w = createWorld({ seed: 7 }); w.startNewGame(0);
  const S = w.sandbox, G = w.g; G.player.rank = 4;
  G.deleg.q.push({ id: ++G.deleg.seq, kind: 'grind', phase: 510, exp: 0, to: null, state: 'open' });
  G.deleg.q.push({ id: ++G.deleg.seq, kind: 'solo', phase: 510, exp: 0, to: null, state: 'open' });
  const s0 = G.player.suspicion, win0 = S.delegWindow();
  S.delegExpireDue();                                   // both are past exp -> two misses
  ck('expiry records demerits (+1.0) with HR suspicion UNCHANGED', G.player.suspicion === s0 && S.delegWindow() === win0 + 1.0, `susp Δ=${G.player.suspicion - s0}, win ${win0}->${S.delegWindow()}`);
}

// --- a new day resets the tray but the rolling demerit window persists ---
{
  const w = createWorld({ seed: 7 }); w.startNewGame(0);
  const S = w.sandbox, G = w.g; G.player.rank = 4;
  const start = G.day;
  let f = 0; while (G.day < start + 2 && f < 120000) { w.run(30); f += 30; G.player.rank = 4; }
  ck('reached day+2', G.day >= start + 2, 'day=' + G.day);
  ck('tray is per-day (holds only the current day\'s live jobs)', G.deleg.q.length <= 3, 'q=' + G.deleg.q.length);
  ck('the rolling demerit window carried misses across the day roll', S.delegWindow() > 0, 'window=' + S.delegWindow());
  // an AM who ignores the tray for days must not accumulate expiries unboundedly (rolling window prunes)
  let f2 = 0; while (G.day < start + 4 && f2 < 120000) { w.run(30); f2 += 30; G.player.rank = 4; }
  ck('demerit window stays bounded (pruned to 2 days)', G.deleg.dem.every(e => e.d >= G.day - 1) && G.deleg.dem.length <= 20, 'entries=' + G.deleg.dem.length);
}

// --- save round-trip: deleg state survives; a v1 save refuses to load ---
{
  const w = createWorld({ seed: 7 }); w.startNewGame(0);
  const S = w.sandbox, G = w.g; G.player.rank = 4;
  let f = 0; while (f < 8000) { w.run(20); f += 20; G.player.rank = 4; }   // into the first work block: jobs on the tray
  const qBefore = G.deleg.q.length, doneBefore = G.deleg.done, seqBefore = G.deleg.seq;
  const save = w.rawSave(); const snap = save.buildSnapshot(false, null);
  G.deleg.q = []; G.deleg.done = 99; G.deleg.seq = -1;                     // clobber, then restore
  save.applySnapshot(snap);
  ck('delegation queue survives a save round-trip', G.deleg.q.length === qBefore, `q ${G.deleg.q.length} vs ${qBefore}`);
  ck('completion count + seq survive a save round-trip', G.deleg.done === doneBefore && G.deleg.seq === seqBefore);
  ck('SAVE_VERSION bumped: a v1 save refuses to load', save.applySnapshot({ v: 1 }) === false);
}

console.log(`\nAM DELEGATION — B1 (queue): ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
