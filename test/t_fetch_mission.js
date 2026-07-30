/* FETCH / friendship missions (branch: fetch-mission-deliver). A coworker asks you to bring them an
   item (stapler, coffee…). You grab it and hand it over for a friendship boost. The delivery option
   used to capture `const has = player.inv.includes(need)` at menu-BUILD time and re-check that frozen
   snapshot on click — so if you opened their menu BEFORE grabbing the item (the natural order: they
   ask, you go fetch), the Deliver action refused "you need the item first" forever, even while you
   were holding it, until the menu was closed and reopened. Fix: the click handler checks LIVE
   inventory. This test drives the real functions and asserts delivery in both orderings. */
const { createWorld } = require('./harness');
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };
function world() { const w = createWorld({ seed: 7 }); w.startNewGame(0); let f = 0; while (f < 1500) { w.run(30); f += 30; } return w; }
const worker = (S, G) => G.NPCS.find(n => S.isWorker(n) && n.alive && !n.gone);

// Force a deterministic fetch/stapler mission from `n` through the real offer path, then normalise
// the rolled kind/need so the test is stable regardless of the RNG.
function fetchMission(S, G, n) {
  S.offerMission(n);
  const m = S.missionFor(n.name);
  m.kind = 'fetch'; m.dirty = false; m.target = null; m.need = 'stapler'; m.label = S.missionLabel(m);
  /* Errands are opt-in now: an ask is not a job until the player accepts it, and the Deliver verb
     only exists on an accepted mission. This test is about the DELIVERY mechanics, so say yes here. */
  S.acceptMission(m);
  return m;
}
const deliverOpt = (S, n) => S.missionItems(n).find(it => /Deliver/i.test(it.label));

// --- (1) acquisition: grabbing a stapler lands it in pockets (player.inv) ---
{
  const w = world(), S = w.sandbox, G = w.g;
  G.player.inv.length = 0;
  S.takeItem({ label: 'a filing cabinet', kind: 'cabinet', loot: ['stapler'], x: 100, y: 100 }, 'stapler');
  ck('grabbing a stapler puts it in your pockets', G.player.inv.includes('stapler'), JSON.stringify(G.player.inv));
}

// --- (2) the whole ask -> the Deliver option appears and reads "ready" once you hold it ---
{
  const w = world(), S = w.sandbox, G = w.g; const n = worker(S, G);
  fetchMission(S, G, n);
  ck('no Deliver-ready before you have the item', deliverOpt(S, n).risk !== 'ready!');
  G.player.inv.push('stapler');
  const opt = deliverOpt(S, n);
  ck('Deliver option appears once you hold the item', !!opt && opt.risk === 'ready!', opt && opt.risk);
}

// --- (3) delivering completes the mission, consumes the item, and boosts friendship ---
{
  const w = world(), S = w.sandbox, G = w.g; const n = worker(S, G);
  const m = fetchMission(S, G, n);
  G.player.inv = ['stapler'];
  const friend0 = n.friend;
  deliverOpt(S, n).act();
  ck('mission is marked done', m.done === true);
  ck('the stapler left your pockets', !G.player.inv.includes('stapler'));
  ck('friendship went up', n.friend > friend0, `Δ=${(n.friend - friend0).toFixed(1)}`);
}

// --- (4) THE BUG: open the menu BEFORE grabbing, then acquire, then click the SAME option ---
{
  const w = world(), S = w.sandbox, G = w.g; const n = worker(S, G);
  const m = fetchMission(S, G, n);
  G.player.inv.length = 0;
  const staleOpt = deliverOpt(S, n);            // built while pockets are empty (has=false)
  G.player.inv.push('stapler');                 // now you go and grab one
  staleOpt.act();                               // click the option that was already on screen
  ck('a menu opened before you had the item still delivers once you do', m.done === true);
  ck('and it consumes the stapler', !G.player.inv.includes('stapler'));
}

// --- (5) with genuinely no item, delivery is (still) correctly refused ---
{
  const w = world(), S = w.sandbox, G = w.g; const n = worker(S, G);
  const m = fetchMission(S, G, n);
  G.player.inv.length = 0;
  deliverOpt(S, n).act();
  ck('delivery is refused when you truly have no item', m.done === false && G.today.favors === 0);
}

/* --- (6) A FETCH FAVOUR MUST NEVER BE IMPOSSIBLE ------------------------------------------
   Kyle hit an ask for a hidden coffee stash on a day when no coffee existed anywhere. Loot is
   rolled at random, so before the fix coffee was absent from the whole floor on ~0.15% of days
   (measured: 3 of 2000 whole-floor rolls) and snack on ~0.05%. Rare, which is exactly why it
   survived — a handful of sample days will never show it. This asserts the CONTRACT rather than
   the odds: after a day roll every fetchable item exists, and an ask is only ever made for
   something that can actually be brought. */
{
  const w = world(), S = w.sandbox, G = w.g;
  const NEEDS = ['coffee', 'snack', 'stapler', 'letterhead'];

  // (a) the day roll leaves every fetchable item on the floor — enough rolls to catch a 0.15% hole
  let absent = 0; const ROLLS = 600;
  for (let i = 0; i < ROLLS; i++) {
    S.rollContainers();
    if (NEEDS.some(id => !S.itemOnFloor(id))) absent++;
  }
  ck('every fetchable item exists after all ' + ROLLS + ' day rolls', absent === 0, absent + ' rolls short');

  // (b) with one item stripped from the floor AND your pockets, no ask ever asks for it
  const stripCoffee = () => {
    (G.layout.containers || []).forEach(c => { if (c.loot) c.loot = c.loot.filter(x => x !== 'coffee'); });
    (G.desks || []).forEach(d => { if (d.loot) d.loot = d.loot.filter(x => x !== 'coffee'); });
    G.player.inv.length = 0;
  };
  const n = worker(S, G);
  let fetches = 0, impossible = 0;
  for (let i = 0; i < 300; i++) {
    stripCoffee();
    S.offerMission(n);
    const m = S.missionFor(n.name);
    if (!m) continue;
    if (m.kind === 'fetch') { fetches++; if (!S.itemObtainable(m.need)) impossible++; }
    m.done = true;                       // free this worker up for the next ask
  }
  ck('no fetch ask is ever for something unobtainable', impossible === 0,
     fetches + ' fetch asks, ' + impossible + ' impossible');
}

console.log(`\nFETCH MISSION DELIVERY: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
