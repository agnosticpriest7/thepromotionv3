# THE PROMOTION — Project Source & Handoff

A satirical office-life simulation game. Single-file HTML/JS/Canvas. Built gamepad-first
for TV/console play, now also runs on desktop (keyboard/mouse) and mobile (touch).

**Logline:** You're an intern at Paper Supply Co. Climb to CEO. There are three ways up,
and only one of them won't get you fired.

**Tone:** *The Office* meets *The Escapists 2*. The satire is load-bearing — the honest path
is the hardest one, and that's the point.

> **This file is the single source of *current* truth.** Where it disagreed with the code, the
> code won and this file was corrected (last verified against `index.html` on 2026-07-25). The
> `HANDOFF-*.md` files are the historical record — read them for *why* a thing changed, not for
> what the game currently does. When they conflict with this file, this file is newer.

---

## 1. Current State (as of this writing)

- Working, playable build: a single `index.html` (**~8,315 lines, ~500 KB**).
- Hosted on **GitHub Pages** at the repo root as `index.html`. Repo is **`thepromotionv3`**
  (`agnosticpriest7`), **public** (Pages requires public on the free plan; see §9).
  Live at **https://agnosticpriest7.github.io/thepromotionv3/**. Push to `main` = deploy.
- **Tested and working on:** TV/console browser (gamepad), desktop (keyboard/mouse),
  and mobile (Chrome, touch).
- All three CEO win-paths have been bot-verified end-to-end through the real gate functions
  (see §5).

### Directory layout in the repo
```
/index.html                      <- THE GAME. This is what Pages serves.
/V*index.html                    <- old version snapshots. Harmless (Pages ignores them),
                                    but they pile up. Could move to /archive someday.
/Art/sprites/*.png               <- all art assets (lowercase, underscores — case matters!)
/Art/sprites/title_bg.png        <- title screen background (1920x1080)
/Music/*.ogg, *.mp3              <- soundtrack (dual-format; see §8 for the Xbox mp3 issue)
/Sound/printersound.ogg          <- SFX
/test/                           <- headless harness + test suite (see §5). NOT shipped.
/PROJECT.md                      <- this file (current truth).
/HANDOFF-2.md … HANDOFF-6-*.md   <- historical session records.
```

---

## 2. Architecture

Everything lives in one HTML file: markup + CSS + one big `<script>` block. No build step,
no dependencies, no framework. It runs by opening the file.

- **Rendering:** HTML5 Canvas, immediate-mode. One `loop(now)` driving update + render via
  `requestAnimationFrame`.
- **World scale:** `const S = 1.8` — everything authored at **1500×760** then scaled up for the
  art: `const W = Math.round(1500*S)`, `H = Math.round(760*S)` → **2700×1368** at runtime.
  (The east side was widened from 1400 to 1500 for more sales + senior-sales room; PROJECT.md
  previously said 1240×760 — stale.) Landmark/room/route coordinates are authored in the small
  space and multiplied by `S` at runtime by `scaleWorld()`. **If you add anything with fixed
  coords, it must be authored in the 1500-space and scaled.**
- **Time:** a day runs `DAY_START = 8*60` (8:00am) to `DAY_END = 17*60` (5:00pm) at
  `MIN_PER_SEC = 0.9`. `clock` is in minutes. The day is subdivided into a fixed phase
  schedule — see §3, "The day (the metronome)."
- **Pathfinding:** A* on a nav grid (`buildGrid()`, `astar()`, `walkableAt()`). Grid blocks on
  walls, desks, blockers, and sealed zones. **The desks are ground truth** — if code and the
  grid disagree about a desk, rebuild the grid.
- **Input:** three schemes, all live at once — keyboard (WASD/arrows/E/Tab/Enter/Esc),
  gamepad (`pollGamepad`, standard mapping: A=0, B=1, Start=9, d-pad=12–15), and touch
  (on-screen d-pad + action button, shown via `@media (pointer:coarse)`).

