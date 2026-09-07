# TESTME — the running list for Kyle's TV

Things that are merged and live, that a green gate **cannot** judge. A green soak means NOT
BROKEN; a clean screenshot means IT RENDERS. Whether any of it is *good* is your call, and this
is the list of what to point that call at.

Newest at the top. Tick things off or delete them once you've formed a view — nothing here needs
a reply, it's just a queue so nothing gets lost while you're away from the TV.

---

## From `grocery-prop-compression` (2026-08-30)

### 1. ⭐⭐⭐ The four props you judged, at the factors you approved
Baler **unchanged** (the anchor), checkstand **x0.63**, pallet **x0.75**, go-back cart **x0.85**.

Measured against a person's drawn height: the checkstand went **2.41x -> 1.52x**, the pallet
**1.13x -> 0.85x**, the cart **1.17x -> 1.00x** (exactly one person-height). The baler stays 1.57x.

### 2. ⚠️ THE FRONT END NOW READS SPARSE — this is the thing to look at
The lanes are correctly scaled against people now, but they kept the positions they had when they
were 45 authored wide. At 27 wide the walkways went **175 -> 193** authored and only about **12% of
the frontage is checkout**. It looks under-furnished.

That is a *positioning* consequence, not a scale error — the fix is moving the lanes closer
together, which is a layout change I did not make. **Tell me if it bothers you and it is a small
branch.**

### 3. ⚠️ THE STORE IS DELIBERATELY MIXED-SCALE NOW — and this is the judgement call
Four props are compressed; the shelf runs, deli/bakery cases, dairy case and produce tables are
still at true plan scale. **Stand at about (500, 500)** — the cross-aisle between the shelf block
and the checkouts. The block ends at y469 and the lanes start at y520, so a **compressed lane and an
uncompressed shelf run are in the same frame**.

If that reads fine, the rest stays as it is. If it reads wrong, the next branch compresses
everything and repacks the floor.

My read, for what it is worth: they do not clash, because the eye compares each to the *people*
rather than to each other — and the lane now passes that test. But that is exactly the call I
cannot make for you.

**Aisles are untouched** — still 65 authored clear, every aisle walks, door to sales floor walks.

---

## From `grocery-prop-scale` (2026-08-29)

### 1. ⭐⭐ The props are all at one scale now
You were right that they were wrong against **each other**, not against the floor. Measured, they
ran from **25.9 to 120 authored units per metre — a 4.6x spread**. Everything is now sized from its
real-world size at one scale (**42.2 units per metre**, taken from the character sprite: a person
is 0.5 m across the shoulders). Spread is now **0.7%**.

**The baler grew 1.63x**, pallets 1.30x, the go-back cart 1.41x, produce tables 1.25x. The
checkstands only came down 7% — they were nearly right; they *read* as huge because the baler beside
them was 63% undersized. A checkout lane is now **1.71x** the width of a baler, where it was 2.99x.

**Side effect worth a look:** the shelf runs went 60 → 55 authored (a gondola is 1.3 m), and since
the pitch didn't move, **the aisles got wider — 60 → 65**. The runs are where you left them.

**One thing I did not change, deliberately.** The brief listed the deli/bakery case as "1.5 m per
unit". At 1.5 m wide that asset would be 0.46 m deep, which is not a deli counter — it's drawn as a
**multi-section run**, 4.27 m wide and 1.3 m deep, and it was already correct. Sizing it as briefed
would have shrunk a right fixture to a third.

### 2. The Bakery is clean — and it was worse than you saw
The couch and the desk were **office decor drawn with no level gate at all**. The desk was the
**CEO's executive desk**; the couch was the **reception waiting couch**. Not the manager/owner desks
from last branch — those are correctly in the back office.

**All eleven pieces were bleeding, not two.** The other nine are in DELI, PRODUCE, GROCERY, the
FRONT END and the ENTRANCE — rooms you hadn't walked into. **And a sweep found a twelfth nobody had
reported:** the office's reception counter has been standing in the store's FRONT END among the
checkouts.

All of it now draws per-level. **Worth walking the whole store once** to confirm nothing else looks
imported.

---

## From `grocery-props-and-lights` (2026-08-28)

### 1. ⭐⭐⭐ THE STORE HAS LIGHTS. Everything you approved was judged in the dark.
They come up at **8:15** and go out at **4:45**, same as the office, because it is the same code.
Measured lift: mean screen luminance **64.5 → 106, about 1.64x**.

**This is a re-judgement of every asset so far.** The shelf runs, the endcap, the checkstand, the
floor colours and the aisle spacing were all approved on an unlit floor. If anything now looks
washed out or flat, that is the lighting revealing it — **tell me and I will not tune the art to
hide it**.

Day 1 is lit from 8:00 on purpose (the orientation tour); the breaker sequence starts day 2.

### 2. ⚠️ THE CHECKOUTS MOVED, AND THAT IS A LAYOUT CHANGE YOU SHOULD LOOK AT
The lanes used to be **east-west bars**. The checkstand art is drawn **north-south**, and rotating
a top-down sprite lights it from the wrong side — so with both mirrors supplied, the lanes were
re-laid perpendicular to the south wall: four lanes, **tills facing each other** in each pair.

The gaps between lanes are the walkways now, which is how a real front end works. 172 authored
between the lanes of a pair, 592 through the middle, and the entrance door opens into that middle
gap so you walk in and straight up the store. **Does the front end read better or worse?** This is
the one thing here that changes how the store plays, not just how it looks.

### 3. The store is furnished
Deli and bakery cases (butted into one continuous run), a **dairy case** (new fixture, set dressing
only), four **produce trays** with no two neighbours alike, **pallets** in receiving, the **baler**,
and the **go-back cart** at the front end. The manager's and owner's offices finally have desks.

Lockers, the department board, the intercom and the break table were already reusing office art —
that is by design and unchanged.

---

## From `grocery-shelf-endcaps` (2026-08-28)

### 1. The aisle runs have south endcaps ⭐⭐
Every run now ends in a proper endcap facing the front-of-store cross-aisle. South ends only —
the product band is along the cap's bottom edge, so a north cap would light from the wrong side.

**This closes the open question from last time.** The runs had shrunk 245 → 199 authored and I
flagged the leftover gap as "wider cross-aisle or a hole?". The caps take that space back: run 199
+ cap 47 = **246**, so the block is back to the length it was before the art changed, and the
question is moot. Aisle width is still untouched at 60.

### 2. ⚠️ The checkstands are NOT done — and I need a decision
The new checkstand art is drawn **north-south** (447 × 1039, a lane running away from you). Your
store's checkouts are laid out **east-west**: four lanes, each 148 × 48, horizontal bars of three
counter units at y 560. Your brief said stop and report rather than rotate, so I stopped.

