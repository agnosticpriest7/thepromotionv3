/* GROCERY CUSTOMERS — ambient shoppers, and the first NPCs in this project with real CHURN.

   Staff persist for a whole run. Customers arrive and leave every few seconds, which makes this
   the first proper stress test of npcLeaving() and of the investment invariant: a pointer left
   at somebody who walked out forty seconds ago is the worst version of the bug that invariant
   exists for.

   ⚠️ CONSTRUCTED THE WAY THE GAME DOES, NEVER HAND-POSED. The department gates shipped broken
   because a test posed `gone=false` at a day boundary — a floor no real evening has — and the
   pose concealed the bug rather than finding it. So every customer below comes out of
   spawnCustomer() and leaves through the code that really removes them. Where a test needs a
   crowd, it runs the spawner.

   ⚠️ NEGATIVE CASES ARE THE POINT. "A shopper can be pranked" is the failure; asserting that
   staff can be pranked would not notice it. Every guard below is checked by trying the thing
   that must not work. */
'use strict';
const { createWorld } = require('./harness');

let pass = 0, fail = 0;
const ck = (n, c, d) => { console.log('  ' + (c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '   ' + d : '')); c ? pass++ : fail++; };

const TARGET = 6;                         // CUSTOMER_TARGET — the dial, named here as spec (§14)
const mk = () => createWorld({ storage: { 'promo:level': 'grocery', 'promo:newgame': '0', 'promo:char': '0' } });

/* ---- 1. THEY ARRIVE, THEY WALK, THEY LEAVE ---------------------------------------------- */
{
  const w = mk(), S = w.sandbox, g = w.g;
  const staffAtBoot = g.NPCS.length;
  w.run(9000, { ignoreGameOver: true });
  ck('the shop fills up on its own, without anything spawning them by hand',
     S.customersOnFloor() > 0 && S.customersOnFloor() <= TARGET,
     S.customersOnFloor() + ' shoppers, cap ' + TARGET);
  ck('  ^ and the staff count is untouched', g.NPCS.filter(n => !n.customer).length === staffAtBoot,
     staffAtBoot + ' staff before, ' + g.NPCS.filter(n => !n.customer).length + ' after');

  /* they must actually MOVE — a shopper standing at the door is worse than no shopper */
  const start = g.NPCS.filter(n => n.customer).map(n => ({ n: n, x: n.x, y: n.y }));
  w.run(3000, { ignoreGameOver: true });
  const stillHere = start.filter(s => s.n.alive);
  const moved = stillHere.filter(s => Math.hypot(s.n.x - s.x, s.n.y - s.y) > 40);
  ck('  ^ and they walk into the shop rather than standing in the doorway',
     stillHere.length === 0 || moved.length >= Math.ceil(stillHere.length / 2),
     moved.length + '/' + stillHere.length + ' of the ones still in the shop had moved');
}

/* ---- 2. CHURN: HUNDREDS OF ARRIVALS AND DEPARTURES, ALL THROUGH npcLeaving() ------------- */
{
  const w = mk(), S = w.sandbox, g = w.g;
  w.run(9000, { ignoreGameOver: true });
  let spawned = 0, removed = 0, leftViaHook = 0;
  const sp = S.spawnCustomer, rm = S.removeCustomer, nl = S.npcLeaving;
  S.spawnCustomer = function () { spawned++; return sp.apply(null, arguments); };
  S.removeCustomer = function (n) { removed++; return rm.apply(null, arguments); };
  S.npcLeaving = function (n) { if (n && n.customer) leftViaHook++; return nl.apply(null, arguments); };
  const st = w.run(120000, { ignoreGameOver: true });     // ~4 in-game days of continuous churn
  S.spawnCustomer = sp; S.removeCustomer = rm; S.npcLeaving = nl;

  ck('a long run really does churn hundreds of shoppers', spawned > 100 && removed > 100,
     spawned + ' arrived, ' + removed + ' left');
  ck('  ^ and EVERY departure went through npcLeaving()', leftViaHook === removed && removed > 0,
     leftViaHook + '/' + removed + ' via the hook');
  ck('  ^ and nothing throws across all of it', st.throws === 0 && g.renderErrs === 0,
     'throws ' + st.throws + ', renderErrs ' + g.renderErrs +
     (st.firstThrow ? '\n     ' + String(st.firstThrow).split('\n').slice(0, 2).join(' | ') : ''));
  /* THE ARRAY MUST NOT GROW. Dead entries left in NPCS would be a slow leak across five days. */
  ck('  ^ and NPCS does not grow: they are spliced out, not left as corpses',
     g.NPCS.length <= 12 + TARGET + 2 && g.NPCS.filter(n => n.customer && !n.alive).length === 0,
     g.NPCS.length + ' in the array, ' + g.NPCS.filter(n => n.customer).length + ' of them shoppers');
}

