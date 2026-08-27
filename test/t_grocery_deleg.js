/* GROCERY DELEGATION — the tray was already there; this is what it should be.

   It appeared at Save-Rite's Store Manager rung because delegActive() is `player.rank===4`, and
   rank 4 is ASSISTANT MANAGER in the office but STORE MANAGER in the store. Third instance of
   office content gated on a rank index that names a different job in each level.

   ⚠️ RESKIN, NOT A SECOND SYSTEM. The kinds, the personality matching, the demerit ladder and
   every outcome are the office's, untouched. What changed is WHO you can hand work to and WHAT
   the work is called.

   ⚠️ NEGATIVE CASES ARE THE SUBJECT. A test that only delegates correctly cannot tell a working
   target filter from one that returns everyone — which is the exact bug this branch is fixing.
   So every rung asserts who CANNOT be handed work as well as who can. */
'use strict';
const { createWorld } = require('./harness');

let pass = 0, fail = 0;
const ck = (n, c, d) => { console.log('  ' + (c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '   ' + d : '')); c ? pass++ : fail++; };

const mk = () => createWorld({ storage: { 'promo:level': 'grocery', 'promo:newgame': '0', 'promo:char': '0' } });
/* office nouns that must never appear in the store's delegable work */
const OFFICE_NOUNS = /\b(client|report|desk audit|front-desk|signatures|backlog|meeting)\b/i;

/* put jobs on the tray the way delegArrive does, without waiting for the right phase */
function stock(g, kinds) {
  g.deleg.q.length = 0;
  kinds.forEach((k, i) => g.deleg.q.push({ id: 900 + i, kind: k, phase: 0, exp: 99999, to: null, state: 'open' }));
}

/* ---- 1. THE TRAY IS LIVE AT BOTH STORE MANAGEMENT RUNGS, AND NOWHERE ELSE --------------- */
{
  const w = mk(), S = w.sandbox, g = w.g;
  w.run(9000, { ignoreGameOver: true });
  const on = [];
  for (let r = 0; r < g.RANKS.length; r++) { g.player.rank = r; if (S.delegActive()) on.push(r + ':' + g.RANKS[r]); }
  g.player.rank = 0;
  ck('the tray is live at ASSISTANT MANAGER and STORE MANAGER, and only there',
     on.length === 2 && /ASSISTANT MANAGER/.test(on[0]) && /STORE MANAGER/.test(on[1]),
     on.join(', ') || 'never active');
}

