# THE PROMOTION — Level Overhaul Build Spec

**For:** Claude Code (home-PC desktop app) · **From:** the planner session · **Date:** 2026-07-17
**Source of truth:** `the_promotion_level__1_.json` (the exported plan — 189 elements).
**Target file:** `index.html` at repo root (`agnosticpriest7/thepromotionv3`, stays PUBLIC).

This spec replaces the office floor geometry with the new plan. Read it alongside the JSON;
the JSON has the exact coordinates, this doc says how to interpret and build them.

---

## ⚠️ Two things before anything else

1. **SHIP-BLOCKER still open (unrelated to this overhaul):** `meltdown(n)` is forced to
   `Math.random()<0.50` for testing — revert to `0.07` before any release.
2. **This overhaul WIDENS THE WORLD to 1400×760** (decision made). The plan is authored
   1400 wide; height is unchanged at 760. See §1.

---

## 1. Engine change: widen the authored world 1240 → 1400

The current world is authored at **1240×760** and scaled by `S` at runtime. The new floor
runs to **x=1400** (verified extent 1400×760, 8 squares past the old right edge). Only the
**width** changes; height stays 760.

Do this, then let the harness catch anything missed (running the build is law — don't trust a
read-through; see §7):

- Find the authored world-width constant and set it to **1400**. Grep the whole file for the
  literals **`1240`** and **`760`** and audit each hit — some are the world box, some may be
  camera clamps, letterbox math, title/HUD layout, or background art sizing.
- Confirm `scaleWorld()` / `scaleBox()` derive from the constant, not a hardcoded 1240, so
  every landmark, room, route, and object scales to the new width.
- Confirm `buildGrid()` sizes the nav grid from world dims (new width → more columns). The A*
  (`astar`, `walkableAt`, `CELL = 20*S`) should then just work; verify no fixed grid width.
- Check the camera / pan clamp and the canvas element's max width so the extra 160u (×S) is
  visible and not letterboxed off. Title bg (`title_bg.png`, 1920×1080) is unaffected.
- Rebuild the nav grid after loading geometry (desks are ground truth — if code and grid
  disagree about a desk, rebuild).

Everything in the plan fits inside 1400×760, so once the world is that size the content drops in.

---

## 2. Coordinate system & element schema (from the JSON)

- **Origin top-left, x → right, y → down.** Authored units (pre-`S`). 1 nav cell = **20u**.
- `room`, `desk`, `shelf`: `x,y` = **top-left**, plus `w,h`.
- `wall`: `x1,y1 → x2,y2` endpoints.
- `chair`, `bin`, `door`, `label`: `x,y` = **center**.

## 3. Translation rules — READ THESE or the build comes out wrong

1. **Doors are gap markers, not openings in the data.** Every `room` is a *closed* rectangle
   outline; the `door` points do **not** cut it. For each door, **carve a ~40u gap** in the
   wall/room-outline at that position. Miss this and every room seals shut. Door positions are
   listed per-room in §4.
2. **`label`s are placement pins**, not literal game text. The six object labels (Printer,
   Water, Coffee, Fire Alarm, Files, Sales Phones) mark where to spawn the **real interactive
   object**. Area labels (CEO Office, Break Room, …) just name a zone.
3. **Not every `desk` is a workstation.** Some rects are the conference table, the two break
   tables, the reception L-desk, and the CEO's desk — see the `role` column in §4. Only
   *workstations* get an owner/seat.
4. **Open-concept & prop areas have no walls** — Kitchen, Accounting (open), Elevator/Stairs
   (props). Don't wall them. See §4.
5. **`bin` = lootable/contraband spot** (feeds the audit/stash system). **`chair` = seat
   anchor** the table-seating code can use (or regenerate seats via the existing seat logic).

## 4. The floor (parsed & classified from the JSON)

### Walled rooms (render outline as walls, carve a gap at each door)

