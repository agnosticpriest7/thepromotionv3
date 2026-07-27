/* AM delegation legibility (branch: deleg-legibility). It was hard to tell which job kind suited
   which personality. Every job now names the personality it's built for — the fixed
   grind→Zealot / credit→Climber / solo→Paranoid / visible→Peacock / social→Socialite mapping —
   in both the tray and the assign menu. Whether a SPECIFIC worker fits stays intel-gated (profile). */
const { createWorld } = require('./harness');
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };
const w = createWorld({ seed: 7 }); w.startNewGame(0);
let f = 0; while (f < 1500) { w.run(30); f += 30; }
const S = w.sandbox, G = w.g;
G.player.rank = 4;
const wk = G.NPCS.find(n => S.isWorker(n) && n.alive && !n.gone);

const KINDS = [['grind', 'Zealot'], ['credit', 'Climber'], ['solo', 'Paranoid'], ['visible', 'Peacock'], ['social', 'Socialite']];
G.deleg.q = [];
KINDS.forEach(([k]) => G.deleg.q.push({ id: ++G.deleg.seq, kind: k, phase: 510, exp: G.clock + 9999, to: null, state: 'open' }));

// --- every job names its target personality (profiled worker) ---
wk.ptype = 'zealot'; wk.profiled = true;
{
  const menu = S.delegAssignMenu(wk);
  KINDS.forEach(([kind, who]) => {
    const it = menu.items.find(i => new RegExp('^' + kind.toUpperCase()).test(i.label));
    ck(`${kind.toUpperCase()} job names its target: ${who}`, !!it && new RegExp('suits a ' + who).test(it.risk), it ? it.risk : 'missing');
  });
  const grind = menu.items.find(i => /^GRIND/.test(i.label));
  const credit = menu.items.find(i => /^CREDIT/.test(i.label));
  ck('a Zealot on a GRIND job reads "good fit"', /good fit/.test(grind.risk) && grind.hot === true);
  ck('a Zealot on a CREDIT job reads "wrong fit"', /wrong fit/.test(credit.risk) && !credit.hot);
}

// --- the target is shown even unprofiled; only the per-worker FIT is gated ---
{
  wk.profiled = false;
  const menu = S.delegAssignMenu(wk);
  const grind = menu.items.find(i => /^GRIND/.test(i.label));
  ck('target personality is shown even when the worker is unread', /suits a Zealot/.test(grind.risk));
  ck('the per-worker fit stays hidden until you profile them', /unread/.test(grind.risk) && grind.hot !== true);
}

// --- the tray render also carries the mapping ---
{
  S.renderDeleg();
  let html = '';
  try { html = w.sandbox.document.getElementById('delegTray').innerHTML || ''; } catch (e) { html = ''; }
  ck('the delegation tray labels open jobs with the suited personality', /suits a (Zealot|Climber|Paranoid|Peacock|Socialite)/.test(html), html ? 'has mapping' : '(tray DOM not inspectable — menu covered above)');
}

console.log(`\nDELEGATION LEGIBILITY: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