### Boot / screen flow
`boot()` → title screen (world frozen) → menu → `startGame(slot, fresh)` → play.
State machine variable is `screen` ('title' | 'menu' | 'play'). The main `loop()` and
`pollGamepad()` both branch on `screen` and don't tick the world until 'play'.
- **New Game** reloads the page (for a pristine world) and resumes into the chosen slot via
  a `localStorage` flag `promo:newgame` read by `boot()`.
- **Menu items and the title screen are DOM** (crisp at TV distance and tappable on mobile).

---

## 3. Core Game Systems

### Ranks (the ladder)
`RANKS = [INTERN, JUNIOR SALES, SALES, SENIOR SALES, ASSISTANT MANAGER, MANAGER, CEO]`.
Gate logic lives in `gateFor(nextIdx)`; a promotion needs `player.prog >= 100 && gateFor(next).ok`.

- **INTERN → JUNIOR → SALES → SENIOR SALES** are gated on **seat vacancies** — a chair in the
  target tier must open (a rival fired or promoted away, `seatsFree[t] >= 1 || reserved[t] > 0`)
  and you must win the requisition.
- **ASSISTANT MANAGER** is gated on **Dale's favour**: `career.daleFavor >= 2 || dale.favor >= 30`.
  Not a seat — you earn it by humouring Dale or running his errands.
- **ASSISTANT MANAGER → MANAGER** is gated on `career.mgrGone || dale.titled`. As of the D1 AM
  delegation layer, `career.mgrGone` is set by **delegation** (see below), *not* by a branch-health
  hold. The two old redundant rank-4 health-holds (`daleFailsUpward` and the `scoreTheDay` rank-4
  branch, at the old DALE_UP/DALE_OUT targets) were **removed**. `dale.titled` is the fake title
  from Dale's arc (step ≥ 12); `mgrGone` is also set if Dale is removed (strikes / reported out).
- **MANAGER → CEO** is gated by `career.meritReady ? ok : career.vpFavor >= 1`. Any of the three
  endgames can open it — the merit hold sets `meritReady`; the loyalty and catfish endings set
  `vpFavor`.

### The AM delegation layer (Milestone D1 — the reason AM is its own job)
Assistant Manager's merit verb is **getting work done through other people** — deliberately *not*
a duplicate of the Manager's branch-health hold. It only runs at rank 4, until the chair opens
(`delegActive() = player.rank===4 && !career.mgrGone`).

- **State:** `deleg = {q, done, dem, seq, esc}` (in the save snapshot; SAVE_VERSION 2).
- **Jobs arrive** 2/2/2/3 per work phase into the delegation tray (`delegArrive`), one per worker.
- **Assign** by walking to a worker ("Delegate a job…" on their menu). Reading the right worker for
  a job is **intel-gated** — you must have profiled them (`n.profiled`).
  `DELEG_MATCH = {grind:zealot, credit:climber, solo:paranoid, visible:peacock, social:socialite}`.
- **Outcomes** resolve at phase end (`delegExpireDue` → `delegResolve`):
  - **match →** clean completion (`deleg.done++`), the worker gets a small mood lift.
  - **zealot mismatch →** botch: +18 stress on the worker, **1.0** demerit.
  - **climber mismatch →** steals credit: completes, but **no merit** (and no demerit).
  - **paranoid mismatch →** refuses at assign: job back to the tray, **−10** friendship.
  - **peacock / socialite mismatch →** silent miss: **0.5** demerit.
  - **never handed out →** expiry miss: **0.5** demerit.
- **The gate:** `DELEG_TARGET = 12` clean completions → `delegMeritMet` → `dalePromotedUp` →
  `career.mgrGone` (the Manager gate opens; delegation goes dormant). Fiction: the floor runs so
  well without you that Dale gets promoted upstairs and you inherit the chair.
- **Demerits route to the BOSS/slack channel, never HR suspicion.** Escalation runs on a rolling
  **2-day window** (`delegWindow`, `delegEscalate`): `DELEG_NOTE = 1.0` (note → `player.prog −(rank−1)*3`),
  `DELEG_WRITEUP = 2.0` (write-up → `player.prog −(rank−1)*6` — **a reprimand, not a demotion**;
  the literal discipline path would `setRankDown` and kick you off AM, which inverts the escalation,
  so write-up is deliberately a heavier prog dock instead), `DELEG_RESET = 3.0` (streak wiped).
  `deleg.esc` tracks the stage and is saved.
