# THE PROMOTION — Project Source & Handoff

A satirical office-life simulation game. Single-file HTML/JS/Canvas. Built gamepad-first
for TV/console play, now also runs on desktop (keyboard/mouse) and mobile (touch).

**Logline:** You're an intern at Paper Supply Co. Climb to CEO. There are three ways up,
and only one of them won't get you fired.

**Tone:** *The Office* meets *The Escapists 2*. The satire is load-bearing — the honest path
is the hardest one, and that's the point.

---

## 1. Current State (as of this writing)

- Working, playable build: a single `index.html` (~6,800 lines, ~380 KB).
- Hosted on **GitHub Pages** at the repo root as `index.html`. Repo is **public** (Pages
  requires public on the free plan; see §9).
- **Tested and working on:** TV/console browser (gamepad), desktop (keyboard/mouse),
  and mobile (Chrome, touch).
- All three CEO win-paths have been bot-verified end-to-end (see §5).

### Directory layout in the repo
```
/index.html                      <- THE GAME. This is what Pages serves. Same file that
                                    gets uploaded to chat and renamed each version.
/V1index.html ... /V34index.html <- old version snapshots. Harmless (Pages ignores them),
                                    but they pile up. Could move to /archive someday.
/Art/sprites/*.png               <- all art assets (lowercase, underscores — case matters!)
/Art/sprites/title_bg.png        <- title screen background (1920x1080)
/Music/*.ogg, *.mp3              <- soundtrack (dual-format; see §8 for the Xbox mp3 issue)
/Sound/printersound.ogg          <- SFX
```

---

## 2. Architecture

Everything lives in one HTML file: markup + CSS + one big `<script>` block. No build step,
no dependencies, no framework. It runs by opening the file.

- **Rendering:** HTML5 Canvas, immediate-mode. One `loop(now)` driving update + render via
  `requestAnimationFrame`.
- **World scale:** `const S = 1.8` — everything authored at 1240×760 then scaled up for the
  art. Landmark/room/route coordinates are authored in the small space and multiplied by `S`
  at runtime by `scaleWorld()`. **If you add anything with fixed coords, it must be scaled.**
- **Time:** a day runs `DAY_START = 8*60` (8:00am) to `DAY_END = 17*60` (5:00pm) at
  `MIN_PER_SEC = 0.9`. `clock` is in minutes.
- **Pathfinding:** A* on a nav grid (`buildGrid()`, `astar()`, `walkableAt()`). Cell size
  `CELL = 20*S`. Grid blocks on walls, desks, blockers, and sealed zones. **The desks are
  ground truth** — if code and the grid disagree about a desk, rebuild the grid.
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
`RANKS = [INTERN, JUNIOR SALES, SALES, SENIOR SALES, ASSISTANT MANAGER, MANAGER, CEO]`
- INTERN→JUNIOR→SALES→SENIOR are gated on **seat vacancies** — a chair in the target tier
  must open (a rival fired or promoted away) and you must win the requisition.
- ASSISTANT MANAGER is gated on **Dale's favour**, not a seat.
- MANAGER is gated on `career.mgrGone || dale.titled` (Dale promoted upstairs, or the fake
  title from his arc).
- CEO is gated on `career.vpFavor >= 1` (any of the three endgames sets it), plus Sterling
  being gone.

### The three paths to CEO
1. **MERIT (honest):** reach MANAGER, then hold **branch health ≥ 70 for 3 days**
   (`MERIT_DAYS`), which sets `career.meritReady`, then the board promotes you.
   *This is the hard path by design.* (See §6 — a bot could not clear it; needs human test.)
