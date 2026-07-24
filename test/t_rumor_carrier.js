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

// ---- submenu risk strings: every variant (capture renderMenu) ------------------------------
let cap = null; const realRM = S.renderMenu; S.renderMenu = (o) => { cap = o; };
function riskFor(o) {
  P.leverage.length = 0; if (o.dirt) P.leverage.push({ label: 'd', target: T.name, power: 42, src: 'hrfile' });
  V.profiled = o.profiled; V.ptype = o.ptype; V.feudWith = o.feud ? T.name : null;
  V.friends = o.loyal ? [T.name] : []; T.friends = [];
  S.pickRumorSubject(V);
  const it = cap.items.find(i => new RegExp('About ' + T.name.split(' ')[0]).test(i.label));
  return it ? it.risk : '(none)';
}
ck('risk: unread → "unknown carrier"', riskFor({ profiled: false, ptype: 'socialite' }) === 'no proof — 40% · unknown carrier', riskFor({ profiled: false, ptype: 'socialite' }));
ck('risk: profiled Socialite', riskFor({ profiled: true, ptype: 'socialite' }) === 'no proof — 40% · Socialite +30%', riskFor({ profiled: true, ptype: 'socialite' }));
ck('risk: profiled Climber (neutral → no carrier clause)', riskFor({ profiled: true, ptype: 'climber' }) === 'no proof — 40%', riskFor({ profiled: true, ptype: 'climber' }));
ck('risk: profiled Zealot + feud (willing carrier + balk)', riskFor({ profiled: true, ptype: 'zealot', feud: true }) === 'no proof — 40% · willing carrier · Zealot −40%', riskFor({ profiled: true, ptype: 'zealot', feud: true }));
ck('risk: dirt + profiled Socialite', riskFor({ profiled: true, ptype: 'socialite', dirt: true }) === 'you have proof — sticks · Socialite +30%', riskFor({ profiled: true, ptype: 'socialite', dirt: true }));
ck('risk: loyal messenger → backfires (terminal, no carrier note)', /^loyal to .* — backfires$/.test(riskFor({ profiled: true, ptype: 'socialite', loyal: true })), riskFor({ profiled: true, ptype: 'socialite', loyal: true }));
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
ck('...picker carries the carrier note (profiled Socialite +30%)', !!it && /Socialite \+30%/.test(it.risk), it && it.risk);
V.profiled = false; menu.items[iS].act();
it = cap2 && cap2.items.find(i => new RegExp('About ' + T.name.split(' ')[0]).test(i.label));
ck('...unread messenger → "unknown carrier" through the block', !!it && /unknown carrier/.test(it.risk), it && it.risk);
S.renderMenu = realRM;

console.log(`\nRUMOUR CARRIER + GOSSIP MENU: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
