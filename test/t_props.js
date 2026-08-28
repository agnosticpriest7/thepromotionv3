/* GROCERY PROPS — the store's own fixtures, replacing the last of the office placeholders.

   ⚠️ THE CHECKOUTS WERE RE-LAID, AND THAT IS A LAYOUT CHANGE, NOT A RESKIN. They were east-west
   bars — three counter_plain tiles, 148 wide x 48 deep. The checkstand art is drawn running
   NORTH-SOUTH, and rotating a top-down sprite lights it from the wrong side, so the choice was
   re-draw the art or re-lay the floor. Both mirrors were supplied and the lanes were re-laid.
   The gaps BETWEEN lanes are the walkways now, which is how a real front end works, so the
   traversability question moved with them: it is no longer "can you walk along the front", it is
   "can you get from the door to the sales floor", and that is what section 4 asserts.

   ⚠️ THE CREW ARE DERIVED FROM THE CHECKOUTS AND BROKE WHEN THE CHECKOUTS MOVED. LANE_Y was
   CHK_Y+34 and the cashier x was chkXs[i]+CTR*3/2 — both describing a shape that no longer
   exists — so Priya and Marguerite ended up inside lane blockers and Danika inside a shelf run
   AND in the GROCERY zone. t_grocery_crew caught all three. They are re-derived from the lane
   they actually work; this suite pins that they stay out of solid boxes. */
'use strict';
const { createWorld } = require('./harness');

let pass = 0, fail = 0;
const ck = (n, c, d) => { console.log('  ' + (c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '   ' + d : '')); c ? pass++ : fail++; };
const mk = lv => createWorld({ seed: 20260828, storage: { 'promo:level': lv, 'promo:newgame': '0', 'promo:char': '0' } });

/* SPEC, fixed at authoring time (§14). */
const TRAYS = 4, LANES = 4, CASE_PITCH = 180;
const NEW_ART = ['deli_case', 'bakery_case', 'dairy_case', 'produce_fruit_a', 'produce_fruit_b',
                 'produce_veg', 'produce_mixed', 'pallet', 'baler', 'checkstand', 'checkstand_r', 'goback_cart'];
/* what the store reuses from the office rather than growing its own copy of */
const REUSED = [['Staff lockers', 'lockers'], ['Department board', 'whiteboard'],
                ['Intercom', 'phone'], ['Store manager desk', 'manager_desk'], ['Owner desk', 'manager_desk']];

/* ---- 1. EVERY FILE LOADS, AND IS KEYED --------------------------------------------------- */
{
  const w = mk('grocery'), g = w.g;
  const A = g.ART || {};
  const missing = NEW_ART.filter(n => !A[n]);
  ck('all twelve new sprites are registered and loaded', missing.length === 0,
     missing.length ? 'MISSING: ' + missing.join(', ') : NEW_ART.length + ' loaded');

  const stub = NEW_ART.filter(n => A[n] && A[n].naturalWidth === 64 && A[n].naturalHeight === 64);
  ck('  ^ and none fell back to the 64x64 stub (which means the file is not on disk)',
     stub.length === 0, stub.length ? stub.join(', ') : 'all report real dimensions');

  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const mag = src.split('const MAGENTA_BG')[1].split(']);')[0];
  const unkeyed = NEW_ART.filter(n => !new RegExp("'" + n + "'").test(mag));
  ck('  ^ and every one is keyed, or it draws on an opaque magenta slab',
     unkeyed.length === 0, unkeyed.length ? unkeyed.join(', ') : 'all twelve keyed');
}

