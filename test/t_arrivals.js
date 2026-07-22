/* Verify staggered morning arrivals (day 2+): NPCs file in over ~8:00-8:17, not all at once,
   and everyone has materialised (on-screen, not gone) by the time Clock-In ends. */
const { createWorld } = require('./harness');

const w = createWorld();
w.startNewGame(0);

const roster = () => w.g.NPCS.filter(n => n.alive && !n.boss && !n.mgr && !n.receptionist);

// drive to the start of day 2
let guard = 0;
while (w.g.day < 2 && guard < 240000) { w.run(500); guard += 500; }
if (w.g.day < 2) { console.log('RED ❌  never reached day 2'); process.exit(1); }

// snapshot right at day-2 start (assembleAtElevator has just run inside nextDay)
const r0 = roster();
const total = r0.length;
const pendingStart = r0.filter(n => n.arrived === false).length;
const presentStart = r0.filter(n => !n.gone).length;
const clock0 = w.g.clock;

console.log('===== STAGGERED ARRIVALS (day 2) =====');
console.log(`at day-2 start (clock ${(clock0/60).toFixed(2)}h): ${total} workers, ${pendingStart} still commuting, ${presentStart} already on-floor`);

// step through the morning in small chunks, watch the on-floor count climb
let prevPresent = presentStart, climbs = 0;
while (w.g.clock < 8 * 60 + 25 && guard < 300000) {
  w.run(150); guard += 150;
  const present = roster().filter(n => !n.gone).length;
  if (present > prevPresent) climbs++;
  prevPresent = present;
}

const r1 = roster();
const stillPending = r1.filter(n => n.arrived === false).length;
const gone = r1.filter(n => n.gone).length;
const offscreen = r1.filter(n => !n.gone && (n.x < 0 || n.y < 0)).length;
console.log(`after 8:25: ${r1.length - gone}/${r1.length} on-floor, stillPending=${stillPending}, offscreen=${offscreen}, arrival-steps observed=${climbs}`);

let fails = 0;
if (pendingStart === 0)             { console.log('FAIL: nobody was staggered at day-2 start (expected most workers pending)'); fails++; }
if (pendingStart < total * 0.5)     { console.log(`FAIL: only ${pendingStart}/${total} pending at start — arrivals not really staggered`); fails++; }
if (climbs < 2)                     { console.log(`FAIL: on-floor count only climbed ${climbs} time(s) — not a staggered trickle`); fails++; }
if (stillPending !== 0)             { console.log(`FAIL: ${stillPending} worker(s) never arrived by 8:25`); fails++; }
if (gone !== 0)                     { console.log(`FAIL: ${gone} worker(s) still off the floor after 8:25`); fails++; }
if (offscreen !== 0)               { console.log(`FAIL: ${offscreen} worker(s) present but stuck off-screen`); fails++; }

console.log(`\nRESULT: ${fails === 0 ? 'GREEN ✅  workers trickle in over the morning and are all present by 8:25' : 'RED ❌  ' + fails + ' problem(s)'}`);
process.exit(fails === 0 ? 0 : 1);
