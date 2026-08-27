/* RANK-INDEX LEAKS — office content gated on a rank NUMBER, in a building that renames that number.

   `RANKS` is swapped at boot by the level seam and every one of its ~41 uses is by index, so
   `player.rank>=5` means MANAGER in the office and OWNER in Save-Rite. There is no string to grep
   for. Kyle: "Grep can't find these — there's no string to match, just a number."

   What that shipped: the ORG panel printed "Mr. Sterling — CEO" in a shop with no Sterling, a
   MANAGER's chair with no Dale, "HR: —" with zero HR, twelve store staff filed under JUNIOR SALES,
   and at OWNER the whole office CEO merit block including the "— land a client" prompt. Separately
   `scoreTheDay` scored the office's MANAGER->CEO gate every day in the store, and `endDay` held a
   stale second copy of delegation's old `rank===4` so a store AM got no scoreboard at 5pm.

   ⚠️ THIS TEST ASSERTS BOTH DIRECTIONS ON PURPOSE. A one-way "no office nouns in the store" scan
   passes trivially if the panel renders nothing at all — which is precisely the mutation most
   likely to be written. So every absence in the store is paired with a presence: the store panel
   must show the store's OWN people, and the office panel must still show Sterling, Dale and HR.

   ⚠️ ANCHORS ARE FIXED AT AUTHORING TIME, not derived from the world, so a mutant cannot redefine
   the floor to satisfy the count (the t_grocery aisle lesson: five shelf columns became six and the
   suite went green around the mutation). Save-Rite has FIVE departments and a twelve-person crew;
   those are spec, and a test SHOULD fail when they change. */
'use strict';
const { createWorld } = require('./harness');

let pass = 0, fail = 0;
const ck = (n, c, d) => { console.log('  ' + (c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '   ' + d : '')); c ? pass++ : fail++; };
const mk = lv => createWorld({ seed: 20260827, storage: { 'promo:level': lv, 'promo:newgame': '0', 'promo:char': '0' } });

/* SPEC, not measurement — see the header. */
const N_DEPTS = 5, CREW = 12;

/* Each of these is a THING that does not exist in Save-Rite, not merely a word the store avoids. */
const GHOSTS = [
  [/Sterling/i,                            'Mr. Sterling, who is not in the building'],
  [/\bDale\b/i,                            "Dale's manager chair, which does not exist here"],
  [/\bHR\b/,                               'an HR department the store does not have'],
  [/JUNIOR SALES|SENIOR SALES|\bSALES\b/,  'office SALES tiers'],
  [/land a client|requisition/i,           'the office CEO merit arc'],
  [/Branch health|A day in order/i,        'the office branch-health gate'],
];