/* ---- 2. WHO YOU CAN HAND WORK TO — AND, THE POINT, WHO YOU CANNOT ----------------------- */
{
  const w = mk(), S = w.sandbox, g = w.g;
  w.run(20000, { ignoreGameOver: true });
  const by = r => {
    g.player.rank = r;
    const yes = g.NPCS.filter(n => S.delegCanAssign(n));
    const no = g.NPCS.filter(n => !S.delegCanAssign(n));
    return { yes, no };
  };

  /* AM: department managers and floor staff */
  let a = by(3);
  ck('an Assistant Manager can hand work to the Department Managers and the floor',
     a.yes.length >= 8 && a.yes.every(n => n.storeRole === 'manager' || n.storeRole === 'staff'),
     a.yes.length + ': ' + [...new Set(a.yes.map(n => n.storeRole))].join('/'));
  ck('  ^ and NOT to the Store Manager, the AM, the owner, or a shopper',
     a.no.some(n => n.storeRole === 'store') && a.no.some(n => n.storeRole === 'am') &&
     a.no.some(n => n.storeRole === 'owner') && a.no.some(n => n.customer) &&
     !a.yes.some(n => n.customer || n.storeRole === 'owner' || n.storeRole === 'store' || n.storeRole === 'am'),
     'refused: ' + [...new Set(a.no.map(n => n.customer ? 'shopper' : n.storeRole))].join(', '));

  /* Store Manager: the AM and the Department Managers — one level down, not the whole floor */
  let b = by(4);
  ck('a Store Manager hands work to the AM and the Department Managers',
     b.yes.every(n => n.storeRole === 'manager' || n.storeRole === 'am') && b.yes.length >= 5,
     b.yes.length + ': ' + [...new Set(b.yes.map(n => n.storeRole))].join('/'));
  ck('  ^ and NOT down to the floor staff, and never to the owner or a shopper',
     !b.yes.some(n => n.storeRole === 'staff' || n.storeRole === 'owner' || n.customer),
     'refused: ' + [...new Set(b.no.map(n => n.customer ? 'shopper' : n.storeRole))].join(', '));

  /* below and above the two management rungs, nobody */
  [0, 1, 2, 5].forEach(r => {
    const c = by(r);
    if (c.yes.length) ck('rank ' + r + ' (' + g.RANKS[r] + ') can delegate to nobody', false,
                         c.yes.length + ' targets');
  });
  ck('no other rung can hand work to anyone at all',
     [0, 1, 2, 5].every(r => by(r).yes.length === 0),
     'Bagger, Clerk, Department Manager and Owner all refused');

  /* THE ONE THAT MATTERS MOST: a shopper, at every rung */
  const shopperEver = [0, 1, 2, 3, 4, 5].some(r => by(r).yes.some(n => n.customer));
  ck('a shopper can never be handed work, at any rung', shopperEver === false,
     g.NPCS.filter(n => n.customer).length + ' shoppers on the floor throughout');

  /* ⚠️ AND THE GUARD THAT DOES IT IS REDUNDANT TODAY — measured, not assumed. Shoppers carry
     storeRole:null, so the role filter already refuses them: removing `!n.customer` from
     delegCanAssign leaves 0/5 delegable and the mutation survives every assertion above. That is
     not a reason to delete a correct defence, but it IS a reason to prove it, so the condition it
     defends against is posed: give a shopper a role, the way a future branch might, and require
     the customer check to be the thing that still refuses them. */
  g.player.rank = 3;
  const shopper = g.NPCS.find(n => n.customer);
  const restore = { d: shopper.storeDept, r: shopper.storeRole };
  shopper.storeDept = 'deli'; shopper.storeRole = 'staff';
  try {
    ck('  ^ and still not even if something gives one a role by mistake',
       S.delegCanAssign(shopper) === false,
       'shopper posed as ' + shopper.storeRole + ' in ' + shopper.storeDept + ' -> ' +
       (S.delegCanAssign(shopper) ? 'DELEGABLE' : 'still refused'));
  } finally { shopper.storeDept = restore.d; shopper.storeRole = restore.r; }

  /* ⚠️ THE OWNER GUARD WAS DEAD CODE, and trying to test it is what proved it. The only way to
     exercise an explicit `storeRole==='owner'` refusal is to give Merv a role the rung DOES admit
     — which removes the very thing under test. It is gone; what refuses him is that the filter is
     an ALLOW-LIST, so the honest assertion is the allow-list property itself: whatever roles exist
     on the floor, only the named ones are ever delegable. That holds for the owner, for a role
     with no name at all, and for any role a later branch invents. */
  const ROLES_ALLOWED = { 3: ['manager', 'staff'], 4: ['manager', 'am'] };
  const outside = [];
  [3, 4].forEach(r => {
    g.player.rank = r;
    g.NPCS.forEach(n => {
      if (S.delegCanAssign(n) && ROLES_ALLOWED[r].indexOf(n.storeRole) < 0)
        outside.push(g.RANKS[r] + ':' + (n.customer ? 'shopper' : String(n.storeRole)));
    });
  });
  ck('  ^ and only the named roles are ever delegable, at either rung',
     outside.length === 0,
     outside.length ? outside.join(', ')
                    : 'rank 3 admits ' + ROLES_ALLOWED[3].join('/') + ', rank 4 admits ' + ROLES_ALLOWED[4].join('/') + ', nothing else');
  /* and an invented role is refused rather than admitted by default */
  const guinea = g.NPCS.find(n => n.storeRole === 'owner') || g.NPCS[0];
  const keep = guinea.storeRole;
  guinea.storeRole = 'nightfill';
  try {
    g.player.rank = 3;
    ck('  ^ and a role nobody has thought of yet is refused, not admitted',
       S.delegCanAssign(guinea) === false,
       'posed as "' + guinea.storeRole + '" -> ' + (S.delegCanAssign(guinea) ? 'DELEGABLE' : 'refused'));
  } finally { guinea.storeRole = keep; }
  g.player.rank = 0;
  g.player.rank = 0;
}

