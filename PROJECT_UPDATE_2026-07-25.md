# THE PROMOTION — Source Update

**2026-07-25**

Supplement to `PROJECT.md`, covering everything since `PROJECT_UPDATE_2026-07-15.md`. Build is now
**~8,556 lines / ~520 KB**. Everything below is committed to `main`, gated green, and pushed live.

> **Note on the base doc:** mid-span, `PROJECT.md` was **rewritten as the single source of *current*
> truth** (verified against code, not docs). It already folds in the AM delegation layer, the
> day/meeting/audit/storage schedule, the world size (1500×760), `SAVE_VERSION`, the `npcLeaving`
> convention, and the `test/gate.js` rotation. So the earlier items here are recorded briefly (they're
> in `PROJECT.md`); the **manager-role rework, the merit-route rebalance, and Test Game** — the newest
> work — are detailed in full.

---

## ✅ Ship-blocker from the last update — RESOLVED

The printer-smash meltdown was forced to 50% for testing. It's back to **`0.07` (7%)** in the
shipped build. No longer an open item.

---

## Headline: the Manager role became an active job, and the Merit route became a puzzle

The big arc of this span: the branch-manager seat went from a spectator's chair to a role with real
verbs, and the honest (Merit) path to CEO was reworked from a friendship grind into "run the floor
well for one clean day."

### The manager verbs (from the corner office)
- **Dismiss** a worker on a documented strike (`managerFire`) — floor morale aftershock; a fire you
  engineered (planted strike) traces back as suspicion.
- **Hire** — land a client on the phones for a **requisition**, then fill a seat. Hires now land
  **next day** (was two days).
- **Promote** — seat-gated, justified by **loyalty (ally)** or **merit (record)**; the menu now
  **lists every candidate** and, for the ones who aren't ready, states exactly what they're missing
  (a free chair, ally friend x/45, or record career x/28|55).
- **Demote** (new) — discretionary, one rung down, **only if a chair is open below** (blocked
  otherwise); stress + mood hit on the worker, **no suspicion** (a management call, not sabotage),
  no floor-wide aftershock.

### HR freeze at Manager
While you're the Manager, **HR stops moving people on its own**: no rivals auto-climb, no open chair
auto-fills, and a vacated desk (from a fire, demotion, or promotion) is **not auto-backfilled** — you
hire to fill it, or it sits empty (and drags branch health). Below Manager the autonomous churn is
unchanged. Every headcount move is yours. *(Phase-0 measurement: at Manager the autonomous vacancy
rate is 0/day — every seat is player-opened.)*

### `youTier(MANAGER) = -1` — a Manager is not a senior chair
`youTier` returned 2 for a Manager, counting you as a 4th occupant of the 3 senior chairs. On
becoming Manager, `refreshRanks` then demoted a real senior to bring the tier back to cap (an
unwanted "X is back down to SALES/JUNIOR"), and the org panel showed a phantom **4/3**. Manager/CEO
now return −1 like Assistant Manager. *(This fixed a real one-time demotion + the panel; it is NOT
the separate hiring-flicker churn — see Open Items.)*

---

## The Merit-route rework (Phase 0 → three branches, in order)

Verified first: branch health's only **above-base** levers were mood + allies (friendship) + revenue;
every "run the floor" term was purely subtractive — so the Merit route was a friendship grind
(premise confirmed before building).

### Branch 1 — health measures how the floor RUNS
`branchHealth` inverted. **Stress is the engine** now:
```
40 + (100 − avgStress)×0.42  − broken×8 − feuds×8 − vacant×6 − strikes×5 − meltdowns×12 − fired×16 + revenue
```
Friendship and mood are **no longer measured** — a calm, full, feud-free floor scores **~77–80 with
zero friendship**. `healthBreakdown`/legibility panel/`t_legibility` updated to match.

