/* ============================================================================
   PLACEMENT INSPECTION — ASCII floor map + sprite-aware placement linter.

   Test tooling only. Reads the game's already-exported globals via the harness
   (never edits index.html). Props are authored by hand as x,y,w,h *collision*
   rects, but sprites draw LARGER than the box and offset from it, so placement
   edits land blind. This makes placement visible + checkable in text, the way
   the 150k soak makes render bugs visible.

   Run:   node test/placement.js
   Exits 0 when 0 FAIL, 1 otherwise — usable in the checklist right after the
   soak and before the save round-trip.

   All coordinates are printed in AUTHORED space (pre-S), matching how a human
   edits walls[]/desks[]/objects[]/CONTAINERS[]. The game's data is already
   scaled by S at module load, so we divide back out by S.
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const { createWorld } = require('./harness');

const ART_DIR = path.join(__dirname, '..', 'Art', 'sprites');

/* Authored world bounds. These are DERIVED from the live W/H in buildContext() — the literals
   below are only a fallback for a harness too old to expose them. They used to be hardcoded, and
   the east widening 1400->1500 needed a manual edit here; forgetting it made every desk past
   x1400 FAIL as out-of-bounds, a false positive in the one linter that is supposed to be the
   authority on placement. Derive it and the next resize carries through on its own. */
let WORLD_W = 1500, WORLD_H = 760;

/* ---- intrinsic sprite dimensions, read straight from the PNG IHDR ----------
   The harness stubs Image at 64x64 (aspect lost), so we read the real width/
   height off disk. Fall back to a square (authored ART_W aspect) if missing. */
const _dim = {};
function spriteDims(key) {
  if (!key) return null;
  if (key in _dim) return _dim[key];
  let d = null;
  try {
    const b = fs.readFileSync(path.join(ART_DIR, key + '.png'));
    // PNG: 8-byte sig, then IHDR chunk (type at byte 12), width@16, height@20
    if (b.length > 24 && b.readUInt32BE(12) === 0x49484452) {
      const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
      if (w > 0 && h > 0) d = { w, h };
    }
  } catch (e) { /* missing file -> null -> square fallback */ }
  _dim[key] = d;
  return d;
}

/* ---- stable map letters by prop type -------------------------------------- */
const OBJ_LET  = { printer:'P', water:'W', coffee:'C', supply:'U', files:'F',
                   alarm:'A', board:'B', phones:'H', toilet:'T' };
const CONT_LET = { cabinet:'c', box:'x', locker:'L', fridge:'G' };
const DESK_LET = 'D';

/* opts.storage seeds the boot handoff so a world other than the office can be linted. The level
   is decided before scaleWorld() runs, so it cannot be chosen after createWorld() returns. */