const orgText = (S) => {
  S.renderOrg();
  return String(S.document.getElementById('orgRows').innerHTML || '')
    .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

/* ---- 1. THE STORE'S ORG PANEL, AT EVERY RUNG ------------------------------------------------ */
{
  const w = mk('grocery'), S = w.sandbox, g = w.g;
  w.run(20000, { ignoreGameOver: true });

  const offences = [], lengths = [];
  for (let r = 0; r < g.RANKS.length; r++) {
    g.player.rank = r;
    if (r < 3) g.player.storeDept = 'grocery';
    const t = orgText(S);
    lengths.push(t.length);
    GHOSTS.forEach(([re, what]) => { if (re.test(t)) offences.push(g.RANKS[r] + ': ' + what); });
  }
  ck('no office ghost appears in the store org panel, at any of the six rungs',
     offences.length === 0, offences.length ? offences.slice(0, 4).join(' | ') : 'six rungs clean');

  /* THE OTHER DIRECTION — an empty panel must not be able to pass the scan above. */
  ck('  ^ and the panel is not merely empty at any rung',
     lengths.every(n => n > 120), 'lengths ' + lengths.join(','));
}

/* ---- 2. IT SHOWS THE STORE'S OWN PEOPLE ----------------------------------------------------- */
{
  const w = mk('grocery'), S = w.sandbox, g = w.g;
  w.run(20000, { ignoreGameOver: true });
  g.player.rank = 0; g.player.storeDept = 'grocery';
  const t = orgText(S);

  const owner = g.NPCS.find(n => n.storeRole === 'owner');
  ck('the owner is named on the chart, whoever he is',
     !!owner && t.indexOf(owner.name) >= 0, owner ? owner.name : 'no owner on the floor');

  const DEPTS = ['FRONT END', 'GROCERY', 'PRODUCE', 'DELI', 'BAKERY'];
  const shown = DEPTS.filter(d => t.indexOf(d) >= 0);
  ck('all five departments are on the chart', shown.length === N_DEPTS, shown.join(', '));

  /* everybody on the floor is accounted for — nobody is quietly dropped */
  const crew = g.NPCS.filter(n => !n.customer && n.alive && !n.gone);
  const missing = crew.filter(n => t.indexOf(n.name.split(' ')[0]) < 0);
  ck('every member of staff on the floor appears',
     missing.length === 0 && crew.length >= CREW - 2,
     crew.length + ' on the floor, missing: ' + (missing.map(n => n.name).join(', ') || 'nobody'));

  ck('and the player is on his own chart', /YOU —/.test(t), 'YOU row present');
}

/* ---- 3. THE OFFICE PANEL IS UNCHANGED — the paired presence for section 1 -------------------- */
{
  const w = mk('office'), S = w.sandbox, g = w.g;
  w.run(20000, { ignoreGameOver: true });
  g.player.rank = 5;
  const t = orgText(S);
  ck('the OFFICE still names Sterling, Dale and HR at MANAGER',
     /Sterling/.test(t) && /Dale/.test(t) && /HR:/.test(t), t.slice(0, 58) + '…');
  ck('  ^ and still shows the office CEO merit block there',
     /Branch health/i.test(t) && /(land a client|requisition)/i.test(t), 'merit block present');
}

/* ---- 4. THE CEO MERIT ARC DOES NOT RUN IN A SHOP -------------------------------------------- */
{
  const w = mk('grocery'), S = w.sandbox, g = w.g;
  w.run(20000, { ignoreGameOver: true });

  const scored = [];
  for (let r = 0; r < g.RANKS.length; r++) { g.player.rank = r; if (S.scoreTheDay() !== null) scored.push(g.RANKS[r]); }
  ck('scoreTheDay never scores in the store, at any rung',
     scored.length === 0, scored.join(', ') || 'null at all six');

  /* it wrote career.goodDays on its own before this — prove the day boundary is quiet now */
  const snap = () => JSON.stringify({ good: g.career.goodDays, ready: g.career.meritReady, ceo: g.career.ceoDone });
  const before = snap();
  g.player.rank = g.RANKS.length - 1;                     // OWNER
  w.run(30000, { ignoreGameOver: true });
  ck('  ^ so a day boundary at OWNER writes no office career state',
     snap() === before, before + ' -> ' + snap());

  ck('landClient is refused in the store',
     S.landClient() === false && !(g.career.revenue > 0), 'revenue ' + (g.career.revenue || 0));
}
{
  const w = mk('office'), S = w.sandbox, g = w.g;
  w.run(20000, { ignoreGameOver: true });
  g.player.rank = 5;
  ck('but the OFFICE still scores it at MANAGER', S.scoreTheDay() !== null, 'scored');
  ck('and the OFFICE can still land a client', S.landClient() === true, 'revenue ' + (g.career.revenue || 0));
}

/* ---- 5. ONE GATE, ASKED — NOT A SECOND COPY OF IT ------------------------------------------- */
{
  /* endDay's delegation scoreboard used to re-state `rank===4`, which went stale the day
     delegActive() learned about the store.

     ⚠️ ASSERT THE CARD, NOT THE PREDICATE. The first draft of this section checked delegActive()
     at every rung and called itself "the scoreboard follows delegActive()". It did not: the bug
     was in endDay's OWN copy, so restoring `player.rank===4` there would have left this green.
     That is the recurring defect in this suite — an assertion whose name does not match what it
     measures. So this reads the 5pm card the player actually sees. */
  const card = (lv, rank) => {
    const w = mk(lv), g = w.g, S = w.sandbox;
    w.run(20000, { ignoreGameOver: true });
    let seen = null;
    g.player.rank = rank;
    w.run(60000, { ignoreGameOver: true, onDay: () => {
      if (seen === null) seen = String(S.document.getElementById('mStats').innerHTML || '')
        .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      g.player.rank = rank;                       // hold the rung across the boundary
    } });
    return seen;
  };

  const amStore = card('grocery', 3);             // ASSISTANT MANAGER — delegates, got no scoreboard
  ck("a store Assistant Manager's 5pm card carries the delegation scoreboard",
     !!amStore && /DELEGATED CLEAN/.test(amStore),
     amStore === null ? 'no day boundary reached' : (/DELEGATED CLEAN/.test(amStore) ? 'present' : 'ABSENT — the stale rank===4 copy is back'));

  const smStore = card('grocery', 4);             // STORE MANAGER — also delegates
  ck('  ^ and so does a Store Manager’s',
     !!smStore && /DELEGATED CLEAN/.test(smStore), smStore === null ? 'no day boundary' : 'present');

  const ownerStore = card('grocery', 5);          // OWNER — must NOT inherit the office CEO gate
  ck("an Owner's card shows no office branch-health gate",
     !!ownerStore && !/BRANCH HEALTH|Good days/.test(ownerStore),
     ownerStore === null ? 'no day boundary' : (/(BRANCH HEALTH|Good days)/.test(ownerStore) ? 'LEAKED' : 'clean'));

  /* the office direction, so none of the above can pass by rendering nothing */
  const officeAm = card('office', 4);
  ck('the OFFICE Assistant Manager still gets the same scoreboard',
     !!officeAm && /DELEGATED CLEAN/.test(officeAm), officeAm === null ? 'no day boundary' : 'present');
  const officeMgr = card('office', 5);
  ck('and the OFFICE MANAGER still gets the branch-health gate',
     !!officeMgr && /BRANCH HEALTH/.test(officeMgr), officeMgr === null ? 'no day boundary' : 'present');

  /* ⚠️ AND THE ABSENCE. Every assertion above says the scoreboard is THERE where delegation is
     live; a mutant that shows it at EVERY rung satisfies all of them and survived the first sweep.
     Presence without absence is half a contract. */
  const bagger = card('grocery', 0);
  ck('a Bagger, who delegates to nobody, gets no delegation scoreboard',
     !!bagger && !/DELEGATED CLEAN/.test(bagger),
     bagger === null ? 'no day boundary' : (/DELEGATED CLEAN/.test(bagger) ? 'SHOWN to a bagger' : 'absent'));
  const officeJunior = card('office', 2);
  ck('  ^ and neither does an office SALES',
     !!officeJunior && !/DELEGATED CLEAN/.test(officeJunior),
     officeJunior === null ? 'no day boundary' : (/DELEGATED CLEAN/.test(officeJunior) ? 'SHOWN to sales' : 'absent'));
}

/* ---- 6. THE VERBS THAT ARE ONLY UNREACHABLE — pinned, so the day that changes this goes RED -- */
{
  const w = mk('grocery'), g = w.g;
  w.run(20000, { ignoreGameOver: true });
  /* fire / hire / promote / demote hang off the manager's-office desk (`d.mgrOffice && rank>=5`).
     Save-Rite has no such desk, so they cannot be opened — they are not guarded, merely
     unreachable, and managerFire WILL dismiss store staff if it is ever called. Deliberately left
     without a level guard: the day somebody puts a manager's office in the store, a human should
     decide what dismissal means in a shop rather than inherit the office's answer silently.
     This assertion is that decision's tripwire. */
  const offices = g.desks.filter(d => d.mgrOffice).length;
  ck("the store has no manager's office, so the office manager verbs cannot be opened",
     offices === 0, offices + " mgrOffice desks — if this is >0, decide what firing means in a shop");
}

console.log('\nrank leaks: ' + pass + ' pass, ' + fail + ' fail');
console.log(fail ? 'RANK-INDEX LEAKS: RED ❌' : 'RANK-INDEX LEAKS: GREEN ✅ (office content stays in the office)');
process.exit(fail ? 1 : 0);
