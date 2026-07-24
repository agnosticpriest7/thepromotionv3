/* Leverage legibility (branch: leverage-legibility) — how a leverage document reads on the
   chip (source glyph + strength) and how it's consumed. Covers the chip building blocks, the
   pick-the-document flow for FRAME and PLANT (the chosen doc is spent, the others survive),
   the pickers surfacing the full flavour label, and the CEO endgame glyph surviving a save.
   Tests only — asserts against the shipped functions through the harness sandbox. */
const { createWorld } = require('./harness');
const w = createWorld(); w.startNewGame(0); w.run(1500, { ignoreGameOver: true });
const S = w.sandbox, g = w.g, P = g.player;
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };
const workers = g.NPCS.filter(n => n.alive && S.isWorker(n) && !n.boss && !n.mgr && !n.receptionist && n.dept !== 'hr');

// ---- chip building blocks: source glyph + strength tier/pips + short name ------------------
ck('levTier: ≤26 hearsay(1) / 27–41 solid(2) / ≥42 damning(3)',
   S.levTier(20) === 1 && S.levTier(26) === 1 && S.levTier(34) === 2 && S.levTier(41) === 2 && S.levTier(42) === 3 && S.levTier(100) === 3);
ck('levPips: fixed 3-wide meter', S.levPips(22) === '●○○' && S.levPips(34) === '●●○' && S.levPips(42) === '●●●');
ck('levTierWord', S.levTierWord(22) === 'hearsay' && S.levTierWord(34) === 'solid' && S.levTierWord(42) === 'damning');
ck('levGlyph by source (gossip/desk/hrfile)', S.levGlyph('gossip') === '💬' && S.levGlyph('desk') === '📄' && S.levGlyph('hrfile') === '📁');
ck('levGlyphOf: per-item glyph override beats source', S.levGlyphOf({ glyph: '👑', src: 'hrfile' }) === '👑' && S.levGlyphOf({ src: 'hrfile' }) === '📁');
ck('shortTarget: first name, title-aware', S.shortTarget('Doug') === 'Doug' && S.shortTarget('Dale Brackett') === 'Dale' && S.shortTarget('Mr. Sterling') === 'Sterling');

// ---- renderLeverage stays clean headless with behind-the-panel (🔒) + glyph-override mix ---
P.leverage.length = 0;
P.leverage.push({ label: 'gossip re: Aa', target: 'Aa', power: 22, src: 'gossip' });
P.leverage.push({ label: 'HR file: Bb', target: 'Bb', power: 42, src: 'hrfile', hidden: true });  // behind the panel
P.leverage.push({ label: 'Sterling replies', target: 'Mr. Sterling', power: 100, src: 'hrfile', glyph: '👑' });
let threw = false; try { S.renderLeverage(); } catch (e) { threw = true; }
ck('renderLeverage runs clean (hidden + override + normal chips)', !threw);

// ---- FRAME spends the CHOSEN document and leaves the others (was: pop() the last) ----------
P.leverage.length = 0;
const A = { label: 'gossip re: Aa', target: 'Aa', power: 22, src: 'gossip' };
const B = { label: 'dirt on Bb', target: 'Bb', power: 34, src: 'desk' };
const C = { label: 'HR file: Cc', target: 'Cc', power: 42, src: 'hrfile' };
P.leverage.push(A, B, C);
P.suspicion = 40;
S.frame(workers[0], B);                               // choose the MIDDLE doc, not the last
ck('frame removes the chosen doc (B)', !P.leverage.includes(B));
ck('frame leaves the OTHERS untouched (A and C survive)', P.leverage.includes(A) && P.leverage.includes(C) && P.leverage.length === 2);

// ---- PLANT spends the CHOSEN document into the desk and leaves the others ------------------
const desk = g.layout.desks.find(x => x.owner && !x.planted);
S.plantEvidence(desk, A);                             // choose A of the remaining {A, C}
ck('plant removes the chosen doc (A)', !P.leverage.includes(A));
ck('plant leaves the OTHER untouched (C survives)', P.leverage.includes(C) && P.leverage.length === 1);
ck('desk.planted === the chosen doc', desk.planted === A);

// ---- the pickers surface the FULL flavour label (the detail the chip trims) ----------------
let cap = null; const realRM = S.renderMenu; S.renderMenu = (o) => { cap = o; };
P.leverage.length = 0; P.leverage.push({ label: 'dirt on Vera: pads timesheets', target: 'Vera', power: 34, src: 'desk' });
S.pickFrameDoc(workers[0]);
let pit = cap.items.find(i => /dirt on Vera: pads timesheets/.test(i.label));
ck('frame picker shows the full flavour label', !!pit);
ck('frame picker shows the strength word (solid)', !!pit && pit.risk === 'solid', pit && pit.risk);
const desk2 = g.layout.desks.find(x => x.owner && !x.planted);
if (desk2) { S.pickPlantDoc(desk2); pit = cap.items.find(i => /dirt on Vera: pads timesheets/.test(i.label)); }
ck('plant picker shows the full flavour label', !!pit);
S.renderMenu = realRM;

// ---- the CEO endgame glyph is a per-item field and survives the save round-trip ------------
P.leverage.length = 0;
P.leverage.push({ label: 'Sterling replies', target: 'Mr. Sterling', power: 100, src: 'hrfile', glyph: '👑' });
const snap = JSON.parse(JSON.stringify(w.save()));
w.sandbox.__save.applySnapshot(snap);
const sterling = g.player.leverage.find(l => l.target === 'Mr. Sterling');
ck('👑 glyph survives save → load', !!sterling && sterling.glyph === '👑');

console.log(`\nLEVERAGE LEGIBILITY: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
