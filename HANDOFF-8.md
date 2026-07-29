# HANDOFF-8 — Rooms, seating, the test audit, and character select

**2026-07-28/29.** Live/committed state: `main` @ `bcc454a`, full gate green (**38/38**, ~25 min).
Supersedes `HANDOFF-7` (the preview-loop / `__dbg` run — **complete**).

26 commits. The floor got rebuilt room by room, everyone sits down now including you, the test
suite stopped lying, and there are five playable characters.

---

## What changed this session

### 1. Room borders and windows — two silent geometry bugs

- **Break-room border.** `inBreakZone()` / `inKitchenZone()` each carried their own copy of the
  room rect *and* tested `player.x/y` — the **top-left corner** — while `roomAt()` tests the
  **centre**. The two disagreed by ~8 authored units, so **130 reachable tiles in the break room
  alone** were "inside" by one test and "outside" by the other, bunched at the south doorway. You
  could stand in the break room, see no caption, and get no break credit. Both now delegate to
  `inRoomNamed()` → `roomAt(centre)`. One source of truth.
- **Windows.** `WINDOWS` was generated from `W`/`H`, which are **already scaled**, and then scaled
  again by `scaleWorld`. Six of fifteen north panes landed past the east edge and **all seven east
  panes at x4838** — roughly 1200 units outside the building — so the east façade had no windows at
  all. Nothing failed: drawing a window into the void throws nothing. Only looking at the wall
  showed it. Fixed, and `test/t_windows.js` now locks it (proven to report 22 failures against the
  old generator).
- **SENIOR SALES / SALES FLOOR** widened to the east perimeter (the last of the 1400→1500 orphan
  floor). SENIOR SALES is `glass:true`, so widening it needed care — see `promotion-world-width`.

### 2. Kitchen, janitorial, break room, reception — a lot of new art

Kitchen split into **KITCHEN + JANITORIAL**, extinguisher wall-mounted, door moved west, a run of
four counters plus the fridge under the janitorial wall (sized down 15%), lockers moved east to
free the break room's whole left side, chest and coffee machine repositioned.

**Reception lounge** replaced the old couch + two loose office chairs: new couch, glass table and
armchairs in the grey corridor **east** of reception, plus a new wall closing the elevator lobby
off from it.

### 3. Everyone sits down — including you

- **Crew sets** (break room ×2, kitchen ×1, meeting room ×2) are **table and chairs as separate
  sprites**, so every chair is an addressable seat rather than baked into one image.
- **NPCs take a random chair** on breaks and in meetings, re-rolled each time, and are **drawn
  sitting on the actual chair** they were assigned.
- **The meeting room now has TWO sets — 16 seats** — so the floor sits down together instead of 8
  sitting and the rest forming a standing ring. Posed: 14 workers, 14 seated, 0 standing.
- **You sit down too** (`0794404`): your own desk seats you when you open its menu, and any empty
  chair seats you with `[X]`. **Seated at your desk, `[X]` keeps using the desk** — it does not
  stand you up (`6cd39c3`; the first cut locked you out of your own desk). On a table chair there
  is nothing to use, so `[X]` stands you up. Walking off always stands you up.

**Tables are solid, chairs are not.** That only works because tabletops are grid-aligned — see §5.

### 4. Character select — five playable characters

`New Game → slot → character → start`. **The Intern** (default), **Stacie**, **Kyle**, **Raelee**,
**Jax**. Continue/Load take the character from the save; **Test Game is pinned to the default**.

- Faces 0–20 live in the shared `chars.png` sheet. Anyone added after it ships as their **own
  per-direction 3-frame strip** (`CHAR_SHEETS`) at their own resolution — no rescaling Kyle's art
  down to 40×64, no rewriting a shared PNG per character. `drawChar` prefers a strip when one
  exists and sizes from the strip, not the sheet.
- Seated art is **one line** per character (`SEAT_ART`): `isSeatedPersonSprite()` derives the
  magenta keying *and* the content-bbox measuring from it.
