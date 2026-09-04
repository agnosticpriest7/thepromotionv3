# Save-Rite — art wanted

Everything here was measured against the live level, not guessed. Nothing currently in the store
renders as a coloured box: every prop that exists has a sprite. So this list is about **what is not
there yet**, in the order it would change the most.

Conventions your existing store art already follows:

- **Magenta background** (`#FF00FF`), keyed out at load. See `MAGENTA_BG` in `index.html`.
- Drawn **top-down at true plan scale**, anchored bottom-centre, except pieces drawn as a ¾
  elevation (the cases, the baler) which carry their own foreshortening.
- Source resolution is free — the game scales by `ART_W`, which is in **scaled px** (divide by
  `S = 1.8` for authored units). I set the `ART_W` entry when the file lands.
- File goes in `Art/sprites/`, lowercase, and the path is **case-sensitive on Pages**.

---

## 1. Frozen section — the biggest visible hole

The westmost shelf run was removed to make room for this and nothing replaced it. There is a
**bare strip 127 × 224 authored (3.0 m × 5.3 m)** at `x 16..143, y 421..645`, inside the GROCERY
zone, running the full depth of the aisle block.

| want | notes |
|---|---|
| `freezer_run_a` | An upright glass-door freezer run, to sit as one column like a shelf run. |
| `freezer_run_b` | A second face so the aisle does not mirror. Two is enough; the shelf runs have five and it reads fine. |
| `freezer_coffin` *(optional)* | A low chest/coffin freezer for the open floor — see §3, it would suit the dead zones. |

**Match `shelf_run_a`: 496 × 1650 source**, drawing to **55 authored wide × 224 tall**. If you keep
that aspect the run drops straight into the existing spacing (`RUN_GAP` 118) with no layout change.

---

## 2. Shoppers — the store is currently two men

Measured: **120 distinct shoppers pass through in a day and they use 2 sprite looks.** Every one is
called "Shopper N", the name-hash fallback sends them all to `MALE_POOL`, and that pool is two
entries long. I have widened them to use both pools, so it is now 4 looks and a mixed crowd — but
four faces across a whole day still reads as the same people circling.

**This is the single highest-value art job on the list.** A shop is its crowd.

| want | notes |
|---|---|
| 8–12 generic civilian looks | Added to `chars.png` as new columns, or as a separate `shoppers.png` sheet. Range of age, build, and dress — a parent with a kid, an old man, someone in hi-vis on their break, a teenager. |

**Spec, matching `chars.png` exactly: 40 × 64 px per frame, 3 frames per character
(neutral / step-L / step-R), 4 rows top-to-bottom = down, left, right, up.** Current sheet is
2520 × 256 = 21 characters. Appending characters extends the width; I widen `CHAR_COUNT` to match.

A few **shopping-cart / basket variants** of the same bodies would sell it further, but they are a
nice-to-have, not the ask.

---

## 3. Two dead regions on the sales floor

Measured as sample points more than 30 authored from *any* fixture — bare floor with nothing to
look at and no reason to walk there:

| where | size | what would suit it |
|---|---|---|
| **GROCERY east** — `x 700..880, y 420..660` | ~232 × 240 authored (5.5 m × 5.7 m) | Free-standing displays: a **dump bin** of offers, a **pallet display** of multipacks, a **seasonal stand**. Low props, so sightlines down the aisles survive. |
| **FRONT END east** — `x 600..880, y 800..880` | ~280 × 80 authored (6.6 m × 1.9 m) | The stuff that lives beside tills: a **trolley/basket bay**, a **magazine and sweets rack**, a **bagging stand**, a **customer service desk**. |

| want | notes |
|---|---|
| `dump_bin` | Round or square offers bin. ~60–80 authored across. |
| `pallet_display` | Stacked multipacks on a pallet — you already have `pallet`, this is the loaded version. |
| `trolley_bay` | A nested row of trolleys. Wide and shallow, ~120 authored. |
| `magazine_rack` | Waist-height rack. |

Any two of these would fix both regions.

---

## 4. Store-specific consumables and parts (low priority)

The seven new prank parts — price gun, temperature log, packing tape, box cutter, spray bottle,
apron, master key — are **text-only in menus today and need no art to work.** Listing them only so
you know they exist if you ever want item icons; nothing is broken without them.

---

## 5. Things I deliberately did **not** ask for

- **Back-of-house props.** The corridor, offices, break room and washrooms are furnished with the
  office's own kit (desks, cabinets, lockers, toilets, sinks, fridge, coffee). That reads correctly
  for a shop's back rooms and I would leave it.
- **New checkstands / cases / trays.** All present, all correct, all in use.
- **Signage.** Department signs and the store sign exist and are placed.

---

## Priority, if you only do some

1. **Shopper looks** (§2) — the crowd is the level's population, and it is currently two people.
2. **Frozen run** (§1) — the one hole a player can walk to and see nothing in.
3. **Two or three floor displays** (§3) — fills both dead regions.