/* ---- 3. NO STAFF QUERY EVER SEES A CUSTOMER --------------------------------------------- */
{
  const w = mk(), S = w.sandbox, g = w.g;
  w.run(20000, { ignoreGameOver: true });
  const custs = g.NPCS.filter(n => n.customer);
  ck('there really are shoppers on the floor to be wrongly counted', custs.length > 0, custs.length + ' present');

  const leaks = [];
  if (custs.some(n => S.isWorker(n))) leaks.push('isWorker');
  if (S.hrs().some(n => n.customer)) leaks.push('hrs()');
  ['front', 'grocery', 'produce', 'deli', 'bakery'].forEach(d => {
    if (S.deptStaff(d).some(n => n.customer)) leaks.push('deptStaff(' + d + ')');
    const m = S.deptManager(d); if (m && m.customer) leaks.push('deptManager(' + d + ')');
  });
  [['storeBoss', S.storeBoss()], ['storeAM', S.storeAM()], ['storeOwner', S.storeOwner()]].forEach(pair => {
    if (pair[1] && pair[1].customer) leaks.push(pair[0]);
  });
  ck('no shopper appears in any staff query', leaks.length === 0,
     leaks.length ? 'LEAKED INTO: ' + leaks.join(', ') : 'isWorker, hrs, deptStaff x5, deptManager x5, storeBoss/AM/Owner');

  /* and the audit apparatus is still asleep — the reason is the namespace, so check the field */
  ck('  ^ and none of them carries a department or a role',
     custs.every(n => !n.storeDept && !n.storeRole && n.dept !== 'hr'),
     'depts seen: ' + [...new Set(custs.map(n => n.dept))].join(', '));
  let hrN = -1; try { hrN = S.hrs().length; } catch (e) {}
  ck('  ^ so triggerAudit is still dormant with a shop full of people', hrN === 0, hrN + ' hr');
}

/* ---- 4. NOTHING CAN TAKE A CUSTOMER AS A TARGET ----------------------------------------- */
{
  const w = mk(), S = w.sandbox, g = w.g;
  w.run(20000, { ignoreGameOver: true });
  const cust = g.NPCS.find(n => n.customer);
  ck('a shopper is on the floor for this', !!cust, cust ? cust.name : 'none');

  /* THE INTERACTION SCAN. With no menu there is no verb, which is the structural guard — so the
     test walks the player onto them and asks what the game offers. */
  /* ⚠️ THE FIRST VERSION GUESSED AT FUNCTION NAMES — `S.pickTarget` does not exist, so the probe
     caught its own ReferenceError, left `reached` false, and passed no matter what the game did.
     The mutant that made shoppers interactable again SURVIVED it. The real function is
     nearestInteractable(); and the assertion is only worth anything if the same probe can SEE a
     member of staff, so it checks both directions. */
  const staff = g.NPCS.find(n => !n.customer && n.alive && S.isWorker(n));
  g.player.x = staff.x; g.player.y = staff.y;
  let seesStaff = null; try { seesStaff = S.nearestInteractable(); } catch (e) { seesStaff = 'threw ' + e; }
  ck('the interaction scan can see a member of staff standing right there',
     !!seesStaff && seesStaff.kind === 'npc' && seesStaff.ref === staff,
     seesStaff ? (seesStaff.kind + ' ' + ((seesStaff.ref && seesStaff.ref.name) || '')) : 'nothing');

  g.player.x = cust.x; g.player.y = cust.y;
  let seesCust = null; try { seesCust = S.nearestInteractable(); } catch (e) { seesCust = 'threw ' + e; }
  const reached = !!(seesCust && seesCust.kind === 'npc' && seesCust.ref === cust);
  ck('  ^ but standing on top of a shopper offers no interaction with them', reached === false,
     'reached=' + reached + ', scan returned ' + (seesCust ? seesCust.kind : 'nothing'));

  /* the {name} task filler must never address one */
  const names = [];
  const rt = S.renderTasks;
  S.renderTasks = function () { return rt.apply(null, arguments); };
  for (let i = 0; i < 60; i++) { try { S.addTask({ via: 'coffee', label: 'Bring a coffee to {name}' }); } catch (e) {} }
  (g.tasks || []).forEach(t => { if (t.target) names.push(t.target); });
  S.renderTasks = rt;
  const custNames = new Set(g.NPCS.filter(n => n.customer).map(n => n.name));
  ck('  ^ and no task is ever addressed to one', names.every(nm => !custNames.has(nm) && !/^Shopper /.test(nm)),
     names.length ? [...new Set(names)].slice(0, 3).join(', ') : 'no {name} tasks landed');

  /* prank / gossip / leverage all key off isWorker, which is the single guard — assert the
     NEGATIVE directly rather than trusting the chain */
  ck('  ^ and they are not a worker, which is what every one of those verbs asks',
     g.NPCS.filter(n => n.customer).every(n => !S.isWorker(n)),
     g.NPCS.filter(n => n.customer && S.isWorker(n)).length + ' shoppers passing isWorker');
}

