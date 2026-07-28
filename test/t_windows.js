/* ============================================================================
   WINDOWS — every pane must sit IN a perimeter wall.

   Written after the 2026-07-28 window fix. The bug it locks out: WINDOWS were
   generated from W/H, which are ALREADY scaled, and then scaled a second time
   by scaleWorld. Six of fifteen north panes landed past the east edge of the
   world and ALL SEVEN east panes at x4838 — roughly 1200 authored units beyond
   the east wall — so the east facade had no windows at all. Nothing failed
   loudly: the soak was green throughout, because drawing a window into the void
   throws nothing. Only looking at the wall showed it.

   Checks, for every pane:
     1. it lies along a SINGLE perimeter wall segment (not spanning a door gap,
        not overhanging the end, not floating in space)
     2. its cross-axis sits within that segment's band, i.e. the pane is set
        INTO the wall rather than hanging inside the room
     3. the run reaches both ends of the facade (a pane within one spacing of
        each end) — catches a run that silently stops short after a resize

   Coordinates here are POST-scaleWorld (world px), the same space both draw
   functions see.

   Usage:  node test/t_windows.js
   ============================================================================ */
'use strict';
const { createWorld } = require('./harness');

function main() {
  const w = createWorld();
  const L = w.g.layout;
  const S = L.S || 1.8;
  const A = v => +(v / S).toFixed(1);          // world -> authored, for readable output
  const W = L.W, H = L.H;
  const WINDOWS = L.WINDOWS || [];
  const walls = L.walls || [];

  const north = WINDOWS.filter(p => p.side === 'n');
  const east  = WINDOWS.filter(p => p.side === 'e');

  /* Perimeter segments. Only the north perimeter sits above y0, and only the east
     perimeter reaches the world's east edge — so no interior wall is picked up. */
  const northSegs = walls.filter(s => s.w >= s.h && s.y < 0);
  const eastSegs  = walls.filter(s => s.h > s.w && (s.x + s.w) >= W);

  /* A facade is authored as several abutting rects, so a pane legitimately crosses the join
     between two of them — the north wall is one contiguous run of 7 rects with no gaps. Merge
     touching segments into runs first, so the check still catches a pane spanning a real GAP (a
     doorway) or overhanging the end, without flagging the joins. */
  const mergeRuns = (segs, axis) => {
    const lo = s => axis === 'x' ? s.x : s.y, hi = s => axis === 'x' ? s.x + s.w : s.y + s.h;
    const sorted = segs.slice().sort((a, b) => lo(a) - lo(b));
    const runs = [];
    for (const s of sorted) {
      const last = runs[runs.length - 1];
      if (last && lo(s) <= last[1] + 1) last[1] = Math.max(last[1], hi(s));
      else runs.push([lo(s), hi(s)]);
    }
    return runs;
  };
  const northRuns = mergeRuns(northSegs, 'x'), eastRuns = mergeRuns(eastSegs, 'y');

  const fails = [];
  const note = [];

  console.log('===== WINDOWS =====');
  console.log(`world ${W}x${H} world px (authored ${A(W)}x${A(H)}), S=${S}`);
  console.log(`${WINDOWS.length} panes: ${north.length} north, ${east.length} east`);
  console.log(`perimeter segments: ${northSegs.length} north, ${eastSegs.length} east\n`);

  if (!WINDOWS.length) fails.push('no WINDOWS at all');
  if (!north.length)   fails.push('north facade has no windows');
  if (!east.length)    fails.push('east facade has no windows');

  for (const p of WINDOWS) {
    const horiz = p.side === 'n';
    const segs  = horiz ? northSegs : eastSegs;
    const runs  = horiz ? northRuns : eastRuns;
    const a0 = horiz ? p.x : p.y, a1 = horiz ? p.x + p.w : p.y + p.h;

    // (1) fully inside one contiguous RUN of wall, along the wall's long axis
    if (!runs.some(r => a0 >= r[0] && a1 <= r[1])) {
      fails.push(`${p.side} pane @${A(p.x)},${A(p.y)} (authored) is not backed by wall `
               + `— it spans a gap, overhangs the end, or sits off the facade entirely`);
      continue;
    }
    // the segment carrying its cross-axis band (any of the run's rects overlapping it)
    const seg = segs.find(s => {
      const s0 = horiz ? s.x : s.y, s1 = horiz ? s.x + s.w : s.y + s.h;
      return a1 > s0 && a0 < s1;
    });
    if (!seg) continue;

    // (2) cross-axis inside that segment's band -> set INTO the wall
    const c0 = horiz ? p.y : p.x, c1 = horiz ? p.y + p.h : p.x + p.w;
    const b0 = horiz ? seg.y : seg.x, b1 = horiz ? seg.y + seg.h : seg.x + seg.w;
    if (c0 < b0 - 1 || c1 > b1 + 1)
      fails.push(`${p.side} pane @${A(p.x)},${A(p.y)} hangs outside the wall band `
               + `(pane ${A(c0)}..${A(c1)} vs wall ${A(b0)}..${A(b1)} authored)`);
  }

  // (3) the run reaches both ends of each facade
  const reach = (list, lo, hi, axis, label) => {
    if (!list.length) return;
    const starts = list.map(p => axis === 'x' ? p.x : p.y);
    const ends   = list.map(p => axis === 'x' ? p.x + p.w : p.y + p.h);
    const span   = Math.max(...ends) - Math.min(...starts);
    const gap    = list.length > 1 ? span / list.length : span;   // ~one pane pitch
    const headroom = Math.min(...starts) - lo, tailroom = hi - Math.max(...ends);
    note.push(`${label}: run ${A(Math.min(...starts))}..${A(Math.max(...ends))} authored, `
            + `${A(headroom)} clear at the start, ${A(tailroom)} at the end`);
    if (headroom > gap) fails.push(`${label} run starts ${A(headroom)}u in — more than one pane pitch (${A(gap)}u)`);
    if (tailroom > gap) fails.push(`${label} run stops ${A(tailroom)}u short — more than one pane pitch (${A(gap)}u)`);
  };
  if (northSegs.length) reach(north, Math.min(...northSegs.map(s => s.x)),
                                     Math.max(...northSegs.map(s => s.x + s.w)), 'x', 'north');
  if (eastSegs.length)  reach(east,  Math.min(...eastSegs.map(s => s.y)),
                                     Math.max(...eastSegs.map(s => s.y + s.h)), 'y', 'east');

  note.forEach(n => console.log('  ' + n));
  console.log('');

  if (fails.length) {
    console.log('  ‼ FAIL:');
    fails.forEach(f => console.log('   - ' + f));
    console.log('\nWINDOWS: RED ❌');
    process.exit(1);
  }
  console.log('WINDOWS: GREEN ✅  (every pane set into a perimeter wall, both runs reach the corners)');
  process.exit(0);
}

main();
