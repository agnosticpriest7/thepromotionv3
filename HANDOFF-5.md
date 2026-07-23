# THE PROMOTION — Layout & Level-Overhaul Handoff

**Snapshot:** 2026-07-23.
**Build:** `index.html` — ~7,785 lines, ~465 KB. Single-file HTML/JS/Canvas, no build step, no deps.
**Repo:** `thepromotionv3` (`agnosticpriest7`), GitHub Pages, repo-root `index.html`.
Live: `https://agnosticpriest7.github.io/thepromotionv3/`. **Stays PUBLIC** (free Pages).

Read alongside `HANDOFF-4.md` (the repo-migration/rails brief this continues) and, for systems
context, `HANDOFF-3.md` Part A. **Milestone 0 (from HANDOFF-4) is done:** the repo is migrated,
the harness lives in `/test`, the baseline soak is green, and push-to-`main` = deploy is working.
This doc covers everything that landed **since HANDOFF-4** — almost entirely a level/layout overhaul.

---

## STATUS FLAGS (things prior handoffs were waiting on)

- ✅ **The old #1 ship-blocker is RESOLVED.** The printer meltdown is back to the ship value
  `n.printerMode = Math.random()<0.07` (~ln 2278). The 50%-for-testing flag from HANDOFF-2/3/4 is
  gone. Nothing to revert before shipping anymore.
- ⏸️ **`window-alignment-daylight` branch is HELD and now STALE.** One commit (windows derived from
  perimeter walls + daylight rake). It is **~23 commits behind `main`** and predates the whole level
  overhaul below — it must be **rebuilt/rebased on current `main`, not fast-merged.** Do not merge
  without Kyle's OK (his TV review) AND a re-do against today's walls. See Open Items.

---

## PART A — WHAT LANDED SINCE HANDOFF-4 (all soak-verified, on `main`, live)

Every item below passed the placement lint (0 FAIL) + 150k-frame soak (0 throws / non-finite /
stuck / seat-rank violations) + save round-trip before push. Cadence: work on a feature branch,
soak green, merge `--no-ff` to `main`, push. Kyle judges feel on the TV after.

### A1. Placement tooling + level-overhaul cleanup
- **New sprite-aware placement linter** `test/placement.js` — renders an ASCII floor map and checks
  every prop for overlap, out-of-bounds, embedded-in-wall, and adrift/floating. This is now a
  first-class gate alongside the soak. `test/gen_level.js` authored the room rebuild.
- Placement-fix passes cleared all FAILs room by room: **Supply Closet, Sales Floor, Kitchen,
  Break room** (each → 0 FAIL).
- The world was widened **1240→1400** during the overhaul (and **1400→1500** this session, see A9).

### A2. Amenities pass
- 5 new amenity sprites (wall clocks, first-aid, fire extinguishers, counter, vending) placed
  office-wide; fire-alarm coverage, water coolers, a west printer, exec restroom fixtures.

### A3. CEO (Mr. Sterling) behavior + labels
- CEO now **resides in his office**, does **one full lap per day** (late morning), then returns.
  Interactable only while lapping. He's at his desk at day start.
- **Desk plates now render on up/left/right-facing desks** (previously down-only).
- **Prop labels dropped** from chests, shelves, extinguishers (only meaningful props keep labels).
- Fixed a stale break-room zone, the receptionist's post, and staggered morning arrivals.

### A4. Performance — viewport culling
- `inView(x,y,w,h)` + `CULL_M` gate every render pass; only ~15% of the world draws per frame.
  **Roughly 2× soak speed** (≈258s → ≈127s for 150k frames).

### A5. Office polish batch
- Chat bubbles wrap to **two lines** and are no longer covered by the character (incl. the intro).
- Vending **20% smaller**; HR desk moved to the left wall with collision; CEO desk **10% smaller**
  with collision + adjusted resting spot; reception paper-supply banner raised, receptionist post
  fixed, stray furniture repositioned; elevator + stairs lowered ½ square; outer office walls
  completed.

### A6. Sales-area tweaks (first pass)
- Senior-sales shelves down ½ square; fire extinguisher up ½; a vacant desk added by Doug; a supply
  shelf removed and the sales phone moved into its slot; printer nudged down out of the hallway.

### A7. Printer-execution meltdown — fixed
- The printer now **actually ends up wrecked** (root cause: the dwell errand was being cleared, so
  updateNPC re-targeted the victim to their desk → 0 swings landed; fix = keep the errand alive).