Two ways out, both yours:
- **Re-lay the checkouts north-south** — lanes perpendicular to the south wall, which is what the
  art assumes and what most real shops look like. Changes the front end's layout.
- **Re-draw the art east-west** — keeps the floor as you judged it.

Also: **`checkstand_r.png` never arrived.** Only three images came through — the endcap, one
checkstand, and a run-with-cap composite (496 × 2036) that isn't one of the eight listed files.

---

## From `grocery-shelf-art` (2026-08-27)

### 1. The grocery aisles have real shelf art ⭐⭐⭐ — and this one is a look-at-it call
Five purpose-built runs replace the placeholder `supply_shelf`. Each asset is a **whole aisle run**
drawn top-down: fixture spine down the centre, product banding facing out into both aisles. Six runs
over five variants, assigned **a,b,c,d,e,a** — deterministic, so the same aisle looks the same every
load and you can judge a layout twice.

**The couch-distance question is whether five faces read as VARIED or as NOISY.** No test answers
that. Walk the block and look at it side on.

**⚠️ The runs are shorter than they were: 245 → 199 authored.** Not a compression fudge — a sprite's
height is derived from its width, so six runs at the art's native aspect would each need 74 wide,
and six of those plus 58-wide aisles needs 734 where the floor has 652. Keeping six aisles and the
aisle width meant spending the difference on run length. It shows up as a **wider cross-aisle along
the south end of the block**. If that reads as a hole rather than a cross-aisle, the fix is
**five runs instead of six**, which fits at full native size — your call, and a small change.

**Aisle width is untouched.** Blocker-to-blocker is 60 authored, exactly what it was.

### 2. Three things moved because the runs got wider
- **Russ Pelletier** now stands in the south cross-aisle at the foot of his aisles (was inside the
  new run 6).
- **The Endcap** now sits at the head of a run rather than across an aisle mouth.
- **Your own station** moved to the head of the last run. It used to be "at the end of an aisle",
  which stopped being true when the band widened — it ended up standing *in* aisle 4.

Worth checking these three feel like they're in sensible places, since I chose the spots.

---

## From `grocery-rank-index-leaks` (2026-08-27)

### 1. The store has its own ORG chart now ⭐⭐
**Panel → ORG, in Save-Rite.** It used to be the office's chart wearing a shop's clothes: it named
**Mr. Sterling as CEO** (not in the building), showed **Dale's manager chair** (no Dale), printed
**"HR: —"** (the store has no HR), filed all twelve staff under **JUNIOR SALES**, and at OWNER
displayed the entire office CEO merit block — including the **"land a client"** prompt you spotted.

It now shows: who is over you (Owner / Store Manager / Assistant Manager, marked **YOU** when it is
you), then the five departments with each manager and their crew, department health, and you in
your own department while you are still in one.

**What to check:** climb a few rungs and open ORG at each. Does it read like a shop's org chart?
Is department health useful there, or noise? The office chart is provably unchanged — I hashed it
at all six ranks against `main` with a fixed seed and it is byte-identical.

### 2. Your 5pm card at Assistant Manager
A store AM delegates all day but got **no delegation scoreboard** at 5pm — the day-end card was
keyed to a stale copy of a gate. DELEGATED CLEAN and Demerits now appear at both AM and Store
Manager. Also: an Owner's card no longer shows the office's "BRANCH HEALTH · need 80" line.

---

## From `grocery-customers`, `grocery-delegation`, `grocery-sightlines-prototype` (2026-08-27)

### ⭐⭐⭐ SIGHTLINES — the prototype, and the only thing here that is a real question
**Panel → SETTINGS → `👁 Sightlines (store, prototype)`.** Off by default. Turn it on and off
inside one run; that comparison is the entire experiment.

What it does: a sabotage costs **more if a member of staff can see you** and **less if nobody can**.
Base 18 becomes **29 seen / 7 unseen**. Shelf runs block sight, so **an aisle is cover and the front
end is a stage** — that fell out of the nav grid for free, which is why this was cheap to try.

Three questions, none of them testable:
- **Does the floor become tense?** Does walking into the open feel different from working an aisle?
- **Does sabotage stop being strictly better?** It is the fastest road to unseating a manager. If
  being seen makes it expensive, the three roads become a real choice. If not, this idea has not
  earned its place.
- **Is it legible?** ⚠️ **This is the likeliest failure and I could not fix it.** The only feedback
  is a log line — *"— Danika watching"* or *"— nobody saw"* — after the fact. If you cannot tell
  why suspicion jumped, it is noise. That is the argument for a visible indicator, and the reason
  to judge it before building one.

**It is a prototype and it is meant to be thrown away.** "This needs a real vision system to be any
good" is a perfectly good answer.

### 1. The shop has customers ⭐
Six shoppers at a time walk in, look at a few things and leave. `CUSTOMER_TARGET = 6` is the dial.
They cannot be talked to, pranked, gossiped about or delegated to — they are scenery that moves.
**Is six right?** A store too busy to walk is worse than an empty one.

### 2. The ending goes and looks at the sign ⭐
Reaching Owner now holds the camera on the fascia for 3.6 seconds before the modal, so you actually
see `MERV'S` become your name. Previously it changed off-camera while you stood in the back office.

### 3. Delegation is the store's now
The tray at Assistant Manager and Store Manager hands out store work — pallets, date codes, the ad
display, the front end. An AM delegates to Department Managers and floor staff; a Store Manager
delegates to the AM and the Department Managers. **Does it feel like managing, or like admin?**

### 4. Office changes you may notice
The delegate menu numbers duplicate jobs `(1 of 2)` when two of a kind are on the tray — they used
to be indistinguishable. Nothing else in the office moved.

---

## From `grocery-upper-rungs`, `grocery-endgame`, `grocery-loose-ends` (2026-08-26)

### ⭐⭐⭐ THE LADDER NOW GOES ALL THE WAY, AND IT RESOLVES
The store has six real rungs and an ending. This is the first time it can be played start to
finish. Everything below is subordinate to: **does the whole climb hold together?**

### 1. The back half has its own shape ⭐
Rungs 4–6 used to just arrive. Now:

| rung | how you get it | intended feel |
|---|---|---|
| **Assistant Manager** | your department beats the other four by 4, three days running | a performance comparison |
| **Store Manager** | settle what you owe Lorne — repay in full, or use leverage | a debt |
| **Owner** | keep the store at 70 for three days, then **Merv offers** | a succession you can decline |

