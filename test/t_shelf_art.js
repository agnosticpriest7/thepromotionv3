/* GROCERY SHELF ART — five purpose-built aisle runs replacing the placeholder supply_shelf.

   ⚠️ THE RUN WAS ALREADY ONE BLOCKER. It used to draw as five supply_shelf units butted end to
   end, but levelBlockers only ever got ONE rect per run — the units were cosmetic. So collapsing
   five sprites into one asset is not a nav change, and this suite's job is to prove that claim
   rather than assume it.

   ⚠️ THE FOOTPRINT IS A PACKING PROBLEM, NOT A COMPRESSION ONE. A sprite's height is DERIVED from
   its width (h = naturalHeight * w / naturalWidth), so choosing 245 authored of run length forces
   74 authored of width, and six of those with 58-authored aisles needs 734 against the 652 the
   sales floor has. The run is therefore 60 x 199, which keeps SIX runs and the aisle width, and
   spends the difference on run length. The number that actually matters is unchanged and is
   asserted below: blocker-to-blocker across an aisle is 60 authored, exactly as before.

   ⚠️ THE NEGATIVE CASE IS RUN LIVE, NOT LEFT TO A MUTANT. A traversability test that only ever
   sees a passing floor cannot tell a working footprint from a lucky one, so section 4 widens a run
   past its budget, rebuilds the grid, and REQUIRES the aisle to close. If that pose still walks,
   the assertion is worthless no matter how green the rest is. */
'use strict';
const { createWorld } = require('./harness');

let pass = 0, fail = 0;
const ck = (n, c, d) => { console.log('  ' + (c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '   ' + d : '')); c ? pass++ : fail++; };
const mk = lv => createWorld({ seed: 20260827, storage: { 'promo:level': lv, 'promo:newgame': '0', 'promo:char': '0' } });

/* SPEC, fixed at authoring time so a mutant cannot redefine the floor to satisfy it. */
/* FIVE RUNS SINCE THE RE-PLAN, and the westmost of them is the FROZEN aisle -- frozen is not a
   department, just the run against the wall wanting its own case art. Five runs, five variants,
   so each run now carries a distinct face instead of one repeating. The count is an authoring
   fact and belongs written down (CLAUDE.md 14): add or drop a run and this goes red. */
const RUNS = 5, VARIANTS = 5, AISLES = RUNS - 1;
/* ⚠️ 65, NOT 60, AND THE RUNS ARE WHY. grocery-prop-scale sized every store prop from its real
   size at one scale, and a gondola run is 1.3 m -- 55 authored, where it had been 60 because it
   was sized to the space rather than to the fixture. The pitch did not move, so the runs stay
   where they were judged and the aisles got the 5 back. Wider is safe; the number is asserted so
   that a future change has to mean it. */
const AISLE_CLEAR = 65;            // authored, blocker-to-blocker
const ART = ['shelf_run_a', 'shelf_run_b', 'shelf_run_c', 'shelf_run_d', 'shelf_run_e'];

const runsOf = w => w.g.layout.containers.filter(c => c.label === 'Shelf');
const runBlockers = (w) => {
  const S = w.g.layout.S, A = v => Math.round(v / S);
  return w.g.layout.levelBlockers.map(b => ({ x: A(b.x), y: A(b.y), w: A(b.w), h: A(b.h) }))
    .filter(b => b.h > 150 && b.h < 300 && b.w < 100).sort((p, q) => p.x - q.x);
};

/* ---- 1. THE ART LOADS ------------------------------------------------------------------ */
{
  const w = mk('grocery');
  const A = w.g.ART || {};                 // module-scope const; reachable only via the accessor
  const missing = ART.filter(n => !A[n]);
  ck('all five run sprites are registered and loaded', missing.length === 0,
     missing.length ? 'missing: ' + missing.join(', ') : ART.length + ' loaded');

  /* registered in ART_FILES is what actually loads one — the `phone` scar. And keyed, or every
     run draws on an opaque magenta slab. */
  const dims = ART.map(n => { const im = A[n]; return im ? (im.naturalWidth + 'x' + im.naturalHeight) : 'none'; });
  ck('  ^ and each reports its real 496x1650, not the 64x64 stub',
     dims.every(d => d === '496x1650'), dims.join(' '));

  const fs = require('fs'), path = require('path');
  const notKeyed = ART.filter(n => !new RegExp("'" + n + "'").test(
    fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').split('const MAGENTA_BG')[1].split(']);')[0]));
  ck('  ^ and every one is in MAGENTA_BG, or it draws on a magenta slab',
     notKeyed.length === 0, notKeyed.length ? notKeyed.join(', ') : 'all five keyed');
}

