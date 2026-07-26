/* Merit streak is judged on the all-day AVERAGE (healthToday), not the empty-floor 5pm instant
   (branchHealth). Before this fix scoreTheDay()'s merit path read branchHealth() directly — which
   reads ~0 once the floor clears out at 5pm — so a genuinely good day (high average) could never
   advance the streak, while the paths panel showed the player that (higher) average.

   `today` (the sample accumulator behind healthToday) is a module-local, so we can't seed it from
   the harness. Instead we stub healthToday and branchHealth to two DIFFERENT known values and let
   scoreTheDay pick — the value it scores on tells us which function the merit path calls. */
const { createWorld } = require('./harness');
const w = createWorld(); w.startNewGame(0); w.run(3000);
const S = w.sandbox, G = w.g;
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };

const P = G.player, C = G.career;
P.rank = 5; C.ceoDone = false; C.goodDays = 0;   // MANAGER — the merit path

const origHT = S.healthToday, origBH = S.branchHealth;
// The 5pm floor is empty, so the instantaneous reading is 0; the all-day average was a good day.
S.branchHealth = () => 0;   // what the merit path used to (wrongly) read
S.healthToday = () => 95;   // the day AVERAGE (>= MERIT_TARGET 80)

// sanity: the override reaches scoreTheDay's internal call (global function-decl rebinding)
ck('setup: healthToday()=95 (good day), branchHealth()=0 (empty 5pm floor)', S.healthToday() === 95 && S.branchHealth() === 0);

const scored = S.scoreTheDay();
ck('merit day is scored on the AVERAGE (95), not the 5pm instant (0) — a burst does not count', scored === 95, `scored=${scored}`);
ck('a single day in order marks the day good (would stay 0 if judged on the 0 instant)', C.goodDays === 1, 'goodDays=' + C.goodDays);
ck('ONE day at the target now sets meritReady (was: 3-day streak)', C.meritReady === true);

// a BAD day by the average resets the streak (also driven by the average, not the instant)
C.goodDays = 2;
S.healthToday = () => 30;   // average below target; instant still 0
const scored2 = S.scoreTheDay();
ck('bad day by the average resets the streak', scored2 === 30 && C.goodDays === 0, `scored2=${scored2} goodDays=${C.goodDays}`);

S.healthToday = origHT; S.branchHealth = origBH;   // restore

console.log(`\nMERIT SCORING: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
