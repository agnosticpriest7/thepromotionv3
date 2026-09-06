/* THE ART BUDGET — because the Xbox is the smallest room the game has to fit in.

   ⚠️ THIS SUITE EXISTS BECAUSE THE GAME SHIPPED A BUILD THE XBOX COULD NOT OPEN. On 2026-09-06
   Save-Rite's cast art pushed the registered library to 594 MB of DECODED bitmaps and Xbox Edge
   answered with SBOX_FATAL_MEMORY_EXCEEDED — a grey page with a Refresh button, on the one device
   Kyle actually plays on. Nothing in the suite noticed, because nothing in the suite was looking
   at bytes: every test was green, placement was green, and the game was unopenable.

   ⚠️ AND THE DOWNLOAD SIZE IS NOT THE NUMBER THAT MATTERS. The art was 105 MB over the wire and
   594 MB in memory, because a PNG decodes to width*height*4 REGARDLESS of how well it compressed,
   and `keyOutMagenta` then makes a second full canvas copy of every keyed sprite. A 1254x1254
   counter is 300 KB on disk and 6 MB resident. Judging art by its file size is how 490 MB of
   oversampled props got waved through.

   ⚠️ THE REAL WASTE WAS OVERSAMPLING, NOT COUNT. The canvas is a FIXED 860x500 backing store
   (index.html line 382) which CSS stretches to the TV, so a sprite's drawn size is its FINAL size
   — there is no higher-resolution path that a big source would ever serve. `counter_sink` was
   stored 1254x1254 and drawn 90x90: 194x the pixels, every one of them thrown away by a
   `imageSmoothingEnabled=false` nearest-neighbour blit that keeps every 14th pixel and bins the
   rest. Oversampling did not merely cost memory, it cost QUALITY.

   WHAT THIS ASSERTS, and why it is a contract rather than a coordinate (§14): not "sprite X is
   N pixels", which rots the next time art is redrawn, but "the library as a whole still fits in
   the budget, and no single sprite is grotesquely larger than the box it is drawn into." Both
   numbers are derived — the file list from index.html, the dimensions from the PNG headers on
   disk — so this cannot disagree with the build about what is registered.

   Drawn sizes come from instrumenting the real ctx.drawImage in a browser, NOT from reading code:
   the harness stubs Image at 64x64 (HANDOFF-8), so nothing measured off a sprite is true in here.
   That is why the per-sprite check below keys off ART_W, which is authored data the harness can
   read, rather than off any measurement. */
'use strict';
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const ck = (n, c, d) => { console.log('  ' + (c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '   ' + d : '')); c ? pass++ : fail++; };

const ROOT = path.join(__dirname, '..');
const SPRITES = path.join(ROOT, 'Art', 'sprites');
const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* ---- SPEC, fixed at authoring time. These are the budget, not a measurement of it. --------- */
const BUDGET_MB = 260;      // decoded RGBA ceiling. Measured 135 MB after the 2026-09-06 diet;
                            // the headroom is deliberate, the cliff is somewhere past 594.
const PEAK_MB = 420;        // with keyOutMagenta's second canvas copy of every keyed sprite
const MAX_OVERSAMPLE = 6;   // a sprite may be stored up to 6x its drawn width. 2x is the target;
                            // 6 is where "supersampled for safety" becomes "nobody checked".

