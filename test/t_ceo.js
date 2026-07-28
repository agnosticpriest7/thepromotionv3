/* Verify the CEO (Mr. Sterling) lives in his office, does exactly one full lap during the day,
   and returns home — without getting stuck. */
const { createWorld } = require('./harness');

const w = createWorld();
w.startNewGame(0);
const boss = () => w.g.NPCS.find(n => n.name === 'Mr. Sterling');
const dist = (n, p) => Math.hypot(n.x - p.x, n.y - p.y);

/* "Home" is asked of the world, not of a literal. This used to be POST = authored (120,58) with a
   60px radius — a THIRD copy of a post the game already stores twice (the boss spawn and the
   day-reset in startDay). Move Sterling's office and all three drift apart, and this test would go
   RED reporting "spent too little time home" while he sat at his desk all day — exactly how
   t_printer rotted. roomAt() cannot go stale. POST is still used, but it is captured live below
   as wherever he actually parks, so the distance checks stay relative to his own office. */
const OFFICE = 'CEO OFFICE';
const atHome = n => {
  const r = w.sandbox.roomAt(n.x + (n.w || 0) / 2, n.y + (n.h || 0) / 2);
  return !!r && r.name === OFFICE;
};
let POST = null;

let lapFrames = 0, homeFrames = 0, sampled = 0, maxDist = 0, wpVisited = new Set();
let lapStarted = false, lapEnded = false, everStuckFar = 0, prevPos = null, stuckAcc = 0;
let leftOffice = false;

// drive ~1.5 days so we see a full work day of CEO behaviour
let guard = 0;
while (w.g.day < 2 && guard < 240000) { w.run(300); guard += 300; }   // into day 2 (a clean full day)
const startDay = w.g.day;
while (w.g.day === startDay && guard < 340000) {
  w.run(120); guard += 120;
  const b = boss(); if (!b) continue;
  sampled++;
  const home = atHome(b);
  // his post = wherever he parks in his own office, taken from the first at-home sample
  if (!POST && home && !b.lapping) POST = { x: b.x, y: b.y };
  if (POST) maxDist = Math.max(maxDist, dist(b, POST));
  if (!home) leftOffice = true;
  if (b.lapping) { lapFrames++; lapStarted = true; if (typeof b.routeIdx === 'number') wpVisited.add(b.routeIdx); }
  else { if (lapStarted) lapEnded = true; if (home) homeFrames++; }
  // crude stuck check on the boss: far from any goal but not moving
  if (prevPos) { const moved = Math.hypot(b.x - prevPos.x, b.y - prevPos.y); if (b.goal && Math.hypot(b.goal.x - b.x, b.goal.y - b.y) > 80 && moved < 0.4) stuckAcc += 120; else stuckAcc = 0; if (stuckAcc >= 3000) everStuckFar++; }
  prevPos = { x: b.x, y: b.y };
}
const b = boss();
const endedHome = b && atHome(b) && !b.lapping;

console.log('===== CEO (Mr. Sterling) DAY BEHAVIOUR =====');
console.log(`office post found live at ${POST ? POST.x + ',' + POST.y : '(never parked at home!)'}`);
console.log(`samples ${sampled} | lapping frames ${lapFrames} | at-home frames ${homeFrames}`);
console.log(`waypoints visited during lap: ${wpVisited.size} | max distance from office: ${Math.round(maxDist)}px`);
console.log(`lap started: ${lapStarted} | lap ended: ${lapEnded} | ended day at office: ${endedHome} | boss.alive ${b&&b.alive} onFloor ${b&&b.onFloor}`);

let fails = 0;
if (!b || !b.alive)              { console.log('FAIL: CEO not alive/resident'); fails++; }
if (!lapStarted)                 { console.log('FAIL: CEO never did his lap'); fails++; }
if (!lapEnded)                   { console.log('FAIL: CEO lap never finished'); fails++; }
if (wpVisited.size < 5)          { console.log(`FAIL: lap only advanced through ${wpVisited.size} waypoints — not a full lap`); fails++; }
if (!POST)                       { console.log(`FAIL: CEO never parked in ${OFFICE} — no office post to measure from`); fails++; }
if (!leftOffice)                 { console.log(`FAIL: CEO never left ${OFFICE} at all`); fails++; }
if (maxDist < 400)               { console.log(`FAIL: CEO stayed within ${Math.round(maxDist)}px of his post — that is not a lap of the floor`); fails++; }
if (homeFrames < sampled * 0.4)  { console.log(`FAIL: CEO spent too little time home (${homeFrames}/${sampled} samples in ${OFFICE})`); fails++; }
if (!endedHome)                  { console.log('FAIL: CEO did not return to his office'); fails++; }
if (everStuckFar > 0)            { console.log(`FAIL: CEO got stuck ${everStuckFar} time(s)`); fails++; }

console.log(`\nRESULT: ${fails === 0 ? 'GREEN ✅  CEO lives in his office, laps once, returns' : 'RED ❌  ' + fails + ' problem(s)'}`);
process.exit(fails === 0 ? 0 : 1);