/* ---- 3. THE WORK IS STORE WORK ---------------------------------------------------------- */
{
  const w = mk(), S = w.sandbox, g = w.g;
  w.run(9000, { ignoreGameOver: true });
  g.player.rank = 3;
  const kinds = ['grind', 'credit', 'solo', 'visible', 'social'];
  stock(g, kinds);
  const target = g.NPCS.find(n => S.delegCanAssign(n));
  const labels = (S.delegAssignMenu(target).items || []).map(i => String(i.label)).filter(l => !/^←/.test(l));
  ck('every kind of job is offered, in store words', labels.length === kinds.length,
     labels.length + ' rows');
  const leaks = labels.filter(l => OFFICE_NOUNS.test(l));
  ck('  ^ and none of them uses an office noun', leaks.length === 0,
     leaks.length ? leaks.join(' | ') : labels.map(l => l.split('—')[1].trim().slice(0, 22)).join(' / '));
  /* and the store's own vocabulary really is what is being read */
  ck('  ^ and the words come from the store\'s own table', /pallet|date-code|ad display|front end|counts/i.test(labels.join(' ')),
     labels[0]);
}

/* ---- 4. NO DUPLICATE ROWS ---------------------------------------------------------------
   DELEG_KINDS is picked at random per job, so two of a kind on the tray at once produced two
   byte-identical rows with no way to tell them apart. Reproduced deliberately. */
{
  const w = mk(), S = w.sandbox, g = w.g;
  w.run(9000, { ignoreGameOver: true });
  g.player.rank = 3;
  const target = g.NPCS.find(n => S.delegCanAssign(n));

  stock(g, ['grind', 'grind', 'solo']);
  const dup = (S.delegAssignMenu(target).items || []).map(i => String(i.label)).filter(l => !/^←/.test(l));
  ck('two jobs of the same kind are told apart', new Set(dup).size === dup.length,
     dup.join(' | '));

  /* ...and a tray of DISTINCT kinds must not gain the numbering, so the common case is untouched */
  stock(g, ['grind', 'solo', 'visible']);
  const distinct = (S.delegAssignMenu(target).items || []).map(i => String(i.label)).filter(l => !/^←/.test(l));
  ck('  ^ but distinct jobs are not numbered, so the usual tray reads as it always did',
     distinct.every(l => !/\(\d+ of \d+\)/.test(l)),
     distinct.map(l => l.slice(0, 30)).join(' | '));
}