function buildContext(opts) {
  const w = createWorld(opts && opts.storage ? { storage: opts.storage } : undefined);
  /* ⚠️ TICK ONCE BEFORE MEASURING ANYTHING. Half the collision world is built on the first
     update, not at createWorld(): `blockers` is empty until then (index.html: `let blockers=[]`
     at module scope, filled from CONTAINERS in the first buildGrid), and part of `walls` is
     appended there too. Measured over 576 sample points on the grocery floor, 345 read walkable
     at tick 0 and only 323 at tick 1 -- so an untricked lint is asking about a floor 22 points
     more open than the one the player walks. This linter ran untricked from the day it was
     written; every wall-gap number it printed was measured against a partial wall set, and the
     printer-reachability check above could not have seen a printer blocked by a container. */
  w.run(1);
  const L = w.g.layout;
  const S = L.S || 1.8;
  const U1 = v => Math.round(v * S / 1.8);          // game's U1(), replicated
  const A  = v => Math.round(v / S);                // scaled -> authored
  // W/H are ALREADY scaled (round(1500*S) x round(760*S)), so divide back out for authored bounds
  if (L.W) WORLD_W = A(L.W);
  if (L.H) WORLD_H = A(L.H);
  const ART_W = L.ART_W || {}, OBJ_ART = L.OBJ_ART || {}, CONT_ART = L.CONT_ART || {};
  const deskArt = w.g.fn && w.g.fn.deskArt;

  function artKey(e, arr) {
    if (arr === 'objects')    return OBJ_ART[e.type];
    if (arr === 'containers') return CONT_ART[e.kind] || 'filing_cabinet';
    if (arr === 'desks')      return (deskArt ? deskArt(e) : (e.art || 'cubicle_desk'));
    return null;
  }
  function baseline(e, arr) {                        // sprAt anchor, SCALED px
    if (arr === 'desks') return {
      cx: (e.ax !== undefined ? e.ax : e.x + e.w / 2),
      cyB:(e.ay !== undefined ? e.ay : e.y + e.h + U1(8)) };
    return { cx: e.x + e.w / 2, cyB: e.y + e.h + U1(4) };   // objects + containers
  }

  /* THE shared helper: a prop's true DRAWN footprint, in authored coords.
     sprAt(name,cx,cyB,key): dw=U1(ART_W[key]||40); dh=round(nat.h*dw/nat.w);
     centered on cx, bottom at cyB, rising up-screen. */
  function spriteFootprint(e, arr) {
    const key = artKey(e, arr);
    const { cx, cyB } = baseline(e, arr);
    let dw = U1((ART_W[key] != null ? ART_W[key] : 40));
    if (!isFinite(dw) || dw <= 0) dw = 1;
    const dim = spriteDims(key);
    let dh = dim ? Math.round(dim.h * dw / dim.w) : dw;    // fallback: square
    if (!isFinite(dh) || dh <= 0) dh = dw;
    const leftPx = Math.round(cx - dw / 2), bottomPx = Math.round(cyB);
    const topPx = bottomPx - dh, rightPx = leftPx + dw;
    return {
      left: A(leftPx), right: A(rightPx), top: A(topPx), bottom: A(bottomPx),
      cx: A(cx), cyB: A(cyB), w: A(dw), h: A(dh), key: key || '?'
    };
  }

  // authored rects for walls + rooms
  const walls = (L.walls || []).map((wl, i) => ({
    i, left: A(wl.x), right: A(wl.x + wl.w), top: A(wl.y), bottom: A(wl.y + wl.h),
    glass: !!wl.glass, w: A(wl.w), h: A(wl.h) }));
  const rooms = (L.ROOMS || []).map(r => ({
    name: r.name, left: A(r.x), right: A(r.x + r.w), top: A(r.y), bottom: A(r.y + r.h) }));

  // collision-box centre (authored) — the prop's true LOCATION (vs the sprite baseline)
  const cc = e => ({ x: A(e.x + e.w / 2), y: A(e.y + e.h / 2) });
  // the three linted arrays, tagged with id + label + footprint + collision centre
  const props = [];
  /* STATIONS DRAW NOTHING, so they have no footprint to lint. A station is a desk record used to
     give a member of shop-floor staff somewhere to work — drawDesks, drawDeskPlates, drawDeskChairs
     and solid() all skip it. Stamping a cubicle-desk sprite on it reported the two cashiers as
     overlapping the checkstands they are meant to be standing at. */
  (L.desks || []).filter(e => !e.station).forEach((e, i) => props.push({
    id: 'D' + (i + 1), arr: 'desks', letter: DESK_LET,
    label: (e.owner || 'VACANT'), e, cc: cc(e), fp: spriteFootprint(e, 'desks') }));
  (L.objects || []).forEach((e, i) => props.push({
    id: 'O' + (i + 1), arr: 'objects', letter: OBJ_LET[e.type] || '?',
    label: (e.label || e.type), e, cc: cc(e), fp: spriteFootprint(e, 'objects') }));
  (L.containers || []).forEach((e, i) => props.push({
    id: 'C' + (i + 1), arr: 'containers', letter: CONT_LET[e.kind] || '?',
    label: (e.label || e.kind), e, cc: cc(e), fp: spriteFootprint(e, 'containers') }));

  // perimeter walls = the building edges; a sprite poking OUT of them is cosmetic, not a
  // wrong-room bug, so check #1 skips them.
  for (const wl of walls) {
    const h = (wl.right - wl.left) > (wl.bottom - wl.top);
    wl.perimeter = h ? (wl.top <= 4 || wl.bottom >= WORLD_H - 4)
                     : (wl.left <= 4 || wl.right >= WORLD_W - 4);
  }
  return { S, A, walls, rooms, props, spriteFootprint, world: w };
}

