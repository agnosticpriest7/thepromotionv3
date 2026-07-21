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

### 4. Ship-blocker — printer meltdown probability
In `meltdown(n)`: `n.printerMode = Math.random()<0.50;` is forced to **`0.50`** (50%) for testing. It **must be reverted to `0.07`** before release. Never touch it without Kyle's instruction.

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
Read **`PROJECT.md`** and the latest **`HANDOFF-*`** doc (currently `HANDOFF-4.md`).
