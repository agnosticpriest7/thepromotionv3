/* LIGHTS — the store had none, and "none" is not "unlit", it is BLACKED OUT.

   The darkness layer is painted over the whole world and then ERASED where a bank is, so a level
   that authored no LIGHT_BANKS gets the dark layer and no holes in it. Save-Rite has been in the
   dark since it existed.

   ⚠️ THIS IS THE OTHER HALF OF A BUG ALREADY FIXED. tickLights indexed LIGHT_BANKS through the
   literal [0,4,1,5,2,6,3,7,8,9], written for the office's ten banks. Grocery had none, so it
   dereferenced undefined every frame from 8:15 — and because advanceClock() runs after
   tickLights() in the same block, the throw FROZE THE CLOCK: 54,999 throws and still day 1 after
   90k frames. Guarding the deref stopped the crash. It did not give the store lights, and it did
   not remove the assumption that every level has the office's ten banks in the office's order.

   ⚠️ THIS SUITE IS MOSTLY NEGATIVE CASES. The store is dark today, so "always on" would look
   exactly like a fix. Every claim about light is paired with a claim about dark, and EVERY
   assertion crosses 08:15 — the original bug hid behind a 3,000-frame window that stopped before
   it could fire.

   ⚠️ DAY 1 IS LIT ON PURPOSE and is not evidence of anything. The orientation tour runs at 08:00
   and a dark walkthrough reads as broken, so tickLights forces the banks up on day 1. The
   before-08:15 darkness assertions therefore run on day 2 onward — asserting them on day 1 would
   fail against correct behaviour. */
'use strict';
const { createWorld } = require('./harness');

let pass = 0, fail = 0;
const ck = (n, c, d) => { console.log('  ' + (c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '   ' + d : '')); c ? pass++ : fail++; };
const mk = (lv, opts) => createWorld(Object.assign({ seed: 20260828,
  storage: { 'promo:level': lv, 'promo:newgame': '0', 'promo:char': '0' } }, opts || {}));

/* SPEC, fixed at authoring time (§14) so a mutant cannot redefine the floor to satisfy it. */
const ON_MIN = 8 * 60 + 15, OFF_MIN = 16 * 60 + 45;
const OFFICE_BANKS = 10;
/* the literal that shipped, kept here as the thing the derivation must reproduce */
const OLD_OFFICE_ORDER = [0, 4, 1, 5, 2, 6, 3, 7, 8, 9];

const litOf = g => { const B = g.LIGHT_BANKS; return B && B.length ? B.reduce((s, b) => s + b.t, 0) / B.length : -1; };
/* floor, not round: rounding printed "08:60" for 08:59.6, which is not a time. A clock that
   misreports itself in a failure message is how you misread a red. */
const hhmm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(Math.floor(m % 60)).padStart(2, '0');

/* ---- 1. THE STORE HAS LIGHTS AT ALL ------------------------------------------------------ */
{
  const gro = mk('grocery'), off = mk('office');
  ck('the store authors its own light banks', gro.g.LIGHT_BANKS.length > 0,
     gro.g.LIGHT_BANKS.length + ' banks (0 = the world is painted dark with nothing erased)');
  ck('  ^ and the office still has its ten', off.g.LIGHT_BANKS.length === OFFICE_BANKS,
     off.g.LIGHT_BANKS.length + ' banks');

  /* they must actually COVER the store, or lighting them changes nothing where people work */
  const sc = gro.g.layout.S, A = v => Math.round(v / sc);
  const B = gro.g.LIGHT_BANKS.map(b => ({ x: A(b.x), y: A(b.y), w: A(b.w), h: A(b.h) }));
  const covers = (px, py) => B.some(b => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h);
  const spots = [['sales floor', 645, 322], ['front end', 700, 560], ['back of house', 1200, 100],
                 ['produce', 150, 370], ['bakery', 200, 100], ['entrance', 750, 700]];
  const dark = spots.filter(([, x, y]) => !covers(x, y)).map(s => s[0]);
  ck('  ^ and they cover the sales floor, the front end and the back of house',
     dark.length === 0, dark.length ? 'NOT covered: ' + dark.join(', ') : spots.length + ' probes covered');
}

