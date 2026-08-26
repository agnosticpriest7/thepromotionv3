# CLAUDE.md — The Promotion (session rules card)

Hard rules, loaded every session. Follow these without being re-asked. This is the checklist, not the manual — for context and rationale read **`PROJECT.md`** and the latest handoff, **`HANDOFF-8.md`**.

The one habit that matters: **run it, don't read it.** Almost every real bug showed up only by running the harness, never by reading code.

---

### 1. Workflow (merge = deploy to the live Pages site)
One change per branch → iterate on the fast trio → **full gate** → review → **only then** merge to `main`.

**While iterating** (~4 min) — re-run after each edit:
```bash
node test/t_regress.js       # 150k-frame baseline soak (~5 in-game days); default frame count is 150000
node test/placement.js       # ASCII floor map + sprite-aware placement linter (0 FAIL to pass)
node test/t_menu_load.js     # save round-trip (build → save → load → keep ticking)
```

**Before merging** — the trio is *not* enough to authorise a merge:
```bash
node test/gate.js            # all 38 tests, ~24 min. This is the merge authority.
```
The trio proves *not broken*, *not overlapping*, *saves survive*. It cannot catch a logic regression — nothing in it would notice delegation, hiring, promotion or leverage breaking. Merge means deploy to a public site, so the merge gate is the full rotation. Run it in the background and keep working; the 24 minutes is Claude's wall-clock, not Kyle's.

`gate.js` runs **every** `t_*.js` on disk and **fails if one is unlisted** (or if it lists a file that no longer exists). Don't work around that by adding to `SKIP` — it costs a written reason for good cause. This guard exists because `t_printer` sat RED for weeks purely because nothing ran it, and it wasn't even a real failure. See §14.

All exit `0` GREEN / `1` RED. Green soak = **not broken**; clean placement = **not overlapping**; **neither means "looks right on the TV."** That verdict is Kyle's — never merge on green alone if the change is visual.

### 2. Placement gate
After any edit that adds/moves a **prop, desk, container, or wall**, or changes **`ART_W`**, sprite art, or **room layout**, run `node test/placement.js` and clear it to **0 FAIL** before the change is done. It stamps each prop's *true drawn footprint* (not its collision box) on an ASCII map and lints for sprite-through-wall, prop overlaps, out-of-bounds/embedded, floating, and blocked doorways. WARNs are "confirm intended," FAILs are fix-first. (See `test/README.md` for how to read the map.)

### 3. Testing hygiene
The harness recompiles `index.html`'s `<script>` live on every run (that *is* the rebuild + `node --check`) — just re-run it after every change. Keep the raw script's **`const`/`let` intact — never `var`-ify to test**; that hides duplicate-declaration errors that are fatal in the browser. The canvas stub **throws on non-finite coordinates**, so keep all draw math finite.

### 4. Printer meltdown probability — RESOLVED (was a ship-blocker)
In `meltdown(n)`: `n.printerMode = Math.random()<0.07;` — already at the shipping **7%**. The old testing override of `0.50` is gone, so there is **no outstanding ship-blocker here**; don't go looking for one. Never change this number without Kyle's instruction. To *see* the homage on demand, don't touch the roll — use `__dbg.melt(name)` (§10), which forces it.

### 5. Hard constraints
- **`Store`** is the save/`localStorage` seam — route all save I/O through it (the lone other `localStorage` touch is the one-shot `promo:newgame` reload flag).
- **Saves are versioned** (`SAVE_VERSION`). On a schema change, bump the version — old saves must **refuse to load** (`if(!s || s.v !== SAVE_VERSION) return false;`), not load corrupt.
- **All audio must be OGG** — Xbox Edge can't decode MP3 (mp3 is PC-only insurance).
- **All fixed coordinates scale by `S`** (`const S = 1.8`). Author in world units, never bake in pixels.
- **Desks are ground truth.** If code and the nav grid disagree about a desk, **rebuild the grid** (`buildGrid()`) — don't patch around it.
- **Repo stays public** (GitHub Pages free plan; going private silently 404s the site). **Asset paths are case-sensitive** on Pages.

### 6. Measure, don't reason
Prefer running the build over inspecting it. Fix **root causes, not symptoms**.

### 7. Full context
**`FEATURES.md`** is the per-feature register — status (SHIPPED / PARTIAL / NOT BUILT / DELAYED /
REMOVED) with the evidence for each. Check it before proposing to build anything: the roadmap in
`PROJECT.md` §10 pointed at the prank assembly pipeline as "next" for months while it was already
shipping. A status only moves with evidence — a symbol, a passing test, or a measurement.