Deliberately not "three roads" three times. **Garret is passed over, not destroyed. Merv is never
sabotaged** — he sells because he's glad to. Whether that last contrast reads as earned or hollow
is the question the whole level has been building to.

### 2. Taking Lorne's job ⭐ the beat I'd watch closest
If you used the **loyalty road** at rung 3, he moved a Department Manager aside for you — and the
debt to take *his* job is correspondingly larger (7 favours instead of 3). Repay it and he puts
you up for his own job gladly, which is meant to be worse than betraying him. There's a leverage
route too, costing 22 suspicion.

### 3. The sign ⭐⭐
`MERV'S` all game. At Owner it reads **your name** — `KYLE'S`, `STACIE'S`, `RAELEE'S`, `JAX'S`,
`THE INTERN'S`. It's at the entrance, drawn at world scale.

**One limitation worth your call:** Merv is in the back office, so at the moment you accept, the
camera is nowhere near the fascia. The change is real and persistent, but you have to walk to the
front to see it. A camera pan would land it properly — that's new mechanics, so I left it.

The ending beat is deliberately tiny: *"They changed the sign on a Tuesday. Nobody made a speech."*
Then the modal and back to the menu, matching what the office already does.

### 4. Office changes you'll notice
Two, both text-only, no behaviour moved:
- **Gate hints are much shorter.** The CEO one was 274 characters in a two-line slot and mostly
  invisible; it's 59 now. The full text still lives in THE WAY UP.
- **The whiteboard during a meeting** now also offers an outstanding board task, if you have one.
  Otherwise identical.

### 5. Dale no longer introduces himself in a supermarket
At Department Manager the store was logging *"Dale has started looking at you… a second path is
open."* Dale doesn't work there. Fixed, along with the catfish, countersign and HR freeze all
switching themselves on at store ranks.

---

## From `grocery-flavour` (2026-08-26)

### 1. Does the store sound like a shop now? ⭐ the point of the branch
Ten people have voices. Walk up to each one. The intent:

- **Russ Pelletier** won't move — bad back, thirty-one years, *"Ask Curtis. Curtis can reach it."*
- **Gita Mahal** runs Produce like her own business. *"Everything in here is dying. The job is
  deciding how fast."*
- **Doreen Stapp** is sweet and ruthless. Sweetheart, love — and *"I have outlasted six store
  managers, love."*
- **Bruno Sarr** guards his counter. **Danika Osei** is managing a queue that never ends.
- **Priya** is unbothered, **Marguerite** knows everyone, **Bekah** barely speaks (mostly "...").
- **Lorne Petrie** is warm and always slightly asking for something.

They also talk to themselves ambiently. **Worth knowing: they were never silent** — before this
they were saying office lines (*"Did the boss see?"*, *"You did NOT hear this…"*) with randomised
personalities. So the change is a voice swap, not new noise.

### 2. Do the departments feel different to work? ⭐
Each department now has its own four jobs. A Bakery clerk pulls racks, marks down yesterday's
bread, ices cakes, sets the proof. A Produce clerk culls, mists, rotates berries, builds the wall
display. **This is words on the same triggers** — no new mechanics — so the honest question is
whether that's enough to make one run feel unlike another, or whether it needs real differences.

### 3. Placeholder by intent
Both parts are deliberately shallow. No branching dialogue, no consequences, no department-specific
mechanics. If the flavour lands, that's the argument for going deeper; if it doesn't, better to
know before building more on top.

---

## From `grocery-unseating` (2026-08-26)

### 0. Do three ways of removing one person feel like three different games? ⭐⭐ THE BIG ONE
This is the question the whole branch is asking, and it can't be answered by a test.

Pick a department, then take **merit** on one run, **loyalty** on another, **sabotage** on a
third. The intended feel:

| road | how it should feel |
|---|---|
| **Merit** | slow and safe. Run the department well for three days. Nobody gets hurt — the manager is moved *up*, and you're the obvious replacement. |
| **Loyalty** | fast once built, but you owe Lorne Petrie, and he'll remember he did it for you. |
| **Sabotage** | fastest, and the only one that raises suspicion. Two failures landed on their department and they're out. |

If two of them feel like the same button with different text, that's the finding.

### 0b. Is the sabotage fiction right?
It's the office prank pipeline with store words: date codes, the rota, stock counts that never
tie, a forged temperature log. Reads well on paper — does it read as *grocery* in play, or as
office pranks in a costume?

### 0c. The three dials
`UNSEAT_MERIT_DAYS 3`, `UNSEAT_LOYAL_TARGET 4` favours, `UNSEAT_SABO_TARGET 2` failures. These
are guesses. If merit feels like a grind or sabotage feels cheap, they're one-line changes.

### 0d. Lorne Petrie exists now, and so do three new managers
Gita Mahal (Produce), Bruno Sarr (Deli), Doreen Stapp (Bakery), Lorne Petrie (Store Manager).
Placeholder art, no dialogue yet. Ten NPCs on the floor now — worth a look at whether the shop
feels staffed or crowded.

### 0e. THE WAY UP panel at rung 3
It now lists all three roads with live progress on each. Before this branch it told store players
to *"Ask Dale if he needs anything (start sucking up)"* — in a shop with no Dale. Check it reads
clearly at couch distance.

### 0f. ⚠️ A HUD BUG I FOUND BUT DID NOT FIX — the office's gate hints overflow badly
Measured in the office, the rank-note line runs **106 characters at Assistant Manager, 212 at
Manager and 273 at CEO**. That slot is about two lines wide, so those hints wrap off the top-left
and clip behind the rank title — the CEO one is mostly invisible. Long-standing, not caused by
any recent branch, and it's a HUD change rather than a ladder one so I left it alone.

The store's equivalent now fits in 68 characters (`Bruno has the chair — see THE WAY UP`), and
there's an assertion pinning it there. **Worth deciding whether the office's deserve the same
treatment** — it's the panel that tells you what to do next, and right now at CEO it doesn't.

### A. The department prompt no longer accuses you
**Was:** `next: DEPARTMENT CLERK (BLOCKED: you have to put in for a department first)`
**Now:** `next: DEPARTMENT CLERK (Pick a department to move up.)`

Your call was to change it, so this is just a confirmation read. The office still says
`BLOCKED:` on gates that really are refusals — worth one glance at an office run to check that
still feels right, since it's now the only place the word appears.

---

## From `grocery-ladder` (2026-08-25)

### B. Does the department choice land? ⭐ the big one
It arrives early, before you've seen much of any department, and it's permanent. That might be
exactly right — people pick jobs on almost no information — or it might land before it can mean
anything. **Notice what you feel when the menu comes up**, not just whether it works.