/* ---- 2. THE PRODUCE TRAYS ---------------------------------------------------------------- */
{
  const w = mk('grocery'), L = w.g.layout;
  const trays = L.containers.filter(c => c.label === 'Produce display').sort((a, b) => a.y - b.y || a.x - b.x);
  ck('four produce trays on the floor', trays.length === TRAYS, trays.length + ' trays');

  const arts = trays.map(t => t.art);
  ck('  ^ and all four variants are used', new Set(arts).size === TRAYS, arts.join(', '));

  /* ⚠️ BOTH DIRECTIONS. They are laid out 2x2, so a row-only adjacency rule would happily let the
     two COLUMNS match — the kind of half-check that passes while the floor looks wrong. */
  const sc = L.S, A = v => Math.round(v / sc);
  const clash = [];
  for (let i = 0; i < trays.length; i++) for (let j = i + 1; j < trays.length; j++) {
    const a = trays[i], b = trays[j];
    const near = Math.abs(A(a.x) - A(b.x)) < 140 && Math.abs(A(a.y) - A(b.y)) < 120;
    if (near && a.art === b.art) clash.push(i + '/' + j + '=' + a.art);
  }
  ck('  ^ and no two neighbouring trays share a variant, in either direction',
     clash.length === 0, clash.length ? clash.join(' ') : arts.map(a => a.replace('produce_', '')).join(' / '));

  /* stable across a reload, under a different seed — a property of the level, not the session */
  const a = createWorld({ seed: 5, storage: { 'promo:level': 'grocery', 'promo:newgame': '0', 'promo:char': '0' } });
  const b = createWorld({ seed: 987654, storage: { 'promo:level': 'grocery', 'promo:newgame': '0', 'promo:char': '0' } });
  const seqOf = ww => ww.g.layout.containers.filter(c => c.label === 'Produce display')
    .sort((p, q) => p.y - q.y || p.x - q.x).map(c => c.art).join(',');
  ck('  ^ and the same tray gets the same variant on a reload', seqOf(a) === seqOf(b),
     seqOf(a) === seqOf(b) ? seqOf(a).replace(/produce_/g, '') : seqOf(a) + '  vs  ' + seqOf(b));
}

/* ---- 3. DELI AND BAKERY SIT FLUSH IN ONE RUN --------------------------------------------- */
{
  const w = mk('grocery'), g = w.g, L = g.layout, sc = L.S, A = v => Math.round(v / sc);
  const run = re => L.containers.filter(c => re.test(c.label || '')).sort((a, b) => a.x - b.x);
  const bake = run(/bakery/i), deli = run(/deli/i);
  ck('the bakery and deli runs are both built from cases', bake.length >= 2 && deli.length >= 2,
     bake.length + ' bakery, ' + deli.length + ' deli');

  const pitches = arr => { const g2 = []; for (let i = 1; i < arr.length; i++) g2.push(A(arr[i].x) - A(arr[i - 1].x)); return g2; };
  const bp = pitches(bake), dp = pitches(deli);
  ck('  ^ butted at a uniform pitch, no gaps and no overlaps',
     bp.concat(dp).every(v => Math.abs(v - CASE_PITCH) <= 1),
     'bakery ' + bp.join('/') + '  deli ' + dp.join('/') + ' authored (case is ' + CASE_PITCH + ')');

  /* the two cases share a SCALE, so their drawn depths land within the level's 1-unit floor */
  const drawn = a2 => { const im = g.ART[a2], wS = L.ART_W[a2]; return (im.naturalHeight * wS / im.naturalWidth) / sc; };
  ck('  ^ and deli and bakery are the same depth to within a unit',
     Math.abs(drawn('deli_case') - drawn('bakery_case')) <= 1,
     'deli ' + drawn('deli_case').toFixed(1) + ' vs bakery ' + drawn('bakery_case').toFixed(1) + ' authored');

  /* the dairy case exists, is solid, and carries no trigger */
  const dairy = L.containers.filter(c => /dairy/i.test(c.label || ''));
  ck('the dairy case is on the floor', dairy.length === 1, dairy.length + ' found');
  const objs = L.objects.filter(o => /dairy/i.test(o.label || ''));
  ck('  ^ and it is set dressing — no trigger, no task', objs.length === 0,
     objs.length ? 'it grew a trigger' : 'no object entry, as briefed');
}

