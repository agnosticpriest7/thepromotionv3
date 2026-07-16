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
