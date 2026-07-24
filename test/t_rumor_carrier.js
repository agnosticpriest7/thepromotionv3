/* Rumour messenger rules (branch: rumour-messenger-rules) + the — Gossip — menu grouping
   (branch: social-menu-grouping) that routes into it. Covers the carrier multiplier by
   personality, the fixed rival slip, feud×personality stacking with a single round, every
   submenu risk-string variant (incl. "unknown carrier" for an unread messenger), the grouped
   menu block, and the integration — the block's Spread item runs the carrier rules.
   Tests only — asserts against the shipped functions through the harness sandbox. */
const { createWorld } = require('./harness');
const w = createWorld(); w.startNewGame(0); w.run(1500, { ignoreGameOver: true });
const S = w.sandbox, g = w.g, P = g.player;
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };
const workers = g.NPCS.filter(n => n.alive && S.isWorker(n) && !n.boss && !n.mgr && !n.receptionist && n.dept !== 'hr');
const V = workers[0], T = workers[1];   // V = messenger / vector, T = subject / target

// ---- carrier multiplier: one booster, two balkers, the rest neutral -----------------------
ck('ptypeCarry: Socialite ×1.3 (the office gossip node)', S.ptypeCarry('socialite') === 1.3);
ck('ptypeCarry: Zealot ×0.6, Paranoid ×0.6 (balkers)', S.ptypeCarry('zealot') === 0.6 && S.ptypeCarry('paranoid') === 0.6);
ck('ptypeCarry: Climber ×1.0, Peacock ×1.0 (neutral)', S.ptypeCarry('climber') === 1.0 && S.ptypeCarry('peacock') === 1.0);

// ---- carrierNote: every variant, and unread reads "unknown carrier" (not silent) ----------
ck('carrierNote unread → "unknown carrier"', S.carrierNote({ profiled: false, ptype: 'socialite' }) === 'unknown carrier');
ck('carrierNote unread ignores type (still unknown)', S.carrierNote({ profiled: false, ptype: 'climber' }) === 'unknown carrier');
ck('carrierNote Socialite → "Socialite +30%"', S.carrierNote({ profiled: true, ptype: 'socialite' }) === 'Socialite +30%');
ck('carrierNote Zealot → "Zealot −40%"', S.carrierNote({ profiled: true, ptype: 'zealot' }) === 'Zealot −40%');
ck('carrierNote Paranoid → "Paranoid −40%"', S.carrierNote({ profiled: true, ptype: 'paranoid' }) === 'Paranoid −40%');
ck('carrierNote Climber → "" (profiled neutral: no clause)', S.carrierNote({ profiled: true, ptype: 'climber' }) === '');
ck('carrierNote Peacock → "" (profiled neutral: no clause)', S.carrierNote({ profiled: true, ptype: 'peacock' }) === '');

// ---- the hit: rival slip fixed; feud × personality stack; a SINGLE round on the product ----
function hitFor(o) {
  P.leverage.length = 0; P.leverage.push({ label: 'd', target: T.name, power: 42, src: 'hrfile' });  // dirt → chance 1.0
  V.rival = !!o.rival; V.feudWith = o.feud ? T.name : null; V.ptype = o.ptype; V.profiled = true;
  V.friends = []; T.friends = []; T.stress = 0; T.meltCd = 999; T.x = P.x + 5000; T.y = P.y;         // far → no overhear +6
  S.spreadRumorAbout(V, T); return T.stress;
}
ck('neutral carrier (Climber, no feud) → 42', hitFor({ ptype: 'climber' }) === 42);
ck('PLAYER-RIVAL messenger no longer boosts → 42', hitFor({ ptype: 'climber', rival: true }) === 42, 'was 55 before the fix');
ck('feud only → 55 (×1.3)', hitFor({ ptype: 'climber', feud: true }) === 55);
ck('Socialite only → 55 (×1.3)', hitFor({ ptype: 'socialite' }) === 55);
ck('feud + Socialite → 71 (×1.69, single round, not compounded)', hitFor({ ptype: 'socialite', feud: true }) === 71);
ck('Zealot → 25 (×0.6)', hitFor({ ptype: 'zealot' }) === 25);
ck('Paranoid → 25 (×0.6)', hitFor({ ptype: 'paranoid' }) === 25);