/* ---- 4. THE FLOOR STILL WALKS — INCLUDING THROUGH THE NEW CHECKOUTS ----------------------- */
{
  const w = mk('grocery'), g = w.g, S = w.sandbox, L = g.layout, sc = L.S, A = v => Math.round(v / sc);
  const lanes = L.containers.filter(c => c.label === 'Checkstand').sort((a, b) => a.x - b.x);
  ck('four checkout lanes', lanes.length === LANES, lanes.length + ' lanes');
  ck('  ^ with the tills facing each other in each cluster',
     lanes.length === LANES && lanes[0].art === 'checkstand' && lanes[1].art === 'checkstand_r' &&
     lanes[2].art === 'checkstand' && lanes[3].art === 'checkstand_r',
     /* the first version chained .replace('checkstand','till-right').replace('_r','') and so
        printed "till-right" for BOTH mirrors -- an assertion that passed while its own message
        said the opposite of what it had checked. */
     lanes.map(l => l.art === 'checkstand_r' ? 'till-LEFT' : 'till-RIGHT').join(', '));

  /* lane blockers must run NORTH-SOUTH now, not east-west */
  const lb = L.levelBlockers.map(b => ({ x: A(b.x), y: A(b.y), w: A(b.w), h: A(b.h) }))
    .filter(b => b.y >= 500 && b.y < 660 && b.h > 80).sort((p, q) => p.x - q.x);
  ck('  ^ and each lane is a north-south blocker, not an east-west bar',
     lb.length === LANES && lb.every(b => b.h > b.w),
     lb.map(b => b.w + 'x' + b.h).join(' '));

  /* ⚠️ THE QUESTION THAT MATTERS AT A FRONT END: can you get from the door to the sales floor?
     The lanes are perpendicular to the wall now, so the walkways are the gaps between them. */
  const walk = (x, y) => S.walkableAt(Math.round(x * sc), Math.round(y * sc));
  const cellOf = (x, y) => S.cellOf(Math.round(x * sc), Math.round(y * sc));
  const doorToFloor = () => {
    const a = cellOf(750, 700);         // in the entrance vestibule, below the door
    const b = cellOf(645, 440);         // in the middle of an aisle, up in GROCERY
    const p = S.astar(a.r, a.c, b.r, b.c);
    return !!(p && p.length);
  };
  ck('you can still walk from the entrance to the sales floor',
     doorToFloor(), doorToFloor() ? 'door -> aisle path found' : 'NO PATH — the lanes sealed the front end');

  /* and the cross-aisle north of the lanes is real floor, not a sliver */
  let open = 0;
  for (let x = 200; x < 1300; x += 20) if (walk(x, 495)) open++;
  ck('  ^ and the cross-aisle between the shelf block and the lanes is walkable',
     open >= 40, open + ' walkable samples along y=495');

  /* ⚠️ NEGATIVE CASE, POSED LIVE — and SIZED BY MEASUREMENT. The first version swelled a lane
     600 authored across the middle gap and the path survived, because the front end is wide and
     the route simply went round the north cross-aisle. That is not the check failing to matter,
     it is the check being pointed at the wrong throat: the store has exactly ONE way in, the
     120-wide door in the south wall, so the thing to seal is the door, not the gap. A lane that
     grows over it and down to the wall MUST cut the store off. */
  const victim = L.levelBlockers.find(b => A(b.h) > 80 && A(b.y) >= 500 && A(b.x) > 900 && A(b.x) < 1100);
  const keep = { x: victim.x, y: victim.y, w: victim.w, h: victim.h };
  victim.x = Math.round(680 * sc); victim.w = Math.round(140 * sc);      // over the door (690..810)
  victim.h = Math.round((655 - A(victim.y)) * sc);                       // and down to the south wall
  S.buildGrid();
  const sealed = !doorToFloor();
  victim.x = keep.x; victim.y = keep.y; victim.w = keep.w; victim.h = keep.h; S.buildGrid();
  ck('  ^ and a lane grown over the door DOES cut the store off',
     sealed, sealed ? 'sealed as it must' : 'still walkable — the check does not bite');
  ck('  ^ and the floor is restored afterwards', doorToFloor(), 'path found again');
}

/* ---- 5. WHAT THE STORE REUSES FROM THE OFFICE -------------------------------------------- */
{
  const w = mk('grocery'), L = w.g.layout;
  const artOf = (label) => {
    const c = L.containers.find(x => (x.label || '') === label);
    if (c) return c.art || L.CONT_ART[c.kind];
    const o = L.objects.find(x => (x.label || '') === label);
    return o ? (o.art || L.OBJ_ART[o.type]) : null;
  };
  const wrong = REUSED.filter(([label, art]) => artOf(label) !== art)
    .map(([label, art]) => label + ' -> ' + artOf(label) + ' (wanted ' + art + ')');
  ck('the store reuses the office art for lockers, board, intercom and the two desks',
     wrong.length === 0, wrong.length ? wrong.join('; ') : REUSED.map(r => r[0]).join(', '));

  /* the placeholders that were replaced are actually gone from the store */
  const stillPlaceholder = L.containers.concat(L.objects)
    .filter(c => (c.art === 'counter_plain' && /checkstand|deli|bakery/i.test(c.label || '')) ||
                 (c.art === 'supply_shelf' && /go-back/i.test(c.label || '')));
  ck('  ^ and no counter/checkstand/go-back is still on placeholder art',
     stillPlaceholder.length === 0,
     stillPlaceholder.length ? stillPlaceholder.map(c => c.label).join(', ') : 'all replaced');
}

