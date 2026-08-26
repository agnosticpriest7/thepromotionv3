/* GROCERY SOAK — five in-game days in a world that is not the office.

   WHY THIS EXISTS. assembleAtElevator() was found by inspection, not by a test, and the dangerous
   part was never the office coordinate — it was WHEN it fires: at boot and at every day roll.
   Office code runs on the clock and grocery inherits all of it. t_regress cannot help; it builds
   the office default.

   ⚠️ THIS SOAK USED TO BE NEARLY FREE AND NEARLY MEANINGLESS: grocery had no NPCs, so there was
   nobody to path, nobody to seat and no meltdown to roll, and a run survived because nothing
   happened. Save-Rite has a crew now, so the run does real work — but the assertions below are
   still the ones that matter, because they check that the day cycle ACTUALLY RAN (days advanced,
   phases changed, autosaves were written) and they check the player's POSITION, not merely that
   nothing threw. assembleAtElevator never threw; it moved the player to an office coordinate. A
   throw counter would have missed it completely. Who the crew are and where they stand is
   t_grocery_crew's job.

   Numbers are printed so a real soak can be told apart from an idle one. */
'use strict';
const { createWorld } = require('./harness');

let pass = 0, fail = 0;
const ck = (n, c, d) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${d ? '   ' + d : ''}`); c ? pass++ : fail++; };

const FRAMES = 150000;          // the office baseline duration (t_regress), ~5 in-game days
const CHUNK = 300;              // a phase is ~3000 frames, so this cannot miss a transition

/* The level is chosen before the world is built — loadLevel() runs ahead of scaleWorld() — so it
   has to be seeded into the boot handoff. promo:newgame is what puts boot into PLAY rather than
   parking on the title screen with the clock stopped, which is the difference between a soak and
   an idle. */
const w = createWorld({ storage: { 'promo:level': 'grocery', 'promo:newgame': '0', 'promo:char': '0' } });
const S = w.sandbox, g = w.g, sv = w.rawSave();

/* This asserted "a cast of nobody" through the empty-room and fixtures branches and went correctly
   RED when the crew arrived. What it is really guarding is that the SOAK WORLD IS POPULATED — a
   soak of an empty shop proves almost nothing, which is the warning at the top of this file — so it
   now asserts the opposite of what it used to and means the same thing. */
ck('the soak world is grocery, and it has a crew to soak', g.NPCS.length > 0 &&
   g.desks.filter(d => d.owner === 'you').length === 1 &&
   g.desks.filter(d => d.owner && d.owner !== 'you').length === g.NPCS.length,
   g.NPCS.length + ' NPCs, ' + g.desks.length + ' desks (' +
   g.desks.filter(d => d.owner === 'you').length + ' yours, ' +
   g.desks.filter(d => d.station).length + ' stations)');

/* count autosaves by wrapping the Store method the game really calls, not by inferring */
let saves = 0, lastSaved = null;
const realSave = sv.Store.save.bind(sv.Store);
sv.Store.save = (slot, o) => { saves++; lastSaved = o; return realSave(slot, o); };

/* WHERE THE LEVEL PUT THEM — asked of the level, not guessed at. The first version derived "the
   middle of the world", which was true of one empty room and went red the moment the floor plan
   gave the store an entrance to spawn beside. Capturing the player's position instead is worse
   still: assembleAtElevator fires at BOOT as well as at every day roll, so a captured spawn
   already has the office coordinate baked in and the drift from it is zero. */
const spawn = S.levelSpawnPoint();
let phaseChanges = 0, prevPhase = S.currentPhase().name;
const phasesSeen = {};
let worstAway = 0;

const st0 = { throws: 0 };
for (let i = 0; i < FRAMES / CHUNK; i++) {
  const st = w.run(CHUNK, { ignoreGameOver: true });
  st0.throws += st.throws;
  const ph = S.currentPhase().name;
  phasesSeen[ph] = true;
  if (ph !== prevPhase) { phaseChanges++; prevPhase = ph; }
  const d = Math.hypot(g.player.x - spawn.x, g.player.y - spawn.y);
  if (d > worstAway) worstAway = d;
}

const days = g.day;
const distinct = Object.keys(phasesSeen);

console.log('\n  ---- the numbers ----');
console.log('  days elapsed      : ' + days);
console.log('  phase changes     : ' + phaseChanges);
console.log('  distinct phases   : ' + distinct.length + '  (' + distinct.join(', ') + ')');
console.log('  autosaves written : ' + saves);
console.log('  render errors     : ' + g.renderErrs);
console.log('  throws            : ' + st0.throws);
console.log('  player worst-away : ' + Math.round(worstAway) + 'px from the level spawn (' + spawn.x + ',' + spawn.y + ')');
console.log('  ---------------------\n');

/* ---- 1. THE CYCLE ACTUALLY RAN. Without these the rest of the file is theatre. --------- */
ck('the day counter advanced past day 1', days >= 5, days + ' days');
ck('phase changes fired', phaseChanges >= 30, phaseChanges + ' transitions');
ck('  ^ across more than one distinct phase', distinct.length >= 5, distinct.length + ' distinct');
ck('autosave wrote at the day boundary', saves >= 4, saves + ' writes');

/* ---- 2. what it wrote is a GROCERY save and loads back as one -------------------------- */
ck('the last autosave is a grocery save', !!lastSaved && lastSaved.level === 'grocery',
   'level=' + (lastSaved && lastSaved.level));
ck('  ^ and it carried the days with it', !!lastSaved && lastSaved.meta.day >= 5,
   'day=' + (lastSaved && lastSaved.meta.day));
{
  const back = sv.Store.load(0);
  ck('  ^ and it loads back', !!back && sv.applySnapshot(back) === true);
  ck('  ^ still as grocery', sv.buildSnapshot(false, null).level === 'grocery');
}

/* ---- 3. THE POSITION ASSERTION — the one assembleAtElevator has to fail -----------------
   NOT "is the player inside the room": the room IS the world here, so that is trivially true and
   the first version of this assertion passed happily with the player standing on the office
   elevator. It has to be "is the player where THIS LEVEL put them", compared against a spawn
   derived from the live world. A throw counter cannot see this bug class at all, and neither can
   a drift check, because the overwrite fires at boot before any drift can be measured. */
{
  const p = g.player, tol = Math.round(20 * 1.8) * 2;   // two nav cells of slack
  ck('the player position is finite', isFinite(p.x) && isFinite(p.y),
     Math.round(p.x) + ',' + Math.round(p.y));
  const away = Math.hypot(p.x - spawn.x, p.y - spawn.y);
  ck('the player is still where the LEVEL spawned them, 5 days on', away <= tol,
     Math.round(away) + 'px away (tolerance ' + tol + ') — at ' + Math.round(p.x) + ',' + Math.round(p.y) +
     ', level spawn ' + spawn.x + ',' + spawn.y);
  ck('  ^ and never wandered during the run', worstAway <= tol, Math.round(worstAway) + 'px worst');
}

/* ---- 4. and nothing broke while doing it ---------------------------------------------- */
ck('no render errors', g.renderErrs === 0, String(g.renderErrs));
ck('no throws', st0.throws === 0, String(st0.throws));

console.log(`grocery soak: ${pass} pass, ${fail} fail`);
console.log(fail ? 'GROCERY SOAK: RED ❌' : 'GROCERY SOAK: GREEN ✅ (5 days rolled in a non-office world)');
process.exit(fail ? 1 : 0);
