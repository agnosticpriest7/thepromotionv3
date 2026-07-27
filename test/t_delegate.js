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

/* ================= B2 — the assign verb, affinity, and the five in-character outcomes ========= */
function amWorld() { const w = createWorld({ seed: 7 }); w.startNewGame(0); const S = w.sandbox, G = w.g; G.player.rank = 4; return { w, S, G }; }
function aWorker(G, S) { return G.NPCS.find(n => S.isWorker(n) && n.alive && !n.gone); }
function mkTask(G, kind) { const t = { id: ++G.deleg.seq, kind, phase: 510, exp: G.clock, to: null, state: 'open' }; G.deleg.q.push(t); return t; }

// --- a clean MATCH of each of the five kinds completes and counts ---
for (const [kind, ptype] of [['grind', 'zealot'], ['credit', 'climber'], ['solo', 'paranoid'], ['visible', 'peacock'], ['social', 'socialite']]) {
  const { S, G } = amWorld(); const wk = aWorker(G, S); wk.ptype = ptype; wk.stress = 30;
  const t = mkTask(G, kind); const done0 = G.deleg.done;
  const ok = S.delegAssign(t, wk) === true && t.state === 'assigned';
  S.delegExpireDue();
  ck(`MATCH ${kind}→${ptype}: clean completion (done ${done0}→${done0 + 1})`, ok && t.state === 'done' && G.deleg.done === done0 + 1, 'state=' + t.state);
}

// --- one job per worker ---
{
  const { S, G } = amWorld(); const wk = aWorker(G, S); wk.ptype = 'zealot';
  const a = mkTask(G, 'grind'), b = mkTask(G, 'grind');
  ck('first assign succeeds', S.delegAssign(a, wk) === true);
  ck('a worker holds ONE job at a time (second assign blocked)', S.delegAssign(b, wk) === false && b.state === 'open');
}

// --- the five in-character MISMATCH outcomes ---
{ // zealot: completes, takes extra stress, botch (+1.0), NOT clean
  const { S, G } = amWorld(); const wk = aWorker(G, S); wk.ptype = 'zealot'; wk.stress = 30;
  const t = mkTask(G, 'credit'); const d0 = G.deleg.done, s0 = wk.stress, w0 = S.delegWindow();
  S.delegAssign(t, wk); S.delegExpireDue();
  ck('zealot mismatch: completes with a stress delta, not clean', t.state === 'done-unclean' && G.deleg.done === d0 && wk.stress > s0, `Δstress=${wk.stress - s0}`);
  ck('zealot mismatch: counts as a botch (+1.0)', S.delegWindow() === w0 + 1.0, 'win ' + w0 + '→' + S.delegWindow());
}
{ // climber: completes-but-steals-credit -> no merit, no demerit
  const { S, G } = amWorld(); const wk = aWorker(G, S); wk.ptype = 'climber'; wk.career = 10;
  const t = mkTask(G, 'grind'); const d0 = G.deleg.done, c0 = wk.career, w0 = S.delegWindow();
  S.delegAssign(t, wk); S.delegExpireDue();
  ck('climber mismatch: completes but NO merit credit', t.state === 'done-unclean' && G.deleg.done === d0);
  ck('climber mismatch: no demerit, and they took the credit (career up)', S.delegWindow() === w0 && wk.career > c0);
}
{ // paranoid: refuses on the spot, back to the tray, friend hit
  const { S, G } = amWorld(); const wk = aWorker(G, S); wk.ptype = 'paranoid'; wk.friend = 40;
  const t = mkTask(G, 'grind'); const f0 = wk.friend;
  ck('paranoid mismatch: refuses, job returns to the tray', S.delegAssign(t, wk) === 'refused' && t.state === 'open');
  ck('paranoid mismatch: costs friend-points', wk.friend < f0, `Δfriend=${wk.friend - f0}`);
}
{ // peacock: unseen back-office work silently never happens -> miss
  const { S, G } = amWorld(); const wk = aWorker(G, S); wk.ptype = 'peacock';
  const t = mkTask(G, 'grind'); const d0 = G.deleg.done, w0 = S.delegWindow();
  S.delegAssign(t, wk); S.delegExpireDue();
  ck('peacock mismatch: silent-miss (+0.5), no completion', t.state === 'miss' && G.deleg.done === d0 && S.delegWindow() === w0 + 0.5);
}
{ // socialite: no friend on it -> deadline lapses -> miss
  const { S, G } = amWorld(); const wk = aWorker(G, S); wk.ptype = 'socialite';
  const t = mkTask(G, 'grind'); const w0 = S.delegWindow();
  S.delegAssign(t, wk); S.delegExpireDue();
  ck('socialite mismatch: deadline lapse = miss (+0.5)', t.state === 'miss' && S.delegWindow() === w0 + 0.5);
}