**Friendship demoted to leverage** (it still matters, differently): **mediation** ("Sit them down")
now lands reliably between people who trust you and can **fail outright** with someone who doesn't; a
new **"suggest they take five"** verb eases a trusting worker's stress but **backfires on a paranoid
who distrusts you** ("building a case"). Existing friendship jobs (allies look away, favours,
delegation acceptance) untouched.

### Branch 2 — hiring depth (a candidate slate per seat)
Filling a player-opened seat is a decision now. **"Hire for an empty desk…"** opens a slate of **3
candidates**, each a résumé line that *gestures* at a hidden personality (never states it — a new
hire is intel you don't have, so they **arrive unprofiled**). You can:
- **Ask someone here who knows them** (reuses the intel grammar) — reveals their type and any bad
  blood; an **ally vouches** → the hire settles in fast (mood/stress boost).
- Gamble blind — ~1/3 of candidates carry **bad blood with a named worker** → hire one and it can
  **flare into a feud on day one** (worse than the vacancy — the teeth).
- **Hold the seat open** — the empty desk costs **−6 health/day**, so "take who's here vs. wait for
  better" is a real, priced call.

New saved state (the chosen candidate rides the pending hire) → **`SAVE_VERSION` bumped 2→3**. Also
fixed a latent bug: pending hires now carry a stable `deskIdx` and re-link on load (the desk object
was deep-copied junk after a save). A candidate's feud-target is a player-held reference to a named
worker → added to the **investment invariant** and swept by `npcLeaving`.

### Branch 3 — the Merit gate
Changed from **"hold health ≥ 70 for 3 days"** to **"reach 80 for one day."** `MERIT_TARGET` 70→80,
`MERIT_DAYS` 3→1. Judged at the **day boundary on the all-day average** (`healthToday` in
`scoreTheDay`), so a **burst doesn't count** — you have to keep the floor in order through the day.
THE WAY UP / Paths / top-bar meter text updated.

> **Balance flag:** on the current numbers, **80 came out on the easy side** — a calm, feud-free
> floor with a client or two clears it without much active management (it even auto-won inside a
> test). The **80 is a one-line dial** (`MERIT_TARGET`); likely wants a nudge to ~85 after TV feel.

---

## AM Delegation Layer (Milestone D1) — the Assistant Manager's own verb
Assistant Manager stopped being a duplicate of the Manager→CEO health hold. AM's merit verb is now
**getting work done through other people**:
- A per-phase **delegation tray** (jobs arrive 2/2/2/3 across work phases at rank 4).
- **Assign** by walking to a worker; the fit is **intel-gated** (profile them first).
  `DELEG_MATCH = {grind:zealot, credit:climber, solo:paranoid, visible:peacock, social:socialite}`.
  Mismatches fail **in character** (climber steals credit, paranoid refuses, zealot botches with
  stress, peacock/socialite silently miss).
- **12 clean completions** → Dale is "failed upward" and the Manager chair opens. Demerits route to
  the **boss/slack channel** (note → write-up → streak reset), never HR suspicion, never a demotion.
- **Delegation legibility:** the tray and the assign menu now **name the personality each job suits**
  ("GRIND — reconcile the order backlog · for a Zealot · good fit"), the mapping always shown; the
  per-worker fit stays intel-gated.

---

## The `npcLeaving(n)` convention + investment invariant
One hook every removal path calls (fire, promote-away, Dale upstairs): it sweeps every dangling
investment the player held against a departing NPC — prank build, dirt, coerced missions, delegated
jobs, championed status, rival flag, Dale's arc, **and now pending-hire bad blood** — closing each
with a feed line and **no payout** (a departure is never profitable). A **harness invariant** asserts
it: after any removal, no player-held state may reference a gone NPC.

---

## Legibility / UX / QoL (smaller, shipped)
- **Intern → Junior Sales now moves the player's desk** (it used to short-circuit — both are tier 0).
- **Overnight decay:** player suspicion **and** stress each **halve** at the rollover (was −10 flat /
  no stress relief) — a night's sleep, not a clean slate.
- **NPC head-mark** (the profiled personality letter / ★ / +) got a **dark outline + brighter fill**
  so it reads on the pale carpet.
- **Merit meter in the top bar** — shows branch health toward 80 + the good-days streak from the
  moment you're Manager, so the Merit route is visible from the start (not only when the promotion
  bar maxes).