/* ---------- geometry helpers ---------------------------------------------- */
function overlap(a, b) {
  const l = Math.max(a.left, b.left), r = Math.min(a.right, b.right);
  const t = Math.max(a.top, b.top), bt = Math.min(a.bottom, b.bottom);
  if (r > l && bt > t) return { left: l, right: r, top: t, bottom: bt, w: r - l, h: bt - t };
  return null;
}
function rectGap(a, b) {   // edge-to-edge distance (0 if touching/overlapping)
  const dx = Math.max(0, Math.max(a.left - b.right, b.left - a.right));
  const dy = Math.max(0, Math.max(a.top - b.bottom, b.top - a.bottom));
  return Math.round(Math.hypot(dx, dy));
}
function pointInRoom(x, y, rooms) {
  for (const r of rooms) if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return r;
  return null;
}

/* ---------- Part A: ASCII top-down map ------------------------------------ */
function drawMap(ctx, cell) {
  cell = cell || 20;
  const cols = Math.ceil(WORLD_W / cell), rows = Math.ceil(WORLD_H / cell);
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      const ccx = c * cell + cell / 2, ccy = r * cell + cell / 2;
      row.push(pointInRoom(ccx, ccy, ctx.rooms) ? '.' : ' ');
    }
    grid.push(row);
  }
  const stamp = (rect, ch, over) => {
    if (![rect.left, rect.right, rect.top, rect.bottom].every(isFinite)) return;
    const c0 = Math.max(0, Math.floor(rect.left / cell)), c1 = Math.min(cols - 1, Math.ceil(rect.right / cell) - 1);
    const r0 = Math.max(0, Math.floor(rect.top / cell)),  r1 = Math.min(rows - 1, Math.ceil(rect.bottom / cell) - 1);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      if (over || grid[r][c] === '.' || grid[r][c] === ' ') grid[r][c] = ch;
    }
  };
  // base layer: walls over floor/exterior
  for (const wl of ctx.walls) stamp(wl, wl.glass ? '~' : '#', false);
  // overlay: prop letters win (so a sprite poking into a wall shows its letter in the '#')
  for (const p of ctx.props) stamp(p.fp, p.letter, true);

  const out = [];
  out.push('===== ASCII FLOOR MAP (authored 1400x760, cell ' + cell + 'u) =====');
  // x ruler (hundreds)
  let ruler = '     ';
  for (let c = 0; c < cols; c++) { const x = c * cell; ruler += (x % 100 === 0) ? '|' : ' '; }
  out.push(ruler);
  for (let r = 0; r < rows; r++) {
    out.push(String(r * cell).padStart(4, ' ') + ' ' + grid[r].join(''));
  }
  out.push('LEGEND  # wall  ~ glass  . floor  (blank) exterior');
  out.push('        D desk   P printer W water C coffee U supply F files A alarm B board H phones T toilet');
  out.push('        c cabinet x bin/shelf L lockers G fridge   (prop letters overlay walls where a sprite pokes in)');
  out.push('ROOMS   ' + ctx.rooms.map(r => `${r.name}(${r.left},${r.top},${r.right - r.left}x${r.bottom - r.top})`).join('  '));
  return out.join('\n');
}

/* ---------- Part B: placement linter -------------------------------------- */
// tolerances (authored units) — nudge here to trade noise vs sensitivity
const WALL_TOL    = 6;    // ignore sprite/wall overlaps shallower than this
const OVERLAP_TOL = 8;    // ignore prop/prop overlaps shallower than this (adjacent props touch)
const FLOAT_TOL   = 26;   // WARN a wall-prop floating further than this from its wall
const FLUSH_TOL   = 26;   // a prop within this of ANY wall (glass counts) reads as "against a wall".
                          // ~sprite inset: a flush appliance's centred sprite sits up to ~21u off the wall rect.
const NEAR_WALL   = 150;  // only judge flush/float when a wall is within this of the prop
const DOOR_MIN = 30, DOOR_MAX = 60, DOOR_BAND = 22;  // door-gap detection