/* ---- 5. A DELEGATE TARGET WHO LEAVES — THE INVESTMENT INVARIANT ------------------------
   Delegation is pointer-to-NPC state by nature: an assigned job holds the worker's NAME. */
{
  const w = mk(), S = w.sandbox, g = w.g;
  w.run(20000, { ignoreGameOver: true });
  g.player.rank = 3;
  stock(g, ['grind', 'solo']);
  /* ⚠️ CHECK THE PRECONDITION, OR A FAILURE HERE MEANS NOTHING. Two mutants aimed at completely
     different things both "failed" this assertion with `open -> null` during a sweep, and neither
     mutation could possibly have caused it — the target simply was not available that run.
     delegAssign refuses somebody who has gone home or is already busy, and 20,000 frames does not
     land on the same phase every time. An unexplained failure is worse than a clean one, so the
     availability is asserted first and the target is chosen from people actually on the floor. */
  /* ⚠️ AND NOT A PARANOID ONE, unless the job suits them. delegAssign lets a paranoid worker
     REFUSE a mismatched job and hand it back — real, intended behaviour — and ptype is randomised
     per run, so this section failed with `open -> null` in some sweeps and not others. Two mutants
     were credited to that noise rather than to the assertions aimed at them. The job is matched to
     the worker so the assignment is guaranteed to be accepted, and the pointer question this
     section is actually about can be asked. */
  const target = g.NPCS.find(n => S.delegCanAssign(n) && n.storeRole === 'staff' &&
                                  !n.gone && !n.wentHome && !S.delegWorkerBusy(n.name) &&
                                  n.ptype !== 'paranoid');
  ck('there is a member of floor staff actually available to hand work to',
     !!target, target ? (target.name + ' (' + S.currentPhase().name + ')')
                      : 'nobody on the floor in ' + S.currentPhase().name);
  const job = g.deleg.q[0];
  if (target) S.delegAssign(job, target);
  ck('a job can be assigned, and it holds the worker by name',
     !!target && job.state === 'assigned' && job.to === target.name,
     job.state + ' -> ' + job.to);

  const demBefore = (g.deleg.dem || []).length;
  S.npcLeaving(target); target.alive = false;
  ck('  ^ and when they leave, npcLeaving turns it into a miss rather than leaving it dangling',
     job.state === 'miss' && (g.deleg.dem || []).length > demBefore,
     'job is now "' + job.state + '", demerits ' + demBefore + ' -> ' + (g.deleg.dem || []).length);
  ck('  ^ so nothing on the tray still points at somebody who has gone',
     !g.deleg.q.some(t => t.state === 'assigned' && !g.NPCS.some(n => n.alive && n.name === t.to)),
     g.deleg.q.filter(t => t.state === 'assigned').length + ' still assigned, all to people who are here');
}

/* ---- 6. THE OFFICE IS UNCHANGED --------------------------------------------------------- */
{
  const o = createWorld(), OS = o.sandbox, og = o.g;
  o.run(9000, { ignoreGameOver: true });
  const on = [];
  for (let r = 0; r < og.RANKS.length; r++) { og.player.rank = r; if (OS.delegActive()) on.push(og.RANKS[r]); }
  ck('the office tray is still Assistant Manager only',
     on.length === 1 && on[0] === 'ASSISTANT MANAGER', on.join(', ') || 'never active');

  og.player.rank = 4;
  stock(og, ['grind', 'credit', 'solo', 'visible', 'social']);
  const ow = og.NPCS.find(n => OS.isWorker(n));
  const labels = (OS.delegAssignMenu(ow).items || []).map(i => String(i.label)).filter(l => !/^←/.test(l));
  ck('  ^ and its work is still described in office words',
     /reconcile the order backlog/.test(labels.join(' ')) &&
     /client-facing win/.test(labels.join(' ')) &&
     !/pallet|date-code|ad display/i.test(labels.join(' ')),
     labels[0]);
  ck('  ^ and it can still hand work to any worker, as it always could',
     og.NPCS.filter(n => OS.isWorker(n)).every(n => OS.delegCanAssign(n)),
     og.NPCS.filter(n => OS.isWorker(n) && OS.delegCanAssign(n)).length + '/' +
     og.NPCS.filter(n => OS.isWorker(n)).length + ' workers assignable');
  og.player.rank = 0;
  const st = o.run(20000, { ignoreGameOver: true });
  ck('  ^ and the office still soaks clean', st.throws === 0 && og.renderErrs === 0,
     'throws ' + st.throws + ', renderErrs ' + og.renderErrs);
}

console.log('deleg: ' + pass + ' pass, ' + fail + ' fail');
console.log(fail ? 'GROCERY DELEGATION: RED ❌' : 'GROCERY DELEGATION: GREEN ✅ (store work, store structure)');
process.exit(fail ? 1 : 0);
