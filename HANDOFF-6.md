# HANDOFF-6 — Seated-character art (in progress)

**2026-07-27.** Live/committed state: `main` @ `0e5cf00`, gated green (27/27). This handoff
exists because a session was torn down mid-flow (remote control dropped) — the *work* is all
safely pushed; only the live session was lost. Pick up right where this leaves off.

---

## Repo & workflow

- **Working copy:** `C:\Users\Kyle_\Documents\thepromotionv3` — remote `origin` =
  `https://github.com/agnosticpriest7/thepromotionv3.git`. Pushing to **`main` deploys live** to
  the TV (GitHub Pages, repo-root `index.html`).
- **Cadence:** validate → commit → push to `main`. Sign commits
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- ⚠️ **CWD-drift hazard:** the Bash cwd sometimes resets to the stale
  `C:\Users\Kyle_\Documents\Promotionv2` clone (frozen at an ancient commit). **Always** target the
  real repo explicitly: `git -C /c/Users/Kyle_/Documents/thepromotionv3 …` (or `cd` there first).

## Current task

Adding pixel-art **seated** sprites for the cast, one character at a time. Kyle sends 4
magenta-background PNGs per character: front (**down**), back (**up**), **right** profile, **left**
profile. Each is a quick drop-in; verify + push, and Kyle eyeballs on the TV.

## The seated rig (already built & tuned — DO NOT re-derive)

- `drawSeated(npc,dir,cx,cyGround)` in `index.html` composites a chair sprite + seated-person
  sprite in code (per-direction draw order; shared desk-seat anchor). Figures are sized off each
  character's **down-pose content bounding box**, so any source canvas size/crop works.
- **Tunables (~`index.html:768`, all dialed in and inherited by new characters):**
  `SEAT_CHAIR_W`, `SEAT_PERSON_H=59`, `SEAT_SIDE_SCALE`, `SEAT_SIDE_SHIFT`, `SEAT_DESK_PULL`
  (pull seated worker toward desk), `SEAT_SIDE_DOWN` (left/right height), `SEAT_UP_EXTRA`,
  `SEAT_OFFSET_RATIO`, plus `CEO_SEAT_DX/DY`, `RECEPTION_SEAT_DX/DY`.
- **Special (non-desk) sitters** each have their own seat-state fn: Sterling (CEO, behind his
  `ceo_desk`, all day), Peggy (reception, behind `reception_desk2`, all day), Brenda (HR, only her
  ~15s morning paperwork). Marla (HR) is registered but roams (never auto-sits). Regular **workers
  auto-seat** at their own desks during Regular Work via `seatedDeskState`.
- Keying + bbox measurement are **derived from `SEAT_ART`** (`isSeatedPersonSprite`) — there is no
  separate list to maintain. A seated sprite that isn't classified renders as a magenta box + floats
  (this is why it's auto-derived now). On cold load a character briefly stands before art loads
  (expected, resolves to a clean standing→seated pop).

## Adding a character — TWO steps

1. Copy the 4 PNGs to `Art/sprites/` as `sit_<name>_down/up/left/right.png`.
   - **The `down` file MUST be the front-facing pose** — it's the size reference for all four.
   - Confirm which profile faces **left** vs **right** before naming (mislabels swap the sitter).
   - (A character may instead ship a single mirrored `_side` that faces right; the resolver mirrors
     it for left. All current cast use explicit `_left`/`_right`.)
2. In `index.html`: add the 4 names to `ART_FILES`, and add **one line** to `SEAT_ART`:
   `<spriteIndex>:'sit_<name>'`. Sprite index = `CAST[name]`.

## Cast with seated art so far (17)

`SEAT_ART` = 0 you(intern) · 1 Sterling(CEO) · 2 Brenda(HR) · 3 Marla(HR) · 4 Peggy(reception) ·
5 Marcus · 6 Priya · 7 Chad · 8 Dana · 9 Otis · 10 Wren · 11 Sana · 12 Gil · 13 Ramesh · 14 Vera ·
15 Doug · 16 Ravinder (CEO assistant). (5–15 are the sales floor.)

Naming notes: art is `sit_gil` (in-game name is **"Gil"**, not "Gill"). Sprite 16 was **renamed
Colette → Ravinder** (turban + grey jacket male face) — the rename touched `CAST`, the exec desk
`owner`, and `test/gen_level.js`; the NPC is spawned from the desk owner (`index.html:1396`).

## Still to do

- **Remaining named cast without seated art:** Nadia (sprite 17, accountant), Vaughn (18,
  accountant), Dale Brackett (20, the manager) — plus the generic hire-pool faces used for
  randomly-named new hires.
- **Parked from earlier:** "clean up the kitchen" — never started.

## Validate every add (harness can't see pixels — Kyle's TV verdict is final)

- `node test/placement.js` → expect `PLACEMENT: GREEN ✅ (0 FAIL, …)`.
- Quick harness check (createWorld/startNewGame, then via `w.sandbox`): `seatedPersonSpriteFor`
  resolves all 4 poses, `isSeatedPersonSprite('sit_<name>_down')` is true, the worker's
  `seatedDeskState` returns a dir over a run, and `w.g.renderErrs === 0`, `w.stats.throws === 0`.
- Periodic full gate: `node test/gate.js` (27 tests, ~10-12 min; the soaks dominate — that runtime
  is NORMAL, not a hang). Green = "not broken"; alignment is Kyle's eyeball.

## Known-good facts

- `SAVE_VERSION` and gameplay systems unchanged by this art work (rendering-only, plus the Ravinder
  rename). Full history in `PROJECT.md` / `PROJECT_UPDATE_2026-07-25.md`.
- Memory file `promotion-seated-characters` (in the auto-memory dir) has the full design + gotchas.
