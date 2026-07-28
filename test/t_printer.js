/* ============================================================================
   NEAREST PRINTER — meltdown victims smash the printer closest to them.

   Rewritten 2026-07-28. The old version hardcoded two printer positions and
   probed from two hardcoded points. Both went stale: the sales printer was
   authored at (932,524) when the test was written and has since moved three
   times — 932,545 (b0b75d6) -> 932,565 (78a1a3a) -> 770,610 (f8a4043, "junior-
   sales floor, where the intern stands"). The probe point (925,515) drifted out
   of every sales room entirely when the floor geometry was redone. So the test
   went RED while nearestPrinter was answering perfectly correctly, and stayed
   RED long enough to become background noise.

   nearestPrinter is a pure minimum-by-cdist reduce over the printer objects, so
   its contract has nothing to do with where the printers happen to be. This
   version derives everything from the live world and asserts the contract:

     1. it returns an actual printer object from the world (identity, not a
        coordinate), and tolerates a null `from`
     2. probing from right next to each printer returns THAT printer — so
        distinct printers really are distinguishable
     3. EXHAUSTIVE: across a grid of sample points covering the whole floor, its
        answer always equals the true minimum found by brute force. This is the
        invariant that cannot go stale — move a printer and it still holds.

   Usage:  node test/t_printer.js
   ============================================================================ */
'use strict';
const { createWorld } = require('./harness');

function main() {
  const w = createWorld();
  w.startNewGame(0);
  w.run(500, { ignoreGameOver: true });

  const S    = w.sandbox;
  const L    = w.g.layout;
  const SC   = L.S || 1.8;
  const A    = v => Math.round(v / SC);              // world -> authored, for readable output
  const W    = L.W, H = L.H;

  const printers = (L.objects || []).filter(o => o.type === 'printer');
  const roomOf   = p => (S.roomAt(p.x + p.w / 2, p.y + p.h / 2) || { name: '(no room)' }).name;

  let pass = 0, fail = 0;
  const ck = (n, c) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}`); c ? pass++ : fail++; };

  console.log('===== NEAREST PRINTER =====');
  console.log(`${printers.length} printers in the world:`);
  printers.forEach(p => console.log(`   authored ${A(p.x)},${A(p.y)}  ${roomOf(p)}`));
  console.log('');

  if (printers.length < 2) {
    console.log('  ‼ FAIL: fewer than 2 printers — nothing to choose between.');
    console.log('\nNEAREST PRINTER: RED ❌');
    process.exit(1);
  }

  /* Brute-force truth, using the game's own distance function so the test can never
     disagree with the implementation about what "nearest" means. */
  const cdist = S.cdist;
  if (typeof cdist !== 'function') {
    console.log('  ‼ FAIL: cdist is not reachable from the sandbox — cannot verify.');
    console.log('\nNEAREST PRINTER: RED ❌');
    process.exit(1);
  }
  const truth = from => printers.reduce((b, p) => cdist(from, p) < cdist(from, b) ? p : b, printers[0]);
  const victim = (wx, wy) => ({ x: Math.round(wx), y: Math.round(wy), w: 52, h: 47 });

  // (1) returns a real printer, and survives a null `from`
  const any = S.nearestPrinter(null);
  ck('a null victim still yields a printer', any && printers.includes(any));

  // (2) probing beside each printer returns that same printer
  const picked = [];
  let selfHits = 0;
  for (const p of printers) {
    const got = S.nearestPrinter(victim(p.x + p.w / 2 - 26, p.y + p.h / 2 - 23));
    picked.push(got);
    const ok = got === p;
    if (ok) selfHits++;
    else console.log(`     beside the ${roomOf(p)} printer (authored ${A(p.x)},${A(p.y)})`
                   + ` it returned the one at ${A(got.x)},${A(got.y)} instead`);
  }
  ck(`standing beside a printer picks that printer (${selfHits}/${printers.length})`,
     selfHits === printers.length);
  ck('those probes select distinct printers', new Set(picked).size === printers.length);

  // (3) exhaustive: matches brute force everywhere on the floor
  const STEP = Math.round(40 * SC);
  let pts = 0, mismatches = [];
  for (let y = 0; y < H; y += STEP) {
    for (let x = 0; x < W; x += STEP) {
      const v   = victim(x, y);
      const got = S.nearestPrinter(v), want = truth(v);
      pts++;
      // ties are legitimate — only flag a genuinely longer choice
      if (got !== want && cdist(v, got) > cdist(v, want) + 0.001)
        mismatches.push(`authored ${A(x)},${A(y)}: chose ${A(got.x)},${A(got.y)}`
                      + ` (${cdist(v, got).toFixed(0)}) over ${A(want.x)},${A(want.y)}`
                      + ` (${cdist(v, want).toFixed(0)})`);
    }
  }
  mismatches.slice(0, 5).forEach(m => console.log('     ' + m));
  if (mismatches.length > 5) console.log(`     …and ${mismatches.length - 5} more`);
  ck(`nearest is truly nearest at all ${pts} sample points across the floor`, !mismatches.length);

  console.log(`\nNEAREST PRINTER: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
  process.exit(fail === 0 ? 0 : 1);
}

main();
