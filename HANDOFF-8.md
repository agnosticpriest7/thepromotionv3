# HANDOFF-8 — Rooms, seating, the test audit, character select, and guest hires

**2026-07-28/30.** Live/committed state: `main` @ `d31b464`, full gate green (**38/38**, ~26 min).
Supersedes `HANDOFF-7` (the preview-loop / `__dbg` run — **complete**).

37 commits. The floor got rebuilt room by room, everyone sits down now including you, the test
suite stopped lying, there are five playable characters, and rare guests turn up unannounced in
place of the person you hired.

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

## ✅ The harness image stub — FIXED (`086060a`)

*(Kept because the failure mode is worth recognising again, not because it is still open.)*

The harness stubbed `Image` at a flat **64×64**, so anything derived from a sprite's aspect was
wrong under test and right in the browser — the worst way round, because no test failure ever told
you. `crewRect` measured every crew tabletop **76 authored units tall instead of 34**, spreading the
seat rows twice as wide as they really are. It cost two bugs: the reception lounge's collision box
came back **square** (82×82 instead of 82×37) and sealed a corridor, and the meeting room's upper
seat row tested as hanging outside the room.

The stub now reads width/height off the PNG header (signature, then IHDR — width@16, height@20), the
same trick `placement.js` already used, with the 64×64 square kept as a fallback so the three
known-missing sprites still degrade gracefully. Cached per filename.

Harness geometry now matches the browser exactly:

| | browser | harness before | harness now |
|---|---|---|---|
| meeting tabletops | x501.9..578.1 | ~2× too tall | x501.9..578.1 |
| seat span | y317.8..467.2 | rows outside the room | y317.8..467.2 |
| seats exactly on chair | 16/16 | scattered | 16/16 |

Full gate stayed GREEN on all 38. It was flagged as risky because it shifts the geometry every test
runs against — and it shifted nothing any test asserted, which is precisely the evidence that seat
geometry was never being tested at all.

⚠️ **The related trap is still live:** a second "harness cannot do this" claim in the same session —
that timed actions never tick — was WRONG. `player.act` freezes only because the day-1 intro
early-returns out of `loop()` before the act tick, and the bot was crafting at frame 2000 inside a
~3740-frame intro. **Run past the intro before expecting any `startAct` verb to finish.**

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
- **Bat-swing art for the three guests** — Kyle is generating it. Meltdowns degrade safely without
  it (see §7); when the sheets land it is one `BAT_BY_INDEX` entry each for 25/26/27 plus the PNGs.
- **The art→facing map for the DEFAULT desk sprite** is inconsistent (see §10). Latent, not broken:
  every desk is correct via explicit `seatDir`.

