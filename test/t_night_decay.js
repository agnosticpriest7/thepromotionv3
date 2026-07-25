/* Overnight decay (branch: night-decay). The player's suspicion and stress no longer carry over in
   full: each halves at the day rollover (NIGHT_DECAY=0.5). Suspicion used to drop a flat −10 and
   stress had no overnight relief at all, so a hot/stressed day compounded into the next. */
const { createWorld } = require('./harness');
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };
function world() { const w = createWorld({ seed: 7 }); w.startNewGame(0); let f = 0; while (f < 1500) { w.run(30); f += 30; } return w; }

// --- suspicion and stress each halve at the rollover ---
{
  const w = world(), S = w.sandbox, G = w.g;
  G.player.suspicion = 80; G.player.stress = 60;
  S.nextDay();
  ck('suspicion halves overnight (80 -> 40)', Math.abs(G.player.suspicion - 40) < 1e-6, 'susp=' + G.player.suspicion);
  ck('stress halves overnight (60 -> 30)', Math.abs(G.player.stress - 30) < 1e-6, 'stress=' + G.player.stress);
}

// --- a full-heat day is not a permanent sentence: 100 -> 50, and it keeps shedding day over day ---
{
  const w = world(), S = w.sandbox, G = w.g;
  G.player.suspicion = 100; G.player.stress = 100;
  S.nextDay();
  ck('suspicion 100 -> 50 (clamped, halved)', Math.abs(G.player.suspicion - 50) < 1e-6, 'susp=' + G.player.suspicion);
  ck('stress 100 -> 50', Math.abs(G.player.stress - 50) < 1e-6, 'stress=' + G.player.stress);
  S.nextDay();
  ck('a second night halves again (50 -> 25)', Math.abs(G.player.suspicion - 25) < 1e-6 && Math.abs(G.player.stress - 25) < 1e-6, `susp=${G.player.suspicion} stress=${G.player.stress}`);
}

// --- but it does NOT wipe the slate: real accumulation still carries a meaningful fraction ---
{
  const w = world(), S = w.sandbox, G = w.g;
  G.player.suspicion = 40; G.player.stress = 40;
  S.nextDay();
  ck('half still carries over (not a reset to 0)', G.player.suspicion === 20 && G.player.stress === 20, `susp=${G.player.suspicion} stress=${G.player.stress}`);
}

console.log(`\nNIGHT DECAY: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
