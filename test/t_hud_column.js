/* THE RIGHT-HAND HUD COLUMN — geometry, not existence.

   Four elements shared this strip with no stacking rule and printed over each other and over the
   world (HANDOFF-3 Part C-b). Asserting "the element exists" would prove nothing about whether it
   is readable or where it sits, so this asserts GEOMETRY, and it does it by capturing what each
   element ACTUALLY DRAWS rather than by trusting the layout it was handed.

   That distinction is the whole point: hudColumn() stacks its slots by construction, so "the slots
   do not overlap" is very nearly a tautology and would stay green while an element drew straight
   out of its own box. What can really go wrong is an element overflowing its slot — a compass
   whose text runs past it, a checklist taller than its reservation — so the check is
   drawn-extent ⊆ reserved-slot, per element, IN EVERY PHASE.

   Phase matters: the collisions Kyle caught were phase-dependent. The compass only says "your
   break" during a break, which is exactly when it used to collide with the room banner. */
'use strict';
const { createWorld } = require('./harness');
let pass = 0, fail = 0;
const ck = (n, c, d) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${d ? '   ' + d : ''}`); c ? pass++ : fail++; };

const mk = lv => createWorld({ storage: Object.assign({ 'promo:newgame': '0', 'promo:char': '0' },
                                                      lv ? { 'promo:level': lv } : {}) });

/* record the bounding box of everything a draw function puts on the canvas */
function drawnBox(w, fn) {
  const S = w.sandbox;
  const cv = S.document.getElementById('c');
  const ctx = cv.getContext('2d');
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const hit = (x, y, ww, hh) => {
    if (![x, y, ww, hh].every(Number.isFinite)) return;
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + ww); maxY = Math.max(maxY, y + hh);
  };
  const saved = {};
  const wrap = (name, mapper) => { saved[name] = ctx[name]; ctx[name] = function (...a) { try { mapper(...a); } catch (e) {} return saved[name].apply(ctx, a); }; };
  wrap('fillRect',   (x, y, ww, hh) => hit(x, y, ww, hh));
  wrap('strokeRect', (x, y, ww, hh) => hit(x, y, ww, hh));
  /* text anchors on ctx.textAlign, so the box has to follow it. The first version assumed
     centre-aligned always and reported the LEFT-aligned room banner as starting half a
     text-width outside its own slot — a test bug that read exactly like an overflow bug. */
  wrap('fillText',   (t, x, y) => {
    const tw = String(t).length * 7;
    const a = ctx.textAlign || 'left';
    const x0 = a === 'center' ? x - tw / 2 : a === 'right' ? x - tw : x;
    hit(x0, y - 12, tw, 16);
  });
  wrap('arc',        (x, y, r) => hit(x - r, y - r, r * 2, r * 2));
  try { fn(); } catch (e) { /* a draw that throws is caught by the render-error counter elsewhere */ }
  Object.keys(saved).forEach(k => { ctx[k] = saved[k]; });
  if (minX === Infinity) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
const inter = (a, b) => a && b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const within = (inner, outer, slackY) => inner && outer &&
  inner.x >= outer.x - 4 && inner.x + inner.w <= outer.x + outer.w + 4 &&
  inner.y >= outer.y - (slackY || 4) && inner.y + inner.h <= outer.y + outer.h + (slackY || 4);

function sweep(level) {
  const w = mk(level === 'office' ? null : level);
  const S = w.sandbox;
  const seen = {}, overflow = [], collide = [];
  let phases = 0, prev = null;
  for (let i = 0; i < 500; i++) {
    w.run(300, { ignoreGameOver: true });
    const ph = S.currentPhase().name;
    if (ph === prev) continue;
    prev = ph; phases++; seen[ph] = true;
    const L = S.hudColumn();
    const boxes = {
      minimap: drawnBox(w, () => S.drawMinimap()),
      compass: drawnBox(w, () => S.drawCompass()),
      banner:  L.banner ? drawnBox(w, () => S.drawRoomCaption(0.016)) : null,
    };
    /* 1. each element stays inside the slot the owner gave it */
    [['minimap', L.minimap], ['compass', L.compass], ['banner', L.banner]].forEach(([k, slot]) => {
      if (!boxes[k] || !slot) return;
      if (!within(boxes[k], slot, 6))
        overflow.push(ph + '/' + k + ' drew ' + JSON.stringify(boxes[k]) + ' outside slot ' + JSON.stringify(slot));
    });
    /* 2. and no two of them share a pixel */
    const ks = Object.keys(boxes).filter(k => boxes[k]);
    for (let a = 0; a < ks.length; a++) for (let b = a + 1; b < ks.length; b++)
      if (inter(boxes[ks[a]], boxes[ks[b]]))
        collide.push(ph + ': ' + ks[a] + ' x ' + ks[b] + '  ' + JSON.stringify(boxes[ks[a]]) + ' / ' + JSON.stringify(boxes[ks[b]]));
  }
  return { w, phases: Object.keys(seen), overflow, collide };
}

['office', 'grocery'].forEach(level => {
  console.log('\n  -- ' + level.toUpperCase());
  const r = sweep(level);
  ck('swept every phase', r.phases.length >= 5, r.phases.length + ' phases: ' + r.phases.join(', '));
  ck('no right-column element collides with another, in any phase', r.collide.length === 0,
     r.collide.length ? r.collide[0] : 'clean across ' + r.phases.length + ' phases');
  ck('every element draws inside its reserved slot', r.overflow.length === 0,
     r.overflow.length ? r.overflow[0] : 'no overflow');
  /* 3. the column stays a column */
  const L = r.w.sandbox.hudColumn();
  const ordered = [L.minimap, L.compass, L.banner, L.today].filter(Boolean);
  let stacked = true;
  for (let i = 1; i < ordered.length; i++) if (ordered[i].y < ordered[i - 1].y + ordered[i - 1].h) stacked = false;
  ck('  ^ and the slots are stacked, never nested', stacked,
     ordered.map(b => b.y + '+' + b.h).join(' -> '));
});

/* ---- 4. the same room name never renders twice at once ------------------------------------ */
{
  const g = mk('grocery'); g.run(9000, { ignoreGameOver: true });
  const o = mk(null); o.run(9000, { ignoreGameOver: true });
  ck('a level names its zones in exactly one place',
     g.sandbox.hudBannerShown() === false && o.sandbox.hudBannerShown() === true,
     'grocery: floor labels, banner suppressed | office: HUD banner, no floor labels');
}

/* ---- 5. the banner's text sits ON a plate -------------------------------------------------
   NOT "did it call fillRect". The first version counted fills and stayed GREEN with the plate
   deleted, because the banner also paints a 3px accent bar and that is a fillRect too — it was
   counting the wrong thing, the same class of mistake as checking c.chairs on a container. The
   question is whether a filled rectangle actually COVERS the text. */
{
  const o = mk(null); o.run(9000, { ignoreGameOver: true });
  const S = o.sandbox;
  const cvv = S.document.getElementById('c'), ctx = cvv.getContext('2d');
  const rects = [], texts = [];
  const fr = ctx.fillRect, ft = ctx.fillText;
  ctx.fillRect = function (x, y, w2, h2) { rects.push({ x: x, y: y, w: w2, h: h2 }); return fr.apply(ctx, arguments); };
  ctx.fillText = function (t, x, y) {
    /* measure the way the GAME does: the plate is sized from ctx.measureText, so estimating the
       text width differently makes plate-vs-text a comparison between two different rulers. */
    let tw = 0; try { tw = ctx.measureText(String(t)).width; } catch (e) {}
    if (!tw) tw = String(t).length * 7;
    const a = ctx.textAlign || 'left';
    const x0 = a === 'center' ? x - tw / 2 : a === 'right' ? x - tw : x;
    texts.push({ x: x0, y: y - 11, w: tw, h: 14 });
    return ft.apply(ctx, arguments);
  };
  S.drawRoomCaption(0.016); S.drawRoomCaption(0.016);
  ctx.fillRect = fr; ctx.fillText = ft;
  const covered = texts.length > 0 && texts.every(function (t) {
    return rects.some(function (r) {
      return r.x <= t.x + 2 && r.y <= t.y + 4 &&
             r.x + r.w >= t.x + t.w - 2 && r.y + r.h >= t.y + t.h - 4;
    });
  });
  ck('the zone banner text sits on a plate that covers it', covered,
     texts.length + ' text runs, ' + rects.length + ' rects' + (covered ? '' : ' — text not covered'));
}

/* ---- 6. THE COLUMN IS PAINTED LAST -------------------------------------------------------
   Bounding boxes cannot see z-order: two elements can miss each other entirely and one still
   draw over the other. So this asserts ORDER, using the boundary the renderer already has —
   the world is drawn inside a save()/restore() pair that carries the camera transform, and
   everything after the final restore() is screen-space HUD.

   The assertion: the LAST paint that touches the column rect happens AFTER the frame's last
   restore(). If any HUD slot were composited mid-world (the bug this is guarding), its pixels
   would be laid down before the restore and a tall prop drawn afterwards would punch through it.

   This is also what proves the *reported* symptom was not a z-order bug at all: a plant looked
   like it drew over the compass because the compass plate was translucent, not because it was
   composited early. Ordering was already correct; this pins it so it stays correct. */
{
  const w = mk('grocery');
  w.run(9000, { ignoreGameOver: true });
  const S = w.sandbox;
  const cvv = S.document.getElementById('c'), ctx = cvv.getContext('2d');
  const col = S.hudColumn().col;
  let seq = 0, lastRestore = -1, lastColumnPaint = -1, worldPaints = 0;
  const touches = (x, y, ww, hh) => x < col.x + col.w && x + ww > col.x && y < col.y + col.h + 400 && y + hh > col.y;
  const sv = {};
  const wrap = (n, m) => { sv[n] = ctx[n]; ctx[n] = function () { try { m.apply(null, arguments); } catch (e) {} return sv[n].apply(ctx, arguments); }; };
  wrap('restore', () => { seq++; lastRestore = seq; });
  wrap('save',    () => { seq++; });
  const paint = (x, y, ww, hh) => {
    seq++;
    if (![x, y, ww, hh].every(Number.isFinite)) return;
    if (touches(x, y, ww, hh)) lastColumnPaint = seq; else worldPaints++;
  };
  wrap('fillRect',   (x, y, ww, hh) => paint(x, y, ww, hh));
  wrap('strokeRect', (x, y, ww, hh) => paint(x, y, ww, hh));
  wrap('drawImage',  function () { const a = arguments; const n = a.length;
    if (n >= 9) paint(a[5], a[6], a[7], a[8]); else if (n >= 5) paint(a[1], a[2], a[3], a[4]); else paint(a[1], a[2], 1, 1); });
  wrap('fillText',   (t, x, y) => { let tw = 0; try { tw = ctx.measureText(String(t)).width; } catch (e) {}
    paint(x, y - 11, tw || String(t).length * 7, 14); });
  try { S.render(); } catch (e) {}
  Object.keys(sv).forEach(k => { ctx[k] = sv[k]; });

  ck('the frame actually drew a world and a HUD', worldPaints > 20 && lastRestore > 0 && lastColumnPaint > 0,
     worldPaints + ' world paints, last restore at #' + lastRestore + ', last column paint at #' + lastColumnPaint);
  ck('the right column is painted AFTER every world layer', lastColumnPaint > lastRestore,
     'last column paint #' + lastColumnPaint + (lastColumnPaint > lastRestore ? ' > ' : ' <= ') +
     'last restore #' + lastRestore);
}


/* ---- 7. NO GATE HINT OVERFLOWS THE RANK-NOTE SLOT --------------------------------------
   ⚠️ ASSERTED SO A FUTURE LONG HINT FAILS AT THE GATE RATHER THAN ON A TV. The slot is about two
   lines wide. Measured before this branch, the office's held-promotion notes ran 106, 130, 136,
   212 and 274 characters — the CEO one was mostly invisible and had been since it was written,
   wrapping off the top-left and clipping behind the rank title.

   The fix was not to delete the text: `hint` still carries the full explanation to THE WAY UP and
   to the promotion log, where there is room for it. `hintShort` is what the HUD gets. So this
   asserts BOTH — that the note fits, and that the detail did not quietly disappear with it. */
{
  const LIMIT = 70;
  const rows = [];
  [null, 'grocery'].forEach(lv => {
    const w = createWorld({ storage: Object.assign({ 'promo:newgame': '0', 'promo:char': '0' },
                                                   lv ? { 'promo:level': lv } : {}) });
    const S = w.sandbox, g = w.g;
    w.run(9000, { ignoreGameOver: true });
    if (lv) { g.player.prog = 100; try { S.tryPromote(); S.storeDeptMenu().items[3].act(); S.closeMenu(); } catch (e) {} }
    for (let r = 0; r < g.RANKS.length - 1; r++) {
      g.player.rank = r; g.player.prog = 100;
      let gt = null; try { gt = S.gateFor(r + 1); } catch (e) { continue; }
      if (!gt || gt.ok) continue;
      try { S.updateHUD(); } catch (e) { continue; }
      const note = S.document.getElementById('rankNote').textContent;
      rows.push({ lv: lv || 'office', rank: g.RANKS[r + 1], len: note.length, note: note, full: gt.hint || '' });
    }
    g.player.rank = 0;
  });
  const over = rows.filter(x => x.len > LIMIT);
  ck('no held-promotion note overflows the HUD slot, in either level', over.length === 0 && rows.length >= 6,
     over.length ? over.map(x => x.lv + '/' + x.rank + ' ' + x.len + ' chars').join(', ')
                 : rows.length + ' gated rungs, longest ' + Math.max.apply(null, rows.map(x => x.len)) + '/' + LIMIT);

  /* THE NEGATIVE HALF: shortening must not have been a delete. Every gate that has a short form
     must still carry a LONGER full one for the panel that has room. */
  const gutted = rows.filter(x => x.full && x.full.length <= 12);
  ck('  ^ and the full explanation still exists behind it', gutted.length === 0 && rows.some(x => x.full.length > 70),
     gutted.length ? 'gutted: ' + gutted.map(x => x.rank).join(', ')
                   : 'longest full hint ' + Math.max.apply(null, rows.map(x => x.full.length)) + ' chars, kept for THE WAY UP');
}

console.log(`\nhud column: ${pass} pass, ${fail} fail`);
console.log(fail ? 'HUD COLUMN: RED ❌' : 'HUD COLUMN: GREEN ✅ (one owner, nothing overlaps)');
process.exit(fail ? 1 : 0);