- **Journal scroll on the TV** — the **d-pad now scrolls** the Paths/Org/People/Leverage/Log tabs on
  a controller (only the analog stick did before, so the Paths list was unreachable on the couch).
- **Fetch/friendship mission delivery fixed** — the Deliver / intel "Report back" options checked a
  **frozen build-time snapshot**; they now check live inventory/profiled at click time (you could
  grab the stapler and still be told you needed one).
- **Rank soundtrack** — a playlist per rank, all 7 ranks now covered, switched on promotion, with a
  "now playing" banner. Magenta color-key hardened against blank Xbox canvas readbacks.
- **Rumour / leverage / social legibility** — the three gossip verbs consolidated under one block;
  choose *who* a rumour is about and *which* document to frame/plant/snitch (shared `pickDocument`
  picker); leverage chips show source + strength + a distinct glyph for the CEO endgame file;
  messenger/carrier rules fixed.
- **Branch health set-dressing fix** — the four decorative surplus desks are reserved so they stop
  docking health as "empty."

---

## Dev tooling: Test Game
The main menu is now **Continue / New Game / Load Game / Test Game / Settings**. **Test Game** → pick
**INTERN … MANAGER** → a pristine round that drops you in at that rank and skips the intro, so
endgame features are reachable without grinding up. `jumpToRank()` uses the real office/desk plumbing,
so the seat model stays consistent. **Assistant Manager** keeps Dale (loyalty route testable);
**Manager** has Dale gone + the corner office + `mgrGone` (merit + catfish testable). It's
**ephemeral** — a Test Game never autosaves, so it can't clobber a real slot. (`jumpToRank` is
harness-callable — future tests can reach any endgame state in one line.)

---

## Docs & tests
- **`PROJECT.md` rewritten** as the single source of current truth (corrected: world 1500×760,
  `SAVE_VERSION`, repo `thepromotionv3`, D1 delegation, `npcLeaving`, printer-50% resolved, roadmap).
- **`test/gate.js`** is the pre-merge runner — now **25 tests** (`node test/gate.js`), soak last.
  `SAVE_VERSION` is at **3**.
- **New §5 rule:** any new player-held state pointing at a specific NPC goes in the investment
  invariant list in the same commit that introduces it.
- **Loyalty → CEO route verified end-to-end** through the real functions (not flag-setting). Finding:
  the arc *opens* the CEO gate but doesn't fill the promotion bar, so a low-rank player lands at
  Assistant Manager and must still climb — a **promise/delivery mismatch** logged in `PROJECT.md` §8
  (options: reword the beat-16 text / self-complete like catfish / leapfrog to Manager).

---

## Open items / balance to watch
- **Merit target 80 may be too easy** — dial after TV feel (likely ~85). One line (`MERIT_TARGET`).
- **The hiring "flicker" churn** (nameplates blinking vacant↔name, new hires jittering *while hiring
  a bunch*) is **still unreproduced** in the harness. The `youTier` fix cleared an *adjacent* bug,
  not this. Needs exact repro steps or a screen recording.
- **Loyalty→CEO promise/delivery mismatch** (above) — Kyle's design call, awaiting a playtest.
- **Xbox meltdown-music** — still open, needs a real-device test (unchanged).
- **Old `V*index.html` snapshots** clutter the repo root — harmless, could move to `/archive`.

---

## Unchanged
§2 architecture, §4 save model (now v3), §5 harness discipline (still the law — run `node
test/gate.js` before merging), §7 Electron plan, §9 hosting, §11 workflow. The gas-station tutorial
level remains the big parked roadmap item. All changes bot-verified: full gate + placement lint +
save round-trip clean.