function findDoors(walls) {
  const doors = [];
  const group = (horiz) => {
    const m = new Map();
    for (const w of walls) {
      if (w.glass) continue;
      const isH = (w.right - w.left) > (w.bottom - w.top);
      if (isH !== horiz) continue;
      const line = horiz ? Math.round((w.top + w.bottom) / 2) : Math.round((w.left + w.right) / 2);
      if (!m.has(line)) m.set(line, []);
      m.get(line).push(w);
    }
    for (const [line, segs] of m) {
      segs.sort((a, b) => horiz ? a.left - b.left : a.top - b.top);
      for (let i = 1; i < segs.length; i++) {
        const prevEnd = horiz ? segs[i - 1].right : segs[i - 1].bottom;
        const nextStart = horiz ? segs[i].left : segs[i].top;
        const gap = nextStart - prevEnd;
        if (gap >= DOOR_MIN && gap <= DOOR_MAX) {
          doors.push(horiz
            ? { left: prevEnd, right: nextStart, top: line - DOOR_BAND, bottom: line + DOOR_BAND }
            : { left: line - DOOR_BAND, right: line + DOOR_BAND, top: prevEnd, bottom: nextStart });
        }
      }
    }
  };
  group(true); group(false);
  return doors;
}

function lint(ctx) {
  const { props, walls, rooms } = ctx;
  const doors = findDoors(walls);
  const fails = [], warns = [];
  /* ---- 0) EVERY PRINTER MUST HAVE SOMEWHERE TO STAND -----------------------------------------
     A meltdown victim walks to a printer and swings at it. The approach point used to be ASSUMED
     -- a fixed 14 authored BELOW the printer -- and for a printer standing against a wall that is
     inside the wall: the victim walked over, stalled, and stood there for the full twenty seconds
     while the printer survived. THREE of the five printer-type props across the two levels were
     like that, and it surfaced only as a 6.7% flake in t_meltdown.
     Asks the GAME's own printerApproach(), not a reimplementation, so the linter cannot drift from
     the thing it guards. It lives here because a printer nobody can stand next to is a placement
     error, and it fails at AUTHORING TIME with the two numbers that made the diagnosis obvious:
     which printer, and how far the nearest floor really is.
     NOTE: this must sit AFTER `fails` is declared -- the first version sat above it and would have
     thrown a TDZ ReferenceError instead of reporting, on the one run where it mattered. */
  if (ctx.world) {
    const SB = ctx.world.sandbox, LZ = ctx.world.g.layout, sc = LZ.S, au = v => Math.round(v / sc);
    for (const pr of (LZ.objects || []).filter(o => o.type === 'printer')) {
      const ap = SB.printerApproach(pr);
      if (ap && SB.walkableAt(ap.x, ap.y)) continue;
      /* measured from the printer's EDGE. A first version measured from its CENTRE and reported
         "nearest floor 4u away" for a printer whose nearest floor is 16u from its edge -- the
         sample point was still inside the printer's own footprint. The number in a failure
         message has to be the number that makes the diagnosis obvious, or it misleads. */
      let best = null;
      for (let r = 2; r <= 80 && best === null; r += 2)
        for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,-1],[1,-1],[-1,1]]) {
          const ex = dx > 0 ? pr.x + pr.w : (dx < 0 ? pr.x : pr.x + pr.w / 2);
          const ey = dy > 0 ? pr.y + pr.h : (dy < 0 ? pr.y : pr.y + pr.h / 2);
          if (SB.walkableAt(ex + dx * r * sc, ey + dy * r * sc)) { best = r; break; }
        }
      fails.push(`FAIL printer-unreachable ${pr.label || pr.type} @(${au(pr.x)},${au(pr.y)})  ` +
                 `no standable face; nearest floor ${best === null ? '>80' : best}u away`);
    }
  }
  /* ---- 0b) EVERY DECLARED DESTINATION MUST BE SOMEWHERE A BODY CAN ACTUALLY GO --------------
     A level declares places it will send people: EXIT, MUSTER, HR_OFFICE, a station per member of
     staff, and errand points. Nothing checked that any of them was standable, and two were not.

     ⚠️ THE PREDICATE DEPENDS ON WHAT THE DESTINATION IS FOR, and using the wrong one
     manufactures bugs -- this sweep reported false positives twice before it was right.
       a STANDING spot (station, muster, exit) -> solid(), because that is the contract moveEntity
         enforces on a body. walkableAt() reads the NAV GRID, which inflates every blocker 2px a
         side and quantises to 20-authored cells, so it calls spots blocked that nothing is in.
       a PATH target (errand point) -> walkableAt() AFTER snapTarget(), because snapTarget is the
         game's own correction: a grid-blocked errand point the game will move is not a defect.
     And the body is the PLAYER's box, not the station's box: a station is 24x24 authored and a
     body is 16x16, so testing the station's own footprint over-reports. Both numbers are taken
     from the live world rather than written down here.

     ⚠️ THE ANCHOR: THIS LINT PROVES ITS OWN PREDICATE IS ALIVE BEFORE IT TRUSTS A PASS.
     That is not defensive decoration -- it is the exact failure this branch found. t_grocery_crew
     has had a "no station is inside a solid box" assertion for its whole life and it passed
     through three stations sitting inside containers, because it ran at tick 0 where `blockers`
     is empty and solid() cannot return true for ANY container. A green from a dead predicate is
     worse than no check. So: the middle of a wall must read solid, or this reports that instead. */
  if (ctx.world) {
    const SB = ctx.world.sandbox, G = ctx.world.g, LZ = G.layout, sc = LZ.S, au = v => Math.round(v / sc);
    const P = G.player, BW = P.w, BH = P.h;
    const bodyAt = (x, y) => { try { return SB.solid({ x: x - BW / 2, y: y - BH / 2, w: BW, h: BH }); } catch (e) { return true; } };

    /* ⚠️ ANCHOR ON THE HALF THAT ACTUALLY DIES. The first version of this check asked whether the
       middle of a WALL reads solid -- and it passed, in a world where ten containers were missing
       from collision, because walls and blockers are filled from different places at different
       times. It proved the wrong subsystem was alive and would have shipped a lint that quietly
       ignored a third of the store's furniture. Containers are what drop out, so containers are
       what get checked: every one of them must read solid at its own centre. */
    const cons = LZ.containers || [];
    const deadCons = cons.filter(c => !SB.solid({ x: c.x + c.w / 2 - 2, y: c.y + c.h / 2 - 2, w: 4, h: 4 }));
    if (deadCons.length) {
      fails.push('FAIL destination-lint-dead  ' + deadCons.length + ' of ' + cons.length +
                 ' containers do not read solid at their own centre (' +
                 deadCons.slice(0, 3).map(c => c.label || c.kind).join(', ') +
                 (deadCons.length > 3 ? ', ...' : '') + '). The collision world is not fully built, ' +
                 'so nothing below this can fail. Everything here is measuring a floor the player never walks.');
    } else {
      const near = (x, y) => { for (let r = 4; r <= 80; r += 4)
          for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) if (!bodyAt(x + dx*r*sc, y + dy*r*sc)) return r;
        return null; };
      const stand = (label, pt, live) => {
        if (!pt || pt.x == null || !bodyAt(pt.x, pt.y)) return;
        const n = near(pt.x, pt.y), where = SB.roomAt && SB.roomAt(pt.x, pt.y);
        const msg = `${label} @(${au(pt.x)},${au(pt.y)})${where && where.name ? ' [' + where.name + ']' : ''}  ` +
                    `a body cannot stand here; nearest clear floor ${n === null ? '>80' : n}u away`;
        (live ? fails : warns).push((live ? 'FAIL ' : 'WARN ') + 'destination ' + msg +
                                    (live ? '' : '  (declared but this level never routes anyone here)'));
      };
      stand('EXIT', LZ.EXIT, true);
      stand('MUSTER', LZ.MUSTER, true);
      /* HR_OFFICE is only a destination where the level actually staffs HR. Asked of the game
         (hrs()), not assumed per level, so a store that grows an HR desk starts failing properly. */
      /* hrs() returns the ARRAY of HR staff, not a count. `hrs() > 0` is false for BOTH an empty
         array and a populated one, so the first draft of this line quietly downgraded HR_OFFICE to
         a warning in the office too -- where it is a live destination and a real failure. */
      let hrLive = true; try { hrLive = (SB.hrs() || []).length > 0; } catch (e) {}
      stand('HR_OFFICE', LZ.HR_OFFICE, hrLive);

      for (const d of (G.desks || []).filter(x => x.station)) {
        const cx = d.x + d.w / 2, cy = d.y + d.h / 2;
        if (bodyAt(cx, cy)) {
          fails.push(`FAIL station-unstandable ${d.owner || '?'} @(${au(cx)},${au(cy)})  ` +
                     `a body cannot stand at their own station; nearest clear floor ${near(cx,cy) === null ? '>80' : near(cx,cy)}u away`);
        } else if (SB.solid({ x: d.x, y: d.y, w: d.w, h: d.h })) {
          /* the body fits but the station's footprint clips furniture: the spot works and the
             floor plan reads wrong. WARN, because it is a drawing problem, not a movement one. */
          warns.push(`WARN station-clipped ${d.owner || '?'} @(${au(cx)},${au(cy)})  ` +
                     `station box overlaps furniture, though a body still fits at the centre`);
        }
      }

      for (const ep of (LZ.errandPoints || [])) {
        const t = SB.snapTarget(ep.x + (ep.w || 0) / 2, ep.y + (ep.h || 0) / 2);
        if (!SB.walkableAt(t.x, t.y))
          fails.push(`FAIL errand-unreachable @(${au(ep.x)},${au(ep.y)})  still blocked after the game's own snapTarget()`);
      }
    }
  }
  const seenPair = new Set();

  for (const p of props) {
    const fp = p.fp, cc = p.cc;
    const tag = `${p.id} ${p.label} @cc(${cc.x},${cc.y}) footprint[${fp.left},${fp.top} → ${fp.right},${fp.bottom}] ${fp.key}`;

    // 1) sprite poke-THROUGH an interior wall (crosses to the far side = visible in the wrong place)
    let worst = null;
    for (const wl of walls) {
      if (wl.glass || wl.perimeter) continue;
      if (!overlap(fp, wl)) continue;
      let poke = 0, dir = '';
      if      (cc.y >= wl.bottom && fp.top    < wl.top)    { poke = wl.top    - fp.top;    dir = 'up'; }    // prop below, sprite pokes up
      else if (cc.y <= wl.top    && fp.bottom > wl.bottom) { poke = fp.bottom - wl.bottom; dir = 'down'; }  // prop above, sprite pokes down
      else if (cc.x >= wl.right   && fp.left  < wl.left)   { poke = wl.left   - fp.left;   dir = 'left'; }  // prop right, sprite pokes left
      else if (cc.x <= wl.left    && fp.right > wl.right)  { poke = fp.right  - wl.right;  dir = 'right'; } // prop left, sprite pokes right
      else if (cc.x > wl.left && cc.x < wl.right && cc.y > wl.top && cc.y < wl.bottom) { poke = 999; dir = 'embedded-in'; }
      if (poke > WALL_TOL && (!worst || poke > worst.poke)) worst = { wl, poke, dir };
    }
    if (worst)
      fails.push(`FAIL sprite-thru-wall  ${tag}  pokes ${worst.dir} ${worst.poke}u through wall#${worst.wl.i}[${worst.wl.left},${worst.wl.top},${worst.wl.w}x${worst.wl.h}]`);

    // 2) sprite-overlap (prop vs prop)
    for (const q of props) {
      if (q === p) continue;
      const kpair = [p.id, q.id].sort().join('|');
      if (seenPair.has(kpair)) continue;
      const ov = overlap(fp, q.fp);
      if (ov && Math.min(ov.w, ov.h) > OVERLAP_TOL) {
        seenPair.add(kpair);
        fails.push(`FAIL sprite-overlap    ${p.id} ${p.label} × ${q.id} ${q.label}  overlap ${ov.w}x${ov.h}u @[${ov.left},${ov.top}]`);
      }
    }

    // nearest wall INCLUDING glass — a prop flush against a glass office wall is still "placed"
    let nearWall = null;
    for (const wl of walls) { const g = rectGap(fp, wl); if (!nearWall || g < nearWall.g) nearWall = { wl, g }; }
    const flush = !!(nearWall && nearWall.g <= FLUSH_TOL);
    const inRoom = !!pointInRoom(cc.x, cc.y, rooms);

    // 3) location: out-of-bounds / embedded-in-wall = FAIL; adrift (not in a room AND not against
    //    a wall) = WARN. Props flush to a wall in a corridor read as placed, so they don't flag.
    const outOfBounds = cc.x < 0 || cc.x > WORLD_W || cc.y < 0 || cc.y > WORLD_H;
    let inWall = false;
    for (const wl of walls) { if (wl.glass) continue;
      if (cc.x > wl.left && cc.x < wl.right && cc.y > wl.top && cc.y < wl.bottom) { inWall = true; break; } }
    if (outOfBounds)   fails.push(`FAIL out-of-bounds     ${tag}  collision centre outside the 1400x760 world`);
    else if (inWall)   fails.push(`FAIL embedded-in-wall  ${tag}  collision centre sits inside a wall rect`);
    else if (!inRoom && !flush)
      warns.push(`WARN adrift            ${p.id} ${p.label} @cc(${cc.x},${cc.y})  not in a room and ${nearWall?nearWall.g+'u from':'far from any'} nearest wall (corridor float — confirm intended)`);

    // 4) floating (WARN) — an IN-ROOM container that should hug a wall but drifted off it (glass counts)
    if (p.arr === 'containers' && inRoom && !flush && nearWall && nearWall.g <= NEAR_WALL)
      warns.push(`WARN floating          ${p.id} ${p.label}  gap ${nearWall.g}u to nearest wall#${nearWall.wl.i} (flush≈0)`);

    // 5) blocks a doorway (WARN)
    for (const d of doors) {
      if (overlap(fp, d)) {
        warns.push(`WARN blocks-doorway    ${p.id} ${p.label}  footprint covers door gap @[${d.left},${d.top} → ${d.right},${d.bottom}]`);
        break;
      }
    }
  }
  return { fails, warns, nDoors: doors.length };
}