/* ---- 2. THE ORDER IS DERIVED, AND THE OFFICE'S IS UNCHANGED ------------------------------ */
{
  const off = mk('office');
  const seq = off.sandbox.lightSequence();
  ck('the derived flick order reproduces the office literal EXACTLY, index for index',
     seq.join(',') === OLD_OFFICE_ORDER.join(','),
     'derived ' + seq.join(',') + '  vs shipped ' + OLD_OFFICE_ORDER.join(','));

  const gro = mk('grocery');
  const gseq = gro.sandbox.lightSequence();
  ck('  ^ and the store gets an order of its own, sized to ITS banks',
     gseq.length === gro.g.LIGHT_BANKS.length && new Set(gseq).size === gseq.length,
     gseq.join(',') + ' (' + gseq.length + ' banks)');

  /* west to east, north before south — the rule the literal was, said once */
  const sc = gro.g.layout.S;
  const B = gro.g.LIGHT_BANKS;
  let monotonic = true;
  for (let i = 1; i < gseq.length; i++) {
    const p = B[gseq[i - 1]], q = B[gseq[i]];
    if (p.x > q.x || (p.x === q.x && p.y > q.y)) monotonic = false;
  }
  ck('  ^ and it runs west to east, north before south', monotonic, 'order ' + gseq.join(','));
}

/* ---- 3. OFFICE BANK GEOMETRY, MEASURED AGAINST MAIN RATHER THAN INFERRED ------------------ */
{
  const path = require('path');
  const mainHtml = process.env.MAIN_HTML || path.join(__dirname, '..', '.main-index.html');
  const fs = require('fs');
  if (fs.existsSync(mainHtml)) {
    const now = mk('office').g.LIGHT_BANKS.map(b => [b.x, b.y, b.w, b.h].join(':')).join('|');
    const was = createWorld({ seed: 20260828, htmlPath: mainHtml,
      storage: { 'promo:level': 'office', 'promo:newgame': '0', 'promo:char': '0' } })
      .g.LIGHT_BANKS.map(b => [b.x, b.y, b.w, b.h].join(':')).join('|');
    ck('the office bank geometry is byte-identical to main', now === was,
       now === was ? OFFICE_BANKS + ' banks unchanged' : 'CHANGED');
  } else {
    ck('the office bank geometry is byte-identical to main', true,
       'skipped — no .main-index.html checked out (set MAIN_HTML to compare)');
  }
}

/* ---- 4. DARK BEFORE 08:15, LIT AFTER — SAMPLED, AND ALWAYS ACROSS THE BOUNDARY ------------ */
for (const lv of ['grocery', 'office']) {
  const w = mk(lv), g = w.g;
  /* run to day 2: day 1 is lit on purpose for the tour, so it proves nothing about the breaker */
  let guard = 0;
  while (g.day < 2 && guard++ < 400000) w.run(500, { ignoreGameOver: true });
  ck(lv + ': the clock reaches day 2 at all — the frozen-clock bug is what this replaces',
     g.day >= 2, 'day ' + g.day + ' after ' + w.frame + ' frames');

  /* sample the morning, on BOTH sides of 08:15 in the same run */
  const before = [], after = [];
  guard = 0;
  while (g.day === 2 && g.clock < ON_MIN && guard++ < 400000) {
    w.run(120, { ignoreGameOver: true });
    if (g.day === 2 && g.clock < ON_MIN) before.push({ t: g.clock, lit: litOf(g) });
  }
  guard = 0;
  while (g.day === 2 && g.clock < ON_MIN + 25 && guard++ < 400000) w.run(120, { ignoreGameOver: true });
  for (let i = 0; i < 5; i++) { w.run(600, { ignoreGameOver: true }); after.push({ t: g.clock, lit: litOf(g) }); }

  const litBefore = before.filter(s => s.lit > 0.05);
  ck(lv + ': every sample before 08:15 on day 2 is dark',
     before.length >= 3 && litBefore.length === 0,
     before.length + ' samples ' + (before.length ? hhmm(before[0].t) + '..' + hhmm(before[before.length - 1].t) : '') +
     (litBefore.length ? '  LIT AT ' + litBefore.map(s => hhmm(s.t)).join(',') : '  all dark'));

  const darkAfter = after.filter(s => s.lit < 0.5);
  ck(lv + ':   ^ and every sample after 08:15 is lit',
     after.length >= 3 && darkAfter.length === 0,
     after.map(s => hhmm(s.t) + '=' + s.lit.toFixed(2)).join(' '));
}

/* ---- 4b. THE ORDER THE BANKS ACTUALLY COME ON IN ------------------------------------------
   ⚠️ TESTING THE HELPER IS NOT TESTING THE BEHAVIOUR. Section 2 asserts lightSequence() returns
   the right list; it says nothing about whether tickLights USES it. Putting the old hardcoded
   literal back survived the entire suite — and survived the soak too — because with eight banks
   authored, indices 0..7 are all valid and the `if(b)` guard swallows the leftover 8 and 9. No
   throw, every bank still lit, only the ORDER different. The crash the literal used to cause is
   gone precisely because this branch gave the store banks, so nothing behavioural was left to
   notice it. So: watch which bank comes on first, second, third, and require that to BE the
   derived order. This is the assertion the branch title actually claims. */