/* ---- 2. SIX RUNS, FIVE VARIANTS, NO TWO ADJACENT ALIKE ---------------------------------- */
{
  const w = mk('grocery');
  const runs = runsOf(w).sort((a, b) => a.x - b.x);
  ck('the aisle band is one sprite per run', runs.length === RUNS,
     runs.length + ' shelf sprites (was 30 = 6 runs x 5 stacked units)');

  const seq = runs.map(r => r.art);
  ck('every run carries one of the five run sprites',
     seq.length === RUNS && seq.every(a => ART.indexOf(a) >= 0), seq.join(', '));

  let clash = [];
  for (let i = 0; i < seq.length - 1; i++) if (seq[i] === seq[i + 1]) clash.push(i + '/' + (i + 1) + '=' + seq[i]);
  ck('no two ADJACENT runs share a variant', clash.length === 0,
     clash.length ? clash.join(' ') : seq.map(s => s.slice(-1)).join(''));

  ck('  ^ and all five variants are actually used', new Set(seq).size === VARIANTS,
     new Set(seq).size + ' of ' + VARIANTS + ' distinct');
}

/* ---- 2b. THE SOUTH CAPS ------------------------------------------------------------------
   One cap per run, on the same centre line, butted against the run's south face. SOUTH ONLY:
   the product band is along the cap's bottom edge, so a north cap would light from the wrong
   side — which is why the asset is never flipped rather than merely "not flipped yet". */
{
  const w = mk('grocery'), g = w.g, L = g.layout, sc = L.S, A = v => Math.round(v / sc);
  const runs = L.containers.filter(c => c.label === 'Shelf').sort((a, b) => a.x - b.x);
  const caps = L.containers.filter(c => c.label === 'Endcap run').sort((a, b) => a.x - b.x);

  ck('every run has exactly one south cap', caps.length === RUNS && runs.length === RUNS,
     runs.length + ' runs, ' + caps.length + ' caps');
  ck('  ^ and every cap uses the endcap sprite',
     caps.length > 0 && caps.every(c => c.art === 'endcap'),
     [...new Set(caps.map(c => c.art))].join(', '));
  ck('  ^ which is loaded, at its real 496x386', !!(g.ART && g.ART['endcap']) &&
     g.ART['endcap'].naturalWidth === 496 && g.ART['endcap'].naturalHeight === 386,
     g.ART && g.ART['endcap'] ? (g.ART['endcap'].naturalWidth + 'x' + g.ART['endcap'].naturalHeight) : 'MISSING');

  /* drawn footprints, the way sprAt actually lays them out: centred on x, bottom on y+h+U1(4).
     ⚠️ measured off the REAL png aspect — the harness reads it from the file header now. */
  const drawn = (art) => { const im = g.ART[art], wS = L.ART_W[art];
    return { wA: wS / sc, hA: Math.round(im.naturalHeight * wS / im.naturalWidth) / sc }; };
  const R = drawn('shelf_run_a'), C = drawn('endcap');
  ck('a cap is exactly as wide as a run, so they cannot be out of step',
     Math.abs(R.wA - C.wA) < 0.01, R.wA.toFixed(1) + ' vs ' + C.wA.toFixed(1) + ' authored');

  const joins = [], offsets = [];
  for (let i = 0; i < runs.length; i++) {
    const r = runs[i], c = caps[i];
    const rBot = A(r.y) + A(r.h) + Math.round(4 / sc);
    const cBot = A(c.y) + A(c.h) + Math.round(4 / sc), cTop = cBot - C.hA;
    joins.push(cTop - rBot);
    offsets.push((A(c.x) + A(c.w) / 2) - (A(r.x) + A(r.w) / 2));
  }
  /* 1 authored is the flush tolerance because CONTAINERS are authored integers — the quantisation
     floor is 1 unit (1.8 scaled px), so anything under it is as flush as this level format can
     express. Measured: 0.33 authored, well inside one screen pixel. */
  ck('every cap butts its run — no gap and no overlap',
     joins.every(j => Math.abs(j) <= 1), 'joins ' + joins.map(j => j.toFixed(2)).join(', ') + ' authored');
  ck('  ^ and sits on the run\'s own centre line',
     offsets.every(o => o === 0), 'x offsets ' + offsets.join(', '));

  /* SOUTH ONLY — the cap must be BELOW its run, never above it, and there must be no second cap. */
  const northCaps = [];
  for (let i = 0; i < runs.length; i++) {
    const rTop = A(runs[i].y) + A(runs[i].h) + Math.round(4 / sc) - R.hA;
    const cBot = A(caps[i].y) + A(caps[i].h) + Math.round(4 / sc);
    if (cBot <= rTop) northCaps.push(i);
  }
  ck('no cap is on a north end', northCaps.length === 0,
     northCaps.length ? 'runs ' + northCaps.join(',') : 'all six caps are south');

  /* keyed, or every cap draws on an opaque magenta slab */
  const fs = require('fs'), path = require('path');
  const mag = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8')
    .split('const MAGENTA_BG')[1].split(']);')[0];
  /* the detail has to describe what was MEASURED, not what was hoped for: the first version
     printed "'endcap' present" on the failing run too, which is a failure message that says the
     opposite of the failure. */
  ck('  ^ and the cap is in MAGENTA_BG too', /'endcap'/.test(mag),
     /'endcap'/.test(mag) ? "'endcap' listed" : "NOT listed - caps would draw on magenta slabs");

  /* ⚠️ A DRAWN CAP THAT IS NOT SOLID IS A HOLE YOU CAN WALK THROUGH. Everything above measures
     where the cap is DRAWN; none of it would notice the blocker still stopping at the run's south
     face, which would let the player walk straight through six endcaps. So the blocker is required
     to reach the cap's drawn bottom. */
  const bl = runBlockers(w);
  const capBottoms = caps.map(c => A(c.y) + A(c.h) + Math.round(4 / sc));
  const shortfalls = bl.map((b, i) => capBottoms[i] - (b.y + b.h)).filter(d => d > 2);
  ck('the blocker covers the cap, so a cap cannot be walked through',
     bl.length === RUNS && shortfalls.length === 0,
     'blocker bottoms ' + bl.map(b => b.y + b.h).join(',') + '  vs cap bottoms ' + capBottoms.join(','));

  /* the block ends inside GROCERY, not on top of the front end */
  const gz = L.ROOMS.find(r => r.name === 'GROCERY');
  const bot = Math.max(...bl.map(b => b.y + b.h));
  ck('run+cap stops inside the GROCERY zone', bot <= A(gz.y) + A(gz.h),
     'block ends y ' + bot + ', zone ends ' + (A(gz.y) + A(gz.h)));
}