Read **`PROJECT.md`** and the latest **`HANDOFF-*`** doc (currently **`HANDOFF-8.md`** — rooms, seating, the test audit and character select; `HANDOFF-7.md` is the preview-loop/`__dbg` run, now complete).

⚠️ **`HANDOFF-8` carries one open trap worth reading before you touch furniture or seats:** the test harness stubs `Image` at 64x64, so anything measured off a sprite is wrong under test. Verify seating and footprints in the BROWSER, not the harness.

---

## Looking at the game (added 2026-07-27)

### 8. Run it over http — NEVER `file://`
Serve the repo root and open **`http://localhost:3000`**. `.claude/launch.json` is committed and needs **no `cwd`** when the session is rooted in this repo.
```bash
npx --yes serve -l 3000 .      # from the repo root
```
**Why it matters:** under `file://` the canvas is *tainted*, so `getImageData` throws inside `keyOutMagenta`, which catches and silently returns the **raw image**. Every magenta-keyed sprite then renders with an **opaque magenta background** — desks, chairs, stalls, bat sheets, the seated cast. It looks like an art bug and isn't. If you see magenta, you loaded the wrong way.

**⚠️ Orphan servers — a live version of the stale-build trap.** Stopping a background task kills the `npx` **wrapper** but can leave the spawned **`node` child still serving** on `:3000` (seen 2026-07-27: PID 6680 outlived its wrapper). An orphan from an *earlier session* can therefore hold the port and serve **a directory nobody chose** — and the Browser pane will happily open `localhost:3000` and screenshot it without complaining. Same failure mode as §9: the picture looks real and isn't.

- **Before trusting anything on `:3000`, verify which directory is actually being served** — byte count *and* a symbol check for something recent:
```bash
curl -s http://localhost:3000/ | wc -c                              # must equal the live index.html
curl -s http://localhost:3000/ | grep -c "function acceptMission"   # a recent symbol -> 1
```
- **Stopping a preview means killing the `node` child by PID, not just the wrapper**, then confirming the port is dead:
```bash
# find + kill the real listener (PowerShell)
Get-NetTCPConnection -LocalPort 3000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```
```bash
curl -s -o /dev/null -m 3 -w "%{http_code}\n" http://localhost:3000/   # want 000 / no response
```

### 9. ⚠️ CHECK WHAT YOU ARE ACTUALLY SERVING
> **[UPDATED 2026-07-27]** The sibling `Promotionv2` clone has been **deleted** — there is no longer a second, older `index.html` on this machine. The *trap* is not gone, though: it is now **cwd drift** and **orphan servers** (§8). Both still let you screenshot a build nobody chose. Don't re-clone `Promotionv2` next to this repo; if you must, put it somewhere that isn't `Documents/`.

**`thepromotionv3` is the only build on disk — so the failure mode is serving the wrong *directory*, not the wrong *repo*.**

- **Sessions must be rooted in `thepromotionv3`.** A session rooted elsewhere can't point `launch.json` at the live build — start the server from this repo by absolute path and open the pane at the URL instead. (A session's root is also **pinned by the OS**: you cannot delete a folder that is a live process's working directory.)
- Bash `cwd` **drifts**. Prefer `git -C /c/Users/Kyle_/Documents/thepromotionv3 …` or `cd` first.
- **Verify before trusting any screenshot** — byte count *and* a symbol check for something recent:
```bash
curl -s http://localhost:3000/ | wc -c        # must equal the live index.html byte count
curl -s http://localhost:3000/ | grep -c "function acceptMission"   # a recent symbol -> 1
```
A screenshot of the wrong directory is indistinguishable from a real one until you check.

### 10. The colour-key test is programmatic — don't eyeball pixels
`keyOutMagenta` returns a **`<canvas>`** on success and the **raw `<img>`** on taint/failure. So:
```js
ART['stall_v'].tagName    // "CANVAS" = keyed OK   |   "IMG" = keying failed
```
Stronger: draw it to a scratch canvas and read the corner pixel — **alpha 0** proves the magenta actually became transparent. Good probes: `stall_v`, `stall_h`, `printer_wreck`, `bat_*`, `sit_*`, `cubicle_desk`.

### 11. `window.__dbg` — dev-only posing hook
Poses a state for a screenshot instead of playing to it. **Arms only on `?debug=1` AND a localhost hostname** — a normal load never builds the object (`window.__dbg === undefined`) and it can never arm on Pages. Rendering/inspection only; nothing persisted, no `SAVE_VERSION` bump; unknown names log and no-op, never throw.

