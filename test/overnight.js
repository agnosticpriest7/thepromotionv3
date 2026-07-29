/* ============================================================================
   OVERNIGHT — the heavy sweep. Hours of compute, one small table out.

   Not a gate test (hence not t_*.js): it is far too slow to sit in the rotation.
   Point it at the build when you have time to spare and want the long-horizon
   answers the 150k soak is too short to give.

   What it is actually looking for, in order of what would hurt most:

     1. GEOMETRY, now that the harness reports real sprite dimensions. Every
        seated set and the reception lounge, checked the way only the browser
        could check them before. This is the first run where these numbers mean
        anything under test at all.
     2. LONG-HORIZON DRIFT. 1M frames is ~26 in-game days against the soak's ~5.
        Slow leaks (arrays that only grow, favour tracks that never prune) do not
        show up in five days.
     3. RARE PATHS, via a seed matrix. One seed exercises one sequence of rolls;
        twelve exercise twelve.
     4. SAVE DURABILITY across a long run, not just at frame zero.
     5. EVERY RANK, since most play happens at ranks the soak never reaches.

   Usage:  node test/overnight.js  [--fast]
   ============================================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const { createWorld } = require('./harness');

const FAST = process.argv.includes('--fast');
const t0 = Date.now();
const rows = [];
let pass = 0, fail = 0;
const ck = (area, name, ok, detail) => {
  rows.push([ok ? 'PASS' : 'FAIL', area, name, detail == null ? '' : String(detail)]);
  ok ? pass++ : fail++;
};
const guard = (area, name, fn) => {
  try { fn(); } catch (e) { ck(area, name, false, 'THREW: ' + e.message); }
};
const mins = () => ((Date.now() - t0) / 60000).toFixed(1) + 'm';
const say = m => console.log(`[${mins()}] ${m}`);

function build(opts, frames) {
  const w = createWorld(opts || {});
  w.startNewGame(0);
  if (frames) w.run(frames, { ignoreGameOver: true });
  return w;
}
const A = (v, S) => +(v / S).toFixed(1);

/* ---------------------------------------------------- 1. GEOMETRY (the new one) */
say('geometry — every seated set, with real sprite dimensions');
guard('geometry', 'sets', () => {
  const w = build({}, 3000);
  const S = w.sandbox, L = w.g.layout, SC = L.S || 1.8;

  const sets = [['meeting lower', L.meetingTable], ['meeting upper', L.meetingTable2],
                ['break lower', L.breakTable], ['break upper', L.breakTableB || L.breakTable2],
                ['kitchen', L.kitchenTable]].filter(s => s[1]);
  sets.forEach(([name, tbl]) => {
    const r = S.crewRect(tbl);
    if (!r) { ck('geometry', name + ' has a rect', false); return; }
    const aspect = (r.w / r.h).toFixed(2);
    /* a square rect is the old 64x64 stub leaking back in — the whole point of the fix */
    ck('geometry', name + ' tabletop is not square', Math.abs(r.w - r.h) > 2,
       A(r.w, SC) + ' x ' + A(r.h, SC) + ' authored (aspect ' + aspect + ')');
    const room = S.roomAt(r.cx, r.cy);
    ck('geometry', name + ' sits inside a room', !!room, room ? room.name : 'NO ROOM');
  });

  /* seats: on their chair, walkable, and inside the room the table is in */
  const groups = [['meeting', S.allMeetingChairs && S.allMeetingChairs()]];
  groups.forEach(([name, chairs]) => {
    if (!chairs || !chairs.length) return;
    let exact = 0, walk = 0, inRoom = 0;
    chairs.forEach(c => {
      const t = S.snapTarget(c.x, c.y);
      if (Math.abs(t.x - c.x) < 1 && Math.abs(t.y - c.y) < 1) exact++;
      if (S.walkableAt(c.x, c.y)) walk++;
      if (S.roomAt(c.x, c.y)) inRoom++;
    });
    ck('geometry', name + ' seats exactly on their chair', exact === chairs.length, exact + '/' + chairs.length);
    ck('geometry', name + ' seats walkable', walk === chairs.length, walk + '/' + chairs.length);
    ck('geometry', name + ' seats inside a room', inRoom === chairs.length, inRoom + '/' + chairs.length);
  });

  /* the reception lounge — the piece whose collision box came back square and sealed a corridor */
  const lob = L.LOBBY || [];
  ck('geometry', 'lounge has its pieces', lob.length > 0, lob.length + ' pieces');
  const dim = k => { try { const b = fs.readFileSync(path.join(__dirname, '..', 'Art', 'sprites', k + '.png'));
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; } catch (e) { return null; } };
  const rects = lob.map(p => { const d = dim(p.art); if (!d) return null;
    const h = Math.round(d.h * p.w / d.w);
    return { art: p.art, solid: p.solid, x: Math.round(p.cx - p.w / 2), y: p.yB - h, w: p.w, h }; }).filter(Boolean);
  let ov = 0;
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i], b = rects[j];
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) ov++;
  }
  ck('geometry', 'lounge pieces do not overlap', ov === 0, ov + ' overlaps');
  ck('geometry', 'lounge solids are solid', rects.filter(r => r.solid)
     .every(r => !S.walkableAt(r.x + r.w / 2, r.y + r.h / 2)), rects.filter(r => r.solid).length + ' solid');
  ck('geometry', 'lounge chairs stay walkable', rects.filter(r => !r.solid)
     .every(r => S.walkableAt(r.x + r.w / 2, r.y + r.h / 2)), rects.filter(r => !r.solid).length + ' chairs');
});