| Area | x | y | w | h | Door gaps |
|---|---|---|---|---|---|
| CEO Office | 0 | 0 | 260 | 180 | (260,60) |
| HR Office | 400 | 0 | 160 | 180 | (540,180) |
| Manager Office | 880 | 0 | 160 | 180 | (960,180) |
| Restroom | 380 | 600 | 280 | 160 | (460,600), (580,600) |
| Meeting Room | 380 | 280 | 260 | 220 | (440,280), (440,500) |
| Break Room | 840 | 280 | 260 | 220 | (960,500), (960,280) |
| Asst. Manager | 1040 | 0 | 120 | 120 | (1100,120) |
| Supply Closet | 640 | 340 | 200 | 100 | (680,340), (680,440) |
| Senior Sales | 1240 | 480 | 160 | 100 | (1240,460), (1240,560) |
| Senior Sales | 1240 | 380 | 160 | 100 | (1240,360), (1240,460) |
| Senior Sales | 1240 | 280 | 160 | 100 | (1240,360) |
| Exec Restroom | 0 | 280 | 240 | 140 | (60,280), (160,280) |

### Open-concept & prop areas (NOT walled)

- **Kitchen** — open concept. Counter/shelf runs along north & east only; floor-facing sides stay open (no room rect exists).
- **Accounting** — open concept. Desks + a row of north-wall bins; no room rect.
- **Elevator / Stairs** `(0,680 220x80)` — **props only, do NOT wall.** Render the elevator & stairs sprites; the floor stays open through here.

### Interactive-object pins — spawn the real object at each coord

| Object | x | y | notes |
|---|---|---|---|
| Coffee | 1240 | 240 | stress relief |
| Files | 500 | 40 | HR files — restricted (keycard target), inside HR Office |
| Fire Alarm | 1032 | 522 | pullable alarm |
| Printer | 932 | 524 | meltdown Easter-egg target |
| Printer | 692 | 144 | meltdown Easter-egg target |
| Sales Phones | 1060 | 620 | sales-call station |
| Water | 760 | 488 | stress relief |
| Water | 760 | 288 | stress relief |

> Two **Printers** and two **Waters** are intentional (two of each).

### Desks & tables — grouped by containing area

| Area | x | y | w | h | role |
|---|---|---|---|---|---|
| Accounting | 680 | 60 | 40 | 60 | workstation |
| Assistant | 320 | 160 | 80 | 20 | workstation |
| Asst. Manager | 1120 | 0 | 40 | 60 | workstation |
| Break Room | 880 | 340 | 40 | 120 | BREAK TABLE (x2) |
| Break Room | 1020 | 340 | 40 | 120 | BREAK TABLE (x2) |
| CEO Office | 20 | 40 | 120 | 20 | CEO desk |
| HR Office | 400 | 120 | 40 | 60 | workstation |
| HR Office | 400 | 60 | 40 | 60 | workstation |
| Intern 1 | 660 | 600 | 40 | 60 | workstation |
| Intern 2 | 660 | 700 | 40 | 60 | workstation |
| Junior Sales Clump | 860 | 660 | 60 | 40 | workstation |
| Junior Sales Clump | 900 | 700 | 40 | 60 | workstation |
| Junior Sales Clump | 840 | 700 | 40 | 60 | workstation |
| Manager Office | 720 | 60 | 40 | 60 | workstation |
| Manager Office | 900 | 60 | 60 | 40 | workstation |
| Meeting Room | 540 | 320 | 40 | 120 | CONFERENCE TABLE |
| Reception | 20 | 500 | 140 | 20 | reception desk |
| Reception | 0 | 420 | 20 | 100 | reception desk |
| Sales Clump (lower) | 1140 | 720 | 60 | 40 | workstation |
| Sales Clump (lower) | 1240 | 720 | 60 | 40 | workstation |
| Sales Clump (lower) | 1340 | 720 | 60 | 40 | workstation |
| Sales Clump (lower) | 1040 | 720 | 60 | 40 | workstation |
| Sales Clump (lower) | 1340 | 580 | 60 | 40 | workstation |
| Sales Clump (lower) | 1240 | 580 | 60 | 40 | workstation |
| Senior Sales | 1320 | 480 | 60 | 40 | workstation |
| Senior Sales | 1320 | 380 | 60 | 40 | workstation |
| Senior Sales | 1320 | 280 | 60 | 40 | workstation |

**Workstation desks = 21** (tables, reception, CEO desk excluded). Cast is you + 21 → seats line up.

> The two `Break Room` rects are the two break tables. The `Meeting Room` rect is the conference table. `Reception` = the two-piece L-desk. Confirm which coworker owns which workstation at build time.

### Shelves / counters