- **Saves were not invalidated** (Kyle's call). `player.char` is additive; `SAVE_VERSION` stays
  **4**. A save from before select has no `char` and defaults to the Intern — exactly who it was
  played as. Verified both directions.
- **Cost per character after the system existed: 8 PNGs and 5 lines.** No UI work.

⚠️ **Left/right seated art must be checked, never assumed.** Kyle, Raelee and Jax each ship both
side seats (Intern and Stacie mirror a single `_side`). Face *and* knees point the same way in each
pose — get it backwards and they sit with their back to their own desk.

### 5. ⚠️ The nav grid decides where furniture goes

Cells are 20 authored units and `buildGrid` tests each cell **inflated by 2px a side**, so a blocker
claims every cell it *touches*. This bit three separate times this session:

| symptom | cause |
|---|---|
| Soak RED, seats flung out of the room | full-rect blocker on a tabletop claimed 4 cell rows, not 2 |
| A whole column of corridor sealed | wall's east face landed **exactly on** a 36px cell boundary |
| Half the seats snapping to neighbours | tabletop aligned *on* a 20u boundary instead of 2u inside |

Rule: align the **drawn tabletop**, put its top-left **2u inside** a 20u boundary (never on it), and
inset the blocker 4 world px. Do that and a solid table keeps a free ring of walkable chair cells.

### 6. The test suite stopped lying

- **`t_printer` had been RED for weeks and was never a bug.** It asserted a printer at authored
  (932,524); the printer had moved three times (→545 →565 → **770,610**) and its probe point had
  drifted out of every sales room. `nearestPrinter` was right the whole time.
- **Root cause: `gate.js` ran 27 of 38 test files.** Eleven were in no rotation at all — adding a
  file to `test/` created a test but never made it *run*. All 38 now run, and **the gate fails if
  any `t_*.js` on disk is unlisted** (or if the list names a file that no longer exists). `SKIP`
  exists but costs a written reason.
- **`t_ceo` and `placement.js` were baking coordinates too** — Sterling's post as a literal (a
  *third* copy of a value the game stores twice) and `WORLD_W/H` hardcoded. Both now derive from
  the live world. Demonstrated by moving Sterling's post: the old test cried "CEO did not return to
  his office" while he sat at his desk all day.
- **`CLAUDE.md` §1 rewritten** — the fast trio is the inner loop, `node test/gate.js` is the merge
  authority. **§14 added**: never assert where something *is*, assert what the code must *do*.

---

## ⚠️ Open item that matters most

**The harness stubs `Image` at 64×64, so anything measured off a sprite is wrong under test.**

`crewRect` derives tabletop height from `naturalHeight`; under the stub every crew tabletop measures
**76 authored units tall instead of 34** and the seat rows spread twice as far as they really do.
The meeting room's upper set tests as having its top chair row *outside the room*, scattered by
`snapTarget` — and is perfectly fine in the browser.

This is **pre-existing and affects the break room and kitchen sets equally**. It is why:
- no test has ever actually verified seat placement, and
- the reception lounge's first collision box came back **square** (82×82 instead of 82×37) and
  sealed the corridor — fine in the browser, broken in every test.

It bit **twice in one session**. The fix is to have the stub report real PNG dimensions — the
harness can read them off the IHDR exactly as `placement.js` already does. It changes the geometry
every existing test runs against, so it wants its own branch and a careful look at what moves.
**Not started; needs Kyle's go-ahead.**

Workaround until then: **verify seating and footprints in the browser, not the harness.**

## Other open items

- **16 meeting seats vs 23 desks.** Two tables is what was asked for and built, but a fully hired
  floor still leaves up to 7 standing. A third set is small now the pattern is wired.
- **Reception's marble room is bare** — the seating moved out to the corridor, per the map.
- **The lounge corridor has no room caption** — it sits outside every `ROOMS` rect, so `roomAt()`
  returns null there. Folding it into RECEPTION is small.
- **Duplicate GRIND row in the delegate menu** — carried from `HANDOFF-7`, still not investigated.
  Start at `delegAssignMenu` / `delegOpen()`.
- **HUD overlap** — the TODAY checklist prints over desks and room labels. Carried from
  `HANDOFF-7`; seen in four world states at full width, so it is not pane geometry.

*(`HANDOFF-7`'s "kitchen cleanup, never started" is **done** — see §2.)*

## Standing TV items (Kyle's verdict, gamepad in hand)

- **The five characters** — do they read at TV distance, and do the seated poses land?
- **Sitting down** — chairs only prompt within 18 units so they don't steal the prompt from a
  colleague at the same table; and while seated on a CHAIR `[X]` stands you up rather than talking. Both are
  judgement calls, easily changed.
- **The two meeting tables and the break/kitchen sets** — spacing and whether the room reads full.
- **The reception lounge** — and whether the bare marble room needs something.

---

A green soak means **NOT BROKEN**. A clean screenshot means **IT RENDERS**. Neither means **GOOD** —
that verdict is Kyle's, on the TV. (`CLAUDE.md` §13.)
