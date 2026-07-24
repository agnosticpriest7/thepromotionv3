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

// ---- the pickers surface the FULL flavour label (needs a real choice, else it auto-spends) --
let cap = null; const realRM = S.renderMenu; S.renderMenu = (o) => { cap = o; };
P.leverage.length = 0;
P.leverage.push({ label: 'dirt on Vera: pads timesheets', target: 'Vera', power: 34, src: 'desk' });
P.leverage.push({ label: 'HR file: Doug', target: 'Doug', power: 42, src: 'hrfile' });   // 2nd, distinct → a real choice → the picker shows
S.pickFrameDoc(workers[0]);
let pit = cap.items.find(i => /dirt on Vera: pads timesheets/.test(i.label));
ck('frame picker shows the full flavour label', !!pit);
ck('frame picker shows the strength word (solid)', !!pit && pit.risk === 'solid', pit && pit.risk);
const desk2 = g.layout.desks.find(x => x.owner && !x.planted);
if (desk2) { S.pickPlantDoc(desk2); pit = cap.items.find(i => /dirt on Vera: pads timesheets/.test(i.label)); }
ck('plant picker shows the full flavour label', !!pit);
S.renderMenu = realRM;

// ---- duplicate suppression (shared pickDocument): a picker only when the choice is real -----
// interchangeable = matching POWER *and* TARGET. equal power but DIFFERENT target is NOT
// interchangeable — the picker must appear there, or burning one silently kills dirtOn() on the
// other person (the blackmail gate). single doc / same-power-same-target auto-spend with no menu.
let capS = null; S.renderMenu = (o) => { capS = o; };
const framee = workers[0];
function frameWith(docs) { P.leverage.length = 0; docs.forEach(d => P.leverage.push(d)); P.suspicion = 40; capS = null; S.pickFrameDoc(framee); }
// single doc → auto-spend, no menu (frame/plant lose their old single-row picker — intended)
frameWith([{ label: 'gossip re: Doug', target: 'Doug', power: 20, src: 'gossip' }]);
ck('frame single doc: no menu (auto-spent)', capS === null);
ck('frame single doc: the doc was spent', P.leverage.length === 0);
// equal power + SAME target → interchangeable → suppressed
frameWith([{ label: 'front-desk gossip re: Doug', target: 'Doug', power: 20, src: 'gossip' }, { label: 'front-desk gossip re: Doug', target: 'Doug', power: 20, src: 'gossip' }]);
ck('frame identical (same power + target): no menu', capS === null);
ck('frame identical: one spent, one left', P.leverage.length === 1);
// equal power + DIFFERENT target → NOT interchangeable → picker appears (the target-check case)
const dougDoc = { label: 'gossip re: Doug', target: 'Doug', power: 20, src: 'gossip' };
const veraDoc = { label: 'gossip re: Vera', target: 'Vera', power: 20, src: 'gossip' };
frameWith([dougDoc, veraDoc]);
ck('frame equal-power DIFFERENT target: picker APPEARS (protects the target choice)', !!capS && capS.items.length >= 3);
ck('frame picker: nothing spent yet (awaiting the choice)', P.leverage.length === 2);
capS.items.find(i => /gossip re: Doug/.test(i.label)).act();
ck('frame: chose Doug → Doug spent, Vera survives (blackmail on Vera intact)', !P.leverage.includes(dougDoc) && P.leverage.includes(veraDoc) && P.leverage.length === 1);
// plant is routed through the same helper: equal-power different-target still opens a picker
const d3 = g.layout.desks.find(x => x.owner && !x.planted);
if (d3) { P.leverage.length = 0; P.leverage.push({ label: 'gossip re: Doug', target: 'Doug', power: 20, src: 'gossip' }, { label: 'gossip re: Vera', target: 'Vera', power: 20, src: 'gossip' }); capS = null; S.pickPlantDoc(d3); }
ck('plant equal-power different-target: picker APPEARS', !!capS && capS.items.length >= 3);
S.renderMenu = realRM;

// ---- snitch routed through pickDocument: choose WHO to report (was locked to last-acquired) --
// The HR/Dale/CEO snitch items were fed by lastBySrc(), which returned the most-recently-acquired
// matching doc — same acquisition-order-decides-spending bug, and the target was baked into the
// label so you couldn't report anyone else. Now: a picker over all matching docs.
const hr = g.NPCS.find(n => n.alive && n.dept === 'hr');
ck('an HR NPC exists to snitch to', !!hr);
if (hr) {
  let capH = null; S.renderMenu = (o) => { capH = o; };
  const hrSnitch = () => S.buildOptions({ kind: 'npc', ref: hr }).items.find(i => /Snitch to HR/.test(i.label));
  // two docs on different people → a picker to choose WHO (not locked to the last-acquired)
  const aDoc = { label: 'gossip re: Alpha', target: 'Alpha', power: 20, src: 'gossip' };   // acquired FIRST, weaker
  const bDoc = { label: 'note re: Beta', target: 'Beta', power: 24, src: 'desk' };          // acquired SECOND, stronger
  P.leverage.length = 0; P.leverage.push(aDoc, bDoc);
  let snitch = hrSnitch();
  ck('snitch item present (holding gossip/desk docs)', !!snitch);
  capH = null; snitch.act();
  ck('snitch: opens a picker to choose who to report', !!capH && capH.items.length >= 3);
  ck('snitch picker strongest-first (Beta before Alpha)', /Beta/.test(capH.items[0].label), capH.items[0].label);
  capH.items.find(i => /Alpha/.test(i.label)).act();   // report Alpha (the older, weaker doc)
  ck('snitch: chosen doc (Alpha) spent, Beta survives', !P.leverage.includes(aDoc) && P.leverage.includes(bDoc) && P.leverage.length === 1);
  // single matching doc → auto-report, no picker
  P.leverage.length = 0; P.leverage.push({ label: 'gossip re: Gamma', target: 'Gamma', power: 20, src: 'gossip' });
  snitch = hrSnitch(); capH = null; snitch.act();
  ck('snitch single doc: no picker (auto-reported)', capH === null && P.leverage.length === 0);
  S.renderMenu = realRM;
}

// ---- the CEO endgame glyph is a per-item field and survives the save round-trip ------------
P.leverage.length = 0;
P.leverage.push({ label: 'Sterling replies', target: 'Mr. Sterling', power: 100, src: 'hrfile', glyph: '👑' });
const snap = JSON.parse(JSON.stringify(w.save()));
w.sandbox.__save.applySnapshot(snap);
const sterling = g.player.leverage.find(l => l.target === 'Mr. Sterling');
ck('👑 glyph survives save → load', !!sterling && sterling.glyph === '👑');

console.log(`\nLEVERAGE LEGIBILITY: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
