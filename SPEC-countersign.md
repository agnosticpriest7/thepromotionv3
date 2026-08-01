# SPEC — Senior Sales: "Countersign a junior's order"

**Status: BUILT 2026-08-01** and gated. **Rank 3 (SENIOR SALES).**
Kyle's calls on the open questions are folded in below (marked **DECIDED**); the rest of the
document is the spec as written, kept so the reasoning survives. Read alongside `PROJECT.md` §3 "The AM delegation layer" — this deliberately
borrows that grammar.

---

## 1. The problem, measured

Rank 3 has **no verb of its own**. Searched the build: `SENIOR SALES` appears in exactly two
mechanical places —

- `youTier()` → returns `2`, i.e. it grants a senior chair (`SEATS={2:3}`, three of them), and
- `yourStanding()` → a flat `+6`.

That is the entire rank. It is a seat and a number.

Then **rank 4 arrives with the whole delegation layer at once**: a tray filling 2/2/2/3 per work
phase, an intel-gated five-way match (`DELEG_MATCH`), five distinct outcome branches, a rolling
two-day escalation ladder, and a 12-completion gate (`DELEG_TARGET`). That is the cold drop this
spec exists to soften.

**Design goal:** teach the delegation *read* — "this kind of work suits this kind of person" — one
person and one decision at a time, a rank early, with no gate attached.

**Non-goal:** a second grind. Countersigning must never become a target to farm, and must never
gate a promotion. If it feels administrative, it has failed and should be cut.

---

## 2. The verb

A junior leaves an order on their desk that needs a senior's signature. You walk over. Two choices:

> **Countersign it** — it goes through as-is.
> **Send it back** — they rework it.

The whole design is that **which choice is right depends on who wrote it**, using the *same table*
delegation uses later:

```js
DELEG_MATCH = {grind:zealot, credit:climber, solo:paranoid, visible:peacock, social:socialite}
```

An order carries a `kind` from those same five. The order is **sound** when the work suited its
author (`DELEG_MATCH[kind] === junior.ptype`) and **flawed** when it didn't — a Peacock asked to
grind quietly cuts corners; a Paranoid put on something social hedges it into uselessness.

So the player learns the exact map they will need at AM, but the decision is **binary**, not a
five-way assignment against a queue.

### Intel gate

Same convention as pranks and delegation. If `!junior.profiled` the menu reads **"unread"**, exactly
like `planPrank`.

**DECIDED (Kyle): an unprofiled call is NEUTRAL, for testing.** It costs nothing, pays nothing, and
scores nothing, and it says so ("Signed blind — no effect. Read them first."). The reasoning: unlike
a prank you cannot profile at leisure first, because an order lapses at the end of the block — so
charging for a coin-flip read as punishment rather than tension. The 2×2 below therefore applies
**only when you have read them**. Easy to make punitive later: delete the `blind` early-return in
`cosignDo`.

### The 2×2

| | **Countersign** | **Send it back** |
|---|---|---|
| **Sound order** | ✅ correct — `+COSIGN_PROG` progress, junior mood **+4** | ❌ you rejected good work — junior `friend −6`, mood **−8**, no progress |
| **Flawed order** | ❌ it comes back on you — `player.prog −COSIGN_PROG`, boss-channel note | ✅ correct — `+COSIGN_PROG` progress, junior stress **+5** (they redo it) |

Both wrong answers cost something *different*: signing bad work costs **your standing**, rejecting
good work costs **the relationship**. That asymmetry is the lesson — it is the same trade delegation
makes when you hand a Zealot the wrong job (botch, +18 stress) versus a Climber (credit theft, no
merit). Neither is free, and the player should feel that before the tray arrives.

**Penalties route to the boss/slack channel, never HR suspicion.** Identical to `delegDemerit` —
countersigning badly is *bad management*, not *wrongdoing*, and TP's architecture keeps those
channels separate. This is a hard rule, not a preference.

---

## 3. Who counts as a junior

Anyone whose desk `tier` is **below** the player's. At rank 3, `youTier()` is `2`, so juniors are
the tier‑0 and tier‑1 desks — 11 and 8 of them respectively, so the pool is never empty.