/* ---------------------------------------------------- 2. LONG-HORIZON DRIFT */
const LONG = FAST ? 120000 : 1000000;
say(`long soak — ${LONG.toLocaleString()} frames (~${Math.round(LONG / 36000)} in-game days)`);
guard('drift', 'long soak', () => {
  const w = build({ seed: 20260729 }, 0);
  const size = () => ({
    npcs: (w.g.NPCS || []).length,
    favours: Object.keys((w.g.career || {}).favors || {}).length,
    deleg: ((w.g.deleg || {}).q || []).length,
    hires: (w.g.pendingHires || []).length,
    leverage: ((w.g.player || {}).leverage || []).length,
  });
  const first = size();
  let days = 0;
  const CHUNK = Math.max(1, Math.floor(LONG / 10));
  const marks = [];
  for (let i = 0; i < 10; i++) {
    w.run(CHUNK, { ignoreGameOver: true, onDay: () => { days++; } });
    marks.push(Object.assign({ day: w.g.day }, size()));
  }
  const last = marks[marks.length - 1];
  /* `!gameOver || true` was vacuous — it passed unconditionally. What actually matters is that
     the clock really advanced: a soak that silently stalls on day 1 would otherwise look clean. */
  ck('drift', 'the clock really advanced', w.g.day >= 5,
     'reached day ' + w.g.day + ' over ' + LONG.toLocaleString() + ' frames');
  ck('drift', 'no render errors over the whole run', w.g.renderErrs === 0, w.g.renderErrs);
  /* unbounded growth is the thing a 5-day soak cannot see */
  ['favours', 'deleg', 'hires', 'leverage'].forEach(k => {
    const grew = last[k] - first[k];
    ck('drift', `${k} stays bounded`, last[k] < 500, `${first[k]} -> ${last[k]} (${grew >= 0 ? '+' : ''}${grew})`);
  });
  ck('drift', 'cast does not balloon', last.npcs < 60, first.npcs + ' -> ' + last.npcs);
  const stuck = (w.g.NPCS || []).filter(n => w.sandbox.isWorker(n) && n.stuckT > 600).length;
  ck('drift', 'nobody wedged at the end', stuck === 0, stuck + ' stuck');
});

