/* SIGHTLINES — a prototype, expected to be thrown away.

   An office is cubicles and corners; you can be unobserved. A shop floor is open by design and
   everyone on it is facing outward looking for customers. So the store's suspicion should come
   partly from BEING SEEN, not only from what you did.

   ⚠️ THE FINDING THAT DECIDED WHETHER THIS WAS CHEAP: line of sight reuses the nav grid. Shelf
   runs are already levelBlockers baked into `grid`, so walking the grid between two points gives
   sight-blocking for free — no vision cones, no second spatial structure. Measured before a line
   of the prototype was written.

   ⚠️ NEGATIVE CASES, BOTH DIRECTIONS. A test that only checks the SEEN case cannot tell a working
   sight check from one that always returns true — which is this branch's likeliest failure. So
   every claim below is asserted seen AND unseen, and the whole thing is asserted OFF as well as
   on, because suspicion is load-bearing in a level that is in playtest. */
'use strict';
const { createWorld } = require('./harness');

let pass = 0, fail = 0;
const ck = (n, c, d) => { console.log('  ' + (c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '   ' + d : '')); c ? pass++ : fail++; };

const S_ = 1.8;
const A = (x, y) => [Math.round(x * S_), Math.round(y * S_)];
const mk = () => createWorld({ storage: { 'promo:level': 'grocery', 'promo:newgame': '0', 'promo:char': '0' } });

/* ONE watcher, placed and aimed the way the game aims them — n.face is the angle they are drawn
   looking along, which is what the sight check reads. Everyone else is taken off the floor so the
   measurement is about the one person, not about who happened to wander past. */
function stage(w) {
  const S = w.sandbox, g = w.g;
  w.run(20000, { ignoreGameOver: true });
  S.setSightlines(true);
  g.NPCS.forEach(n => { if (!n.customer) { n.x = -9000; n.y = -9000; n.gone = true; } });
  const watcher = g.NPCS.find(n => !n.customer && n.alive);
  watcher.gone = false; watcher.wentHome = false;
  return { S, g, watcher };
}
function put(ctx, px, py, wx, wy, faceAway) {
  const P = A(px, py), W = A(wx, wy);
  ctx.g.player.x = P[0]; ctx.g.player.y = P[1];
  ctx.watcher.x = W[0]; ctx.watcher.y = W[1];
  ctx.watcher.face = Math.atan2(ctx.g.player.y - ctx.watcher.y, ctx.g.player.x - ctx.watcher.x);
  if (faceAway) ctx.watcher.face += Math.PI;
  return { seen: ctx.S.whoCanSee(ctx.g.player.x + 8, ctx.g.player.y + 8).length,
           susp: ctx.S.saboSuspicion(18) };
}

/* ---- 1. THE GRID IS THE SIGHT MODEL ----------------------------------------------------- */
{
  const w = mk(), S = w.sandbox;
  w.run(9000, { ignoreGameOver: true });
  const p = (x, y) => A(x, y);
  const across = S.sightClear(...p(440, 340), ...p(532, 340));   // two aisles, a shelf run between
  const along  = S.sightClear(...p(440, 300), ...p(440, 420));   // straight down one aisle
  const open   = S.sightClear(...p(750, 600), ...p(900, 600));   // the front end
  ck('a shelf run blocks sight, because the nav grid already says it is solid', across === false,
     'aisle 1 -> aisle 2: ' + (across ? 'VISIBLE' : 'BLOCKED'));
  ck('  ^ and along an aisle you can be seen', along === true, along ? 'VISIBLE' : 'BLOCKED');
  ck('  ^ and the open front end is a stage', open === true, open ? 'VISIBLE' : 'BLOCKED');
}

/* ---- 2. SEEN COSTS MORE, UNSEEN COSTS LESS — BOTH DIRECTIONS ---------------------------- */
{
  const ctx = stage(mk());
  const open = put(ctx, 750, 600, 790, 600, false);
  ck('a watcher looking straight at you in the open sees you', open.seen === 1, JSON.stringify(open));

  const away = put(ctx, 750, 600, 790, 600, true);
  ck('  ^ and the same watcher facing away does not', away.seen === 0, JSON.stringify(away));

  ck('being seen costs MORE than being unseen', open.susp > away.susp,
     'seen ' + open.susp + ' vs unseen ' + away.susp);
  /* and both must differ from the untouched number, or one side is doing nothing */
  ck('  ^ and both differ from the flat 18 it would have been',
     open.susp !== 18 && away.susp !== 18, 'seen ' + open.susp + ', unseen ' + away.susp + ', base 18');
}