/* ---- 4b. THE DAY ROLL DOES NOT SEND SHOPPERS HOME ---------------------------------------
   ⚠️ ISOLATED, BECAUSE A SECOND GUARD MASKS IT. assembleAtElevator parks the whole cast off-map
   at every day roll, and it used to park customers too — six of them ended up permanently
   "leaving", holding the spawner's slots, and THE SHOP SILENTLY STOPPED FILLING AFTER DAY 2.
   tickCustomers now also reaps anything that ends up gone, which fixes the symptom either way, so
   a mutant that removes the FIRST guard survives every downstream assertion. This one watches the
   sweep itself: nobody who is a customer may come out of a day roll marked gone. */
{
  const w = mk(), S = w.sandbox, g = w.g;
  w.run(9000, { ignoreGameOver: true });
  const before = g.NPCS.filter(n => n.customer).length;
  ck('there are shoppers on the floor when the day rolls', before > 0, before + ' present');
  let parked = 0;
  const watch = () => { for (const n of NPCS_of(g)) if (n.customer && (n.gone || n.x < 0)) parked++; };
  function NPCS_of(gg) { return gg.NPCS; }
  /* call the sweep the day roll calls, then look before the reap can tidy up after it */
  try { S.assembleAtElevator(); } catch (e) {}
  watch();
  ck('  ^ and the staff sweep leaves every one of them alone', parked === 0,
     parked + ' shopper(s) parked off-map by the sweep');
  /* and the staff it IS for were still swept, or the guard is a delete */
  const staffParked = g.NPCS.filter(n => !n.customer && n.gone).length;
  ck('  ^ while the staff it is for were swept as usual', staffParked > 0,
     staffParked + ' staff parked, as the morning stagger intends');
}