/* ---- read the registered list out of the build itself ------------------------------------- */
function listFrom(startTok, endTok) {
  const i = src.indexOf(startTok);
  if (i < 0) return [];
  let body = src.slice(i, src.indexOf(endTok, i));
  body = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // comments carry quotes
  return (body.match(/'[^']+'/g) || []).map(s => s.slice(1, -1));
}
const files = listFrom('const ART_FILES=[', '];');
const magenta = new Set(listFrom('const MAGENTA_BG=new Set([', ']);'));
/* COLORKEY, restated from index.html: every bat sheet, the printer wreck, and MAGENTA_BG */
const keyed = new Set(files.filter(n => n.indexOf('bat_') === 0 || n === 'printer_wreck' || magenta.has(n)));

function pngSize(name) {
  const p = path.join(SPRITES, name.split('/').join(path.sep) + '.png');
  if (!fs.existsSync(p)) return null;
  const fd = fs.openSync(p, 'r');
  const head = Buffer.alloc(24);
  fs.readSync(fd, head, 0, 24, 0);
  fs.closeSync(fd);
  if (head.slice(0, 8).toString('binary') !== '\x89PNG\r\n\x1a\n') return null;
  return { w: head.readUInt32BE(16), h: head.readUInt32BE(20) };
}

/* ⚠️ ANTI-VACUITY ANCHOR (§14). Every number below is derived from files on disk; if the parse
   silently returns nothing, every budget check passes with flying colours while measuring an
   empty library. State what would make this vacuous, then assert it cannot happen. */
const dims = files.map(n => ({ n, d: pngSize(n) }));
const missing = dims.filter(x => !x.d);
ck('the registered art list actually parses out of index.html', files.length >= 200,
   files.length + ' entries in ART_FILES');
ck('  ^ and every one resolves to a real PNG on disk — otherwise this suite measures nothing',
   missing.length === 0,
   missing.length ? missing.length + ' unreadable, first: ' + missing[0].n : dims.length + ' PNGs read');

/* ---- 1. the whole library must fit ---------------------------------------------------------- */
const MB = 1048576;
let decoded = 0, peak = 0;
dims.forEach(({ n, d }) => {
  if (!d) return;
  const b = d.w * d.h * 4;
  decoded += b;
  peak += b * (keyed.has(n) ? 2 : 1);
});
const decMB = decoded / MB, peakMB = peak / MB;
ck('the decoded art library fits the memory budget', decMB <= BUDGET_MB,
   decMB.toFixed(0) + ' MB decoded (ceiling ' + BUDGET_MB + ' MB, was 594 MB on the build that '
   + 'would not open on Xbox)');
ck('  ^ and so does the load-time peak, with keyOutMagenta\'s second copy of every keyed sprite',
   peakMB <= PEAK_MB,
   peakMB.toFixed(0) + ' MB peak across ' + keyed.size + ' keyed sprites (ceiling ' + PEAK_MB + ' MB)');

/* ---- 2. no single sprite may be stored absurdly larger than it is drawn ---------------------
   ART_W is the drawn width in SCALED px (§14) and is authored data, so the harness can read it
   without touching a sprite. Anything with an ART_W entry has a known drawn size; judge it. */
const awStart = src.indexOf('const ART_W=');
const awBody = src.slice(awStart, src.indexOf('};', awStart));
const ART_W = {};
for (const m of awBody.matchAll(/(\w+)\s*:\s*([0-9.]+)/g)) ART_W[m[1]] = parseFloat(m[2]);

const overs = [];
Object.keys(ART_W).forEach(n => {
  const d = pngSize(n);
  if (!d || !ART_W[n]) return;
  const ratio = d.w / ART_W[n];
  if (ratio > MAX_OVERSAMPLE) overs.push(n + ' ' + d.w + 'px stored / ' + ART_W[n] + 'px drawn = ' + ratio.toFixed(1) + 'x');
});
ck('no prop is stored more than ' + MAX_OVERSAMPLE + 'x its drawn width', overs.length === 0,
   overs.length ? overs.slice(0, 4).join('; ') + (overs.length > 4 ? ' (+' + (overs.length - 4) + ' more)' : '')
                : Object.keys(ART_W).length + ' props all within ' + MAX_OVERSAMPLE + 'x');

/* ⚠️ and the anchor for THAT one: if ART_W stopped parsing, the loop above would check nothing
   and report a clean sweep of zero props. */
ck('  ^ and ART_W actually parsed, so the check above had props to look at',
   Object.keys(ART_W).length >= 40, Object.keys(ART_W).length + ' props carry a drawn width');

/* ---- 3. walk strips stay sliceable ----------------------------------------------------------
   drawChar slices by CHAR_FRAMES and drawBatFrame by a hard-coded 4. A resize that leaves a width
   not divisible by the frame count shifts every frame by a fraction of a pixel and shears the
   animation — the kind of thing that looks like bad art rather than bad arithmetic. */
const CHAR_FRAMES = parseInt((src.match(/const CHAR_FRAMES\s*=\s*(\d+)/) || [])[1] || '3', 10);
const badWalk = files.filter(n => /(^|\/)walk_/.test(n)).filter(n => {
  const d = pngSize(n); return d && d.w % CHAR_FRAMES !== 0;
});
ck('every walk strip divides cleanly into its ' + CHAR_FRAMES + ' frames', badWalk.length === 0,
   badWalk.length ? badWalk.slice(0, 3).join(', ') : 'all walk strips slice evenly');

const badBat = files.filter(n => n.startsWith('bat_') || n === 'printer_wreck').filter(n => {
  const d = pngSize(n); return d && d.w % 4 !== 0;
});
ck('  ^ and every 4-column bat / wreck sheet does too', badBat.length === 0,
   badBat.length ? badBat.slice(0, 3).join(', ') : 'all 4-column sheets slice evenly');

/* ---- 4. seated facings must share one scale --------------------------------------------------
   ⚠️ drawSeatedPerson takes `scale` from the character's _down pose CONTENT height and applies it
   to EVERY facing. Resize the facings by different factors and the up-pose renders ~20% small
   while every test stays green, because nothing else in the suite compares two facings. */
const sitNames = files.filter(n => /(^|\/)sit_/.test(n));
const byChar = {};
sitNames.forEach(n => {
  const m = n.match(/^(.*sit_.+)_(down|up|left|right)$/);
  if (!m) return;
  (byChar[m[1]] = byChar[m[1]] || []).push({ dir: m[2], d: pngSize(n), n });
});
const ragged = [];
Object.entries(byChar).forEach(([c, fs_]) => {
  const hs = fs_.filter(f => f.d).map(f => f.d.h);
  if (hs.length < 2) return;
  const lo = Math.min(...hs), hi = Math.max(...hs);
  if (hi / lo > 1.02) ragged.push(c + ' heights ' + lo + '..' + hi);
});
ck('a character\'s seated facings all share one source scale', ragged.length === 0,
   ragged.length ? ragged.slice(0, 3).join('; ')
                 : Object.keys(byChar).length + ' seated characters, facings consistent');

console.log('');
console.log('art budget: ' + pass + ' pass, ' + fail + ' fail');
if (fail) { console.log('ART BUDGET: RED'); process.exit(1); }
console.log('ART BUDGET: GREEN (the library fits the smallest device it has to run on)');
