/* ============================================================================
   SAVE ROUND-TRIP — build a snapshot, run a while, save/load, confirm the
   world restores cleanly and keeps ticking without throws.
   (HANDOFF-2: after each change run regression + this.)

   Usage:  node test/t_menu_load.js
   ============================================================================ */
'use strict';
const { createWorld } = require('./harness');

function main() {
  const w = createWorld();
  w.startNewGame(0);
  // warm the world for a couple of in-game days so there's real state to save
  w.run(60000, { ignoreGameOver: true });

  const save = w.rawSave();
  const snap = save.buildSnapshot(false, null);
  const jsonOk = (() => { try { JSON.parse(JSON.stringify(snap)); return true; } catch (_) { return false; } })();

  const beforeDay = w.g.day;
  const beforeNpc = (w.g.NPCS || []).length;

  // round-trip through the Store the way the menu does
  save.slot = 0;
  save.Store.save(0, snap);
  const loaded = save.Store.load(0);
  const applied = save.applySnapshot(loaded);

  // keep running after the restore — a corrupt restore usually throws within a day
  const s2 = w.run(30000, { ignoreGameOver: true });

  const afterDay = w.g.day;
  const afterNpc = (w.g.NPCS || []).length;

  /* ================= LEVEL SELECT =================================================
     Added with the level-select branch. This is the test that most directly covers it,
     because the whole risk of the change is in the save.

     Asserts BEHAVIOUR through the real menu and the real Store, never a coordinate and
     never a private variable: `currentLevel` is a module `let` and unreachable from the
     sandbox, so the level a run is in is observed the only way that actually matters —
     by what lands in a snapshot. */
  const S = w.sandbox, doc = S.document;
  let lp = 0, lf = 0;
  const lck = (n, c, d) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${d ? '   ' + d : ''}`); c ? lp++ : lf++; };
  /* renderMenuDOM early-returns unless screen==='menu', and we are mid-play after the round-trip
     above — so put the game back on the menu first. goToMenu() is the game's own transition. */
  /* The menu builds itself with createElement + appendChild, so the rendered text lives on the
     CHILDREN, not on the container's innerHTML (which is only ever cleared to ''). renderPaths
     assigns a string and can be read directly; this one cannot. */
  const menuHTML = () => { S.renderMenuDOM(); const el = doc.getElementById('menuList');
    return el ? (el.children || []).map(c => c.innerHTML || '').join(' | ') : ''; };
  S.goToMenu();

  console.log('\n-- LEVEL SELECT');

  // 1. both levels are offered, and the unbuilt one is honest about it
  S.goToLevelPick(0);
  const lvHTML = menuHTML();
  lck('level pick offers both levels',
      /Paper Supply Co\./.test(lvHTML) && /Save-Rite/.test(lvHTML), 'office + grocery listed');
  lck('the unbuilt level is labelled', /not built yet/i.test(lvHTML));

  // 2. choosing the unbuilt level EXPLAINS ITSELF and does not boot a world
  S.goToLevelPick(0); menuHTML();
  S.menuMove(1); S.menuActivate();
  const stubHTML = menuHTML();
  lck('grocery shows a not-built notice', /is not built yet/i.test(stubHTML));
  lck('  ^ and offers a way back rather than starting', /Back to levels/i.test(stubHTML));

  /* 3. picking a level and starting carries it through the New Game handoff.
        Clear the flag first: startNewGame() at the top of this file has already been through
        startGame(0,true) once, so without this the assertion passes on a stale value and proves
        nothing about the menu path it claims to test. */
  try { S.localStorage.removeItem('promo:level'); } catch (e) {}
  S.goToMenu(); S.goToLevelPick(0); menuHTML();
  S.menuActivate();                    // row 0 = the office
  const charHTML = menuHTML();
  lck('choosing a built level advances to character select', /The Intern/i.test(charHTML));
  S.menuActivate();                    // row 0 = the default face
  let flag = null; try { flag = S.localStorage.getItem('promo:level'); } catch (e) {}
  lck('the chosen level rides the reload handoff', flag === 'office', 'promo:level=' + flag);

  // 4. a save records its level and round-trips through Store
  const lvlSnap = save.buildSnapshot(false, null);
  lck('snapshot records the level', lvlSnap.level === 'office', 'level=' + lvlSnap.level);
  save.Store.save(1, lvlSnap);
  lck('Store.list surfaces it for the slot row', (save.Store.list()[1] || {}).level === 'office');

  /* 5. THE COMPATIBILITY CASE — the one that protects Stacie's live playtest saves.
        A save written before level select has no `level` at all, and it can only ever have
        been the office, because that is the only level that existed when it was written. */
  const legacy = JSON.parse(JSON.stringify(lvlSnap));
  delete legacy.level; delete legacy.meta.level;
  save.Store.save(2, legacy);
  const legacyApplied = save.applySnapshot(save.Store.load(2));
  lck('a save with NO level field still loads', legacyApplied === true);
  lck('  ^ and resolves to the office', save.buildSnapshot(false, null).level === 'office');
  lck('  ^ and its slot row reads office too', (save.Store.list()[2] || {}).level === 'office');

  console.log(`  level select: ${lp} pass, ${lf} fail`);
  save.Store.clear(1); save.Store.clear(2);

  const ok =
    lf === 0 &&
    jsonOk && applied === true &&
    s2.throws === 0 && s2.nonFinite === 0 && s2.nonFiniteEntities === 0 &&
    s2.seatViolations === 0 &&
    Number.isFinite(afterDay) && afterNpc > 0;

  console.log('\n============== SAVE ROUND-TRIP RESULT ==============');
  console.log(`snapshot JSON-serialisable : ${jsonOk}`);
  console.log(`applySnapshot() returned   : ${applied}`);
  console.log(`day  before/after restore  : ${beforeDay} -> ${afterDay}`);
  console.log(`NPCs before/after restore  : ${beforeNpc} -> ${afterNpc}`);
  console.log(`post-restore throws        : ${s2.throws}${s2.firstThrow ? '\n   ' + String(s2.firstThrow).split('\n')[0] : ''}`);
  console.log(`post-restore non-finite    : ${s2.nonFinite + s2.nonFiniteEntities}`);
  console.log(`post-restore seat viols    : ${s2.seatViolations}${s2.firstSeatViolation ? '\n   ' + s2.firstSeatViolation : ''}`);
  console.log(`level-select assertions    : ${lp} pass, ${lf} fail`);
  console.log('---------------------------------------------------');
  console.log(ok ? 'RESULT: GREEN ✅  (save round-trip clean)' : 'RESULT: RED ❌  (see above)');
  console.log('===================================================');

  process.exit(ok ? 0 : 1);
}

main();
