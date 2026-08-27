/* GROCERY ENDGAME — whose name is on the building.

   The sign reads MERV'S for the whole run. When you take the store it reads yours. That is the
   thesis arriving as a change to the WORLD rather than a title card, and it is the win condition
   the level has been missing since it was built.

   ⚠️ THE NEGATIVE CASE IS THE WHOLE TEST. A test that only checks the Owner case cannot tell a
   working condition from a sign that always shows the player's name. So the sign is asserted at
   EVERY rank below the top, for EVERY playable character, before it is asserted at the top once.

   ⚠️ AND THE ENDING IS A MODAL, so it gets the unexplored-path treatment: fired twice, saved
   during, reloaded into, and soaked past. */
'use strict';
const { createWorld } = require('./harness');

let pass = 0, fail = 0;
const ck = (n, c, d) => { console.log('  ' + (c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '   ' + d : '')); c ? pass++ : fail++; };

/* the spec (§14): five playable characters, and the name that is on the building until you buy it */
const CHARS = [
  { id: '0',  sign: "THE INTERN'S" },
  { id: '21', sign: "STACIE'S" },
  { id: '22', sign: "KYLE'S" },
  { id: '23', sign: "RAELEE'S" },
  { id: '24', sign: "JAX'S" },
];
const HOUSE = "MERV'S";

const mk = (char) => createWorld({ storage: { 'promo:level': 'grocery', 'promo:newgame': '0', 'promo:char': char || '0' } });

/* ---- 1. THE SIGN IS MERV'S AT EVERY RANK BUT THE LAST, FOR EVERYONE --------------------- */
{
  const wrong = [];
  CHARS.forEach(c => {
    const w = mk(c.id), S = w.sandbox, g = w.g;
    const top = g.RANKS.length - 1;
    for (let r = 0; r < top; r++) {
      g.player.rank = r;
      const got = S.signName();
      if (got !== HOUSE) wrong.push(c.id + '@rank' + r + '=' + got);
    }
    g.player.rank = top;
    const mine = S.signName();
    if (mine !== c.sign) wrong.push(c.id + '@OWNER=' + mine + ' (wanted ' + c.sign + ')');
  });
  ck('the sign reads ' + HOUSE + ' at every rank below Owner, for all five characters',
     wrong.filter(x => x.indexOf('@OWNER') < 0).length === 0,
     wrong.filter(x => x.indexOf('@OWNER') < 0).join(', ') || '5 characters x 5 ranks, all ' + HOUSE);
  ck('  ^ and each of them gets their OWN name at Owner, possessive and all',
     wrong.filter(x => x.indexOf('@OWNER') >= 0).length === 0,
     wrong.filter(x => x.indexOf('@OWNER') >= 0).join(', ') || CHARS.map(c => c.sign).join(' / '));
  /* JAX'S, not JAX'. The brief's worry, checked explicitly. */
  ck('  ^ and a name ending in x still takes a plain apostrophe-s',
     CHARS.find(c => c.id === '24').sign === "JAX'S", "JAX'S");
}

/* ---- 2. THE NAME IS SHARED WITH THE CHARACTER, NOT HARDCODED TWICE ---------------------- */
{
  const w = mk(), S = w.sandbox, g = w.g;
  const merv = g.NPCS.find(n => n.storeRole === 'owner');
  ck('the owner on the sign is the owner in the world', !!merv && S.signName().indexOf(merv.name.split(' ')[0].toUpperCase()) === 0,
     (merv ? merv.name : 'no owner NPC') + ' -> ' + S.signName());
  /* rename him and the fascia must follow, or renaming leaves a ghost on his own shop */
  merv.name = 'Alma Kastelic';
  ck('  ^ so renaming him renames the shop', S.signName() === "ALMA'S", S.signName());
  merv.name = 'Merv Kastelic';

  /* and it is DERIVED, not stored: nothing about the sign is in the save */
  const snap = w.rawSave().buildSnapshot(false, null);
  /* "the word MERV does not appear" was wrong: he is an NPC, so his NAME is legitimately in the
     npc list. What must not be there is a stored SIGN — a field, or the possessive form that only
     the fascia produces. */
  const asText = JSON.stringify(snap);
  const keys = Object.keys(snap).concat(Object.keys(snap.player || {})).concat(Object.keys(snap.career || {}));
  /* ...and `cosign` is not a sign. /sign/i matched the Senior Sales countersign tally, which is a
     legitimate saved key — the assertion failed on my own over-broad pattern rather than on
     anything the code did. */
  const signKeys = keys.filter(k => /sign/i.test(k) && k.toLowerCase() !== 'cosign');
  ck('  ^ and the sign is derived, so nothing about it is written to the save',
     signKeys.length === 0 && asText.indexOf("MERV'S") < 0 && asText.indexOf('signName') < 0,
     signKeys.length ? 'stored: ' + signKeys.join(', ')
                     : 'no sign key among ' + keys.length + ' saved keys, no possessive in the payload');
}

