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

  const ok =
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
  console.log('---------------------------------------------------');
  console.log(ok ? 'RESULT: GREEN ✅  (save round-trip clean)' : 'RESULT: RED ❌  (see above)');
  console.log('===================================================');

  process.exit(ok ? 0 : 1);
}

main();
