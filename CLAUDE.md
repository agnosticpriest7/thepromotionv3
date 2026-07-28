# CLAUDE.md — The Promotion (session rules card)

Hard rules, loaded every session. Follow these without being re-asked. This is the checklist, not the manual — for context and rationale read **`PROJECT.md`** and the latest handoff, **`HANDOFF-4.md`**.

The one habit that matters: **run it, don't read it.** Almost every real bug showed up only by running the harness, never by reading code.

---

### 1. Workflow (merge = deploy to the live Pages site)
One change per branch → soak + save round-trip → placement check → review → **only then** merge to `main`.
```bash
node test/t_regress.js       # 150k-frame baseline soak (~5 in-game days); default frame count is 150000
node test/placement.js       # ASCII floor map + sprite-aware placement linter (0 FAIL to pass)
node test/t_menu_load.js     # save round-trip (build → save → load → keep ticking)
```
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
Read **`PROJECT.md`** and the latest **`HANDOFF-*`** doc (currently **`HANDOFF-7.md`**; `HANDOFF-6.md` is the seated-art run, now complete).

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
A green soak means **NOT BROKEN**. A clean screenshot means **IT RENDERS**. **Neither means GOOD.** That verdict is Kyle's, on the TV, with a gamepad. Never merge a visual change on green alone.