/* ---- 5. NOBODY DEADLOCKS IN AN AISLE ----------------------------------------------------
   Aisles are 2.90 nav cells and bodies block each other. Twelve staff plus shoppers in the same
   aisles is the worst case this world has had. */
{
  const w = mk(), S = w.sandbox, g = w.g;
  w.run(9000, { ignoreGameOver: true });
  const seen = {}, stuckFor = {};
  let samples = 0, worst = 0, worstWho = '';
  for (let f = 0; f < 60000; f += 300) {
    w.run(300, { ignoreGameOver: true });
    samples++;
    for (const n of g.NPCS) {
      if (!n.alive || n.gone || n.wentHome) continue;
      const key = n.name;
      const at = Math.round(n.x) + ',' + Math.round(n.y);
      if (seen[key] === at) { stuckFor[key] = (stuckFor[key] || 0) + 1; }
      else { stuckFor[key] = 0; }
      seen[key] = at;
      if ((stuckFor[key] || 0) > worst) { worst = stuckFor[key]; worstWho = key; }
    }
  }
  /* a stationary sample or two is normal — dwelling, break, a desk. A body that has not moved a
     pixel for a quarter of the run is wedged. */
  ck('nobody is wedged in place across a full soak', worst < samples * 0.25,
     'longest stationary streak: ' + worstWho + ' for ' + worst + '/' + samples + ' samples');
  ck('  ^ and the shop is still full at the end of it', S.customersOnFloor() > 0,
     S.customersOnFloor() + ' shoppers still moving through');

  /* ⚠️ AND THEY STAY ON THE SHOP FLOOR. Nothing asserted this, so the mutant that let them wander
     into the back of house survived — which is exactly where the first version sent them, to the
     baler and the staff coffee machine, through the one-gap corridor where they jammed. */
  const backOfHouse = {};
  for (let f = 0; f < 30000; f += 200) {
    w.run(200, { ignoreGameOver: true });
    for (const n of g.NPCS) {
      if (!n.customer || !n.alive) continue;
      let r = null; try { r = S.roomAt(n.x, n.y); } catch (e) {}
      if (r && /RECEIVING|BREAK ROOM|STORE MANAGER|OWNER|STAFF WC/.test(r.name))
        backOfHouse[r.name] = (backOfHouse[r.name] || 0) + 1;
    }
  }
  ck('  ^ and none of them ever gets into the back of house',
     Object.keys(backOfHouse).length === 0,
     Object.keys(backOfHouse).length ? JSON.stringify(backOfHouse) : '150 samples, nobody behind the swing doors');
}

/* ---- 6. CUSTOMERS ARE NOT SAVED --------------------------------------------------------- */
{
  const w = mk(), S = w.sandbox, g = w.g;
  w.run(20000, { ignoreGameOver: true });
  ck('there are shoppers to leave out of the save', S.customersOnFloor() > 0, S.customersOnFloor() + ' present');
  const snap = w.rawSave().buildSnapshot(false, null);
  const savedCust = (snap.npcs || []).filter(x => /^Shopper /.test(x.name) || x.customer);
  ck('  ^ and none of them is written to the save', savedCust.length === 0,
     savedCust.length + ' of ' + (snap.npcs || []).length + ' saved npcs are shoppers');

  /* loading must not resurrect them, and must not wipe the live ones either */
  const f = mk(), FS = f.sandbox, fg = f.g;
  f.run(20000, { ignoreGameOver: true });
  const before = FS.customersOnFloor();
  let applied = null;
  try { applied = f.rawSave().applySnapshot(JSON.parse(JSON.stringify(snap))); } catch (e) { applied = 'threw ' + e; }
  ck('  ^ and a load does not resurrect them', applied === true && fg.NPCS.filter(n => n.customer && !n.alive).length === 0,
     'applied=' + applied + ', ' + fg.NPCS.filter(n => n.customer).length + ' shoppers after (was ' + before + ')');
  f.run(9000, { ignoreGameOver: true });
  ck('  ^ and the shop fills up again by itself afterwards', FS.customersOnFloor() > 0,
     FS.customersOnFloor() + ' shoppers back on the floor');
}

/* ---- 7. THE OFFICE HAS NO CUSTOMERS AT ALL ---------------------------------------------- */
{
  const o = createWorld(), OS = o.sandbox, og = o.g;
  const before = og.NPCS.length;
  const st = o.run(40000, { ignoreGameOver: true });
  ck('the office never spawns a shopper', og.NPCS.filter(n => n.customer).length === 0 &&
     OS.customersOnFloor() === 0, og.NPCS.filter(n => n.customer).length + ' customers in the office');
  ck('  ^ and its population is unchanged', og.NPCS.length === before,
     before + ' -> ' + og.NPCS.length);
  ck('  ^ and it still soaks clean', st.throws === 0 && og.renderErrs === 0,
     'throws ' + st.throws + ', renderErrs ' + og.renderErrs +
     (st.firstThrow ? '\n     ' + String(st.firstThrow).split('\n').slice(0, 2).join(' | ') : ''));
}

console.log('customers: ' + pass + ' pass, ' + fail + ' fail');
console.log(fail ? 'GROCERY CUSTOMERS: RED ❌' : 'GROCERY CUSTOMERS: GREEN ✅ (they come in, they leave, they are nobody)');
process.exit(fail ? 1 : 0);