2. **LOYALTY (Dale's arc):** complete Dale's 16-beat suck-up storyline (`DALE_ARC`). At
   step ≥12 you get a fake title (`dale.titled`); at step 16 the arc sets `vpFavor=99` and
   recommends you. If you finished below Assistant Manager, the recommendation now
   **leapfrogs you up to AM** so it isn't wasted (bug fix — see §6).
3. **SABOTAGE / LEVERAGE (catfish):** Manager-gated. Email Sterling from **3 different
   coworkers' machines** (`sendCatfishEmail`), pull the replies from the HR files with a
   keycard, then confront Sterling. Two endings: quiet succession or leak-to-press.

### Personalities & pranks
- 5 personality types, randomly assigned each run:
  `PTYPES = [zealot, climber, paranoid, peacock, socialite]`.
- **Intel is a mandatory prerequisite** to prank effectively — you must profile a target
  ("Watch how they work") before their signature prank lands. Misclassification produces
  personality-dependent outcomes, not a uniform penalty.
- Prank types: stain, mislabel, gaslight, image, memo, violation, expose, well, calendar,
  plus per-type "master" pranks (`m_zealot`, `m_climber`, etc.). `SIGNATURE[ptype]` maps a
  personality to the pranks that ruin them.
- **Two terminal prank outcomes:** stress toward meltdown, or HR/boss trouble.
- Stress ≥ 100 triggers `meltdown()`. Diminishing returns per prank type
  (`prankResist`, `bored = 0.45^seenThis`) — you can't spam one prank to a meltdown; you
  need their signature plus a couple others (~4 well-chosen pranks). See §6 for the tuning.

### Detection (cones, not circles)
- **HR** hunts wrongdoing; the **boss** hunts absence/slacking. Both use cone-based
  detection. The boss's cone mechanically necessitates honest work as cover for sabotage.

### World autonomy
- No fixed countdown timer. Rivals climb independently and can be fired by emergent drama
  (feuds, meltdowns, strikes) before the player acts. Feuds drag branch health and only
  clear when the player mediates them ("sit them down").

---

## 4. Save System (3 slots)

- **`Store`** object is the only code that touches `localStorage` (keys `promo:slot:N`).
  This is deliberate — see §7 (Electron). Swap `Store` and everything else follows.
- **Autosave at the 5pm day boundary only** (`nextDay()` → `autosave()`). The world is
  quiescent there — no prank mid-build, no NPC mid-path — which is why restores are clean.
  Anywhere-save was rejected precisely because those live-object-graph states corrupt.
- **Snapshot by value, rebuild derived state on load.** `buildSnapshot()` serializes plain
  data (player, NPCS, desks, dale, career, catfish, tasks, favors, missions, pendingHires,
  scheduler). `applySnapshot()` restores values then regenerates everything derived
  (paths, goals, seats, nav grid). **Desks stay ground truth; nothing derived is saved.**
- **Versioned** (`SAVE_VERSION = 1`). A save from an older schema refuses to load rather
  than restoring garbage.
- **Finished runs are held** in their slot (title shows "Day 8 — CEO") until overwritten.
  New Game on an occupied slot routes through an overwrite confirmation.

---

## 5. Testing: the headless harness (READ THIS FIRST)

**Nearly every real bug in this project was found by *running* the thing, not reading code.**
The day-4 freeze, uncraftable recipes, the seat model handing one chair to two people, the
desk-eviction bug, the loyalty dead-end, the intro text firing at the wrong places — all read
fine in the source. A new session that starts editing without a test rig will reintroduce
this class of bug immediately.

**The harness** (rebuilt each session — the sandbox filesystem resets):
- Extracts the `<script>` from `index.html`, `node --check`s it, evaluates it under stubbed
  `document` / `Image` / `Audio` / `AudioContext` / `localStorage`.
- The canvas 2D context stub **throws on any non-finite coordinate** — this catches a whole
  class of render bugs for free.
- Manual `requestAnimationFrame` driver; auto-clicks the end-of-day modal.
- Exposes internals via `globalThis.__g` (live getters/setters) and `__menu` / `__save`.
- A bot can read `player`, `NPCS`, `day`, `desks`, etc. and call `takeItem`, `doCraft`,
  `sendCatfishEmail`, `branchHealth`, `tryPromote`, etc. directly.

**The cardinal rule of testing this game:** *a test that skips the acquisition path is a lie.*
The first "13/13 recipes craftable" run pushed items straight into inventory and never called
`takeItem()` — seven were actually impossible to build. Bots must acquire things the way a
player does (call the real functions), not set flags.

**Standard session-start checklist:**
1. Re-extract script, `node --check`, confirm the harness boots.
2. Run the **150k-frame baseline soak** (~5 in-game days). Expect: 0 throws, 0 non-finite,
   0 renderErrs, 0 NPCs stuck in geometry. This confirms the build is clean before editing.
3. Only then start changing things. After any change, re-run baseline + a save round-trip.

**What each bot verifies:** throws, non-finite coords, NPCs stuck in geometry, and — the one
that matters most — that **ranks, seats, and desks still agree** (they disagreed since day one
and it kept resurfacing).

---

## 6. Bug History (what's been fixed, and why it mattered)

- **Day-4 freeze** — fixed long ago; baseline soak guards against regression.
- **Seven uncraftable recipes** — the acquisition-path lesson above.
- **Seat model double-booking** — one chair handed to two people.
- **Desk lost on promotion** — no free tier-2 desk ever existed for the player (all three
  owned by NPCs). Promotion silently failed. Fix: `movePlayerDesk()` bumps the lowest-standing
  occupant to make room, and stamps desk/NPC tiers consistent.
- **Desk lost to a new hire** — a fired rival's desk was scheduled for backfill in 2 days;
  if the player got promoted into it meanwhile, `processHires()` overwrote `owner:'you'`.
  Fix: hires never overwrite a taken desk; they find an empty one or the vacancy lapses.
- **Loyalty path dead-end** — completing Dale's arc from SALES gave `vpFavor=99` but you were
  stuck 3 rungs below where it mattered, with no senior chair ever opening. Fix: the
  recommendation now leapfrogs you to Assistant Manager.
- **Catfish "3 different machines" not enforced** — the rule lived only in the menu UI, not
  in `sendCatfishEmail`. Moved the guard into the function.
- **Catfish progress not saved** — added `catfish` to the snapshot.
- **Meltdown cascades (3 in one day)** — root cause was the meltdown **ripple** (+8 stress to
  nearby people) tipping already-stressed neighbors over 100 and chaining. Fix: ripple caps
  at 92, can rattle but never *cause* a meltdown. Deliberate pranking was NOT nerfed —
  measurement showed ~4 well-chosen pranks to break someone, which is fair; spam still can't.
- **Doug/Otis intel mission "couldn't complete"** — discoverability, not a bug. You must
  profile the target ("Watch how they work") then report back. Fixed the guidance text to
  name the exact action.
- **Compass** — was hijacked by tracked missions and pointed at the exit between tasks. Now
  points only at the scheduled task, and at your desk when there's nothing pending.
- **Room label overlapping the tracker HUD** — repositioned below it using `trackHpx`.
- **Intro text out of sync** — beats fired on timers, so "That's HR" fired after walking past
  HR. Converted to position-gated beats (each line fires when Dale reaches its landmark);
  shortened lines and paced the walk so they stay synced.

---

## 7. Electron / Steam Plan (the future)

The long-term plan: ship on Steam via **Electron** (Chromium + the HTML bundled into a
desktop `.exe`). The game is client-side canvas+DOM with no exotic APIs, so it runs
essentially unmodified.

- **Why Electron over a rewrite:** a Godot/Unity rewrite costs months and every bug already
  killed. Electron is the escape hatch that means a rewrite may never be needed.
- **What it buys:** Steam distribution (Steam Direct is $100 one-time per title), real
  filesystem saves, the Gamepad API + Steam Input mapping (the game is already gamepad-first,
  so this is a short road), and Steamworks (achievements/cloud saves) via `steamworks.js`.
- **Cost:** ~150–200 MB install (vs the 380 KB file) and Chromium's memory footprint.
  **Tauri** is the lighter alternative (~5–10 MB, uses the OS webview) but means testing
  against multiple browser engines; Chromium-everywhere is why Electron is the safe default.
- **Already prepared for it:** the `Store` layer (§4) is the single seam. On the web it's
  `localStorage`; in Electron it becomes a JSON file in `app.getPath('userData')` or Steam
  Cloud. One object changes, not fifty call sites. The harness stubs `localStorage` as a real
  in-memory Map, so save round-trips are testable either way.

**Order of operations when the time comes:** wrap in Electron, swap `Store` to file-based,
add Steam Input config, then Steamworks. Don't rewrite; ship what exists.

---

## 8. Known Issues / Open Items

- **Meltdown music does not play on Xbox** — STILL OPEN, needs a real-device test.
  - The Xbox browser reportedly **can't play mp3** (which is why the soundtrack uses `.ogg`
    in the first place). The meltdown sting file `Mandatory_Wellness_Meltdown` originally
    shipped `.ogg`-only.
  - The sting code (`ensureSting`) now picks its format by what the browser supports
    (`canPlayType`) and falls back to the other format, independent of the main player.
  - An `.mp3` was added to `/Music/` as PC insurance, but if Xbox truly can't do mp3 the
    fix that matters is that the `.ogg` sting loads the same way the soundtrack's `.ogg`
    tracks do. **Test:** trigger a meltdown on the actual Xbox and listen. Three outcomes:
    (a) music plays → fixed; (b) silent on Xbox, works on PC → something downstream
    (ducking/volume in `tickSting`) is eating it; (c) silent on both → the `.ogg` file
    isn't loading, check the exact path/case against what the code requests.