### C. Does a six-rung ladder feel like a career?
The question the whole level exists to ask. Climb it once end to end.

### D. The top half is currently a formality
Rungs 4–6 have no gates yet (the store's own gates are this branch's unseating paths, which only
cover rung 3). So the back half is unearned by design right now. You're judging the *shape*, not
the difficulty.

### E. The DELEGATE tray shows at the store's AM and Store Manager rungs
Existing office mechanic firing on rank index — not wired deliberately. Soaks clean. Does a shop
want that tray at all?

---

## From `grocery-npcs-first-crew` (2026-08-25)

### F. Six staff on the shop floor
Priya and Marguerite on the checkstands, Danika on Front End, Curtis and Bekah in the aisles,
Russ off the aisle ends. They **stand** — there's no chair or nameplate at a station. Does a
standing crew read as staff, or as furniture that moves?

### G. Watch a break
All six should head back of house. This is where the worst bugs were: before the fix, half walked
into the world's north-west corner and the other half stood in the middle of aisle 5.

### H. Old saves refuse to load
`SAVE_VERSION` went 4 → 5. Not optional — a pre-crew grocery save would have loaded and silently
deleted all six staff. Expect your old slots to be gone.

### I. Three crew stand beside their desk, not inside it
Lorne Petrie (Store Manager), Garret Voss (Receiving) and Merv Kastelic (Owner) had their standing
spots authored on top of the furniture they belong to — the two desks and a receiving pallet, all
three of which I added in `grocery-props-and-lights`. Merv genuinely could not stand at his own
station; the other two were clipped but usable. Each has moved 8–12 authored units: the two
managers now stand behind their desks, Garret in front of the pallet.

**What to look at:** back of house. Merv in the OWNER room and Lorne in STORE MANAGER should read
as standing *at* their desks, not merged into them. Garret should be clear of the receiving pallet.
It is a small nudge — if any of the three now looks oddly far from their desk, say so and I will
tune the distance.

### J. The back of house has rooms, and the front end has a checkout run
The east side of the store now runs all the way down: a corridor off the existing block, then a
walk-in cooler, an assistant manager's office and a cash office, each 237 deep. **Garret Voss has
moved out of the receiving bay** and works in the assistant manager's office at (1240,470) —
standing beside his desk, not in it.

The four checkstands were spread over 1127 authored units, most of the width of the shop. They are
now a 528-unit run in two clusters either side of the doors.

**What to look at:** walk in and look at the front end first — it should read as one checkout run
you can take in at a glance, with the doors opening into the gap in the middle. Then go through the
swing doors and down the back. The cooler is the only genuinely walled room back there; you should
have to use its door rather than walking through the wall like you can between the manager offices.

**The thing I'd most like your eye on:** those three rooms are 237 deep and about 130 wide, so they
are deeper than they are wide — the assistant manager's office in particular reads long. That is
what three rooms across a 438-wide block produces. If it looks wrong on the TV, say so and it can
become four rooms, or two rows.

### K. The morning huddle happens in the back now
It used to gather the crew around the office meeting room's coordinates, which in the store is the
middle of the GROCERY aisle — eleven of eighteen staff walked onto the sales floor for it every
morning. It now happens in RECEIVING. **Watch the 09:00 huddle** and check it looks like a shift
briefing in the back rather than a scrum in aisle four. The office is untouched.

### L. Save-Rite is a supermarket now
The whole store was re-laid to your plan. **Everything moved**, so treat this as a fresh look
rather than a diff.

- **You come in at the front-left.** Doors at x 220–340 in the south wall, through a glass
  vestibule — the walls use the same translucent pane the CEO's office is built from.
- **Perimeter departments.** Dairy and deli along the north wall, bakery north-east, produce
  south-east. Frozen is the westmost aisle against the wall, not a department — it still has
  shelf art, so it will not read as frozen until it gets its own cases.
- **Five aisle runs, four aisles**, then a cross-aisle, then four checkouts across the front.
- **Back rooms along the north**, off one corridor: walk-in cooler, store manager, owner,
  assistant manager, break room, and receiving in the north-east corner.
- **A dock and a yard outside the east wall**, where the semi backs in.

**What to look at first:** stand at the doors and just walk the perimeter clockwise. It should
read as a shop you have been in. Then go through the swing doors — they are the gap in the dairy
wall, roughly x 384–474 — and check the back reads as a corridor with rooms off it rather than a
maze.

**The thing I most want your eye on:** the cooler is the west end of the back rooms *because* its
south wall is the dairy wall — that is where the dairy cases sit, loaded from inside and served
from the aisle. If that reads wrong on the TV, the whole back-room order changes.

**Known and deliberate:** there is no separate staff WC any more — at 78 wide it was costing
receiving the width it needed, and receiving kept sealing itself with its own furniture. The
toilet folds into the break room. Say the word and I will find it space elsewhere.

**Old saves will refuse to load.** `SAVE_VERSION` went 5 → 6. Not optional: a v5 save would drop
you into a store whose departments, desks and stations have all moved.

### M. The store got bigger, and the back rooms got sensible
Four changes off your walkthrough.

- **The store is 265 taller.** It was cramped: the aisle block had the service counters hard
  against its top and the tills hard against its bottom. There is a real cross-aisle above the
  runs now and a deep front end below them.
- **The entrance is a doorway, not a corridor.** The glass vestibule stopped running the whole
  width of the building; it ends at x=430.
- **No receiving room.** You were right that the bump-out is the receiving room — an indoor one
  duplicated it and ate the width everything else needed. The dock opens straight into the back
  corridor at truck height, and **the staff WC is back** as its own room.
- **Produce shifted down** off the bakery's heels; the bakery counter squared up across its block.

**What to look at:** walk the aisles first — that is the change you asked for, so it is the one
that has to feel right. Then the back: corridor along the north, cooler at the west end on the
dairy wall, offices, break room, WC, and the roller door at the east end where the truck backs in.

**Watch for:** the office is unchanged, but the WORLD grew, and the office building did not. If
you see grey carpet or empty floor stretching below the office instead of grass, or anybody
standing outside its south wall, that is this change and I want to know.

### N. Everybody works their own job now
Before this, everyone stood on their station all day. Measured on day 1: the store manager spent
35% of it inside his own office, the owner 54%, and the bakery manager 44% of hers in no room at
all. Now the distinction is the job:

- **Cashiers stay at the tills** — Priya and Marguerite move less than anyone.
- **Grocery clerks work the aisles** — Curtis and Bekah, 55–71% of the day in GROCERY.
- **Department managers walk their own department** — Bruno the deli, Doreen the bakery, Gita
  produce, Russ grocery. Roughly twice the movement of a clerk.
