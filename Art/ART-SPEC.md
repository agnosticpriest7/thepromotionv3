# Character art — what the game actually consumes

Written for Codex (art direction) so a batch can't be cut against a guess. **Every number here was
read out of the running game or out of the shipped PNGs, not out of a doc.** Where a doc disagreed,
the measurement wins and the doc has been corrected.

---

## 1. Walk strips — the format that matters

The game does **not** consume front-facing masters. Those are the source the strips get cut from.
What it loads is **four strips per character, one per facing**:

```
Art/sprites/walk_<key>_down.png
Art/sprites/walk_<key>_up.png
Art/sprites/walk_<key>_left.png
Art/sprites/walk_<key>_right.png
```

### THREE frames per strip, not four

⚠️ **This is the one that would waste a whole batch.** `CLAUDE.md` said "552×295 (four 138×295
frames)" and that was wrong — it mistook the *figure* width for the *frame* width, and 552/138 = 4
makes the error look right. Corrected 2026-09-04.

The game slices a strip by `CHAR_FRAMES = 3`:

```js
const cw = im.naturalWidth / CHAR_FRAMES;     // drawChar()
```

Measured on the shipped `walk_kyle_down.png` (552 × 295) by finding the actual figure clusters:

| cell | cell span | figure content | figure width |
|---|---|---|---|
| 0 | 0..184 | x 23..161 | 138 |
| 1 | 184..368 | x 216..335 | 119 |
| 2 | 368..552 | x 391..529 | 138 |

**Three figures, each centred in a 184 px cell.** A four-frame strip would be sliced into thirds and
drawn as fragments.

### Frame order

```js
const IDLE_FRAME = 1;            // the MIDDLE column is standing
const WALK_CYCLE = [0,1,2,1];    // left foot, pass, right foot, pass
```

So the columns are **[step-left, neutral/standing, step-right]**. The neutral pose is what a
character shows when idle, so it carries the identity — it should read as the master.

---

## 2. Background: exact magenta, no alpha

Shipped strips are **PNG colour type 2 (RGB, no alpha), no `tRNS` chunk**, background exact
`#FF00FF`. The engine keys it out at load.

- Use **exact `255,0,255`**. Near-magenta does not key and renders as an **opaque magenta block** —
  it reads as an art bug and isn't one.
- Anti-aliasing against the background produces a magenta fringe. Keep edges hard.
- No enclosed key pixels inside the figure unless a hole is genuinely wanted; they key through.

The `game-size` review PNGs in `masters/save-rite/rework-v2/` were checked and all eight are exact
magenta at the corner (2,832–3,436 keyed pixels each). That is the standard to hit.

---

## 3. Size — judge against the character, not the floor

⚠️ **There are two scales and prop art is judged against the wrong one by default.**

- The floor, footprints and prop widths are **true plan scale, 42.2 authored/m**.
- A character is *drawn* **45.0 authored tall** for a 1.7 m person — **26.5 authored/m**, a ratio of
  **0.63**.

**Source resolution is free.** `drawChar` scales a strip to 38 scaled px wide whatever it arrives at;
shipped strips are 552×295, Stacie's are 687×374. So pick a resolution that suits the drawing and let
the engine scale — but **never reason from the PNG's dimensions about how big it will look.** That
mistake once produced a confident "the character is ~2× too tall" when the measured answer was 0.63×,
i.e. the opposite direction.

---

## 4. Registering a character (this is the install step — Claude does it, not Codex)

For each new character, four names go in **two** places, plus one entry each in two tables:

1. `ART_FILES` — all four strip names, or they never load.
2. `MAGENTA_BG` — all four, or they load and render as magenta boxes. **Both lists are required**;
   they are separate and it is easy to add to one.
3. `CHAR_SHEETS` — one entry keyed by sprite index: `{down:…, up:…, left:…, right:…}`.
   Indices 0–20 are `chars.png` columns; per-character strips currently occupy **21–27**, so new
   characters continue from **28**.
4. `SEAT_ART` — only if a seated pose exists (`sit_<key>`), which is keyed and bbox-measured
   separately.

Playable characters also need a `PLAYABLE` roster entry; `locked:true` renders them greyed until the
art lands.

---

## 5. Names must match the game exactly

`charIndexFor()` resolves a sprite **by the character's name**. A file named for someone the game
does not call by that name never attaches — the character silently falls through to the name-hash
pool and keeps a stock face.

**Open decision, needed before strips are cut** (they inherit the filename):

- Batch 1 filed **`02_anjali_raval`**. The game builds **`Priya Raval`** — same surname, different
  given name.
- She is *already* wearing a borrowed face because of this class of mismatch: the store's Priya
  resolves to `CAST['Priya'] = 6`, which is the **office** Priya's sprite.

Either the game gets renamed to Anjali, or the asset gets renamed to Priya. Kyle's call.

### The live store cast, for reference

| name | dept | role |
|---|---|---|
| Priya Raval | front | staff |
| Marguerite Dubois | front | staff |
| Danika Osei | front | manager |
| Curtis Lam | grocery | staff |
| Bekah Thorne | grocery | staff |
| Russ Pelletier | grocery | manager |
| Gita Mahal | produce | manager |
| Bruno Sarr | deli | manager |
| Doreen Stapp | bakery | manager |
| Lorne Petrie | — | store manager |
| Garret Voss | — | assistant manager |
| Merv Kastelic | — | owner |

Batch 1 covers five of these exactly (Marguerite, Danika, Garret, Lorne, Merv). Tyson Beck and
Sandrine Pike are future roster — the brief plans 34 characters against the current 12 — so they are
early, not wrong.

---

## 6. Also wanted: generic shoppers

Separate from the named cast, and currently the biggest visible gap in the store. **120 shoppers pass
through in a day and they use 4 sprite looks** — every customer is one of four people.

These do not need per-character strips; they are drawn from `chars.png` columns via the
`MALE_POOL` / `FEMALE_POOL` index pools. **8–12 more generic civilian columns** appended to
`chars.png` would fix it.

`chars.png` format: **40 × 64 px per frame, 3 frames per character, 4 rows** (down, left, right, up).
Currently 2520 × 256 = 21 characters. Appending characters extends the width; `CHAR_COUNT` is widened
to match at install.