// ---- submenu: carrier is in the TITLE (#1), rows carry only subject-varying info -----------
let cap = null; const realRM = S.renderMenu; S.renderMenu = (o) => { cap = o; };
function subFor(o) {
  P.leverage.length = 0; if (o.dirt) P.leverage.push({ label: 'd', target: T.name, power: 42, src: 'hrfile' });
  V.profiled = o.profiled; V.ptype = o.ptype; V.feudWith = o.feud ? T.name : null;
  V.friends = o.loyal ? [T.name] : []; T.friends = [];
  S.pickRumorSubject(V);
  const it = cap.items.find(i => new RegExp('About ' + T.name.split(' ')[0]).test(i.label));
  return { risk: it ? it.risk : '(none)', title: cap.title };
}
let r;
r = subFor({ profiled: false, ptype: 'socialite' });
ck('row drops carrier → base only', r.risk === 'no proof — 40%', r.risk);
ck('title: unread → "(unknown carrier)"', /\(unknown carrier\)/.test(r.title), r.title);
r = subFor({ profiled: true, ptype: 'socialite' });
ck('row base (Socialite)', r.risk === 'no proof — 40%', r.risk);
ck('title: profiled Socialite → "(Socialite +30%)"', /\(Socialite \+30%\)/.test(r.title), r.title);
r = subFor({ profiled: true, ptype: 'climber' });
ck('title: profiled neutral → NO carrier parenthetical', !/\(/.test(r.title), r.title);
r = subFor({ profiled: true, ptype: 'zealot', feud: true });
ck('row keeps the subject-varying feud note (willing carrier)', r.risk === 'no proof — 40% · willing carrier', r.risk);
ck('title: profiled Zealot → "(Zealot −40%)"', /\(Zealot −40%\)/.test(r.title), r.title);
r = subFor({ profiled: true, ptype: 'socialite', dirt: true });
ck('row: dirt → "you have proof — sticks" (carrier not on row)', r.risk === 'you have proof — sticks', r.risk);
r = subFor({ profiled: true, ptype: 'socialite', loyal: true });
ck('loyal → backfires (row); carrier still in title', /^loyal to .* — backfires$/.test(r.risk) && /\(Socialite \+30%\)/.test(r.title), r.risk + ' | ' + r.title);
S.renderMenu = realRM;

// ---- the — Gossip — menu block: the three verbs grouped, exactly once, no old labels -------
const menu = S.buildOptions({ kind: 'npc', ref: V });
const Lb = menu.items.map(i => i.label);
const iH = Lb.indexOf('— Gossip —'),
      iE = Lb.findIndex(l => /^Eavesdrop —/.test(l)),
      iS = Lb.findIndex(l => /^Spread a rumour about someone else/.test(l)),
      iC = Lb.findIndex(l => /^Clear their name —/.test(l));
ck('— Gossip — block is contiguous (header, eavesdrop, spread, clear)', iH >= 0 && iE === iH + 1 && iS === iH + 2 && iC === iH + 3);
ck('no OLD labels survive (gossip / debunk / pick who)', !Lb.some(l => /Eavesdrop \(gossip|Clear their name \(debunk|pick who it/.test(l)));
ck('each social verb appears exactly once', Lb.filter(l => /^Eavesdrop/.test(l)).length === 1 && Lb.filter(l => /^Spread a rumour/.test(l)).length === 1 && Lb.filter(l => /^Clear their name/.test(l)).length === 1);
ck('eavesdrop + clear-name acts are wired', typeof menu.items[iE].act === 'function' && typeof menu.items[iC].act === 'function');

// ---- integration: the block's Spread item drives pickRumorSubject WITH the carrier rules ---
let cap2 = null; S.renderMenu = (o) => { cap2 = o; };
V.profiled = true; V.ptype = 'socialite'; V.feudWith = null; V.friends = []; P.leverage.length = 0;
menu.items[iS].act();
let it = cap2 && cap2.items.find(i => new RegExp('About ' + T.name.split(' ')[0]).test(i.label));
ck('Gossip-block Spread item → subject picker', !!it);
ck('...carrier note is in the TITLE (profiled Socialite +30%)', !!cap2 && /\(Socialite \+30%\)/.test(cap2.title), cap2 && cap2.title);
ck('...and the row carries only subject-varying info (base)', !!it && it.risk === 'no proof — 40%', it && it.risk);
V.profiled = false; menu.items[iS].act();
ck('...unread messenger → "(unknown carrier)" in the title through the block', !!cap2 && /\(unknown carrier\)/.test(cap2.title), cap2 && cap2.title);
S.renderMenu = realRM;

// ---- MULTI-DOC + DUPLICATE SUPPRESSION: a picker only when the choice is real ---------------
// A subject's docs all share that target, so "interchangeable" collapses to equal power here.
let capD = null; S.renderMenu = (o) => { capD = o; };
function seed(docs) {
  P.leverage.length = 0; docs.forEach(d => P.leverage.push(d));
  V.profiled = true; V.ptype = 'climber'; V.feudWith = null; V.friends = []; T.friends = [];
  T.stress = 0; T.meltCd = 999; T.x = P.x + 5000; T.y = P.y;   // far → no overhear, so stress == the hit
}
function subjectRow() { S.pickRumorSubject(V); return capD.items.find(i => new RegExp('About ' + T.name.split(' ')[0]).test(i.label)); }

// (a) DIFFERENT power → picker appears, strongest first, chosen spent, the other left
const gossip = { label: 'gossip re: ' + T.name, target: T.name, power: 22, src: 'gossip' };  // acquired FIRST
const hrfile = { label: 'HR file: ' + T.name, target: T.name, power: 42, src: 'hrfile' };     // acquired SECOND
seed([gossip, hrfile]);
let row = subjectRow();
ck('different-power: row flags "2 docs — choose"', /2 docs — choose/.test(row.risk), row.risk);
capD = null; row.act();
ck('different-power: a picker opened', !!capD && capD.items.length >= 3);
ck('different-power: STRONGEST FIRST (HR file before gossip)', /HR file:/.test(capD.items[0].label) && /gossip re:/.test(capD.items[1].label), capD.items[0].label + ' | ' + capD.items[1].label);
capD.items.find(i => /HR file:/.test(i.label)).act();   // choose the strongest (which was acquired SECOND)
ck('different-power: chosen HR file spent, gossip left', !P.leverage.includes(hrfile) && P.leverage.includes(gossip) && P.leverage.length === 1);

// (b) IDENTICAL power+target → NO picker, one spent, one left, and no row flag
const dup1 = { label: 'front-desk gossip re: ' + T.name, target: T.name, power: 20, src: 'gossip' };
const dup2 = { label: 'front-desk gossip re: ' + T.name, target: T.name, power: 20, src: 'gossip' };
seed([dup1, dup2]);
row = subjectRow();
ck('identical docs: NO "docs — choose" flag on the row', !/docs — choose/.test(row.risk), row.risk);
capD = null; row.act();
ck('identical docs: NO picker opened (auto-spent one)', capD === null);
ck('identical docs: exactly one spent, one left', P.leverage.length === 1);
ck('identical docs: the hit still landed (power 20)', T.stress === 20, 'stress=' + T.stress);

// legacy no-doc call still defaults to STRONGEST (deterministic)
seed([gossip, hrfile]);
S.spreadRumorAbout(V, T);
ck('legacy spreadRumorAbout(no doc) → strongest (42), gossip survives', T.stress === 42 && !P.leverage.includes(hrfile) && P.leverage.includes(gossip), 'stress=' + T.stress);
S.renderMenu = realRM;

console.log(`\nRUMOUR CARRIER + GOSSIP MENU: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