/* ---- 5b. ONE SCALE, AND THIS IS THE ASSERTION THAT WOULD HAVE CAUGHT IT ------------------
   ⚠️ CHECKING EACH PROP AGAINST A HARDCODED NUMBER CANNOT TELL A CONSISTENT SCALE FROM A
   COINCIDENTAL ONE. Every prop used to be sized to the space it was given, so each one was
   defensible alone and the SET was incoherent: measured, they ranged 25.9 to 120 authored units
   per metre, a 4.6x spread. That is why the checkstands read as huge and the baler as tiny -- the
   checkstand was only 8% oversized, the baler 63% under. Neither is visible without the other.

   So: each prop declares its real-world size, the test derives the scale that size implies, and
   they all have to AGREE. One assertion, whole class. */
{
  const w = mk('grocery'), L = w.g.layout, sc = L.S;
  /* real-world size, in metres, of the dimension each ART_W actually sets (the sprite's width).
     ⚠️ deli/bakery are 4.27 m because the ASSET IS A MULTI-SECTION RUN, not a 1.5 m section: its
     aspect is 3.28, so at 1.5 m wide it would be 0.46 m deep, which is not a deli counter. At the
     1.3 m depth a real one has, it is 4.27 m wide. Sizing it as a "unit" would have shrunk a
     correct fixture to a third of its size. */
  const REAL_M = { shelf_run_a: 1.3, shelf_run_b: 1.3, shelf_run_c: 1.3, shelf_run_d: 1.3,
                   shelf_run_e: 1.3, endcap: 1.3, checkstand: 1.1, checkstand_r: 1.1,
                   deli_case: 4.27, bakery_case: 4.27, dairy_case: 2.5,
                   produce_fruit_a: 1.8, produce_fruit_b: 1.8, produce_veg: 1.8, produce_mixed: 1.8,
                   baler: 1.5, pallet: 1.2, goback_cart: 1.0 };
  const ppm = w.sandbox.pxPerMetre();
  ck('the store declares one scale, derived from the character sprite',
     ppm > 40 && ppm < 45, ppm.toFixed(1) + ' authored units per metre (a person is 0.5 m across)');

  const implied = Object.entries(REAL_M).map(([n, m]) => ({ n, s: ((L.ART_W[n] || 0) / sc) / m }));
  const off = implied.filter(o => Math.abs(o.s - ppm) / ppm > 0.05);
  ck('every prop of known real size implies the SAME scale, within 5%',
     off.length === 0,
     off.length ? off.map(o => o.n + ' implies ' + o.s.toFixed(1) + '/m vs ' + ppm.toFixed(1)).join('; ')
                : implied.length + ' props, ' +
                  Math.min(...implied.map(o => o.s)).toFixed(1) + '-' +
                  Math.max(...implied.map(o => o.s)).toFixed(1) + '/m');

  /* the sanity check Kyle gave: a checkout lane reads noticeably LONGER than a baler is wide */
  const laneLen = ((L.ART_W.checkstand / sc) * 1039 / 447);
  const balerW = L.ART_W.baler / sc;
  ck('  ^ so a checkout lane is about 1.6x the width of a baler, as it should be',
     laneLen / balerW > 1.4 && laneLen / balerW < 1.9,
     'lane ' + laneLen.toFixed(0) + ' long vs baler ' + balerW.toFixed(0) + ' wide = ' +
     (laneLen / balerW).toFixed(2) + 'x  (was 2.99x)');
}