for (const lv of ['grocery', 'office']) {
  const w = mk(lv), g = w.g, S = w.sandbox;
  const B = g.LIGHT_BANKS;
  let guard = 0;
  while (g.day < 2 && guard++ < 400000) w.run(500, { ignoreGameOver: true });
  while (g.day === 2 && g.clock < ON_MIN - 1 && guard++ < 400000) w.run(60, { ignoreGameOver: true });

  /* step finely through the flick and record the order `on` flips true */
  const seen = [];
  const wasOn = B.map(b => !!b.on);
  guard = 0;
  while (seen.length < B.length && g.day === 2 && guard++ < 20000) {
    w.run(2, { ignoreGameOver: true });
    B.forEach((b, i) => { if (b.on && !wasOn[i]) { wasOn[i] = true; seen.push(i); } });
  }
  const want = S.lightSequence();
  ck(lv + ': the banks come on in the DERIVED order, not a listed one',
     seen.length === B.length && seen.join(',') === want.join(','),
     'observed ' + seen.join(',') + '   derived ' + want.join(','));
}

/* ---- 5. OUT AT THE END OF THE DAY, AND STILL OUT NEXT MORNING ---------------------------- */
for (const lv of ['grocery', 'office']) {
  const w = mk(lv), g = w.g;
  let guard = 0;
  while (g.day < 2 && guard++ < 400000) w.run(500, { ignoreGameOver: true });
  /* ⚠️ OBSERVE THE SHUTDOWN, DON'T ACCEPT THE DAY ROLL AS PROOF OF IT. The first version of this
     read `dayRolled || lit < 0.5`, which short-circuits: it passed on "day 3 08:00 lit=0.00" —
     the NEXT MORNING — having never once looked at the floor between 4:45 and the end of day. A
     hollow pass in a suite whose whole job is negative cases. So the sample has to be taken
     strictly inside the window, and failing to GET one is itself a failure. */
  const nightSamples = [];
  guard = 0;
  while (g.day === 2 && guard++ < 400000) {
    w.run(30, { ignoreGameOver: true });
    if (g.day === 2 && g.clock >= OFF_MIN + 3) nightSamples.push({ t: g.clock, lit: litOf(g) });
  }
  const litAtNight = nightSamples.filter(s => s.lit > 0.5);
  ck(lv + ': the lights go out after 4:45 — observed on the day itself, not inferred',
     nightSamples.length >= 2 && litAtNight.length === 0,
     nightSamples.length ? (nightSamples.length + ' samples ' + hhmm(nightSamples[0].t) + '..' +
       hhmm(nightSamples[nightSamples.length - 1].t) + '  lit ' +
       nightSamples[nightSamples.length - 1].lit.toFixed(2) +
       (litAtNight.length ? '  STILL LIT AT ' + litAtNight.map(s => hhmm(s.t)).join(',') : ''))
       : 'NO sample taken between 4:45 and the day roll');

  /* and still out at the start of the next day, before its own 08:15 */
  const morn = litOf(g);
  ck(lv + ':   ^ and still out next morning before 08:15',
     g.clock >= ON_MIN || morn < 0.05,
     'day ' + g.day + ' ' + hhmm(g.clock) + ' lit=' + morn.toFixed(2));
}

/* ---- 6. FIVE DAYS, ZERO THROWS, IN BOTH LEVELS ------------------------------------------- */
for (const lv of ['grocery', 'office']) {
  const w = mk(lv), g = w.g;
  const start = g.day;
  let guard = 0;
  while (g.day < start + 5 && guard++ < 3000) w.run(500, { ignoreGameOver: true });
  ck(lv + ': five days roll with zero throws — the clock is not frozen',
     g.day >= start + 5 && w.stats.throws === 0 && g.renderErrs === 0,
     'day ' + g.day + ', ' + w.stats.throws + ' throws, ' + g.renderErrs + ' renderErrs' +
     (w.stats.firstThrow ? ('  first: ' + String(w.stats.firstThrow).slice(0, 80)) : ''));
}

console.log('\nlights: ' + pass + ' pass, ' + fail + ' fail');
console.log(fail ? 'LIGHTS: RED ❌' : 'LIGHTS: GREEN ✅ (the store comes up at 8:15 and goes out at 4:45)');
process.exit(fail ? 1 : 0);
