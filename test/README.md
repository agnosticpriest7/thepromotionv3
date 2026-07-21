# Test harness — THE PROMOTION

Headless soak/regression rig for `index.html`, per PROJECT.md §5 and HANDOFF-2
§"THE TEST HARNESS". **The cardinal rule: run it, don't read it.** Nearly every
real bug in this project only showed up when the world *ran* for ~5 in-game days.

No dependencies — pure Node (built-ins only). Requires Node ≥ 18.

## Run

```bash
node test/t_regress.js            # 150k-frame baseline soak (~5 in-game days, ~100s)
node test/t_regress.js 40000      # shorter run (frame count optional)
node test/t_menu_load.js          # save round-trip (build → save → load → keep ticking)
```

Both exit `0` on GREEN, `1` on RED — usable as a CI/pre-push gate.

```bash
node test/placement.js            # ASCII floor map + sprite-aware placement linter
```

### Placement check (`placement.js`)

Props are authored as `x,y,w,h` *collision* rects, but sprites draw **larger** than the box
and offset from it (`sprAt` centres on `cx`, bottoms at `cyBottom`, rises up-screen), so
placement edits land blind. This makes placement visible + checkable in text — run it after
any edit that adds/moves a prop, desk, container, or wall, or changes `ART_W`/sprite art/room
layout. Exits `0` on 0 FAIL, `1` otherwise. All coords printed in **authored** space (pre-`S`).

**Reading the map:** a top-down character grid of the authored 1400×760 world at 20u/cell,
y down the left, x-hundreds on the ruler. `#` = wall, `~` = glass wall, `.` = room floor,
blank = exterior. Every prop stamps a **stable letter at its true DRAWN footprint** (not its
collision box — that's the whole point): `D` desk, `P/W/C/U/F/A/B/H/T` printer/water/coffee/
supply/files/alarm/board/phones/toilet, `c/x/L/G` cabinet/bin-shelf/lockers/fridge. Prop
letters **overlay** walls, so a cabinet whose sprite pokes into a `#` shows its letter sitting
in the wall line — that's a placement error you can *see*. The `ROOMS` legend lists each room's
authored rect.

**The five linter checks** (FAIL = fix like a soak failure; WARN = confirm intended):
1. **sprite-thru-wall** (FAIL) — footprint pokes through the far face of an *interior* wall.
2. **sprite-overlap** (FAIL) — footprint overlaps another prop's footprint past tolerance.
3. **out-of-bounds / embedded-in-wall** (FAIL) / **not-in-room** (WARN) — by collision centre.
4. **floating** (WARN) — a wall-hugging container's gap to its nearest wall (flush ≈ 0).
5. **blocks-doorway** (WARN) — footprint covers a 44u door gap.

Tolerances are tunable constants at the top of `lint()`. It reads the game's exported globals
(the harness epilogue now also exposes `ART_W`/`OBJ_ART`/`CONT_ART`/`deskArt`); intrinsic sprite
dimensions come straight from the `Art/sprites/*.png` IHDR since the `Image` stub is 64×64.

**Session-start ritual (HANDOFF-2):** run `t_regress.js` before editing to confirm
the build is clean; after any change, re-run `t_regress.js` + `t_menu_load.js`.

## What it checks

- **throws** — any exception thrown from the game loop or a timer callback.
- **non-finite (canvas)** — the 2D context stub throws on any non-finite
  coordinate passed to a draw call. This is the free render-bug catcher.
- **non-finite (entity)** — player/NPC `x,y` sampled directly for NaN/Infinity.
- **stuck NPCs** — an NPC that has an active goal+path but hasn't moved for
  ~10 in-game seconds ("stuck in geometry").
- **seat/desk/rank agreement** — the assertion that matters most. Checked at
  every day boundary:
  1. tiers 1 & 2 never hold more workers (+ you) than there are chairs
     (`SEATS[t]`) — the invariant `refreshRanks()` self-heals each frame;
  2. no desk is owned by two different parties;
  3. a worker's home desk sits at the worker's own tier (desk follows rank);
  4. `player.rank` stays in range.

A GREEN soak means **NOT BROKEN, not GOOD** (HANDOFF-4). Sprite scale/position,
swing-vs-music timing, and whether the layout reads are things the harness
*cannot* see — those need a human eyeball on the actual device.

## How it works (`harness.js`)

- Extracts the single `<script>` block from `index.html` (in memory — it never
  edits the file) and compiles it with `new vm.Script` (this is the
  `node --check` step: a syntax error throws here).
- Evaluates it in a `vm` context with stubbed
  `document` / `Image` / `Audio` / `AudioContext` / `localStorage` /
  `requestAnimationFrame` / `setTimeout` etc.
- Drives a **manual rAF loop** at `DT = 16.67ms` (dt ≈ 0.0167/frame) and
  **auto-clicks the 5pm end-of-day modal** (`mBtn.onclick`) to roll into the
  next day.
- **Timers run on a virtual clock** tied to sim time — `setTimeout` is real
  game logic here (e.g. a fired NPC leaves the floor 1200ms later), so wall-clock
  timers would fire at the wrong time.
- **Image `onload` fires deferred** (after boot, and between frames), mirroring
  the browser — firing it synchronously during `img.src=` would run handlers
  against not-yet-initialized `let/const` (TDZ).
- The shipped build only exposes `globalThis.__save` and `globalThis.__menu`.
  The harness appends its **own** export epilogue to the *extracted* copy to
  expose internals via `globalThis.__g` (player, NPCS, desks, day, RANKS,
  SEATS, isWorker, youTier, activeNPCs, …). `index.html` is never modified.

## Extending

To read more internals, add a getter to the `EPILOGUE` block at the bottom of
`harness.js` (it runs in the game's own scope, so it can reference any top-level
name). To drive gameplay (not just a passive soak), call the exposed functions
the way a player would — **a test that skips the acquisition path is a lie**
(HANDOFF-2): acquire items via the real `takeItem`/`doCraft`/etc., never by
setting flags.