- Bad delegation **stresses the workers**, degrading the floor — which then makes the later
  Manager→CEO branch-health hold harder. The two merit tests chain by design.

### The three paths to CEO
1. **MERIT (honest):** reach MANAGER, then hold **branch health ≥ `MERIT_TARGET` (70) for
   `MERIT_DAYS` (3) days**, which sets `career.meritReady`, then the board promotes you
   (`ceoByMerit`). *This is the hard path by design.* (See §8 — no confirmed human clear yet.)
2. **LOYALTY (Dale's arc):** complete Dale's 16-beat suck-up storyline (`DALE_ARC`). At step ≥ 12
   you get a fake title (`dale.titled`); the arc's payoff sets `vpFavor` and recommends you. If you
   finished below Assistant Manager, the recommendation leapfrogs you up to AM so it isn't wasted.
   **Collision case:** if the *delegation* gate promotes Dale upstairs while his arc is mid-flight,
   the arc now **closes gracefully** via `npcLeaving` (feed line, `dale.active → false`, **no**
   consolation payout — `dale.done`/`vpFavor` untouched, so it never becomes a CEO shortcut). A
   richer "hold the gate and choose" treatment (Dale's "D") is still TODO on top of this default.
3. **SABOTAGE / LEVERAGE (catfish):** Manager-gated. Email Sterling from **3 different coworkers'
   machines** (`sendCatfishEmail` enforces the 3-machine rule; `usedDesks` stores the names), pull
   the replies from the HR files with a keycard, then confront Sterling. Two endings: quiet
   succession or leak-to-press. The catfish dossier is **resilient** — if a coworker whose machine
   you used leaves, the progress is count-based and Sterling-anchored, not a dead-end.

### The day (the metronome, the stash-threat, and the windows)
*(This layer was built and live but undocumented in earlier PROJECT.md versions — folded in from
HANDOFF-3 Part A, times re-verified against the current `PHASES`.)*

**A fixed 10-phase schedule** (`PHASES`, `currentPhase()`, `isWorkPhase()`). The floor's
population physically shifts by phase — seats clear and re-assign at breaks/meeting/lunch
(`clearSeats`, `assignSeats`):

| Phase | Time |
|---|---|
| Clock-In | 8:00–8:30 |
| Regular Work | 8:30–9:35 |
| Morning Break | 9:35–10:00 |
| **Meeting** | **10:00–10:45** |
| Regular Work | 10:45–11:50 |
| Lunch / Break | 11:50–12:45 |
| Regular Work | 12:45–13:50 |
| Afternoon Break | 13:50–14:15 |
| Regular Work | 14:15–16:30 |
| Clock-Out | 16:30–17:00 |

The break/lunch phases are de facto **opportunity windows** — the bullpen thins out. Only
`Regular Work` phases run the boss's slacking cone and roll your task list.

**Meeting attendance (10:00).** Two ways to get credit (`meetingCredited` / `phaseCred['Meeting']`):
- **Be there:** `checkMeeting()` credits proximity to the conference table (+promotion, −suspicion).
- **Take notes at the whiteboard:** more progress, and you're licensed to slip out early while
  everyone else is seated ~40 minutes — the alibi and the heist window are the same act.
- **Miss it:** `missMeeting()` (~ln 4208). **Currency corrected** (HANDOFF-3 Part C(a) landed):
  a miss no longer routes suspicion. INTERN/JUNIOR are ignored; at SALES+ the first miss docks
  **promotion progress**, rank-scaled `(rank−1)*3` (SALES −3 … MANAGER −12); a **second** miss in a
  run triggers `triggerDiscipline()` (a write-up) and resets the two-strike clock. Boss's domain,
  not HR's.

**Audit / shakedown (the stash-threat).** `scheduleAudit()` arms one audit/day at a random time
9:00–15:30; `triggerAudit()` picks a target — 55% a visibly-struggling worker, else a **planted**
desk ("anonymous tip"), else a random owned desk **which can be yours**. `resolveAudit()`: your
drawer's loose contraband is seized (+suspicion); a framed planted item costs more; **behind-the-
panel is never found** (its whole purpose). On an NPC's desk, a half-built prank of yours **traces
back to you**; planted evidence strikes the owner and does not.

**Three-tier desk storage (contraband management).** Every prank kit / leverage document lives in
one of three places, each with a different failure mode: **POCKETS** (`INV_CAP = 8`, safe from a
desk audit but a write-up turns them out), **DRAWER** (`DRAWER_CAP = 6`, first place HR looks, an
audit takes everything in it), **BEHIND THE PANEL** (`HIDDEN_CAP = 4`, HR never finds it but it
holds little and is slower to reach).

**Fire drill + manual alarm (windows).** `scheduleDrill()` — 18% chance/day, random 9:00–15:00 —
evacuates the floor ~16s ("not your doing"). `pullAlarm()` — the player-pulled fire alarm clears
the whole floor; while an alarm is active HR is **distracted** (`distracted`), the intended cover
for lifting the HR keycard (pulling it in HR's sight is its own risk).

### Personalities & pranks
- 5 personality types, randomly assigned each run:
  `PTYPES = [zealot, climber, paranoid, peacock, socialite]`.
- **Intel is a mandatory prerequisite** to prank effectively — you must profile a target
  ("Watch how they work") before their signature prank lands. Misclassification produces
  personality-dependent outcomes, not a uniform penalty.
- Prank types: stain, mislabel, gaslight, image, memo, violation, expose, well, calendar, plus
  per-type "master" pranks (`m_zealot`, etc.). `SIGNATURE[ptype]` maps a personality to the pranks
  that ruin them.
- **Two terminal prank outcomes:** stress toward meltdown, or HR/boss trouble.
- Stress ≥ 100 triggers `meltdown()`. Diminishing returns per prank type
  (`prankResist`, `bored = 0.45^seenThis`) — you can't spam one prank to a meltdown; you need
  their signature plus a couple others (~4 well-chosen pranks). See §6 for the tuning.
- **The printer-smash homage** is a rare meltdown variant: `n.printerMode = Math.random()<0.07`
  (7% of meltdowns). *(This was forced to 50% for testing at one point — that ship-blocker is
  RESOLVED; the value is back to 0.07 in the shipped build.)*

### Rumours (leverage → social attack)
Talk to any worker (the **messenger**) → "Spread a rumour (pick who it's about)…" → submenu of
everyone else (the **subject**). `dirtOn(subject)` (any leverage) → 100% and the dirt is **spent**;
no dirt → 40% and a weaker bite. A messenger loyal to the subject **backfires** (telegraphed); a
rival/feuding messenger carries it 1.3×. (`pickRumorSubject` / `spreadRumorAbout`. The old
`plantGossip` / `spreadGossip` are dead code.)

### Detection (cones, not circles)
- **HR** hunts wrongdoing; the **boss** hunts absence/slacking. Both use cone-based detection.
  The boss's cone mechanically necessitates honest work as cover for sabotage.

### World autonomy
- No fixed countdown timer. Rivals climb independently and can be fired by emergent drama
  (feuds, meltdowns, strikes) before the player acts. Feuds drag branch health and only clear
  when the player mediates them ("sit them down").

### When an NPC leaves mid-investment (the `npcLeaving` convention)
The world can remove a person the player has been investing against (fire, promote-away, Dale
upstairs). **One hook, `npcLeaving(n)`, is the single path every removal calls** (`fireNPC`,
`promoteRivalAway`, `removeDale`, `dalePromotedUp`). It sweeps every dangling investment —
prank build, dirt/leverage, coerced missions, delegated jobs, championed status (`career.championed`),
rival flag, Dale's arc — and closes each with a **feed line and no payout** (an NPC leaving must
never be profitable). This replaced five bespoke per-path cleanups. Endgame removals are skipped.
Durability is enforced by a test invariant, not discipline — see §5.

---

## 4. Save System (3 slots)

- **`Store`** object is the only code that touches `localStorage` (keys `promo:slot:N`).
  This is deliberate — see §7 (Electron). Swap `Store` and everything else follows.
- **Autosave at the 5pm day boundary only** (`nextDay()` → `autosave()`). The world is
  quiescent there — no prank mid-build, no NPC mid-path — which is why restores are clean.
  Anywhere-save was rejected precisely because those live-object-graph states corrupt.
- **Snapshot by value, rebuild derived state on load.** `buildSnapshot()` serializes plain
  data (player, NPCS, desks, dale, career, catfish, tasks, favors, missions, pendingHires,
  scheduler, **and `deleg`** — the AM delegation state). `applySnapshot()` restores values then
  regenerates everything derived (paths, goals, seats, nav grid). **Desks stay ground truth;
  nothing derived is saved.**
- **Versioned** (`SAVE_VERSION = 4`, verified against `index.html` 2026-08-04 — this line said `2`
  for several versions and was wrong; `HANDOFF-8` §4 was the accurate one). v2 added the `deleg`
  state, v3 put candidate hires on `pendingHires`, v4 added the per-person favour track. A save from
  an older schema refuses to load rather than restoring garbage.
- **Additive fields do NOT bump the version.** `player.char` (character select), `cand.guest`,
  `career.cosign` and now `level` (level select) all ride along with a safe default on load, so live
  playtest saves keep working. An absent field with a correct default is not a schema break — a
  bump is for a change that would restore *garbage*, not for one that restores *less*.
- **Finished runs are held** in their slot (title shows "Day 8 — CEO") until overwritten.
  New Game on an occupied slot routes through an overwrite confirmation.

---

## 5. Testing: the headless harness (READ THIS FIRST)

**Nearly every real bug in this project was found by *running* the thing, not reading code.**
The day-4 freeze, uncraftable recipes, the seat model handing one chair to two people, the
desk-eviction bug, the loyalty dead-end, the intro text firing at the wrong places — all read
fine in the source. A new session that starts editing without a test rig will reintroduce
this class of bug immediately.

**The harness (`test/harness.js`):**
- Extracts the `<script>` from `index.html`, `node --check`s it, evaluates it under stubbed
  `document` / `Image` / `Audio` / `AudioContext` / `localStorage`, with `Math.random` seeded
  (mulberry32) so paired runs are deterministic.
- The canvas 2D context stub **throws on any non-finite coordinate** — this catches a whole
  class of render bugs for free.
- `createWorld({seed})` boots a world; `w.startNewGame(0)`; `w.run(N)` drives N frames and
  auto-clicks the end-of-day modal. State is on `w.g` (player, NPCS, career, deleg, dale, desks,
  today, clock, day, RANKS, SEATS, seatsFree, gameOver…); top-level **function declarations** are
  on `w.sandbox`; `w.stats` collects throws / nonFinite / stuckNPCs / seatViolations /
  **investmentViolations** / endedEarly; `w.rawSave()` exposes buildSnapshot/applySnapshot.
- A bot reads `player`, `NPCS`, `deleg`, etc. and calls the **real** functions (`delegAssign`,
  `sendCatfishEmail`, `branchHealth`, `tryPromote`, `fireNPC`…) directly.

**The cardinal rule of testing this game:** *a test that skips the acquisition path is a lie.*
The first "13/13 recipes craftable" run pushed items straight into inventory and never called
`takeItem()` — seven were actually impossible to build. Bots must acquire things the way a
player does (call the real functions), not set flags.

**The investment invariant (durability, not discipline).** After any NPC removal, **no
player-held investment may reference a gone NPC** (dirt, coerced missions, delegated-job
assignment, championed, Dale's arc). The harness asserts this every check cycle (gameOver-guarded)
and surfaces `stats.investmentViolations` in `t_regress`. A future removal path that forgets the
`npcLeaving` hook fails the soak loudly instead of silently dangling.

> **Rule:** any new player-held state that points at a specific NPC must be added to the investment invariant list in the same commit that introduces it. The invariant is a list, so it has the same forgetting problem one level up — a future investment type that isn't in it passes silently.

**The gate rotation (`node test/gate.js`).** Runs each test as a child process; a non-zero exit
means do not merge. `t_regress` (the 150k soak) runs last. Current list:

```
placement.js  t_delegate.js  t_dale_delegate.js  t_npc_leaving.js  t_asst_desk.js
t_promote.js  t_hire.js  t_manager_fire.js  t_legibility.js  t_merit.js
t_rumor_supply.js  t_music.js  t_menu_load.js  t_regress.js
```

**Standard session-start checklist:**
1. Re-run `node test/gate.js` and confirm **GATE: GREEN**. This confirms the build is clean
   before editing.
2. The last test, the **150k-frame baseline soak** (~5 in-game days), must show: 0 throws,
   0 non-finite, 0 stuck NPCs, 0 seat violations, **0 investment-invariant violations**.
3. Only then start changing things. After any change, re-run the gate + a save round-trip.
4. **Cadence:** gate green → push to `main` (deploys live to Kyle's TV). Kyle judges *feel* on
   the TV afterward; the harness only judges correctness.

**What the soak verifies:** throws, non-finite coords, NPCs stuck in geometry, the investment
invariant, and — the one that mattered most historically — that **ranks, seats, and desks still
agree** (they disagreed since day one and it kept resurfacing).

---

## 6. Bug History (what's been fixed, and why it mattered)

- **Day-4 freeze** — fixed long ago; baseline soak guards against regression.
- **Seven uncraftable recipes** — the acquisition-path lesson above.
- **Seat model double-booking** — one chair handed to two people.
- **Desk lost on promotion** — no free tier-2 desk ever existed for the player. Fix:
  `movePlayerDesk()` bumps the lowest-standing occupant and stamps desk/NPC tiers consistent.
  (Related: at rank 4 `youTier()` returns **−1** — the AM office is not a senior chair, so the
  seat counter doesn't miscount you as a senior.)
- **Desk lost to a new hire** — hires never overwrite a taken desk; they find an empty one or
  the vacancy lapses (`processHires()`).
- **Loyalty path dead-end** — completing Dale's arc from SALES stranded you 3 rungs below where
  `vpFavor` mattered. Fix: the recommendation leapfrogs you to Assistant Manager.
- **Catfish "3 different machines" not enforced / not saved** — moved the guard into
  `sendCatfishEmail`; added `catfish` to the snapshot.
- **Meltdown cascades (3 in one day)** — the meltdown ripple (+stress to neighbours) chained.
  Fix: ripple caps at 92, can rattle but never *cause* a meltdown. Deliberate pranking not nerfed.
- **Printer meltdown forced to 50%** — was a testing override and the standing #1 ship-blocker.
  **RESOLVED:** back to `0.07` (7%) in the shipped build.
- **Meeting-miss wrong currency** — a miss used to route +8 HR **suspicion**; slacking is the
  **boss's** domain. Now `missMeeting()` docks rank-scaled promotion progress and escalates to a
  write-up on the second miss. Never touches suspicion.
- **AM→Manager was a duplicate of Manager→CEO** — both were branch-health holds. Replaced the
  rank-4 health-hold with the D1 **delegation** gate (getting work done through people). The two
  merit tests now chain instead of repeating.
- **NPC-leaves-mid-investment dead-ends** — dirt on a fired worker, a coerced mission whose target
  is fired, a championed worker who leaves, and Dale-upstairs-mid-arc all dangled. Fixed with the
  single `npcLeaving` convention + the harness investment invariant (§3, §5).
- **Doug/Otis intel mission "couldn't complete" / compass hijack / intro out of sync** —
  discoverability and sequencing fixes (see HANDOFF-2/3 for detail).

---

## 7. Electron / Steam Plan (the future)

The long-term plan: ship on Steam via **Electron** (Chromium + the HTML bundled into a
desktop `.exe`). The game is client-side canvas+DOM with no exotic APIs, so it runs
essentially unmodified.

- **Why Electron over a rewrite:** a Godot/Unity rewrite costs months and every bug already
  killed. Electron is the escape hatch that means a rewrite may never be needed.
- **What it buys:** Steam distribution (Steam Direct is $100 one-time per title), real
  filesystem saves, the Gamepad API + Steam Input mapping (the game is already gamepad-first),
  and Steamworks (achievements/cloud saves) via `steamworks.js`.
- **Cost:** ~150–200 MB install (vs the ~500 KB file) and Chromium's memory footprint.
  **Tauri** is the lighter alternative (~5–10 MB, uses the OS webview) but means testing
  against multiple browser engines; Chromium-everywhere is why Electron is the safe default.
- **Already prepared for it:** the `Store` layer (§4) is the single seam. On the web it's
  `localStorage`; in Electron it becomes a JSON file in `app.getPath('userData')` or Steam
  Cloud. One object changes, not fifty call sites. The harness stubs `localStorage` as a real
  in-memory Map, so save round-trips are testable either way.
- **Caveat (from the color-key work):** reading pixels off `file://` images can taint the canvas
  in some configs, silently no-op'ing `keyOutMagenta` (pink returns, no crash). Fine on Pages
  (same-origin). Permanent fix if it bites under Electron: re-export the `bat_*`/`printer_wreck`
  PNGs with real alpha instead of magenta.

**Order of operations when the time comes:** wrap in Electron, swap `Store` to file-based,
add Steam Input config, then Steamworks. Don't rewrite; ship what exists.

---

## 8. Known Issues / Open Items

- **Loyalty payoff — promise/delivery mismatch (design call, awaiting a Stacie playtest).** Beat 16
  of Dale's arc reads as a CEO promotion ("Dale walked into Sterling's office and recommended you
  for CEO," "Sterling is expecting you"), but mechanically it only *opens the gates* — it sets
  `dale.titled` (Manager gate) and `career.vpFavor` (CEO gate) and leapfrogs a low-rank player to
  **Assistant Manager**, then never fills `player.prog`. Verified end-to-end by `test/t_loyalty_ceo`:
  after the full arc you sit at AM and must still grind **two more full progress bars** (AM→Manager,
  Manager→CEO) to actually take the chair. The catfish ending, by contrast, self-completes (sets
  `player.prog=100` from an already-Manager position). Not a dead-end — the route completes once you
  do the work — but the fiction over-promises. Three ways to reconcile, Kyle's call after Stacie
  plays: **(1)** reword the beat-16 text to promise *permission*, not *position* (cheapest);
  **(2)** self-complete like catfish (set prog and drive the climb); **(3)** leapfrog to **Manager**
  instead of AM (one rung, not the top). Leaving the payoff code alone until then.
- **Merit (honest) CEO path — beatability unconfirmed.** A cold bot could not hold branch health
  at ≥ 70 for 3 days as Manager (feuds accumulate; mood decays nightly and only allies lift it).
  It *may* be winnable by a human who actively mediates feuds and builds alliances, but nobody has
  confirmed a human clear. If it turns out unbeatable, the feud spawn rate or the health target
  needs a tuning pass.
- **Meltdown music does not play on Xbox** — STILL OPEN, needs a real-device test. The Xbox
  browser reportedly can't play mp3 (why the soundtrack is `.ogg`). `ensureSting` now picks its
  format by `canPlayType` and falls back. **Test:** trigger a meltdown on the actual Xbox and
  listen — (a) plays → fixed; (b) silent on Xbox only → something downstream (`tickSting` ducking)
  eats it; (c) silent on both → the `.ogg` isn't loading, check path/case.
- **Kyle's TV verdicts on the AM delegation layer (harness can't judge feel):** does the tray feel
  like a *read* or like sorting mail? is climber credit-theft detectable in play? is walking to
  workers too slow at world width 1500? does AM feel like a different job? (Cut the 2/2/2/3 queue
  size first if it feels administrative.)
- ~~**3 sprite PNGs 404**~~ — **RESOLVED 2026-08-01.** `drawer`/`shift_covered`/`coffee_run` are still
  absent from disk but **nothing requests them any more**: a live load makes 250 asset requests with
  **0 HTTP errors and 0 broken art**, and all 230 `ART_FILES` entries resolve. Nothing to do.
- **Old version files** (`V*index.html`) clutter the repo root. Harmless; could move to `/archive`.
- **Repo must stay public** for GitHub Pages on the free plan (see §9).

---

## 9. Hosting Notes (GitHub Pages)

- Pages serves the root `index.html` from repo **`thepromotionv3`**. **Repo must be public** on
  the free plan — flipping it private silently tears down the Pages site (404 "There isn't a
  GitHub Pages site here"). To restore: Settings → Pages → Source = Deploy from a branch → main / root.
- **This is a client-side game** — the entire `index.html` is sent to anyone who loads it. Making
  the repo private buys nothing for the code itself; it only hides commit history and assets. If
  privacy is ever wanted while iterating, Netlify/Cloudflare Pages can deploy from a private repo.
- **URLs and asset paths are case-sensitive.** `thepromotionv3` ≠ `Thepromotionv3`;
  `title_bg.png` ≠ `Title_bg.png`. Case mismatch is the #1 reason an asset silently fails to load.
  This has bitten the project repeatedly.

---

## 10. Roadmap / Next Up

*(Audited against the code 2026-08-01. Two entries that sat here for months were already SHIPPED —
the prank assembly pipeline and the paths panel — and one open item had quietly fixed itself. The
per-feature register with evidence now lives in **`FEATURES.md`**; keep it current and keep this
section to what is genuinely next.)*

**Next up:**
- **Dale's "D" — the graceful-close upgrade.** On top of the shipped `npcLeaving` default, give the
  Dale/delegation collision a real choice: a **desk-menu** (not a modal) "hold the gate and choose,"
  with consolation paid in **capped promotion progress** (never `vpFavor`, which would be a CEO
  shortcut). **Arming must announce itself** (feed line + compass to the desk). Scaled-B (Dale
  recommends you remotely) was rejected — `vpFavor` alone opens CEO, skipping the Manager→CEO hold.
- **Senior Sales "countersign a junior's order."** The AM delegation grammar, one rank early, so the
  AM verb doesn't drop cold. Measured: rank 3 has **no verb at all** today — `youTier()` gives it a
  seat tier and `yourStanding()` a flat `+6`, and then rank 4 arrives with a tray, five match rules
  and a 12-completion gate. **Specced in `SPEC-countersign.md`.** Build before/alongside the next AM work.
- ~~**Paths / progress panel**~~ — **SHIPPED.** `renderPaths()` builds THE WAY UP with all three
  thermometers (`meritCard`/`loyCard`/`catCard`); `t_paths.js` guards it and cites HANDOFF-3 Part
  C(b) by name.
- ~~**Prank assembly pipeline**~~ — **SHIPPED**, all four stages (see `FEATURES.md` for the symbols).
  Two genuinely missing pieces remain, both small: the execution window is *opportunistic* and never
  time-boxed (nothing expires, so "get this from there **before then**" isn't literally true yet),
  and a half-built prank is invisible until you walk to that person.
- **The floor system** — Manager-appoints-AM and the broader floor/org mechanics (no hooks/fields
  added yet, per the D1 spec).

**On deck (biggest, parked until the office level feels done):**
- **Gas station intro / tutorial level.** A separate, smaller, controlled level where most of the
  office simulation is switched off and scripted missions teach one verb at a time. Modeled on
  *The Escapists 2*'s tutorial. **Deliberately does NOT teach sabotage.** Built on the same engine
  and verbs. Needs a second map/screen state and a mission-scripting system that doesn't exist yet.

**Tracked but deferred:**
- Rubber-band rival mechanic. Prank chaining. Prank-menu legibility pass (surface the personality
  read at the point of decision). Wall phone for in-world hints (TE2-style pull-not-push help).

**Design principles to defend (these make it satire, not a nasty toy):**
- *Sabotage destabilises, paperwork fires.* NPCs adapt. Friends are the counterplay.
- Three routes to CEO; the honest one requires keeping everyone whole after spending the whole
  game learning to break them.
- Mechanics should generate authentic behavior through incentive, not restriction (e.g. the boss's
  cone makes honest work genuinely necessary as cover, rather than forcing it).
- An NPC leaving mid-investment must close cleanly and **never pay out** — losing your mark is a
  loss, not a windfall.

---

## 11. Workflow

- **Design sessions are separate from implementation sessions.** Theory-craft systems through
  dialogue first, lock decisions, then implement.
- Every code change gets tested against the gate before it's considered done; gate green → push.
- Decisions get formalized into spec docs (this file for current truth, `HANDOFF-*` for history).