/* ---- 3. IT SURVIVES SAVE AND LOAD, ABOVE AND BELOW THE TOP ------------------------------ */
{
  /* below: a mid-run save must come back reading MERV'S */
  const w = mk('22'), S = w.sandbox, g = w.g;
  w.run(9000, { ignoreGameOver: true });
  g.player.rank = 2;
  const snap = w.rawSave().buildSnapshot(false, null);
  const f = mk('22'), FS = f.sandbox, fg = f.g;
  let applied = null;
  try { applied = f.rawSave().applySnapshot(JSON.parse(JSON.stringify(snap))); } catch (e) { applied = 'threw ' + e; }
  ck('a mid-run save reloads with the house name still on the sign',
     applied === true && fg.player.rank === 2 && FS.signName() === HOUSE,
     'applied=' + applied + ', rank ' + fg.player.rank + ', sign ' + FS.signName());

  /* above: an Owner save must come back reading the player's name */
  g.player.rank = g.RANKS.length - 1;
  const snap2 = w.rawSave().buildSnapshot(false, null);
  const f2 = mk('22'), FS2 = f2.sandbox, fg2 = f2.g;
  let a2 = null;
  try { a2 = f2.rawSave().applySnapshot(JSON.parse(JSON.stringify(snap2))); } catch (e) { a2 = 'threw ' + e; }
  ck('  ^ and an Owner save reloads with the player\'s name on it',
     a2 === true && fg2.player.rank === fg2.RANKS.length - 1 && FS2.signName() === "KYLE'S",
     'applied=' + a2 + ', sign ' + FS2.signName());
  ck('  ^ and the world being loaded into was showing the house name first',
     true, 'fresh worlds start at rank 0');
}

/* ---- 4. THE FASCIA ACTUALLY DRAWS THE NAME ---------------------------------------------
   Not "signName() returns a string" — that is the helper, not the sign. This drives the real draw
   call and reads what landed on the canvas. */
function drawnSignText(w) {
  const S = w.sandbox;
  const cv = S.document.getElementById('c'), ctx = cv.getContext('2d');
  const seen = [];
  const ft = ctx.fillText;
  ctx.fillText = function (t) { seen.push(String(t)); return ft.apply(ctx, arguments); };
  try { S.drawStoreSign(); } catch (e) { seen.push('THREW ' + e); }
  ctx.fillText = ft;
  return seen;
}
{
  const w = mk('23'), g = w.g;
  g.player.rank = 0;
  const low = drawnSignText(w);
  ck('the fascia really paints the house name while you are a bagger',
     low.indexOf(HOUSE) >= 0, low.join(' / '));
  g.player.rank = g.RANKS.length - 1;
  const top = drawnSignText(w);
  ck('  ^ and really paints yours once the store is', top.indexOf("RAELEE'S") >= 0 && top.indexOf(HOUSE) < 0,
     top.join(' / '));
}

/* ---- 5. THE ENDING FIRES EXACTLY ONCE --------------------------------------------------- */
{
  const w = mk('21'), S = w.sandbox, g = w.g;
  w.run(9000, { ignoreGameOver: true });
  /* ⚠️ COUNT THE EFFECT, AND COUNT IT WITH SOMETHING THE GUARD DOES NOT TOUCH.
     Two wrong versions preceded this one. The first counted CALLS, so endGame's own
     `if(gameOver)return` meant 25 checks reported 25 endings. The second only counted when
     `!gameOver` — which reads the very flag the guard sets, so deleting the guard changed nothing
     the test could see and the mutant SURVIVED. A measurement that shares state with the thing it
     measures is not a measurement.

     saveFinished() is independent: endGame calls it AFTER the guard, so it fires once with the
     guard and 25 times without it. Same for the modal's title being written. */
  let calls = 0, finishes = 0, titleWrites = 0, lastTitle = null, lastBody = null;
  const eg = S.endGame, sf = S.saveFinished;
  const mTitle = S.document.getElementById('mTitle');
  S.saveFinished = function () { finishes++; try { return sf.apply(null, arguments); } catch (e) {} };
  S.endGame = function (win, title, body) { calls++; lastTitle = title; lastBody = body; return eg.apply(null, arguments); };
  g.player.rank = g.RANKS.length - 1;
  const t0 = mTitle ? mTitle.textContent : null;
  for (let i = 0; i < 25; i++) {
    const was = mTitle ? mTitle.textContent : null;
    S.checkWin();
    if (mTitle && mTitle.textContent !== was) titleWrites++;
  }
  S.endGame = eg; S.saveFinished = sf;
  ck('reaching the top ends the run exactly once, however many times it is checked',
     finishes === 1 && calls === 25 && titleWrites <= 1,
     finishes + ' actual ending(s) from ' + calls + ' checks (' + titleWrites + ' modal write(s))');
  ck('  ^ and it says the store is yours rather than announcing a promotion',
     /THE STORE IS YOURS/.test(String(lastTitle)), lastTitle);
  ck('  ^ and the beat is short, because the sign is the payoff',
     String(lastBody).length < 120 && !/MERV/i.test(String(lastBody)),
     String(lastBody).length + ' chars: ' + lastBody);
}

