/* BUGFIX: on promotion to ASSISTANT MANAGER (rank 4) the player was never moved to a desk —
   youTier() lumped rank 4 with SENIOR SALES (both tier 2), so movePlayerDesk() thought you were
   already in the right room. The ASST. MANAGER room's desk (authored reserved) is now the player's
   office at rank 4, claimed via claimAsstOffice() (mirrors claimManagerOffice), with youTier()=-1
   so the seat counter no longer thinks you occupy a senior chair. Tests the move, the vacated
   chair, seat-model consistency, and a save round-trip. */
const { createWorld } = require('./harness');
const w = createWorld({ seed: 7 }); w.startNewGame(0); w.run(3000);
const S = w.sandbox, G = w.g;
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };

// the asst office desk exists, starts empty + reserved (off the seat market)
const asstDesk = G.desks.find(d => d.asstOffice);
ck('the ASST. MANAGER office desk exists', !!asstDesk);
ck('it starts empty and reserved', !!asstDesk && asstDesk.reserved === true && !asstDesk.owner);

// youTier: rank 4 is its own thing; 3 and 5 unchanged
G.player.rank = 4; ck('youTier(rank 4) = -1 (not a senior chair)', S.youTier() === -1);
G.player.rank = 3; ck('youTier(rank 3) = 2 (senior)', S.youTier() === 2);
G.player.rank = 5; ck('youTier(rank 5) = 2 (manager, unchanged)', S.youTier() === 2);

// THE FIX: promoting to ASSISTANT MANAGER seats the player in the office
G.player.rank = 3; G.player.prog = 100; S.movePlayerDesk();
const seniorDesk = G.desks.find(d => d.owner === 'you');
ck('player is seated in a senior desk at rank 3', !!seniorDesk && (seniorDesk.tier | 0) === 2);
G.career.daleFavor = 2;                        // satisfy the ASSISTANT MANAGER gate
S.tryPromote();
ck('tryPromote advanced to ASSISTANT MANAGER (rank 4)', G.player.rank === 4, 'rank=' + G.player.rank);
ck('the promotion seated the player in the asst office (THE BUG FIX)', asstDesk.owner === 'you');
ck('myDesk() now returns the asst office', S.myDesk && S.myDesk() === asstDesk);
ck('the player left the senior desk', seniorDesk.owner !== 'you');
ck('the vacated senior chair is handled (retired or backfilled)', seniorDesk.retired === true || G.pendingHires.some(h => h.desk === seniorDesk));
ck('the asst office stays reserved (no hire/promotion will fill it)', asstDesk.reserved === true);

// a promotion into the office survives a save round-trip
{
  const save = w.rawSave(); const snap = save.buildSnapshot(false, null);
  asstDesk.owner = null;                        // clobber, then restore
  save.applySnapshot(snap);
  const back = G.desks.find(d => d.asstOffice);
  ck('the asst-office occupancy survives a save round-trip', !!back && back.owner === 'you' && G.player.rank === 4, 'owner=' + (back && back.owner));
}

// seat/desk/rank agreement holds while the player sits as ASSISTANT MANAGER
{
  G.player.rank = 4;
  const before = w.stats.seatViolations;
  w.run(95000, { onDay: () => { G.player.rank = 4; } });
  ck('seat/desk/rank agreement holds at ASSISTANT MANAGER', w.stats.seatViolations === before, w.stats.firstSeatViolation || '');
  ck('run stayed alive', G.gameOver === false);
}

// 4 -> 5: taking the manager office releases the asst office back to reserved
{
  G.player.rank = 4;
  if (asstDesk.owner !== 'you') { asstDesk.owner = 'you'; }   // ensure we're in it
  S.claimManagerOffice();
  const mgr = G.desks.find(d => d.mgrOffice);
  ck('becoming MANAGER takes the corner office', mgr && mgr.owner === 'you');
  ck('the asst office is released (empty, still reserved)', asstDesk.owner !== 'you' && asstDesk.reserved === true);
}

console.log(`\nASSISTANT MANAGER DESK: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