- **Store manager, assistant manager and owner walk the whole sales floor**, dropping back to
  their offices between laps rather than sitting behind a door.

**What to look at:** stand still somewhere on the floor for a minute of game time and just watch.
It should read as a shop with staff in it rather than a set of people standing on marks. In
particular check that Lorne, Garret and Merv actually come past you — if they feel like they never
settle, or conversely never leave, the dwell is one number and easy to tune.

**The one I'd watch for:** a manager standing somewhere daft — inside a counter, in a doorway, or
in the middle of an aisle mouth. Their route points come off the room shapes, so a badly-shaped
room would show up as somebody loitering in a silly place rather than as an error.

### O. The pass over N: does each department actually feel worked?
N put people on the right jobs. Watching a full day back showed the jobs still didn't *look* like
work, so this is the follow-up. Measured on day 1 across a working day, before → after:

| what a player sees | before | after |
|---|---|---|
| bakery manager on the **staff** side of her own counter | 25% | 96% |
| deli manager on the staff side of his | 63% | 89% |
| cashiers within reach of a till | 59% | 69% |
| grocery clerks at a shelf run | 57% | 79% |
| two crew standing inside each other | 10% | 3% |
| time in the **back corridor** during work hours | 10–29% | 3–9% |

**What to look at:**

- **Stand in front of the deli and the bakery counters.** Bruno and Doreen should be *behind* the
  case, serving across it. Doreen was on the customer side three quarters of the day before this —
  if she is ever in front of her own counter now, I want to know.
- **Watch the aisles.** Staff should be working the shelves — facing, rotating, price checks — not
  only walking through. Bubbles say what they're doing.
- **Watch the swing doors for a minute.** Before this, five of the nine reasons to walk anywhere
  were behind them, so the shop floor drained on a rota. Traffic through them should now look
  occasional rather than constant.
- **Look for two people standing on the same spot.** Much rarer now, but the fix is a nudge, not a
  wall — they can still brush past each other.

**The one I'd watch for:** somebody doing shelf work at a fixture that has no art for it yet — the
frozen section especially, since that's still waiting on your assets. A clerk facing an invisible
shelf will look like they're working on nothing.

### P. The posts you marked on the TV
Your screenshots, turned into where people stand. All of it derives from the fixtures or the
sprites, so re-laying the floor moves the crew with it.

**A bug was underneath all of this and it's worth knowing about.** `deskSeat()` stands a person 26
units clear of a desk's *edge* — correct for furniture you sit at, wrong for a station, which is a
floor marker that already means "stand here". Every store station was displaced ~38 units from
where it was authored. It hid because the offset usually landed on open floor and just looked
approximate. But a cashier's seat side points *into* her own till, so that spot was rejected and
she fell through to the next candidate — working the **bagging end of her own lane by accident**.
So some of what you were looking at was never where I'd put it.

**What to look at:**

- **The lanes.** Cashiers stand beside the register (the screen/PIN pad end), not halfway down the
  belt where they used to be. Three lanes and two front-end staff, so the bagging shelves and the
  spare register are worked on rotation rather than owned — you should see people move between
  them, not stand frozen.
- **The deli counter.** Bruno was authored at x=620; his case ends at x=619. He was standing *past
  the end of it*. He's now centred behind it. Doreen was worse — her spot was inside the bakery
  case's collision, so the grid shoved her to the back wall.
- **The counters moved up 8, and 8 was all there was.** I measured it in the browser rather than
  guess: shifting them up 8 costs nothing because the loss falls inside the nav grid's own padding,
  but at 12 the staff band behind them collapses to a single 18-unit row — walkable, but too thin
  for two people to pass. If you want them tighter than this, I need to move the back-room wall
  north first. Say so and I'll do it.
- **The cash room.** Lorne and Merv now walk in; Garret does not. It's one post on a 23-post round,
  so expect it a couple of times a day rather than constantly — if it reads as "never", the dwell
  is one number.

**Two things I want your call on:**

1. **There is no dedicated bagger NPC** — the roster has two front-end staff and a front-end
   manager. Right now they rotate through the bagging posts. If you want somebody permanently on
   the bagging shelf, that's a new crew member, and I'd rather you pick the name.
2. **The AM is deliberately excluded from the cash room.** You said manager and owner, so that's
   what it is. One entry to add Garret if he should be in there too.

### Q. The store stops speaking in office words
I went looking for anything else worth fixing before you test, and found one family of bug. None of
it was findable by reading the code — the tables all looked fine, because they were the *office's*
tables being read by the store. I caught it by intercepting the store's own log for five in-game
days and grepping what it actually said.

| what you'd have seen | where |
|---|---|
| "Bruno Sarr's **desk** (empty) — Search their **drawers**" | standing in the middle of the deli |
| "Gita took my **stapler** last month. Take something off their **desk**." | favour ask |
| "Slip something incriminating into Bekah's desk. **HR will do the rest.**" | favour ask, in a building with no HR |
| "Grab me a **stapler**? I'm dying." / "letterhead from the **printer**" | fetch favours, via two separate paths |
| "The **office** churns on without you." | ~10 times in 5 days |
| "You slammed the **desk** and shouted at the **monitor**." | your own meltdown |

**The one that actually cost you something:** planting evidence *deleted a piece of leverage
permanently and could never pay off*. It splices the document out of your dirt and tells you "now
you just need HR to check it" — there is no HR in the store, so nothing could ever check it. That
option now says so and is disabled. A favour that *asks* you to plant still works, because it
credits on the act.

All of it keys on **structure, not the level's name** — a building whose workers stand at posts
instead of sitting at desks is a shop floor — so a third level gets the right words for free. The
office keeps every one of its own words, and the test asserts that too, otherwise this could be
"fixed" by deleting the vocabulary everywhere.

**What to look at:** walk up to a crew member and press A. It should say *their station* and *go
through their things*. Then read the ticker for a day and see if anything still sounds like an
office — that sweep is now a test, but it only knows the words I thought of.

**Two I did NOT fix, because they're your call:**

1. **"Bag the orders at your lane" is completed at a cubicle desk 384 units from the nearest till**,
   in the middle of GROCERY. Your desk in the store is an office cubicle standing in the open on
   the sales floor — it's the anchor every `via:'desk'` task routes to. The honest fix is that your
   work anchor follows your post as you rank up (bagger → a lane, clerk → an aisle), which is a
   design change rather than a polish pass. I didn't want to guess it the day you test.