Derive it; do not hardcode a name list (`CLAUDE.md` §14). `desks.filter(d => d.owner && d.tier < youTier())`
and resolve the NPC from the owner, so a re-tiered floor can't rot it.

**Excluded:** `deskbound(n)` (Ravinder), HR, the boss, the receptionist, the manager, anyone
`gone`/`wentHome`, and anyone with `noFeuds(n)` — the same exclusions the rest of the worker verbs use.

---

## 4. State

```js
career.cosign = {right:0, wrong:0, today:0}     // additive counters, persisted
n.order = {kind, day, phase}                    // EPHEMERAL — never saved, cleared at day roll
```

**Save impact — recommendation: no `SAVE_VERSION` bump.** `n.order` is ephemeral (cleared by
`delegRollDay`'s sibling at the day boundary), and `career.cosign` is purely additive with a safe
`||0` default on load. That matches the precedent already set for `player.char` and `cand.guest`.
**But this is Kyle's call** — the standing rule in `CLAUDE.md` §5 is that a schema change bumps the
version and old saves refuse to load. If he wants the strict reading, bump to `SAVE_VERSION = 5`.

---

## 5. Lifecycle (mirrors the `deleg*` naming so the two read as one family)

| Function | Does |
|---|---|
| `cosignActive()` | `player.rank===3` — the verb exists only at Senior Sales |
| `cosignArrive()` | at the start of a work phase, **at most `COSIGN_PER_PHASE`** juniors get an `order` |
| `cosignSound(n)` | `DELEG_MATCH[n.order.kind] === n.ptype` |
| `cosignDo(n, approve)` | applies the 2×2 above, clears `n.order`, bumps `career.cosign` |
| `cosignExpire()` | at phase end, unsigned orders lapse — **no penalty**, just gone |
| `cosignRollDay()` | clears every `order`, resets `today` |

**Expiry is deliberately free.** Delegation punishes an unhanded job (0.5 demerit) because
administering the tray *is* the AM's job. At Senior Sales the countersign is an opportunity, not a
duty — punishing a missed one would make rank 3 feel like rank 4 with worse tools, which is the
opposite of the intent.

**Arrival must announce itself** — the same standing lesson as Dale's "D": a mechanic the player
can't see isn't a mechanic. A feed line (`logLine`) plus the existing green "!" marker over anyone
holding something for you (already built for favours) is enough. No new HUD.

---

## 6. UI

**DECIDED (Kyle): the order gets a visible artifact.** `drawOrderPaper(d)` draws a small ruled sheet
with a gold signature band on the desk — canvas-drawn rather than a sprite, so it needs no PNG and
cannot be mistaken for the `note` loot item. Swap in art later if it wants any.

*Placement took three attempts and the reason is worth keeping:* it is anchored to the desk **sprite**
(`cx`, `cyB`, `ART_W`), not the collision box — measured on Priya's desk the box is 97 wide at x1500
while the drawn desk is 58 wide centred at 1548, so "box right edge" is 20px clear of the furniture
and the sheet floated on the partition. Two on-the-desktop placements then failed because every desk
art puts its clear space somewhere different (a spot that is empty on `cubicle_desk_right` lands on
the drawer stack and clips the name plate on `cubicle_desk`). It now sits in the band just above the
sprite, which is empty on all of them and is already where this game draws its rigged / planted /
loot markers. The owner lookup is guarded by `cosignActive()`, so it costs nothing at any other rank.

One row on the **junior's worker menu**, beside "Delegate a job…" / "Plan a prank on them…":

```
Countersign their order (Peacock)…      ← profiled
Countersign their order (unread)…       ← not profiled
```

opening a two-item submenu (**Countersign** / **Send it back**) plus Cancel. It reuses `renderMenu`
and needs no new UI surface.

Do **not** add a tray, a panel, or a checklist. The absence of an inbox is the point: at rank 3 the
work comes to you one piece at a time and you walk to it. The tray is what makes AM feel different
when it arrives.

---

## 7. Tuning dials

| Constant | Proposed | Note |
|---|---|---|
| `COSIGN_PER_PHASE` | **1** | one order per work phase, so ~4/day. Raise only if it feels sparse. |
| `COSIGN_PROG` | **2** | same magnitude as `finishBusywork`'s +2 — a nudge, not a route. |
| `COSIGN_DAILY_CAP` | **3** | hard anti-farm cap on scored orders per day (`career.cosign.today`). |
| friend/mood/stress deltas | −6 / ±8 / +5 | small, in line with existing worker verbs. |

At 2 progress × 3/day capped, countersigning contributes at most ~6/day toward a 100-point bar —
visible, never a shortcut. **Check this against the rank‑3→4 bar before building**; if it clears more
than ~15% of the rung per day, cut `COSIGN_PROG` to 1.

---

## 8. Test plan

New `test/t_countersign.js`, registered in `gate.js`. Assert **contracts, not coordinates**
(`CLAUDE.md` §14), and **pose the floor** rather than playing into it (§15 — a bare `createWorld()`
sits in the frozen day‑1 intro with 17 of 19 workers parked at `(-400,-400)`; use
`w.startNewGame(0)` for a live loop and set `arrived=true` when posing).

1. **Rank gate** — `cosignActive()` is true at rank 3 and false at 0/1/2/4/5/6.
2. **Junior pool derives from tiers** — every candidate has `tier < youTier()`; re-tier a desk and
   the pool follows. No name literals in the test.
3. **Exclusions hold** — Ravinder, HR, boss, receptionist, manager never receive an order.
4. **The 2×2 pays out correctly** — force each of the four cells and assert the sign of every delta.
5. **Penalties never touch suspicion** — `player.suspicion` is unchanged across all four cells.
   *(This is the one most likely to regress and the most important to hold.)*
6. **Anti-farm** — past `COSIGN_DAILY_CAP`, further correct calls add no progress.
7. **Expiry is free** — let orders lapse for a full day; `player.prog` and the boss channel are untouched.
8. **Save round-trip** — `career.cosign` survives; `n.order` does not (and its absence is harmless).
9. **Prove it bites** — invert `cosignSound` and watch case 4 go RED before trusting any green.

---

## 9. Questions — resolved and outstanding

1. ~~**Visible artifact?**~~ **DECIDED: yes** — see §6. Canvas-drawn, no PNG needed.
2. ~~**Blind signing?**~~ **DECIDED: neutral, for testing** — see §2.
3. ~~**`SAVE_VERSION`?**~~ **Built additive, no bump.** `career` is cloned whole into the snapshot
   and restored with `Object.assign`, so `career.cosign` rides along and an old save simply keeps the
   default. One consequence found while testing and fixed: the NPC objects are `Object.assign`-ed
   onto the live cast, so a field the snapshot never carried is *left alone* — a stale order (and its
   paper) outlived a load. `applySnapshot` now clears them. `t_countersign` asserts both halves:
   the tally persists, the orders do not.
4. **STILL OPEN — is the 2×2 too tidy?** It could take a third verb ("sign it and put your own name on it" — the
   Climber move, stealing a junior's credit for real progress at a friendship cost). That would
   foreshadow the AM climber-credit-theft branch. It is also scope; flagged, not specced.

---

## 10. What it cost (was: estimate)

As predicted — small. It reuses `DELEG_MATCH`, `n.profiled`, `renderMenu`, the phase-boundary hooks that
`delegArrive`/`delegExpireDue` already fire on, and the boss/slack penalty channel. No new UI
surface, no new art (pending Q1), no nav or geometry work — so the placement linter is not in play
and the risk is confined to game logic the gate already covers.

The real cost was the test file, and one thing the estimate missed: **the first version of the test
did not bite.** It derived "sound" by asking `cosignSound()` itself, which read as the tidy
non-duplicating choice and was wrong — inverting `cosignSound` in the build left the whole suite
GREEN, because the poser and the thing under test moved together. The mapping is the spec, so it is
now hard-coded in the test as an independent oracle (§14) and checked over all 25 kind × personality
combinations. Verified by mutation: the inverted build fails 7 assertions.

Tuning was checked against the bar as the spec asked: at `COSIGN_PROG=2` and a cap of 3 a day, this
contributes at most **6 points of a 100-point bar per day** — against +8 for a task and +2 for
busywork. Visible, never a shortcut. Left at those values for Kyle to judge in play.