- Swings capped at a **deliberate 5–8** per event (swing clock slowed); rate dropped to **7%**.
- Test: `test/t_meltdown.js` (forces the event, asserts victim reaches printer, 5–8 paced swings,
  wreck stage 3).

### A8. Bathroom remodel
- Both restrooms rezoned (sinks / urinals / toilets + stall dividers).
- Fixed a **magenta pink halo** on the stall-divider sprites (`stall_v`/`stall_h` added to
  `MAGENTA_BG` so the load-time color-key erases their background).
- Decluttered; iterated fixtures per Kyle's markups: one sink per side, toilets to the back wall,
  exec urinal pulled out of the wall + a corner sink.

### A9. Junior-sales rework (this session)
- **Marcus** re-oriented to face **down** (via `art:'cubicle_desk'` override — a plain `seatSide`
  wasn't enough; see C2).
- Priya/Otis tidied into a tight **2×2 back-to-back pod** (Priya/Otis on the bottom, their
  duplicates directly above, gap closed). Marcus took the pod's top-left seat.
- Two **reserved 2-player vacant desks** added (co-op tease); the lone vacant tucked against the
  east wall and lowered ½ square. Printer moved off the hallway.

### A10. Sales-floor rework + east-wall widen (this session)
- Sales desks reorganized into **back-to-back pairs split into a top row and a bottom row by a
  walkable horizontal aisle** (Kyle's markup, "aisle between rows" option). Desks face left/right —
  **no up-facing** (a standing Kyle preference). Two blocks (Chad/Dana over Ramesh/Vera; Doug +
  vacants) with a central corridor; circulation on both axes.
- **East wall widened: world 1400→1500.** Perimeter walls, per-room floor tiles, senior-sales
  dividers, and N/S walls all extended; `test/placement.js` `WORLD_W` bumped to 1500;
  `inKitchenZone()` bound extended. More room for the sales floor **and** senior sales (Gil/Wren/
  Sana). The kitchen shares the east wall so it widened too; the kitchen pantry was re-seated flush
  to the new wall.
- **Water cooler moved** off the sales floor into the break room.
- **Lighting fix:** the two far ceiling light banks stopped at x1400, leaving the new east strip
  dark under the darkness overlay; widened both banks (172→272) so the fluorescents reach the new
  east wall.

---

## PART B — THE TEST HARNESS (now committed, use every session)

`/test` is committed — no more rebuilding it from scratch. Key files:
- `harness.js` — extracts the `<script>`, `node --check`s it, evals under stubbed DOM/Canvas/Audio.
  The Canvas stub **throws on any non-finite coordinate**. `createWorld()` returns `{g, sandbox}`;
  `sandbox.walkableAt(x,y)` is the nav-grid probe (invaluable for layout — map the room before you
  soak).
- `placement.js` — the sprite-aware linter (Part A1). Run it after any prop/wall/desk edit.
- `t_regress.js` — the **baseline soak** (150k frames / ~4–5 in-game days). The gate.
- `t_menu_load.js` — save round-trip. `t_arrivals.js` — staggered morning arrivals.
- `t_meltdown.js`, `t_ceo.js`, `t_meeting.js`, `t_grace.js`, `t_printer.js`, `t_paths.js`,
  `t_rumor_supply.js`, `t_intro_face.js` — targeted behavior tests.

**Per-change ritual:** `placement.js` (0 FAIL) → `t_regress.js` (green) → `t_menu_load.js` (green),
then push. For layout work, add a `walkableAt` ASCII map first — it catches "the clump walls off the
room" before you spend 130s on a soak.

**The law still holds (PROJECT.md §5): run it, don't read it.** And **a green soak means NOT BROKEN,
not GOOD** — it cannot see sprite scale, color-key fringes, floor/grass rendering, or whether a
layout reads. Those are Kyle's eyeball on the TV.

---

## PART C — TECHNICAL NOTES / LANDMARKS (the non-obvious stuff; line #s drift)

**C1. World size & scaling.** `const W=Math.round(1500*S), H=Math.round(760*S)` (~ln 727; authored
1500×760, `S=1.8`). Floor fill, exterior grass/bushes/shadow, and the nav grid (`CELL/COLS/ROWS`)
all derive from `W`/`H`. **Widening the world also requires manually updating:** the perimeter walls
at the old edge + every horizontal wall that met it (extend `w`); per-room floor tiles in
`drawFloor` (`tileFloor(...Z(x,y,w,h))`); `test/placement.js` `WORLD_W`; hardcoded zone bounds like
`inKitchenZone()`; and re-seating props that were flush to the moved wall. `scaleBox` (~ln 7387)
multiplies authored coords by `S`; `scaleWorld` applies it to walls/desks/objects/etc.

**C2. Desk orientation.** `deskArt(d)` returns `d.art` if set, else derives facing from `deskSeat(d)`
(the first WALKABLE side, order `[down,up,right,left]`, with a `seatSide` override prepended).
**Gotcha:** setting `seatSide` alone can fail to change the sprite if that side isn't walkable (it
falls back). To *force* a facing regardless of the seat, use an explicit `art:` override (that's why
Marcus needed `art:'cubicle_desk'`). Back-to-back pods: left column `cubicle_desk_right`+
`seatSide:'left'`, right column `cubicle_desk_left`+`seatSide:'right'`, workers on the outer sides.

**C3. Desks are collision blockers** — a tall/wide clump can wall off a room. The sales clump took
three tries: a full-height clump stranded workers (no way around), and gapless short desks overlap
because the **cubicle sprite is ~54px tall regardless of the box `h`** (so row pitch must be ≥ ~56,
or you get sprite-overlap FAILs). The fix pattern: keep clumps ≤2 rows OR leave a walkable corridor,
and **center them so both seat aisles open into through-space, not a dead-end pocket.**

**C4. Lighting.** `LIGHT_BANKS` (~ln 5522, authored coords, scaled by `scaleWorld`) are erased out of
a darkness overlay in `drawLighting` (~ln 5636) — anywhere with no bank stays dark. `skyColour()` /
`WINDOWS` (~ln 5536) drive the time-of-day glow. **Known quirk:** the `WINDOWS` generator loops on
scaled `W`, so the **east-wall windows land off-world** (double-scaled) and don't render — the east
side gets no window daylight, only fluorescents. Left as-is on purpose: the held
`window-alignment-daylight` branch rebuilds window generation from the perimeter walls and will
replace this; fixing it here would collide with that work.

**C5. Magenta color-key.** Some sprites ship with a solid `#f0f` background instead of alpha;
`keyOutMagenta` erases it at load for sprites in the `MAGENTA_BG`/`COLORKEY` sets. Works same-origin
(Pages); silently no-ops on `file://` (pink returns, no crash) — the Electron caveat from HANDOFF-3.
When a new sprite shows a pink halo, add its key to `MAGENTA_BG`.

---

## PART D — OPEN ITEMS / KYLE-OWNED / DEFERRED

- ⏸️ **`window-alignment-daylight` branch** — held for Kyle's TV review AND now 23 commits stale
  (predates the level overhaul). **Rebuild on current `main`, don't fast-merge.** (C4.)
- **Senior-sales desks (Wren/Sana/Gil)** stayed put when the east wall widened — they just have more
  room around them now. Kyle to decide if they should spread into the new space.
- **East-wall windows** don't render (C4) — folds into the held window branch, not a standalone fix.
- **3 missing sprite PNGs** the game 404s on — pre-existing, graceful fallback, **Kyle's art call**
  (unchanged from before).
- **On-device eyeball (Kyle):** the widened east strip renders as carpet with grass/shadow against
  the new wall (no white void/seams); the minimap reflects the wider building; the sales split reads;
  the new fluorescents make the far corner bright enough (radial falloff).
- **The deferred roadmap is unchanged** and still real: the **floor-abstraction spec** (elevator
  despawn/spawn handoff, off-floor rival resolver, per-floor nav grid + save schema) that HANDOFF-4
  earmarked as the *original* "HANDOFF-5" is **still pending** — this doc repurposed the number for
  the level-overhaul changelog. Also still deferred: prank assembly pipeline, meeting-miss penalty
  currency change (HANDOFF-3 Part C-a), paths/progress legibility panel (C-b), split-screen co-op,
  Electron/Steam port. Dead code `plantGossip`/`spreadGossip` still removable if asked.

---

## PROCESS NOTES

- **Kyle's review loop is screenshot-driven:** he plays on the TV, marks up a screenshot, and hands
  it back. Read the markup literally but sanity-check against standing preferences (e.g. **no
  up-facing desks**) — when a markup seems to contradict one, ask before building.
- **Push cadence:** auto-push to `main` when the soak is green; Kyle judges feel on the TV after.
  Risky/structural work still goes on a branch first.
- **The browser tools are flaky in this environment** (`file://` hangs; JS tool detaches; `computer`
  keys only tap, so you can't walk the player). The screenshot loop + the harness's `walkableAt` map
  are the reliable substitutes for "seeing" the game.