/* ---- 3. THE ASSIGNMENT IS A PROPERTY OF THE LEVEL, NOT OF THE SESSION -------------------- */
{
  /* different seeds, so anything random would diverge */
  const a = createWorld({ seed: 111, storage: { 'promo:level': 'grocery', 'promo:newgame': '0', 'promo:char': '0' } });
  const b = createWorld({ seed: 999, storage: { 'promo:level': 'grocery', 'promo:newgame': '0', 'promo:char': '0' } });
  const sa = runsOf(a).sort((p, q) => p.x - q.x).map(r => r.art).join(',');
  const sb = runsOf(b).sort((p, q) => p.x - q.x).map(r => r.art).join(',');
  ck('the same run gets the same variant on a reload, under a different seed', sa === sb,
     sa === sb ? sa.replace(/shelf_run_/g, '') : sa + '  vs  ' + sb);
}

/* ---- 4. TRAVERSABILITY — THE ONE THAT MATTERS, BOTH WAYS --------------------------------- */
{
  const w = mk('grocery'), S = w.sandbox, g = w.g;
  const sc = g.layout.S;
  const bl = runBlockers(w);
  ck('six run blockers, one per run', bl.length === RUNS, bl.length + ' found');

  const gaps = [];
  for (let i = 0; i < bl.length - 1; i++) gaps.push(bl[i + 1].x - (bl[i].x + bl[i].w));
  ck('every aisle is ' + AISLE_CLEAR + ' authored clear — the width the floor already had',
     gaps.length === AISLES && gaps.every(v => v === AISLE_CLEAR), gaps.join(', '));

  /* ⚠️ WALK THE AISLE, DON'T ASK IF THE ENDS CONNECT. The first version of this ran astar from
     north of the runs to south of them and called that "traversable" — but astar happily routes
     AROUND the whole band via the cross-aisles, so it returned a path with the aisle sealed. It
     passed the widened pose too, which is how it was caught. What follows steps DOWN each aisle
     and requires clear grid at every height: that measures the corridor, not the building.

     ⚠️ RUN RECTS ARE CAPTURED BY IDENTITY, ONCE. Re-deriving them by width each pass let a
     widened run fall out of its own filter, so the aisles were recomputed AROUND the mutation and
     the floor looked fine — the t_grocery shelf-column lesson, hit again here. */
  const rects = g.layout.levelBlockers
    .filter(b => Math.round(b.h / sc) > 150 && Math.round(b.h / sc) < 300 && Math.round(b.w / sc) < 100)
    .sort((p, q) => p.x - q.x);
  const au = v => Math.round(v / sc);
  /* ⚠️ A PATH THAT LEAVES THE AISLE HAS NOT WALKED THE AISLE. Counting clear cells at each height
     was not enough either: aisle 4 had one clear cell at every height while the player's desk sat
     across its middle, and t_grocery caught that when this did not. So the path is required to
     STAY INSIDE the aisle's own x-span for its whole length — anything that detours out through a
     cross-aisle and back is rejected, which is what makes this measure the corridor. */
  const CELLA = 20;                                   // CELL is 20 authored
  const walkAisle = (i) => {
    const x0 = au(rects[i].x) + au(rects[i].w), x1 = au(rects[i + 1].x);
    const top = au(rects[i].y), bot = top + au(rects[i].h);
    const mx = Math.round((x0 + x1) / 2);
    /* ⚠️ THE CENTRE LINE HAS TO BE CLEAR, not merely "some route through". Allowing the path to
       slide down whichever side of the aisle is open let the player's desk sit across aisle 4 and
       still pass — t_grocery caught that and this did not, because a blocked START cell does not
       stop astar from routing out of it. So the aisle's own centre is walked cell by cell first,
       which is the contract t_grocery already holds the floor to. */
    for (let y = top; y <= bot; y += 12)
      if (!S.walkableAt(Math.round(mx * sc), Math.round(y * sc)))
        return { ok: false, why: 'centre blocked at y' + y };
    const a = S.cellOf(Math.round(mx * sc), Math.round((top - 10) * sc));
    const b = S.cellOf(Math.round(mx * sc), Math.round((bot + 10) * sc));
    if (!S.walkableAt(Math.round(mx * sc), Math.round((top - 10) * sc))) return { ok: false, why: 'north mouth blocked' };
    if (!S.walkableAt(Math.round(mx * sc), Math.round((bot + 10) * sc))) return { ok: false, why: 'south mouth blocked' };
    const p = S.astar(a.r, a.c, b.r, b.c);
    if (!p || !p.length) return { ok: false, why: 'no path' };
    /* and the path must not wander out of the aisle and back — a detour through a cross-aisle is
       not "walking the aisle", which is what the first version of this accidentally accepted. */
    const lo = (x0 - CELLA) * sc, hi = (x1 + CELLA) * sc;
    const stray = p.filter(([r, c]) => { const cx = c * S.CELL + S.CELL / 2; return cx < lo || cx > hi; });
    return { ok: stray.length === 0, why: stray.length ? (stray.length + ' cells outside the aisle') : '' };
  };
  const bad = [];
  for (let i = 0; i < rects.length - 1; i++) { const r = walkAisle(i); if (!r.ok) bad.push('aisle ' + i + ' (' + r.why + ')'); }
  ck('every aisle walks end to end WITHOUT leaving the aisle',
     bad.length === 0, bad.length ? bad.join(', ') : AISLES + ' aisles walk cleanly');

  /* how much room is actually in there, reported so the margin is a measured number not a hope */
  const narrowest = () => {
    let worst = Infinity, where = '';
    for (let i = 0; i < rects.length - 1; i++) {
      const x0 = au(rects[i].x) + au(rects[i].w), x1 = au(rects[i + 1].x);
      for (let y = au(rects[i].y) + 8; y <= au(rects[i].y) + au(rects[i].h) - 8; y += 24) {
        let n = 0;
        for (let x = x0; x <= x1; x++) if (S.walkableAt(Math.round(x * sc), Math.round(y * sc))) n++;
        if (n < worst) { worst = n; where = 'aisle ' + i + ' @y' + y; }
      }
    }
    return { cells: worst / CELLA, where };
  };
  const open = narrowest();
  ck('  ^ and the tightest point still has clear grid in it',
     open.cells >= 1, open.cells + ' clear cell(s) at ' + open.where);

  /* ⚠️ THE NEGATIVE CASE, POSED LIVE — and RE-MEASURED after the rescale rather than carried over.
     It used to widen by 48, which bit when aisles were 60 clear. They are 65 now, so +48 leaves 41
     and the aisle still walks: the old mutation would have passed while proving nothing. Measured
     again on this floor: 65 walks, 39 walks, 37 is CLOSED. So the pose was +56.

     AND RE-MEASURED AGAIN AFTER THE RE-PLAN, because it stopped biting. The threshold is not a
     width, it is an ALIGNMENT: a 20-wide cell has to fall entirely inside the gap. The runs used
     to start at x=320 and now start at 24, so the same 37-unit gap lands differently against the
     cell boundaries -- aisle 0 runs 77..142, and cell 80..100 stays clear until the run's edge
     crosses 102, which takes 42 a side rather than 28. A negative case carried across a re-plan
     is a negative case that has stopped proving anything. So the pose is +88. */
  const victim = rects[1];                                   // an INNER run, so both its aisles narrow
  const keep = { x: victim.x, w: victim.w };
  victim.x -= Math.round(44 * sc); victim.w += Math.round(88 * sc);
  S.buildGrid();
  const shutCells = narrowest();
  const shutWalk = [];
  for (let i = 0; i < rects.length - 1; i++) if (!walkAisle(i).ok) shutWalk.push(i);
  victim.x = keep.x; victim.w = keep.w; S.buildGrid();        // put the floor back
  ck('  ^ and widening a run past its budget DOES close an aisle',
     shutCells.cells === 0 && shutWalk.length > 0,
     shutWalk.length + ' aisle(s) unwalkable, ' + shutCells.cells + ' clear cell(s) at ' + shutCells.where);

  const back = narrowest();
  const backBad = [];
  for (let i = 0; i < rects.length - 1; i++) if (!walkAisle(i).ok) backBad.push(i);
  ck('  ^ and the floor is restored afterwards', back.cells >= 1 && backBad.length === 0,
     back.cells + ' clear cell(s) again, ' + (AISLES - backBad.length) + '/' + AISLES + ' aisles walk');
}

