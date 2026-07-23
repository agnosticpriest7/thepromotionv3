/* Verify the CEO (Mr. Sterling) lives in his office, does exactly one full lap during the day,
   and returns home — without getting stuck. */
const { createWorld } = require('./harness');

const w = createWorld();
w.startNewGame(0);
const S = 1.8;
const POST = { x: Math.round(120 * S), y: Math.round(58 * S) };
const boss = () => w.g.NPCS.find(n => n.name === 'Mr. Sterling');
const dist = (n, p) => Math.hypot(n.x - p.x, n.y - p.y);

let lapFrames = 0, homeFrames = 0, sampled = 0, maxDist = 0, wpVisited = new Set();
let lapStarted = false, lapEnded = false, everStuckFar = 0, prevPos = null, stuckAcc = 0;

// drive ~1.5 days so we see a full work day of CEO behaviour
let guard = 0;
while (w.g.day < 2 && guard < 240000) { w.run(300); guard += 300; }   // into day 2 (a clean full day)
const startDay = w.g.day;
while (w.g.day === startDay && guard < 340000) {
  w.run(120); guard += 120;
  const b = boss(); if (!b) continue;
  sampled++;
  const d = dist(b, POST);
  maxDist = Math.max(maxDist, d);
  if (b.lapping) { lapFrames++; lapStarted = true; if (typeof b.routeIdx === 'number') wpVisited.add(b.routeIdx); }
  else { if (lapStarted) lapEnded = true; if (d < 60) homeFrames++; }
  // crude stuck check on the boss: far from any goal but not moving
  if (prevPos) { const moved = Math.hypot(b.x - prevPos.x, b.y - prevPos.y); if (b.goal && Math.hypot(b.goal.x - b.x, b.goal.y - b.y) > 80 && moved < 0.4) stuckAcc += 120; else stuckAcc = 0; if (stuckAcc >= 3000) everStuckFar++; }
  prevPos = { x: b.x, y: b.y };
}
const b = boss();
const endedHome = b && dist(b, POST) < 80 && !b.lapping;

console.log('===== CEO (Mr. Sterling) DAY BEHAVIOUR =====');
console.log(`samples ${sampled} | lapping frames ${lapFrames} | at-home frames ${homeFrames}`);
console.log(`waypoints visited during lap: ${wpVisited.size} | max distance from office: ${Math.round(maxDist)}px`);
console.log(`lap started: ${lapStarted} | lap ended: ${lapEnded} | ended day at office: ${endedHome} | boss.alive ${b&&b.alive} onFloor ${b&&b.onFloor}`);

let fails = 0;
if (!b || !b.alive)              { console.log('FAIL: CEO not alive/resident'); fails++; }
if (!lapStarted)                 { console.log('FAIL: CEO never did his lap'); fails++; }
if (!lapEnded)                   { console.log('FAIL: CEO lap never finished'); fails++; }
if (wpVisited.size < 5)          { console.log(`FAIL: lap only advanced through ${wpVisited.size} waypoints — not a full lap`); fails++; }
if (maxDist < 400)               { console.log(`FAIL: CEO never left the office area (max ${Math.round(maxDist)}px)`); fails++; }
if (homeFrames < sampled * 0.4)  { console.log(`FAIL: CEO spent too little time home (${homeFrames}/${sampled})`); fails++; }
if (!endedHome)                  { console.log('FAIL: CEO did not return to his office'); fails++; }
if (everStuckFar > 0)            { console.log(`FAIL: CEO got stuck ${everStuckFar} time(s)`); fails++; }

console.log(`\nRESULT: ${fails === 0 ? 'GREEN ✅  CEO lives in his office, laps once, returns' : 'RED ❌  ' + fails + ' problem(s)'}`);
process.exit(fails === 0 ? 0 : 1);
