/* Manager verb #1 — dismissal (branch: manager-fire). The manager can walk a worker out on a
   single documented strike (HR auto-fires at two). managerFire() calls the real fireNPC() for all
   its load-bearing costs, then adds two guards: a floor-wide morale aftershock, and a suspicion
   charge if you manufactured the strike yourself (youDidThis). Tests: grounds check, survivor dip,
   traced-fire exposure, and that seat/desk/rank agreement still holds after a firing. */
const { createWorld } = require('./harness');
const w = createWorld(); w.startNewGame(0); w.run(3000);
const S = w.sandbox, G = w.g;
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };
const workers = () => G.NPCS.filter(n => S.isWorker(n) && n.alive && !n.gone);

G.player.rank = 5;                              // MANAGER — the verb's gate
G.player.suspicion = 10; G.player.stress = 10;  // clamp-safe headroom for the exposure check

// ---- 1) GROUNDS: a clean file cannot be fired ----
{
  const clean = workers().find(n => (n.strikes || 0) === 0);
  clean.strikes = 0;
  const firedBefore = G.today.fired.length;
  const r = S.managerFire(clean);
  ck('clean worker cannot be fired (returns false)', r === false);
  ck('clean worker is still on the floor', clean.alive === true);
  ck('no firing was recorded', G.today.fired.length === firedBefore);
  ck('fireGrounds() rejects 0 strikes, accepts 1', S.fireGrounds({ strikes: 0 }) === false && S.fireGrounds({ strikes: 1 }) === true);
  // the office menu surfaces the grounds and hides clean workers
  const menu = S.fireMenu();
  ck('fireMenu lists nobody dismissible when the floor is clean',
    menu.items.some(it => /Nobody has a strike/.test(it.label)));
}

// ---- 2) SURVIVOR DIP: the rest of the floor takes -8 mood / +5 stress ----
{
  const victim = workers().find(n => n.alive && !n.gone);
  victim.strikes = 1; victim.yourWork = 0;       // documented, NOT manufactured by you
  const survivor = workers().find(o => o !== victim && !(o.friends && o.friends.includes(victim.name)));
  survivor.mood = 0; survivor.stress = 20;       // known, clamp-safe baseline
  const firedBefore = G.today.fired.length;
  const r = S.managerFire(victim);
  ck('a worker with a strike CAN be fired', r === true && victim.alive === false);
  ck('the firing hit today.fired (-16 health via the formula)', G.today.fired.length === firedBefore + 1);
  ck('survivor mood dipped exactly -8', survivor.mood === -8, 'mood=' + survivor.mood);
  ck('survivor stress rose exactly +5', survivor.stress === 25, 'stress=' + survivor.stress);
  ck('the vacated desk was released', G.desks.every(d => d.owner !== victim.name));
}

// ---- 3) EXPOSURE: firing someone whose strike YOU caused traces back ----
{
  const mark = workers().find(n => n.alive && !n.gone);
  mark.strikes = 1;
  S.blameYou(mark);                              // yourWork -> youDidThis(mark) === true
  ck('youDidThis is set for a fire you engineered', S.youDidThis(mark) === true);
  const susp0 = G.player.suspicion;
  const menuRisk = S.fireMenu().items.find(it => new RegExp(mark.name.split(' ')[0]).test(it.label));
  ck('the menu flags a traced dismissal', !!menuRisk && menuRisk.risk === 'traces to you');
  S.managerFire(mark);
  ck('a traced fire raises suspicion by +25', G.player.suspicion === susp0 + 25, `Δ=${G.player.suspicion - susp0}`);
}

// ---- 4) INTEGRITY: seat/desk/rank agreement holds across the backfill ----
{
  const victim = workers().find(n => n.alive && !n.gone);
  victim.strikes = 1;
  S.managerFire(victim);
  const before = w.stats.seatViolations;
  w.run(90000, { onDay: () => { G.player.rank = 5; } });   // ~2+ days: through the day+2 backfill
  ck('no seat/desk/rank violations after a firing + backfill',
    w.stats.seatViolations === before, w.stats.firstSeatViolation || '');
  ck('run stayed alive (not gameOver)', G.gameOver === false);
}

console.log(`\nMANAGER FIRE: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