/* ---- 5. THE CREW STILL STAND IN THE AISLES, NOT IN THE SHELVES --------------------------- */
{
  const w = mk('grocery'), g = w.g, sc = g.layout.S;
  const bl = runBlockers(w);
  const A = v => Math.round(v / sc);
  const inRun = (x, y) => bl.some(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
  const stuck = g.desks.filter(d => d.station)
    .map(d => ({ n: d.owner, x: A(d.x + d.w / 2), y: A(d.y + d.h / 2) }))
    .filter(p => inRun(p.x, p.y));
  ck('no station sits inside a shelf run after the band was widened',
     stuck.length === 0, stuck.length ? stuck.map(p => p.n + '(' + p.x + ',' + p.y + ')').join(' ') : 'all clear');

  const objs = g.layout.objects.map(o => ({ l: o.label, x: A(o.x + o.w / 2), y: A(o.y + o.h / 2) })).filter(o => inRun(o.x, o.y));
  ck('  ^ and no prop was swallowed by one either',
     objs.length === 0, objs.length ? objs.map(o => o.l + '(' + o.x + ',' + o.y + ')').join(' ') : 'all clear');
}

/* ---- 6. THE OFFICE IS UNTOUCHED — MEASURED, NOT INFERRED --------------------------------- */
{
  const w = mk('office'), g = w.g;
  const shelves = g.layout.containers.filter(c => c.label === 'Shelf');
  ck('the office has no grocery shelf runs', shelves.length === 0, shelves.length + ' found');
  const usesRunArt = g.layout.containers.filter(c => ART.indexOf(c.art) >= 0);
  ck('  ^ and no office container uses the new art', usesRunArt.length === 0, usesRunArt.length + ' found');
  ck('  ^ and supply_shelf is still the office prop it always was',
     !!(w.g.ART && w.g.ART['supply_shelf']), 'still loaded');
}

console.log('\nshelf art: ' + pass + ' pass, ' + fail + ' fail');
console.log(fail ? 'SHELF ART: RED ❌' : 'SHELF ART: GREEN ✅ (five runs, five faces, every aisle still walks)');
process.exit(fail ? 1 : 0);