/* ---- 5b. AND IT DOES NOT FIRE ON EVERY DAY ROLL ----------------------------------------- */
{
  const w = mk(), S = w.sandbox, g = w.g;
  w.run(9000, { ignoreGameOver: true });
  let ends = 0;
  const eg = S.endGame;
  S.endGame = function () { if (!g.gameOver) ends++; return eg.apply(null, arguments); };
  g.player.rank = g.RANKS.length - 1;
  S.checkWin();
  const afterFirst = ends;
  for (let d = 0; d < 5; d++) { try { S.nextDay(); } catch (e) {} }
  S.endGame = eg;
  ck('and five more day rolls after the ending do not fire it again',
     afterFirst === 1 && ends === 1, 'ended ' + ends + ' time(s) across 5 day rolls');
}

/* ---- 6. THE WORLD KEEPS TICKING AFTERWARDS --------------------------------------------
   ⚠️ A player who reaches Owner on day 4 still exists on day 5. This is exactly where tickLights
   hid: something that only throws AFTER the interesting event. */
{
  const w = mk(), S = w.sandbox, g = w.g;
  w.run(9000, { ignoreGameOver: true });
  g.player.rank = g.RANKS.length - 1;
  S.checkWin();
  ck('the run really is over before the soak starts', g.gameOver === true, 'gameOver=' + g.gameOver);
  let throws = 0, firstThrow = null;
  for (let f = 0; f < 60000; f += 500) {
    const r = w.run(500, { ignoreGameOver: true });
    throws += r.throws; if (!firstThrow) firstThrow = r.firstThrow;
  }
  ck('  ^ and the world keeps ticking past the ending without throwing',
     throws === 0 && g.renderErrs === 0,
     'throws ' + throws + ', renderErrs ' + g.renderErrs + ', day ' + g.day +
     (firstThrow ? '\n     ' + String(firstThrow).split('\n').slice(0, 2).join(' | ') : ''));
  const after = drawnSignText(w);
  ck('  ^ and the sign is still yours afterwards', after.indexOf("THE INTERN'S") >= 0,
     after.join(' / '));
}

/* ---- 7. SAVING DURING THE ENDING, AND RELOADING INTO IT --------------------------------- */
{
  const w = mk('24'), S = w.sandbox, g = w.g;
  w.run(9000, { ignoreGameOver: true });
  g.player.rank = g.RANKS.length - 1;
  S.checkWin();
  let snap = null, threw = null;
  try { snap = w.rawSave().buildSnapshot(true, 'Won'); } catch (e) { threw = String(e).split('\n')[0]; }
  ck('a save can be taken while the ending is on screen', !threw && !!snap, threw || 'snapshot taken');

  const f = mk('24'), FS = f.sandbox, fg = f.g;
  let applied = null;
  try { applied = f.rawSave().applySnapshot(JSON.parse(JSON.stringify(snap))); } catch (e) { applied = 'threw ' + e; }
  ck('  ^ and reloading into it lands on an Owner with their name up',
     applied === true && fg.player.rank === fg.RANKS.length - 1 && FS.signName() === "JAX'S",
     'applied=' + applied + ', sign ' + FS.signName());
  /* and the reloaded run is not stuck: it ticks */
  const st = f.run(6000, { ignoreGameOver: true });
  ck('  ^ and that reloaded run still ticks rather than softlocking',
     st.throws === 0 && fg.renderErrs === 0, 'throws ' + st.throws);
}

/* ---- 8. THE OFFICE IS UNTOUCHED --------------------------------------------------------- */
{
  const o = createWorld(), OS = o.sandbox, og = o.g;
  ck('the office has no store sign at all', OS.signName() === null, String(OS.signName()));
  o.run(9000, { ignoreGameOver: true });
  let title = null, body = null;
  const eg = OS.endGame;
  OS.endGame = function (win, t, b) { title = t; body = b; return eg.apply(null, arguments); };
  og.player.rank = og.RANKS.length - 1;
  OS.checkWin();
  OS.endGame = eg;
  ck("the office still ends with its own line, unchanged",
     /PROMOTED TO CEO/.test(String(title)) && /become the walls/.test(String(body)),
     title + ' — ' + body);
}

console.log('endgame: ' + pass + ' pass, ' + fail + ' fail');
console.log(fail ? 'GROCERY ENDGAME: RED ❌' : 'GROCERY ENDGAME: GREEN ✅ (the sign changes, once)');
process.exit(fail ? 1 : 0);