/* ---------------------------------------------------- 3. SEED MATRIX */
const SEEDS = FAST ? [1, 2] : [1, 7, 13, 42, 99, 256, 1024, 4242, 8191, 31337, 65535, 123456];
const CHARS = [0, 21, 22, 23, 24];
say(`seed matrix — ${SEEDS.length} seeds x ${CHARS.length} characters`);
guard('seeds', 'matrix', () => {
  const bad = [];
  let runs = 0, totalDays = 0;
  SEEDS.forEach(seed => {
    const idx = CHARS[seed % CHARS.length];
    const w = build({ seed }, 0);
    w.sandbox.setPlayerChar(idx);
    w.run(FAST ? 20000 : 120000, { ignoreGameOver: true });
    runs++; totalDays += (w.g.day || 0);
    const stuck = (w.g.NPCS || []).filter(n => w.sandbox.isWorker(n) && n.stuckT > 600).length;
    if (w.g.renderErrs !== 0 || stuck > 0) bad.push(`seed ${seed}/char ${idx}: errs=${w.g.renderErrs} stuck=${stuck}`);
  });
  ck('seeds', 'every seed runs clean', bad.length === 0, bad.slice(0, 3).join(' | ') || `${runs} runs, ${totalDays} in-game days total`);
});

/* ---------------------------------------------------- 4. SAVE DURABILITY */
say('save durability — snapshot/restore deep into a run');
guard('saves', 'round-trip at depth', () => {
  const w = build({ seed: 555 }, 0);
  const S = w.sandbox;
  let ok = 0, tried = 0, firstBad = '';
  for (let i = 0; i < (FAST ? 3 : 12); i++) {
    w.run(FAST ? 8000 : 30000, { ignoreGameOver: true });
    tried++;
    try {
      const snap = JSON.parse(JSON.stringify(S.buildSnapshot(false, null)));
      const rank = w.g.player.rank, day = w.g.day, chr = snap.player.char;
      if (!S.applySnapshot(snap)) { firstBad = firstBad || `refused at day ${day}`; continue; }
      if (w.g.player.rank !== rank || w.g.day !== day) { firstBad = firstBad || `state moved at day ${day}`; continue; }
      if (chr !== 0 && w.g.player.sprite !== chr) { firstBad = firstBad || `character lost at day ${day}`; continue; }
      ok++;
    } catch (e) { firstBad = firstBad || e.message; }
  }
  ck('saves', 'snapshot/restore holds all run', ok === tried, ok + '/' + tried + (firstBad ? ' — ' + firstBad : ''));
  w.run(20000, { ignoreGameOver: true });
  ck('saves', 'world still runs after restores', w.g.renderErrs === 0, 'renderErrs=' + w.g.renderErrs);
});

/* ---------------------------------------------------- 5. EVERY RANK */
say('rank sweep — soak at each rank');
guard('ranks', 'sweep', () => {
  const N = FAST ? 15000 : 90000;
  for (let r = 0; r < 6; r++) {
    const w = build({ seed: 900 + r }, 1200);
    try { w.sandbox.jumpToRank(r); } catch (e) { ck('ranks', 'rank ' + r, false, 'jumpToRank threw: ' + e.message); continue; }
    w.run(N, { ignoreGameOver: true });
    const stuck = (w.g.NPCS || []).filter(n => w.sandbox.isWorker(n) && n.stuckT > 600).length;
    ck('ranks', (w.g.RANKS ? w.g.RANKS[r] : 'rank ' + r) + ' soaks clean',
       w.g.renderErrs === 0 && stuck === 0,
       'day ' + w.g.day + ' errs=' + w.g.renderErrs + ' stuck=' + stuck);
  }
});

/* ---------------------------------------------------- REPORT */
console.log('\n================ OVERNIGHT ================');
let area = null;
rows.forEach(r => {
  if (r[1] !== area) { area = r[1]; console.log('\n-- ' + area.toUpperCase()); }
  console.log('  ' + r[0].padEnd(6) + r[2].padEnd(42) + (r[3] ? '  ' + r[3] : ''));
});
console.log('\n-------------------------------------------');
console.log(`${pass} pass · ${fail} fail · ran ${mins()}`);
console.log(fail === 0 ? 'OVERNIGHT: GREEN ✅' : 'OVERNIGHT: RED ❌');
process.exit(fail === 0 ? 0 : 1);