/* ---- 3. AN AISLE IS COVER — THE WHOLE POINT ---------------------------------------------
   Same watcher, aimed straight at the player in both cases. The ONLY difference is the shelf run. */
{
  const ctx = stage(mk());
  const exposed = put(ctx, 440, 340, 440, 250, false);   // watcher down the same aisle
  const covered = put(ctx, 440, 340, 532, 340, false);   // watcher one aisle over, staring at you
  ck('a watcher down your own aisle sees you', exposed.seen === 1, JSON.stringify(exposed));
  ck('  ^ but the same watcher one aisle over does not, however hard they stare',
     covered.seen === 0, JSON.stringify(covered));
  ck('  ^ so working behind a shelf run is cheaper than working in front of one',
     covered.susp < exposed.susp,
     'in the aisle mouth ' + exposed.susp + ' vs behind the run ' + covered.susp);
}

/* ---- 4. RANGE STILL MATTERS -------------------------------------------------------------
   ⚠️ ALONG A LINE THAT IS ACTUALLY CLEAR. The first version put the watcher across the whole front
   end — and that line is BLOCKED by the checkstands, so it was testing line-of-sight a second time
   and calling it range. Removing the range check entirely changed nothing and the mutant survived.
   Measured a stretch that is genuinely unobstructed and longer than SIGHT_RANGE (210 authored):
   x 700->1000 at y=620 is clear at 300 authored. */
{
  const ctx = stage(mk());
  const clearLong = ctx.S.sightClear(...A(700, 620), ...A(1000, 620));
  ck('the stretch this is measured along really is unobstructed', clearLong === true,
     '700->1000 at y=620: ' + (clearLong ? 'clear' : 'BLOCKED — this test would prove nothing'));

  const near = put(ctx, 700, 620, 780, 620, false);      // 80 authored, inside the range
  const far  = put(ctx, 700, 620, 1000, 620, false);     // 300 authored, outside it, same clear line
  ck('  ^ a watcher close along it sees you', near.seen === 1, JSON.stringify(near));
  ck('  ^ and the same watcher further along the SAME clear line does not', far.seen === 0,
     'near ' + near.seen + ' at 80 authored, far ' + far.seen + ' at 300 (range is 210)');
}

/* ---- 4b. SHOPPERS ARE NOT WATCHING YOU --------------------------------------------------
   ⚠️ CUSTOMERS CARRY A FACE. NPC() gives every body a random `face`, and nothing re-aims a
   shopper's — so whether one happens to be pointing at the player is luck, and the mutant that let
   customers count SURVIVED on exactly that luck. Aim one at the player deliberately. */
{
  const ctx = stage(mk());
  const shopper = ctx.g.NPCS.find(n => n.customer && n.alive);
  ck('there is a shopper to aim', !!shopper, shopper ? shopper.name : 'none');
  ctx.g.player.x = A(750, 600)[0]; ctx.g.player.y = A(750, 600)[1];
  shopper.x = ctx.g.player.x + 40; shopper.y = ctx.g.player.y;
  shopper.gone = false; shopper.wentHome = false;
  shopper.face = Math.atan2(ctx.g.player.y - shopper.y, ctx.g.player.x - shopper.x);
  const seen = ctx.S.whoCanSee(ctx.g.player.x + 8, ctx.g.player.y + 8);
  ck("  ^ and a shopper staring straight at you from arm's length still does not count",
     seen.length === 0,
     seen.length ? ('counted: ' + seen.map(n => n.name).join(', ')) : 'nobody watching');
  /* and the same position with a member of STAFF does count, or the check is simply off */
  shopper.customer = false; shopper.storeRole = 'staff';
  const now = ctx.S.whoCanSee(ctx.g.player.x + 8, ctx.g.player.y + 8);
  shopper.customer = true; shopper.storeRole = null;
  ck('  ^ while somebody who IS staff, in the same spot, does', now.length === 1,
     now.length + ' watcher(s) once the same body is staff');
}