2. **The store's containers stock office supplies** — 11 staplers, letterhead, sticky notes. Making
   that store-native (a price gun, a box cutter, a spare apron) needs new items, and inventing item
   ids right before a test seemed like the wrong trade.

### R. Your locker, and fifteen pranks that belong in a supermarket
Both things you asked for, plus four bugs that turned up while building them.

**Your "desk" is a locker bank now.** It was an office cubicle — swivel chair and all — standing in
the open in the middle of the sales floor, and it's the spine of the whole contraband system
(drawer, hidden panel, crafting, audits). A locker answers every one of those jobs in the store's
own language: the drawer is the locker, and "taped behind the panel" is taped inside the door. It
moved to the front end against the cash-office wall, which also fixes the thing from item Q — "Bag
the orders at your lane" used to complete **384 units from the nearest till**, and now it's 86.

**Fifteen store pranks, seven store parts.** Same five personalities × three tiers as the office,
same number of parts per prank slot-for-slot, so the crafting economy is unchanged — only the
fiction moved. New parts: a price gun, a blank temperature log, packing tape, a box cutter, a spray
bottle of sanitiser, a spare apron, and **the manager's master key** (the store's version of the HR
keycard — at most one on the floor, never more than two days in three, and only ever in the back of
house, so getting it means going somewhere you have no business being).

**What to look at:**
- Craft something. The parts list and the prank names should read like a shop, not an office.
- **Try a Master prank.** They could never resolve here before — they plant a document and tip HR,
  and there is no HR, so all five queued forever and quietly ate the rarest parts in the game.
  Now a tip fetches **Lorne**. He walks over, opens the locker, and it lands as a strike. It only
  sticks on someone already in trouble, same as the office.
- I deliberately did **not** wire the manager into the *random* audit — a master prank summons him
  and nothing else does, so the store hasn't gained random locker sweeps. Say if you want those.

**Also fixed, found on the way:**
- **The CEO's walkaround is Merv's now.** A phantom Mr. Sterling was touring the supermarket four
  times in five days, with a bonus task to bring him the Henderson file — uncompletable, he is not
  in the building — and a route authored for the 1400×760 office loose in a 1500×1040 store. Merv
  walks it instead: a route derived from your own departments, and "Bring the day's numbers to
  Merv Kastelic (Owner)", which you can actually finish.

  **The care worth knowing about:** I did *not* flag Merv as the boss. `isWorker()` excludes the
  boss, and Merv is the top rung of the store's ladder — the man you are climbing towards.
  Flagging him would have quietly pulled him out of delegation, promotion and succession, and
  nothing would have gone red. The lap moved to him; the role did not.
- Desk collision boxes were measured against `cubicle_desk` regardless of what sprite the desk
  actually drew. Harmless while every desk *was* a cubicle; the locker was the first that wasn't.
  The office is byte-identical either way — I measured rather than assumed.
- Danika's post was a hardcoded pair of numbers for the third floor plan running, and the locker
  landed 19 units above it, less than a nav row, so it stopped being standable. Derived now.
- The store was still stocking staplers because the shelves get filled during boot, *before* the
  crew exist — so the "is this a shop" test saw no staff standing at posts and said "office".

### S. Your six props are in
The frozen aisle exists, and both bare corners have something in them.

**The frozen aisle.** The shelf block moved east (runs now start at x 288) so the 127 authored the
deleted westmost run left behind could become what it was cleared for. Same move also took the
GROCERY dead zone from 232 authored of bare floor down to 86. Grocery aisles are unchanged at 65
clear; the frozen ones are 44–48.

```
freezer_wall   x  19..45    against the west wall, doors EAST
freezer_run_a  x  89..142
freezer_run_b  x 188..241
shelf runs     x 289, 407, 525, 643, 761
```

**The rotation you flagged — you were right to.** The single-sided unit is drawn doors-on-the-left,
which is correct against an *east* wall. The frozen aisle is on the *west* side, so as shipped its
doors would have faced into the brickwork. It's mirrored at draw time rather than needing a second
asset. I verified it by drawing the sprite both ways offscreen and measuring which half carries the
detail — not by looking at it, because at that size I could not tell.

**The other three did not go where the bare floor was**, for two reasons:

- The magazine rack, placed east of the tills, stood square across the **public washroom's
  doorway** — the 60-unit gap at x 900 — leaving 14 of it. The washroom and both toilets went
  unreachable.
- The front end is **deliberately open**: the sightline test asserts it is a stage you can be seen
  crossing. Furniture there is cover, and cover there is a mechanic, not decoration.

So the trolley bay and magazine rack went to the **entrance**, which is where they'd be in a real
shop and was also the emptiest room in the building. They sit below the MERV'S sign and east of the
doors. The loaded pallet took the last of the grocery dead corner.

**What to look at:**
- Walk the frozen aisle. Check the wall unit's doors face *you*, not the wall.
- Walk in through the front doors past the trolleys — make sure nothing crowds the doorway.
- The pallet display sits at the east end of the grocery block; check it doesn't feel like a
  roadblock rather than a display.

**Two tests were finding props by shape and caught the wrong things** — worth knowing because it
will happen again the next time you send art in a familiar silhouette: shelf runs were identified
as "tall and narrow", so the freezers counted as shelving (8 runs where there are 5). And the
"open front end" sightline probe was a literal at (750,600) — actually the middle of the grocery
aisle band, which only stayed clear while the shelf block happened to stop short of it. Both ask
the world now instead of restating a number.

### T. Break room seating, and the two props resized
All three things from your last pass.

**The props.** Trolley bay and pallet display are both a third smaller (120 → 80 and 80 → 53
authored). The pallet moved to the deli's open east end where you marked it — clear of the corridor
spur and of the deli case.

**The break room was a worse bug than it looked.** The staff weren't just standing outside: there
were **no seats at all**. `loadLevel` clears `breakChairs` — it's the office's array, emptied along
with every other office array — and the store then registered that *emptied* array with its table.
The seat ring places one seat per available point, which was zero, so all twelve took the standing
fallback every break. **0 of 12 seated.** Now 8 sit and 4 stand, which is the office's own overflow
behaviour.

Two more things had to be true and neither was obvious:

- **The table had to move north.** At y=190 its bottom row of chairs landed on the room's south
  wall, so the snap pushed two of them *through* it — Russ and Garret were taking their break
  sitting in the **bakery**. Only caught because the test asserts the chairs are in the BREAK ROOM,
  not merely that people sat somewhere.
- **The seating code splits people between a break room and a kitchen.** Save-Rite has one break
  room, so half the crew were being dealt into a kitchen with no chairs in it.