// --- intel is a prerequisite for the READ: the fit is hidden until you've profiled them ---
{
  const { S, G } = amWorld(); const wk = aWorker(G, S); wk.ptype = 'zealot'; wk.profiled = false;
  mkTask(G, 'grind');
  const hidden = S.delegAssignMenu(wk).items.find(i => /GRIND/.test(i.label));
  ck('unprofiled worker: the fit is a guess', hidden && /unread/.test(hidden.risk), hidden && hidden.risk);
  wk.profiled = true;
  const shown = S.delegAssignMenu(wk).items.find(i => /GRIND/.test(i.label));
  ck('profiled worker: the good fit is surfaced', shown && /good fit/.test(shown.risk), shown && shown.risk);
  ck('the job names its target personality (legibility)', shown && /suits a Zealot/.test(shown.risk), shown && shown.risk);
}

/* ================= B3 — boss-channel escalation + the AM→Manager gate ======================== */
const DELEG_TARGET = 12;   // const in the game; mirrored here

// --- demerits escalate note -> write-up -> reset, all on the boss channel (promotion progress),
//     never HR suspicion, and never a demotion ---
{
  const { S, G } = amWorld();
  G.player.prog = 90; G.player.suspicion = 12; G.deleg.done = 5;
  const rank0 = G.player.rank, susp0 = G.player.suspicion;
  // 1.0 -> NOTE
  let p = G.player.prog; S.delegDemerit(1.0, 't'); S.delegEscalate();
  ck('note (1.0): promotion docked, not suspicion, no demotion', G.deleg.esc === 1 && G.player.prog < p && G.player.suspicion === susp0 && G.player.rank === rank0, `progΔ=${G.player.prog - p}`);
  // 2.0 -> WRITE-UP
  p = G.player.prog; S.delegDemerit(1.0, 't'); S.delegEscalate();
  ck('write-up (2.0): bigger progress dock, still no demotion/suspicion', G.deleg.esc === 2 && G.player.prog < p && G.player.rank === rank0 && G.player.suspicion === susp0, `progΔ=${G.player.prog - p}`);
  // 3.0 -> RESET (clean streak wiped)
  S.delegDemerit(1.0, 't'); S.delegEscalate();
  ck('reset (3.0): the clean streak is wiped', G.deleg.esc === 3 && G.deleg.done === 0);
  ck('escalation never touched HR suspicion', G.player.suspicion === susp0, `Δ=${G.player.suspicion - susp0}`);
}

// --- reaching DELEG_TARGET opens the AM->Manager route ---
{
  const { S, G } = amWorld();
  G.deleg.done = DELEG_TARGET - 1;                   // one clean completion short
  const wk = aWorker(G, S); wk.ptype = 'zealot';
  const t = mkTask(G, 'grind'); S.delegAssign(t, wk); S.delegExpireDue();   // the 12th clean match
  ck('12 clean completions sets career.mgrGone', G.career.mgrGone === true, 'done=' + G.deleg.done + ' mgrGone=' + G.career.mgrGone);
  ck('the MANAGER gate is now open', S.gateFor(G.RANKS.indexOf('MANAGER')).ok === true);
  ck('delegation goes dormant once the chair is open', S.delegActive() === false);
}

// --- the old AM branch-health-holds are gone ---
{
  const { S, G } = amWorld();
  ck('daleFailsUpward removed', S.daleFailsUpward === undefined);
  ck('daleUpstairs removed', S.daleUpstairs === undefined);
  ck('scoreTheDay no longer scores at ASSISTANT MANAGER', S.scoreTheDay() === null);
}

console.log(`\nAM DELEGATION — B1+B2+B3 (queue + assign + gate): ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