/* ---- 5. WITH THE FLAG OFF, NOTHING CHANGES ANYWHERE -------------------------------------
   ⚠️ THE ASSERTION THAT PROTECTS THE PLAYTEST. Suspicion is load-bearing, so "off" must be the
   identity — not approximately, exactly. */
{
  const w = mk(), S = w.sandbox, g = w.g;
  w.run(20000, { ignoreGameOver: true });
  ck('the flag is OFF by default', g.sightlines === false, 'sightlines=' + g.sightlines);
  const vals = [1, 5, 18, 22, 40].map(b => S.saboSuspicion(b));
  ck('  ^ and with it off, a sabotage costs exactly what it always did',
     vals.join(',') === '1,5,18,22,40', 'saboSuspicion(1,5,18,22,40) = ' + vals.join(','));

  /* even standing nose to nose with somebody who is staring at you */
  const n = g.NPCS.find(x => !x.customer && x.alive);
  n.gone = false; n.wentHome = false;
  g.player.x = n.x + 20; g.player.y = n.y;
  n.face = Math.atan2(g.player.y - n.y, g.player.x - n.x);
  ck('  ^ even with somebody watching from arm\'s length', S.saboSuspicion(18) === 18,
     'saboSuspicion(18) = ' + S.saboSuspicion(18));
}

/* ---- 6. THE OFFICE IS UNTOUCHED, FLAG ON OR OFF ----------------------------------------- */
{
  const o = createWorld(), OS = o.sandbox, og = o.g;
  o.run(20000, { ignoreGameOver: true });
  const before = [1, 5, 18, 22, 40].map(b => OS.saboSuspicion(b)).join(',');
  OS.setSightlines(true);                       // turn it ON, in the office
  const after = [1, 5, 18, 22, 40].map(b => OS.saboSuspicion(b)).join(',');
  ck('the office ignores the flag entirely, even switched on',
     before === '1,5,18,22,40' && after === before, 'off ' + before + ' | on ' + after);
  ck('  ^ and nobody in the office can see you, because the check does not run there',
     OS.whoCanSee(og.player.x, og.player.y).length === 0,
     OS.whoCanSee(og.player.x, og.player.y).length + ' watchers');
  OS.setSightlines(false);

  /* and the office's own suspicion machinery is untouched — drive the real function */
  og.player.suspicion = 0;
  OS.addSuspicion(10, 'test');
  ck('  ^ and addSuspicion itself still moves it the same way', Math.round(og.player.suspicion) === 10,
     'suspicion 0 -> ' + Math.round(og.player.suspicion));
  const st = o.run(20000, { ignoreGameOver: true });
  ck('  ^ and the office still soaks clean', st.throws === 0 && og.renderErrs === 0,
     'throws ' + st.throws + ', renderErrs ' + og.renderErrs);
}

/* ---- 7. THE COST OF LOOKING ------------------------------------------------------------
   The brief asks for line-of-sight checks per ACTION, not per frame. Nothing in the loop calls
   whoCanSee — it is called when a sabotage resolves. This asserts that, because a per-frame
   version would be the thing that made this idea expensive. */
{
  const w = mk(), S = w.sandbox, g = w.g;
  w.run(9000, { ignoreGameOver: true });
  S.setSightlines(true);
  let calls = 0;
  const wcs = S.whoCanSee;
  S.whoCanSee = function () { calls++; return wcs.apply(null, arguments); };
  w.run(6000, { ignoreGameOver: true });
  S.whoCanSee = wcs;
  ck('nothing calls the sight check every frame', calls === 0,
     calls + ' calls across 6,000 frames with the flag ON');

  /* and it is cheap when it IS called */
  S.setSightlines(true);
  const t0 = Date.now();
  for (let i = 0; i < 2000; i++) S.saboSuspicion(18);
  const ms = Date.now() - t0;
  ck('  ^ and one check is cheap when something does ask', ms < 2000,
     (ms / 2000).toFixed(4) + ' ms per check, 2,000 checks in ' + ms + 'ms');
}

console.log('sightlines: ' + pass + ' pass, ' + fail + ' fail');
console.log(fail ? 'SIGHTLINES: RED ❌' : 'SIGHTLINES: GREEN ✅ (an aisle is cover; off changes nothing)');
process.exit(fail ? 1 : 0);