Also fixed: the no-seat fallback point was in **SHIPPING / RECEIVING**, not the break room. It
stayed invisible because it's behind the swing doors either way, so the existing "breaks happen in
the back of house" test was satisfied by the wrong room.

**What to look at:** sit through a break. Eight on chairs, four standing around the table, nobody
outside and nobody in the bakery. Then check the pallet in the deli and the trolleys at the door
look the right size next to a person.

**One thing worth knowing:** the seat positions are computed from the **render loop**, and the test
harness never renders — so headless this reads "nobody sits" whether it works or not. The new test
calls that step by hand. Anything else that only happens while drawing has the same blind spot.

### U. Workable aisles, and a job list that matches your title
Both things from your last ask, plus one they exposed.

**Every fixture is divided into workable, lootable sections** — 66 of them: three a side on each
shelf and freezer run, three along each service case, three across each produce tray. 48 grocery,
12 produce, 3 deli, 3 bakery. (Front end has none — its jobs are bagging and go-backs, not facing.
Say if you want them.)

You offered "maybe one aisle can be one big container, your call." I kept the three-a-side split:
it costs nothing, and it makes working an aisle several beats instead of one button press. Which
side you can reach is decided by the aisle you're standing in.

**The one thing that wasn't optional:** 66 containers all rolling loot took the store from **92
items on the floor to 243**. Searching anywhere else would have stopped being worth doing. A
section is somewhere you *work* — one item, one time in seven, so about 9 finds shop-wide.

**The work happens at the shelves now.** Facing, zoning, date codes, rotating a case and culling
produce were all routed through a generic `desk` fixture — so a job that said *"in your aisle"*
completed **at your locker**. They complete at a section of **your own department** now; a grocery
clerk can't zone the deli from the bread aisle.

**Your job list now matches your job title.** The rank table was still the office's, one row out of
step with the store's ladder — so every rung above clerk was doing the job of the rung *below*, and
the **Owner**, who has nobody above them, spent the day *"preparing the district report"* and
*"taking the call from the district manager"*. Now:

| rung | what you actually do |
|---|---|
| BAGGER | go-backs, carts, cardboard, water, coffee, bagging |
| DEPARTMENT CLERK | facing, zoning, date codes, till count, price checks, pallets |
| DEPARTMENT MANAGER | displays, shrink sheet, department numbers, planogram, training |
| ASSISTANT MANAGER | shift schedule, reviewing the clerks' zoning, escalated calls, the board |
| STORE MANAGER | budgets, shrink summary, discipline, the week's numbers, the wholesaler |
| OWNER | payroll, the books, the delivery rates, deciding whether somebody stays |

**What to look at:**
- Walk an aisle and press A at the shelves. You should get *"Face the shelves in your aisle (task)"*
  when it's your department, and *"not your department"* when it isn't.
- Try the other side of the same run — it's a different section.
- Check the loot feels right. Most sections are empty; the odd one has something behind the stock.
- Rank up and read the job list each time. It should read like a promotion, not a reshuffle.

**A latent crash fell out of this** and is fixed: the day-roll picked one desk job and one other,
assuming a desk job always existed. Routing shelf work away from `desk` emptied one rung's desk
list, and an empty pick builds a broken task. All 36 rank/department combinations now roll cleanly.

---

## V — The Xbox crash, and why the art looks different

**This is the one that matters. The game would not open on your Xbox.**

`SBOX_FATAL_MEMORY_EXCEEDED` was not a fluke or a bad load — the art library genuinely did not fit.
Measured in a live browser, not guessed:

| | before | after |
|---|---:|---:|
| art decoded in memory | **594 MB** | **134 MB** |
| load-time peak | ~849 MB | ~259 MB |
| art downloaded | 105 MB | **32 MB** |

**Nothing in the game changed.** `index.html` is byte-for-byte identical on this branch — only the
PNG files. No layout moved, no behaviour changed, no save format touched.

**What was wrong:** a PNG costs `width x height x 4` bytes in memory regardless of how small the
file is, and the game's canvas is a fixed **860x500** that CSS stretches to the TV — so a sprite's
drawn size is its *final* size. `counter_sink` was stored **1254x1254** and drawn **90x90**: 194
times the pixels, all of them thrown away. The seated poses were 190x. Every prop, bat sheet and
seated pose is now stored at ~2x its real drawn size.

**The art should look BETTER, not worse — please check this.** The game blits with smoothing off,
so it was throwing away thirteen of every fourteen pixels with no filtering at all. Downscaling
properly beforehand keeps more of the detail. The comparison sheet I sent shows it clearest on the
baler's hazard stripes and the checkstand.

**What to look at:**
- **Does it open at all on the Xbox?** That is the whole test.
- Walk the shop floor and the back rooms. Produce, cases, shelves, freezers, the baler, the pallets,
  checkstands, trolley bay, magazine rack.
- The office too — desks, chairs, toilets, the printer, the meeting room.
- Anything that looks *soft or blocky* is worth telling me about; anything **magenta** is a bug (I
  measured zero magenta pixels on both floors, but the TV is the real test).
- Break room: sit people down and check the seated poses still read at the right size.

**Held back deliberately:** the character **walk strips** are untouched, because the Save-Rite cast
is being redrawn. They are still 4.8x oversampled and are the last **~85 MB** on the table. **If the
Xbox still runs out of memory, tell me and I'll take those down too** — that would bring it to
about 50 MB.

**A new test guards this permanently.** `t_art_budget.js` fails the gate if the decoded library
exceeds 260 MB. It caught two props I had missed within a minute of being written.

---

## W — Store clothes, and a meltdown that isn't someone else's joke

Codex's second delivery, integrated — and half of it deliberately thrown away.

### The player wears an apron on the shop floor

You are the Intern in both buildings, but in Save-Rite you now wear a store apron over the shirt
and tie instead of walking the aisles dressed for a sales meeting. Same ginger hair, same bad tie —
it just goes under the apron. **The swap is automatic and by building**; the office is untouched.

There was a trap worth knowing about: the player is drawn by **two different code paths** — walking
goes one way, sitting goes another, and only one passed through the function that decides which
face you wear. Swapping in one and not the other would have put the apron on you standing up and
the office shirt on you the moment you sat down, with nothing reporting a fault. Both now go
through the same resolver, and a test asserts they *agree* rather than checking either alone.

### The bat stays in the office

Twelve store meltdown sheets were drawn, registered, tested and gated — then scrapped, because
**executing a printer with a baseball bat is an Office Space reference**, and Office Space is Paper
Supply Co. A grocery clerk doing it is a reference to nothing.