Open **`http://localhost:3000/?debug=1`**. Nine entry points:

| call | does |
|---|---|
| `__dbg.help()` | prints the list |
| `__dbg.state()` | day / clock / phase / rank / player xy / workersPresent / seatedNow / meltdown / missions / renderErrs |
| `__dbg.time(t)` | `510` \| `"8:30"` \| a phase name e.g. `"Regular Work"`. Syncs `lastPhase` so posing doesn't re-fire the phase-change block |
| `__dbg.seat()` | snaps every worker onto their own desk seat; forces a desk phase. Returns the count |
| `__dbg.tp(where)` | desk owner (full or first name) \| room name \| object type (`printer`/`water`/`coffee`/`toilet`…) \| `elevator`/`hr`/`dale`/`exit`/`muster` |
| `__dbg.melt(name)` | meltdown with the printer homage **forced** (the real roll is 7%). Briefly pins `Math.random` and calls the real `meltdown()`; refuses if one is already running |
| `__dbg.favour(name)` | spawns a **pending** favour ask — the "!", the toast and the accept/decline menu |
| `__dbg.rank(r)` | index or rank name. A pose — desks are **not** re-dealt |
| `__dbg.day(n)` | jumps the day counter |

**The intro will silently ruin your pose.** A fresh `startGame` runs the day-1 orientation tour, which drives Dale *and the player* along a fixed route and **overwrites their positions every frame** — so any teleport or seat pose is undone with no error. Bail it first:
```js
if (typeof intro !== 'undefined' && intro) endIntro(true);   // a game fn in page scope, NOT part of __dbg
```
(or pick **Test Game** from the menu, which skips the intro entirely).

**Other posing gotchas:**
- The sim keeps running, so a pose drifts within a second. Set **`paused = true`** after posing to hold it — `render()` still runs, only the update block is skipped.
- `__dbg.tp('printer')` puts the player **on top of** the NPC you wanted to photograph. Offset the player instead.
- The canvas-drawn TODAY tracker overlays the action: `tracked = null` and stub `autoTrack` to clear it.
- To catch one animation frame, install a `requestAnimationFrame` watcher that sets `paused = true` on the condition — e.g. `meltEvent.n.batFrame === 2` is the bat fully down (impact).

### 12. Gate for a RENDERING change
The standard gate (§1) **plus**:
1. a **before/after screenshot of the affected state**, posed with `__dbg` (§11), and
2. confirmation that a **normal load without `?debug=1` is unaffected** (`window.__dbg === undefined`, game boots, art loads).

### 13. The standing line
A green soak means **NOT BROKEN**. A clean screenshot means **IT RENDERS**. **Neither means GOOD.** That verdict is Kyle's, on the TV, with a gamepad.

⚠️ **MERGE FIRST, THEN HE TESTS** (Kyle, 2026-08-04). *"I cannot test on my TV unless the version is
merged and live."* Pages serves `main`, so **merging is the only way a change reaches the TV at all** —
holding a green branch back for approval doesn't protect him, it just blocks him. So: gate green →
merge → push → tell him what to look at. His verdict still governs, it simply arrives after, and a bad
one is one `git revert` away. Any brief that says "stop for Kyle's TV pass before merging" has this
backwards; merge anyway and say so.

---

## Writing tests (added 2026-07-28)

### 14. ⚠️ Never assert where something IS — assert what the code must DO
A test that hardcodes a world coordinate **rots the next time the floor is redesigned**, then reports a failure that isn't real. That is worse than no test: it burns trust, and a suite with a permanent red in it stops being read.

`t_printer` was RED for weeks and **never was a bug**. It asserted a printer at authored `(932,524)`; the printer had moved three times (→545 →565 → `770,610`), and its probe point had drifted out of every sales room when the geometry changed. `nearestPrinter` was right the whole time. `t_ceo` had the same bake — Sterling's post at `(120,58)` — a *third* copy of a value the game already stores twice.