/* ---- 5c. NO OFFICE FURNITURE IN A STORE ROOM ---------------------------------------------
   ⚠️ ENUMERATE BY TYPE, NOT BY POSITION. Positions rot -- t_sightlines lost (440,340) to exactly
   that. The office's loose furniture used to be drawn unconditionally, so ALL ELEVEN pieces
   rendered in Save-Rite: the CEO's desk inside the bakery case run, the reception couch on the
   Bakery floor, and nine more across DELI, PRODUCE, GROCERY, FRONT END and the ENTRANCE. */
{
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const table = src.split('const LEVEL_FURNITURE=')[1];
  ck('loose furniture is chosen by level, not drawn always', !!table,
     table ? 'LEVEL_FURNITURE table present' : 'NO per-level table — furniture is unconditional again');

  if (table) {
    /* split on the LEVEL KEYS rather than on an exact call form: the first version keyed on
       `office(){`, which stopped matching the moment the table grew a second draw position and
       became `office:{ furniture(){ ... }`. A source scan should key on the thing that identifies
       the region, not on the shape it happened to have. */
    const officeEntry  = (table.split('office:')[1] || '').split('grocery:')[0];
    const groceryEntry = (table.split('grocery:')[1] || '').split('function levelFurniturePart')[0];
    ck('  ^ and the store draws none of it',
       !/sprAt\(|drawCeoDesk\(|drawReceptionDesk\(/.test(groceryEntry),
       /sprAt\(|drawCeoDesk\(|drawReceptionDesk\(/.test(groceryEntry)
         ? 'the store entry draws furniture' : 'store entry is empty, as intended');
    const kept = ['drawCeoDesk', "'couch'", "'filing_cabinet'", "'plant'", 'drawReceptionDesk']
      .filter(k => officeEntry.indexOf(k) >= 0);
    ck('  ^ while the office keeps its own, reception counter included',
       kept.length === 5, kept.join(', '));
  }
}

/* ---- 5d. WHAT ACTUALLY DRAWS, NOT WHAT THE SOURCE SAYS -----------------------------------
   ⚠️ SECTION 5c INSPECTS THE TABLE; IT DOES NOT WATCH THE FLOOR. A mutant that left the table
   perfectly intact and simply called LEVEL_FURNITURE.office.furniture() directly -- restoring the
   original bug in full -- SURVIVED the whole suite, because the grocery entry was still empty and
   the office entry still had its five markers. Structure, not behaviour: the same gap that let a
   hardcoded light order survive t_lights.

   So render each level and watch what is drawn. sprAt/sprW are function declarations, which land
   on the sandbox global, and internal calls resolve through it -- so replacing them intercepts
   every sprite the frame actually paints. */
{
  const OFFICE_ONLY = ['ceo_desk', 'couch', 'plant', 'reception_desk2'];
  const drawnIn = (lv) => {
    const w = mk(lv), S = w.sandbox, seen = {};
    const rA = S.sprAt, rW = S.sprW;
    S.sprAt = function (n) { seen[n] = (seen[n] || 0) + 1; return rA.apply(this, arguments); };
    S.sprW  = function (n) { seen[n] = (seen[n] || 0) + 1; return rW.apply(this, arguments); };
    try { S.render(); } finally { S.sprAt = rA; S.sprW = rW; }
    return seen;
  };
  const gro = drawnIn('grocery'), off = drawnIn('office');

  const bled = OFFICE_ONLY.filter(n => gro[n]);
  ck('rendering the STORE draws no office-only furniture at all',
     bled.length === 0,
     bled.length ? 'BLED: ' + bled.map(n => n + ' x' + gro[n]).join(', ')
                 : 'none of ' + OFFICE_ONLY.join('/') + ' drawn (' + Object.keys(gro).length + ' sprites in the frame)');

  /* the paired direction — an empty frame would satisfy the check above */
  const kept = OFFICE_ONLY.filter(n => off[n]);
  ck('  ^ while rendering the OFFICE still draws all of it',
     kept.length === OFFICE_ONLY.length,
     kept.map(n => n + ' x' + off[n]).join(', '));
}

/* ---- 6. THE OFFICE IS UNTOUCHED ---------------------------------------------------------- */
{
  const w = mk('office'), L = w.g.layout;
  const leaked = L.containers.concat(L.objects).filter(c => NEW_ART.indexOf(c.art) >= 0);
  ck('no office fixture uses the store art', leaked.length === 0,
     leaked.length ? leaked.map(c => c.label).join(', ') : 'none');
  ck('  ^ and the office still has its own counters', !!w.g.ART['counter_plain'], 'counter_plain loaded');
}

console.log('\nprops: ' + pass + ' pass, ' + fail + ' fail');
console.log(fail ? 'PROPS: RED ❌' : 'PROPS: GREEN ✅ (the store is furnished, and the front end still walks)');
process.exit(fail ? 1 : 0);