**The store still melts people down.** The 7% roll is untouched — it is *scoped* to the office
rather than changed (that number is yours). And the words moved with it: three of the four original
descriptions named a **desk**, a **keyboard** or a **printer rant**, which is the same joke told in
text, in a shop that has none of those things to hand. Save-Rite now gets its own:

> screamed at a customer and walked off · burst into tears in the back room · kicked a stack of
> trays across the floor · threw an apron in the bin · swept a shelf clear with one arm · walked
> out mid-transaction

**What to look at:**
- Walk the store and check you are in the apron. Start an office run and check you are not.
- Sit down in the break room — you should still be aproned, seated.
- Stand next to a crew member. **Nobody should look taller or shorter** (measured 54.0px against
  the crew's 54.1, but the TV decides).
- Push somebody in the store to breaking point and read the log line. It should sound like a
  supermarket, and **nobody should produce a bat.**
- In the office, the bat homage is unchanged and still fires at 7%.

**Art total is now 135 MB**, down from 594. Still held back: the Save-Rite cast's own walk strips,
pending the redraw — the last ~85 MB if the Xbox needs more room.

---

## X — The aisles stop vanishing, bagging happens at a lane

Four things from your TV pass. Two others need your call — see the end.

### The disappearing aisles were a real bug

**Culling was measured against the collision box, not the art.** A shelf run collides with a
40-unit box and *draws* 330 tall — an overhang of 286; the frozen wall overhangs 363. The cull
margin was 200 and could never have covered either. So the game threw away runs whose art still
filled a third of the screen, and walking north made whole rows of shelving and the entire frozen
aisle **pop out at once** instead of scrolling off the bottom.

Fixed at the root: culling now asks the sprite how tall it draws. Verified across **20 fixtures at
160 camera positions** — nothing is culled while any part of it is on screen. Raising the margin
would have been a magic number that rots the next time art is resized, which has happened twice
this week.

### Bagging is at a lane now

*"Bag the orders at your lane"* routed to **your locker** — the task said "at your lane" and the
marker pointed at where you keep your coat. It now points at the bagging end of the nearest
checkout. Measured: 7 units from the checkstand, 510 units from the locker it used to send you to.

### The bookshelf is a printer, in the back offices

That tall wooden bookcase between the aisles was the office's `supply_shelf`, typed as a printer so
office errands had somewhere to land, and labelled "Endcap". It is now an actual printer, in the
back offices where a printer belongs.

### Meltdown words, aprons, animations — unchanged and good

**What to look at:**
- Walk north up the store from the front end. **The aisles should scroll off smoothly**, not blink out.
- Take a bagging job and follow the compass — it should walk you to a till, not to your locker.
- The back offices should have a printer; the sales floor should have no bookcase.

---

### Two I need you to decide

**1. The scale.** I measured it and *the obvious reading is wrong*: per metre the store's props are
**0.87x** the office's — smaller, not larger — and the characters are identical in both levels
(54 px). The real cause is the two-scales problem: props are drawn at true plan scale and a person
at about **2.6x smaller than the floor they stand on**. The office hides it because its furniture is
small; the store's 4-5 m aisle runs make it obvious.

| tallest fixture | in character heights |
|---|---|
| office | 2.1x |
| store, normal props | 1.8x |
| **store aisle runs** | **6.1x** |
| **store freezers** | **7.4x** |

Two real options, both yours: **(A)** make characters bigger — fixes it everywhere but changes the
office, where a person would end up taller than a desk; or **(B)** shorten the aisle runs so nothing
towers, capping fixtures near the office's 2.1x. (B) is a floor relayout and needs shorter run art
from Codex. **I'd go with (B)** — the office reads well and you said so, and (A) would drag it out
of shape to fix the store.

**2. The break-room seating.** I could not reproduce it. Posing the clock into a break deliberately
suppresses the phase-change block that assigns seats, so I never got a seated frame to measure, and
I am not going to guess at the seating compositor — it is the piece HANDOFF-8 warns is delicate.
**If you can get me a screenshot mid-break with people sat down**, or tell me whether it is one
department/table or all of them, I will fix it properly next pass.

---

## Y — The store stops borrowing the office's furniture

Your playthrough notes. Four of six done; the other two are their own branch.

### Jobs happen where the job happens

You asked why you were breaking down boxes in shipping from your lockers at the front end. Because
*"Break down the cardboard in receiving"* was routed through the **printer**, and the nearest
printer-typed object is the go-back cart by the front doors — next to your lockers. The same job
also existed one rank up routed through **supply**, so it had two different destinations depending
on your rung.

Every store task had to borrow one of the office's trigger types, because those were the only
destinations that existed. Eleven re-pointed:

| job | went to | goes to now |
|---|---|---|
| Break down the cardboard in receiving | go-back cart, front end | the baler, in receiving |
| Bring the carts in from the lot | go-back cart | the trolley bay |
| Mist the greens | **the break-room water cooler** | produce |
| Break down and wipe the slicer | back room | the deli case |
| Take the counter for a stretch | **your locker** | the deli case |
| Pull the racks when the timer goes | **your locker** | the bakery case |
| Run a price check for a lane | your locker | a till |

**What to look at:** take any job and follow the compass. It should walk you somewhere that makes
sense for the words on the card, and the work should complete when you get there.

### Meetings are in receiving

You were right, and so was the code's own comment — which said the huddle happens in receiving while
the coordinate sat **inside the break room**. So the crew held the morning huddle in the room they
were about to take their break in. It's in SHIPPING / RECEIVING now, which is where a real shop
holds one.

### The break room got the staff washroom's space

The staff WC was a 100-wide room with one toilet in it, and it cost the break room the width it
needed — eight chairs for twelve crew, which is why four people stand about in your screenshot. The
break room is **300 wide with two tables and sixteen seats**. Staff use the public washroom.

### The seating bug was in the office too

Back-facing sitters were drawn at **0.72** the size of everyone else at the same table — that's your
bottom row. A constant shrank them by 0.80 to "bring the back pose in line because it's drawn large
in source". It isn't: measured across every seated character in the game, the up pose is 0.90 of the
down pose. It's drawn *smaller*, so the correction made it worse. Derived from the art now.

**What to look at:** sit through a break. **Nobody at either table should be noticeably bigger or
smaller than anybody else**, and there should be enough chairs for everyone. Then do the same in the
office — that was wrong there too and should also be better.

### Still to come

**Your desk staying as the front-end lockers after promotions**, and **an opening tour** like the
office has. Both are features rather than fixes, so they get their own branch.

**Codex** has been asked for the deli and bakery back walls — the empty space behind the bakery
manager's desk that you flagged.