- **Merit (honest) CEO path — beatability unconfirmed.** A cold bot could not hold branch
  health at ≥64 for 3 days as Manager (feuds accumulate; mood decays nightly and only allies
  lift it). It *may* be winnable by a human who actively mediates feuds and builds alliances,
  but nobody has confirmed a human clear. If it turns out unbeatable, the feud spawn rate or
  the health target needs a tuning pass.
- **Old version files** (`V1index.html`…`V34index.html`) clutter the repo root. Harmless;
  could be moved to an `/archive` folder.
- **Repo must stay public** for GitHub Pages on the free plan (see §9).

---

## 9. Hosting Notes (GitHub Pages)

- Pages serves the root `index.html`. **Repo must be public** on the free plan — flipping it
  private silently tears down the Pages site (404 "There isn't a GitHub Pages site here").
  To restore after that: Settings → Pages → Source = Deploy from a branch → main / root.
- **This is a client-side game** — the entire `index.html` is sent to anyone who loads it.
  Making the repo private buys nothing for the code itself; it only hides commit history and
  assets. If privacy is ever wanted while iterating, Netlify/Cloudflare Pages can deploy from
  a private repo (and Netlify can password-protect the site).
- **URLs and asset paths are case-sensitive.** `Promotionv2` ≠ `promotionv2`;
  `title_bg.png` ≠ `Title_bg.png`. Case mismatch is the #1 reason an asset silently fails to
  load. This has bitten the project repeatedly.