| x | y | w | h |  | x | y | w | h |
|---|---|---|---|---|---|---|---|---|
| 560 | 0 | 20 | 120 | | 860 | 0 | 20 | 120 |
| 0 | 180 | 20 | 100 | | 1200 | 0 | 200 | 40 |
| 400 | 0 | 160 | 20 | | 880 | 0 | 160 | 20 |
| 1140 | 60 | 20 | 60 | | 820 | 340 | 20 | 100 |
| 740 | 340 | 80 | 20 | | 1360 | 40 | 40 | 240 |

### Bins — lootable / contraband spots (audit & stash system)

(820,20), (620,20), (680,20), (760,20), (760,420), (1180,20), (540,60), (1260,500), (1260,400), (1260,300), (1040,600), (1040,640), (780,460), (780,320), (1280,260)

### Explicit wall segments (perimeter + dividers)

| x1 | y1 | x2 | y2 |  | x1 | y1 | x2 | y2 |
|---|---|---|---|---|---|---|---|---|
| 880 | 0 | 560 | 0 | | 400 | 0 | 260 | 0 |
| 0 | 180 | 0 | 280 | | 0 | 420 | 0 | 680 |
| 220 | 760 | 380 | 760 | | 1400 | 760 | 660 | 760 |
| 1400 | 340 | 1400 | 0 | | 1160 | 0 | 1400 | 0 |
| 520 | 600 | 520 | 760 | | 120 | 680 | 120 | 760 |
| 120 | 280 | 120 | 420 | | 1400 | 580 | 1400 | 760 |
| 1020 | 760 | 1020 | 580 | | 1240 | 580 | 1020 | 580 |

---

## 5. Map onto existing engine identifiers

Replace geometry, keep systems. The overhaul rewrites the *data* these read from; the
mechanics stay intact:

- **`ROOMS`** (label-zone array) → rebuild from §4 walled rooms + open areas.
- **Walls / nav** → rebuild the wall set from §4 (perimeter segments + room outlines with door
  gaps), then `buildGrid()`.
- **Tables** — `meetingTable`, `breakTable`, `kitchenTable` → repoint to the new coords
  (Meeting = the one Meeting-Room rect; Break = the two Break-Room rects; Kitchen = kitchen
  counter). Re-run whatever seats chairs (`fitTableSeats`/equivalent).
- **Desks array** + `fitDeskBoxes()` → rebuild from §4 workstations; keep the sprite-snap.
- **Objects** — printer (+ its `errandPoints` copy-run point), coffee, water, fire alarm, HR
  files, sales phones → spawn at the §4 pins.
- **Detection, pranks, audit, meeting/phase schedule (`PHASES`), catfish, Dale arc** — logic
  unchanged; they operate on the rebuilt geometry.

## 6. Cast / seat sanity

Plan has **22 workstations** for a cast of you + 21 → seats line up with one to spare. Confirm
each named coworker's desk assignment and the player's Intern start desk during the build.

## 7. Verify before calling it done (the golden rule: run it, don't read it)

Rebuild the headless harness fresh and run, in order:

1. `node --check` on the raw script (keep `const`/`let` intact — converting to `var` hides
   duplicate-declaration errors that are fatal in browsers).
2. **150k-frame soak** (~5 in-game days). Expect: 0 throws, 0 non-finite coords, 0 renderErrs,
   0 NPCs stuck in geometry. The canvas stub throws on any non-finite coordinate — that catches
   a whole class of scaling bugs from the 1400 change for free.
3. **Nav connectivity:** every room reachable; no NPC boxed in by a desk. (This plan tested
   clean: all rooms reachable, 0 desk overlaps, aisle pinch points resolved.)
4. **Ranks / seats / desks agree** — the one that's bitten this project since day one.
5. **Save round-trip** (`buildSnapshot`/`applySnapshot`) clean at the 5pm boundary.

## 8. Known-trivial artifacts (already checked — not bugs)

- A 3-cell dead nook between desks near **(880,700)** — unreachable but nobody needs it.
- 1-wide dead strips against walls (west of the break tables ~x860; behind the senior-sales
  desks; the north-wall edge) — not on any through-route.
- Two Printers / two Waters — intentional duplicates.

## 9. Not in this pass (future, don't build now)

Prank-assembly pipeline, rubber-band rivals, save-system hardening, the gas-station tutorial,
the floor/elevator handoff system. The Elevator/Stairs props here are the seam that later
system will use.