**The rules:**
- **Derive from the live world, never from a literal.** `w.g.layout` exposes `objects`, `ROOMS`, `walls`, `desks`, `WINDOWS`, `W`, `H`, `S`. Ask the world where the printer is; don't tell it.
- **Assert identity, not coordinates.** `got === thePrinter`, not `Math.abs(got.x - 1678) < 120`.
- **Ask `roomAt()` "is he in his office"** rather than measuring a magic radius from a magic point.
- **Prefer a brute-force cross-check** where the contract allows one. `t_printer` now verifies its answer against the true minimum at 722 sample points using the game's own `cdist`, so the test cannot disagree with the implementation about what "nearest" means — and it never goes stale when a printer moves.
- **Prove a new test bites.** Mutate the thing it guards and watch it go RED before trusting it green. Both rewrites were verified this way. **Read the failure message** — confirm it failed for the reason you think, not merely that the exit code flipped.
- ⚠️ **A MUTANT THE DERIVATION CAN ABSORB PROVES NOTHING.** Anchor every mutation check on something the mutant cannot move. `t_grocery` derived its aisle positions from wherever the shelf columns happened to be; a blocker dropped mid-aisle and labelled `'Shelf'` joined the column set, the midpoints recomputed *around* it, four aisles became five, and the suite went **green**. The test redefined the world to include the mutation. The same shape bit twice more: an "is the player inside the room" check passed with the player on the office elevator because the room *was* the whole world, and an "is EXIT in the ENTRANCE zone" check passed with EXIT in the office because that zone spanned the store's full width. The fix each time is an anchor the mutation cannot shift — a count fixed at authoring time, a spawn the level *records* rather than one a test infers, a distance to a known point. **If a mutant passes, assume the test is broken until you have proved otherwise** — every one of these was a test bug, not a code bug.
- ⚠️ **`ART_W` IS IN SCALED PIXELS, NOT AUTHORED UNITS.** `U1(v)` is the identity at S=1.8, so
  `ART_W.supply_shelf = 61` is the sprite's drawn width in **scaled** px — **34 authored**. Divide by
  `S` before authoring a layout with it. Getting this wrong pitched a shelf run at nearly double the
  sprite's own height and produced a dotted line of floating units; **every test passed and only the
  screenshot caught it.** This is the production counterpart to the harness's 64x64 `Image` stub
  (§7): between them a prop can look right and be wrong from two directions at once — the harness
  lies about the sprite, and `ART_W` lies about the units.
- **`W`/`H` are already scaled** — divide `S` back out for authored bounds (see `promotion-world-width`). `placement.js` used to hardcode `1500/760` and needed a hand-edit at every resize; it derives now.

- ⚠️ **AN UNEXPLORED PATH IS NOT A HOLLOW ASSERTION — IT IS A MISSING ONE.** The department picker
  shipped with a **softlock**: it sat behind the once-per-gate latch, so pressing B or tapping its
  ✕ meant it never came back — promotion pinned at 100%, a Bagger for the rest of the run. A
  54-assertion suite was **green through it**, and no mutant would have found it, because every
  test chose a department the instant it was offered. Tests behave correctly by construction, so
  they never walk the routes players walk. The rule: **any modal that must be answered gets a test
  that tries to dismiss it, refuse it, or leave it.** Extend it to arcs — abandon one partway,
  run two at once, finish one after its target is already gone, save and load mid-way.
- ⚠️ **A GATE THAT MATCHES ON A DISPLAY STRING WILL COLLIDE.** `gateFor` switches on `RANKS[i]`,
  and Save-Rite's rung 4 is *also* called `ASSISTANT MANAGER` — so the store silently demanded
  Dale's approval in a building with no Dale, and **the grocery ladder was unclimbable past rung 3
  with nothing saying so.** The same collision then turned up a second time in `ladderSteps`, the
  one panel whose job is telling the player what to do next. When you add a level, **grep for
  gates that key on display text** and assume there is another one.

Game-rule constants are the exception and *should* be hard-coded — the tray holds 3, the slate offers 3 candidates. Those are the spec; a test SHOULD fail when they change.

### 15. A harness world is NOT a populated floor — parked NPCs will fake your data
A default `createWorld()` sits in the **day-1 intro with the clock frozen**: run it 35,000 frames and
it is still day 1 "Clock-In". **17 of 19 workers are `gone:true`, parked at exactly `(-400,-400)` —
mutual distance 0.** Any probe that walks `NPCS` measuring proximity will report those as overlapping
pairs and hand you a confident, entirely fictional number. This burned most of a session: "45
overlapping pairs, closest 0.78 authored" was seventeen people standing off-screen on the same pixel,
and the "fix" that improved it was shoving *those* apart.

- **Filter `gone`/`wentHome` before measuring anything positional**, and sanity-check the count
  (`onFloor >= 8`) before believing a statistic.
- **Pose the floor rather than playing into it** — clear `gone` and deal people onto real coordinates
  (`test/t_errandspace.js` does this). Waiting for workers to arrive does not work; they never do.
- **A bespoke probe that disagrees with itself three times is broken, not subtle.** Stop tuning
  against it and go verify the world it is measuring. Prefer a contract assertion (§14) that fails
  loudly on a posed setup over a whole-sim statistic nobody can check.

