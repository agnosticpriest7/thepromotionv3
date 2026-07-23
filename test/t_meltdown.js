/* Printer-execution meltdown: the victim must actually reach the printer, swing 5-8 times at a
   deliberate pace, and leave it wrecked (stage 3). Runs several forced trials with different
   victims. (Natural trigger rate is 7% of meltdowns — see meltdown(); this test forces it.) */
const { createWorld, DT_MS } = require('./harness');
const dt = DT_MS / 1000;

function trial(idx) {
  const w = createWorld();
  w.startNewGame(0);
  const sb = w.sandbox;
  let g = 0;
  while ((w.g.day < 2 || w.g.clock < 10 * 60) && g < 120000) { w.run(300); g += 300; }
  const printers = w.g.layout.objects.filter(o => o.type === 'printer');
  printers.forEach(p => { p.wreckStage = 0; p.jammed = false; });

  const cands = w.g.NPCS.filter(n => n.alive && n.dept !== 'hr' && !n.boss && !n.mgr && !n.receptionist && !n.gone && n.x > 0);
  const victim = cands[idx % cands.length];
  victim.printerMode = true;
  sb.startMeltEvent(victim, false);

  let swings = 0, prev = null, frames = 0, maxWreck = 0, firstF = null, lastF = null, stuckFr = 0;
  let lastPos = { x: victim.x, y: victim.y }, stillFrames = 0;
  for (let i = 0; i < 4000; i++) {
    w.run(1); frames++;
    const bf = victim.batFrame;
    if (bf === 2 && prev !== 2) { swings++; if (firstF === null) firstF = frames; lastF = frames; }
    prev = bf;
    maxWreck = Math.max(maxWreck, ...printers.map(p => p.wreckStage || 0));
    // "wedged" = has a far goal + path but isn't moving (the harness's own stuck heuristic)
    const gg = victim.goal;
    const distGoal = gg && gg.x != null ? Math.hypot(gg.x - victim.x, gg.y - victim.y) : 0;
    const moved = Math.hypot(victim.x - lastPos.x, victim.y - lastPos.y) > 0.5;
    if (gg && distGoal > 70 && victim.path && victim.path.length && !moved) stuckFr++; else stuckFr = Math.max(0, stuckFr - 1);
    lastPos = { x: victim.x, y: victim.y };
    if (!victim.rampage && frames > 30) break;
  }
  const dur = frames * dt;
  const tPer = swings > 1 ? (lastF - firstF) * dt / (swings - 1) : 0;
  const ok = swings >= 5 && swings <= 8 && maxWreck === 3 && stuckFr < 120;
  console.log(`trial ${idx} [${victim.name.padEnd(8)}] swings=${swings} wreck=${maxWreck} dur=${dur.toFixed(1)}s t/swing=${tPer.toFixed(2)}s ${ok ? 'OK' : 'FAIL' + (stuckFr >= 120 ? ' (wedged)' : '')}`);
  return ok;
}

console.log('===== PRINTER-EXECUTION MELTDOWN =====');
let pass = 0, N = 6;
for (let i = 0; i < N; i++) if (trial(i)) pass++;
console.log(`\nRESULT: ${pass === N ? 'GREEN ✅  ' + N + '/' + N + ' trials: victim reaches printer, 5-8 deliberate swings, printer wrecked' : 'RED ❌  ' + pass + '/' + N + ' passed'}`);
process.exit(pass === N ? 0 : 1);