/* ---------- entry point --------------------------------------------------- */
function checkPlacement(opts) {
  opts = opts || {};
  const ctx = buildContext(opts);
  const lines = [];
  if (!opts.noMap) lines.push(drawMap(ctx, opts.cell));
  const { fails, warns, nDoors } = lint(ctx);
  lines.push('');
  lines.push('===== PLACEMENT LINT =====');
  lines.push(`${ctx.props.length} props, ${fails.length} FAIL, ${warns.length} WARN  (${ctx.walls.length} walls, ${nDoors} doors detected)`);
  if (fails.length) { lines.push(''); lines.push('  ‼ FAIL — fix before moving on (treat like a soak failure):'); fails.forEach(f => lines.push('  ' + f)); }
  if (warns.length) { lines.push(''); warns.forEach(wn => lines.push('  ' + wn)); }
  const result = fails.length === 0
    ? `\nPLACEMENT: GREEN ✅ (0 FAIL${warns.length ? ', ' + warns.length + ' WARN' : ''})`
    : `\nPLACEMENT: RED ❌ (${fails.length} FAIL)`;
  lines.push(result);
  return { text: lines.join('\n'), fail: fails.length, warn: warns.length };
}

module.exports = { checkPlacement, buildContext };

if (require.main === module) {
  /* BOTH WORLDS. The linter used to cover only the default (office) build; grocery had nothing
     to stamp, and that ended the moment it got a floor plan. A store is mostly narrow aisles
     between long blockers, which is the worst case for the nav grid's 2px-a-side blocker
     inflation -- so it is exactly the world that most needs linting. 0 FAIL required on each. */
  const worlds = [
    /* the FULL boot handoff, not just the level key. With only 'promo:level' the world comes up
       half-built: TEN of the store's thirty-six containers -- both receiving pallets, the manager
       and owner desks and cabinets, the staff lockers, three produce cases -- never enter
       `blockers`, so solid() walks straight through them and this linter saw open floor where the
       game has furniture. Same partial-world trap as the missing tick above, one layer further in. */
    { name: 'OFFICE  (Paper Supply Co.)', opts: { storage: { 'promo:level': 'office', 'promo:newgame': '0', 'promo:char': '0' } } },
    { name: 'GROCERY (Save-Rite)', opts: { storage: { 'promo:level': 'grocery', 'promo:newgame': '0', 'promo:char': '0' } } },
  ];
  let bad = 0;
  worlds.forEach((wd, i) => {
    if (i) console.log('');
    console.log('################  ' + wd.name + '  ################');
    const r = checkPlacement(wd.opts);
    console.log(r.text);
    bad += r.fail;
  });
  console.log('');
  console.log(bad === 0
    ? 'PLACEMENT (both worlds): GREEN ✅'
    : 'PLACEMENT (both worlds): RED ❌ (' + bad + ' FAIL)');
  process.exit(bad === 0 ? 0 : 1);
}