---

## 10. Roadmap / Next Up

**On deck (biggest, parked until the office level feels done):**
- **Gas station intro / tutorial level.** A separate, smaller, controlled level where most of
  the office simulation is switched off and scripted missions teach one verb at a time
  (move → interact → complete a task → pick something up → deliver). Modeled on *The
  Escapists 2*'s tutorial. **Deliberately does NOT teach sabotage** — that stays the office's
  "oh, I can do *that*?" discovery. Build it on the *same engine and same verbs* as the main
  game (a stripped-down single screen, not a whole new map subsystem) so the tutorial teaches
  the real controls, not an approximation. This is an arc of sessions, not a one-shot: it
  needs a second map/screen state and a mission-scripting system that doesn't exist yet.

**Tracked but deferred:**
- Prank assembly pipeline (intel → materials → execution window → resolution as explicit
  stages).
- Rubber-band rival mechanic.
- Prank chaining.
- Prank-menu legibility pass (surface the personality read at the point of decision — the
  original "which prank for which person?" confusion).
- Wall phone for in-world hints (TE2-style pull-not-push help).

**Design principles to defend (these make it satire, not a nasty toy):**
- *Sabotage destabilises, paperwork fires.* NPCs adapt. Friends are the counterplay.
- Three routes to CEO; the honest one requires keeping everyone whole after spending the
  whole game learning to break them.
- Mechanics should generate authentic behavior through incentive, not restriction (e.g. the
  boss's cone makes honest work genuinely necessary as cover, rather than forcing it).

---

## 11. Workflow

- **Design sessions are separate from implementation sessions.** Theory-craft systems through
  dialogue first, lock decisions, then implement.
- Every code change gets tested against the harness before it's considered done.
- Decisions get formalized into spec docs (like this one) for the dev chat / accountability.