*(`HANDOFF-7`'s "kitchen cleanup, never started" is **done** — see §2.)*

## From the overnight sweep (2026-07-29, `test/overnight.js`, 57 min, 32/32 green)

The harness image-stub fix landed first (`086060a`), so this is the first run where the geometry
numbers mean anything under test. Gate stayed green on all 38 — the change shifted nothing any test
asserted, which is itself the proof that seat geometry was never tested.

**The floor is healthy over the long horizon.** 1M frames / 28 in-game days: 0 render errors, nobody
wedged, live workers stable at 11–14, and **0 desk-less workers at every sample**. 12 seeds x 5
characters clean, 12/12 save round-trips deep into a run, every rank soaks clean.

**One thing to know: the cast array never prunes.** `NPCS` grows 19 → 32 over 28 days while live
workers stay flat, because departed staff stay in the array forever — by day 14 that is Doug, Wren,
Sana, Gil and Ravinder, all `alive:false` / `gone:true` and still present. That is plausibly *by
design* (leverage and history reference people who have left, and the harness's own investment
invariant assumes gone NPCs remain findable), so it is **not filed as a bug**. But `buildSnapshot`
serialises the whole array — 17.5 KB at day 14 with 24 entries — so **save size grows monotonically
with playtime**. Worth a decision before a long playthrough, not before.

⚠️ **Ravinder is gone by day 14 in an unattended run.** He is the CEO-office gatekeeper, so the
gate that keeps you out of Sterling's office may simply evaporate in a long game. Not investigated.

⚠️ **Three drift metrics are trivially green** — favours, delegation and leverage all read 0 → 0
over 28 days, because a bot that never acts never generates any. They prove no unbounded growth;
they are *not* evidence those systems work. `test/botrun.js` is what exercises them.

**Open question from `botrun`:** crafting after its looting loop yields no kit, while crafting
standalone does. A probe of `takeItem()` threw, so the bot may be calling it wrong rather than the
game misbehaving. Answer it before trusting a green there.

## Second pass (2026-07-29/30) — guests, and a batch of playtest fixes

Eleven more commits after the overnight sweep above. Gate green on every one.

### 7. Guest hires — rare named characters who turn up instead of your hire

`GUESTS` holds **Rod Kimble**, **Karl Havoc** and **Night Wolf Hawk**: fixed name, fixed face
(25/26/27), own four-direction art, own seated poses, and their own bubble lines, which REPLACE the
personality tells via `tellsFor()`. Each lands at most once per game — `guestTaken()` checks the live
cast *and* anyone already queued in `pendingHires`.

⚠️ **The roll lives at ARRIVAL, not on the slate.** Kyle's rule is that the player must not know one
is coming, so `makeCandidate()` gives nothing away and `GUEST_CHANCE` (10%) is rolled on the day they
start — you hire Gary B. and Rod Kimble walks in. It fires on **both** hire paths: the manager's
slate and HR's own auto-backfill. Measured: 0 leaks in 3000 slate candidates, 10.1% over 4000 rolls,
and end-to-end through `processHires()` 60 arrivals produced 3 guests (all three, none twice — 3/60
is the ceiling, not a shortfall). `cand.guest` rides in the save additively; `SAVE_VERSION` stays 4.

⚠️ **No bat art for guests yet** (Kyle is generating it). `BAT_BY_INDEX` stops at 20,
`batSheetFor()` returns null for anything unlisted and `drawBatFrame()` bails on a falsy file, so a
meltdown degrades instead of breaking — measured on Rod and Karl, 12k frames each, 0 render errors.
That proves nothing THREW, not that the swing plays out. It needs looking at once the sheets exist.

### 8. Character art: adding and replacing is now routine

Adding a character costs **8 PNGs and 5 lines** (`ART_FILES`, `MAGENTA_BG`, `CHAR_SHEETS`,
`SEAT_ART`, plus the roster/unlock). Replacing walk art costs **zero lines** — `drawChar` takes its
cell size from the STRIP, so new frames at a different resolution simply work. Raelee, Night Wolf
Hawk and Kyle have all had their walk sheets swapped this way with no code change.

⚠️ **Identify every sheet from a frame cropped and scaled 3x — never from the thumbnail.** On the
Night Wolf Hawk swap BOTH side sheets read as left-facing at thumbnail size, which would have meant
no right sheet existed; the zoom showed one was right-facing. Assigning those backwards is exactly
the moonwalk bug Kyle reported on Raelee. Useful second check: a genuine left/right pair are pixel
mirrors of each other — h-flip one and compare.

The same rule applies to SEATED side poses, and it has already bitten: `sit_zora_left.png` contained
right-facing art and vice versa. Fixed by swapping the FILES rather than special-casing her, so the
convention (`_left` faces left) still holds for everyone.

### 9. Seated figures: scale and placement

- **The away-facing (up) pose renders oversized.** Every pose is scaled so the character's DOWN pose
  stands `SEAT_PERSON_H` tall, but the up-pose art is drawn larger in source — measured at 84-90% of
  the down pose's content height, where a head-and-torso back view should be nearer 60%. That is why
  the BOTTOM row of every table read bigger than the top row and the end chairs. `SEAT_UP_SCALE =
  0.80` brings it to 67-72%. Per-character variance means no single multiplier is perfect: it is a
  knob, like the rest.
- **`SEAT_CREW_DOWN_DROP = 6`** tucks the table TOP row toward the table. Scoped to crew chairs via a
  `crew` flag on `drawSeatedPerson` — top-row sitters and desk sitters both face down, so without
  that scoping this would have shifted all 23 desks as well.

### 10. ⚠️ Desk facing: `seatSide` says WHERE you sit, `seatDir` says WHICH WAY you look

`deskSeat()` tries down, up, right, left and returns the first **walkable** side. Where a desk's only
walkable side disagrees with its art, the art cannot be trusted to say which way the sitter looks,
and they end up with their back to their own desk. Two desks were doing exactly that (the manager
desk and the reserved intern nook), and the AM desk seated you **through a wall into JANITORIAL**.

New `seatDir` pins the facing independently of the art. The check that finds these objectively: for
every desk, a sitter facing up must be BELOW it, facing down ABOVE, left → RIGHT-of, right →
LEFT-of. **0 of 23 backwards now.**

⚠️ **`seatDir` was silently dropped for a whole commit.** The desks array is built by copying a FIXED
list of fields off each literal, and the new field was not in that list. Add any per-desk field there
or it does nothing. It was missed because the rescan skipped *vacant* desks — **scan all 23, not just
the occupied ones.**

⚠️ **The art→facing map is inconsistent for the DEFAULT sprite.** It maps default → 'down', but
`cubicle_desk` depicts a desk whose sitter is BELOW it facing up. Every desk is correct now via
explicit `seatDir`, so this is latent rather than broken — but a new default-art desk will want an
override. `cubicle_desk_up` is the discontinued sprite and is no longer referenced by any desk.

### 11. Other fixes from Kyle's playtest

- **An impossible fetch favour.** Loot is rolled at random, so coffee was absent from the whole floor
  on ~0.15% of days (3 of 2000 whole-floor rolls) and snack on ~0.05% — and a fetch ask picked
  blindly from `FETCH_NEEDS`. `seedFetchNeeds()` at the day roll now guarantees every fetchable item
  exists, and `offerMission()` only asks for something obtainable right now. Regression test in
  `t_fetch_mission.js`, mutation-tested. **Lesson: a 0.15% event needs ~2000 samples. My first check
  used 40 days, found nothing, and I nearly reported "cannot reproduce".**
- **The manager's double chair** — a loose `office_chair` prop stood at 930,120 and the desk's seat
  point is 930,127, the same spot, so two chairs stacked once anyone sat there. Removed; sitters
  bring their own via `drawSeated`, exactly as the HR desk's spare chair was removed for.
- **Menu text overflow** — `.r` was `flex:0 0 auto` with `white-space:nowrap`, so a long risk string
  could neither shrink nor wrap. Measured in a 340px menu it was **363px wide** and printed across
  the label. Now `flex:0 1 auto`, wrapping, capped at 46% of the row, rows top-aligned.
- **Ravinder would not stay at his desk.** He gatekeeps the CEO's office and `ravinderGuarding()`
  only returns him while parked there, so every wander opened the door to Sterling. `isWorker()` only
  excludes HR, the boss, the manager and reception, so the gatekeeper was treated as an ordinary
  worker: at his desk **23%** of samples, most of the absence lost to ERRANDS during Regular Work,
  not breaks. New `deskbound()` stops errands and break attendance → **80%**, with the gate genuinely
  guarded 80% of samples. Note that removing his break SEAT was not enough on its own:
  `npcTarget`'s break branch sends anyone seatless to a fixed point *inside* the break room, so that
  just sent him there without a chair. Meetings still pull him, on purpose — everyone attends, it is
  time-boxed, and a predictable window is fair for the player to learn.

## Standing TV items (Kyle's verdict, gamepad in hand)

- **The five playable characters and the three guests** — do they read at TV distance, and do the
  seated poses land?
- **`SEAT_UP_SCALE` (0.80) and `SEAT_CREW_DOWN_DROP` (6)** — both are knobs; nudge them on the TV.
- **Sitting down** — chairs only prompt within 18 units so they don't steal the prompt from a
  colleague at the same table; seated at a DESK `[X]` uses the desk, on a CHAIR it stands you up.
  Both are judgement calls, easily changed.
- **The two meeting tables and the break/kitchen sets** — spacing and whether the room reads full.
- **The reception lounge** — and whether the bare marble room needs something.
- **Meeting a guest** — does a stranger walking in instead of your hire land as a surprise or a bug?

---

A green soak means **NOT BROKEN**. A clean screenshot means **IT RENDERS**. Neither means **GOOD** —
that verdict is Kyle's, on the TV. (`CLAUDE.md` §13.)
