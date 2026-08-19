# SPEC — Level select, and a second level (the grocery store)

**Status:** preparation / Phase 0 complete. **Nothing built.** Written 2026-08-04.
Read alongside `FEATURES.md` (this supersedes its "floor system" entry) and `PROJECT.md` §2.

Kyle: *"I want to start developing a new level within the game. So from the main menu you can
perform a level selection before the character selection. The new level will be a grocery store.
New cast of characters, same concept."*

---

## 1. Phase 0 — what is actually coupled (measured, not estimated)

The build is **10,684 lines** and assumes one office throughout. What "the office" actually consists
of, counted from a live world rather than read off the source:

| | |
|---|---|
| world size | 1500 × 760 authored (2700 × 1368 scaled) |
| walls | 76 |
| desks | 23 (16 named owners) |
| objects | 20 |
| containers | 29 |
| rooms | 17 |
| errand points | 8 |
| light banks | 10 |
| HR patrol points | 15 |
| intro route | 19 waypoints + 11 dialogue beats |
| cast | 19 NPCs |

**Reference counts — this is the number that decides the approach:**

```
desks 114   NPCS 60   RANKS 38   walls 30   objects 19   CAST 14   ROOMS 11
LIGHT_BANKS 10   WINDOWS 8   breakChairs 8   PHASES 6   meetingChairs 6
CONTAINERS 13   errandPoints 4   hrPatrol 4
```

**Three findings that make this much cheaper than it looks:**

1. **`desks` is already built the right way.** It is `const desks=[]` populated by
   `.forEach(d=>desks.push({...}))`. The other tables are literals, but the conversion pattern
   already exists in-repo and is proven.
2. **These are `const` bindings, not `const` contents.** All 114 desk references keep working if the
   *contents* are replaced. No namespacing, no `level.desks` re-plumbing, no touching 300+ call
   sites. `RANKS` is already a `let`.
3. **A fresh run already reloads the page.** `startGame(slot, fresh)` writes `promo:newgame` and
   `promo:char` to `localStorage` and calls `location.reload()` — and its own comment says why:
   *"Rather than un-pick apart a possibly ended/mutated world in place (double-scaling, fired NPCs,
   reowned desks), we reload the page — boot rebuilds everything clean."*
   **That is the level-swap mechanism, already built and already trusted.** A level is chosen before
   a reload and never swapped at runtime.

**The one hard ordering constraint.** `scaleWorld()` runs once at module top level and multiplies
every authored coordinate by `S` **in place**. Run it twice and the world doubles. So the sequence
is fixed and must be stated in the code:

```
read promo:level  ->  loadLevel(id)  ->  scaleWorld()  ->  buildGrid() / buildSprites() / ...
```

`NPCS` is also built at module load, from `desks.filter(d => d.owner)` plus three hardcoded specials
(Brenda, Marla, Peggy). Cast construction therefore moves inside `loadLevel` too — but note the cast
*mostly follows the station table*, which is a large part of why a second level is less authoring
than it first appears.

---

## 2. What a level owns, and what it must not

**A level owns** — geometry (walls, floor tiles, rooms, windows, light banks), stations with their
owners / tiers / art, props, containers, errand points, patrol routes, the intro route and its
dialogue beats, the cast (names → sprite indices → roles), the rank ladder, the phase schedule, and
any art-manifest additions.

**A level must NOT own** — this is what "same concept" means: personalities and the `SIGNATURE` map,
the 15 pranks and the assembly pipeline, crafting and parts, detection cones, suspicion / stress /
meltdown, the audit and three-tier storage, favours, rumours, delegation and countersign, saving, and
the rank *machinery* (as distinct from the rank *names*).

If a system turns out to need a per-level branch, that is evidence the system was office-specific and
should be **lifted, not forked**.

---

## 3. The menu

`renderMenuDOM` is already a clean `menuMode` state machine
(`main → newpick → charpick → startGame`). Level select slots in as one more mode, exactly where
Kyle asked for it:

```
main -> newpick (slot) -> levelpick (NEW) -> charpick -> startGame(slot, fresh)
```

`Test Game` takes the same insert. **`Continue` and `Load Game` must not ask** — they take the level
out of the save, the same way they already take the character out of it.

---

## 4. Saves — the one genuinely new requirement

A save is only meaningful against the level it was made in: station owners, room names and the ladder
all differ. So:

- the snapshot carries **`level`**, and **`SAVE_VERSION` bumps**. Old saves refuse to load, by design
  (`CLAUDE.md` §5). This is a real schema change, not an additive field, so unlike `career.cosign`
  there is no argument for skipping the bump.
- **`Load Game` and `Continue` must reload the page too.** They currently call `startGame(i,false)`
  with no reload, which is correct when there is only one world — but a save from a different level
  than the one boot happened to build cannot be applied to it. Simplest correct rule: **loading
  always reloads, carrying slot + level.**
- `applySnapshot` refuses on a level mismatch as a backstop, the same shape as the existing
  `s.v !== SAVE_VERSION` guard.

---

## 5. Phasing

**Phase 1 — the seam, with one level.** Introduce `LEVELS` + `loadLevel(id)`, convert the world
literals to populated arrays, add `promo:level` and the `levelpick` menu mode, bump `SAVE_VERSION`,
make loading reload. **Register only the office.** Ship when the office plays *identically* and the
gate is green. This is the risky structural step and it deliberately carries no new content, so if
something breaks there is exactly one suspect.

**Phase 2 — a throwaway second level.** A few walls, a handful of stations, no art, no fiction. Its
only job is to prove the seam: pick it from the menu, it builds, it saves, it loads back, the office
is unaffected, and a save from one refuses the other. **Author nothing real until this is green.**

**Phase 3 — author the grocery store.** Map, cast, ladder, phases, intro tour. The content phase,
and where Kyle's screenshot-markup loop lives.

**Phase 4 — level-specific fiction.** Routes to the top, arcs, named set pieces.

Frame first, rooms second — the same order HANDOFF-4 set for the floor system, for the same reason.

---

## 6. Open design questions — Kyle's calls, needed before Phase 3

1. **The ladder.** The office runs INTERN → JUNIOR SALES → SALES → SENIOR SALES → ASSISTANT MANAGER →
   MANAGER → CEO. Grocery equivalent? (e.g. BAGGER → CART → CASHIER → DEPT LEAD → ASSISTANT MANAGER →
   STORE MANAGER → OWNER.) It need not be seven, but `youTier()`, `SEATS` and the promotion gates all
   key off the ladder's shape — changing its *length* is materially more work than changing its
   *names*.
2. **The four roles.** Every level needs someone in each: the **boss** who hunts slacking (Sterling),
   the **manager** (Dale), the **HR pair** who hunt wrongdoing, and a **receptionist**-equivalent.
   Grocery: regional owner? store manager? loss prevention? courtesy desk?
3. **The day.** The office is a 10-phase 8:00→17:00 metronome with a 10:00 meeting. A store has open
   and close, deliveries, and rush hours. Does a shift huddle replace the meeting, and do rushes
   become the opportunity windows that breaks currently provide?
4. **Stations vs desks — recommendation: keep the structure called `desks`.** It is load-bearing
   across 114 references and already means *"the place that is yours, that you can be seated at, that
   can be rigged, planted in, and audited."* A register or a stocking bay is that same thing with
   different art and a different label. Renaming buys nothing and risks a lot.
5. **Do the three routes to the top survive?** Merit (hold branch health), Loyalty (a 16-beat arc),
   Sabotage (the catfish). Mechanically generic; the fiction is office-shaped.

---

## 7. What this is not

**Not the multi-floor system from HANDOFF-4.** That was one building with suspended floors, an
elevator handoff node, and off-floor rivals resolving logically. This is simpler and separate: two
independent worlds, chosen at the menu, only ever one built at a time. If the floor system is ever
wanted, this work is a prerequisite rather than a competitor — but nothing here should be shaped to
anticipate it.
